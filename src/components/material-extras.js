/* eslint-disable max-len */
/* global AFRAME */

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
 * Implements a timeout scheme in lack of better understanding of the timing/events causing properties to not be available.
 * @module material-extras
 * @property {string} [encoding=sRGBEncoding] - The material encoding; One of 'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding', 'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking'. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {boolean} [needsUpdate=false] - Specifies that the material needs to be recompiled. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {boolean} [colorWrite=true] - Whether to render the material's color. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {number} [renderOrder=1] - This value allows the default rendering order of scene graph objects to be overridden. See [Three.js Object3D.renderOrder]{@link https://threejs.org/docs/#api/en/core/Object3D.renderOrder}.
 * @property {boolean} [transparentOccluder=false] - If `true`, will set `colorWrite=false` and `renderOrder=0` to make the material a transparent occluder.
 * @property {number} [defaultRenderOrder=1] - Used as the renderOrder when transparentOccluder is reset to `false`.
*/
AFRAME.registerComponent('material-extras', {
    dependencies: ['material'],
    schema: {
        encoding: {default: 'sRGBEncoding', oneOf: [
            'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding',
            'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking']},
        needsUpdate: {default: false},
        colorWrite: {default: true},
        renderOrder: {default: 1},
        transparentOccluder: {default: false},
        defaultRenderOrder: {default: 1},
    },
    retryTimeouts: [1000, 2000, 5000, 10000],
    init: function() {
        this.update();
    },
    update: function(oldData) {
        this.retryIndex = 0;

        let transparentOccluder = false;
        if (oldData) {
            transparentOccluder = oldData.transparentOccluder;
            if (oldData.renderOrder !== this.data.renderOrder ||
                oldData.colorWrite !== this.data.colorWrite) {
                this.data.needsUpdate = true;
            }
            if (this.data.encoding != oldData.transparentOccluder) this.data.needsUpdate = true;
        }

        if (transparentOccluder !== this.data.transparentOccluder) {
            // a transparent occluder has renderOrder=0 and colorWrite=false
            if (this.data.transparentOccluder == true) {
                this.data.renderOrder = 0;
                this.data.colorWrite = false;
            } else {
                this.data.renderOrder = this.data.defaultRenderOrder; // default renderOrder used in the arena
                this.data.colorWrite = true; // default colorWrite
            }
            this.data.needsUpdate = true;
        }
        this.el.object3D.renderOrder=this.data.renderOrder;

        // do a retry scheme to apply material properties (waiting on events did not seem to work for all cases)
        if (this.data.needsUpdate) this.updateMaterial();
    },
    updateMaterial: function() {
        const mesh = this.el.getObject3D('mesh');

        if (!mesh) {
            console.error('could not find mesh!');
            this.retryUpdateMaterial();
        }

        if (mesh.material) {
            mesh.material.needsUpdate = this.data.needsUpdate;
            mesh.material.colorWrite = this.data.colorWrite;
            if (mesh.material.map) {
                mesh.material.map.encoding = THREE[this.data.encoding];
                this.data.needsUpdate = false;
            } else this.retryUpdateMaterial();
        } else this.retryUpdateMaterial();
    },
    retryUpdateMaterial() {
        if (this.retryIndex < this.retryTimeouts.length) {
            setTimeout(async () => {
                this.retryIndex++;
                this.updateMaterial();
            }, this.retryTimeouts[this.retryIndex]); // try again in a bit
        }
    },
});
