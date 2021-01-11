/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

/**
 * Tracking camera movement in real time. Emits camera pose change and vio change events.
 *
 */
AFRAME.registerComponent('arena-camera', {
    schema: {
        enabled: {type: 'boolean', default: false},
        displayName: {type: 'string', default: 'No Name'},
        color: {type: 'string', default: '#' + Math.floor(Math.random() * 16777215).toString(16)},
        rotation: {type: 'vec4', default: new THREE.Quaternion()},
        position: {type: 'vec3', default: new THREE.Vector3()},
        vioRotation: {type: 'vec4', default: new THREE.Quaternion()},
        vioPosition: {type: 'vec3', default: new THREE.Vector3()},
    },

    init: function() {
        this.vioMatrix = new THREE.Matrix4();
        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();

        this.lastPose = '';

        this.heartBeatCounter = 0;
        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.updateMillis, this);
    },

    publishPose() {
        const data = this.data;
        if (!data.enabled) return;

        const msg = {
            object_id: ARENA.camName,
            displayName: data.displayName,
            action: 'create',
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: parseFloat(data.position.x.toFixed(3)),
                    y: parseFloat(data.position.y.toFixed(3)),
                    z: parseFloat(data.position.z.toFixed(3)),
                },
                rotation: {
                    x: parseFloat(data.rotation._x.toFixed(3)),
                    y: parseFloat(data.rotation._y.toFixed(3)),
                    z: parseFloat(data.rotation._z.toFixed(3)),
                    w: parseFloat(data.rotation._w.toFixed(3)),
                },
                color: data.color,
            },
        };

        if (ARENA.JitsiAPI) {
            msg.jitsiId = ARENA.JitsiAPI.getJitsiId();
            msg.hasAudio = ARENA.JitsiAPI.hasAudio();
            msg.hasVideo = ARENA.JitsiAPI.hasVideo();
        }

        if (ARENA.FaceTracker) {
            msg.hasAvatar = ARENA.FaceTracker.running();
        }

        ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
    },

    publishVio() {
        const data = this.data;
        if (!data.enabled) return;

        if (ARENA.fixedCamera !== '') {
            const msg = {
                object_id: ARENA.camName,
                action: 'create',
                type: 'object',
                data: {
                    object_type: 'camera',
                    position: {
                        x: parseFloat(data.vioPosition.x.toFixed(3)),
                        y: parseFloat(data.vioPosition.y.toFixed(3)),
                        z: parseFloat(data.vioPosition.z.toFixed(3)),
                    },
                    rotation: {
                        x: parseFloat(data.vioRotation._x.toFixed(3)),
                        y: parseFloat(data.vioRotation._y.toFixed(3)),
                        z: parseFloat(data.vioRotation._z.toFixed(3)),
                        w: parseFloat(data.vioRotation._w.toFixed(3)),
                    },
                    color: data.color,
                },
            };
            ARENA.Mqtt.publish(ARENA.vioTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
        }
    },

    publishHeadText() {
        const data = this.data;

        ARENA.Mqtt.publish(ARENA.outputTopic + '/head-text_' + ARENA.camName, {
            'object_id': ARENA.camName,
            'action': 'create',
            'type': 'object',
            'displayName': data.displayName,
            'data': {'object_type': 'headtext'},
        });
    },

    update(oldData) {
        const data = this.data;

        if (data.displayName !== oldData.displayName) {
            this.publishHeadText();
        }
    },

    tick: (function(t, dt) {
        const data = this.data;
        const el = this.el;

        this.heartBeatCounter++;

        data.rotation.setFromRotationMatrix(el.object3D.matrixWorld);
        data.position.setFromMatrixPosition(el.object3D.matrixWorld);

        this.camParent = el.object3D.parent.matrixWorld;
        this.cam = el.object3D.matrixWorld;

        this.cpi.getInverse(this.camParent);
        this.cpi.multiply(this.cam);

        this.vioMatrix.copy(this.cpi);
        data.vioRotation.setFromRotationMatrix(this.cpi);
        data.vioPosition.setFromMatrixPosition(this.cpi);

        const rotationCoords = ARENAUtils.rotToText(data.rotation);
        const positionCoords = ARENAUtils.coordsToText(data.position);
        const newPose = rotationCoords + ' ' + positionCoords;

        // update position every 1 sec
        if (this.lastPose !== newPose || this.heartBeatCounter % (1000 / ARENA.updateMillis) == 0) {
            this.publishPose();
            this.publishVio();
            this.lastPose = newPose;
        }
    }),
});
