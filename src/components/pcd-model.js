/* global AFRAME */
import {PCDLoader} from './vendor/pcd-loader.js';

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
        src: {type: 'string'},
        url: {type: 'string'},
        pointSize: {type: 'number', default: 0.01},
        pointColor: {type: 'color', default: '#7f7f7f'},
    },
    init: function() {
        this.points = null;
        this.loader = new PCDLoader();
    },
    update: function(oldData) {
        const self = this;
        const el = this.el;
        const src = (this.data.src) ? this.data.src: this.data.url;

        if (!src) {
            return;
        }

        this.remove();

        // register with model-progress system to handle model loading events
        document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

        const _this = this;
        this.loader.load(src, function pcdLoaded(points) {
            _this.points = points;
            el.setObject3D('mesh', points);
            el.emit('model-loaded', {format: 'pcd', model: self.model});
            points.material.size=(_this.data.pointSize) ? _this.data.pointSize : 1;
            if (_this.data.color) points.material.color.set((_this.data.color));
        }, function pcdProgress(xhr) {
            el.emit('model-progress', {src: src, progress: (xhr.loaded / xhr.total * 100)});
        }, function pcdFailed(error) {
            const message = (error && error.message) ? error.message : 'Failed to load PCD model';
            console.error(message);
            el.emit('model-error', {format: 'pcd', src: src});
        });
    },
});
