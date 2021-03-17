/**
 * @fileoverview Load a gltf model. Replace aframe gltf-model to save model asset property and provide load progress.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Example asset
 * "asset": {
 *  "extras": {
 *    "author": "Evan Hiltz (https://sketchfab.com/evan.hiltz)",
 *    "license": "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
 *    "source": "https://sketchfab.com/3d-models/dartmouth-assets-harbourwalk-sign-b82b691017c64e2dab5bd954c35e9efe",
 *    "title": "Dartmouth Assets - Harbourwalk Sign"
 *  },
 *  "generator": "Sketchfab-5.74.0",
 *  "version": "2.0"
 * },
 * /
/* global AFRAME, THREE */
AFRAME.registerSystem('agltf-model', {
    schema: {
        dracoDecoderPath: {default: ''},
    },

    init: function() {
        const path = this.data.dracoDecoderPath;
        this.dracoLoader = new THREE.DRACOLoader();
        this.dracoLoader.setDecoderPath(path);
    },

    update: function() {
        if (this.dracoLoader) {
            return;
        }
        const path = this.data.dracoDecoderPath;
        this.dracoLoader = new THREE.DRACOLoader();
        this.dracoLoader.setDecoderPath(path);
    },

    getDRACOLoader: function() {
        return this.dracoLoader;
    },
});

AFRAME.registerComponent('agltf-model', {
    schema: {
        src: {type: 'model'},
    },

    init: function() {
        const dracoLoader = this.system.getDRACOLoader();
        this.model = null;
        this.loader = new THREE.GLTFLoader();
        if (dracoLoader) {
            this.loader.setDRACOLoader(dracoLoader);
        }
    },

    update: function() {
        const self = this;
        const el = this.el;
        const src = this.data.src;

        if (!src) {
            return;
        }

        this.remove();

        this.loader.load(src, function gltfLoaded(gltfModel) {
            self.model = gltfModel.scene || gltfModel.scenes[0];
            self.model.animations = gltfModel.animations;
            self.model.asset = gltfModel.asset; // save asset
            el.setObject3D('mesh', self.model);
            el.emit('model-loaded', {format: 'gltf', model: self.model});
        }, undefined /* onProgress */, function gltfFailed(error) {
            const message = (error && error.message) ? error.message : 'Failed to load glTF model';
            warn(message);
            el.emit('model-error', {format: 'gltf', src: src});
        });
    },

    remove: function() {
        if (!this.model) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
