/**
 * @fileoverview Load a three.js scene
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, THREE */

/**
 * Load a [THREE.js scene]{https://threejs.org/docs/#api/en/scenes/Scene}. THREE.js scene format is an almost direct serialization of the THREE.js objects, and can be THREE.js version-specific; you can see THREE.js version in the JS console once you open ARENA
 * For a move portable format, using glTF is preferred.
 * @module threejs-scene
 * @property {string} url - the three.js scene to load
 *
 */
AFRAME.registerComponent('threejs-scene', {
    schema: {
        url: {type: 'string', default: ''},
    },

    init: function() {
        this.model = null;
        this.loader = null;
        this.loader = new THREE.ObjectLoader();
    },

    update: function(oldData) {
        const self = this;
        const el = this.el;

        if (!this.data.url) {
            console.error('no url given');
            return;
        }

        this.remove();

        this.loader.load(
            // resource URL
            this.data.url,
            // onLoad callback
            function(obj) {
                // Add the loaded object to the scene
                self.model = obj;
                el.setObject3D('mesh', self.model);
                el.emit('model-loaded', {format: 'threejs-scene', model: self.model});
                console.log('loaded');
            },
            // onProgress callback
            function(xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            // onError callback
            function(err) {
                console.error('Error loading three.js scene');
            },
        );
    },

    remove: function() {
        if (!this.model) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
