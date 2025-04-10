/**
 * @fileoverview Tracking Hand controller movement in real time.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import { ARENAUtils } from '../../utils';
import { ARENA_EVENTS, TOPICS } from '../../constants';

// path to controller models
const handControllerPath = {
    Left: 'static/models/hands/valve_index_left.gltf',
    Right: 'static/models/hands/valve_index_right.gltf',
};

/**
 *  Tracking Hand controller movement in real time.
 * @module arena-hand
 * @property {boolean} enabled - Controller enabled.
 * @property {string} hand - Controller hand.
 *
 */
AFRAME.registerComponent('arena-hand', {
    schema: {
        enabled: { type: 'boolean', default: false },
        hand: { type: 'string', default: 'left' },
        /* eslint-disable prettier/prettier */
        downEvents: {
            // prettier-ignore
            default: [
                'gripdown', 'gripclose', 'abuttondown', 'bbuttondown', 'xbuttondown', 'ybuttondown',
                'pointup', 'thumbup', 'pointingstart', 'pistolstart',
                'thumbstickdown'
            ],
        },
        upEvents: {
            // prettier-ignore
            default: [
                'gripup', 'gripopen', 'abuttonup', 'bbuttonup', 'xbuttonup', 'ybuttonup',
                'pointdown', 'thumbdown', 'pointingend', 'pistolend',
                'thumbstickup'
            ],
        },
        /* eslint-disable prettier/prettier */
    },

    dependencies: ['laser-controls'],

    init() {
        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();
        this.lastPose = '';
        this.isReady = false;

        ARENA.events.addEventListener(ARENA_EVENTS.ARENA_LOADED, this.ready.bind(this));
    },

    ready() {
        const { data, el } = this;

        const { sceneEl } = el;

        this.mqtt = sceneEl.systems['arena-mqtt'];

        // capitalize hand type
        data.hand = data.hand.charAt(0).toUpperCase() + data.hand.slice(1);

        this.name = data.hand === 'Left' ? ARENA.handLName : ARENA.handRName;

        this.topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr({
            nameSpace: ARENA.nameSpace,
            sceneName: ARENA.sceneName,
            userClient: ARENA.userClient,
        });

        el.addEventListener('controllerconnected', () => {
            el.setAttribute('visible', true);
            el.setAttribute('collision-publisher', 'enabled', true);
            const msg = {
                object_id: this.name,
                action: 'create',
                type: 'object',
                data: {
                    object_type: `hand${data.hand}`,
                    position: { x: 0, y: -1, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    url: this.getControllerURL(),
                    dep: ARENA.idTag,
                },
            };
            if (msg.data.url.includes('magicleap')) {
                msg.data.scale = { x: 0.01, y: 0.01, z: 0.01 };
            }
            this.mqtt.publish(this.topicBase.formatStr({ userObj: this.name }), msg);
            data.enabled = true;
        });

        el.addEventListener('controllerdisconnected', () => {
            el.setAttribute('visible', false);
            el.setAttribute('collision-publisher', 'enabled', false);
            // when disconnected, try to cleanup hands
            this.mqtt.publish(this.topicBase.formatStr({ userObj: this.name }), {
                object_id: this.name,
                action: 'delete',
            });
        });

        const _this = this;
        data.downEvents.forEach((b) => {
            el.addEventListener(b, (evt) => {
                _this.eventAction(evt, b);
            });
        });

        data.upEvents.forEach((b) => {
            el.addEventListener(b, (evt) => {
                _this.eventAction(evt, b);
            });
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.params.camUpdateIntervalMs, this);

        this.isReady = true;
    },

    getControllerURL() {
        const { data, el } = this;

        let url = el.getAttribute('gltf-model');
        if (!url) url = handControllerPath[data.hand];

        return url;
    },

    publishPose() {
        const { data } = this;
        if (!data.enabled || !data.hand) return;
        // const hand = data.hand.charAt(0).toUpperCase() + data.hand.slice(1);

        const msg = {
            object_id: this.name,
            action: 'update',
            type: 'object',
            data: {
                object_type: `hand${this.data.hand}`,
                position: {
                    x: ARENAUtils.round3(this.position.x),
                    y: ARENAUtils.round3(this.position.y),
                    z: ARENAUtils.round3(this.position.z),
                },
                rotation: {
                    // always send quaternions over the wire
                    x: ARENAUtils.round3(this.rotation._x),
                    y: ARENAUtils.round3(this.rotation._y),
                    z: ARENAUtils.round3(this.rotation._z),
                    w: ARENAUtils.round3(this.rotation._w),
                },
                url: this.getControllerURL(),
                dep: ARENA.idTag,
            },
        };
        if (msg.data.url.includes('magicleap')) {
            msg.data.scale = { x: 0.01, y: 0.01, z: 0.01 };
        }
        this.mqtt.publish(this.topicBase.formatStr({ userObj: this.name }), msg);
    },

    eventAction(evt, eventName) {
        const { el } = this;

        const newPosition = new THREE.Vector3();
        el.object3D.getWorldPosition(newPosition);

        const coordsData = {
            x: ARENAUtils.round3(newPosition.x),
            y: ARENAUtils.round3(newPosition.y),
            z: ARENAUtils.round3(newPosition.z),
        };

        // publish to MQTT
        // publishing events attached to user id objects allows sculpting security
        this.mqtt.publish(this.topicBase.formatStr({ userObj: this.name }), {
            object_id: this.name,
            action: 'clientEvent',
            type: eventName,
            data: {
                originPosition: coordsData,
                target: this.name,
            },
        });
    },

    tick() {
        if (!this.isReady) return;

        if (!this.name) {
            this.name = this.data.hand === 'Left' ? ARENA.handLName : ARENA.handRName;
        }

        // TODO:(mwfarb): resolve oculus-touch controls publishing +43 x-axis rotation orientationOffset from arena-web
        // TODO:(mwfarb): https://aframe.io/docs/1.5.0/components/tracked-controls.html#value_orientationoffset
        // TODO:(mwfarb): We could apply the orientationOffset to the external publish if we need to...

        this.rotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
        this.position.setFromMatrixPosition(this.el.object3D.matrixWorld);

        const rotationCoords = AFRAME.utils.coordinates.stringify(this.rotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(this.position);

        const newPose = `${rotationCoords} ${positionCoords}`;
        if (this.lastPose !== newPose) {
            this.publishPose();
            this.lastPose = newPose;
        }
    },
});
