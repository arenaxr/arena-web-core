/**
 * @fileoverview AR session component for standard, non-webxr devices
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2022, The CONIX Research Center. All rights reserved.
 * @date 2022
 */

import {ARENAUtils} from '../utils.js';

const HIDDEN_CLASS = 'a-hidden';

AFRAME.registerComponent('arena-webar-session', {
    schema: {
        enabled: {type: 'boolean', default: true},
        frameWidth: {type: 'number', default: 1280},
        frameHeight: {type: 'number', default: 720},
    },

    init: async function() {
        const data = this.data;
        const el = this.el;

        // hide environment and make scene transparent
        const env = document.getElementById('env');
        env.setAttribute('visible', false);

        // hide ar/vr buttons
        this.hideVRButtons();

        // hide icons
        const icons = document.getElementById('icons-div-container');
        icons.style.display = 'none';

        // unexpand chat
        const chatExpandBtn = document.getElementById('chat-button-group-expand-icon');
        if (chatExpandBtn.classList.contains('fa-angle-left')) {
            chatExpandBtn.click();
        }

        const camera = document.getElementById('my-camera');
        // disable press and move controls
        camera.setAttribute('press-and-move', 'enabled', false);
        // remove dragging to rotate scene
        camera.setAttribute('look-controls', 'touchEnabled', false);
        // enable aframe's usage of gyro
        camera.setAttribute('look-controls', 'magicWindowTrackingEnabled', true);

        // Disable handoff of orientation to THREE when `ar-mode` and VR-capability is detected
        document.getElementById('my-camera').components['look-controls'].updateOrientation = function() {
            const object3D = this.el.object3D;
            const pitchObject = this.pitchObject;
            const yawObject = this.yawObject;

            this.updateMagicWindowOrientation();

            // On mobile, do camera rotation with touch events and sensors.
            object3D.rotation.x = this.magicWindowDeltaEuler.x + pitchObject.rotation.x;
            object3D.rotation.y = this.magicWindowDeltaEuler.y + yawObject.rotation.y;
            object3D.rotation.z = this.magicWindowDeltaEuler.z;
        };

        el.addState('ar-mode');
        el.resize();

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));

        document.querySelector('a-scene').systems['armarker'].webXRSessionStarted();
    },

    update() {
        this.onResize();
    },

    hideVRButtons: function() {
        const data = this.data;
        const el = this.el;

        const enterAREl = el.components['vr-mode-ui'].enterAREl;
        enterAREl.classList.add(HIDDEN_CLASS);
        const enterVREl = el.components['vr-mode-ui'].enterVREl;
        enterVREl.classList.add(HIDDEN_CLASS);
    },

    onResize: function() {
        const data = this.data;
        const el = this.el;

        // set new camera projection matrix parameters
        if (ARENAUtils.isLandscapeMode()) {
            if (window.innerWidth > data.frameWidth || window.innerHeight > data.frameHeight) {
                el.camera.fov = 31; // found empirically
            } else {
                el.camera.fov = 26; // found empirically
            }
        } else {
            if (window.innerWidth > data.frameWidth || window.innerHeight > data.frameHeight) {
                el.camera.fov = 64; // found empirically
            } else {
                el.camera.fov = 77; // found empirically
            }
        }
        el.camera.aspect = window.innerWidth / window.innerHeight;
        el.camera.near = 0.001; // webxr viewer parameters
        el.camera.far = 1000.0;
        el.camera.updateProjectionMatrix();
    },
});
