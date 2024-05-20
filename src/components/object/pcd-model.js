/* global AFRAME */
import { PCDLoader } from '../vendor/pcd-loader';

/**
 * @fileoverview Load PCD models
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Load Point Cloud Data (PCD) models using three.js example loader
 * Point Cloud Data is a file format for Point Cloud Library.
 * https://en.wikipedia.org/wiki/Point_Cloud_Library
 *
 * @module pcd-model
 */
AFRAME.registerComponent('pcd-model', {
    schema: {
        src: { type: 'string' },
        url: { type: 'string' },
        pointSize: { type: 'number', default: 0.01 },
        pointColor: { type: 'color', default: '' },
        opacity: { type: 'number', default: 1 },
    },
    init() {
        this.points = null;
        this.loader = new PCDLoader();
    },
    update() {
        const self = this;
        const { el } = this;
        const src = this.data.src ? this.data.src : this.data.url;

        if (!src) {
            return;
        }

        this.remove();

        // register with model-progress system to handle model loading events
        document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

        this.loader.load(
            src,
            (points) => {
                self.points = points;
                el.setObject3D('mesh', points);
                el.emit('model-loaded', { format: 'pcd', model: self.model });
                // eslint-disable-next-line no-param-reassign
                points.material.size = self.data.pointSize ? self.data.pointSize : 1;
                if (self.data.pointColor) {
                    points.material.color.set(self.data.pointColor);
                }
                if (self.data.opacity !== 1) {
                    points.material.transparent = true;
                    points.material.opacity = self.data.opacity;
                    points.material.needsUpdate = true;
                } else {
                    points.material.transparent = false;
                }
            },
            (xhr) => {
                el.emit('model-progress', { src, progress: (xhr.loaded / xhr.total) * 100 });
            },
            (error) => {
                const message = error && error.message ? error.message : 'Failed to load PCD model';
                console.error(message);
                el.emit('model-error', { format: 'pcd', src });
            }
        );
    },
    remove() {
        if (!this.points) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
