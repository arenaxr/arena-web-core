/**
 * @fileoverview Load ARENA source and dependencies
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

// load order: AFRAME, ARENA, components that depend on AFRAME and ARENA
import AFRAME from 'aframe'; // AFRAME
import './arena.js'; // ARENA

// Load additional A-Frame components after ARENA starts 
window.addEventListener('onauth', e => {
    e.preventDefault();

    import('./aframe-mods.js'); // modifications to improve UX in the ARENA

    import('./components/index.js')
      .then(module => {
        // ...
      })
      .catch(err => {
        alert('Error loading aditional components')
      });
  });