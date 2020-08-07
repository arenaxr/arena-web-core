// events.js
//
// Components and realtime event handlers
// and globals
// and utilities

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

function getQueryParams(name, defaultValue) {
    var qs = location.search;

    var params = [];
    var tokens;
    var re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        if (decodeURIComponent(tokens[1]) == name)
            params.push(decodeURIComponent(tokens[2]));
    }

    if (params === []) return defaultValue
    else return params;
}

function getUrlParams(parameter, defaultValue) {
    let indexes = [];
    parameter = parameter + '=';
    if (window.location.href.indexOf(parameter) > -1) {
        let vars = getUrlVars();
        for (let i = 0; i < vars.length; i++) {
            if (vars[parameter] === parameter) {
                indexes.push(vars[i]);
            }
        }
    } else {
        indexes.push(defaultValue);
    }
    return indexes;
}

function debug(msg) {
    publish(globals.outputTopic, '{"object_id":"debug","message":"'+msg+'"}');
}

import('/x/face/script.js');

window.globals = {
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    updateMillis: getUrlParam('camUpdateRate', 100),
    renderParam: getUrlParam('scene', 'render'), //scene
    renderParams: getQueryParams('scene', 'render'), //scene
    userParam: getUrlParam('name', 'X'),
    startCoords: getUrlParam('location', '0,1.6,0').replace(/,/g, ' '),
    themeParam: getUrlParam('theme', 'starry'),
    weatherParam: getUrlParam('weather', 'none'),
    mqttParamZ: getUrlParam('mqttServer', 'oz.andrew.cmu.edu'),
    fixedCamera: getUrlParam('fixedCamera', ''),
    ATLASurl: getUrlParam('ATLASurl', '//atlas.conix.io'),
    vioTopic: "/topic/vio/",
    frameCount: 0,
    lastMouseTarget: undefined,
    inAR: false,
    isWebXRViewer: navigator.userAgent.includes('WebXRViewer'),
    onEnterXR: function (xrType) {
	//debug("ENTERING XR");

        if (xrType === 'ar') {

	    //debug("xrType is ar");

            this.isAR = true;
            if (this.isWebXRViewer) {

		//debug("isWebXRViewer = true");

                let base64script = document.createElement("script");
                base64script.onload = async () => {
                    await import('/apriltag/script.js');
                };
                base64script.src = '/apriltag/base64_binary.js';
                document.head.appendChild(base64script);

                document.addEventListener("mousedown", function (e) {

		    //debug("MOUSEDOWN");

                    if (window.globals.lastMouseTarget) {

			//debug("has target: "+window.globals.lastMouseTarget);

                        let el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        let elPos = new THREE.Vector3();
			el.object3D.getWorldPosition(elPos);
			//debug("worldPosition is:");
			//debug(elPos.x.toString()+","+elPos.x.toString()+","+elPos.x.toString());
                        let intersection = {x: elPos.x, y: elPos.y, z: elPos.z};
                        el.emit("mousedown", {
                            "clicker": window.globals.camName,
                            intersection: {point: intersection},
                            cursorEl: true
                        }, false);
                    } else {
			//debug("no lastMouseTarget");
		    }
                });
                document.addEventListener("mouseup", function (e) {
                    if (window.globals.lastMouseTarget) {
                        let el = window.globals.sceneObjects[window.globals.lastMouseTarget];
			let elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        let intersection = {x: elPos.x, y: elPos.y, z: elPos.z};
			//debug(elPos.x);
                        el.emit("mouseup", {
                            "clicker": window.globals.camName,
                            intersection: {point: intersection},
                            cursorEl: true
                        }, false);
                    }
                });
                let cursor = document.getElementById('mouseCursor');
                let cursorParent = cursor.parentNode;
                cursorParent.removeChild(cursor);
                cursor = document.createElement('a-cursor');
                cursor.setAttribute('fuse', false);
		// move reticle closer (side effect: bigger!)
		cursor.setAttribute('position', '0 0 -0.5');
		//cursor.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		cursor.setAttribute('animation__22', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
		//cursor.setAttribute('raycaster', 'showLine', 'true');
		//
                cursor.setAttribute('max-distance', '1000');
                cursor.setAttribute('id', 'fuse-cursor');
                cursorParent.appendChild(cursor);
            }
            document.getElementById('env').setAttribute('visible', false);
        }
    }
};

