/* global AFRAME, ARENA */

import * as ARENAUtils from '../utils.js'; 

/**
 * Listen for clicks, call defined function on event evt
 *
 */
AFRAME.registerComponent('click-listener', {
    // listen for clicks, call defined function on event evt
    init: function() {
        const self = this;

        this.el.addEventListener('mousedown', function(evt) {
            const clickPos = ARENAUtils.vec3ToObject(ARENA.newPosition);
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
                    ARENA.mqtt.publish(ARENA.outputTopic + this.id, thisMsg);
                }
                // console.log(this.id + ' mousedown at: ', ARENAUtils.coordsToText(coordsData), 'by', ARENA.camName);
            }
        });

        // console.log("mouseup init");
        this.el.addEventListener('mouseup', function(evt) {
            const clickPos = ARENAUtils.vec3ToObject(ARENA.newPosition);
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
                    ARENA.mqtt.publish(ARENA.outputTopic + this.id, thisMsg);
                }
                // console.log(this.id + ' mouseup at: ', ARENAUtils.coordsToText(coordsData), 'by', ARENA.camName);
            }
        });

        this.el.addEventListener('mouseenter', function(evt) {
            const clickPos = ARENAUtils.vec3ToObject(ARENA.newPosition);
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
                    ARENA.mqtt.publish(ARENA.outputTopic + this.id, thisMsg);
                }
                window.ARENA.lastMouseTarget = this.id;
            }
        });

        this.el.addEventListener('mouseleave', function(evt) {
            const clickPos = ARENAUtils.vec3ToObject(ARENA.newPosition);
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
                    ARENA.mqtt.publish(ARENA.outputTopic + this.id, thisMsg);
                }
                window.ARENA.lastMouseTarget = undefined;
            }
        });
    },
});
