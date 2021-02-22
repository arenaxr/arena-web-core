/* global AFRAME */

const MAX_DELTA = 0.2;

AFRAME.registerComponent('look-controls-arrow', {
    schema: {
        acceleration: {default: 1.1},
    },

    init: function() {
        this.keys = {};

        this.onBlur = this.onBlur.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onVisibilityChange = this.onVisibilityChange.bind(this);

        this.attachVisibilityEventListeners();
    },

    play: function() {
        this.attachKeyEventListeners();
        this.removeVisibilityEventListeners();
    },

    pause: function() {
        this.keys = {};
        this.removeKeyEventListeners();
    },

    attachVisibilityEventListeners: function() {
        window.addEventListener('blur', this.onBlur);
        window.addEventListener('focus', this.onFocus);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    removeVisibilityEventListeners: function() {
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('focus', this.onFocus);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    },

    attachKeyEventListeners: function() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },

    removeKeyEventListeners: function() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    },

    onBlur: function() {
        this.pause();
    },

    onFocus: function() {
        this.play();
    },

    onVisibilityChange: function() {
        if (document.hidden) {
            this.onBlur();
        } else {
            this.onFocus();
        }
    },

    onKeyDown: function(event) {
        this.keys[event.key] = true;
    },

    onKeyUp: function(event) {
        delete this.keys[event.key];
    },

    tick: function(time, delta) {
        const data = this.data;
        const el = this.el;
        const keys = this.keys;
        const acceleration = data.acceleration;

        if (isEmptyObject(keys)) {
            return;
        }

        // only move when focus is on body.
        // allows user to type in chat, settings, etc without triggering movement.
        // bit of a hack, not sure how aframe does it.
        if (document.activeElement !== document.body) {
            return;
        }

        delta = delta / 1000;

        // If FPS too low, ignore.
        if (delta > MAX_DELTA) {
            return;
        }

        const lookControls = el.components['look-controls'];
        if (keys.ArrowLeft) {
            lookControls.yawObject.rotation.y += acceleration * delta;
        }
        if (keys.ArrowRight) {
            lookControls.yawObject.rotation.y -= acceleration * delta;
        }
    },
});

function isEmptyObject(keys) {
    let key;
    for (key in keys) {
        return false;
    }
    return true;
}
