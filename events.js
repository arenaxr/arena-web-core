
AFRAME.registerComponent('pose-listener', {
    tick() {
    	const newRotation = this.el.object3D.quaternion;
	const newPosition = this.el.getAttribute('position');

	const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
	const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
	if (this.lastRotation !== rotationCoords ||
	    this.lastPosition !== positionCoords) {
	    this.el.emit('poseChanged', Object.assign(newPosition, newRotation));
	    this.lastRotation = rotationCoords;
	    this.lastPosition = positionCoords;
	}

    },
});
