/**
 * General component for WebXR, assigning device-specific components
 *
 */

AFRAME.registerComponent('webxr-device-manager', {
    init: function() {
        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');
        if (isWebXRViewer) {
            this.el.sceneEl.setAttribute('webxr-viewer', true);
            this.el.sceneEl.removeAttribute('ar-hit-test-listener');
        }

        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);
        window.addEventListener('enter-vr', this.onEnterVR);
        window.addEventListener('exit-vr', this.onExitVR);
    },
    onEnterVR: function() {
        if (this.el.sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', false);
        }
    },

    onExitVR: function() {
        if (this.el.sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', true);
        }
    },
});
