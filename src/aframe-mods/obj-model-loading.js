/**
 * @fileoverview Emit model onProgress (loading) event for obj models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

AFRAME.components['object-model'].Component.prototype.update = function() {
    const self = this;
    const el = this.el;
    const src = this.data;

    if (!src) {
        return;
    }

    this.remove();

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

    this.loader.load(src, function objLoaded(objModel) {
        self.model = objModel.scene || objModel.scenes[0];
        self.model.animations = objModel.animations;
        self.model.asset = objModel.asset; // save asset
        el.setObject3D('mesh', self.model);
        el.emit('model-loaded', {format: 'obj', model: self.model});
    }, function objProgress(xhr) {
        el.emit('model-progress', {src: src, loaded: xhr.loaded, total: xhr.total});
    }, function objFailed(error) {
        const message = (error && error.message) ? error.message : 'Failed to load obj model';
        console.error(message);
        el.emit('model-error', {format: 'obj', src: src});
    });
};
