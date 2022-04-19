/**
 * @fileoverview Health check reporting for ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */
const config = require('./health-config.json');

/**
 * A class to manage an instance of ARENA's health/error reporting and troubleshooting.
 * @example
 * // Add your errors and help links to ./health-config.json
 * {
 *   // unique error code for indexing
 *   "errorCode": "connection.connectionFailed"
 *   // error class: health-error-label, health-warning-label
 *   "class": "health-error-label"
 *   // title for display purposes
 *   "title": "Conference server connection failed"
 *   // link to troubleshooting help page/section
 *   "helpLink": "https://arena.conix.io/content/troubleshooting.html#error-conference-server-connection-failed"
 * }
 */
export class ARENAHealth {
    /**
     * Construct a health object and begin monitoring for user events.
     */
    constructor() {
        const instance = this;
        this.activeErrors = {};

        $(document).ready(function() {
            // hover, draw draw the errors box
            $('#error-icon').hover(
                function() { // mouseenter
                    drawErrorBlock(instance.activeErrors);
                },
                function() { // mouseleave
                    $('#error-block').empty();
                });
            // update icon display once doc is ready
            const icon = document.getElementById('error-icon');
            if (Object.keys(instance.activeErrors).length) {
                icon.style.display = 'block';
            } else {
                icon.style.display = 'none';
            }
        });
        console.log('ARENAHealth checker ready.');
    }

    /**
     * Add an error to health monitor and show the icon.
     * @param {string} errorCode The error string matching errorCode in health-config.json
     */
    addError(errorCode) {
        this.activeErrors[errorCode] = this.getErrorDetails(errorCode);
        // make error-icon visible
        const icon = document.getElementById('error-icon');
        if (icon) icon.style.display = 'block';
        // set error viewing level
        let imgSrc = '/src/health/images/exclamation-warn.png';
        for (const [k, v] of Object.entries(this.activeErrors)) {
            if (v.class == 'health-error-label') {
                imgSrc = '/src/health/images/exclamation-error.png';
            }
        };
        $('#error-svg').attr('src', imgSrc);
    }

    /**
     * Remove an error to health monitor and hide the icon when errors = 0.
     * @param {string} errorCode The error string matching errorCode in health-config.json
     */
    removeError(errorCode) {
        delete this.activeErrors[errorCode];
        // make error-icon invisible, when activeErrors = 0
        if (!Object.keys(this.activeErrors).length) {
            const icon = document.getElementById('error-icon');
            if (icon) icon.style.display = 'none';
        }
    }

    /**
     * Lookup details of error code if any from health-config.json.
     * @param {string} errorCode The error string matching errorCode in health-config.json
     * @return {object} Details object for found/default error
     */
    getErrorDetails(errorCode) {
        const err = config.find((el) => el.errorCode === errorCode);
        if (err) {
            return err;
        } else {
            return { // default for unknown problem, as warning
                errorCode: errorCode,
                class: 'health-warning-label',
                title: errorCode,
                helpLink: 'https://arena.conix.io/content/troubleshooting.html',
            };
        }
    }
}

/**
 * Render the display of errors in #error-block for troubleshooting.
 * @param {[objects]} errors Array of error Objects under errorCode key.
 */
function drawErrorBlock(errors) {
    $('#error-block').append('<strong>Errors and Troubleshooting</strong><hr>');
    $('#error-block').append('<table id="error-list"><tbody></tbody></table><hr>');
    // add list of errors
    for (const [k, v] of Object.entries(errors)) {
        $('#error-list').find('tbody')
            .append($('<tr>')
                .append($(`<td class="w-75"><span class="${v.class}">${v.title}</span></td>`))
                .append(`<td class="w-25"><a href="${v.helpLink}" target="_blank" class="btn btn-link btn-sm">Help</a></td>`));
    };
    // add reload option
    const reload = $('<table>')
        .append($('<tbody>')
            .append($('<tr>')
                .append($('<td class="w-75"><small>Click `Reload` once errors are resolved.</small></td>'))
                .append('<td class="w-25"><button id="btn-error-reload" class="btn btn-link btn-sm">Reload</button></td>')));
    $('#error-block').append(reload);
    $('#btn-error-reload').click(function() {
        window.location.reload();
    });
}
