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
            this.session = this.el.renderer.xr.getSession();
            this.session.addEventListener('ar-hit-test-select-start', this.hitStartHandler);
            this.session.addEventListener('ar-hit-test-select', this.hitEndHandler);
        }
    },

    exitARHandler: function() {
        this.session?.removeEventListener('ar-hit-test-select-start', this.hitStartHandler);
        this.session?.removeEventListener('ar-hit-test-select', this.hitEndHandler);
    },

    hitStartHandler: function(evt) {
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const camPosition = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(camPosition);
        const {position, rotation} = ARENAUtils.setClickData(evt);

        if ('inputSource' in evt) {
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

        if ('inputSource' in evt) {
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
