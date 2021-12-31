/* global AFRAME */

/**
 * @fileoverview Component loads/unloads gltfs by simple user distance-based LOD
 * Inspired by aframe-lod <https://github.com/mflux/aframe-lod>
 *
 */

AFRAME.registerComponent('gltf-lod', {
    schema: {
        updateRate: {type: 'number', default: 333},
        fade: {type: 'number', default: 0},
        retainCache: {type: 'boolean', default: false},
    },
    init: function() {
        this.camDistance = new THREE.Vector3();
        this.tempDistance = new THREE.Vector3();
        this.currentLevel = undefined;
        this.cameraPos = document.getElementById('my-camera').object3D.position;

        this.tick = AFRAME.utils.throttleTick(this.tick, this.data.updateRate, this);
        this.updateLevels();
    },
    updateLevels: function() {
        this.levels = Array.from(this.el.children).filter((child) => child.hasAttribute('lod-level'));
        // Sort desc  by distance
        this.levels.sort((a, b) => b.getAttribute('lod-level').distance - a.getAttribute('lod-level').distance);
        for (const level of this.levels) {
            if (level !== this.currentLevel) {
                level.object3D.visible = false;
            }
        }
    },
    tick: function() {
        this.tempDistance = this.cameraPos.distanceTo(this.el.object3D.position);
        if (this.tempDistance !== this.camDistance) {
            this.camDistance = this.tempDistance;
            let nextLevel;
            for (const level of this.levels) {
                if (this.camDistance <= level.getAttribute('lod-level').distance) {
                    nextLevel = level;
                } else {
                    break;
                }
            }
            if (nextLevel && nextLevel !== this.currentLevel) {
                // Hide previous. TODO: Fade out animation, then unload
                if (this.currentLevel) {
                    const cacheKey = this.currentLevel.getAttribute('gltf-model');
                    this.currentLevel.object3D.visible = false;
                    this.currentLevel.removeAttribute('gltf-model', false);
                    /* TODO: Add a buffer range or delay from unloading to avoid janky
                        behavior from jitter at threshold of two lod levels */
                    if (!this.data.retainCache) {
                        THREE.Cache.remove(cacheKey);
                    }
                }
                // Show next
                const nextModel = nextLevel.getAttribute('lod-level')['gltf-model'];
                if (nextModel) {
                    nextLevel.setAttribute('gltf-model', nextModel);
                    nextLevel.object3D.visible = true;
                    if (this.data.fade) {
                        nextLevel.setAttribute('material', {transparent: true});
                        nextLevel.setAttribute('animation', {
                            property: 'components.material.material.opacity',
                            from: 0,
                            to: 1,
                            dur: this.data.fade,
                            startEvents: 'model_loaded',
                        });
                    }
                }
                this.currentLevel = nextLevel;
            }
        }
    },
});

AFRAME.registerComponent('lod-level', {
    schema: {
        'distance': {type: 'number', default: 0},
        'gltf-model': {type: 'string'},
    },
    init: function() {
        const lodParent = this.el.parentEl.components['gltf-lod'];
        if (lodParent?.levels && !lodParent.levels.includes(this.el)) {
            lodParent.updateLevels();
        }
    },
});
