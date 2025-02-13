/**
 * @fileoverview model-container component that constrains a GLTF/URDF/FBX/etc
 * model to a container object with specified x,y,z dimensions. Note that this
 * does not specify the center of the model, only the bounding box, so models
 * with errant origins or voxels may be rescaled in unexpected ways.
 */

AFRAME.registerComponent('model-container', {
    schema: {
        x: { type: 'number', default: 1 },
        y: { type: 'number', default: 1 },
        z: { type: 'number', default: 1 },
        mode: { type: 'string', default: 'contain' }, // TODO: min/max/cover
        uniform: { type: 'boolean', default: true },
    },
    init() {
        this.resize = this.resize.bind(this);
        this.el.addEventListener('model-loaded', this.resize);
        this.bbox = new THREE.Box3();
        this.sizes = new THREE.Vector3();
    },
    update() {
        this.resize();
    },
    resize() {
        const {
            el: { object3D },
            data,
            bbox,
            sizes,
        } = this;
        if (!object3D || !object3D.children.length) {
            return;
        }
        bbox.setFromObject(object3D);
        bbox.getSize(sizes);
        if (sizes.x === 0 || sizes.y === 0 || sizes.z === 0) {
            return;
        }
        const scales = [data.x / sizes.x, data.y / sizes.y, data.z / sizes.z];
        if (data.uniform) {
            scales.fill(Math.min(...scales));
        }
        object3D.scale.set(...scales);
    },
    remove() {
        this.el.removeEventListener('model-loaded', this.resize);
    },
});
