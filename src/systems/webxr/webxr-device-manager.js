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
    },

    onWebXREnterVR() {
        const { el, mouseCursor, isMobile, isWebXRViewer } = this;
        const { sceneEl } = el;
        if (sceneEl.is('ar-mode')) {
            if (isMobile && !isWebXRViewer) {
                mouseCursor.removeAttribute('cursor');
                mouseCursor.removeAttribute('raycaster');
                el.setAttribute('cursor', { rayOrigin: 'xrselect', fuse: false });
                el.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });

                el.components.cursor.onEnterVR(); // Manually trigger cursor callback
            }
            document.getElementById('env').setAttribute('visible', false);
            const arMarkerSys = sceneEl.systems.armarker;
            arMarkerSys.webXRSessionStarted(sceneEl.xrSession);
        }
    },

    onWebXRRExitVR() {
        const { el: sceneEl, mouseCursor, isMobile, isWebXRViewer } = this;
        if (sceneEl.is('ar-mode')) {
            if (isMobile && !isWebXRViewer) {
                sceneEl.removeAttribute('cursor');
                sceneEl.removeAttribute('raycaster');
                mouseCursor.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });
                mouseCursor.setAttribute('cursor', { rayOrigin: 'mouse' });
            }
            document.getElementById('env').setAttribute('visible', true);
        }
    },
});
