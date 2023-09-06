/* global AFRAME, THREE */

const SCALE_IN_DURATION = 333;

AFRAME.registerComponent('blip', {
    schema: {
        blipin: { type: 'boolean', default: true },
        blipout: { type: 'boolean', default: true },
        duration: { type: 'number', default: 750 },
        geometry: { type: 'string', default: 'rect' }, // [rect, disk, ring]
        planes: { type: 'string', default: 'both' }, // [both, top, bottom]
        applyDescendants: { type: 'boolean', default: false },
    },
    init() {
        const {
            data,
            el,
            el: { object3D },
        } = this;
        if (data.blipin === true && object3D.children.length === 0) {
            this.checkBlipIn = this.checkBlipIn.bind(this);
            this.initCount = 0;
            object3D.visible = false;
            // On initial node creation, no geometry or material is loaded yet
            el.addEventListener('object3dset', this.checkBlipIn, { once: true });
            // Object3D is set before geometry and material
            el.addEventListener('loaded', this.checkBlipIn, { once: true });
        }
    },
    checkBlipIn() {
        this.initCount += 1;
        if (this.initCount === 2) {
            setTimeout(() => {
                this.blip('in');
            }, 50); // Need to release main thread for geometry to load properly
        }
    },

    blip(dir) {
        const {
            data,
            el,
            el: { object3D, sceneEl },
        } = this;
        if (!el.getAttribute('geometry') && !el.getAttribute('gltf-model')) {
            // Only blip in geometry and gltfs, exception for out w/ descendants
            if (dir === 'out' && data.applyDescendants === false) {
                el.remove();
            } else if (dir === 'in') {
                return;
            }
        }
        sceneEl.renderer.localClippingEnabled = true;
        sceneEl.renderer.clipShadows = true;

        const addMatTargets = [];

        const meshTargets = [
            ...object3D.getObjectsByProperty('isMesh', true),
            ...object3D.getObjectsByProperty('isSkinnedMesh', true),
        ];
        const matTargets = meshTargets.filter((matTarget) => matTarget.material);

        if (data.applyDescendants && dir === 'out') {
            const descendants = el.getElementsByTagName('*');
            descendants.forEach((descendant) => {
                if (!descendant.object3D) return;
                const descMeshTargets = [
                    ...descendant.object3D.getObjectsByProperty('isMesh', true),
                    ...descendant.object3D.getObjectsByProperty('isSkinnedMesh', true),
                ];
                const descMatTargets = descMeshTargets.filter((matTarget) => matTarget.material);
                addMatTargets.push(...descMatTargets);
            });
            matTargets.push(...addMatTargets);
        }

        if (matTargets.length === 0) {
            // No materials to clip (???), just remove it and/or return
            if (dir === 'out') {
                el.remove();
            }
            return;
        }

        // Determine min and max heights of object
        const bbox = new THREE.Box3();
        bbox.setFromObject(object3D);

        if (data.applyDescendants && dir === 'out') {
            addMatTargets.forEach((matTarget) => {
                bbox.expandByObject(matTarget);
            });
        }

        const minY = bbox.min.y;
        const maxY = bbox.max.y;
        const midY = (minY + maxY) / 2;
        const width = bbox.max.x - bbox.min.x;
        const depth = bbox.max.z - bbox.min.z;
        const radius = Math.max(width, depth) / 2;

        this.clipPlanes = [];

        // Determine start end (for blip out)
        let botStart = -minY;
        let topStart = maxY;
        let botEnd = data.planes === 'both' ? -midY : -maxY;
        let topEnd = data.planes === 'both' ? midY : minY;
        if (dir === 'in') {
            // Swap directions for blip in
            [botEnd, botStart] = [botStart, botEnd];
            [topEnd, topStart] = [topStart, topEnd];
        }

        // Create clipping planes
        if (data.planes === 'bottom' || data.planes === 'both') {
            this.planeBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), botStart); // Clips everything below
            this.clipPlanes.push(this.planeBot);
        }
        if (data.planes === 'top' || data.planes === 'both') {
            this.planeTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), topStart); // Clips everything above
            this.clipPlanes.push(this.planeTop);
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
        baseMeshPlane.scale.set(0.01, 0.01, 0.01); // can't use 0, messes up texture

        switch (data.planes) {
            case 'bottom': {
                // Only bottom plane
                this.meshPlaneBot = baseMeshPlane;
                this.meshPlaneBot.position.y = -botStart; // This is inverted from constant
                break;
            }
            case 'top': {
                // Only top plane
                this.meshPlaneTop = baseMeshPlane;
                this.meshPlaneTop.position.y = topStart;
                break;
            }
            default: {
                // Both planes
                this.meshPlaneBot = baseMeshPlane;
                this.meshPlaneTop = baseMeshPlane.clone();
                this.meshPlaneBot.position.y = -botStart;
                this.meshPlaneTop.position.y = topStart;
            }
        }

        matTargets.forEach((matTarget) => {
            /* eslint-disable no-param-reassign */
            matTarget.material.clippingPlanes = this.clipPlanes;
            matTarget.material.clipShadows = true;
            /* eslint-disable no-param-reassign */
        });

        if (dir === 'in') {
            object3D.visible = true;
            setTimeout(() => {
                /*
                 Backup in case animation doesn't complete from bg tab or other disruption. anime.js has
                 aberrant behavior when tab is not in focus, presumably due to throttled requestAnimationFrame.
                 */
                if (this.meshPlaneBot) sceneEl.object3D.remove(this.meshPlaneBot);
                if (this.meshPlaneTop) sceneEl.object3D.remove(this.meshPlaneTop);
                this.cleanup();
            }, data.duration + 2 * SCALE_IN_DURATION + 100); // Full animation + 100ms buffer
        }

        if (data.planes === 'bottom' || data.planes === 'both') {
            sceneEl.object3D.add(this.meshPlaneBot); // Add to sceneroot for world space
            const tlBot = AFRAME.ANIME.timeline({
                easing: 'linear',
            });
            tlBot.add({
                targets: this.meshPlaneBot.scale,
                x: 1,
                y: 1,
                duration: SCALE_IN_DURATION,
            });
            tlBot.add({
                targets: [this.planeBot, this.meshPlaneBot.position], // constant, y ignored in vec3, plane respectively
                constant: botEnd,
                y: -botEnd, // Once again inverted from constant
                easing: 'easeInOutSine',
                duration: data.duration,
            });
            tlBot.add({
                targets: this.meshPlaneBot.scale,
                x: 0,
                y: 0,
                duration: SCALE_IN_DURATION,
                complete: () => {
                    sceneEl.object3D.remove(this.meshPlaneBot);
                    if (data.planes === 'bottom' && dir === 'out') {
                        // Only do remove if this is only plane
                        el.remove.bind(el)();
                    }
                    if (dir === 'in') this.cleanup();
                },
            });
        }
        if (data.planes === 'top' || data.planes === 'both') {
            sceneEl.object3D.add(this.meshPlaneTop); // Add to sceneroot for world space
            const tlTop = AFRAME.ANIME.timeline({ easing: 'linear' });
            tlTop.add({
                targets: this.meshPlaneTop.scale,
                x: 1,
                y: 1,
                duration: SCALE_IN_DURATION,
            });
            tlTop.add({
                targets: [this.planeTop, this.meshPlaneTop.position],
                constant: topEnd,
                y: topEnd,
                easing: 'easeInOutSine',
                duration: data.duration + 1, // ensure later than bottom
            });
            tlTop.add({
                targets: this.meshPlaneTop.scale,
                x: 0,
                y: 0,
                duration: SCALE_IN_DURATION,
                complete: () => {
                    sceneEl.object3D.remove(this.meshPlaneTop);
                    if (dir === 'in') this.cleanup();
                    if (dir === 'out') {
                        el.remove.bind(el)();
                    }
                },
            });
        }
    },
    cleanup() {
        // Remove clipping plane references
        this.clipPlanes.length = 0;
        this.planeBot = null;
        this.planeTop = null;
        this.meshPlaneBot = null;
        this.meshPlaneTop = null;
    },
});
