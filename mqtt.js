'use strict';

//const client = new Paho.MQTT.Client(mqttParam, 9001, "/mqtt", "myClientId" + timeID);
window.mqttClient = new Paho.MQTT.Client(globals.mqttParam, "myClientId" + globals.timeID);

// loads scene objects from specified persistence URL if specified,
// or globals.persistenceUrl if not
const loadArena = (urlToLoad, position, rotation) => {
    let xhr = new XMLHttpRequest();
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', globals.persistenceUrl);

    xhr.responseType = 'json';
    xhr.send();
    let deferredObjects = [];
    let Parents = {};
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
        } else {
            let arenaObjects = xhr.response;
            let l = arenaObjects.length;
            for (let i = 0; i < l; i++) {
                let obj = arenaObjects[i];
                if (obj.object_id === globals.camName) {
                    continue; // don't load our own camera/head assembly
                }
                if (obj.attributes.parent) {
                    deferredObjects.push(obj);
		    Parents[obj.attributes.parent] = obj.attributes.parent;
		}
                else {
                    let msg = {
                        object_id: obj.object_id,
                        action: 'create',
                        data: obj.attributes
                    };
                    if (position) {
                        msg.data.position.x = msg.data.position.x + position.x;
                        msg.data.position.y = msg.data.position.y + position.y;
                        msg.data.position.z = msg.data.position.z + position.z;
                    }
                    if (rotation) {
                        var r = new THREE.Quaternion(msg.data.rotation.x, msg.data.rotation.y, msg.data.rotation.z, msg.data.rotation.w);
                        var q = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
                        r.multiply(q);
                        msg.data.rotation.x = r.x;
                        msg.data.rotation.y = r.y;
                        msg.data.rotation.z = r.z;
                        msg.data.rotation.w = r.w;
                    }

                    onMessageArrived(undefined, msg);
                }
            }
            let l2 = deferredObjects.length;
            for (let i = 0; i < l2; i++) {
                let obj = deferredObjects[i];
                if (obj.attributes.parent === globals.camName) {
                    continue; // don't load our own camera/head assembly
                }
                let msg = {
                    object_id: obj.object_id,
                    action: 'create',
                    data: obj.attributes
                };
                //console.log("adding deferred object " + obj.object_id + " to parent " + obj.attributes.parent);
                onMessageArrived(undefined, msg);
            }
	    /*
	    var par;
	    var parEl;
	    // sneakery: re-apply location,rotation,scale to parents such that children inherit
	    for (par in Parents) {
		console.log("par: " + par);
		if (par === globals.camName) continue;
		if (par === 'myCamera') continue;
		parEl = globals.sceneObjects[par];
		if (parEl == undefined) continue;
                let msg = {
                    object_id: par,
                    action: 'update',
		    type: 'object',
                    data: {
			position: {
			    x: parEl.object3D.position.x,
			    y: parEl.object3D.position.y,
			    z: parEl.object3D.position.z
			},
			rotation: {
			    x: parEl.object3D.quaternion.x,
			    y: parEl.object3D.quaternion.y,
			    z: parEl.object3D.quaternion.z,
			    w: parEl.object3D.quaternion.w
			},
			scale: {
			    x: parEl.object3D.scale.x,
			    y: parEl.object3D.scale.y,
			    z: parEl.object3D.scale.z
			}
		    }
                };
		//console.log(msg);
                onMessageArrived(undefined, msg);
	    }
*/
        }
    };
};

// deletes scene objects from specified persistence URL if specified,
// or globals.persistenceUrl if not
const unloadArena = (urlToLoad) => {
    let xhr = new XMLHttpRequest();
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', globals.persistenceUrl);

    xhr.responseType = 'json';
    xhr.send();

    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
        } else {
            let arenaObjects = xhr.response;
            let l = arenaObjects.length;
            for (let i = 0; i < l; i++) {
                let obj = arenaObjects[i];
                if (obj.object_id === globals.camName) {
                    // don't load our own camera/head assembly
                } else {
                    let msg = {
                        object_id: obj.object_id,
                        action: 'delete',
                    };
                    onMessageArrived(undefined, msg);
                }
            }
        }
    };
};


