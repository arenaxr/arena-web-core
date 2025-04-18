/**
 * @fileoverview Present an HTML prompt to user
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { ARENAUtils } from '../../utils';
import { TOPICS } from '../../constants';

/**
 * Opens an HTML prompt when clicked. Sends text input as an event on MQTT
 * @module textinput
 * @property {string} [on=mousedown] - A case-sensitive string representing the [event type]{@link https://developer.mozilla.org/en-US/docs/Web/Events} to listen for, e.g. 'mousedown', 'mouseup'
 * @property {string} [title=Text Input] - The prompt title
 * @property {string} [label=Input text below (max is 140 characters)] - Text prompt label
 * @property {string} [placeholder=Type here] - Text input place holder
 */
AFRAME.registerComponent('textinput', {
    schema: {
        on: {
            default: 'mousedown',
        },
        title: {
            default: '',
            type: 'string',
        },
        label: {
            default: '',
            type: 'string',
        },
        placeholder: {
            default: '',
            type: 'string',
        },
        inputType: {
            default: 'text',
            type: 'string',
        },
        inputValue: {
            default: '',
            type: 'string',
        },
        inputOptions: {
            default: [],
            type: 'array',
        },
    },

    multiple: true,

    init() {
        const { data, el } = this;
        this.onEvtCallback = this.onEvtCallback.bind(this);
        el.addEventListener(data.on, this.onEvtCallback);
    },

    onEvtCallback(evt) {
        // Maybe too late? but the only clientEvent that should occur is actual text, not mouse/touch events
        evt.preventDefault(evt);
        evt.stopPropagation();
        const { data, el } = this;
        const { topicParams } = ARENA;
        const topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr(topicParams);
        const topicBasePrivate = TOPICS.PUBLISH.SCENE_USER_PRIVATE.formatStr(topicParams);
        const topicBasePrivateProg = TOPICS.PUBLISH.SCENE_PROGRAM_PRIVATE.formatStr(topicParams);
        Swal.fire({
            titleText: data.title.substring(0, 140),
            input: data.inputType,
            inputLabel: data.label.substring(0, 140),
            inputPlaceholder: data.placeholder.substring(0, 140),
            showCancelButton: true,
            confirmButtonText: 'Send',
            reverseButtons: true,
            target: '#overlay',
            allowOutsideClick: false, // Chrome cancels out instantly otherwise
            position: 'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'top' : 'center',
            inputValue: data.inputValue,
            inputOptions: Object.fromEntries(data.inputOptions.map((opt) => [opt, opt])),
        }).then((result) => {
            if (!result.value) return;
            const text = result.value.substring(0, 140);

            const thisMsg = {
                object_id: ARENA.idTag,
                action: 'clientEvent',
                type: 'textinput',
                data: {
                    target: this.el.id,
                    text,
                },
            };
            // publishing events attached to user id objects allows sculpting security
            ARENAUtils.publishClientEvent(el, thisMsg, topicBase, topicBasePrivate, topicBasePrivateProg);
        });
    },
    remove() {
        const { data, el } = this;
        el.removeEventListener(data.on, this.onEvtCallback);
    },
});
