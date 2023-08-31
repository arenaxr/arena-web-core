/**
 * WebXR viewer handler and pseudo-click generator
 *
 */
/* global AFRAME */

AFRAME.registerComponent('webxr-viewer', {
    init() {
        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);
        window.addEventListener('enter-vr', this.onEnterVR);
        window.addEventListener('exit-vr', this.onExitVR);
        this.cursor = document.getElementById('mouse-cursor').components.cursor;
    },

    onEnterVR() {
        if (this.el.sceneEl.is('ar-mode')) {
            this.cursor.clearCurrentIntersection(true);
            window.addEventListener('touchstart', this.cursor.onCursorDown);
            window.addEventListener('touchend', this.cursor.onCursorUp);
        }
    },

    onExitVR() {
        window.removeEventListener('touchstart', this.cursor.onCursorDown);
        window.removeEventListener('touchend', this.cursor.onCursorUp);
    },
});
