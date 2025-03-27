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

import './camera';
import './object';
// import './load-scene';
import './ui';
import './thickline/index';
import './renderfusion/remote-render';

/**
 * Additional A-Frame components and systems
 */

// from npm, when available
import 'aframe-environment-component'; // pretty environments
import 'aframe-blink-controls'; // Controller teleport
import '@c-frame/aframe-particle-system-component'; // particle system environment

// NPM import overrides
import './vendor/animation-mixer'; // Override animation mixer

// direct file imports
import './vendor/aframe-gaussian-splatting-component.min'; // npm has this package as 0.0.19, but we use a more recent build at https://github.com/quadjr/aframe-gaussian-splatting
import './vendor/aframe-look-at-component.min'; // Look at component https://github.com/supermedium/superframe#readme
import './vendor/aframe-multisrc-component'; // add separate image/video textures: https://github.com/elbobo/aframe-multisrc-component
import './vendor/transparent-occlude'; // borrowed from aframe-render-order.js: https://github.com/supermedium/superframe#readme
import './vendor/morphTarget'; // target and control a gltf model's morphTargets: https://github.com/elbobo/aframe-gltf-morph-component

// Dynamic async imports (codesplit)
import('webxr-polyfill'); // fallback for non-webXR browsers
import('./vendor/aframe-spe-particles-component'); // particle system: https://github.com/arenaxr/aframe-spe-particles-component
