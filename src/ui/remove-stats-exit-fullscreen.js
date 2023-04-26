AFRAME.registerComponent('remove-stats-exit-fullscreen', {
    init: function() {
        // fullscreen exit handlers
        if (document.addEventListener) {
            document.addEventListener('fullscreenchange', fullScreenExitHandler, false);
            document.addEventListener('mozfullscreenchange', fullScreenExitHandler, false);
            document.addEventListener('MSFullscreenChange', fullScreenExitHandler, false);
            document.addEventListener('webkitfullscreenchange', fullScreenExitHandler, false);
        }

        /**
         * Handle exit from full screen scenarios
         */
        function fullScreenExitHandler() {
            if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null) {
                // manually disable a-frame stats
                const sceneEl = document.querySelector('a-scene');
                sceneEl.removeAttribute('stats');
            }
        }
    }
});
