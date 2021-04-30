/* global AFRAME, ARENA */

const bind = AFRAME.utils.bind;
const CLAMP_VELOCITY = 0.00001;
const MAX_DELTA = 0.2;
const EPS = 10e-6;

AFRAME.components['wasd-controls'].Component.prototype.init = function() {
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
    this.onBlur = bind(this.onBlur, this);
    this.onContextMenu = bind(this.onContextMenu, this);
    this.onFocus = bind(this.onFocus, this);
    this.onKeyDown = bind(this.onKeyDown, this);
    this.onKeyUp = bind(this.onKeyUp, this);
    this.onVisibilityChange = bind(this.onVisibilityChange, this);
    this.attachVisibilityEventListeners();
};

const wasdSchema = AFRAME.components['wasd-controls'].Component.prototype.schema;
Object.assign(wasdSchema, {constrainToNavMesh: {default: false}});
AFRAME.components['wasd-controls'].Component.prototype.schema = AFRAME.schema.process(wasdSchema);

AFRAME.components['wasd-controls'].Component.prototype.tick = function(time, delta) {
    const data = this.data;
    const el = this.el;
    const velocity = this.velocity;

    if (!velocity[data.adAxis] && !velocity[data.wsAxis] &&
        isEmptyObject(this.keys)) {
        return;
    }

    // Update velocity.
    delta = delta / 1000;
    this.updateVelocity(delta);

    if (!velocity[data.adAxis] && !velocity[data.wsAxis]) {
        return;
    }
    const nav = el.sceneEl.systems.nav;
    if (nav.navMesh && data.constrainToNavMesh && !data.fly) {
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


AFRAME.components['wasd-controls'].Component.prototype.resetNav = function(checkPolygon = false, clampStep = false) {
    const nav = this.el.sceneEl.systems.nav;
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


AFRAME.components['wasd-controls'].Component.prototype.updateVelocity = function(delta) {
    let adSign;
    const data = this.data;
    const keys = this.keys;
    const velocity = this.velocity;
    let wsSign;

    const adAxis = data.adAxis;
    const wsAxis = data.wsAxis;

    // If FPS too low, reset velocity.
    if (delta > MAX_DELTA) {
        velocity[adAxis] = 0;
        velocity[wsAxis] = 0;
        return;
    }

    // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
    const scaledEasing = Math.pow(1 / this.easing, delta * 60);
    // Velocity Easing.
    if (velocity[adAxis] !== 0) {
        velocity[adAxis] = velocity[adAxis] * scaledEasing;
    }
    if (velocity[wsAxis] !== 0) {
        velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
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
    const acceleration = data.acceleration;
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

/**
 * @param {object} keys
 * @return {boolean}
 */
function isEmptyObject(keys) {
    let key;
    // eslint-disable-next-line guard-for-in
    for (key in keys) {
        return false;
    }
    return true;
}
