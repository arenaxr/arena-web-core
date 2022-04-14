/**
 * @fileoverview Load ARENA build 3d source and dependencies
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

// ARENA version from automated scripts
// import {ARENA_VERSION_MSG} from ' ../src/arena-version.js';
// console.info(ARENA_VERSION_MSG);

// load order: AFRAME, ARENA, components that depend on AFRAME and ARENA
import 'aframe'; // AFRAME
import './build3d.js'; // ARENA
// import '../src/ui/'; // 2D UI
import '../src/aframe-mods/'; // AFRAME modifications
import '../src/systems/'; // custom AFRAME systems
import './components.js'; // custom AFRAME components
// import '../src/webxr/'; // special handler for webxr devices
