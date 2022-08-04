/**
 * @fileoverview Various handlers for webxr devices
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import './web-xr-viewer.js';
import './ar-session.js';

const HIDDEN_CLASS = 'a-hidden';

const handleARButtonForNonWebXRMobile = function() {
    // if (!AFRAME.utils.device.isMobile()) {
    //     return;
    // }

    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
        window.addEventListener('DOMContentLoaded', handleARButtonForNonWebXRMobile);
        return;
    }

    if (this.isWebARViewer) {
        return;
    }

    if (sceneEl.hasLoaded) {
        const vrModeUI = sceneEl.components['vr-mode-ui'];
        const enterAREl = vrModeUI.enterAREl;
        enterAREl.classList.remove(HIDDEN_CLASS);
        enterAREl.removeEventListener('click', vrModeUI.onEnterARButtonClick, true);
        enterAREl.addEventListener('click', function() {
            // enforce landscape mode
            if (window.orientation == 90 || window.orientation == -90) {
                sceneEl.setAttribute('arena-webar-session', '');
            } else {
                Swal.fire(
                    'Incorrect Orientation',
                    'This AR experience only works in landscape mode! Please rotate your device.',
                    'warning',
                );
            }
        });
    } else {
        sceneEl.addEventListener('loaded', handleARButtonForNonWebXRMobile);
    }
};

handleARButtonForNonWebXRMobile();
