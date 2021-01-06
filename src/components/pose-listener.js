/* global AFRAME, ARENA */

let camParent = new THREE.Matrix4();
let cam = new THREE.Matrix4();
const cpi = new THREE.Matrix4();

/**
 * Tracking camera movement in real time. Emits camera pose change and vio change events.
 *
 */
AFRAME.registerComponent('pose-listener', {
    // if we want to make throttling settable at init time over mqtt,
    // create a Component variable here & use instead of ARENA.updateMillis
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.updateMillis, this);
        this.heartBeatCounter = 1;
    },

    tick: (function(t, dt) {
        ARENA.newRotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
        ARENA.newPosition.setFromMatrixPosition(this.el.object3D.matrixWorld);

        camParent = this.el.object3D.parent.matrixWorld;
        cam = this.el.object3D.matrixWorld;
        cpi.getInverse(camParent);
        cpi.multiply(cam);
        ARENA.vioMatrix.copy(cpi);
        ARENA.vioRotation.setFromRotationMatrix(cpi);
        ARENA.vioPosition.setFromMatrixPosition(cpi);
        // console.log(cpi);

        const rotationCoords = rotToText(ARENA.newRotation);
        const positionCoords = coordsToText(ARENA.newPosition);

        const newPose = rotationCoords + ' ' + positionCoords;

        // update position every 1 sec
        if (this.lastPose !== newPose || this.heartBeatCounter % (1000 / ARENA.updateMillis) == 0) {
            this.el.emit('poseChanged', Object.assign(ARENA.newPosition, ARENA.newRotation));
            this.el.emit('vioChanged', Object.assign(ARENA.vioPosition, ARENA.vioRotation));
            this.lastPose = newPose;

            // DEBUG
            // debugConixText(newPosition);
            // debugRaw(this.el.object3D.matrixAutoUpdate + '\n' + this.el.object3D.matrixWorldNeedsUpdate +
            //      '\n' + THREE.Object3D.DefaultMatrixAutoUpdate);
        }
        this.heartBeatCounter++;
    }),
});
