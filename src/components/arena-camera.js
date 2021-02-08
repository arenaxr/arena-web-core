/**
 * @fileoverview ARENA camera component; track camera movement
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

/**
 * Tracking camera movement in real time. Emits camera pose change and vio change events.
 *
 */
AFRAME.registerComponent('arena-camera', {
    schema: {
        enabled: {type: 'boolean', default: false},
        vioEnabled: {type: 'boolean', default: false},
        displayName: {type: 'string', default: 'No Name'},
        color: {type: 'string', default: '#' + Math.floor(Math.random() * 16777215).toString(16)},
        rotation: {type: 'vec4', default: new THREE.Quaternion()},
        position: {type: 'vec3', default: new THREE.Vector3()},
        vioRotation: {type: 'vec4', default: new THREE.Quaternion()},
        vioPosition: {type: 'vec3', default: new THREE.Vector3()},
    },

    init: function () {
        this.vioMatrix = new THREE.Matrix4();
        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();

        this.lastPose = '';

        this.heartBeatCounter = 0;
        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);

        // send initial create
        this.publishPose('create');
        this.publishVio('create');
    },

    publishPose(action = 'update') {
        const data = this.data;
        if (!data.enabled) return;

        const msg = {
            object_id: ARENA.camName,
            displayName: data.displayName,
            action: action,
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

        if (ARENA.Jitsi) {
            msg.jitsiId = ARENA.Jitsi.getJitsiId();
            msg.hasAudio = ARENA.Jitsi.hasAudio;
            msg.hasVideo = ARENA.Jitsi.hasVideo;
        }

        if (ARENA.FaceTracker) {
            msg.hasAvatar = ARENA.FaceTracker.running();
        }

        ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
    },

    publishVio(action = 'update') {
        const data = this.data;

        const msg = {
            object_id: ARENA.camName,
            action: action,
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
    },

    update(oldData) {
        const data = this.data;
    },

    tick: function (t, dt) {
        const data = this.data;
        const el = this.el;

        this.heartBeatCounter++;

        data.rotation.setFromRotationMatrix(el.object3D.matrixWorld);
        data.position.setFromMatrixPosition(el.object3D.matrixWorld);

        this.camParent = el.object3D.parent.matrixWorld;
        this.cam = el.object3D.matrixWorld;

        this.cpi.copy(this.camParent).invert();
        // this.cpi.getInverse(this.camParent);
        this.cpi.multiply(this.cam);

        this.vioMatrix.copy(this.cpi);
        data.vioRotation.setFromRotationMatrix(this.cpi);
        data.vioPosition.setFromMatrixPosition(this.cpi);

        const rotationCoords = ARENAUtils.rotToText(data.rotation);
        const positionCoords = ARENAUtils.coordsToText(data.position);
        const newPose = rotationCoords + ' ' + positionCoords;

        // update position if pose changed, or every 1 sec heartbeat
        if (this.heartBeatCounter % (1000 / ARENA.camUpdateIntervalMs) == 0) {
            // heartbeats are sent as create; TMP: sending as updates
            this.publishPose();
        } else if (this.lastPose !== newPose) {
            this.publishPose();
        }
        if (!data.vioEnabled) this.publishVio(); // publish vio on every tick (if enabled)
        this.lastPose = newPose;
    },
});
