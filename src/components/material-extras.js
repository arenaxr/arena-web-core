/* eslint-disable max-len */
/* global AFRAME */

import {ARENAUtils} from '../utils.js';

/**
 * @fileoverview Material extras component.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Allows to set extra material properties, namely texture encoding, whether to render the material's color and render order.
 * The properties set here access directly [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * Implements a timeout scheme in lack of better management of the timing/events causing properties to not be available.
 * @module material-extras
 * @property {string} [overrideSrc=''] - Overrides the material in all meshes of an object (e.g. a basic shape or a GLTF).
 * @property {string} [encoding=sRGBEncoding] - The material encoding; One of 'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding', 'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking'. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {boolean} [colorWrite=true] - Whether to render the material's color. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {number} [renderOrder=1] - This value allows the default rendering order of scene graph objects to be overridden. See [Three.js Object3D.renderOrder]{@link https://threejs.org/docs/#api/en/core/Object3D.renderOrder}.
 * @property {boolean} [transparentOccluder=false] - If `true`, will set `colorWrite=false` and `renderOrder=0` to make the material a transparent occluder.
*/
AFRAME.registerComponent('material-extras', {
    dependencies: ['material'],
    schema: {
        overrideSrc: {default: ''},
        encoding: {default: 'sRGBEncoding', oneOf: [
            'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding',
            'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking']},
        colorWrite: {default: true},
        renderOrder: {default: 1},
        transparentOccluder: {default: false},
        wireframe: {default: true},
    },
    retryTimeouts: [1000, 2000, 5000, 10000],
    init: function() {
        this.loader = new THREE.TextureLoader();
        this.doUpdate = true;
        if (this.data.overrideSrc.length > 0) this.loadTexture(this.data.overrideSrc);
        this.update();
        this.el.addEventListener('model-loaded', () => this.update());
        this.el.addEventListener('load', () => this.update());

        console.info('MATERIAL EXTRAS:', this.schema.renderOrder.default);
    },
    update: function(oldData) {
        this.retryIndex = 0;

        let transparentOccluder = false;
        if (oldData) {
            transparentOccluder = oldData.transparentOccluder;
            if (oldData.renderOrder !== this.data.renderOrder ||
                oldData.colorWrite !== this.data.colorWrite ||
                oldData.encoding !== this.data.encoding ||
                oldData.wireframe !== this.data.wireframe ||
                oldData.overrideSrc !== this.data.overrideSrc) {
                this.doUpdate = true;
            }
            if (oldData.overrideSrc !== this.data.overrideSrc) {
                this.loadTexture(this.data.overrideSrc);
            }
        }

        if (transparentOccluder !== this.data.transparentOccluder) {
            // a transparent occluder has renderOrder=0 and colorWrite=false
            if (this.data.transparentOccluder == true) {
                this.data.renderOrder = 0;
                this.data.colorWrite = false;
            } else {
                this.data.renderOrder = this.schema.renderOrder.default; // default renderOrder used in the arena
                this.data.colorWrite = this.schema.colorWrite.default; // default colorWrite
            }
            this.doUpdate = true;
        }

        // this.el.object3D.renderOrder=this.data.renderOrder;

        // do a retry scheme to apply material properties (waiting on events did not seem to work for all cases)
        if (this.doUpdate) this.updateMaterial();
    },
    loadTexture(src) {
        this.loader.load(
            ARENAUtils.crossOriginDropboxSrc(src),
            // onLoad callback
            (texture) => {
                this.texture = texture;
                this.doUpdate = true;
                this.texture.encoding = THREE[this.data.encoding];
                this.texture.flipY = false;
                this.update();
            },
            // onProgress callback currently not supported
            undefined,
            // onError callback
            (err) => console.error(`[material-extras] Error loading texture ${this.data.overrideSrc}: ${err}`));
    },
    updateMeshMaterial: function(mesh) {
        mesh.renderOrder = this.data.renderOrder;
        if (mesh.material) {
            mesh.material.colorWrite = this.data.colorWrite;
            if (mesh.material.map && this.texture) {
                mesh.material.map = this.texture;
                mesh.material.map.encoding = THREE[this.data.encoding];
            }
            mesh.material.needsUpdate = true;
            mesh.material.wireframe = this.data.wireframe;
        }
    },
    updateMaterial: function() {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) {
            this.retryUpdateMaterial();
            return;
        }

        this.updateMeshMaterial(mesh);

        // traverse children
        mesh.traverse((node) => {
            if (node.isMesh) {
                this.updateMeshMaterial(node);
            }
        });
    },
    retryUpdateMaterial() {
        if (this.retryIndex < this.retryTimeouts.length) {
            setTimeout(async () => {
                this.retryIndex++;
                this.updateMaterial();
            }, this.retryTimeouts[this.retryIndex]); // try again in a bit
        } else {
            console.warn('[material-extras] Could not update material!');
        }
    },
});
