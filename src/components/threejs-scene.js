/**
 * @fileoverview Load a three.js scene
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, THREE */

AFRAME.registerComponent('threejs-scene', {
    schema: {
        legacyLoader: {type: 'boolean', default: false},
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

        const onLoad = function(obj) {
            // Add the loaded object to the scene
            self.model = obj;
            el.setObject3D('mesh', self.model);
            el.emit('model-loaded', {format: 'threejs-scene', model: self.model});
            console.log('loaded');
        };

        if (!this.data.legacyLoader) {
            this.loader.load(
                // resource URL
                this.data.url,
                // onLoad callback
                onLoad,
                // onProgress callback
                function(xhr) {
                    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
                },
                // onError callback
                function(err) {
                    console.error('Error loading three.js scene');
                },
            );
        } else {
            try {
                fetch(this.data.url)
                    .then((response) => response.json())
                    .then((data) => {
                        //console.log(data);
                        //const json = JSON.parse(data);
                        const parsedObj = this.loader.parse(data);
                        console.log(parsedObj);
                    });
            } catch (err) {
                console.error('Error loading scene file:', err.message);
                return;
            }
        }
    },

    remove: function() {
        if (!this.model) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
