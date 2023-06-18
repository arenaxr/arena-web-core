/* global AFRAME */

/**
 * AR-only visibility, opposite behavior of aframe/hideon-enter-ar
 *
 */

AFRAME.registerComponent('show-on-enter-ar', {
    init() {
        const self = this;
        self.el.object3D.visible = !!self.el.sceneEl.is('ar-mode');
        this.el.sceneEl.addEventListener('exit-vr', () => {
            if (self.el.sceneEl.is('ar-mode')) {
                self.el.object3D.visible = false;
            }
        });
        this.el.sceneEl.addEventListener('enter-vr', () => {
            self.el.object3D.visible = true;
        });
    },
});
