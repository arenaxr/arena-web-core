/* global AFRAME, ARENA */

/**
 * @fileoverview Load scene from persistence.
 * TODO: this component is currently not used and probably needs to be updated
 * 
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Load scene from persistence.
 * @todo this component is currently not used and probably needs to be updated
 * @module load-scene
 */
AFRAME.registerComponent('load-scene', {
    // load scene from persistence db
    schema: {
        on: {
            default: '',
        }, // event to listen 'on'
        url: {
            default: '',
        }, // http:// style url
        position: {
            type: 'vec3',
            default: {
                x: 0,
                y: 0,
                z: 0,
            },
        },
        rotation: {
            type: 'vec4',
            default: {
                x: 0,
                y: 0,
                z: 0,
                w: 1,
            },
        },
    },

    multiple: true,

    init: function() {
        const self = this;
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        const data = this.data; // Component property values.
        const el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function(evt) {
                if ('cursorEl' in evt.detail) {
                    // internal click event, our scene only
                } else {
                    // MQTT click event that everyone gets
                    console.log('load-scene url=' + data.url);
                    if (!this.loaded) {
                        ARENA.loadArenaScene(data.url, data.position, data.rotation);
                        this.loaded = true;
                    } else {
                        ARENA.unloadArenaScene(data.url);
                        this.loaded = false;
                    }
                }
            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        // this.removeEventListeners()
    },
    play: function() {
        // this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        const data = this.data;
        const el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    },
});
