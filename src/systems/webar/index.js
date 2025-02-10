/**
 * @fileoverview AR session handler for standard, non-webxr devices
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import './webar-session';
import WebARCameraCapture from '../armarker/camera-capture/ccwebar';
import { ARENAUtils } from '../../utils';

const HIDDEN_CLASS = 'a-hidden';

/**
 * Helper functions for WebAR session
 */
export default class ARENAWebARUtils {
    /**
     * Starts a WebAR session
     */
    static enterARNonWebXR() {
        // if (!ARENA.utils.isMobile()) {
        //     return;
        // }

        // hack: only allow smartphones and tablets?
        if (!('ontouchstart' in window) && !ARENA.params.camFollow) {
            return;
        }

        const sceneEl = document.querySelector('a-scene');
        sceneEl.setAttribute('arena-webar-session', '');

        if (ARENA.params.camFollow) {
            try {
                this.cameraCapture = new WebARCameraCapture();
                this.cameraCapture.initCamera();
            } catch (err) {
                console.error(`No valid CV camera capture found. ${err}`);
            }
        }
    }

    /**
     * Adds the AR button for non-WebXR devices
     */
    static handleARButtonForNonWebXRMobile() {
        // if (ARENA.params.camFollow) {
        //     // Assume that all controls should be relinquished
        //     const camera = document.getElementById('my-camera');
        //     camera.setAttribute('look-controls', 'enabled', false);
        //     camera.setAttribute('wasd-controls', 'enabled', false);
        // }

        if (ARENAUtils.isWebXRViewer()) {
            return;
        }

        // hack: only allow smartphones and tablets?
        if (!('ontouchstart' in window) && !ARENA.params.camFollow) {
            return;
        }

        const sceneEl = document.querySelector('a-scene');
        const vrModeUI = sceneEl.components['xr-mode-ui'];
        const { enterAREl } = vrModeUI;
        enterAREl.classList.remove(HIDDEN_CLASS);
        enterAREl.removeEventListener('click', vrModeUI.onEnterARButtonClick, true);
        enterAREl.addEventListener('click', () => {
            ARENAWebARUtils.enterARNonWebXR();
        });
    }
}
