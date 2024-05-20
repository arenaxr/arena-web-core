/**
 * @fileoverview Emit model onProgress (loading) event for obj models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

// AFRAME Monkeypatch (src/components/obj-model.js)
AFRAME.components['obj-model'].Component.prototype.update = function update() {
    const self = this;
    const { el } = this;

    const { data } = this;
    if (!data.obj) {
        return;
    }
    this.resetMesh();

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, data.obj);

    this.loadObj(data.obj, data.mtl);
};
