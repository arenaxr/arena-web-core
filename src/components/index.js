/**
 * @fileoverview Import A-Frame Componets used
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date Jan, 2021
 */

/**
 * ARENA A-Frame components and systems
 */
import('/components/arena-camera.js');
import('/components/arena-user.js');
import('/components/arena-vive.js');
import('/components/click-listener.js');
import('/components/collision-listener.js');
import('/components/goto-url.js');
import('/components/impulse.js');
import('/components/load-scene.js');
import('/components/material-extras.js');
import('/components/network-latency.js');
import('/components/press-and-move.js');
import('/components/ttl.js');
import('/components/video-control.js');

/**
 * Additional A-Frame components and systems
 */

// from npm, when available
import('aframe-meshline-component'); // thick lines - seems to have bugs
import('webxr-polyfill'); // fallback for non-webXR browsers
import('aframe-environment-component'); // pretty environments
import('aframe-particle-system-component');
//import('aframe-spe-particles-component');

// direct file imports
import('/components/vendor/aframe-physics-system.js'); // physics system, build with cannon-js: https://github.com/n5ro/aframe-physics-system
import('/components/vendor/aframe-multisrc-component.js'); // add separate image/video textures: https://github.com/elbobo/aframe-multisrc-component
import('/components/vendor/transparent-occlude.js'); // borrowed from aframe-render-order.js: https://github.com/supermedium/superframe#readme
import('/components/vendor/morphTarget.js'); // target and control a gltf model's morphTargets: https://github.com/elbobo/aframe-gltf-morph-component
