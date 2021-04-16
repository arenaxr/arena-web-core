/**
 * @fileoverview Load ARENA source and dependencies
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

// load order: AFRAME, ARENA, components that depend on AFRAME and ARENA
import 'aframe'; // AFRAME
import './arena.js'; // ARENA
import './ui/'; // 2D UI
import './aframe-mods/'; // AFRAME modifications
import './components/'; // custom AFRAME components
import './webxr/'; // spedial handler for webxr devices

const HIDDEN_CLASS = 'a-hidden';
const updateEnterInterfaces = function() {
    if (window.hasNativeWebXRImplementation) {
        return;
    }

    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
        window.addEventListener('DOMContentLoaded', updateEnterInterfaces);
        return;
    }

    if (sceneEl.hasLoaded) {
        const enterAREl = sceneEl.components['vr-mode-ui'].enterAREl;
        enterAREl.classList.remove(HIDDEN_CLASS);
        enterAREl.addEventListener('click', function() {
            alert('Welcome to ar');
            document.getElementById('env').setAttribute('visible', false);
        });
    } else {
        sceneEl.addEventListener('loaded', updateEnterInterfaces);
    }
};

updateEnterInterfaces();