mqttClient.onConnectionLost = onConnectionLost;
mqttClient.onMessageArrived = onMessageArrived;


// Last Will and Testament message sent to subscribers if this client loses connection
const lwt = new Paho.MQTT.Message(JSON.stringify({object_id: globals.camName, action: "delete"}));
lwt.destinationName = globals.outputTopic + globals.camName;
lwt.qos = 2;
lwt.retained = false;

// Request JWT before connection
let xhr = new XMLHttpRequest();
xhr.open('GET', "http://xr.andrew.cmu.edu:8888";
xhr.responseType = 'string';
xhr.send();
xhr.onload = () => {
    if (xhr.status !== 200) {
        alert(`Error loading token: ${xhr.status}: ${xhr.statusText}`);
    } else {
        var token = xhr.response;
        var user = "conix";
        mqttClient.connect({
            onSuccess: onConnect,
            willMessage: lwt,
            userName: user,
            password: token
        });
    }
};

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

    sceneObjects.groundPlane = document.getElementById('groundPlane'); // this is an <a-entity>

    sceneObjects.cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    sceneObjects.cameraSpinner = document.getElementById('CameraSpinner'); // this is an <a-entity>

    sceneObjects.weather = document.getElementById('weather');
    sceneObjects.scene = document.querySelector('a-scene');
    //sceneObjects.scene = document.getElementById('sceneRoot');
    sceneObjects.env = document.getElementById('env');
    sceneObjects.myCamera = document.getElementById('my-camera');
    sceneObjects[globals.camName] = sceneObjects.myCamera;
    sceneObjects.conix_box = document.getElementById('conix_box');
    sceneObjects.conix_box3 = document.getElementById('dots_sphere');
    sceneObjects.env_box = document.getElementById('env_box');
    sceneObjects.sound_box = document.getElementById('sound_box');
    sceneObjects.conix_text = document.getElementById('conix_text');

    var oldMsg = '';

    if (sceneObjects.env) {
        sceneObjects.env.setAttribute('environment', 'preset', globals.themeParam);
    }
    if (globals.weatherParam !== "none") {
        if (sceneObjects.weather) {
            sceneObjects.weather.setAttribute('particle-system', 'preset', globals.weatherParam);
            sceneObjects.weather.setAttribute('particle-system', 'enabled', 'true');
        }
    } else if (sceneObjects.weather) {
        sceneObjects.weather.setAttribute('particle-system', 'enabled', 'false');
    }

    // Publish initial camera presence
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    var thex = sceneObjects.myCamera.object3D.position.x;
    var they = sceneObjects.myCamera.object3D.position.y;
    var thez = sceneObjects.myCamera.object3D.position.z;
    let myMsg = {
        object_id: globals.camName,
        action: 'create',
        // persist: true,
        // ttl: 3000,
        data: {
            object_type: 'camera',
            position: {x: thex, y: they, z: thez},
            rotation: {x: 0, y: 0, z: 0, w: 0},
            color: color
        },
//	user_agent: navigator.userAgent
    };
    console.log(navigator.userAgent);

    publish(globals.outputTopic + globals.camName, myMsg);

    //console.log("my-camera element", sceneObjects.myCamera);
    console.log("my-camera name", globals.camName);
    sceneObjects.myCamera.setAttribute('position', globals.startCoords);

    sceneObjects.myCamera.addEventListener('vioChanged', e => {
        //console.log(e.detail);

        if (globals.fixedCamera !== '') {
            let msg = {
                object_id: globals.camName+"_local",
                action: 'create',
                type: 'object',
                data: {
                    object_type: 'camera',
                    position: {
                        x: parseFloat(e.detail.x.toFixed(3)),
                        y: parseFloat(e.detail.y.toFixed(3)),
                        z: parseFloat(e.detail.z.toFixed(3)),
                    },
                    rotation: {
                        x: parseFloat(e.detail._x.toFixed(3)),
                        y: parseFloat(e.detail._y.toFixed(3)),
                        z: parseFloat(e.detail._z.toFixed(3)),
                        w: parseFloat(e.detail._w.toFixed(3)),
                    },
                    color: color,
                }
            };
            publish(globals.vioTopic + globals.camName, msg); // extra timestamp info at end for debugging
        }
    });

    sceneObjects.myCamera.addEventListener('poseChanged', e => {
        //console.log(e.detail);

        let msg = {
            object_id: globals.camName,
            action: 'create',
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: parseFloat(e.detail.x.toFixed(3)),
                    y: parseFloat(e.detail.y.toFixed(3)),
                    z: parseFloat(e.detail.z.toFixed(3)),
                },
                rotation: {
                    x: parseFloat(e.detail._x.toFixed(3)),
                    y: parseFloat(e.detail._y.toFixed(3)),
                    z: parseFloat(e.detail._z.toFixed(3)),
                    w: parseFloat(e.detail._w.toFixed(3)),
                },
                color: color,
            }
        };

        //if (msg !== oldMsg) { // suppress duplicates
        if (true) { // Publish camera coordinates with great vigor
            publish(globals.outputTopic + globals.camName, msg); // extra timestamp info at end for debugging
            oldMsg = msg;
        }
    });

    if (sceneObjects.vive_leftHand) {
        sceneObjects.vive_leftHand.addEventListener('viveChanged', e => {
            //console.log(e.detail);

            let msg = {
                object_id: globals.viveLName,
                action: 'update',
                type: 'object',
                data: {
                    object_type: 'viveLeft',
                    position: {
                        x: parseFloat(e.detail.x.toFixed(3)),
                        y: parseFloat(e.detail.y.toFixed(3)),
                        z: parseFloat(e.detail.z.toFixed(3)),
                    },
                    rotation: {
                        x: parseFloat(e.detail._x.toFixed(3)),
                        y: parseFloat(e.detail._y.toFixed(3)),
                        z: parseFloat(e.detail._z.toFixed(3)),
                        w: parseFloat(e.detail._w.toFixed(3)),
                    },
                    color: color,
                }
            };

            // rate limiting is handled in vive-pose-listener
            publish(globals.outputTopic + globals.viveLName, msg);

        });
    }
    // realtime position tracking of right hand controller
    if (sceneObjects.vive_rightHand) {
        sceneObjects.vive_rightHand.addEventListener('viveChanged', e => {
            //console.log(e.detail);

            let msg = {
                object_id: globals.viveRName, // e.g. viveRight_9240_X or viveRight_eric_eric
                action: 'update',
                type: 'object',
                data: {
                    object_type: 'viveRight',
                    position: {
                        x: parseFloat(e.detail.x.toFixed(3)),
                        y: parseFloat(e.detail.y.toFixed(3)),
                        z: parseFloat(e.detail.z.toFixed(3)),
                    },
                    rotation: {
                        x: parseFloat(e.detail._x.toFixed(3)),
                        y: parseFloat(e.detail._y.toFixed(3)),
                        z: parseFloat(e.detail._z.toFixed(3)),
                        w: parseFloat(e.detail._w.toFixed(3)),
                    },
                    color: color,
                }
            };
            // e.g. realm/s/render/viveRight_9240_X or realm/s/render/viveRight_eric_eric
            publish(globals.outputTopic + globals.viveRName, msg);
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
    mqttClient.subscribe(globals.renderTopic);
}


function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log(responseObject.errorMessage);
    } // reconnect
    mqttClient.connect({onSuccess: onConnect});
}

