
/* global AFRAME */

/**
 * @fileoverview Hide in AR component
 * from https://github.com/aframevr/aframe/pull/4356
 */

/**
 * Hide in AR component. When set to an entity, it will make the entity disappear when entering AR mode.
 * Based on [this example]{@link https://github.com/aframevr/aframe/pull/4356}
 * @module hide-in-ar-mode
 */
AFRAME.registerComponent('hide-in-ar-mode', {
    // Set this object invisible while in AR mode.
    init: function() {
        this.el.sceneEl.addEventListener('enter-vr', (ev) => {
            this.wasVisible = this.el.getAttribute('visible');
            if (this.el.sceneEl.is('ar-mode')) {
                this.el.setAttribute('visible', false);
            }
        });
        this.el.sceneEl.addEventListener('exit-vr', (ev) => {
            if (this.wasVisible) this.el.setAttribute('visible', true);
        });
    },
});
