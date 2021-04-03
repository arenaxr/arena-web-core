/* global AFRAME, ARENA */

import Swal from 'sweetalert2';

/**
 * Opens an HTML prompt when clicked.
 *
 */
AFRAME.registerComponent('textinput', {
    schema: {
        on: {
            default: 'mousedown',
        }, // event to listen 'on'
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

    init: function() {

    },

    update: function() {
        const data = this.data;
        const el = this.el;

        el.addEventListener(data.on, function(evt) {
            Swal.fire({
                title: data.title.substring(0, 140),
                input: 'textarea',
                inputLabel: data.label.substring(0, 140),
                inputPlaceholder: data.placeholder.substring(0, 140),
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                confirmButtonText: 'Send',
                reverseButtons: true,
            })
                .then((result) => {
                    if (!result.value) return;
                    const text = result.value.substring(0, 140);

                    const thisMsg = {
                        object_id: this.id,
                        action: 'clientEvent',
                        type: 'textinput',
                        data: {
                            writer: ARENA.camName,
                            text: text,
                        },
                    };

                    // publishing events attached to user id objects allows sculpting security
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
                });
        });
    },
});
