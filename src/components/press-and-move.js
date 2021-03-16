/* global AFRAME, ARENA */

/**
 * Support user camera movement with the mouse.
 *
 */
AFRAME.registerComponent('press-and-move', {
    schema: {
        speed: {type: 'number', default: 5.0},
    },
    init: function() {
        this.timer = null;
        this.drag = false;
        this.longTouch = false;

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);

        const self = this;
        window.addEventListener('touchstart', function(evt) {
            evt.preventDefault();
            if (evt.touches.length > 1) {
                return; // let gesture-detector handle 2+ touches
            }
            if (!self.timer) {
                self.timer = window.setTimeout(() => {
                    self.longTouch = true;
                }, 750); // press for 750ms counts as long press
            }
        });
        window.addEventListener('touchend', function(evt) {
            if (evt.touches.length > 1) {
                return; // let gesture-detector handle 2+ touches
            }
            if (self.timer) {
                clearTimeout(self.timer);
                self.timer = null;
            }
            self.longTouch = false;
            self.drag = false;
        });
        window.addEventListener('touchmove', function(evt) {
            if (evt.touches.length > 1) {
                return; // let gesture-detector handle 2+ touches
            }
            // self.drag = true; // might be better without drag detection
        });
    },
    tick: (function(t, dt) {
        if (this.longTouch) {
            this.timer = null;
            if (!this.drag) {
                const eulerRot = document.getElementById('my-camera').getAttribute('rotation');
                const dx = this.data.speed * (dt / 1000) * Math.cos(eulerRot.y * Math.PI / 180);
                const dy = this.data.speed * (dt / 1000) * Math.sin(eulerRot.y * Math.PI / 180);
                const dz = this.data.speed * (dt / 1000) * Math.sin(eulerRot.x * Math.PI / 180);
                const newPosition = document.getElementById('my-camera').getAttribute('position');
                newPosition.x -= dy; // subtract b/c negative is forward
                newPosition.z -= dx;
                newPosition.y += ARENA.flying ? dz : 0;
                document.getElementById('my-camera').setAttribute('position', newPosition);
            }
        }
    }),
});

