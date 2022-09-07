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

import './arena-camera.js';
import './arena-hand.js';
import './arena-user.js';
import './armarker.js';
import './attribution.js';
import './click-listener.js';
import './collision-listener.js';
import './gesture-detector.js';
import './gltf-lod.js';
import './goto-url.js';
import './hide-on-enter-vr.js';
import './impulse.js';
import './jitsi-video.js';
import './landmark.js';
import './load-scene.js';
import './material-extras.js';
import './network-latency.js';
import './pcd-model.js';
import './press-and-move.js';
import './screenshare.js';
import './stats-monitor.js';
import './text-input.js';
import './thickline/index.js';
import './threejs-scene.js';
import './ttl.js';
import './video-control.js';

/**
 * Additional A-Frame components and systems
 */

// from npm, when available
import 'webxr-polyfill'; // fallback for non-webXR browsers
import 'aframe-environment-component'; // pretty environments
import 'aframe-blink-controls'; // Controller teleport
// NPM import overrides
import './vendor/animation-mixer.js'; // Override animation mixer

// import 'aframe-particle-system-component';
// import 'aframe-spe-particles-component';

// direct file imports
import './vendor/aframe-aabb-collider-component.min.js'; // AABB collider https://github.com/supermedium/superframe#readme
import './vendor/aframe-look-at-component.min.js'; // Look at component https://github.com/supermedium/superframe#readme
import './vendor/aframe-multisrc-component.js'; // add separate image/video textures: https://github.com/elbobo/aframe-multisrc-component
import './vendor/transparent-occlude.js'; // borrowed from aframe-render-order.js: https://github.com/supermedium/superframe#readme
import './vendor/morphTarget.js'; // target and control a gltf model's morphTargets: https://github.com/elbobo/aframe-gltf-morph-component
