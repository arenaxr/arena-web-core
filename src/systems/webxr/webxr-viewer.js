/**
 * WebXR viewer handler and pseudo-click generator
 *
 */

AFRAME.registerComponent('webxr-viewer', {
    init() {
        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);
        window.addEventListener('enter-vr', this.onEnterVR);
        window.addEventListener('exit-vr', this.onExitVR);
        this.cursor = document.getElementById('mouse-cursor').components.cursor;
        this.body = document.querySelector('body');
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
    },

    onEnterVR() {
        if (this.el.sceneEl.is('ar-mode')) {
            this.cursor.clearCurrentIntersection(true);
            window.addEventListener('touchstart', this.onTouchStart);
            window.addEventListener('touchend', this.onTouchEnd);
        }
    },

    onTouchStart(evt) {
        if (evt.target === this.body) this.cursor.onCursorDown(evt);
    },
    onTouchEnd(evt) {
        if (evt.target === this.body) this.cursor.onCursorUp(evt);
    },

    onExitVR() {
        window.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('touchend', this.onTouchEnd);
    },
});
