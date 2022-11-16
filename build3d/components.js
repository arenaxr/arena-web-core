/**
 * @fileoverview Import A-Frame Components used
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date Jan, 2021
 */

/**
 * ARENA A-Frame components
 */

import '../src/components/build-watch-object.js';
import '../src/components/build-watch-scene.js';
import '../src/components/gltf-lod.js';
import '../src/components/impulse.js';
import '../src/components/load-scene.js';
import '../src/components/material-extras.js';
import '../src/components/network-latency.js';
import '../src/components/pcd-model.js';
import '../src/components/press-and-move.js';
import '../src/components/text-input.js';
import '../src/components/thickline/index.js';
import '../src/components/threejs-scene.js';
import '../src/components/video-control.js';

/**
 * Additional A-Frame components and systems
 */

// from npm, when available
import 'aframe-environment-component'; // pretty environments
import 'aframe-extras'; // gltf animations, components for controls, model loaders, pathfinding
// NPM import overrides
import '../src/components/vendor/animation-mixer.js'; // Override animation mixer
// import '../src/components/vendor/nav-system.js'; // Override nav system

// import 'aframe-particle-system-component';
// import 'aframe-spe-particles-component';

// direct file imports
import '../src/components/vendor/aframe-multisrc-component.js'; // add separate image/video textures: https://github.com/elbobo/aframe-multisrc-component
import '../src/components/vendor/transparent-occlude.js'; // borrowed from aframe-render-order.js: https://github.com/supermedium/superframe#readme
import '../src/components/vendor/morphTarget.js'; // target and control a gltf model's morphTargets: https://github.com/elbobo/aframe-gltf-morph-component
