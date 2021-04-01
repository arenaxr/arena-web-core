/* global AFRAME, ARENA */

const MAX_DELTA = 0.2;
const LONG_PRESS_DURATION_THRESHOLD = 750; // press for 750ms counts as long press

/**
 * Support user camera movement with the mouse.
 *
 */
AFRAME.registerComponent('press-and-move', {
    schema: {
        acceleration: {default: 10},
    },
    init: function() {
        this.timer = null;
        this.drag = false;
        this.longTouch = false;

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);

        const self = this;
        window.addEventListener('touchstart', function(evt) {
            evt.preventDefault();
            if (!self.timer && evt.touches.length == 1) { // let gesture-detector handle 2+ touches
                self.timer = window.setTimeout(() => {
                    self.longTouch = true;
                }, LONG_PRESS_DURATION_THRESHOLD);
            }
        });

        window.addEventListener('touchend', function(evt) {
            if (self.timer) {
                clearTimeout(self.timer);
                self.timer = null;
            }
            self.longTouch = false;
            self.drag = false;
        });
    },
    tick: function(time, delta) {
        const data = this.data;
        const acceleration = data.acceleration;

        delta = delta / 1000;

        // If FPS too low, ignore.
        if (delta > MAX_DELTA) {
            return;
        }

        if (this.longTouch) {
            this.timer = null;

            const eulerRot = document.getElementById('my-camera').getAttribute('rotation');

            const dx = acceleration * (delta * Math.cos(eulerRot.y * Math.PI / 180));
            const dy = acceleration * (delta * Math.sin(eulerRot.y * Math.PI / 180));
            const dz = acceleration * (delta * Math.sin(eulerRot.x * Math.PI / 180));

            const newPosition = document.getElementById('my-camera').getAttribute('position');

            newPosition.x -= dy; // subtract b/c negative is forward
            newPosition.z -= dx;
            newPosition.y += ARENA.flying ? dz : 0;

            document.getElementById('my-camera').setAttribute('position', newPosition);
        }
    },
});

