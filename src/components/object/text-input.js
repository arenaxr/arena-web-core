/**
 * @fileoverview Present an HTML prompt to user
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

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
            default: 'Text Input',
        },
        label: {
            default: 'Input text below (max is 140 characters)',
        },
        placeholder: {
            default: 'Type here',
        },
    },

    multiple: true,

    init() {},

    update() {
        const { data, el } = this;

        el.addEventListener(data.on, function onEvtCallback() {
            Swal.fire({
                title: data.title.substring(0, 140),
                input: 'textarea',
                inputLabel: data.label.substring(0, 140),
                inputPlaceholder: data.placeholder.substring(0, 140),
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                confirmButtonText: 'Send',
                reverseButtons: true,
            }).then((result) => {
                if (!result.value) return;
                const text = result.value.substring(0, 140);

                const thisMsg = {
                    object_id: this.id,
                    action: 'clientEvent',
                    type: 'textinput',
                    data: {
                        writer: ARENA.camName,
                        text,
                    },
                };

                // publishing events attached to user id objects allows sculpting security
                ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
            });
        });
    },
});
