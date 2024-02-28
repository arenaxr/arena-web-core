/**
 * @fileoverview General component for WebXR, assigning device-specific components
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

import { ARENAUtils } from '../../utils';

AFRAME.registerComponent('webxr-device-manager', {
    init() {
        const { el: sceneEl } = this;
        this.isWebXRViewer = ARENAUtils.isWebXRViewer();
        if (this.isWebXRViewer) {
            sceneEl.setAttribute('webxr-viewer', true);
            sceneEl.removeAttribute('ar-hit-test-listener');
        }

        this.onWebXREnterVR = this.onWebXREnterVR.bind(this);
        this.onWebXRRExitVR = this.onWebXRRExitVR.bind(this);
        sceneEl.addEventListener('enter-vr', this.onWebXREnterVR);
        sceneEl.addEventListener('exit-vr', this.onWebXRRExitVR);

        this.isMobile = ARENAUtils.isMobile();
        this.mouseCursor = document.getElementById('mouse-cursor');
        this.cameraSpinner = document.getElementById('cameraSpinner');
        this.lHand = document.getElementById('leftHand');
        this.rHand = document.getElementById('rightHand');
    },

    onWebXREnterVR() {
        const { el: sceneEl, mouseCursor, cameraSpinner, lHand, rHand, isMobile, isWebXRViewer } = this;
        if (isMobile && !isWebXRViewer) {
            mouseCursor.removeAttribute('cursor');
            mouseCursor.removeAttribute('raycaster');
            cameraSpinner.renderer = sceneEl.renderer; // Manually set renderer for cursor component (assumes sceneEl)
            cameraSpinner.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });
            cameraSpinner.setAttribute('cursor', { rayOrigin: 'xrselect', fuse: false });
            cameraSpinner.components.cursor.onEnterVR(); // Manually trigger cursor callback for xr event binds
        } else if (!isWebXRViewer) {
            // non-mobile, non-WebXR browser, maybe headset? Enable hands, disable mouse raycaster
            mouseCursor.removeAttribute('cursor');
            mouseCursor.removeAttribute('raycaster');
            lHand.setAttribute('raycaster', 'enabled', true);
            rHand.setAttribute('raycaster', 'enabled', true);
        }
        if (sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', false);
            const arMarkerSys = sceneEl.systems.armarker;
            arMarkerSys.webXRSessionStarted(sceneEl.xrSession);
        }
    },

    onWebXRRExitVR() {
        const { el: sceneEl, mouseCursor, cameraSpinner, lHand, rHand, isMobile, isWebXRViewer } = this;
        if (isMobile && !isWebXRViewer) {
            cameraSpinner.removeAttribute('cursor');
            cameraSpinner.removeAttribute('raycaster');
            mouseCursor.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });
            mouseCursor.setAttribute('cursor', { rayOrigin: 'mouse' });
        } else if (!isWebXRViewer) {
            // non-mobile, non-WebXR browser, maybe headset?
            mouseCursor.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });
            mouseCursor.setAttribute('cursor', { rayOrigin: 'mouse' });
            lHand.setAttribute('raycaster', 'enabled', false);
            rHand.setAttribute('raycaster', 'enabled', false);
        }
        if (sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', true);
        }
    },
});
