/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

/**
 * @fileoverview Component to listen for mouse events and publish corresponding events
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Keep track of mouse events and publish corresponding events
 * @module click-listener
 */
AFRAME.registerComponent('click-listener', {
        /**
         * Setup event listners for mouse events; listners publish events to MQTT
         * @alias module:click-listener
         * @todo Consolidate event listners (they are very similar)
         */
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
                if (!self.el.getAttribute('goto-url') && !self.el.getAttribute('textinput')) {
                    // publishing events attached to user id objects allows sculpting security
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
                if (!self.el.getAttribute('goto-url') && !self.el.getAttribute('textinput')) {
                    // publishing events attached to user id objects allows sculpting security
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
                if (!self.el.getAttribute('goto-url') && !self.el.getAttribute('textinput')) {
                    // publishing events attached to user id objects allows sculpting security
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
                if (!self.el.getAttribute('goto-url') && !self.el.getAttribute('textinput')) {
                    // publishing events attached to user id objects allows sculpting security
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                }
                window.lastMouseTarget = undefined;
            }
        });
    },
});
