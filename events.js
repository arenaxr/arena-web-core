
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

// Component to change to a sequential color on click.
/*
AFRAME.registerComponent('cursor-listener', {
    init: function () {
	var lastIndex = -1;
	var COLORS = ['red', 'green', 'blue'];
	this.el.addEventListener('click', function (evt) {
	    lastIndex = (lastIndex + 1) % COLORS.length;
	    this.setAttribute('material', 'color', COLORS[lastIndex]);
	    console.log('I was clicked at: ', evt.detail.intersection.point);
	});
    }
});
*/
