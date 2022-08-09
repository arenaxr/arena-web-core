/* global AFRAME */

AFRAME.registerGeometry('capsule', {
    schema: {
        height : {default: 2, min: 0},
        radius : {default: 1, min: 0},
        segmentsHeight : {default: 18, min: 1},
        segmentsRadial : {default: 36, min: 8},
        capsSegments : {default: 8, min: 2},
        thetaStart : {default: 0, min: 0},
        thetaLength : {default: 360, min: 0},
},

init: function(data) {
    this.geometry = new THREE.CapsuleBufferGeometry(
        data.radius,
        data.radius,
        data.height,
        data.segmentsRadial,
        data.segmentsHeight,
        data.capsSegments,
        data.capsSegments,
        data.thetaStart * (Math.PI / 180),
        data.thetaLength * (Math.PI / 180)
    );
},

});