let urlLat = getUrlParam('lat');
let urlLong = getUrlParam('long');
if (urlLat && urlLong) {
    globals.clientCoords = {
        latitude: urlLat,
        longitude: urlLong
    };
} else {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            globals.clientCoords = position.coords;
        });
    }
}

globals.persistenceUrl = '//' + globals.mqttParamZ + '/persist/' + globals.renderParam;
globals.mqttParam = 'wss://' + globals.mqttParamZ + '/xmqtt';
globals.outputTopic = "realm/s/" + globals.renderParam + "/";
globals.renderTopic = globals.outputTopic + "#";
globals.camName = "";
globals.idTag = globals.timeID + "_" + globals.userParam; // e.g. 1234_eric

if (globals.fixedCamera !== '') {
    globals.camName = "camera_" + globals.fixedCamera + "_" + globals.fixedCamera;
    globals.idTag = globals.fixedCamera + "_" + globals.fixedCamera; // e.g. eric_eric
} else {
    globals.camName = "camera_" + globals.idTag;      // e.g. camera_1234_eric
}

globals.viveLName = "vive-leftHand_" + globals.idTag;  // e.g. viveLeft_9240_X
globals.viveRName = "vive-rightHand_" + globals.idTag; // e.g. viveRight_9240_X

globals.newRotation = new THREE.Quaternion();
globals.newPosition = new THREE.Vector3();
globals.vioRotation = new THREE.Quaternion();
globals.vioPosition = new THREE.Vector3();
globals.vioMatrix = new THREE.Matrix4();
var camParent = new THREE.Matrix4();
var cam = new THREE.Matrix4();
var cpi = new THREE.Matrix4();

globals.newViveLRotation = new THREE.Quaternion();
globals.newViveLPosition = new THREE.Vector3();
globals.vioViveLRotation = new THREE.Quaternion();
globals.vioViveLPosition = new THREE.Vector3();
var ViveLcamParent = new THREE.Matrix4();
var ViveLcam = new THREE.Matrix4();
var ViveLcpi = new THREE.Matrix4();

globals.newViveRRotation = new THREE.Quaternion();
globals.newViveRPosition = new THREE.Vector3();
globals.vioViveRRotation = new THREE.Quaternion();
globals.vioViveRPosition = new THREE.Vector3();
var ViveRcamParent = new THREE.Matrix4();
var ViveRcam = new THREE.Matrix4();
var ViveRcpi = new THREE.Matrix4();

