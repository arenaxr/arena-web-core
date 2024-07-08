/**
 * @fileoverview Handles removing aframe stats when exiting from full screen on desktops.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

AFRAME.registerSystem('remove-stats-exit-fullscreen', {
    init() {
        this.fullScreenExitHandler = this.fullScreenExitHandler.bind(this);

        if (document.addEventListener) {
            document.addEventListener('fullscreenchange', this.fullScreenExitHandler, false);
            document.addEventListener('mozfullscreenchange', this.fullScreenExitHandler, false);
            document.addEventListener('MSFullscreenChange', this.fullScreenExitHandler, false);
            document.addEventListener('webkitfullscreenchange', this.fullScreenExitHandler, false);
        }
    },

    /**
     * Handle exit from full screen scenarios
     */
    fullScreenExitHandler() {
        if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null) {
            // manually disable a-frame stats
            const sceneEl = document.querySelector('a-scene');
            sceneEl.removeAttribute('stats');
        }
    },
});
