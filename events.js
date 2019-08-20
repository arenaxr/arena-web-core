
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

// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
	this.el.addEventListener('click', function (evt) {
	    
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+
		evt.detail.intersection.point.y.toFixed(3)+","+
		evt.detail.intersection.point.z.toFixed(3);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		publish(outputTopic+this.id+"/click", coordsText);
		console.log(this.id+' was clicked at: ', evt.detail.intersection.point);
		if (this.id === "Box-obj")
		    window.location.href = 'http://conix.io/';
	    } else {

		// do the event handling for MQTT event; this is just an example
		this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");

		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " clicked" + '\n' +coordsText );
	    }
	});
    }
});

