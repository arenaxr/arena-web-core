/* global AFRAME, THREE */

AFRAME.registerComponent('blipout', {
    schema: {
        enabled: { type: 'boolean', default: true },
        duration: { type: 'number', default: 750 },
    },
    blip() {
        const {
            el,
            el: { object3D, sceneEl },
        } = this;
        if (!el.getAttribute('geometry') && !el.getAttribute('gltf-model')) {
            // Only blip geometry and gltfs
            el.remove();
            return;
        }
        sceneEl.renderer.localClippingEnabled = true;
        sceneEl.renderer.clipShadows = true;
        const meshTargets = [
            ...object3D.getObjectsByProperty('isMesh', true),
            ...object3D.getObjectsByProperty('isSkinnedMesh', true),
        ];
        const matTargets = meshTargets.filter((matTarget) => matTarget.material);
        if (matTargets.length === 0) {
            // No materials to clip (???), just remove it
            el.remove();
            return;
        }

        // Determine min and max heights of object
        const bbox = new THREE.Box3();
        bbox.setFromObject(object3D);
        const minY = bbox.min.y;
        const maxY = bbox.max.y;
        const midY = (minY + maxY) / 2;
        const width = bbox.max.x - bbox.min.x;
        const depth = bbox.max.z - bbox.min.z;

        // Create clipping planes
        const planeBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), -minY); // Clips everything below
        const planeTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), maxY); // Clips everything above

        // Add visible mesh planes to match clipping
        const meshPlaneBot = new THREE.Mesh(
            new THREE.PlaneGeometry(width, depth),
            new THREE.MeshPhongMaterial({
                color: 0x049ef4,
                emissive: 0x000080,
                specular: 0xffffff,
                transparent: true,
                opacity: 0.75,
                shininess: 100,
                side: THREE.DoubleSide,
            })
        );
        bbox.getCenter(meshPlaneBot.position); // align in world pos
        meshPlaneBot.rotation.x = -Math.PI / 2; // rotate flat

        const meshPlaneTop = meshPlaneBot.clone(); // clone bottom

        meshPlaneBot.position.y = minY;
        meshPlaneTop.position.y = maxY;

        sceneEl.object3D.add(meshPlaneBot, meshPlaneTop); // Add to sceneroot for world space

        matTargets.forEach((matTarget) => {
            /* eslint-disable no-param-reassign */
            matTarget.material.clippingPlanes = [planeBot, planeTop];
            matTarget.material.clipShadows = true;
            /* eslint-disable no-param-reassign */
        });

        AFRAME.ANIME({
            targets: [planeBot, meshPlaneBot.position], // constant, y ignored in vec3, plane respectively
            constant: -midY,
            y: midY,
            easing: 'easeInOutSine',
            duration: this.data.duration,
        });
        AFRAME.ANIME({
            targets: [planeTop, meshPlaneTop.position],
            constant: midY,
            y: midY,
            easing: 'easeInOutSine',
            duration: this.data.duration + 1, // ensure later than bottom
            complete: () => {
                sceneEl.object3D.remove(meshPlaneBot, meshPlaneTop);
                el.remove.bind(el)();
            },
        });
    },
});
