/* global AFRAME, ARENA */

/**
 * Tracking Vive controller movement in real time.
 *
 */
AFRAME.registerComponent('vive-pose-listener', {
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.updateMillis, this);
    },

    tick: (function(t, dt) {
        const newRotation = this.el.object3D.quaternion;
        const newPosition = this.el.object3D.position;

        const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);

        const newPose = rotationCoords + ' ' + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;
        }
    }),
});
