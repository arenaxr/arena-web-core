/**
 * @fileoverview Load ARENA source and dependencies
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA */

// ARENA version from automated scripts
import ARENA_VERSION_MSG from './arena-version';

import './aframe-mods'; // AFRAME modifications
import './systems'; // custom AFRAME systems
import './geometries'; // custom AFRAME geometries
import './components'; // custom AFRAME components

console.info(ARENA_VERSION_MSG);

// load css
if (AFRAME.utils.device.isBrowserEnvironment) {
    import('./style/arena.css');
} // special handler for non-webxr devices
