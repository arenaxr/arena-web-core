/**
 * @fileoverview Thumbstick flight controls for VR right controller similar to wasd-controls
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2026, The CONIX Research Center. All rights reserved.
 * @date 2026
 */

const MAX_DELTA = 0.2;
const EPS = 10e-6;

/**
 * Thumbstick flight controls for VR right controller.
 * @module vr-thumbstick-fly
 * @property {number} [speed=1.0] - Movement speed in m/s.
 * @property {boolean} [enabled=true] - Is the camera movement component enabled.
 * @property {string} [cameraRig=#cameraRig] - Selector for the camera rig entity.
 * @property {string} [camera=#my-camera] - Selector for the camera entity.
 */
AFRAME.registerComponent('vr-thumbstick-fly', {
    schema: {
        speed: { default: 1.0 },
        enabled: { default: true },
        cameraRig: { default: '#cameraRig' },
        camera: { default: '#my-camera' },
    },

    init() {
        this.isVR = false;
        this.velocity = new THREE.Vector3();
        this.axis = [0, 0];

        // Navigation
        this.navGroup = null;
        this.navNode = null;
        this.navStart = new THREE.Vector3();
        this.navEnd = new THREE.Vector3();
        this.clampedEnd = new THREE.Vector3();

        this.onEnterVR = this.onEnterVR.bind(this);
        this.onExitVR = this.onExitVR.bind(this);
        this.onAxisMove = this.onAxisMove.bind(this);

        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.addEventListener('exit-vr', this.onExitVR);

        // Find the camera and rig
        this.cameraRigEl = document.querySelector(this.data.cameraRig);
        if (!this.cameraRigEl) {
            console.warn(`[vr-thumbstick-fly] cameraRig '${this.data.cameraRig}' not found. Movement disabled.`);
        }

        this.cameraEl = document.querySelector(this.data.camera);
        if (!this.cameraEl) {
            console.warn(`[vr-thumbstick-fly] camera '${this.data.camera}' not found.`);
        }

        // Listen for axis move on the entity this component is attached to (e.g. hand)
        this.el.addEventListener('thumbstickmoved', this.onAxisMove);
        this.el.addEventListener('trackpadmoved', this.onAxisMove);
    },

    onEnterVR() {
        // Only enable if in VR mode (not AR mode)
        this.isVR = !this.el.sceneEl.is('ar-mode');
    },

    onExitVR() {
        this.isVR = false;
        this.axis[0] = 0;
        this.axis[1] = 0;
    },

    onAxisMove(evt) {
        if (!this.isVR || !this.data.enabled) return;

        // evt.detail.x (left/right => strafe)
        // evt.detail.y (up/down => forward/backward)
        if (evt.detail.x !== undefined && evt.detail.y !== undefined) {
            this.axis[0] = evt.detail.x;
            this.axis[1] = evt.detail.y;
        }
    },

    getMovementVector: (function getMovementVectorFactory() {
        const directionVector = new THREE.Vector3(0, 0, 0);
        const cameraRotation = new THREE.Quaternion();

        return function getMovementVector(delta) {
            // Apply thumbstick axis to vector
            // axis[0] (X) -> right (+X), left (-X)
            // axis[1] (Y) -> back (+Z), forward (-Z)
            directionVector.set(this.axis[0], 0, this.axis[1]);

            // Normalize so diagonal movement isn't faster
            if (directionVector.lengthSq() > 1) {
                directionVector.normalize();
            }

            directionVector.multiplyScalar(this.data.speed * delta); // Linear scaling (m/s)

            // Transform direction relative to camera's true world rotation.
            if (this.cameraEl) {
                cameraRotation.setFromRotationMatrix(this.cameraEl.object3D.matrixWorld);
                directionVector.applyQuaternion(cameraRotation);
            }

            return directionVector;
        };
    })(),

    tick(time, delta) {
        if (!this.isVR || !this.data.enabled) return;

        // eslint-disable-next-line no-param-reassign
        delta /= 1000;

        // If FPS too low, ignore.
        if (delta > MAX_DELTA) {
            return;
        }

        // Deadzone check
        if (Math.abs(this.axis[0]) < 0.1 && Math.abs(this.axis[1]) < 0.1) {
            return;
        }

        const { cameraRigEl } = this;
        if (!cameraRigEl) return;

        const movementVector = this.getMovementVector(delta);

        // Get movement vector (which is naturally relative to camera world rotation)
        // and translate the rig position. True "fly" ignores navmesh entirely.
        cameraRigEl.object3D.position.add(movementVector);
    },

    remove() {
        this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
        this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR);
        this.el.removeEventListener('thumbstickmoved', this.onAxisMove);
        this.el.removeEventListener('trackpadmoved', this.onAxisMove);
    },
});