AFRAME.registerComponent('pose-listener', {
    // if we want to make throttling settable at init time over mqtt,
    // create a Component variable here & use instead of globals.updateMillis
    init: function () {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function (t, dt) {
        globals.newRotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
        globals.newPosition.setFromMatrixPosition(this.el.object3D.matrixWorld);

        camParent = this.el.object3D.parent.matrixWorld;
        cam = this.el.object3D.matrixWorld;
        cpi.getInverse(camParent);
        cpi.multiply(cam);
        globals.vioMatrix.copy(cpi);
        globals.vioRotation.setFromRotationMatrix(cpi);
        globals.vioPosition.setFromMatrixPosition(cpi);
        //console.log(cpi);

        const rotationCoords = rotToText(globals.newRotation);
        const positionCoords = coordsToText(globals.newPosition);

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('poseChanged', Object.assign(globals.newPosition, globals.newRotation));
            this.el.emit('vioChanged', Object.assign(globals.vioPosition, globals.vioRotation));
            this.lastPose = newPose;

            // DEBUG
            //debugConixText(newPosition);
            //debugRaw(this.el.object3D.matrixAutoUpdate + '\n' + this.el.object3D.matrixWorldNeedsUpdate +
            //	    '\n' + THREE.Object3D.DefaultMatrixAutoUpdate);
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


AFRAME.registerComponent('pose-publisher', {
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
//            this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            //            this.lastPose = newPose;

            const objName = this.id;
            publish(globals.outputTopic + objName, {
                object_id: objName,
                action: "update",
                type: 'object',
                data: {
                    position: vec3ToObject(newPosition),
                    rotation: quatToObject(newRotation),
                }
            });
        }
    })
});


/*
AFRAME.registerComponent('vive-pose-listener', {
    init: function () {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function (t, dt) {
	globals.newViveRRotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
	globals.newViveRPosition.setFromMatrixPosition(this.el.object3D.matrixWorld);

	camParent = globals.sceneObjects.myCamera.object3D.parent.matrixWorld;
	cam = globals.sceneObjects.myCamera.object3D.matrixWorld;
	cpi.getInverse(ViveRcamParent);
	cpi.multiply(ViveRcam);
	globals.vioRotation.setFromRotationMatrix(cpi);
	globals.vioPosition.setFromMatrixPosition(cpi);
	//console.log(cpi);

	const rotationCoords = rotToText(globals.newViveRRotation);
	const positionCoords = coordsToText(globals.newViveRPosition);

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('poseChanged', Object.assign(globals.newViveRPosition, globals.newViveRRotation));
            this.el.emit('vioChanged', Object.assign(globals.vioViveRPosition, globals.vioViveRRotation));
            this.lastPose = newPose;

	    // DEBUG
	    //debugConixText(newPosition);
	    //debugRaw(this.el.object3D.matrixAutoUpdate + '\n' + this.el.object3D.matrixWorldNeedsUpdate +
	    //	    '\n' + THREE.Object3D.DefaultMatrixAutoUpdate);
        }
    })
});
*/

function updateConixBox(eventName, coordsData, myThis) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' + coordsToText(coordsData));
    console.log(myThis.id + ' was clicked at: ', coordsToText(coordsData), ' by', globals.camName);
}

function debugConixText(coordsData) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', 'pose: ' + coordsToText(coordsData));
    console.log('pose: ', coordsToText(coordsData));
}

function debugRaw(debugMsg) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', debugMsg);
    //console.log('debug: ', debugMsg);
}

function eventAction(evt, eventName, myThis) {
    const newPosition = myThis.object3D.position;
    //this.emit('viveChanged', Object.assign(newPosition, newRotation));
    //	    const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
    //const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);

    let coordsData = {
        x: parseFloat(newPosition.x.toFixed(3)),
        y: parseFloat(newPosition.y.toFixed(3)),
        z: parseFloat(newPosition.z.toFixed(3))
    };

    // publish to MQTT
    const objName = myThis.id + "_" + globals.idTag;
    publish(globals.outputTopic + objName, {
        object_id: objName,
        action: "clientEvent",
        type: eventName,
        data: {
            position: coordsData,
            source: globals.camName,
            clickPos: vec3ToObject(
                //globals.sceneObjects.myCamera.object3D.position
		new THREE.Vector3().setFromMatrixPosition(globals.sceneObjects.myCamera.object3D.matrixWorld)
            ),
        }
    });
    //console.log(myThis.id + ' ' + eventName + ' at: ', coordsToText(coordsData), 'by', objName);

    // DEBUG
    //updateConixBox(eventName, coordsData, myThis);
}

function setCoordsData(evt) {
    return {
        x: parseFloat(evt.currentTarget.object3D.position.x.toFixed(3)),
        y: parseFloat(evt.currentTarget.object3D.position.y.toFixed(3)),
        z: parseFloat(evt.currentTarget.object3D.position.z.toFixed(3))
    };
}

function vec3ToObject(vec) {
    return {
        x: parseFloat(vec.x.toFixed(3)),
        y: parseFloat(vec.y.toFixed(3)),
        z: parseFloat(vec.z.toFixed(3))
    };
}

