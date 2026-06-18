import { SplatMesh } from '@sparkjsdev/spark';

/**
 * @fileoverview Render 3D Gaussian Splats using the Spark renderer.
 *
 * Replaces the previous WebGL-only quadjr `aframe-gaussian-splatting` build.
 * Spark is WebGL2-based, integrates with A-Frame's default renderer, works in
 * WebXR, and supports .ply (incl. compressed), .splat, .spz, .ksplat and .sog.
 * https://sparkjs.dev
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2025, The CONIX Research Center. All rights reserved.
 * @date 2025
 */

/**
 * Load a Gaussian Splat as a Spark SplatMesh attached to this entity.
 * The shared SparkRenderer is provided by the `spark` system.
 * @module gaussian_splatting
 */
AFRAME.registerComponent('gaussian_splatting', {
    schema: {
        src: { type: 'string' },
        // Build a level-of-detail tree at load time. Spark processes the splat in
        // a background worker (~1-3s per 1M splats), reducing the rendered splat
        // count for large/dense captures to improve FPS. No file conversion needed.
        // Prefer an offline pre-built `.rad` source for large scenes (see below),
        // in which case leave this false (the LoD tree is already baked in).
        lod: { type: 'boolean', default: false },
        // Stream a pre-built, chunked LoD tree (a `.rad` header + `.radc` chunks,
        // produced by `build-lod --rad-chunked`). Splat data is fetched on demand
        // as the viewer approaches, instead of downloading the whole file up front.
        // Only meaningful with a chunked `.rad` src.
        paged: { type: 'boolean', default: false },
        // Per-mesh LoD detail multiplier (>1 = finer detail, <1 = coarser/faster).
        // Applies to a `.rad` LoD tree or a runtime `lod: true` build; no-op otherwise.
        lodScale: { type: 'number', default: 1 },
        // Legacy attributes retained for backward compatibility with persisted
        // scenes. They were specific to the previous quadjr renderer and have no
        // effect with Spark (which renders through A-Frame's own renderer).
        cutoutEntity: { type: 'string', default: '' },
        pixelRatio: { type: 'number', default: 1 },
        xrPixelRatio: { type: 'number', default: 0.5 },
    },
    init() {
        this.splatMesh = null;
        this.sparkSystem = this.el.sceneEl.systems.spark;
    },
    update(oldData) {
        const { el, data } = this;
        const { src } = data;

        if (!src) {
            return;
        }

        // Only (re)load when the source actually changes; ignore legacy attr changes
        if (oldData.src === src && this.splatMesh) {
            return;
        }

        this.remove();

        // register with model-progress system to handle model loading events
        document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

        // ensure the shared Spark renderer is attached to the scene
        this.sparkSystem.getSparkRenderer();

        const splatMesh = new SplatMesh({
            url: src,
            // `.rad` sources carry their LoD tree intrinsically (extension-driven);
            // `lod` builds one at runtime, `paged` streams a chunked `.rad`.
            lod: data.lod,
            paged: data.paged,
            onProgress: (event) => {
                if (event && event.total > 0) {
                    el.emit('model-progress', { src, loaded: event.loaded, total: event.total });
                }
            },
        });
        // Per-mesh LoD detail multiplier (no-op when this mesh has no LoD tree).
        if (data.lodScale !== 1) {
            splatMesh.lodScale = data.lodScale;
        }
        // Spark loads splats in OpenCV (Y-down) coordinates; re-orient to three.js /
        // A-Frame Y-up. quaternion.set(x, y, z, w) -> (1,0,0,0) is a 180° flip about X.
        // Applied on the mesh itself so the entity's A-Frame transform composes on top.
        splatMesh.quaternion.set(1, 0, 0, 0);
        this.splatMesh = splatMesh;
        el.setObject3D('mesh', splatMesh);

        splatMesh.initialized
            .then(() => {
                // loaded === total marks this entry done in the progress popup
                el.emit('model-progress', { src, loaded: 1, total: 1 });
                el.emit('model-loaded', { format: 'splat', model: splatMesh });
            })
            .catch((error) => {
                const message = error && error.message ? error.message : 'Failed to load Gaussian splat';
                console.error(message);
                el.emit('model-error', { format: 'splat', src });
            });
    },
    remove() {
        if (!this.splatMesh) {
            return;
        }
        this.el.removeObject3D('mesh');
        this.splatMesh.dispose?.();
        this.splatMesh = null;
    },
});
