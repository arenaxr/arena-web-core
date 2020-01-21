'use strict';


function getUrlVars() {
    const vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function getUrlParam(parameter, defaultValue) {
    let urlParameter = defaultValue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlParameter = getUrlVars()[parameter];
    }
    if (urlParameter === "") {
        return defaultValue;
    }
    return urlParameter;
}

let globals = {
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    updateMillis: 100,
    renderParam: getUrlParam('scene', 'render'), //scene
    userParam: getUrlParam('name', 'X'),
    themeParam: getUrlParam('theme', 'starry'),
    weatherParam: getUrlParam('weather', 'none'),
    mqttParamZ: getUrlParam('mqttServer', 'oz.andrew.cmu.edu'),
    fixedCamera: getUrlParam('fixedCamera', ''),
    vioTopic: "/topic/vio/",
};

globals.persistenceUrl = '//' + globals.mqttParamZ + '/' + globals.renderParam;
globals.mqttParam = 'wss://' + globals.mqttParamZ + '/mqtt';
globals.outputTopic = "realm/s/" + globals.renderParam + "/";
globals.renderTopic = globals.outputTopic + "#";
globals.camName = "";
globals.idTag = globals.timeID + "_" + globals.userParam; // e.g. 1234_eric

if (globals.fixedCamera !== '') {
    globals.camName = "camera_" + globals.fixedCamera + "_" + globals.fixedCamera;
} else {
    globals.camName = "camera_" + globals.idTag;      // e.g. camera_1234_eric
}

globals.viveLName = "viveLeft_" + globals.idTag;  // e.g. viveLeft_9240_X
globals.viveRName = "viveRight_" + globals.idTag; // e.g. viveRight_9240_X


AFRAME.registerComponent('pose-listener', {
    // if we want to make throttling settable at init time over mqtt,
    // create a Component variable here & use instead of globals.updateMillis
    init: function () {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

/* DEBUG shows frame counter basically
    tock: function () {
        if (!this.incrementingVector )
	    this.incrementingVector = new THREE.Vector3();
	else {
            this.incrementingVector.x = this.incrementingVector.x + 0.001
            this.incrementingVector.y = this.incrementingVector.y + 0.001
            this.incrementingVector.z = this.incrementingVector.z + 0.001
	}
	    
	debugConixText(this.incrementingVector);
    },
*/

    tick: (function (t, dt) {
        var newRotation = this.el.object3D.quaternion;
        var newPosition = this.el.object3D.position;
	var cameraRig = this.el.parentNode.parentNode; // this gets the CameraWrapper's parent, the CameraRig
	
	// This technique does not work in AR mode on A-Frame 1.0.x
        //const testPosition = new THREE.Vector3();
        //const testRotation = new THREE.Quaternion();
        //this.el.object3D.getWorldQuaternion(testRotation);
        //this.el.object3D.getWorldPosition(testPosition);

	newRotation.multiply(cameraRig.object3D.quaternion);
	newPosition.add(cameraRig.object3D.position);

        const rotationCoords = newRotation.x + ' ' + newRotation.y + ' ' + newRotation.z + ' ' + newRotation.w;
        const positionCoords = newPosition.x + ' ' + newPosition.y + ' ' + newPosition.z;

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('poseChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;

	    // DEBUG
	    debugConixText(newPosition);
	    //debugRaw(Coords);
        }
    })
});

AFRAME.registerComponent('vive-pose-listener', {
    init: function () {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function (t, dt) {
        const newRotation = this.el.object3D.quaternion;
        const newPosition = this.el.object3D.position;

        const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;
        }
    })
});

function updateConixBox(eventName, coordsData, myThis) {
    const sceney = myThis.sceneEl;
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' + coordsToText(coordsData));
    console.log(myThis.id + ' was clicked at: ', coordsToText(coordsData), ' by', globals.camName);
}

function debugConixText(coordsData) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', 'pose: '+ coordsToText(coordsData));
    console.log('pose: ', coordsToText(coordsData));
}
function debugRaw(debugMsg) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', debugMsg);
    console.log('debug: ', debugMsg);
}

function eventAction(evt, eventName, myThis) {
    const newPosition = myThis.object3D.position;
    //this.emit('viveChanged', Object.assign(newPosition, newRotation));
    //	    const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
    //const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);

    let coordsData = {
        x: newPosition.x.toFixed(3),
        y: newPosition.y.toFixed(3),
        z: newPosition.z.toFixed(3)
    };

    // publish to MQTT
    const objName = myThis.id + "_" + globals.idTag;
    publish(globals.outputTopic + objName, {
        object_id: objName,
        action: "clientEvent",
        type: eventName,
        data: {position: coordsData, source: globals.camName}
    });
    //console.log(myThis.id + ' ' + eventName + ' at: ', coordsToText(coordsData), 'by', objName);

    updateConixBox(eventName, coordsData, myThis);
}

function setCoordsData(evt) {
    return {
        x: parseFloat(evt.currentTarget.object3D.position.x).toFixed(3),
        y: parseFloat(evt.currentTarget.object3D.position.y).toFixed(3),
        z: parseFloat(evt.currentTarget.object3D.position.z).toFixed(3)
    };
}

function coordsToText(c) {
    return `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`;
}

function setClickData(evt) {
    if (evt.detail.intersection)
	return {
            x: evt.detail.intersection.point.x.toFixed(3),
            y: evt.detail.intersection.point.y.toFixed(3),
            z: evt.detail.intersection.point.z.toFixed(3)
	}
    else {
	console.log("WARN: empty coords data");
	return {
	    x: 0,
	    y: 0,
	    z:0
	}
    }
}


