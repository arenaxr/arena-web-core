/**
 * AR-only visibility, opposite behavior of aframe/hideon-enter-ar
 *
 */

AFRAME.registerComponent('show-on-enter-ar', {
    init: function() {
        const self = this;
        this.el.sceneEl.addEventListener('exit-vr', function() {
            if (self.el.sceneEl.is('ar-mode')) {
                self.el.object3D.visible = false;
            }
        });
        this.el.sceneEl.addEventListener('enter-vr', function() {
            self.el.object3D.visible = true;
        });
    },
});
