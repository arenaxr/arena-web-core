/*
    Scene component that logs all keyboard events and sends them as new clientEvents
 */

import { ARENAUtils } from '../../utils';
import { TOPICS } from '../../constants';

AFRAME.registerComponent('keyboard-listener', {
    schema: {
        enabled: { type: 'boolean', default: false },
    },
    init() {
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
    },
    addListeners() {
        this.prevWASD = this.el.sceneEl.getAttribute('wasd-controls');
        this.el.sceneEl.removeAttribute('wasd-controls');
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },
    removeListeners() {
        this.el.sceneEl.setAttribute('wasd-controls', this.prevWASD);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    },
    remove() {
        this.removeListeners();
    },
    update(oldData) {
        if (!oldData.enabled && this.data.enabled) {
            this.addListeners();
        } else if (oldData.enabled && !this.data.enabled) {
            this.removeListeners();
        }
    },
    onKeyDown(evt) {
        // Publishes keydown events to mqtt similar to mouseDown events. We ignore repeats as we are already
        // tracking specifically down and up events
        if (evt.repeat) return;
        const msg = {
            object_id: ARENA.idTag,
            action: 'clientEvent',
            type: 'keydown',
            data: {
                key: evt.key,
                code: evt.code,
            },
        };
        ARENAUtils.publishClientEvent(this.el.sceneEl, msg, TOPICS.PUBLISH.SCENE_USER.formatStr(ARENA.topicParams));
    },
    onKeyUp(evt) {
        const msg = {
            object_id: ARENA.idTag,
            action: 'clientEvent',
            type: 'keyup',
            data: {
                key: evt.key,
                code: evt.code,
            },
        };
        ARENAUtils.publishClientEvent(this.el.sceneEl, msg, TOPICS.PUBLISH.SCENE_USER.formatStr(ARENA.topicParams));
    },
});
