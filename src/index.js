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

// replace console with our logging (only when not in dev)
import { ARENAMqttConsole } from './utils';

import './aframe-mods'; // AFRAME modifications
import './systems'; // custom AFRAME systems
import './geometries'; // custom AFRAME geometries
import './components'; // custom AFRAME components
import './hybrid-rendering'; // hybrid rendering

console.info(ARENA_VERSION_MSG);

if (!ARENA.defaults.devInstance) {
    // will queue messages until MQTT connection is available (indicated by console.setOptions())
    ARENAMqttConsole.init();
}

// load css
if (AFRAME.utils.device.isBrowserEnvironment) {
    import('./style/arena.css');
} // special handler for non-webxr devices
