/**
 * @fileoverview Capsule geometry. Adds geometry to render a capsule primitive.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.registerGeometry('capsule', {
    schema: {
        length: { default: 1, min: 0 },
        radius: { default: 1, min: 0 },
        segmentsCap: { default: 18, min: 4 },
        segmentsRadial: { default: 36, min: 8 },
    },

    init(data) {
        this.geometry = new THREE.CapsuleGeometry(data.radius, data.length, data.segmentsCap, data.segmentsRadial);
    },
});
