/**
 * Grab component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 */
import { ARENAUtils } from '../../../utils';
import { TOPICS } from '../../../constants';

const GRABBED_STATE = 'grabbed-dynamic';
const posVect3 = new THREE.Vector3(); // Reusable vector for worldPosition calcs
const rotQuat = new THREE.Quaternion(); // Reusable quaternion for worldQuaternion calcs

AFRAME.registerComponent('physx-grab', {
    schema: {
        // If not 0, last grabbed object will be re-grabbed if both hand and object have not deviated in
        // distance (combined) from the last contact point by more than this value
        proximity: { default: 0, type: 'number' }
    },
    init: function() {
        const { el } = this;

        // If a state of "grabbed" is set on a physx-body entity,
        // the entity is automatically transformed into a kinematic entity.
        // To avoid triggering this (we want to grab using constraints, and leave the
        // body as dynamic), we use a non-clashing name for the state we set on the entity when
        // grabbing it.

        this.grabbing = false;
        this.grabEl =      /** @type {AFRAME.Element}    */ null;
        // Track all currently hitting els (can be multiple)
        this.hitEls = [];
        // Also track last hit el for proximity check if no other contacts
        this.lastHitEl =   /** @type {AFRAME.Element}    */ null;
        this.lastHitPos = new THREE.Vector3();

        // Bind event handlers
        this.onHit = this.onHit.bind(this);
        this.onHitEnd = this.onHitEnd.bind(this);
        this.onGripOpen = this.onGripOpen.bind(this);
        this.onGripClose = this.onGripClose.bind(this);

        this.object_id = (el.id === 'leftHand') ? `handLeft_${ARENA.idTag}` : `handRight_${ARENA.idTag}`;

        this.topicParams = {
            ...ARENA.topicParams,
            userObj: this.object_id
        };
    },

    play: function() {
        const { el } = this;
        el.addEventListener('contactbegin', this.onHit);
        el.addEventListener('contactend', this.onHitEnd);
        el.addEventListener('gripdown', this.onGripClose);
        el.addEventListener('gripup', this.onGripOpen);
        el.addEventListener('trackpaddown', this.onGripClose);
        el.addEventListener('trackpadup', this.onGripOpen);
        el.addEventListener('triggerdown', this.onGripClose);
        el.addEventListener('triggerup', this.onGripOpen);
    },

    pause: function() {
        const { el } = this;
        el.removeEventListener('contactbegin', this.onHit);
        el.removeEventListener('contactend', this.onHitEnd);
        el.removeEventListener('gripdown', this.onGripClose);
        el.removeEventListener('gripup', this.onGripOpen);
        el.removeEventListener('trackpaddown', this.onGripClose);
        el.removeEventListener('trackpadup', this.onGripOpen);
        el.removeEventListener('triggerdown', this.onGripClose);
        el.removeEventListener('triggerup', this.onGripOpen);
    },

    onGripClose: function(evt) {
        const { hitEls, data, lastHitEl, lastHitPos } = this;

        this.grabbing = true;

        // Grab last hit object if we have any still in contact
        if (hitEls.length > 0) {
            this.startGrab(hitEls.at(-1), evt.target);
            return;
        }

        // No contacting hits, but we have a lastHitEl and proximity allowance
        if (data.proximity > 0 && lastHitEl) {
            evt.target.object3D.getWorldPosition(posVect3);
            let proxDist = posVect3.distanceTo(lastHitPos); // Hand deviation from last hit
            lastHitEl.object3D.getWorldPosition(posVect3);
            proxDist += posVect3.distanceTo(lastHitPos); // Object deviation from last hit
            if (proxDist > data.proximity) {
                // Combined distances out of proximity, invalidate lastHitEl
                this.lastHitEl = undefined;
                return;
            }
            // Otherwise (still or back within proximity), grab lastHitEl
            this.startGrab(lastHitEl, evt.target);
        }
    },

    // This does not remove ability to re-grab while collision has not ended;
    // when jointed on grab, the object should still be colliding with hand
    onGripOpen: function(evt) {
        this.grabbing = false;
        this.stopGrab();
    },

    onHit: function(evt) {
        const { grabbing, hitEls } = this;

        const hitEl = evt.detail.otherComponent?.el;
        // If the element is already grabbed (it could be grabbed by another controller).
        // If the hand is not grabbing the element does not stick.
        // If we're already grabbing something you can't grab again.
        if (!hitEl || hitEl.getAttribute('physx-grabbable') === null || hitEl.is(GRABBED_STATE) || this.grabEl) {
            return;
        }
        if (!grabbing) {
            // Intuitively, hand might not start grabbing until after a collision, track this obj
            hitEls.push(hitEl);
            return;
        }

        this.startGrab(hitEl);
    },

    // Might be called from hit or from grip close
    startGrab(grabEl) {
        const { el, object_id, topicParams } = this;

        grabEl.addState(GRABBED_STATE);
        this.grabEl = grabEl;

        this.addJoint(grabEl, el);

        // Broadcast event
        const topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr(topicParams);
        const topicBasePrivate = TOPICS.PUBLISH.SCENE_USER_PRIVATE.formatStr(topicParams);
        const topicBasePrivateProg = TOPICS.PUBLISH.SCENE_PROGRAM_PRIVATE.formatStr(topicParams);

        const handPose = ARENAUtils.getPose(el);
        const targetPose = ARENAUtils.getPose(grabEl);
        // We don't care about velocities
        const thisMsg = {
            object_id: object_id,
            action: 'clientEvent',
            type: 'physx-grabstart',
            data: {
                target: grabEl.id,
                pose: handPose,
                targetPose: targetPose
            }
        };
        ARENAUtils.publishClientEvent(grabEl, thisMsg, topicBase, topicBasePrivate, topicBasePrivateProg);
    },

    stopGrab: function() {
        const { el, grabEl, object_id, topicParams } = this;
        if (!grabEl) {
            return;
        }
        grabEl.removeState(GRABBED_STATE);

        this.removeJoint();

        // Broadcast event
        const topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr(topicParams);
        const topicBasePrivate = TOPICS.PUBLISH.SCENE_USER_PRIVATE.formatStr(topicParams);
        const topicBasePrivateProg = TOPICS.PUBLISH.SCENE_PROGRAM_PRIVATE.formatStr(topicParams);

        // Hands are in worldspace
        const handPose = ARENAUtils.getPose(el);
        const targetPose = ARENAUtils.getPose(grabEl);
        const thisMsg = {
            object_id: object_id,
            action: 'clientEvent',
            type: 'physx-grabend',
            data: {
                target: grabEl.id,
                pose: handPose,
                targetPose: targetPose
            }
        };
        ARENAUtils.publishClientEvent(grabEl, thisMsg, topicBase, topicBasePrivate, topicBasePrivateProg);

        this.grabEl = undefined;
    },

    onHitEnd: function(evt) {
        const { hitEls, lastHitPos } = this;

        const unhitEl = evt.detail.otherComponent?.el;
        const index = hitEls.indexOf(unhitEl);
        if (index > -1) {
            hitEls.splice(index, 1);
        }

        // If we are allowing proximity grab, track last hit object
        if (this.data.proximity > 0 && evt.target) {
            this.lastHitEl = unhitEl;
            evt.target.object3D.getWorldPosition(lastHitPos);
        }
    },

    // As used by physx components, the joint is a child of the grabbed object,
    // target is the grabber (hand) where the joint is anchored to
    addJoint(el, target) {
        this.removeJoint();

        this.joint = document.createElement('a-entity');
        this.joint.setAttribute('physx-joint', `type: Fixed; target: #${target.id}`);

        el.appendChild(this.joint);
    },

    removeJoint() {
        if (!this.joint) return;
        this.joint.parentElement.removeChild(this.joint);
        this.joint = null;
    }
});

