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
 * Tracking camera movement in real time. Emits camera pose change and VIO change events.
 * @module arena-camera
 * @property {boolean} enabled - Indicates whether camera tracking is enabled.
 * @property {boolean} vioEnabled - Indicates whether to publish VIO on every tick (if true).
 * @property {string} displayName - User display name (used to publish camera data).
 * @property {string} color - Head text color.
 * @property {number[]} rotation - Last camera rotation value.
 * @property {number[]} position - Last camera position value.
 * @property {number[]} vioRotation - Last VIO rotation value.
 * @property {number[]} vioPosition - Last VIO position value.
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
    /**
     * Send initial camera create message; Setup heartbeat timer
     * @ignore
     */
    init: function() {
        this.lastPos = new THREE.Vector3();
        this.vioMatrix = new THREE.Matrix4();
        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();
        this.frustum = new THREE.Frustum();
        this.frustMatrix = new THREE.Matrix4();

        this.lastPose = '';

        this.heartBeatCounter = 0;
        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);

        // send initial create
        this.publishPose('create');
        this.publishVio('create');

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (window.bgHeartbeatTimer) {
                    clearInterval(window.bgHeartbeatTimer);
                }
            } else {
                window.bgHeartbeatCount = 0;
                window.bgHeartbeatTimer = setInterval(() => {
                    // 30 minute timeout
                    if (window.bgHeartbeatCount >= 30 * 60) {
                        return clearInterval(window.bgHeartbeatTimer);
                    }
                    this.publishPose();
                    window.bgHeartbeatCount++;
                }, 1000);
            }
        });
    },
    /**
     * Publish user camera pose
     * @param {string} action One of 'update' or 'create' actions sent in the publish message
     * @ignore
     */
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
                presence: document.getElementById('presenceSelect').value,
            },
        };

        if (ARENA.Jitsi) {
            msg.jitsiId = ARENA.Jitsi.getJitsiId();
            msg.hasAudio = ARENA.Jitsi.hasAudio;
            msg.hasVideo = ARENA.Jitsi.hasVideo;
        }

        const faceTracker = document.querySelector('a-scene').systems['face-tracking'];
        if (faceTracker && faceTracker.isEnabled()) {
            msg.hasAvatar = faceTracker.isRunning();
        }

        const headModelPathSelect = document.getElementById('headModelPathSelect');
        if (headModelPathSelect) {
            msg.data.headModelPath = headModelPathSelect.value;
        } else {
            msg.data.headModelPath = ARENA.defaults.headModelPath;
        }

        ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
    },
    /**
     * Publish user VIO
     * @param {string} action One of 'update' or 'create' actions sent in the publish message
     * @ignore
     */
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
    /**
     * Update component data
     * @ignore
     */
    update(oldData) {
        const data = this.data;
    },
    /**
     * Every tick, update rotation and position of the camera
     * If a position or rotation change is detected, or time for a heartbet, trigger message publish
     * @ignore
     */
    tick: function(t, dt) {
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

        const cam = el.components['camera'].camera;
        this.frustum.setFromProjectionMatrix(
            this.frustMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse),
        );

        // update position if pose changed, or every 1 sec heartbeat
        if (this.heartBeatCounter % (1000 / ARENA.camUpdateIntervalMs) === 0) {
            // heartbeats are sent as create; TMP: sending as updates
            this.publishPose();
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            this.lastPos.copy(this.el.object3D.position);
            this.lastPos.y -= ARENA.defaults.camHeight;
            sceneHist[ARENA.namespacedScene] = {
                ...sceneHist[ARENA.namespacedScene],
                lastPos: this.lastPos,
            };
            localStorage.setItem('sceneHistory', JSON.stringify(sceneHist));
        } else if (this.lastPose !== newPose) {
            this.publishPose();
        }
        if (data.vioEnabled) this.publishVio(); // publish vio on every tick (if enabled)
        this.lastPose = newPose;
    },
});
