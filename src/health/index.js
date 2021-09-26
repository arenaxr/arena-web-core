/**
 * @fileoverview Health check reporting for ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/**
 * A class to manage an instance of ARENA's health/error reporting and troubleshooting.
 */
export class ARENAHealth {
    /**
     *
     */
    constructor() {
        this.activeErrors = [];
        $(".error-icon").on("mouseenter",
            function() {
                alert('test1');
                drawErrorBlock();
            },
            function() {},
        );
        // let test = document.getElementById("error-icon");
        // test.addEventListener("mouseenter", function( event ) {
        //     alert('test2');
        // }, false);

        $("#btn-error-reload").on("click", function() {
            window.location.reload();
        });
    }

    /**
     *
     * @param {*} errorCode
     */
    addError(errorCode) {
        this.activeErrors[errorCode] = {
            name: 'name',
            explanation: 'explanation',
        };
    }

    /**
     *
     * @param {*} errorCode
     */
    removeError(errorCode) {
        delete this.activeErrors[errorCode];
    }

    /**
     *
     */
    drawErrorBlock() {
        $("#error-block").empty();
        $.each(this.activeErrors, function(error) {
            // TODO: append error data
        });
    }
}
