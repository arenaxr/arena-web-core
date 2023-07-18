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

import './arena-camera';
import './arena-hand';
import './arena-user';
import './armarker';
import './attribution';
import './build-watch-object';
import './click-listener';
import './collision-listener';
import './gesture-detector';
import './gltf-lod';
import './goto-url';
import './show-hide-on-enter-vr';
import './impulse';
import './jitsi-video';
import './landmark';
// import './load-scene';
import './material-extras';
import './network-latency';
import './pcd-model';
import './press-and-move';
import './screenshare';
import './text-input';
import './thickline/index';
import './threejs-scene';
import './ttl';
import './ui';
import './video-control';

/**
 * Additional A-Frame components and systems
 */

// from npm, when available
import 'webxr-polyfill'; // fallback for non-webXR browsers
import 'aframe-environment-component'; // pretty environments
import 'aframe-blink-controls'; // Controller teleport
import '@c-frame/aframe-particle-system-component'; // particle system environment

// NPM import overrides
import './vendor/animation-mixer'; // Override animation mixer

// direct file imports
import './vendor/aframe-look-at-component.min'; // Look at component https://github.com/supermedium/superframe#readme
import './vendor/aframe-multisrc-component'; // add separate image/video textures: https://github.com/elbobo/aframe-multisrc-component
import './vendor/aframe-spe-particles-component.min'; // particle system: https://github.com/arenaxr/aframe-spe-particles-component
import './vendor/transparent-occlude'; // borrowed from aframe-render-order.js: https://github.com/supermedium/superframe#readme
import './vendor/morphTarget'; // target and control a gltf model's morphTargets: https://github.com/elbobo/aframe-gltf-morph-component
