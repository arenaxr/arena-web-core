/* global AFRAME */

const CLAMP_VELOCITY = 0.00001;
const MAX_DELTA = 0.2;

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
