/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

/**
 * Listen for clicks, call defined function on event evt
 *
 */
AFRAME.registerComponent('click-listener', {
    // listen for clicks, call defined function on event evt
    init: function() {
        const self = this;

        this.el.addEventListener('mousedown', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = ARENAUtils.vec3ToObject(position);
            const coordsData = ARENAUtils.setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                const thisMsg = {
                    object_id: this.id,
                    action: 'clientEvent',
                    type: 'mousedown',
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: ARENA.camName,
                    },
                };
                if (!self.el.getAttribute('goto-url')) {
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                }
            }
        });

        this.el.addEventListener('mouseup', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = ARENAUtils.vec3ToObject(position);
            const coordsData = ARENAUtils.setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                const thisMsg = {
                    object_id: this.id,
                    action: 'clientEvent',
                    type: 'mouseup',
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: ARENA.camName,
                    },
                };
                if (!self.el.getAttribute('goto-url')) {
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                }
            }
        });

        this.el.addEventListener('mouseenter', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = ARENAUtils.vec3ToObject(position);
            const coordsData = ARENAUtils.setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                const thisMsg = {
                    object_id: this.id,
                    action: 'clientEvent',
                    type: 'mouseenter',
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: ARENA.camName,
                    },
                };
                if (!self.el.getAttribute('goto-url')) {
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                }
                window.lastMouseTarget = this.id;
            }
        });

        this.el.addEventListener('mouseleave', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = ARENAUtils.vec3ToObject(position);
            const coordsData = ARENAUtils.setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                const thisMsg = {
                    object_id: this.id,
                    action: 'clientEvent',
                    type: 'mouseleave',
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: ARENA.camName,
                    },
                };
                if (!self.el.getAttribute('goto-url')) {
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                }
                window.lastMouseTarget = undefined;
            }
        });
    },
});
