/**
 * @fileoverview General component for WebXR, assigning device-specific components
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

import { ARENAUtils } from '../utils';

AFRAME.registerComponent('webxr-device-manager', {
    init() {
        if (ARENAUtils.isWebXRViewer()) {
            this.el.sceneEl.setAttribute('webxr-viewer', true);
            this.el.sceneEl.removeAttribute('ar-hit-test-listener');
        }

        this.onWebXRViewerEnterVR = this.onWebXRViewerEnterVR.bind(this);
        this.onWebXRViewerExitVR = this.onWebXRViewerExitVR.bind(this);
        window.addEventListener('enter-vr', this.onWebXRViewerEnterVR);
        window.addEventListener('exit-vr', this.onWebXRViewerExitVR);
    },

    onWebXRViewerEnterVR() {
        if (this.el.sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', false);
            const arMarkerSys = this.el.sceneEl.systems.armarker;
            arMarkerSys.webXRSessionStarted(this.el.sceneEl.xrSession);
        }
    },

    onWebXRViewerExitVR() {
        if (this.el.sceneEl.is('ar-mode')) {
            document.getElementById('env').setAttribute('visible', true);
        }
    },
});
