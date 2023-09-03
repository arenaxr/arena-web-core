/* global AFRAME, THREE */

AFRAME.registerComponent('blipout', {
    schema: {
        enabled: { type: 'boolean', default: true },
        duration: { type: 'number', default: 750 },
        geometry: { type: 'string', default: 'rect' }, // [rect, disk, ring]
        planes: { type: 'string', default: 'both' }, // [both, top, bottom]
    },
    blip() {
        const {
            data,
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
        const radius = Math.max(width, depth) / 2;

        const clipPlanes = [];
        // Create clipping planes
        if (data.planes === 'bottom' || data.planes === 'both') {
            this.planeBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), -minY); // Clips everything below
            clipPlanes.push(this.planeBot);
        }
        if (data.planes === 'top' || data.planes === 'both') {
            this.planeTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), maxY); // Clips everything above
            clipPlanes.push(this.planeTop);
        }

        const planeMeshMaterial = new THREE.MeshPhongMaterial({
            color: 0x049ef4,
            emissive: 0x000080,
            specular: 0xffffff,
            transparent: true,
            opacity: 0.75,
            shininess: 100,
            side: THREE.DoubleSide,
        });

        let baseMeshPlane;
        switch (data.geometry) {
            case 'disk': {
                // 2d disk
                baseMeshPlane = new THREE.Mesh(new THREE.RingGeometry(0, radius), planeMeshMaterial);
                break;
            }
            case 'ring': {
                // 2d ring
                baseMeshPlane = new THREE.Mesh(
                    new THREE.RingGeometry(radius, Math.min(radius + 0.15, radius * 1.1)),
                    planeMeshMaterial
                );
                break;
            }
            default: // 2d rect
                baseMeshPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), planeMeshMaterial);
        }
        bbox.getCenter(baseMeshPlane.position); // align in world pos
        baseMeshPlane.rotation.x = -Math.PI / 2; // rotate horizontal flat

        switch (data.planes) {
            case 'bottom': {
                // Only bottom plane
                this.meshPlaneBot = baseMeshPlane;
                this.meshPlaneBot.position.y = minY; // Starts at bottom
                this.meshPlanes = [this.meshPlaneBot];
                break;
            }
            case 'top': {
                // Only top plane
                this.meshPlaneTop = baseMeshPlane;
                this.meshPlaneTop.position.y = maxY; // Starts at top
                this.meshPlanes = [this.meshPlaneTop];
                break;
            }
            default: {
                // Both planes
                this.meshPlaneBot = baseMeshPlane;
                this.meshPlaneTop = baseMeshPlane.clone();
                this.meshPlaneBot.position.y = minY;
                this.meshPlaneTop.position.y = maxY;
                this.meshPlanes = [this.meshPlaneBot, this.meshPlaneTop];
            }
        }

        sceneEl.object3D.add(...this.meshPlanes); // Add to sceneroot for world space

        matTargets.forEach((matTarget) => {
            /* eslint-disable no-param-reassign */
            matTarget.material.clippingPlanes = clipPlanes;
            matTarget.material.clipShadows = true;
            /* eslint-disable no-param-reassign */
        });

        if (data.planes === 'bottom' || data.planes === 'both') {
            const target = data.planes === 'both' ? midY : maxY;
            AFRAME.ANIME({
                targets: [this.planeBot, this.meshPlaneBot.position], // constant, y ignored in vec3, plane respectively
                constant: -target,
                y: target,
                easing: 'easeInOutSine',
                duration: data.duration,
                complete: () => {
                    if (data.planes === 'bottom') {
                        // Only do remove if this is only plane
                        sceneEl.object3D.remove(...this.meshPlanes);
                        el.remove.bind(el)();
                    }
                },
            });
        }
        if (data.planes === 'top' || data.planes === 'both') {
            const target = data.planes === 'both' ? midY : minY;
            AFRAME.ANIME({
                targets: [this.planeTop, this.meshPlaneTop.position],
                constant: target,
                y: target,
                easing: 'easeInOutSine',
                duration: data.duration + 1, // ensure later than bottom
                complete: () => {
                    sceneEl.object3D.remove(...this.meshPlanes);
                    el.remove.bind(el)();
                },
            });
        }
    },
});
