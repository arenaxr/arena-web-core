'use strict';

//const client = new Paho.MQTT.Client(mqttParam, 9001, "/mqtt", "myClientId" + timeID);
const client = new Paho.MQTT.Client(globals.mqttParam, "myClientId" + globals.timeID);

const loadArena = () => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', globals.persistenceUrl );
    xhr.responseType = 'json';
    xhr.send();
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
        } else {
            let arenaObjects = xhr.response;
            let l = arenaObjects.length;
            for (let i = 0; i < l; i++) {
                if (arenaObjects[i].object_id === globals.camName) {
                    continue;
                }
                let msg = {
                    object_id: arenaObjects[i].object_id,
                    action: 'create',
                    data: arenaObjects[i].attributes
                };
                onMessageArrived(undefined, msg);
            }
        }
    };
};


client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;


// Last Will and Testament message sent to subscribers if this client loses connection
const lwt = new Paho.MQTT.Message(JSON.stringify({object_id: globals.camName, action: "delete"}));
lwt.destinationName = globals.outputTopic + globals.camName;
lwt.qos = 2;
lwt.retained = false;

client.connect({
    onSuccess: onConnect,
    willMessage: lwt
});

// Callback for client.connect()
function onConnect() {
    //console.log("onConnect");

    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event


    // make 'env' and 'box-obj' (from index.html) scene objects so they can be modified
    // Add them to our dictionary of scene objects
    let sceneObjects = globals.sceneObjects;

    sceneObjects.vive_leftHand = document.getElementById('vive-leftHand');
    sceneObjects.vive_rightHand = document.getElementById('vive-rightHand');

    sceneObjects.cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    sceneObjects.weather = document.getElementById('weather');
    sceneObjects.scene = document.querySelector('a-scene');
    sceneObjects.env = document.getElementById('env');
    sceneObjects.boxObj = document.getElementById('boxObj');
    sceneObjects.fallBox = document.getElementById('fallBox');
    sceneObjects.fallBox2 = document.getElementById('fallBox2');
    sceneObjects.myCamera = document.getElementById('my-camera');

    if (sceneObjects.env) {
        sceneObjects.env.setAttribute('environment', 'preset', globals.themeParam);
    }
    if (globals.weatherParam !== "none") {
        sceneObjects.weather.setAttribute('particle-system', 'preset', globals.weatherParam);
        sceneObjects.weather.setAttribute('particle-system', 'enabled', 'true');
    } else if (sceneObjects.weather) {
        sceneObjects.weather.setAttribute('particle-system', 'enabled', 'false');
    }

    // Publish initial camera presence
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    let myMsg = {
        object_id: globals.camName,
        action: 'create',
        persist: false,
        data: {
            object_type: 'camera',
            position: {x: 0, y: 1.6, z: 0},
            rotation: {x: 0, y: 0, z: 0, w: 0},
            color: color
        }
    };

    publish(globals.outputTopic + globals.camName, myMsg);
    console.log("my-camera element", sceneObjects.myCamera);
    console.log("my-camera name", globals.camName);

    sceneObjects.myCamera.addEventListener('poseChanged', e => {
        //console.log(e.detail);

        let msg = {
            object_id: globals.camName,
            action: 'create',
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: e.detail.x.toFixed(3),
                    y: e.detail.y.toFixed(3),
                    z: e.detail.z.toFixed(3),
                },
                rotation: {
                    x: e.detail._x.toFixed(3),
                    y: e.detail._y.toFixed(3),
                    z: e.detail._z.toFixed(3),
                    w: e.detail._w.toFixed(3),
                },
                color: color,
            }
        };

        // rig updates for VIO

        // suppress duplicates
        //if (msg !== oldMsg) {
        if (true) {
            //publish(outputTopic+camName, msg + "," + stamp / 1000); // extra timestamp info at end for debugging
            publish(globals.outputTopic + globals.camName, msg); // extra timestamp info at end for debugging
            // oldMsg = msg;
            // lastUpdate = stamp;
            //console.log("cam moved: ",outputTopic+camName, msg);

            if (globals.fixedCamera !== '') {

                const pos = sceneObjects.myCamera.object3D.position;
                const rot = sceneObjects.myCamera.object3D.quaternion;

                const vioMsg = {
                    object_id: globals.camName,
                    action: 'update',
                    type: 'object',
                    data: {
                        position: {
                            x: pos.x.toFixed(3),
                            y: pos.y.toFixed(3),
                            z: pos.z.toFixed(3),
                        },
                        rotation: {
                            x: rot.x.toFixed(3),
                            y: rot.y.toFixed(3),
                            z: rot.z.toFixed(3),
                            w: rot.w.toFixed(3),
                        },
                        color: color,
                    }
                };

                publish(globals.vioTopic + globals.camName, vioMsg);
            }
            //}
        }
    });

    if (sceneObjects.vive_leftHand) {
        sceneObjects.vive_leftHand.addEventListener('viveChanged', e => {
            //console.log(e.detail);
            const objName = "viveLeft_" + globals.idTag;

            let msg = {
                object_id: objName,
                action: 'update',
                type: 'object',
                data: {
                    object_type: 'viveLeft',
                    position: {
                        x: e.detail.x.toFixed(3),
                        y: e.detail.y.toFixed(3),
                        z: e.detail.z.toFixed(3),
                    },
                    rotation: {
                        x: e.detail._x.toFixed(3),
                        y: e.detail._y.toFixed(3),
                        z: e.detail._z.toFixed(3),
                        w: e.detail._w.toFixed(3),
                    },
                    color: color,
                }
            };

            // rate limiting is handled in vive-pose-listener
            publish(globals.outputTopic + objName, msg);

        });
    }
    // realtime position tracking of right hand controller
    if (sceneObjects.vive_rightHand) {
        sceneObjects.vive_rightHand.addEventListener('viveChanged', e => {
            //console.log(e.detail);
            const objName = "viveRight_" + globals.idTag;

            let msg = {
                object_id: objName,
                action: 'update',
                type: 'object',
                data: {
                    object_type: 'viveRight',
                    position: {
                        x: e.detail.x.toFixed(3),
                        y: e.detail.y.toFixed(3),
                        z: e.detail.z.toFixed(3),
                    },
                    rotation: {
                        x: e.detail._x.toFixed(3),
                        y: e.detail._y.toFixed(3),
                        z: e.detail._z.toFixed(3),
                        w: e.detail._w.toFixed(3),
                    },
                    color: color,
                }
            };
            publish(globals.outputTopic + objName, msg);
        });
    }
    // VERY IMPORTANT: remove retained camera topic so future visitors don't see it
    /*
    window.onbeforeunload = function () {
        publish(outputTopic + camName, {object_id: camName, action: "delete"});
        publish_retained(outputTopic + camName, ""); // no longer needed, don't retain head position
        publish(outputTopic + viveLName, {object_id: viveLName, action: "delete"});
        publish(outputTopic + viveRName, {object_id: viveRName, action: "delete"});
    };
    */
    loadArena();
    // ok NOW start listening for MQTT messages
    // * moved this out of loadArena() since it is conceptually a different thing
    client.subscribe(globals.renderTopic);
}


