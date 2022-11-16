/**
 * @fileoverview AR session handler for standard, non-webxr devices
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */
import './ar-session.js';

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

        // hack: only allow smartphones and tablets?
        if (!('ontouchstart' in window)) {
            return;
        }

        const sceneEl = document.querySelector('a-scene');
        sceneEl.setAttribute('arena-webar-session', '');
    }

    /**
     * Adds the AR button for non-WebXR devices
     */
    static handleARButtonForNonWebXRMobile() {
        if (this.isWebARViewer) {
            return;
        }

        // hack: only allow smartphones and tablets?
        if (!('ontouchstart' in window)) {
            return;
        }

        const sceneEl = document.querySelector('a-scene');
        const vrModeUI = sceneEl.components['vr-mode-ui'];
        const enterAREl = vrModeUI.enterAREl;
        enterAREl.classList.remove(HIDDEN_CLASS);
        enterAREl.removeEventListener('click', vrModeUI.onEnterARButtonClick, true);
        enterAREl.addEventListener('click', function() {
            ARENAWebARUtils.enterARNonWebXR();
        });
    };
}
