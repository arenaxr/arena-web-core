/* global AFRAME, ARENA */

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

            const clickPos = vec3ToObject(position);
            const coordsData = setClickData(evt);

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
            }
        });

        // console.log("mouseup init");
        this.el.addEventListener('mouseup', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = vec3ToObject(position);
            const coordsData = setClickData(evt);

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
            }
        });

        this.el.addEventListener('mouseenter', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = vec3ToObject(position);
            const coordsData = setCoordsData(evt);

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
                window.lastMouseTarget = this.id;
            }
        });

        this.el.addEventListener('mouseleave', function(evt) {
            const camera = document.getElementById('my-camera');
            const position = camera.getAttribute('position');

            const clickPos = vec3ToObject(position);
            const coordsData = setCoordsData(evt);

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
                window.lastMouseTarget = undefined;
            }
        });
    },
});
