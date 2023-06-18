/* global AFRAME, THREE */

import { ARENAUtils } from '../utils';

/**
 * @fileoverview Component loads/unloads gltfs by simple user distance-based LOD
 * Inspired by aframe-lod <https://github.com/mflux/aframe-lod>
 *
 */

const LOD_THRESHOLD = 1; // meters
const CACHE_FREE_DELAY = 3000; // ms

AFRAME.registerComponent('gltf-lod-advanced', {
    dependencies: ['gltf-model'],
    schema: {
        updateRate: { type: 'number', default: 333 },
        fade: { type: 'number', default: 0 },
        enabled: { type: 'boolean', default: true },
    },
    init() {
        this.camDistance = new THREE.Vector3();
        this.tempDistance = new THREE.Vector3();
        this.currentLevel = undefined;
        this.previousLevel = undefined;
        this.cameraObj = document.getElementById('my-camera').object3D;
        this.cameraPos = new THREE.Vector3();
        this.cameraObj.getWorldPosition(this.cameraPos);
        this.objWorldPos = new THREE.Vector3();
        this.cacheFreeTimers = {};
        this.tick = AFRAME.utils.throttleTick(this.tick, this.data.updateRate, this);
        this.updateLevels();
    },
    updateLevels() {
        this.levels = Array.from(this.el.children).filter((child) => child.hasAttribute('lod-level'));
        // Sort desc by distance
        this.levels.sort((a, b) => b.getAttribute('lod-level').distance - a.getAttribute('lod-level').distance);
        this.levels.forEach((level) => {
            if (level !== this.currentLevel) {
                // eslint-disable-next-line no-param-reassign
                level.object3D.visible = false;
            }
        });
    },
    tick() {
        if (!this.data.enabled) {
            return;
        }
        this.cameraObj.getWorldPosition(this.cameraPos);
        this.el.object3D.getWorldPosition(this.objWorldPos);
        this.tempDistance = this.cameraPos.distanceTo(this.objWorldPos);
        if (this.tempDistance !== this.camDistance) {
            this.camDistance = this.tempDistance;
            let nextLevel;
            let nextDistance;
            this.levels.every((level) => {
                nextDistance = level.getAttribute('lod-level').distance;
                if (this.camDistance <= nextDistance) {
                    nextLevel = level;
                    return true;
                }
                return false;
            });
            if (nextLevel && nextLevel !== this.currentLevel) {
                // Check threshold if returning to previous level
                if (nextLevel === this.previousLevel && Math.abs(this.camDistance - nextDistance) <= LOD_THRESHOLD) {
                    return;
                }

                const nextModel = nextLevel.getAttribute('lod-level')['gltf-model'];
                window.clearTimeout(this.cacheFreeTimers[nextModel]); // Stop next model from unloading, if pending

                // Hide previous. TODO: Cross-fade, then unload current level
                if (this.currentLevel) {
                    const cacheKey = this.currentLevel.getAttribute('gltf-model');
                    this.currentLevel.object3D.visible = false;
                    this.currentLevel.removeAttribute('gltf-model', false);
                    if (!nextLevel.components['lod-level']?.data.retainCache) {
                        window.clearTimeout(this.cacheFreeTimers[cacheKey]); // Reset any existing timers if pending
                        this.cacheFreeTimers[cacheKey] = window.setTimeout(() => {
                            THREE.Cache.remove(cacheKey);
                            this.cacheFreeTimers[cacheKey] = null;
                        }, CACHE_FREE_DELAY);
                    }
                }
                // Show next
                if (nextModel) {
                    nextLevel.setAttribute('gltf-model', nextModel);
                    nextLevel.object3D.visible = true;
                    if (this.data.fade) {
                        nextLevel.setAttribute('material', { transparent: true });
                        nextLevel.setAttribute('animation', {
                            property: 'components.material.material.opacity',
                            from: 0,
                            to: 1,
                            dur: this.data.fade,
                            startEvents: 'model_loaded',
                        });
                    }
                }
                [this.previousLevel, this.currentLevel] = [this.currentLevel, nextLevel];
            }
        }
    },
});

AFRAME.registerComponent('lod-level', {
    schema: {
        distance: { type: 'number', default: 10 },
        'gltf-model': { type: 'string' },
        retainCache: { type: 'boolean', default: false },
    },
    init() {
        const lodParent = this.el.parentEl.components['gltf-lod'];
        if (lodParent?.levels && !lodParent.levels.includes(this.el)) {
            lodParent.updateLevels();
        }
    },
});

/**
 * @brief Simple LOD swap between default (low) and detailed (high) models
 */
AFRAME.registerComponent('gltf-model-lod', {
    dependencies: ['gltf-model'],
    schema: {
        updateRate: { type: 'number', default: 333 },
        retainCache: { type: 'boolean', default: false },
        detailedUrl: { type: 'string' },
        detailedDistance: { type: 'number', default: 10 },
        enabled: { type: 'boolean', default: true },
    },
    init() {
        this.camDistance = new THREE.Vector3();
        this.tempDistance = new THREE.Vector3();
        this.showDetailed = false;
        this.defaultUrl = this.el.getAttribute('gltf-model');
        this.cameraObj = document.getElementById('my-camera').object3D;
        this.cameraPos = new THREE.Vector3();
        this.cameraObj.getWorldPosition(this.cameraPos);
        this.objWorldPos = new THREE.Vector3();
        this.cacheFreeTimer = null;
        this.tick = AFRAME.utils.throttleTick(this.tick, this.data.updateRate, this);
    },
    tick() {
        if (!this.data.enabled || !this.defaultUrl) {
            return;
        }
        this.cameraObj.getWorldPosition(this.cameraPos);
        this.el.object3D.getWorldPosition(this.objWorldPos);
        this.tempDistance = this.cameraPos.distanceTo(this.objWorldPos);
        if (this.tempDistance !== this.camDistance) {
            this.camDistance = this.tempDistance;
            const distDiff = this.camDistance - this.data.detailedDistance;
            // Switch from default to detailed when inside (dist - threshold)
            if (!this.showDetailed && distDiff <= -LOD_THRESHOLD) {
                window.clearTimeout(this.cacheFreeTimer); // Stop cache freeing timer, if active
                this.el.setAttribute('gltf-model', ARENAUtils.crossOriginDropboxSrc(this.data.detailedUrl));
                this.showDetailed = true;
                // Switch from detailed to default when outside (dist + threshold)
            } else if (this.showDetailed && distDiff >= LOD_THRESHOLD) {
                this.el.setAttribute('gltf-model', this.defaultUrl);
                this.showDetailed = false;
                if (!this.data.retainCache) {
                    window.clearTimeout(this.cacheFreeTimer);
                    this.cacheFreeTimer = window.setTimeout(() => {
                        THREE.Cache.remove(ARENAUtils.crossOriginDropboxSrc(this.data.detailedUrl));
                        this.cacheFreeTimer = null;
                    }, CACHE_FREE_DELAY);
                }
            }
        }
    },
});
