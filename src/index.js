/**
 * @fileoverview Load ARENA source and dependencies
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

// ARENA version from automated scripts
import {ARENA_VERSION_MSG} from './arena-version.js';
console.info(ARENA_VERSION_MSG);

// load order: ARENA, components that depend on AFRAME and ARENA
import './arena.js'; // ARENA
import './ui/'; // 2D UI
import './aframe-mods/'; // AFRAME modifications
import './systems/'; // custom AFRAME systems
import './geometries/'; // custom AFRAME geometries
import './components/'; // custom AFRAME components
import './hybrid/'; // hybrid rendering
import './webxr/'; // special handler for webxr devices
import './webar/'; // special handler for non-webxr devices
