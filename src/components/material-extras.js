/* eslint-disable max-len */
/* global AFRAME, THREE */

import { ARENAUtils } from '../utils';

/**
 * @fileoverview Material extras component.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Allows to set extra material properties, namely texture colorspace, whether to render the material's color and render order.
 * The properties set here access directly [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * Implements a timeout scheme in lack of better management of the timing/events causing properties to not be available.
 * @module material-extras
 * @property {string} [overrideSrc=''] - Overrides the material in all meshes of an object (e.g. a basic shape or a GLTF).
 * @property {string} [colorSpace=SRGBColorSpace] - The material colorspace; See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {boolean} [colorWrite=true] - Whether to render the material's color. See [Three.js material]{@link https://threejs.org/docs/#api/en/materials/Material}.
 * @property {number} [renderOrder=1] - This value allows the default rendering order of scene graph objects to be overridden. See [Three.js Object3D.renderOrder]{@link https://threejs.org/docs/#api/en/core/Object3D.renderOrder}.
 * @property {boolean} [transparentOccluder=false] - If `true`, will set `colorWrite=false` and `renderOrder=0` to make the material a transparent occluder.
 */
AFRAME.registerComponent('material-extras', {
    dependencies: ['material'],
    schema: {
        overrideSrc: { default: '' },
        colorSpace: {
            default: 'SRGBColorSpace',
            oneOf: ['SRGBColorSpace', 'LinearSRGBColorSpace', 'DisplayP3ColorSpace', 'NoColorSpace'],
        },
        colorWrite: { default: true },
        renderOrder: { default: 1 },
        occluderRenderOrder: { default: -1 },
        transparentOccluder: { default: false },
    },
    retryTimeouts: [1000, 5000],
    init() {
        this.loader = new THREE.TextureLoader();
        this.doUpdate = true;
        this.previousData = { renderOrder: 1, colorWrite: true };
        this.loadTexture(this.data.overrideSrc);
        this.update();
        this.el.addEventListener('model-loaded', () => this.update());
        this.el.addEventListener('load', () => this.update());
        // going to retry updating material; TODO: check if we still need this
        this.retryUpdateMaterial();
    },
    update(oldData) {
        this.retryIndex = 0;

        let transparentOccluder = false;
        if (oldData) {
            transparentOccluder = oldData.transparentOccluder;
            if (
                oldData.renderOrder !== this.data.renderOrder ||
                oldData.colorWrite !== this.data.colorWrite ||
                oldData.colorSpace !== this.data.colorSpace ||
                oldData.overrideSrc !== this.data.overrideSrc
            ) {
                this.doUpdate = true;
            }
            if (oldData.overrideSrc !== this.data.overrideSrc) {
                this.loadTexture(this.data.overrideSrc);
            }
        }

        if (transparentOccluder !== this.data.transparentOccluder) {
            // a transparent occluder has renderOrder=0 and colorWrite=false
            if (this.data.transparentOccluder === true) {
                this.previousData = { renderOrder: this.data.renderOrder, colorWrite: this.data.colorWrite };
                this.el.setAttribute('material-extras', 'renderOrder', 0);
                this.el.setAttribute('material-extras', 'colorWrite', false);
            } else {
                // set to previous values
                this.el.setAttribute('material-extras', 'renderOrder', this.previousData.renderOrder);
                this.el.setAttribute('material-extras', 'colorWrite', this.previousData.colorWrite);
            }
            this.doUpdate = true;
        }

        // do a retry scheme to apply material properties (waiting on events did not seem to work for all cases)
        if (this.doUpdate) this.updateMaterial();
    },
    loadTexture(src) {
        if (src.length === 0) return;
        this.loader.load(
            ARENAUtils.crossOriginDropboxSrc(src),
            // onLoad callback
            (texture) => {
                this.texture = texture;
                this.doUpdate = true;
                this.texture.colorSpace = THREE[this.data.colorSpace];
                this.texture.flipY = false;
                this.update();
            },
            // onProgress callback currently not supported
            undefined,
            // onError callback
            (err) => console.error(`[material-extras] Error loading texture ${this.data.overrideSrc}: ${err}`)
        );
    },
    updateMeshMaterial(mesh) {
        /* eslint-disable no-param-reassign */
        if (!mesh) return;
        mesh.renderOrder = this.data.renderOrder;
        if (!mesh.material) return;

        mesh.material.colorWrite = this.data.colorWrite;
        if (mesh.material.map && this.texture) {
            mesh.material.map = this.texture;
            mesh.material.map.colorSpace = THREE[this.data.colorSpace];
        }
        mesh.material.needsUpdate = true;
        /* eslint-disable no-param-reassign */
    },
    updateMaterial() {
        this.updateMeshMaterial(this.el.object3D);

        // traverse children
        this.el.object3D.traverse((node) => {
            this.updateMeshMaterial(node);
        });
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
