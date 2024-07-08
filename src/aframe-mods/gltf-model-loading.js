/**
 * @fileoverview Emit model onProgress (loading) event for gltf models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

// AFRAME Monkeypatch (src/components/gltf-model.js)
AFRAME.components['gltf-model'].Component.prototype.update = function update() {
    const self = this;
    const { el } = this;
    const src = this.data;

    if (!src) {
        return;
    }

    this.remove();

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

    this.ready.then(() => {
        self.loader.load(
            src,
            (gltfModel) => {
                self.model = gltfModel.scene || gltfModel.scenes[0];
                self.model.animations = gltfModel.animations;
                self.model.asset = gltfModel.asset; // save asset
                el.setObject3D('mesh', self.model);
                el.emit('model-loaded', { format: 'gltf', model: self.model });
            },
            (xhr) => {
                el.emit('model-progress', { src, loaded: xhr.loaded, total: xhr.total });
            },
            (error) => {
                const message = error && error.message ? error.message : 'Failed to load glTF model';
                console.error(message);
                el.emit('model-error', { format: 'gltf', src });
            }
        );
    });
};
