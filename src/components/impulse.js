/* global AFRAME */

/**
 * @fileoverview Component to apply an impulse to an object to set it in motion
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * One physics feature is applying an impulse to an object to set it in motion.
 * This happens in conjunction with an event.
 * Requires [Physics for A-Frame VR]{@link https://github.com/n5ro/aframe-physics-system}
 * @module impulse
 * @requires aframe-physics-system
 *
 */
AFRAME.registerComponent('impulse', {
    schema: {
        on: {
            default: '',
        }, // event to listen 'on'
        force: {
            type: 'vec3',
            default: {
                x: 1,
                y: 1,
                z: 1,
            },
        },
        position: {
            type: 'vec3',
            default: {
                x: 1,
                y: 1,
                z: 1,
            },
        },
    },

    multiple: true,

    init: function() {
        const self = this;
    },

    update: function(oldData) {
        const data = this.data; // Component property values.
        const el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function(args) {
                if (args.detail.clicker) { // our synthetic event from MQTT
                    if (el.body) { // has physics = dynamic-body Component
                        // e.g. <a-entity impulse="on: mouseup; force: 1 50 1; position: 1 1 1" ...>
                        const force = new THREE.Vector3(data.force.x, data.force.y, data.force.z);
                        const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
                        el.body.applyImpulse(force, pos);
                    }
                }
            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },
    // handle component removal
    remove: function() {
        const data = this.data;
        const el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    },
});
