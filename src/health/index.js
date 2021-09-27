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
        });
    }

    /**
     *
     * @param {*} errorCode
     */
    addError(errorCode) {
        const err = config.find((el) => el.errorCode === errorCode);
        this.activeErrors[errorCode] = err;
        // TODO: make error-icon visible
    }

    /**
     *
     * @param {*} errorCode
     */
    removeError(errorCode) {
        delete this.activeErrors[errorCode];
        // TODO: make error-icon invisible, when activeErrors = 0
    }
}

/**
 *
 * @param {*} errors
 */
function drawErrorBlock(errors) {
    $('#error-block').append('<strong>Errors and Troubleshooting</strong><hr>');
    $('#error-block').append('<table id="error-list"><tbody></tbody></table><hr>');
    const reload = $('<table>')
        .append($('<tbody>')
            .append($('<tr>')
                .append($('<td><small>Click `Reload` once errors are resolved.</small></td>'))
                .append('<td><button id="btn-error-reload" class="btn btn-link btn-sm">Reload</button></td>')));
    $('#error-block').append(reload);
    // add list of errors
    for (const [k, v] of Object.entries(errors)) {
        $('#error-list').find('tbody')
            .append($('<tr>')
                .append($(`<td><span class="${v.class}">${v.title}</span></td>`))
                .append(`<td><a href="${v.helpLink}" target="_blank" class="btn btn-link btn-sm">Help</a></td>`));
    };
}
