/**
 * @fileoverview Allows for changing speed in wasd controls.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA, THREE */

const CLAMP_VELOCITY = 0.00001;
const MAX_DELTA = 0.2;
const EPS = 10e-6;

/**
 * @param {object} keys
 * @return {boolean}
 */
function isEmptyObject(keys) {
    let key;
    // eslint-disable-next-line
    for (key in keys) {
        return false;
    }
    return true;
}

// AFRAME Monkeypatch (src/components/wasd-controls.js)
AFRAME.components['wasd-controls'].Component.prototype.init = function init() {
    // Navigation
    this.navGroup = null;
    this.navNode = null;
    this.navStart = new THREE.Vector3();
    this.navEnd = new THREE.Vector3();
    this.clampedEnd = new THREE.Vector3();

    // To keep track of the pressed keys.
    this.keys = {};
    this.easing = 1.1;

    this.velocity = new THREE.Vector3();

    // Bind methods and add event listeners.
    this.onBlur = this.onBlur.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.attachVisibilityEventListeners();
};

const wasdSchema = AFRAME.components['wasd-controls'].Component.prototype.schema;
Object.assign(wasdSchema, { constrainToNavMesh: { default: false } });

// AFRAME Monkeypatch (src/components/wasd-controls.js)
AFRAME.components['wasd-controls'].Component.prototype.schema = AFRAME.schema.process(wasdSchema);

// AFRAME Monkeypatch (src/components/wasd-controls.js)
AFRAME.components['wasd-controls'].Component.prototype.tick = function tick(time, delta) {
    const { data } = this;
    const { el } = this;
    const { velocity } = this;

    if (!velocity[data.adAxis] && !velocity[data.wsAxis] && isEmptyObject(this.keys)) {
        return;
    }

    // Update velocity.
    // eslint-disable-next-line no-param-reassign
    delta /= 1000;
    this.updateVelocity(delta);

    if (!velocity[data.adAxis] && !velocity[data.wsAxis]) {
        return;
    }
    const { nav } = el.sceneEl.systems;
    if (data.constrainToNavMesh && nav?.navMesh && !data.fly) {
        if (velocity.lengthSq() < EPS) return;

        this.navStart.copy(el.object3D.position).y -= ARENA.defaults.camHeight;
        this.navEnd.copy(this.navStart).add(this.getMovementVector(delta));

        this.navGroup = this.navGroup === null ? nav.getGroup(this.navStart) : this.navGroup;
        this.navNode = this.navNode || nav.getNode(this.navStart, this.navGroup);
        this.navNode = nav.clampStep(this.navStart, this.navEnd, this.navGroup, this.navNode, this.clampedEnd);
        this.clampedEnd.y += ARENA.defaults.camHeight;
        el.object3D.position.copy(this.clampedEnd);
    } else {
        // Get movement vector and translate position.
        el.object3D.position.add(this.getMovementVector(delta));
    }
};

// AFRAME Monkeypatch (src/components/wasd-controls.js)
AFRAME.components['wasd-controls'].Component.prototype.resetNav = function resetNav(
    checkPolygon = false,
    clampStep = false
) {
    const { nav } = this.el.sceneEl.systems;
    if (nav.navMesh) {
        this.navStart.copy(this.el.object3D.position).y -= ARENA.defaults.camHeight;
        this.navEnd.copy(this.navStart);
        this.navGroup = nav.getGroup(this.navStart, checkPolygon);
        this.navNode = nav.getNode(this.navStart, this.navGroup, checkPolygon);
        this.navNode = nav.clampStep(this.navStart, this.navEnd, this.navGroup, this.navNode, this.clampedEnd);
        if (clampStep) {
            this.clampedEnd.y += ARENA.defaults.camHeight;
            this.el.object3D.position.copy(this.clampedEnd);
        }
    }
};

// AFRAME Monkeypatch (src/components/wasd-controls.js)
AFRAME.components['wasd-controls'].Component.prototype.updateVelocity = function updateVelocity(delta) {
    let adSign;
    const { data } = this;
    const { keys } = this;
    const { velocity } = this;
    let wsSign;

    const { adAxis } = data;
    const { wsAxis } = data;

    // If FPS too low, reset velocity.
    if (delta > MAX_DELTA) {
        velocity[adAxis] = 0;
        velocity[wsAxis] = 0;
        return;
    }

    // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
    const scaledEasing = (1 / this.easing) ** (delta * 60);
    // Velocity Easing.
    if (velocity[adAxis] !== 0) {
        velocity[adAxis] *= scaledEasing;
    }
    if (velocity[wsAxis] !== 0) {
        velocity[wsAxis] *= scaledEasing;
    }

    // Clamp velocity easing.
    if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) {
        velocity[adAxis] = 0;
    }
    if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) {
        velocity[wsAxis] = 0;
    }

    if (!data.enabled) {
        return;
    }

    // Update velocity using keys pressed.
    const { acceleration } = data;
    if (data.adEnabled) {
        adSign = data.adInverted ? -1 : 1;
        if (keys.KeyA) {
            velocity[adAxis] -= adSign * acceleration * delta;
        }
        if (keys.KeyD) {
            velocity[adAxis] += adSign * acceleration * delta;
        }
    }
    if (data.wsEnabled) {
        wsSign = data.wsInverted ? -1 : 1;
        if (keys.KeyW || keys.ArrowUp) {
            velocity[wsAxis] -= wsSign * acceleration * delta;
        }
        if (keys.KeyS || keys.ArrowDown) {
            velocity[wsAxis] += wsSign * acceleration * delta;
        }
    }
};
