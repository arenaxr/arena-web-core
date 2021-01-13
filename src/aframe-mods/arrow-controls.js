/* global AFRAME */

const MAX_DELTA_LOOK = 0.015;
// const PI_2 = Math.PI / 2;
keysPressed = {};

AFRAME.registerComponent('look-controls-arrow', {
    init: function() {
        this.attachKeyEventListeners();
    },

    attachKeyEventListeners: function() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },

    removeKeyEventListeners: function() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    },

    onKeyDown: function(event) {
        keysPressed[event.key] = true;
    },

    onKeyUp: function(event) {
        delete keysPressed[event.key];
    },

    tick: function(time, delta) {
        const myCamera = document.getElementById('my-camera');
        const lookControls = myCamera.components['look-controls'];

        const keys = keysPressed;
        if (keys['ArrowLeft']) {
            lookControls.yawObject.rotation.y += MAX_DELTA_LOOK;
        }
        if (keys['ArrowRight']) {
            lookControls.yawObject.rotation.y -= MAX_DELTA_LOOK;
        }

        // if (keys['ArrowUp']) {
        //    lookControls.pitchObject.rotation.x += MAX_DELTA_LOOK;
        // }
        // if (keys['ArrowDown']) {
        // lookControls.pitchObject.rotation.x -= MAX_DELTA_LOOK;
        // }
        // lookControls.pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, lookControls.pitchObject.rotation.x));
    },
});
