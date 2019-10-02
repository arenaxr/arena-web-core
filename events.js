
AFRAME.registerComponent('pose-listener', {
    tick() {

	var newRotation = this.el.object3D.quaternion;
	var newPosition = this.el.object3D.position;
    	
	const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
	const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
	
	var newPose = rotationCoords+" "+positionCoords;
	if (this.lastPose !== newPose) {
	    this.el.emit('poseChanged', Object.assign(newPosition, newRotation));
	    this.lastPose = newPose;
	}

    },
});

AFRAME.registerComponent('vive-pose-listener', {
    tick() {

	var newRotation = this.el.object3D.quaternion;
	var newPosition = this.el.object3D.position;
    	
	const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
	const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
	
	var newPose = rotationCoords+" "+positionCoords;
	if (this.lastPose !== newPose) {
	    this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
	    this.lastPose = newPose;
	}

    },
});

// gets camName as a global from mqtt.js - Javascript lets you :-/
function updateConixBox(eventName, coordsText, myThis) {
    var sceney = myThis.sceneEl;
    var textEl = sceney.querySelector('#conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' +coordsText);
    console.log(myThis.id+' was clicked at: ', coordsText, ' by', camName);
}

function eventAction(evt, eventName, myThis) {
    //	    var newRotation = this.el.object3D.quaternion;
    var newPosition = myThis.object3D.position;
    //this.emit('viveChanged', Object.assign(newPosition, newRotation));
    //	    const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
    //const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
    
    var coordsText = newPosition.x.toFixed(3)+","+
	newPosition.y.toFixed(3)+","+
	newPosition.z.toFixed(3);

    // publish to MQTT
    var objName=myThis.id+"_"+idTag;
    publish(outputTopic+objName+"/"+eventName, coordsText+","+objName);
    console.log(myThis.id+' '+eventName+' at: ', coordsText, 'by', objName);

    updateConixBox(eventName, coordsText, myThis);
}


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
	this.el.addEventListener('mousedown', function (evt) {
	    
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+
		evt.detail.intersection.point.y.toFixed(3)+","+
		evt.detail.intersection.point.z.toFixed(3);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		// SO HACKY: camName is in global space in mqtt.js - it is "my camera name" = my userID
		publish(outputTopic+this.id+"/mousedown", coordsText+","+camName);
		console.log(this.id+' was clicked at: ', evt.detail.intersection.point, 'by', camName);
	    } else {

		// do the event handling for MQTT event; this is just an example
		//this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		var clicker = evt.detail.clicker;

		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mousedown" + '\n' +coordsText+'\n'+clicker );
	    }
	});
	
	this.el.addEventListener('mouseup', function (evt) {
	    
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+
		evt.detail.intersection.point.y.toFixed(3)+","+
		evt.detail.intersection.point.z.toFixed(3);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		publish(outputTopic+this.id+"/mouseup", coordsText+","+camName);
		console.log(this.id+' was clicked at: ', evt.detail.intersection.point, 'by', camName);
		// example of warping to a URL
		//if (this.id === "Box-obj")
		//    window.location.href = 'http://conix.io/';
	    } else {

		// do the event handling for MQTT event; this is just an example
		//		this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 10000; easing: linear; to: 10 10 10; direction: alternate-reverse");
		// this example pushes the object with 50 in the +Y direction
		foo = new THREE.Vector3(1,50,1);
		bod = new THREE.Vector3(1,1,1);
		this.body.applyImpulse(foo,bod);

		var clicker = evt.detail.clicker;
		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mouseup" + '\n' +coordsText+'\n'+clicker );
	    }
	});
    }
});


AFRAME.registerComponent('vive-listener', {
    init: function () {
	
	// Trigger up/down

	this.el.addEventListener('triggerup', function(evt) {
	    eventAction(evt, 'triggerup', this)});
	this.el.addEventListener('triggerdown', function(evt) {
	    eventAction(evt, 'triggerdown', this)});
	this.el.addEventListener('gripup', function(evt) {
	    eventAction(evt, 'gripup', this)});
	this.el.addEventListener('gripdown', function(evt) {
	    eventAction(evt, 'gripdown', this)});
	this.el.addEventListener('menuup', function(evt) {
	    eventAction(evt, 'menuup', this)});
	this.el.addEventListener('menudown', function(evt) {
	    eventAction(evt, 'menudown', this)});
	this.el.addEventListener('systemup', function(evt) {
	    eventAction(evt, 'systemup', this)});
	this.el.addEventListener('systemdown', function(evt) {
	    eventAction(evt, 'systemdown', this)});
	this.el.addEventListener('trackpadup', function(evt) {
	    eventAction(evt, 'trackpadup', this)});
	this.el.addEventListener('trackpaddown', function(evt) {
	    eventAction(evt, 'trackpaddown', this)});

/*	
	this.el.addEventListener('triggerup', function(evt) {
function (evt)} {
	    
	    //	    var newRotation = this.el.object3D.quaternion;
	    var newPosition = this.object3D.position;
	    //this.emit('viveChanged', Object.assign(newPosition, newRotation));
	    //	    const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
	    //const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
	    
	    var coordsText = newPosition.x.toFixed(3)+","+
		newPosition.y.toFixed(3)+","+
		newPosition.z.toFixed(3);

	    // original click event; simply publish to MQTT
	    var objName=this.id+"_"+idTag;
	    publish(outputTopic+objName+"/triggerup", coordsText+","+objName);
	    console.log(this.id+' triggerup at: ', coordsText, 'by', objName);

	    updateConixBox(this, "triggerup", coordsText);
	});
*/

	// BUNCHES OF EVENTS for vive-controls
/*
	// Grip up/down
	this.el.addEventListener('gripup', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/gripup", coordsText+","+camName);
	    }
	});
	this.el.addEventListener('gripdown', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/gripdown", coordsText+","+camName);
	    }
	});

	// Menu up/down
	this.el.addEventListener('menuup', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/menuup", coordsText+","+camName);
	    }
	});
	this.el.addEventListener('menudown', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/menudown", coordsText+","+camName);
	    }
	});

	// System up/down
	this.el.addEventListener('systemup', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/systemup", coordsText+","+camName);
	    }
	});
	this.el.addEventListener('systemdown', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/systemdown", coordsText+","+camName);
	    }
	});

	// trackpad up/down
	this.el.addEventListener('trackpadup', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/trackpadup", coordsText+","+camName);
	    }
	});
	this.el.addEventListener('trackpaddown', function (evt) {
	    var coordsText = evt.detail.intersection.point.x.toFixed(3)+","+evt.detail.intersection.point.y.toFixed(3)+","+evt.detail.intersection.point.z.toFixed(3);
	    
	    console.log(this.id+' event at: ', evt.detail.intersection.point);
	    if ('cursorEl' in evt.detail) { // was clicked locally in browser
		publish(outputTopic+this.id+"/trackpaddown", coordsText+","+camName);
	    }
	});
*/
    }
});


