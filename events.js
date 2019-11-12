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
    init: function () {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function (t, dt) {
        //	var newRotation = this.el.object3D.quaternion;
        //	var newPosition = this.el.object3D.position;
        const newPosition = new THREE.Vector3();
        const newRotation = new THREE.Quaternion();
        this.el.object3D.getWorldQuaternion(newRotation);
        this.el.object3D.getWorldPosition(newPosition);

        const rotationCoords = newRotation.x + ' ' + newRotation.y + ' ' + newRotation.z + ' ' + newRotation.w;
        const positionCoords = newPosition.x + ' ' + newPosition.y + ' ' + newPosition.z;

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('poseChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;
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
    const textEl = sceney.querySelector('#conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' + coordsToText(coordsData));
    console.log(myThis.id + ' was clicked at: ', coordsToText(coordsData), ' by', globals.camName);
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
    console.log(myThis.id + ' ' + eventName + ' at: ', coordsToText(coordsData), 'by', objName);

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
    return `${c.x},${c.y},${c.z}`;
}

function setClickData(evt) {
    return {
        x: evt.detail.intersection.point.x.toFixed(3),
        y: evt.detail.intersection.point.y.toFixed(3),
        z: evt.detail.intersection.point.z.toFixed(3)
    };
}


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function () {
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
                console.log(this.id + ' mousedown at: ', evt.detail.intersection.point, 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                if (evt.currentTarget.id.includes("Earth")) {
                    this.setAttribute('animation__2', "");
                    this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate");
                }
                const clicker = evt.detail.clicker;

                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mousedown" + '\n' + coordsToText(coordsData) + '\n' + clicker);
            }
        });

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

                console.log(this.id + ' mouseup at: ', evt.detail.intersection.point, 'by', globals.camName);
                // example of warping to a URL
                //if (this.id === "Box-obj")
                //    window.location.href = 'http://conix.io/';
            } else {

                // do the event handling for MQTT event; this is just an example
                //		this.setAttribute('animation__2', "startEvents: click; property: scale; dur: 10000; easing: linear; to: 10 10 10; direction: alternate-reverse");
                // this example pushes the object with 50 in the +Y direction
                // mosquitto_pub -t /topic/earth/gltf-model_Earth/animation__2 -m "property: scale; dur: 1000; from: 10 10 10; to: 5 5 5; easing: easeInOutCirc; loop: 5; dir: alternate"
                if (this.body) {
                    const foo = new THREE.Vector3(1, 50, 1);
                    const bod = new THREE.Vector3(1, 1, 1);
                    this.body.applyImpulse(foo, bod);
                }
                const clicker = evt.detail.clicker;
                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseup" + '\n' + coordsToText(coordsData) + '\n' + clicker);
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
                console.log(this.id + ' got mouseenter at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                const clicker = evt.detail.clicker;

                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseenter" + '\n' + coordsToText(coordsData) + '\n' + clicker);
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
                console.log(this.id + ' got mouseleave at: ', evt.currentTarget.object3D.position, 'by', globals.camName);
            } else {

                // do the event handling for MQTT event; this is just an example
                //this.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                const clicker = evt.detail.clicker;

                const sceney = this.sceneEl;
                const textEl = sceney.querySelector('#conix-text');
                textEl.setAttribute('value', this.id + " mouseleave" + '\n' + coordsToText(coordsData) + '\n' + clicker);
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
