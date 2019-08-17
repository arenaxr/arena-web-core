
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

AFRAME.registerComponent('click-listener', {
    init: function () {
	this.el.addEventListener('click', function (evt) {
	    
	    this.setAttribute('animation', "property: rotation; from: 0 360 0; to: 0 360 0; easing: linear; dur: 2000;");
	    publish(outputTopic+this.id+"/click", evt.detail.intersection.point.x.toFixed(3)+","+
		    evt.detail.intersection.point.y.toFixed(3)+","+
		    evt.detail.intersection.point.z.toFixed(3));
	    console.log(this.id+' was clicked at: ', evt.detail.intersection.point);
	});
    }
});

