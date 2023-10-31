/**
 * @fileoverview ARENA camera component; track camera movement
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA, THREE */

import { ARENA_EVENTS } from '../../constants';
import { ARENAUtils } from '../../utils';

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
 * @property {boolean} showStats - Display camera position on the screen.
 *
 */
AFRAME.registerComponent('arena-camera', {
    schema: {
        enabled: { type: 'boolean', default: false },
        vioEnabled: { type: 'boolean', default: false },
        displayName: { type: 'string', default: 'No Name' },
        color: { type: 'string', default: `#${ARENAUtils.numToPaddedHex(Math.floor(Math.random() * 16777215), 6)}` },
        showStats: { type: 'boolean', default: false },
    },

    /**
     * Send initial camera create message; Setup heartbeat timer
     * @ignore
     */
    init() {
        this.initialized = false;
        ARENA.events.addEventListener(ARENA_EVENTS.ARENA_LOADED, this.ready.bind(this));
        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();
        this.vioRotation = new THREE.Quaternion();
        this.vioPosition = new THREE.Vector3();
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];
        this.mqtt = sceneEl.systems['arena-mqtt'];
        this.jitsi = sceneEl.systems['arena-jitsi'];

        this.lastPos = new THREE.Vector3();
        this.vioMatrix = new THREE.Matrix4();
        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();

        // instantiate frustum objs
        this.frustum = new THREE.Frustum();
        this.frustMatrix = new THREE.Matrix4();
        this.bbox = new THREE.Box3();

        this.lastPose = '';
        this.videoDefaultResolutionSet = false;

        this.heartBeatCounter = 0;
        this.tick = AFRAME.utils.throttleTick(this.tick, this.arena.params.camUpdateIntervalMs, this);

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
                        clearInterval(window.bgHeartbeatTimer);
                        return;
                    }
                    this.publishPose();
                    window.bgHeartbeatCount++;
                }, 1000);
            }
        });

        if (this.data.showStats) {
            document.getElementById('pose-stats').style.display = 'block';
        }
        this.initialized = true;
    },

    /**
     * Publish user camera pose
     * @param {string} action One of 'update' or 'create' actions sent in the publish message
     * @ignore
     */
    publishPose(action = 'update') {
        const { data, position, rotation } = this;

        if (!data.enabled) return;

        const arenaUser = { displayName: data.displayName, color: data.color };
        const msg = {
            object_id: this.arena.camName,
            action,
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: parseFloat(position.x.toFixed(3)),
                    y: parseFloat(position.y.toFixed(3)),
                    z: parseFloat(position.z.toFixed(3)),
                },
                rotation: {
                    // always send quaternions over the wire
                    x: parseFloat(rotation._x.toFixed(3)),
                    y: parseFloat(rotation._y.toFixed(3)),
                    z: parseFloat(rotation._z.toFixed(3)),
                    w: parseFloat(rotation._w.toFixed(3)),
                },
                'arena-user': arenaUser,
            },
        };
        const presence = document.getElementById('presence');
        if (presence) {
            arenaUser.presence = presence.value;
        }

        if (this.jitsi.initialized) {
            arenaUser.jitsiId = this.jitsi.getJitsiId();
            arenaUser.hasAudio = this.jitsi.hasAudio;
            arenaUser.hasVideo = this.jitsi.hasVideo;
        }

        const faceTracker = document.querySelector('a-scene').systems['face-tracking'];
        if (faceTracker && faceTracker.isEnabled()) {
            arenaUser.hasAvatar = faceTracker.isRunning();
        }

        const headModelPathSelect = document.getElementById('headModelPathSelect');
        if (headModelPathSelect) {
            arenaUser.headModelPath = headModelPathSelect.value;
        } else {
            arenaUser.headModelPath = this.arena.defaults.headModelPath;
        }

        this.mqtt.publish(`${this.arena.outputTopic}${this.arena.camName}`, msg); // extra timestamp info at end for debugging
    },

    /**
     * Publish user VIO
     * @param {string} action One of 'update' or 'create' actions sent in the publish message
     * @ignore
     */
    publishVio(action = 'update') {
        const { data, vioPosition, vioRotation } = this;

        const msg = {
            object_id: this.arena.camName,
            action,
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: parseFloat(vioPosition.x.toFixed(3)),
                    y: parseFloat(vioPosition.y.toFixed(3)),
                    z: parseFloat(vioPosition.z.toFixed(3)),
                },
                rotation: {
                    // always send quaternions over the wire
                    x: parseFloat(vioRotation._x.toFixed(3)),
                    y: parseFloat(vioRotation._y.toFixed(3)),
                    z: parseFloat(vioRotation._z.toFixed(3)),
                    w: parseFloat(vioRotation._w.toFixed(3)),
                },
                color: data.color,
            },
        };
        this.mqtt.publish(`${this.arena.vioTopic}${this.arena.camName}`, msg); // extra timestamp info at end for debugging
    },

    /**
     * Update component data
     * @ignore
     */
    update(oldData) {
        const { data, position, rotation } = this;
        if (oldData.showStats !== data.showStats) {
            document.getElementById('pose-stats').style.display = data.showStats ? 'block' : 'none';
            if (this.data.showStats) {
                // update initial position of stats when opened
                document.getElementById('pose-stats').textContent = `Position: ${ARENAUtils.coordsToText(
                    position
                )}\r\nQ Rotation: ${ARENAUtils.rotToText(rotation)}\r\nEA Rotation: ${ARENAUtils.rotToEulerText(
                    rotation
                )}`;
            }
        }
    },

    /**
     * Every tick, update rotation and position of the camera
     * If a position or rotation change is detected, or time for a heartbeat, trigger message publish
     * @ignore
     */
    tick() {
        if (!this.initialized) return;
        const { data, el, position, rotation } = this;

        this.heartBeatCounter++;

        rotation.setFromRotationMatrix(el.object3D.matrixWorld);
        position.setFromMatrixPosition(el.object3D.matrixWorld);

        this.camParent = el.object3D.parent.matrixWorld;
        this.cam = el.object3D.matrixWorld;

        this.cpi.copy(this.camParent).invert();
        // this.cpi.getInverse(this.camParent);
        this.cpi.multiply(this.cam);

        if (data.vioEnabled) {
            this.vioMatrix.copy(this.cpi);
            vioRotation.setFromRotationMatrix(this.cpi);
            vioPosition.setFromMatrixPosition(this.cpi);
            this.publishVio(); // publish vio on every tick (if enabled)
        }

        const rotationCoords = ARENAUtils.rotToText(rotation);
        const positionCoords = ARENAUtils.coordsToText(position);
        const newPose = `${rotationCoords} ${positionCoords}`;

        // update position if pose changed, or every 1 sec heartbeat
        if (this.heartBeatCounter % (1000 / this.arena.params.camUpdateIntervalMs) === 0) {
            // heartbeats are sent as create; TMP: sending as updates
            this.publishPose();
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            this.lastPos.copy(this.el.object3D.position);
            this.lastPos.y -= this.arena.defaults.camHeight;
            sceneHist[this.arena.namespacedScene] = {
                ...sceneHist[this.arena.namespacedScene],
                lastPos: this.lastPos,
            };
            localStorage.setItem('sceneHistory', JSON.stringify(sceneHist));
        } else if (this.lastPose !== newPose) {
            // Only update frustum if camera pose has changed and video culling is enabled
            if (this.isVideoFrustumCullingEnabled()) {
                const cam = el.components.camera.camera;
                this.frustum.setFromProjectionMatrix(
                    this.frustMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
                );
            }
            this.publishPose();
            if (this.data.showStats) {
                document.getElementById('pose-stats').textContent = `Position: ${ARENAUtils.coordsToText(
                    position
                )}\r\nQ Rotation: ${ARENAUtils.rotToText(rotation)}\r\nEA Rotation: ${ARENAUtils.rotToEulerText(
                    rotation
                )}`;
            }
        }
        this.lastPose = newPose;

        if (
            !this.videoDefaultResolutionSet &&
            ARENA &&
            this.jitsi.initialized &&
            this.arena.videoDefaultResolutionConstraint
        ) {
            // set scene-options, videoDefaultResolutionConstraint, only once
            this.jitsi.setDefaultResolutionRemotes(this.arena.videoDefaultResolutionConstraint);
            this.videoDefaultResolutionSet = true;
        }
    },

    isVideoFrustumCullingEnabled() {
        return ARENA && this.arena.videoFrustumCulling;
    },

    isVideoDistanceConstraintsEnabled() {
        return ARENA && this.arena.videoDistanceConstraints;
    },

    viewIntersectsObject3D(obj3D) {
        // note: bbox.setFromObject computes the world-axis-aligned bounding box of the video cube
        this.bbox.setFromObject(obj3D);
        return this.frustum.intersectsBox(this.bbox);
    },
});