function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log(responseObject.errorMessage);
    } // reconnect
    client.connect({onSuccess: onConnect});
}

const publish_retained = (dest, msg) => {
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    message.retained = true;
    // message.qos = 2;
    client.send(message);
};

const publish = (dest, msg) => {
    if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
    }
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    client.send(message);
};

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function onMessageArrived(message, jsonMessage) {
    let sceneObjects = globals.sceneObjects;
    let theMessage = {};
    if (message) {
        //console.log(message.destinationName, message.payloadString);
        if (!isJson(message.payloadString)) {
            return;
        }
        theMessage = JSON.parse(message.payloadString);
    } else if (jsonMessage) {
        theMessage = jsonMessage;
	if (theMessage.data.object_type == "camera") // cull deadheads: ignore camera messages from DB
	    return;
    }
    //console.log(theMessage.object_id);

    switch (theMessage.action) { // clientEvent, create, delete, update
        case "clientEvent": {
            const entityEl = sceneObjects[theMessage.object_id];
            const myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
                parseFloat(theMessage.data.position.y),
                parseFloat(theMessage.data.position.z));
            const clicker = theMessage.data.source;
            switch (theMessage.type) {
                case "mousedown":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mousedown', {
                        "clicker": clicker, intersection:
                            {
                                point: myPoint
                            }
                    }, true);
                    break;
                case "mouseup":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mouseup', {
                        "clicker": clicker, intersection:
                            {
                                point: myPoint
                            }
                    }, true);
                    break;
                default: // handle others here like mouseenter / mouseleave
                    break; // never gets here haha
            }
            break;
        }
        case "delete": {
            // An empty message after an object_id means remove it
            const name = theMessage.object_id;
            //console.log(message.payloadString, topic, name);

            if (sceneObjects[name]) {
                sceneObjects.scene.removeChild(sceneObjects[name]);
                delete sceneObjects[name];
                return;
            } else {
                console.log("Warning: " + name + " not in sceneObjects");
            }
            break;
        }
        case "create": {
            const name = theMessage.object_id;
	    delete theMessage.object_id;

            if (name === globals.camName) {
                return;
            }

            let x, y, z, xrot, yrot, zrot, wrot, xscale, yscale, zscale, color;
	    // Strategy: remove JSON for core attributes (position, rotation, color, scale) after parsing
	    // what remains are attribute-value pairs that can be set iteratively
            if (theMessage.data.position) {
                x = theMessage.data.position.x;
                y = theMessage.data.position.y;
                z = theMessage.data.position.z;
		delete theMessage.data.position;
            } else { // useful defaults if unspecified
                x = 0;
                y = 0;
                z = 0;
            }

            if (theMessage.data.rotation) {
                xrot = theMessage.data.rotation.x;
                yrot = theMessage.data.rotation.y;
                zrot = theMessage.data.rotation.z;
                wrot = theMessage.data.rotation.w;
		delete theMessage.data.rotation;
            } else { // useful defaults
                xrot = 0;
                yrot = 0;
                zrot = 0;
                wrot = 1;
            }

            if (theMessage.data.scale) {
                xscale = theMessage.data.scale.x;
                yscale = theMessage.data.scale.y;
                zscale = theMessage.data.scale.z;
		delete theMessage.data.scale;
            } else { // useful defaults
                xscale = 1;
                yscale = 1;
                zscale = 1;
            }

            if (theMessage.data.color) {
                color = theMessage.data.color;
		delete theMessage.data.color;
            } else {
                color = "white";
            }

            let type = theMessage.data.object_type;
	    delete theMessage.data.object_type;
            if (type === "cube") {
                type = "box";
            }
            // different name in Unity
            if (type === "quad") {
                type = "plane";
            }
            // also different

            const quat = new THREE.Quaternion(xrot, yrot, zrot, wrot);
            const euler = new THREE.Euler();
            const foo = euler.setFromQuaternion(quat.normalize(), "YXZ");
            const vec = foo.toVector3();
            let entityEl;

            // Reduce, reuse, recycle!
            if (name in sceneObjects) {
                entityEl = sceneObjects[name];
                entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
                //console.log("existing object: ", name);
                //console.log(entityEl);
            } else { // CREATE NEW SCENE OBJECT
                entityEl = document.createElement('a-entity');
                if (type === "viveLeft" || type === "viveRight") {
                    // create vive controller for 'other persons controller'
                    entityEl.setAttribute('id', name);
                    entityEl.setAttribute('rotation.order', "YXZ");
                    //entityEl.setAttribute('obj-model', "obj: #viveControl-obj; mtl: #viveControl-mtl");
                    if (type === "viveLeft") {
                        entityEl.setAttribute("gltf-model", "url(models/valve_index_left.gltf)");
                    } else {
                        entityEl.setAttribute("gltf-model", "url(models/valve_index_right.gltf)");
                    }

                    entityEl.object3D.position.set(x, y, z);
                    entityEl.object3D.rotation.set(xrot, yrot, zrot);

                    // Add it to our dictionary of scene objects
                    sceneObjects.scene.appendChild(entityEl);
                    sceneObjects[name] = entityEl;
                } else if (type === "camera") {
                    entityEl.setAttribute('id', name + "_rigChild");
                    entityEl.setAttribute('rotation.order', "YXZ");
                    entityEl.object3D.position.set(0, 0, 0);
                    entityEl.object3D.rotation.set(0, 0, 0);

                    let rigEl;
                    rigEl = document.createElement('a-entity');
                    rigEl.setAttribute('id', name);
                    rigEl.setAttribute('rotation.order', "YXZ");
                    rigEl.object3D.position.set(x, y, z);
                    rigEl.object3D.rotation.set(xrot, yrot, zrot);

                    // this is the head 3d model
                    let childEl = document.createElement('a-entity');
                    childEl.setAttribute('rotation', 0 + ' ' + 180 + ' ' + 0);
                    childEl.object3D.scale.set(4, 4, 4);
                    childEl.setAttribute("gltf-model", "url(models/Head.gltf)");  // actually a face mesh

                    // place a colored text above the head
                    const headtext = document.createElement('a-text');
                    const personName = name.split('_')[2];

                    headtext.setAttribute('value', personName);
                    headtext.setAttribute('position', 0 + ' ' + 0.6 + ' ' + 0.25);
                    headtext.setAttribute('side', "double");
                    headtext.setAttribute('align', "center");
                    headtext.setAttribute('anchor', "center");
                    headtext.setAttribute('scale', 0.8 + ' ' + 0.8 + ' ' + 0.8);
                    headtext.setAttribute('color', color); // color
                    headtext.setAttribute('width', 5); // try setting last
                    entityEl.appendChild(headtext);
                    entityEl.appendChild(childEl);

                    rigEl.appendChild(entityEl);

                    sceneObjects.scene.appendChild(rigEl);
                    sceneObjects[name] = rigEl;

                    entityEl = rigEl;

                    console.log("their camera:", rigEl);
                } else {
                    entityEl.setAttribute('id', name);
                    entityEl.setAttribute('rotation.order', "YXZ");
                    sceneObjects.scene.appendChild(entityEl);
                    // Add it to our dictionary of scene objects
                    sceneObjects[name] = entityEl;
                }
            }

            switch (type) {
            case "light":
                entityEl.setAttribute('light', 'type', 'ambient');
                // does this work for light a-entities ?
                entityEl.setAttribute('light', 'color', color);
                break;

            case "camera":
                //console.log("Camera update", entityEl);
                //console.log(entityEl.getAttribute('position'));
                break;

            case "viveLeft":
                break;
            case "viveRight":
                break;

            case "image": // use special 'url' data slot for bitmap URL (like gltf-models do)
                entityEl.setAttribute('geometry', 'primitive', 'plane');
                entityEl.setAttribute('material', 'src', theMessage.data.url);
                entityEl.setAttribute('material', 'shader', 'flat');
                entityEl.object3D.scale.set(xscale, yscale, zscale);
                break;

            case "line":
                entityEl.setAttribute('line', theMessage.data);
                break;

            case "thickline":
                entityEl.setAttribute('meshline', theMessage.data);
		delete theMessage.data.thickline;
                break;

            case "particle":
                entityEl.setAttribute('particle-system', theMessage.data);
                break;

            case "gltf-model":
                //entityEl.object3D.scale.set(xscale, yscale, zscale);
                entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
                entityEl.setAttribute("gltf-model", theMessage.data.url);
                break;

            case "text":
                // set a bunch of defaults
                entityEl.setAttribute('text', 'width', 5); // the default for <a-text>
                entityEl.setAttribute('text', 'value', theMessage.data.text);
		delete theMessage.data.text;
                entityEl.setAttribute('text', 'color', color);
                entityEl.setAttribute('text', 'side', "double");
                entityEl.setAttribute('text', 'align', "center");
                entityEl.setAttribute('text', 'anchor', "center");
                break;

            default:
                // handle arbitrary A-Frame geometry primitive types
                entityEl.setAttribute('geometry', 'primitive', type);
                entityEl.object3D.scale.set(xscale, yscale, zscale);
                entityEl.setAttribute('material', 'color', color);
                break;
            } // switch(type)

            if (type !== 'line' && type !== 'thickline') {
                // Common for all but lines: set position & rotation
                entityEl.object3D.position.set(x, y, z);
                entityEl.object3D.rotation.set(vec.x, vec.y, vec.z);
            }

	    // what remains are attributes for special cases; iteratively set them
            for (const [attribute, value] of Object.entries(theMessage.data)) {
		console.log("setting attr", attribute);
                entityEl.setAttribute(attribute, value);
	    }

            break;
        }
        case "update": {
            const name = theMessage.object_id;
            switch (theMessage.type) { // "object", "setParent", "setChild"
                case "rig": {
                    if (name === globals.camName) { // our camera Rig
                        console.log("moving our camera rig, sceneObject: " + name);

                        let x = theMessage.data.position.x;
                        let y = theMessage.data.position.y;
                        let z = theMessage.data.position.z;
                        let xrot = theMessage.data.rotation.x;
                        let yrot = theMessage.data.rotation.y;
                        let zrot = theMessage.data.rotation.z;
                        let wrot = theMessage.data.rotation.w;

                        let quat = new THREE.Quaternion(xrot, yrot, zrot, wrot);
                        let euler = new THREE.Euler();
                        let foo = euler.setFromQuaternion(quat.normalize(), "YXZ");
                        let vec = foo.toVector3();

                        sceneObjects.cameraRig.object3D.position.set(x, y, z);
                        sceneObjects.cameraRig.object3D.rotation.set(vec.x, vec.y, vec.z);
                        //	    cameraRig.rotation.order = "YXZ"; // John this doesn't work here :(
                    }
                    break;
                }
                case "object": {
                    // our own camera/controllers: bail, this message is meant for all other viewers
                    if (name === globals.camName) {
                        return;
                    }
                    if (name === globals.viveLName) {
                        return;
                    }
                    if (name === globals.viveRName) {
                        return;
                    }
                    // just setAttribute() - data can contain multiple attribute-value pairs
                    // e.g: { ... "action": "update", "data": { "animation": { "property": "rotation", "to": "0 360 0", "loop": "true", "dur": 10000}}}' ... }

                    let entityEl = sceneObjects[theMessage.object_id];
                    if (entityEl) {
                        for (const [attribute, value] of Object.entries(theMessage.data)) {
                            if (attribute === "rotation") {

                                let quat = new THREE.Quaternion(value.x, value.y, value.z, value.w);
                                let euler = new THREE.Euler();
                                let foo = euler.setFromQuaternion(quat.normalize(), "YXZ");
                                let vec = foo.toVector3();
                                entityEl.object3D.rotation.set(vec.x, vec.y, vec.z);

				// this SHOULD work entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w);
                            } else if (attribute === "position") {
                                entityEl.object3D.position.set(value.x, value.y, value.z);
                            } else {
				console.log("setting attribute: ", attribute);
                                entityEl.setAttribute(attribute, value);
                            }
                        }
                    } else {
                        console.log("Warning: " + theMessage.object_id + " not in sceneObjects");
                    }
                    break;
                }
                case "setChild": {// parent/child relationship e.g. /topic/render/parent_id/child -m "child_id"

                    const parentEl = sceneObjects[theMessage.object_id];
                    const childName = theMessage.data.child;
                    const childEl = sceneObjects[theMessage.data.child];

                    // error checks
                    if (!parentEl) {
                        console.log("Warning: " + parentEl + " not in sceneObjects");
                        return;
                    }
                    if (!childEl) {
                        console.log("Warning: " + childEl + " not in sceneObjects");
                        return;
                    }

                    console.log("parent", parentEl);
                    console.log("child", childEl);

                    childEl.flushToDOM();
                    const copy = childEl.cloneNode(true);
                    copy.setAttribute("name", "copy");
                    copy.flushToDOM();
                    parentEl.appendChild(copy);
                    sceneObjects[childName] = copy;
                    // remove from scene
                    childEl.parentNode.removeChild(childEl);

                    console.log("parent", parentEl);
                    console.log("child", childEl);
                    break;
                }
                case "setParent": {// parent/child relationship e.g. /topic/render/child_id/parent -m "parent_id"

                    const childEl = sceneObjects[theMessage.object_id]; // scene object_id
                    const parentEl = sceneObjects[theMessage.data.parent];
                    const childName = theMessage.object_id;

                    // error checks
                    if (!parentEl) {
                        console.log("Warning: " + parentEl + " not in sceneObjects");
                        return;
                    }
                    if (!childEl) {
                        console.log("Warning: " + childEl + " not in sceneObjects");
                        return;
                    }

                    console.log("parent", parentEl);
                    console.log("child", childEl);

                    childEl.flushToDOM();
                    const copy = childEl.cloneNode(true);
                    copy.setAttribute("name", "copy");
                    copy.flushToDOM();
                    parentEl.appendChild(copy);
                    sceneObjects[childName] = copy;
                    childEl.parentNode.removeChild(childEl);

                    console.log("parent", parentEl);
                    console.log("child", childEl);
                    break; // case "setParent"
                }
                default:
                console.log("EMPTY MESSAGE?", message.destinationName, message.payloadString);
                break;
            } // switch (theMessage.type)
        } // case "update":
    } // switch (theMessage.action)
}
