/* global AFRAME, THREE */

/**
 * @fileoverview Capsule geometry. Adds geometry to render a capsule primitive.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import roundedBox from './three-rounded-box/index.js';

const RoundedBoxGeometry = roundedBox(THREE);

AFRAME.registerGeometry('roundedbox', {
    schema: {
        width: { default: 1, min: 0 },
        height: { default: 1, min: 0 },
        depth: { default: 1, min: 0 },
        radius: { default: 1, min: 0 },
        radiusSegments: { default: 10, min: 0 },
    },

    init(data) {
        this.geometry = new RoundedBoxGeometry(data.width, data.height, data.depth, data.radius, data.radiusSegments);
    },
});
