/* global AFRAME */

/**
 * @fileoverview Emit model onProgress (loading) event for gltf models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.components['gltf-model'].Component.prototype.update = function() {
    const self = this;
    const el = this.el;
    const src = this.data;

    if (!src) {
        return;
    }

    this.remove();

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

    this.loader.load(src, function gltfLoaded(gltfModel) {
        self.model = gltfModel.scene || gltfModel.scenes[0];
        self.model.animations = gltfModel.animations;
        self.model.asset = gltfModel.asset; // save asset
        el.setObject3D('mesh', self.model);
        el.emit('model-loaded', {format: 'gltf', model: self.model});
    }, function gltfProgress(xhr) {
        el.emit('model-progress', {src: src, progress: (xhr.loaded / xhr.total * 100)});
    }, function gltfFailed(error) {
        const message = (error && error.message) ? error.message : 'Failed to load glTF model';
        console.error(message);
        el.emit('model-error', {format: 'gltf', src: src});
    });
};
