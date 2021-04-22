/* global AFRAME, ARENA */

/**
 * @fileoverview Support user camera movement with the mouse.
 * Adapted from: https://github.com/aframevr/aframe/blob/master/src/components/wasd-controls.js
 *
 */

const MAX_DELTA = 0.2;
const CLAMP_VELOCITY = 0.00001;
const LONG_PRESS_DURATION_THRESHOLD = 1000; // pressing for 1 second counts as long press
const EPS = 10e-6;
/**
 * Press and move camera; User camera movement with the mouse.
 * Based off [wasd controls]{@link https://github.com/aframevr/aframe/blob/master/src/components/wasd-controls.js}
 * @module press-and-move
 * @property {number} [acceleration=30] - Movement acceleration.
 * @property {boolean} [enabled=true] - Is the camera movement component enabled.
 * @property {boolean} [fly=true] - Is the camera at a fixed height (`fly=false`) or not (`fly=true`)
 */
AFRAME.registerComponent('press-and-move', {
    schema: {
        acceleration: {default: 30},
        constrainToNavMesh: {default: false},
        enabled: {default: true},
        fly: {default: false},
    },

    init: function() {
        // Navigation
        this.navGroup = null;
        this.navNode = null;
        this.navStart = new THREE.Vector3();
        this.navEnd = new THREE.Vector3();
        this.clampedEnd = new THREE.Vector3();

        this.timer = null;
        this.drag = false;
        this.longTouch = false;

        this.easing = 1.1;

        this.velocity = new THREE.Vector3();

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);

        const self = this;
        window.addEventListener('touchstart', function(evt) {
            evt.preventDefault();
            if (!self.timer && evt.touches.length == 1) { // let gesture-detector handle 2+ touches
                self.timer = window.setTimeout(() => {
                    self.longTouch = true;
                }, LONG_PRESS_DURATION_THRESHOLD);
            }
        });

        window.addEventListener('touchend', function(evt) {
            if (self.timer) {
                clearTimeout(self.timer);
                self.timer = null;
            }
            self.longTouch = false;
            self.drag = false;
        });
    },

    updateVelocity: function(delta) {
        const data = this.data;
        const velocity = this.velocity;

        // If FPS too low, reset velocity.
        if (delta > MAX_DELTA) {
            velocity.x = 0;
            velocity.z = 0;
            return;
        }

        // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
        const scaledEasing = Math.pow(1 / this.easing, delta * 60);
        // Velocity Easing.
        if (velocity.x !== 0) {
            velocity.x = velocity.x * scaledEasing;
        }

        if (velocity.z !== 0) {
            velocity.z = velocity.z * scaledEasing;
        }

        // Clamp velocity easing.
        if (Math.abs(velocity.x) < CLAMP_VELOCITY) {
            velocity.x = 0;
        }

        if (Math.abs(velocity.z) < CLAMP_VELOCITY) {
            velocity.z = 0;
        }

        if (!data.enabled) {
            return;
        }

        // Update velocity using keys pressed.
        const acceleration = data.acceleration;
        velocity.z -= acceleration * delta;
    },

    getMovementVector: (function() {
        const directionVector = new THREE.Vector3(0, 0, 0);
        const rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        return function(delta) {
            const rotation = this.el.getAttribute('rotation');
            const velocity = this.velocity;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);

            // Absolute.
            if (!rotation) {
                return directionVector;
            }

            const xRotation = this.data.fly ? rotation.x : 0;

            // Transform direction relative to heading.
            rotationEuler.set(THREE.Math.degToRad(xRotation), THREE.Math.degToRad(rotation.y), 0);
            directionVector.applyEuler(rotationEuler);
            return directionVector;
        };
    })(),

    tick: function(time, delta) {
        const data = this.data;
        const el = this.el;
        const velocity = this.velocity;

        if (this.longTouch) {
            this.timer = null;

            delta = delta / 1000;
            this.updateVelocity(delta);

            if (!velocity.x && !velocity.z) {
                return;
            }

            const nav = el.sceneEl.systems.nav;
            if (nav.navMesh && data.constrainToNavMesh && !data.fly) {
                if (velocity.lengthSq() < EPS) return;

                this.navStart.copy(el.object3D.position);
                this.navEnd.copy(this.navStart).add(this.getMovementVector(delta));

                this.navGroup = this.navGroup === null ? nav.getGroup(this.navStart) : this.navGroup;
                this.navNode = this.navNode || nav.getNode(this.navStart, this.navGroup);
                this.navNode = nav.clampStep(this.navStart, this.navEnd, this.navGroup, this.navNode, this.clampedEnd);
                el.object3D.position.copy(this.clampedEnd);
            } else {
                // Get movement vector and translate position.
                el.object3D.position.add(this.getMovementVector(delta));
            }
        }
    },
});

