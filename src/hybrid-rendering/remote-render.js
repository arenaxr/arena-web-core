AFRAME.registerComponent('remote-render', {
    schema: {
        enabled: { type: 'boolean', default: false },
        printObjectStats: { type: 'boolean', default: false },
    },

    init() {
        const { data } = this;
        const { el } = this;

        this.getObjectStats = this.getObjectStats.bind(this);

        if (data.printObjectStats) {
            if (el.hasAttribute('gltf-model')) {
                el.addEventListener('model-loaded', this.getObjectStats);
            } else {
                this.getObjectStats();
            }
        }
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

        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        );

        // Assuming you have references to your camera and object
        const box = new THREE.Box3().setFromObject(object);
        // const helper = new THREE.Box3Helper( box, 0xffff00 );
        // sceneEl.object3D.add(helper);
        if (frustum.intersectsBox(box)) {
            const corners = [
                new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                new THREE.Vector3(box.min.x, box.min.y, box.max.z),
                new THREE.Vector3(box.min.x, box.max.y, box.min.z),
                new THREE.Vector3(box.min.x, box.max.y, box.max.z),
                new THREE.Vector3(box.max.x, box.min.y, box.min.z),
                new THREE.Vector3(box.max.x, box.min.y, box.max.z),
                new THREE.Vector3(box.max.x, box.max.y, box.min.z),
                new THREE.Vector3(box.max.x, box.max.y, box.max.z),
            ];

            const projectedCorners = [];
            corners.forEach((corner) => {
                const projectedCorner = corner.clone().project(camera);
                projectedCorners.push(projectedCorner);
            });

            function clipCornersToViewport(corners) {
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
            }

            const clippedCorners = clipCornersToViewport(projectedCorners);

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minX = Math.min(...clippedCorners.map((corner) => corner.x));
            const maxX = Math.max(...clippedCorners.map((corner) => corner.x));
            const minY = Math.min(...clippedCorners.map((corner) => corner.y));
            const maxY = Math.max(...clippedCorners.map((corner) => corner.y));
            const boundingBoxWidth = Math.abs(maxX - minX) * viewportWidth;
            const boundingBoxHeight = Math.abs(maxY - minY) * viewportHeight;

            console.log(
                'Viewport %:',
                el.id,
                ((boundingBoxWidth * boundingBoxHeight) / (viewportWidth * viewportHeight)) * 100
            );
        }
    },

    update(oldData) {
        // console.log('[render-client]', this.el.id, this.data.enabled);

        this.el.setAttribute('visible', !this.data.enabled);
    },
});
