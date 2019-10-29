
AFRAME.registerComponent('pose-listener', {
    init: function () {
	// Set up the tick throttling.
	this.tick = AFRAME.utils.throttleTick(this.tick, updateMillis, this); // ugly hack: updateMillis is a global in mqtt.js
    },

    tick: (function(t, dt) {
	//	var newRotation = this.el.object3D.quaternion;
	//	var newPosition = this.el.object3D.position;
	var newPosition = new THREE.Vector3();
	var newRotation = new THREE.Quaternion(); 
	this.el.object3D.getWorldQuaternion(newRotation);
	this.el.object3D.getWorldPosition(newPosition);
    	
	const rotationCoords = newRotation.x + ' ' + newRotation.y + ' ' + newRotation.z + ' ' + newRotation.w;
	const positionCoords = newPosition.x + ' ' + newPosition.y + ' ' + newPosition.z;
	
	var newPose = rotationCoords+" "+positionCoords;
	if (this.lastPose !== newPose) {
	    this.el.emit('poseChanged', Object.assign(newPosition, newRotation));
	    this.lastPose = newPose;
	}
    })
});

AFRAME.registerComponent('vive-pose-listener', {
    init: function () {
	// Set up the tick throttling.
	this.tick = AFRAME.utils.throttleTick(this.tick, updateMillis, this); // ugly hack: updateMillis is a global in mqtt.js
    },

    tick: (function(t, dt) {
	var newRotation = this.el.object3D.quaternion;
	var newPosition = this.el.object3D.position;
    	
	const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
	const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);
	
	var newPose = rotationCoords+" "+positionCoords;
	if (this.lastPose !== newPose) {
	    this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
	    this.lastPose = newPose;
	}
    })
});

// gets camName as a global from mqtt.js - Javascript lets you :-/
function updateConixBox(eventName, coordsText, myThis) {
    var sceney = myThis.sceneEl;
    var textEl = sceney.querySelector('#conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' +coordsText);
    console.log(myThis.id+' was clicked at: ', coordsText, ' by', camName);
}

function eventAction(evt, eventName, myThis) {
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

function setCoordsText(evt) {
    var str = '"x": '+parseFloat(evt.currentTarget.object3D.position.x).toFixed(3)+
	',"y": '+parseFloat(evt.currentTarget.object3D.position.y).toFixed(3)+
	',"z": '+parseFloat(evt.currentTarget.object3D.position.z).toFixed(3);    
    
    return str;
}

function setClickText(evt) {
    var str = '"x": '+ evt.detail.intersection.point.x.toFixed(3)+
	',"y": '+evt.detail.intersection.point.y.toFixed(3)+
	',"z": '+evt.detail.intersection.point.z.toFixed(3);
    
    return str;
}


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
	this.el.addEventListener('mousedown', function (evt) {

	    var coordsText = setClickText(evt);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		// SO HACKY: camName is in global space in mqtt.js - it is "my camera name" = my userID
		publish(outputTopic+this.id, '{"object_id": "'+this.id+'", "action": "clientEvent", "type": "mousedown", "data": {"position": {'+coordsText+'}, "source": "'+camName+'"}}');
		//publish(outputTopic+this.id+"/mousedown", coordsText+","+camName);
		console.log(this.id+' mousedown at: ', evt.detail.intersection.point, 'by', camName);
	    } else {

		// do the event handling for MQTT event; this is just an example
		//this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		if (evt.currentTarget.id.includes("Earth")) {
		    this.setAttribute('animation__2', "");
		    this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate");
		}
		var clicker = evt.detail.clicker;

		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mousedown" + '\n' +coordsText+'\n'+clicker );
	    }
	});
	
	this.el.addEventListener('mouseup', function (evt) {

	    var coordsText = setClickText(evt);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		//publish(outputTopic+this.id+"/mouseup", coordsText+","+camName);
		publish(outputTopic+this.id, '{"object_id": "'+this.id+'", "action": "clientEvent", "type": "mouseup", "data": {"position": {'+coordsText+'}, "source": "'+camName+'"}}');
		console.log(this.id+' mouseup at: ', evt.detail.intersection.point, 'by', camName);
		// example of warping to a URL
		//if (this.id === "Box-obj")
		//    window.location.href = 'http://conix.io/';
	    } else {

		// do the event handling for MQTT event; this is just an example
		//		this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 10000; easing: linear; to: 10 10 10; direction: alternate-reverse");
		// this example pushes the object with 50 in the +Y direction
		// mosquitto_pub -t /topic/earth/gltf-model_Earth/animation__2 -m "property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate"
		if (this.body) {
		    foo = new THREE.Vector3(1,50,1);
		    bod = new THREE.Vector3(1,1,1);
		    this.body.applyImpulse(foo,bod);
		}
		var clicker = evt.detail.clicker;
		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mouseup" + '\n' +coordsText+'\n'+clicker );
	    }
	});

	this.el.addEventListener('mouseenter', function (evt) {

	    var coordsText = setCoordsText(evt);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		// SO HACKY: camName is in global space in mqtt.js - it is "my camera name" = my userID
		publish(outputTopic+this.id, '{"object_id": "'+this.id+'", "action": "clientEvent", "type": "mouseenter", "data": {"position": {'+coordsText+'}, "source": "'+camName+'"}}');
		console.log(this.id+' got mouseenter at: ', evt.currentTarget.object3D.position, 'by', camName);
	    } else {

		// do the event handling for MQTT event; this is just an example
		//this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		var clicker = evt.detail.clicker;

		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mouseenter" + '\n' +coordsText+'\n'+clicker );
	    }
	});

	this.el.addEventListener('mouseleave', function (evt) {
	    
	    var coordsText = setCoordsText(evt);
	    
	    if ('cursorEl' in evt.detail) {
		// original click event; simply publish to MQTT
		// SO HACKY: camName is in global space in mqtt.js - it is "my camera name" = my userID
		publish(outputTopic+this.id, '{"object_id": "'+this.id+'", "action": "clientEvent", "type": "mouseleave", "data": {"position": {'+coordsText+'}, "source": "'+camName+'"}}');
		//publish(outputTopic+this.id+"/mouseleave", coordsText+","+camName);
		console.log(this.id+' got mouseleave at: ', evt.currentTarget.object3D.position, 'by', camName);
	    } else {

		// do the event handling for MQTT event; this is just an example
		//this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		var clicker = evt.detail.clicker;

		var sceney = this.sceneEl;
		var textEl = sceney.querySelector('#conix-text');
		textEl.setAttribute('value', this.id + " mouseleave" + '\n' +coordsText+'\n'+clicker );
	    }
	});
    }
});


AFRAME.registerComponent('vive-listener', {
    init: function () {
	
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
    }
});
