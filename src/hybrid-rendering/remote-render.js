/* global AFRAME, THREE */

AFRAME.registerComponent('remote-render', {
    schema: {
        enabled: { type: 'boolean', default: false },
        printObjectStats: { type: 'boolean', default: true },
    },

    init() {
        const { data, el } = this;

        this.getObjectStats = this.getObjectStats.bind(this);

        if (data.printObjectStats) {
            if (el.hasAttribute('gltf-model')) {
                el.addEventListener('model-loaded', this.getObjectStats);
            } else {
                this.getObjectStats();
            }
        }
    },

    clipCornersToViewport(corners) {
        const clippedCorners = [];

        corners.forEach((corner) => {
            const clippedCorner = new THREE.Vector3(
                Math.min(Math.max(corner.x, -1), 1),
                Math.min(Math.max(corner.y, -1), 1),
                corner.z
            );
            clippedCorners.push(clippedCorner);
        });

        return clippedCorners;
    },

    // Function to calculate the solid angle subtended by a bounding box
    solidAngleSubtendedByBoundingBox(center, dimensions) {
        const width = dimensions.x;
        const height = dimensions.y;
        const depth = dimensions.z;

        // Calculate the diagonal length of the bounding box
        const diagonalLength = Math.sqrt(width * width + height * height + depth * depth);

        // Calculate the solid angle using the formula for a spherical cap
        const solidAngle = 2 * Math.PI * (1 - Math.cos(diagonalLength / 2));

        return solidAngle;
    },

    getObjectStats() {
        const { el } = this;
        const { sceneEl } = el;

        const { camera } = sceneEl;

        const object = el.getObject3D('mesh');
        if (object === undefined) return;

        let triangleCount = 0;
        object.traverse((node) => {
            if (node.isMesh) {
                triangleCount += node.geometry.attributes.position.count / 3;
            }
        });

        console.log('Triangle count:', el.id, triangleCount);

        const box = new THREE.Box3().setFromObject(object);

        const center = new THREE.Vector3();
        box.getCenter(center);

        const dimensions = new THREE.Vector3();
        box.getSize(dimensions);

        const solidAngle = this.solidAngleSubtendedByBoundingBox(center, dimensions);

        console.log('Total solid angle:', el.id, solidAngle);
    },

    update() {
        // console.log('[render-client]', this.el.id, this.data.enabled);

        this.el.setAttribute('visible', !this.data.enabled);
    },
});