const publish_retained = (dest, msg) => {
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    message.retained = true;
    // message.qos = 2;
    mqttClient.send(message);
};

window.publish = (dest, msg) => {
    if (typeof msg === 'object') {

        // add timestamp to all published messages
        var d = new Date();
        var n = d.toISOString();
        msg["timestamp"] = n;

        msg = JSON.stringify(msg);
    }
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    mqttClient.send(message);
};

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(str);
        console.log(e.message);
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
    }
    //console.log(theMessage);

    switch (theMessage.action) { // clientEvent, create, delete, update
        case "clientEvent": {
            const entityEl = sceneObjects[theMessage.object_id];
	    if (entityEl == undefined) {
		console.log("clientEvent without object ID: "+message.payloadString);
		return;
	    }

            let myPoint = '';
            if (theMessage.data.position)
                myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
                    parseFloat(theMessage.data.position.y),
                    parseFloat(theMessage.data.position.z));
            else
                console.log("Error: theMessage.data.position not defined", theMessage);
            const clicker = theMessage.data.source;
            switch (theMessage.type) {
                case "collision":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mousedown', {
                        "clicker": clicker, intersection:
                            {
                                point: myPoint
                            }
                    }, false);
                    break;
                case "mousedown":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mousedown', {
                        "clicker": clicker, intersection:
                            {
                                point: myPoint
                            }
                    }, false);
                    break;
                case "mouseup":
                    // emit a synthetic click event with ugly data syntax
		if (entityEl == undefined)
		    console.log("mysterious error, entityEl undefined on mouseup, msg: "+message.payloadString);
                    entityEl.emit('mouseup', {
                        "clicker": clicker, intersection:
                            {
                                point: myPoint
                            }
                    }, false);
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
                parentEl = sceneObjects[name].parentEl;
		if (parentEl) {
                    parentEl.removeChild(sceneObjects[name]);
                    delete sceneObjects[name];
		} else
		    console.log("Error: cannot remove child from missing parent " + name);
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
            /* why not? needed for HUD text, attachments to head 3d model
            if (theMessage.data.parent) {
                // Don't attach to our own camera
                if (theMessage.data.parent == globals.camName)
                    return;
            }
            */

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

            let entityEl;

            // Reduce, reuse, recycle!
            if (name in sceneObjects) {
                entityEl = sceneObjects[name];
                entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
                //console.log("existing object: ", name);
                //console.log(entityEl);
            } else { // CREATE NEW SCENE OBJECT
                entityEl = document.createElement('a-entity');

                // wacky idea: force render order
                entityEl.object3D.renderOrder = 1;

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
                    entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);

                    // Add it to our dictionary of scene objects
                    sceneObjects.scene.appendChild(entityEl);
                    sceneObjects[name] = entityEl;
                } else if (type === "camera") {
                    entityEl.setAttribute('id', name); // e.g. camera_1234_er1k
                    entityEl.setAttribute('rotation.order', "YXZ");
                    entityEl.object3D.position.set(0, 0, 0);
                    entityEl.object3D.rotation.set(0, 0, 0);

                    // this is the head 3d model
                    let headModelEl = document.createElement('a-entity');
                    headModelEl.setAttribute('id', "head-model_" + name);
                    headModelEl.setAttribute('rotation', '0 180 0');
                    headModelEl.object3D.scale.set(1, 1, 1);
                    headModelEl.setAttribute('dynamic-body', "type", "static");

                    headModelEl.setAttribute("gltf-model", "url(models/Head.gltf)");  // actually a face mesh

                    // place a colored text above the head
                    const headtext = document.createElement('a-text');
                    const personName = name.split('_')[2];

                    headtext.setAttribute('id', "headtext_" + name);
                    headtext.setAttribute('value', personName);
                    headtext.setAttribute('position', '0 0.2 0.05');
                    headtext.setAttribute('side', "double");
                    headtext.setAttribute('align', "center");
                    headtext.setAttribute('anchor', "center");
                    headtext.setAttribute('scale', '0.4 0.4 0.4');
                    headtext.setAttribute('rotation', '0 180 0');
                    headtext.setAttribute('color', color); // color
                    headtext.setAttribute('width', 5); // try setting last

                    entityEl.appendChild(headtext);
                    entityEl.appendChild(headModelEl);
                    sceneObjects["head-text_" + name] = headtext;
                    sceneObjects["head-model_" + name] = headModelEl;

                    sceneObjects.scene.appendChild(entityEl);
                    sceneObjects[name] = entityEl;

                    //console.log("their camera:", entityEl);
                } else {
                    entityEl.setAttribute('id', name);
                    entityEl.setAttribute('rotation.order', "YXZ");

                    // Parent/Child handling
                    if (theMessage.data.parent) {
                        var parentEl = sceneObjects[theMessage.data.parent];
                        if (parentEl) {
                            entityEl.flushToDOM();
                            parentEl.appendChild(entityEl);
                            // Add it to our dictionary of scene objects
                            sceneObjects[name] = entityEl;
                        } else {
                            console.log("orphaned; parent " + name + " cannot find " + theMessage.data.parent + " yet");
                        }
                    } else {
                        sceneObjects.scene.appendChild(entityEl);
                        // Add it to our dictionary of scene objects
                        sceneObjects[name] = entityEl;
                    }
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
                    entityEl.setAttribute('line', 'color', color);
                    break;

                case "thickline":
                    entityEl.setAttribute('meshline', theMessage.data);
                    entityEl.setAttribute('meshline', 'color', color);
                    delete theMessage.data.thickline;
                    break;

                case "particle":
                    entityEl.setAttribute('particle-system', theMessage.data);
                    break;

                case "gltf-model":
                    //entityEl.object3D.scale.set(xscale, yscale, zscale);
                    entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
                    entityEl.setAttribute("gltf-model", theMessage.data.url);
                    delete theMessage.data.url;
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
                    entityEl.object3D.scale.set(xscale, yscale, zscale);
                    break;

                default:
                // handle arbitrary A-Frame geometry primitive types
		// why type sometimes undefined??
                    entityEl.setAttribute('geometry', 'primitive', type);
                    entityEl.object3D.scale.set(xscale, yscale, zscale);
                    entityEl.setAttribute('material', 'color', color);
                    break;
            } // switch(type)

            if (type !== 'line' && type !== 'thickline') {
                // Common for all but lines: set position & rotation
                entityEl.object3D.position.set(x, y, z);
                entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);
            }

            // what remains are attributes for special cases; iteratively set them
            for (const [attribute, value] of Object.entries(theMessage.data)) {
                //console.log("setting attr", attribute);
                entityEl.setAttribute(attribute, value);
            }

            break;
        }
        case "update": {
            const name = theMessage.object_id;
            switch (theMessage.type) { // "object", "rig"
                case "rig": {
                    if (name === globals.camName) { // our camera Rig
                        console.log("moving our camera rig, sceneObject: " + name);

                        // "I do declare!"
                        var x, y, z, xrot, yrot, zrot, wrot;

                        if (theMessage.data.position) {
                            x = theMessage.data.position.x;
                            y = theMessage.data.position.y;
                            z = theMessage.data.position.z;
                        } else {
                            x = 0;
                            y = 0;
                            z = 0;
                        }
                        if (theMessage.data.rotation) {
                            xrot = theMessage.data.rotation.x;
                            yrot = theMessage.data.rotation.y;
                            zrot = theMessage.data.rotation.z;
                            wrot = theMessage.data.rotation.w;
                        } else {
                            xrot = 0;
                            yrot = 0;
                            zrot = 0;
                            wrot = 1;
                        }

                        sceneObjects.cameraRig.object3D.position.set(x, y, z);
                        sceneObjects.cameraSpinner.object3D.quaternion.set(xrot, yrot, zrot, wrot);
                        console.log(xrot, yrot, zrot, wrot);
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
                                entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w);
                            } else if (attribute === "position") {
                                entityEl.object3D.position.set(value.x, value.y, value.z);
                            } else {
                                //console.log("setting attribute: ", attribute);
                                entityEl.setAttribute(attribute, value);
                            }
                        }
                    } else {
                        console.log("Warning: " + theMessage.object_id + " not in sceneObjects");
                    }
                    break;
                }
                default:
                    console.log("EMPTY MESSAGE?", message.destinationName, message.payloadString);
                    break;
            } // switch (theMessage.type)
        } // case "update":
    } // switch (theMessage.action)
}
