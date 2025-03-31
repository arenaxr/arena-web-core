/**
 * Force Pushable component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 *
 * Applies behavior to the current entity such that cursor clicks will apply a
 * strong impulse, pushing the entity away from the viewer.
 *
 * Requires: physx
 */

import { ARENAUtils } from '../../../utils';
import { TOPICS } from '../../../constants';

const posVect3 = new THREE.Vector3(); // Reusable vector for worldPosition calcs
const rotQuat = new THREE.Quaternion(); // Reusable quaternion for worldQuaternion calcs

AFRAME.registerComponent('physx-force-pushable', {
    schema: {
        force: { default: 10 },
        on: { default: 'mousedown' }
    },
    init: function() {

        this.forcePushPhysX = this.forcePushPhysX.bind(this);

        this.sourcePosition = new THREE.Vector3();
        this.force = new THREE.Vector3();
        this.pos = new THREE.Vector3();

        this.object_ids = {
            leftHand: `handLeft_${ARENA.idTag}`,
            rightHand: `handRight_${ARENA.idTag}`,
            "mouse-cursor": ARENA.idTag,
        }
    },

    play() {
        this.el.addEventListener(this.data.on, this.forcePushPhysX);
    },

    pause() {
        this.el.removeEventListener(this.data.on, this.forcePushPhysX);
    },

    forcePushPhysX: function(e) {
        // Can be a hand
        const sourceEl = e.detail.cursorEl;
        const object_id = this.object_ids[sourceEl.id];

        const el = this.el;
        if (!el.components['physx-body']) return;
        const body = el.components['physx-body'].rigidBody;
        if (!body) return;

        const force = this.force;
        const source = this.sourcePosition;

        // WebXR requires care getting camera position https://github.com/mrdoob/three.js/issues/18448
        source.setFromMatrixPosition(sourceEl.object3D.matrixWorld);

        el.object3D.getWorldPosition(force);
        force.sub(source);

        force.normalize();

        // not sure about units, but force seems stronger with PhysX than Cannon, so scaling down
        // by a factor of 5.
        force.multiplyScalar(this.data.force / 5);

        // use data from intersection to determine point at which to apply impulse.
        const pos = this.pos;
        pos.copy(e.detail.intersection.point);
        el.object3D.worldToLocal(pos);

        body.addImpulseAtLocalPos(force, pos);

        // User client source should be always in world coordinates
        sourceEl.object3D.getWorldPosition(posVect3);
        sourceEl.object3D.getWorldQuaternion(rotQuat);
        const sourcePose = {
            position: {
                x: ARENAUtils.round3(posVect3.x),
                y: ARENAUtils.round3(posVect3.y),
                z: ARENAUtils.round3(posVect3.z)
            },
            rotation: {
                x: ARENAUtils.round3(rotQuat.x),
                y: ARENAUtils.round3(rotQuat.y),
                z: ARENAUtils.round3(rotQuat.z),
                w: ARENAUtils.round3(rotQuat.w)
            }
        };

        // Use local coords for target obj
        el.object3D.getWorldPosition(posVect3);
        el.object3D.getWorldQuaternion(rotQuat);
        const targetPose = {
            position: {
                x: ARENAUtils.round3(posVect3.x),
                y: ARENAUtils.round3(posVect3.y),
                z: ARENAUtils.round3(posVect3.z)
            },
            rotation: {
                x: ARENAUtils.round3(rotQuat.x),
                y: ARENAUtils.round3(rotQuat.y),
                z: ARENAUtils.round3(rotQuat.z),
                w: ARENAUtils.round3(rotQuat.w)
            }
        };

        const msg = {
            object_id,
            action: 'clientEvent',
            type: 'physx-push',
            data: {
                impulse: {
                    x: ARENAUtils.round3(force.x),
                    y: ARENAUtils.round3(force.y),
                    z: ARENAUtils.round3(force.z)
                },
                point: {
                    x: ARENAUtils.round3(pos.x),
                    y: ARENAUtils.round3(pos.y),
                    z: ARENAUtils.round3(pos.z)
                },
                sourcePose: sourcePose,
                targetPose: targetPose,
                target: this.el.id,
            }
        };
        const topicParams = {
            ...ARENA.topicParams,
            userObj: object_id
        }

        const topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr(topicParams);
        const topicBasePrivate = TOPICS.PUBLISH.SCENE_USER_PRIVATE.formatStr(topicParams);
        const topicBasePrivateProg = TOPICS.PUBLISH.SCENE_PROGRAM_PRIVATE.formatStr(topicParams);
        ARENAUtils.publishClientEvent(el, msg, topicBase, topicBasePrivate, topicBasePrivateProg);
    }
});


const impulseVect3 = new THREE.Vector3(); // Reusable vector for force calcs

AFRAME.registerComponent("physx-remote-pusher", {
    init() {
        this.emitPush = this.emitPush.bind(this);
    },

    /**
     * emitPush
     * @param {string} targetId - The id of the target object to push.
     * @param {Object} targetPose - The pose of the target object prior to push.
     * @param {Object} impulse - The impulse vector {x, y, z}.
     * @param {Object} point - The world point at which to apply the impulse {x, y, z}.
     * @param {Object} _sourcePose - The pose of the source (pusher), including position and rotation.
     */
    emitPush: function(targetId, targetPose, impulse, point, _sourcePose) {
        const target = document.getElementById(targetId);
        if (!target) return;

        if (!target.components['physx-body']) return;
        const body = target.components['physx-body'].rigidBody;
        if (!body) return;

        if (targetPose) {
            const { position: targetPos, rotation: targetRot } = targetPose;
            // Need to override simulation pose for dynamic body
            const physxPose = body.getGlobalPose()
            if (targetPos) {
                physxPose.translation.x = targetPos.x;
                physxPose.translation.y = targetPos.y;
                physxPose.translation.z = targetPos.z;
            }
            if (targetRot) {
                physxPose.rotation.x = targetRot.x;
                physxPose.rotation.y = targetRot.y;
                physxPose.rotation.z = targetRot.z;
                physxPose.rotation.w = targetRot.w;
            }
            body.setGlobalPose(physxPose, true);
        }

        // These are already in local coordinates
        posVect3.set(point.x, point.y, point.z);
        impulseVect3.set(impulse.x, impulse.y, impulse.z);
        body.addImpulseAtLocalPos(impulseVect3, posVect3);
    }
});