function quatToObject(q) {
    return {
        x: parseFloat(q.x.toFixed(3)),
        y: parseFloat(q.y.toFixed(3)),
        z: parseFloat(q.z.toFixed(3)),
        w: parseFloat(q.w.toFixed(3))
    };
}

function coordsToText(c) {
    return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)}`;
}

function rotToText(c) {
    return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)} ${c.w.toFixed(3)}`;
}

function setClickData(evt) {
    //debug("in setClickData")
    if (evt.detail.intersection) {
	//debug("evt.detail.intersection");
	//debug(evt.detail.intersection.point.x.toFixed(3));
	//debug("nope");
        return {
            x: parseFloat(evt.detail.intersection.point.x.toFixed(3)),
            y: parseFloat(evt.detail.intersection.point.y.toFixed(3)),
            z: parseFloat(evt.detail.intersection.point.z.toFixed(3))
        }
    }
    else {
	//debug("empty coords data");
        console.log("WARN: empty coords data");
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }
}


AFRAME.registerComponent('impulse', {
    schema: {
        on: {default: ''}, // event to listen 'on'
        force: {
            type: 'vec3',
            default: {x: 1, y: 1, z: 1}
        },
        position: {
            type: 'vec3',
            default: {x: 1, y: 1, z: 1}
        }
    },

    multiple: true,

    init: function () {
        var self = this;
    },

    update: function (oldData) {
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
                        //console.log("element:", el, pos);
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

// load new URL if clicked
AFRAME.registerComponent('goto-url', {
    schema: {
        on: {default: 'mousedown'}, // event to listen 'on'
        url: {default: ''} // http:// style url
    },

    multiple: true,

    init: function () {
        var self = this;
    },

    update: function (oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el;     // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function (evt) {
                if (!evt.detail.clicker) { // local event, not from MQTT
                    console.log("goto-url url=" + data.url);
                    window.location.href = data.url;
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
});

// load new URL if clicked
AFRAME.registerComponent('prompt-box', {
    schema: {
        on: {default: ''}, // event to listen 'on'
        prompt: {default: ''} // http:// style url
    },

    multiple: true,

    init: function () {
        var self = this;
    },

    update: function (oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el;     // Reference to the component's entity.

        if (data.on) { // we have an event?
            console.log("adding prompt event listener");
            el.addEventListener(data.on, function (evt) {
                if (!evt.detail.clicker) { // local event, not from MQTT
                    console.log("called prompt listener");
                    var person = prompt(data.prompt, "");
                    var txt = "";
                    if (person == null || person == "") {
                        txt = "";
                    } else {
                        txt = person;
                    }
                    const coordsData = setCoordsData(evt);
                    const thisMsg = {
                        object_id: this.id,
                        action: "clientEvent",
                        type: "prompt-data",
                        data: {text: txt, source: this.id, position: coordsData}
                    };
                    publish(globals.outputTopic + this.id, thisMsg);

                    console.log("prompt-box data: " + txt);
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
});

// load scene from persistence db
AFRAME.registerComponent('load-scene', {
    schema: {
        on: {default: ''}, // event to listen 'on'
        url: {default: ''}, // http:// style url
        position: {
            type: 'vec3',
            default: {x: 0, y: 0, z: 0}
        },
        rotation: {
            type: 'vec4',
            default: {x: 0, y: 0, z: 0, w: 1}
        }
    },

    multiple: true,

    init: function () {
        var self = this;
    },

    update: function (oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el;     // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function (evt) {
                if ('cursorEl' in evt.detail) {
                    // internal click event, our scene only
                } else {
                    // MQTT click event that everyone gets
                    console.log("load-scene url=" + data.url);
                    if (!this.loaded) {
                        loadArena(data.url, data.position, data.rotation);
                        this.loaded = true;
                    } else {
                        unloadArena(data.url);
                        this.loaded = false;
                    }
                }
            })
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
});

// Component: listen for collisions, call defined function on event evt

AFRAME.registerComponent('collision-listener', {
    init: function () {
        //console.log("collision-listener Component init");
        this.el.addEventListener('collide', function (evt) {

            //const coordsData = setClickData(evt);
            const coordsData = {
                x: 0,
                y: 0,
                z: 0
            };
            // colliding object
            const collider = evt.detail.body.el.id;
            const collideee = this.id;

            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.id,
                action: "clientEvent",
                type: "collision",
                data: {position: coordsData, source: collider}
            };
            publish(globals.outputTopic + this.id, thisMsg);
            //publish(outputTopic+this.id+"/mousedown", coordsText+","+camName);
            //console.log(this.id + ' collision at: ', coordsToText(coordsData), 'by ', collider);
        });
    }
});


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
        //console.log("click-listener Component init");
        //console.log("mousedown init");
        this.el.addEventListener('mousedown', function (evt) {
	    //debug("click-listener got mousedown");
            const coordsData = setClickData(evt);
	    //debug("checking evt.detail");
            if ('cursorEl' in evt.detail) {
		//debug("cursorEl was in evt.detail; publishing to MQTT");
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mousedown",
                    data: {
                        position: coordsData,
                        source: globals.camName,
                        clickPos: vec3ToObject(
                            //globals.sceneObjects.myCamera.object3D.position
			    new THREE.Vector3().setFromMatrixPosition(globals.sceneObjects.myCamera.object3D.matrixWorld)
                        ),
                    }
                };
                publish(globals.outputTopic + this.id, thisMsg);
            } else {
		//debug("cursorEl NOT in evt.detail. Deal.");

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                if (evt.currentTarget.id.includes("Earth")) {
                    this.setAttribute('animation__2', "");
                    this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate");
                }
                const clicker = evt.detail.clicker;
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
                    data: {
                        position: coordsData,
                        source: globals.camName,
                        clickPos: vec3ToObject(
                            //globals.sceneObjects.myCamera.object3D.position
			    new THREE.Vector3().setFromMatrixPosition(globals.sceneObjects.myCamera.object3D.matrixWorld)
                        ),
                    }
                };
                publish(globals.outputTopic + this.id, thisMsg);

                //console.log(this.id + ' mouseup at: ', coordsToText(coordsData), 'by', globals.camName);
                // example of warping to a URL
                //if (this.id === "Box-obj")
                //    window.location.href = 'http://conix.io/';
            } else {
                // hard coded event handlers can go here, for example:
                //		this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 10000; easing: linear; to: 10 10 10; direction: alternate-reverse");
                // this example pushes the object with 50 in the +Y direction
            }
        });

        this.el.addEventListener('mouseenter', function (evt) {
            globals.lastMouseTarget = this.id;
            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseenter",
                    data: {
                        position: coordsData,
                        source: globals.camName,
                        clickPos: vec3ToObject(
                            //globals.sceneObjects.myCamera.object3D.position
			    new THREE.Vector3().setFromMatrixPosition(globals.sceneObjects.myCamera.object3D.matrixWorld)
                        ),
                    }
                };
                publish(globals.outputTopic + this.id, thisMsg);
                //console.log(this.id + ' got mouseenter at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {
                // hard coded event handling goes here, for example:
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
            }
        });

        this.el.addEventListener('mouseleave', function (evt) {
            globals.lastMouseTarget = undefined;
            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseleave",
                    data: {
                        position: coordsData,
                        source: globals.camName,
                        clickPos: vec3ToObject(
                            //globals.sceneObjects.myCamera.object3D.position
			    new THREE.Vector3().setFromMatrixPosition(globals.sceneObjects.myCamera.object3D.matrixWorld)
                        ),
                    }
                };
                publish(globals.outputTopic + this.id, thisMsg);
                //console.log(this.id + ' got mouseleave at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {
                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
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


AFRAME.registerComponent('click-toggle', {
    schema: {
        toggled: {type: 'boolean', default: false}
    },
    init: function () {
        var self = this;
        var el = this.el;
        var data = this.data;

        el.addEventListener('mousedown', function (evt) {
            var dummy = 1
            el.setAttribute('click-toggle', {'toggled': !data.toggled});
        });
    },
});

AFRAME.registerComponent('env', {
    schema: {
        theEnv: {type: 'int', default: 0},
        theTune: {type: 'int', default: 0}
    },
    init: function () {
        var self = this;
        var el = this.el;
        var data = this.data;
        var envs = ["none", "osiris", "default", "contact", "egypt", "checkerboard", "forest", "goaland", "yavapai", "goldmine", "threetowers", "poison", "arches", "tron", "japan", "dream", "volcano", "starry"]
        var tunes = ["358232_j_s_song.mp3", "376737_Skullbeatz___Bad_Cat_Maste.mp3", "Bliss.ogg", "Celestial.ogg", "Counterpoint.ogg", "Harmonics.ogg", "Latin.ogg", "Marimbach.ogg", "Miami_Slice_Solid_Gold.mp3", "Project_Utopia.ogg", "Soul.ogg", "Sparkle.ogg", "Supreme.ogg", "Tours-Enthusiast.mp3", "Ubuntu.ogg", "avatar2.ogg", "avatar4.ogg", "earth.mp3", "save_and_checkout.mp3", "wendy.mp3"]

        el.addEventListener('mousedown', function (evt) {
            //console.log(evt.detail.clicker)
            if (!evt.detail.clicker) { // mqtt event, not locally browser-generated
                var envIndex = data.theEnv + 1;
                if (envIndex == envs.length)
                    envIndex = 0;
                console.log("envIndex: ", envIndex, envs[envIndex]);

                var tuneIndex = data.theTune + 1;
                if (tuneIndex == tunes.length)
                    tuneIndex = 0;
                console.log("tuneIndex: ", tuneIndex, tunes[tuneIndex]);
                el.setAttribute('env', {'theEnv': envIndex});
                el.setAttribute('env', {'theTune': tuneIndex});

                globals.sceneObjects.env.setAttribute('environment', 'preset', envs[envIndex]);
                el.setAttribute('sound', {
                    "src": 'url(audio/' + tunes[tuneIndex] + ')',
                    "autoplay": true,
                    "positional": false
                });
            }
        });
    },
});

AFRAME.registerComponent('attr-wireframe', {
    dependencies: ['material'],
    schema: {
        toggled: {type: 'boolean', default: true}
    },
    init: function () {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        el.addEventListener('mousedown', function (evt) {

            if (!evt.detail.clicker) { // mqtt event not local browser generated
                if (object) {
                    object.traverse(function (node) {
                        if (node.isMesh)
                            node.material.wireframe = data.toggled;
                    });
                }

                el.setAttribute('wireframe', {'toggled': !data.toggled});
            }
        });
    },
});

AFRAME.registerComponent('points', {
    dependencies: ['material'],
    schema: {
        toggled: {type: 'boolean', default: true}
    },
    init: function () {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        el.addEventListener('mousedown', function (evt) {

            if (!evt.detail.clicker) { // mqtt event not local browser generated
                if (object) {

                    let geometry = object.geometry.clone()
                    let material = new THREE.PointsMaterial({color: 0xFFFFFF, size: 0.01})
                    let mesh = new THREE.Points(geometry, material)
                    el.setObject3D('points', mesh);
                    el.removeObject3D('mesh');

//		    object.traverse(function (node) {
//			if (node.isMesh)
//			    node.material.wireframe = data.toggled;
//		    });
                }

                el.setAttribute('points', {'toggled': !data.toggled});
            }
        });
    },
});

AFRAME.registerComponent('pointed', {
    dependencies: ['material'],
    init: function () {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        if (object) {

            let geometry = object.geometry.clone()
            let material = new THREE.PointsMaterial({color: 0xFFFFFF, size: 0.01})
            let mesh = new THREE.Points(geometry, material)
            el.setObject3D('pointed', mesh);
            el.removeObject3D('mesh');
        }
    },
});
