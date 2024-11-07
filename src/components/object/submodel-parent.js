/**
 * @fileoverview Attach an object to a named hierarchical subcomponent of its parent model.
 *
 * Child pose is now no longer limited to the base position of the model itself. Requires `parent` attribute to be set.
 *
 * Open source software under the terms in /LICENSE
 * @date 2024
 */
AFRAME.registerComponent('submodel-parent', {
    schema: { type: 'string' },
    init() {
        this.el.parentEl?.addEventListener('model-loaded', this.update.bind(this));
    },
    update() {
        const {
            el: { parentEl, object3D, id },
        } = this;
        if (!parentEl) {
            console.warn(`${id} has no parent for submodel`);
            return;
        }
        const parentSubObj = parentEl.object3D?.getObjectByName(this.data);
        if (!parentSubObj) {
            console.warn(`${parentEl.id} has no hierarchical component named ${this.data}`);
            return;
        }
        const currentPos = new THREE.Vector3().copy(object3D.position);
        const currentRot = new THREE.Euler().copy(object3D.rotation);
        parentSubObj.attach(object3D); // THREE.js will preserve world matrix at this point
        object3D.position.copy(currentPos);
        object3D.rotation.copy(currentRot);
    },
});