AFRAME.registerComponent('impulse', {
    schema: {
	on: {default: ''}, // event to listen 'on'
	force: {
	    type: 'vec3',
	    default: { x: 1, y: 1, z: 1 }
	},
	position: {
	    type: 'vec3',
	    default: { x: 1, y: 1, z: 1 }
	}
    },
    
    multiple: true,

    init: function () {
	var self = this;
    },

    update: function(oldData) {
	// this in fact only gets called when the component that it is - gets updated
	// unlike the update method in Unity that gets called every frame
	var data = this.data; // Component property values.
	var el = this.el;     // Reference to the component's entity.

	if (data.on) { // we have an event?
	    el.addEventListener(data.on, function (args) {

		if (args.detail.clicker) { // our synthetic event from MQTT
                    if (el.body) { // has physics = dynamic-body Component
			// e.g. <a-entity impulse="on: mouseup; force: 1 50 1; position: 1 1 1" ...>
			const force = new THREE.Vector3(data.force.x, data.force.y, data.force.z);
			const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
			el.body.applyImpulse(force, pos);
                    }
		}

	    });
	} else {
	    // `event` not specified, just log the message.
	    console.log(data);
	}
    },
    
    pause: function () {
	//this.removeEventListeners()
    },
    play: function () {
	//this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function () {
	var data = this.data;
	var el = this.el;

	// remove event listener
	if (data.event) {
	    el.removeEventListener(data.event, this.eventHandlerFn);
	}
    }
})


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
	//console.log("click-listener Component init");
	//console.log("mousedown init");
        this.el.addEventListener('mousedown', function (evt) {

            const coordsData = setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mousedown",
                    data: {position: coordsData, source: globals.camName}
                };
                publish(globals.outputTopic + this.id, thisMsg);
                //publish(outputTopic+this.id+"/mousedown", coordsText+","+camName);
                console.log(this.id + ' mousedown at: ', coordsToText(coordsData), 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                if (evt.currentTarget.id.includes("Earth")) {
                    this.setAttribute('animation__2', "");
                    this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate");
                }
                const clicker = evt.detail.clicker;

		/* Debug Conix Box
                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mousedown" + '\n' + coordsToText(coordsData) + '\n' + clicker);
		*/
            }
        });

	//console.log("mouseup init");
        this.el.addEventListener('mouseup', function (evt) {

            const coordsData = setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                //publish(outputTopic+this.id+"/mouseup", coordsText+","+camName);
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseup",
                    data: {position: coordsData, source: globals.camName}
                };
                publish(globals.outputTopic + this.id, thisMsg);

                console.log(this.id + ' mouseup at: ', coordsToText(coordsData), 'by', globals.camName);
                // example of warping to a URL
                //if (this.id === "Box-obj")
                //    window.location.href = 'http://conix.io/';
            } else {

                // do the event handling for MQTT event; this is just an example
                //		this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 10000; easing: linear; to: 10 10 10; direction: alternate-reverse");
                // this example pushes the object with 50 in the +Y direction
                // mosquitto_pub -t /topic/earth/gltf-model_Earth/animation__2 -m "property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate"

		/*
                    if (this.body) { // has physics
			const foo = new THREE.Vector3(this.impulse.from); // 1 50 1
			const bod = new THREE.Vector3(this.impulse.to);   // 1 1 1
			this.body.applyImpulse(foo, bod);
                    }
		*/

		/* DEBUG Conix box text
                const clicker = evt.detail.clicker;
                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseup" + '\n' + coordsToText(coordsData) + '\n' + clicker);
		*/
            }
        });

        this.el.addEventListener('mouseenter', function (evt) {

            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseenter",
                    data: {position: coordsData, source: globals.camName}
                };
                publish(globals.outputTopic + this.id, thisMsg);
                //console.log(this.id + ' got mouseenter at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");

		/* Debug Conix box text
                const clicker = evt.detail.clicker;

                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseenter" + '\n' + coordsToText(coordsData) + '\n' + clicker);
		*/
            }
        });

        this.el.addEventListener('mouseleave', function (evt) {

            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseleave",
                    data: {position: coordsData, source: globals.camName}
                };
                publish(globals.outputTopic + this.id, thisMsg);
                //console.log(this.id + ' got mouseleave at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");

		/* DEBUG Conix box text
                const clicker = evt.detail.clicker;

                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseleave" + '\n' + coordsToText(coordsData) + '\n' + clicker);
		*/
            }
        });
    }
});


AFRAME.registerComponent('vive-listener', {
    init: function () {

        this.el.addEventListener('triggerup', function (evt) {
            eventAction(evt, 'triggerup', this);
        });
        this.el.addEventListener('triggerdown', function (evt) {
            eventAction(evt, 'triggerdown', this);
        });
        this.el.addEventListener('gripup', function (evt) {
            eventAction(evt, 'gripup', this);
        });
        this.el.addEventListener('gripdown', function (evt) {
            eventAction(evt, 'gripdown', this);
        });
        this.el.addEventListener('menuup', function (evt) {
            eventAction(evt, 'menuup', this);
        });
        this.el.addEventListener('menudown', function (evt) {
            eventAction(evt, 'menudown', this);
        });
        this.el.addEventListener('systemup', function (evt) {
            eventAction(evt, 'systemup', this);
        });
        this.el.addEventListener('systemdown', function (evt) {
            eventAction(evt, 'systemdown', this);
        });
        this.el.addEventListener('trackpadup', function (evt) {
            eventAction(evt, 'trackpadup', this);
        });
        this.el.addEventListener('trackpaddown', function (evt) {
            eventAction(evt, 'trackpaddown', this);
        });
    }
});
