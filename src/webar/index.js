/**
 * @fileoverview AR session handler for standard, non-webxr devices
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */
import '../webar/ar-session.js';

const HIDDEN_CLASS = 'a-hidden';

/**
 * Helper functions for WebAR session
 */
export class ARENAWebARUtils {
    /**
     * Starts a WebAR session
     */
    static enterARNonWebXR() {
        // if (!AFRAME.utils.device.isMobile()) {
        //     return;
        // }

        const sceneEl = document.querySelector('a-scene');

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
    }

    /**
     * Adds the AR button for non-WebXR devices
     */
    static handleARButtonForNonWebXRMobile() {
        const sceneEl = document.querySelector('a-scene');
        if (!sceneEl) {
            window.addEventListener('DOMContentLoaded', ARENAWebARUtils.handleARButtonForNonWebXRMobile);
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
                ARENAWebARUtils.enterARNonWebXR();
            });
        } else {
            sceneEl.addEventListener('loaded', ARENAWebARUtils.handleARButtonForNonWebXRMobile);
        }
    };
}

ARENAWebARUtils.handleARButtonForNonWebXRMobile();
