
/* global AFRAME */

/**
 * @fileoverview Hide in AR component
 * from https://github.com/aframevr/aframe/pull/4356
 *
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
