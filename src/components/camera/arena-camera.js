/**
 * @fileoverview ARENA camera component; track camera movement
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import { ARENA_EVENTS, TOPICS } from '../../constants';
import { ARENAUtils } from '../../utils';

/**
 * Tracking camera movement in real time. Emits camera pose change and VIO change events.
 * @module arena-camera
 * @property {boolean} enabled - Indicates whether camera tracking is enabled.
 * @property {string} displayName - User display name (used to publish camera data).
 * @property {string} color - Head text color.
 * @property {number[]} rotation - Last camera rotation value.
 * @property {number[]} position - Last camera position value.
 * @property {boolean} showStats - Display camera position on the screen.
 *
 */
AFRAME.registerComponent('arena-camera', {
    schema: {
        enabled: { type: 'boolean', default: false },
        displayName: { type: 'string', default: 'No Name' },
        color: { type: 'string', default: `#${ARENAUtils.numToPaddedHex(Math.floor(Math.random() * 16777215), 6)}` },
        showStats: { type: 'boolean', default: false },
    },

    /**
     * Send initial camera create message; Setup heartbeat timer
     * @ignore
     */
    init() {
        this.isReady = false;
        ARENA.events.addEventListener(ARENA_EVENTS.ARENA_LOADED, this.ready.bind(this));
        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.params.camUpdateIntervalMs, this);
        this.el.sceneEl.addEventListener(ARENA_EVENTS.NEW_SETTINGS, (e) => {
            const args = e.detail;
            if (!args.userName) return; // only handle a user name change
            this.data.displayName = args.userName;
        });
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.mqtt = sceneEl.systems['arena-mqtt'];
        this.jitsi = sceneEl.systems['arena-jitsi'];

        this.lastPos = new THREE.Vector3();
        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();

        // instantiate frustum objs
        this.frustum = new THREE.Frustum();
        this.frustMatrix = new THREE.Matrix4();
        this.bbox = new THREE.Box3();

        this.lastPose = '';
        this.videoDefaultResolutionSet = false;

        this.presenceEl = document.getElementById('presenceSelect');
        this.headModelPathEl = document.getElementById('headModelPathSelect');

        this.heartBeatCounter = 0;

        this.pubTopic = TOPICS.PUBLISH.SCENE_USER.formatStr(ARENA.topicParams);

        // send initial create
        this.publishPose('create');

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
        this.isReady = true;
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
            object_id: ARENA.idTag,
            action,
            type: 'object',
            ttl: 30,
            data: {
                object_type: 'camera',
                position: {
                    x: ARENAUtils.round3(position.x),
                    y: ARENAUtils.round3(position.y),
                    z: ARENAUtils.round3(position.z),
                },
                rotation: {
                    // always send quaternions over the wire
                    x: ARENAUtils.round3(rotation._x),
                    y: ARENAUtils.round3(rotation._y),
                    z: ARENAUtils.round3(rotation._z),
                    w: ARENAUtils.round3(rotation._w),
                },
                'arena-user': arenaUser,
            },
        };
        if (this.presenceEl) {
            arenaUser.presence = this.presenceEl.value;
        } else {
            this.presenceEl = document.getElementById('presenceSelect');
        }

        if (this.jitsi.initialized) {
            arenaUser.jitsiId = this.jitsi.getJitsiId();
            arenaUser.hasAudio = this.jitsi.hasAudio;
            arenaUser.hasVideo = this.jitsi.hasVideo;
        }

        const faceTracker = this.el.sceneEl.systems['face-tracking'];
        if (faceTracker && faceTracker.isEnabled()) {
            arenaUser.hasAvatar = faceTracker.isRunning();
        }

        if (this.headModelPathEl) {
            arenaUser.headModelPath = this.headModelPathEl.value;
        } else {
            arenaUser.headModelPath = ARENA.defaults.headModelPath;
            this.headModelPathEl = document.getElementById('headModelPathSelect');
        }

        // extra timestamp info at end for debugging
        this.mqtt.publish(this.pubTopic, msg);
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
        if (!this.isReady) return;
        const { el, position, rotation } = this;

        this.heartBeatCounter++;

        rotation.setFromRotationMatrix(el.object3D.matrixWorld);
        position.setFromMatrixPosition(el.object3D.matrixWorld);

        this.camParent = el.object3D.parent.matrixWorld;
        this.cam = el.object3D.matrixWorld;

        this.cpi.copy(this.camParent).invert();
        // this.cpi.getInverse(this.camParent);
        this.cpi.multiply(this.cam);

        const rotationCoords = ARENAUtils.rotToText(rotation);
        const positionCoords = ARENAUtils.coordsToText(position);
        const newPose = `${rotationCoords} ${positionCoords}`;

        // update position if pose changed, or every 1 sec heartbeat
        if (this.heartBeatCounter % (1000 / ARENA.params.camUpdateIntervalMs) === 0) {
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

        if (!this.videoDefaultResolutionSet && this.jitsi.initialized && ARENA?.videoDefaultResolutionConstraint) {
            // set scene-options, videoDefaultResolutionConstraint, only once
            this.jitsi.setDefaultResolutionRemotes(ARENA.videoDefaultResolutionConstraint);
            this.videoDefaultResolutionSet = true;
        }
    },

    isVideoFrustumCullingEnabled() {
        return ARENA?.videoFrustumCulling;
    },

    isVideoDistanceConstraintsEnabled() {
        return ARENA?.videoDistanceConstraints;
    },

    viewIntersectsObject3D(obj3D) {
        // note: bbox.setFromObject computes the world-axis-aligned bounding box of the video cube
        this.bbox.setFromObject(obj3D);
        return this.frustum.intersectsBox(this.bbox);
    },
});
