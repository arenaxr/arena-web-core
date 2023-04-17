/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

AFRAME.registerComponent('ar-hit-test-listener', {
    schema: {
        enabled: {type: 'boolean', default: true},
    },

    init: function() {
        this.enterARHandler = this.enterARHandler.bind(this);
        this.exitARHandler = this.exitARHandler.bind(this);
        this.hitStartHandler = this.hitStartHandler.bind(this);
        this.hitEndHandler = this.hitEndHandler.bind(this);
        this.el.addEventListener('enter-vr', this.enterARHandler);
        this.el.addEventListener('exit-vr', this.exitARHandler);
    },

    enterARHandler: function() {
        if (this.el.is('ar-mode')) {
            this.el.addEventListener('ar-hit-test-select-start', this.hitStartHandler);
            this.el.addEventListener('ar-hit-test-select', this.hitEndHandler);
            this.el.setAttribute('raycaster', 'enabled', 'true');
            document.getElementById('mouse-cursor').setAttribute('raycaster', 'enabled', 'false');
        }
    },

    exitARHandler: function() {
        this.el.removeEventListener('ar-hit-test-select-start', this.hitStartHandler);
        this.el.removeEventListener('ar-hit-test-select', this.hitEndHandler);
        this.el.setAttribute('raycaster', 'enabled', 'false');
        document.getElementById('mouse-cursor').setAttribute('raycaster', 'enabled', 'true');
    },

    hitStartHandler: function(evt) {
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const camPosition = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(camPosition);
        const {position, rotation} = ARENAUtils.setClickData(evt);

        if ('inputSource' in evt.detail) {
            // original hit-test event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'hitstart',
                data: {
                    clickPos: clickPos,
                    position,
                    rotation,
                    source: ARENA.camName,
                },
            };
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
        }
    },

    hitEndHandler: function(evt) {
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const camPosition = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(camPosition);
        const {position, rotation} = ARENAUtils.setClickData(evt);

        if ('inputSource' in evt.detail) {
            // original hit-test event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'hitend',
                data: {
                    clickPos: clickPos,
                    position,
                    rotation,
                    source: ARENA.camName,
                },
            };
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
        }
    },
});
