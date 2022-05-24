/* global AFRAME */

/**
 * @fileoverview Override default behavior of hide-on-enter-ar to unload or
 * disable gltf models and related lod components when entering AR.
*/

AFRAME.components['hide-on-enter-ar'].Component.prototype.init = function() {
    this.gltfAttributes = null;
    this.gltfLodAttributes = null;
    this.gltfLodAdvancedAttributes = null;
    const self = this;
    this.el.sceneEl.addEventListener('enter-vr', function() {
        if (self.el.sceneEl.is('ar-mode')) {
            self.el.object3D.visible = false;
            self.gltfAttributes = self.el.getAttribute('gltf-model');
            if (self.gltfAttributes) {
                self.el.removeAttribute('gtf-model');
            }
            self.gltfLodAttributes = self.el.getAttribute('gltf-model-lod');
            if (self.gltfLodAttributes?.enabled) {
                self.el.setAttribute('gltf-model-lod', 'enabled', false);
            }
            self.gltfLodAdvancedAttributes = self.el.getAttribute('gltf-lod-advanced');
            if (self.gltfLodAdvancedAttributes?.enabled) {
                self.el.setAttribute('gltf-lod-advanced', 'enabled', false);
            }
        }
    });
    this.el.sceneEl.addEventListener('exit-vr', function() {
        if (self.gltfAttributes) {
            self.setAttribute('gltf-model', self.gltfAttributes);
        }
        if (self.gltfLodAttributes) {
            self.setAttribute('gltf-model-lod', 'enabled', true);
        }
        if (self.gltfLodAdvancedAttributes) {
            self.setAttribute('gltf-lod-advanced', 'enabled', true);
        }
        self.el.object3D.visible = true;
    });
};
