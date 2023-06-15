/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils';

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
 * @todo Consolidate event listeners (they are very similar)
 */
AFRAME.registerComponent('click-listener', {
    schema: {
        bubble: {type: 'boolean', default: true},
        enabled: {type: 'boolean', default: true},
        default: true,
    },

    init: function() {
        this.mouseleaveHandler = this.mouseleaveHandler.bind(this);
        this.mouseenterHandler = this.mouseenterHandler.bind(this);
        this.mousedownHandler = this.mousedownHandler.bind(this);
        this.mouseupHandler = this.mouseupHandler.bind(this);
    },

    update: function(oldData) {
        if (this.data && !oldData) {
            this.registerListeners();
        } else if (!this.data && oldData) {
            this.unregisterListeners();
        }
    },
    remove: function() {
        this.unregisterListeners();
    },
    registerListeners: function() {
        this.el.addEventListener('mousedown', this.mousedownHandler);
        this.el.addEventListener('mouseup', this.mouseupHandler);
        this.el.addEventListener('mouseenter', this.mouseenterHandler);
        this.el.addEventListener('mouseleave', this.mouseleaveHandler);
    },
    unregisterListeners: function() {
        this.el.removeEventListener('mousedown', this.mousedownHandler);
        this.el.removeEventListener('mouseup', this.mouseupHandler);
        this.el.removeEventListener('mouseenter', this.mouseenterHandler);
        this.el.removeEventListener('mouseleave', this.mouseleaveHandler);
    },
    mousedownHandler: function(evt) {
        if (this.data.bubble === false) {
            evt.stopPropagation();
        }
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const position = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(position);
        const coordsData = ARENAUtils.setClickData(evt);

        if ('cursorEl' in evt.detail) {
            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'mousedown',
                data: {
                    clickPos: clickPos,
                    position: coordsData,
                    source: ARENA.camName,
                },
            };
            if (!this.el.getAttribute('goto-url') &&
                !this.el.getAttribute('textinput')) {
                // publishing events attached to user id objects allows sculpting security
                ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`,
                    thisMsg);
            }
        }
    },

    mouseupHandler: function(evt) {
        if (this.data.bubble === false) {
            evt.stopPropagation();
        }
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const position = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(position);
        const coordsData = ARENAUtils.setClickData(evt);

        if ('cursorEl' in evt.detail) {
            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'mouseup',
                data: {
                    clickPos: clickPos,
                    position: coordsData,
                    source: ARENA.camName,
                },
            };
            if (!this.el.getAttribute('goto-url') &&
                !this.el.getAttribute('textinput')) {
                // publishing events attached to user id objects allows sculpting security
                ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`,
                    thisMsg);
            }
        }
    },

    mouseenterHandler: function(evt) {
        if (this.data.bubble === false) {
            evt.stopPropagation();
        }
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const position = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(position);
        const coordsData = ARENAUtils.setCoordsData(evt);

        if ('cursorEl' in evt.detail) {
            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'mouseenter',
                data: {
                    clickPos: clickPos,
                    position: coordsData,
                    source: ARENA.camName,
                },
            };
            if (!this.el.getAttribute('goto-url') &&
                !this.el.getAttribute('textinput')) {
                // publishing events attached to user id objects allows sculpting security
                ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`,
                    thisMsg);
            }
        }
    },
    mouseleaveHandler: function(evt) {
        if (this.data.bubble === false) {
            evt.stopPropagation();
        }
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const position = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(position);
        const coordsData = ARENAUtils.setCoordsData(evt);

        if ('cursorEl' in evt.detail) {
            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'mouseleave',
                data: {
                    clickPos: clickPos,
                    position: coordsData,
                    source: ARENA.camName,
                },
            };
            if (!this.el.getAttribute('goto-url') &&
                !this.el.getAttribute('textinput')) {
                // publishing events attached to user id objects allows sculpting security
                ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`,
                    thisMsg);
            }
        }
    },
});
