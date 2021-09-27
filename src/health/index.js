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
 */
export class ARENAHealth {
    /**
     *
     */
    constructor() {
        const instance = this;
        this.activeErrors = [];

        $.getJSON('/src/health/health-config.json', function(json) {
            instance.config = json;
        });

        $(document).ready(function() {
            // hover, draw draw the errors box
            $('#error-icon').hover(
                function() { // mouseenter
                    drawErrorBlock(instance.activeErrors);
                },
                function() { // mouseleave
                    $('#error-block').empty();
                });
            // reload button
            $('#btn-error-reload').click(function() {
                window.location.reload();
            });
            // update icon display once doc is ready
            const icon = document.getElementById('error-icon');
            if (Object.keys(instance.activeErrors).length) {
                icon.style.display = 'block';
            } else {
                icon.style.display = 'none';
            }
        });
    }

    /**
     *
     * @param {*} errorCode
     */
    addError(errorCode) {
        const err = config.find((el) => el.errorCode === errorCode);
        this.activeErrors[errorCode] = err;
        // make error-icon visible
        const icon = document.getElementById('error-icon');
        if (icon) icon.style.display = 'block';
    }

    /**
     *
     * @param {*} errorCode
     */
    removeError(errorCode) {
        delete this.activeErrors[errorCode];
        // make error-icon invisible, when activeErrors = 0
        if (!Object.keys(this.activeErrors).length) {
            const icon = document.getElementById('error-icon');
            if (icon) icon.style.display = 'none';
        }
    }
}

/**
 *
 * @param {*} errors
 */
function drawErrorBlock(errors) {
    $('#error-block').append('<strong>Errors and Troubleshooting</strong><hr>');
    $('#error-block').append('<table id="error-list"><tbody></tbody></table><hr>');
    // add list of errors
    for (const [k, v] of Object.entries(errors)) {
        $('#error-list').find('tbody')
            .append($('<tr>')
                .append($(`<td><span class="${v.class}">${v.title}</span></td>`))
                .append(`<td><a href="${v.helpLink}" target="_blank" class="btn btn-link btn-sm">Help</a></td>`));
    };
    // add reload option
    const reload = $('<table>')
        .append($('<tbody>')
            .append($('<tr>')
                .append($('<td><small>Click `Reload` once errors are resolved.</small></td>'))
                .append('<td><button id="btn-error-reload" class="btn btn-link btn-sm">Reload</button></td>')));
    $('#error-block').append(reload);
}
