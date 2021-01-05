/* global AFRAME */

/**
 * Tracking camera movement in real time. Publishes camera pose
 *
 */
AFRAME.registerComponent('pose-publisher', {
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function(t, dt) {
        const newRotation = this.el.object3D.quaternion;
        const newPosition = this.el.object3D.position;

        const rotationCoords = rotToText(newRotation);
        const positionCoords = coordsToText(newPosition);

        const newPose = rotationCoords + ' ' + positionCoords;
        if (this.lastPose !== newPose) {
            // this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;

            const objName = this.el.id;
            publish(globals.outputTopic + objName, {
                object_id: objName,
                action: 'update',
                persist: false,
                type: 'object',
                data: {
                    source: globals.camName,
                    position: vec3ToObject(newPosition),
                    rotation: quatToObject(newRotation),
                },
            });
        }
    }),
});
