/* global AFRAME */

/* eslint-disable no-param-reassign */
AFRAME.registerComponent('gltf-opacity', {
    schema: {
        opacity: { default: 1 },
    },
    init() {
        this.traverseUpdate = this.traverseUpdate.bind(this);
        this.el.addEventListener('model-loaded', this.traverseUpdate);
    },
    update() {
        this.traverseUpdate();
    },
    traverseUpdate() {
        this.el.object3D.traverse((o) => {
            if (o.material) {
                if (this.data.opacity !== 1) {
                    o.material.transparent = true;
                    o.material.opacity = this.data.opacity;
                } else {
                    o.material.transparent = false;
                }
                o.material.needsUpdate = true;
            }
        });
    },
});