AFRAME.registerComponent('physx-remote-grabber', {
    init() {
        this.startGrab = this.startGrab.bind(this);
        this.stopGrab = this.stopGrab.bind(this);

        this.grabEl =      /** @type {AFRAME.Element}    */ null;
        this.parentQuat = new THREE.Quaternion();
    },

    startGrab(targetId, pose, targetPose) {
        const { el } = this;

        const target = document.getElementById(targetId);
        if (!target) return;

        target.addState(GRABBED_STATE);

        this.stopGrab(); // Clear out any old grab

        // Force pose sync
        if (pose) {
            const { position: pos, rotation: rot } = pose;
            if (pos) el.object3D.position.set(pos.x, pos.y, pos.z);
            if (rot) {
                rotQuat.set(rot.x, rot.y, rot.z, rot.w);
                el.object3D.rotation.setFromQuaternion(rotQuat);
            }
            el.object3D.updateMatrixWorld();
        }
        if (targetPose) {
            const { position: targetPos, rotation: targetRot } = targetPose;
            // Need to override simulation pose for dynamic body
            if (!target.components['physx-body']) return;
            const body = target.components['physx-body'].rigidBody;
            if (!body) return;

            // Set object3d as well as physx body, the former is referenced for the joint attachment
            posVect3.set(targetPos.x, targetPos.y, targetPos.z);
            rotQuat.set(targetRot.x, targetRot.y, targetRot.z, targetRot.w);
            if (target.parentEl.id !== 'sceneRoot') {
                target.parentEl.object3D.worldToLocal(posVect3);
                target.parentEl.object3D.getWorldQuaternion(this.parentQuat);
                rotQuat.premultiply(this.parentQuat.invert());
            }
            target.object3D.position.copy(posVect3);
            target.object3D.rotation.setFromQuaternion(rotQuat);

            const physxPose = body.getGlobalPose();
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

        this.joint = document.createElement('a-entity');
        this.joint.setAttribute('physx-joint', `type: Fixed; target: #${el.id}`);

        target.appendChild(this.joint);

        this.grabEl = target;
    },

    stopGrab(pose, targetPose) {
        const { grabEl, el, joint } = this;

        if (!grabEl) return;

        // Force pose sync
        if (pose) {
            const { position: pos, rotation: rot } = pose;
            if (pos) el.object3D.position.set(pos.x, pos.y, pos.z);
            if (rot) {
                rotQuat.set(rot.x, rot.y, rot.z, rot.w);
                el.object3D.rotation.setFromQuaternion(rotQuat);
            }
            el.object3D.updateMatrixWorld();
        }
        if (targetPose) {
            const { position: targetPos, rotation: targetRot } = targetPose;
            // Need to override simulation pose for dynamic body
            if (!grabEl.components['physx-body']) return;
            const body = grabEl.components['physx-body'].rigidBody;
            if (!body) return;

            const physxPose = body.getGlobalPose();
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

        grabEl.removeState(GRABBED_STATE);

        if (!joint) return;
        joint.parentElement.removeChild(joint);
        this.joint = null;
    }
});
