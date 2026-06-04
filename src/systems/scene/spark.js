/**
 * @fileoverview Shared Spark (Gaussian Splatting) renderer system.
 *
 * Spark requires a single SparkRenderer per scene/renderer, shared by all
 * splat entities. This system owns that renderer and lazily attaches it to the
 * scene graph the first time a `gaussian_splatting` component needs it (by which
 * point A-Frame's WebGL renderer exists).
 *
 * https://sparkjs.dev
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2025, The CONIX Research Center. All rights reserved.
 * @date 2025
 */

import { SparkRenderer } from '@sparkjsdev/spark';

/**
 * Owns the single shared SparkRenderer for the scene.
 * @module spark
 */
AFRAME.registerSystem('spark', {
    init() {
        this.sparkRenderer = null;
    },
    /**
     * Lazily create and attach the shared SparkRenderer, returning it.
     * @returns {SparkRenderer} the shared Spark renderer
     * @alias module:spark
     */
    getSparkRenderer() {
        if (!this.sparkRenderer) {
            const { renderer } = this.sceneEl;
            this.sparkRenderer = new SparkRenderer({ renderer });
            this.sceneEl.object3D.add(this.sparkRenderer);
        }
        return this.sparkRenderer;
    },
});
