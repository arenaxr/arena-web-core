/* global AFRAME, THREE */

import { SkinnedMesh } from 'three-shim';

AFRAME.registerComponent('blipout', {
    schema: {
        duration: { type: 'number', default: 1000 },
    },
    init() {
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

        // Create clipping planes
        const planeBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), -minY); // Clips everything below
        const planeTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), maxY); // Clips everything above

        // Set planes to clip each material
        matTargets.forEach((matTarget) => {
            /* eslint-disable no-param-reassign */
            matTarget.material.clippingPlanes = [planeBot, planeTop];
            matTarget.material.clipShadows = true;
            /* eslint-disable no-param-reassign */
        });

        AFRAME.ANIME({
            targets: planeBot,
            constant: -midY,
            easing: 'easeOutCubic',
            duration: this.data.duration,
        });
        AFRAME.ANIME({
            targets: planeTop,
            constant: midY,
            easing: 'easeOutCubic',
            duration: this.data.duration + 1, // ensure later than bottom
            complete: () => {
                el.remove.bind(el)();
            },
        });
    },
});
