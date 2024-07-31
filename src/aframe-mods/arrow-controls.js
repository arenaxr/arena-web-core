/**
 * @fileoverview Allows using arrow keys for rotating the user's camera view
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

const MAX_DELTA = 0.2;

function isEmptyObject(keys) {
    let key;
    // eslint-disable-next-line
    for (key in keys) {
        return false;
    }
    return true;
}

AFRAME.registerComponent('arrow-controls', {
    schema: {
        acceleration: { default: 1.1 },
    },
    dependencies: ['look-controls'],

    init() {
        this.keys = {};

        this.onBlur = this.onBlur.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onVisibilityChange = this.onVisibilityChange.bind(this);

        this.attachVisibilityEventListeners();
    },

    play() {
        this.attachKeyEventListeners();
        this.removeVisibilityEventListeners();
    },

    pause() {
        this.keys = {};
        this.removeKeyEventListeners();
    },

    attachVisibilityEventListeners() {
        window.addEventListener('blur', this.onBlur);
        window.addEventListener('focus', this.onFocus);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    removeVisibilityEventListeners() {
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('focus', this.onFocus);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    },

    attachKeyEventListeners() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },

    removeKeyEventListeners() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    },

    onBlur() {
        this.pause();
    },

    onFocus() {
        this.play();
    },

    onVisibilityChange() {
        if (document.hidden) {
            this.onBlur();
        } else {
            this.onFocus();
        }
    },

    onKeyDown(event) {
        this.keys[event.key] = true;
    },

    onKeyUp(event) {
        delete this.keys[event.key];
    },

    tick(time, delta) {
        const { data, el } = this;
        const { keys } = this;
        const { acceleration } = data;

        if (isEmptyObject(keys)) {
            return;
        }

        // only move when focus is on body.
        // allows user to type in chat, settings, etc without triggering movement.
        // bit of a hack, not sure how aframe does it.
        if (document.activeElement !== document.body) {
            return;
        }

        // eslint-disable-next-line no-param-reassign
        delta /= 1000;

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
