/**
 * @fileoverview Health check reporting for ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/**
 * A system to manage an instance of ARENA's health/error reporting and troubleshooting.
 * @example
 * // Add your errors and help links to this.config
 * {
 *   // unique error code for indexing
 *   "errorCode": "connection.connectionFailed"
 *   // error class: health-error-label, health-warning-label
 *   "class": "health-error-label"
 *   // title for display purposes
 *   "title": "Conference server connection failed"
 *   // link to troubleshooting help page/section
 *   "helpLink": "https://docs.arenaxr.org/content/troubleshooting.html#error-conference-server-connection-failed"
 * }
 */

/* global $ */

/**
 * Render the display of errors in #error-block for troubleshooting.
 * @param {[objects]} errors Array of error Objects under errorCode key.
 */
function drawErrorBlock(errors) {
    const errBlock = $('#error-block');
    errBlock.append('<strong>Errors and Troubleshooting</strong><hr>');
    errBlock.append('<table id="error-list"><tbody></tbody></table><hr>');
    // add list of errors
    Object.entries(errors).forEach(([, v]) => {
        $('#error-list')
            .find('tbody')
            .append(
                $('<tr>')
                    .append($(`<td class='w-75'><span class='${v.class}'>${v.title}</span></td>`))
                    .append(
                        `<td class='w-25'><a href='${v.helpLink}' target='_blank' class='btn btn-link btn-sm'>Help</a></td>`
                    )
            );
    });
    // add reload option
    const reload = $('<table>').append(
        $('<tbody>').append(
            $('<tr>')
                .append($('<td class="w-75"><small>Click `Reload` once errors are resolved.</small></td>'))
                .append(
                    '<td class="w-25"><button id="btn-error-reload" class="btn btn-link btn-sm">Reload</button></td>'
                )
        )
    );
    errBlock.append(reload);
    $('#btn-error-reload').click(() => {
        window.location.reload();
    });
}

AFRAME.registerSystem('arena-health-ui', {
    schema: {
        enabled: { type: 'boolean', default: true },
    },

    init() {
        const { data } = this;

        if (!data.enabled) return;

        this.activeErrors = {};

        const _this = this;
        $(document).ready(() => {
            // hover, draw the errors box
            $('#error-icon').hover(
                () => {
                    // mouseenter
                    drawErrorBlock(_this.activeErrors);
                },
                () => {
                    // mouseleave
                    $('#error-block').empty();
                }
            );
            // update icon display once doc is ready
            const icon = document.getElementById('error-icon');
            if (Object.keys(_this.activeErrors).length) {
                icon.style.display = 'block';
            } else {
                icon.style.display = 'none';
            }
        });
    },

    /**
     * Add an error to health monitor and show the icon.
     * @param {string} errorCode The error string matching errorCode in config
     */
    addError(errorCode) {
        this.activeErrors[errorCode] = this.getErrorDetails(errorCode);
        // make error-icon visible
        const icon = document.getElementById('error-icon');
        if (icon) icon.style.display = 'block';
        // set error viewing level
        let imgSrc = 'src/systems/ui/images/exclamation-warn.png';
        Object.entries(this.activeErrors).forEach(([, v]) => {
            if (v.class === 'health-error-label') {
                imgSrc = 'src/systems/ui/images/exclamation-error.png';
            }
        });
        $('#error-img').attr('src', imgSrc);
    },

    /**
     * Remove an error to health monitor and hide the icon when errors = 0.
     * @param {string} errorCode The error string matching errorCode in config
     */
    removeError(errorCode) {
        delete this.activeErrors[errorCode];
        // make error-icon invisible, when activeErrors = 0
        if (!Object.keys(this.activeErrors).length) {
            const icon = document.getElementById('error-icon');
            if (icon) icon.style.display = 'none';
        }
    },

    /**
     * Lookup details of error code if any from config.
     * @param {string} errorCode The error string matching errorCode in config
     * @return {object} Details object for found/default error
     */
    getErrorDetails(errorCode) {
        const err = this.config.find((el) => el.errorCode === errorCode);
        if (err) {
            return err;
        }
        return {
            // default for unknown problem, as warning
            errorCode,
            class: 'health-warning-label',
            title: errorCode,
            helpLink: 'https://docs.arenaxr.org/content/troubleshooting.html',
        };
    },

    config: [
        {
            errorCode: 'connection.connectionFailed',
            class: 'health-error-label',
            title: 'Conference server connection failed',
            helpLink: 'https://docs.arenaxr.org/content/troubleshooting.html#error-conference-server-connection-failed',
        },
        {
            errorCode: 'conference.iceFailed',
            class: 'health-error-label',
            title: 'Conference stream failed',
            helpLink: 'https://docs.arenaxr.org/content/troubleshooting.html#error-conference-stream-failed',
        },
        {
            errorCode: 'mqttChat.connection',
            class: 'health-error-label',
            title: 'Chat MQTT connection failed',
            helpLink: 'https://docs.arenaxr.org/content/troubleshooting.html',
        },
        {
            errorCode: 'slow.network',
            class: 'health-error-label',
            title: 'Network speed is too slow',
            helpLink: 'https://docs.arenaxr.org/content/troubleshooting.html#error-network-speed-is-too-slow',
        },
        {
            errorCode: 'scene-options.allObjectsClickable',
            class: 'health-warning-label',
            title: 'Events Publish Behavior is too high',
            helpLink:
                'https://docs.arenaxr.org/content/troubleshooting.html#warning-events-publish-behavior-is-too-high',
        },
    ],
});
