'use strict';

//const client = new Paho.MQTT.Client(mqttParam, 9001, "/mqtt", "myClientId" + timeID);
window.mqttClient = new Paho.MQTT.Client(globals.mqttParam, "myClientId" + globals.timeID);

var ICON_BTN_CLASS = 'arena-icon-button';

function createIconButton(img, onClick) {
    var iconButton;
    var wrapper;

    // Create elements.
    wrapper = document.createElement('div');
    iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('../jitsi/images/icons/${img}.png')`;
    iconButton.className = ICON_BTN_CLASS;

    // Insert elements.
    wrapper.appendChild(iconButton);
    iconButton.addEventListener('click', function (evt) {
        onClick();
        evt.stopPropagation();
    });

    return wrapper;
}

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
                // program ? TODO: check object type instead
                if (obj.attributes.filename) {
                    let pobj = {
                        "object_id": obj.object_id,
                        "action": "create",
                        "type": "program",
                        "data": obj.attributes
                    }

                    window.pendingModules.push(pobj);
                    continue;
                }                
                if (obj.object_id === globals.camName) {
                    continue; // don't load our own camera/head assembly
                }
                if (obj.attributes.parent) {
                    deferredObjects.push(obj);
                    Parents[obj.attributes.parent] = obj.attributes.parent;
                } else {
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
                console.log("adding deferred object " + obj.object_id + " to parent " + obj.attributes.parent);
                onMessageArrived(undefined, msg);
            }
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

function onAuthenticationComplete(u,t) {
    globals.username = u;
    globals.mqttToken = t;
    mqttConnect();
}

function mqttConnect() {
    // TODO: remove token logging, or at least log token contents?
    console.log("mqtt auth", "user:", globals.username, "token:", globals.mqttToken);

    // Last Will and Testament message sent to subscribers if this client loses connection
    let lwt = new Paho.MQTT.Message(JSON.stringify({ object_id: globals.camName, action: "delete" }));
    lwt.destinationName = globals.outputTopic + globals.camName;
    lwt.qos = 2;
    lwt.retained = false;

    mqttClient.connect({
        onSuccess: onConnect,
        willMessage: lwt,
        userName: globals.username,
        password: globals.mqttToken
    });
}

var oldMsg = '';

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

    setupCornerVideo();

    // video window for jitsi
    const videoPlane = document.createElement('a-video');
    videoPlane.setAttribute('id', "arena-vid-plane");
    videoPlane.setAttribute('width', globals.localvidboxWidth/1000);
    videoPlane.setAttribute('height', globals.localvidboxHeight/1000);
    videoPlane.setAttribute('src', "#localvidbox");
    videoPlane.setAttribute("click-listener", "");
    videoPlane.setAttribute("material", "shader", "flat");
    videoPlane.setAttribute("transparent", "true");
    videoPlane.setAttribute('position', '-0.585, 0.287, -0.5');
    globals.sceneObjects.myCamera.appendChild(videoPlane);
    globals.sceneObjects["arena-vid-plane"] = videoPlane;

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
            position: {
                x: thex,
                y: they,
                z: thez
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
                w: 0
            },
            color: color
        },
        //  user_agent: navigator.userAgent
    };
    console.log(navigator.userAgent);

    publish(globals.outputTopic + globals.camName, myMsg);

    //console.log("my-camera element", sceneObjects.myCamera);
    console.log("my-camera name", globals.camName);
    sceneObjects.myCamera.setAttribute('position', globals.startCoords);

    sceneObjects.myCamera.addEventListener('vioChanged', e => {
        //        console.log("vioChanged", e.detail);

        if (globals.fixedCamera !== '') {
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
            publish(globals.vioTopic + globals.camName, msg); // extra timestamp info at end for debugging
        }
    });

    sceneObjects.myCamera.addEventListener('poseChanged', e => {
        // console.log("poseChanged", e.detail);

        let msg = {
            object_id: globals.camName,
            jitsiId: globals.jitsiId,
            hasVideo: globals.hasVideo,
            // hasAudio: globals.hasAudio,
            // activeSpeaker: globals.activeSpeaker,
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

        //if (true) { // Publish camera coordinates with great vigor
        if (msg !== oldMsg) { // suppress duplicates
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
	
    setupIcons();
}

function setupIcons() {
    var settingsBtn = createIconButton("roundedsettings", () => {
        settingsBtn.not_toggled = !settingsBtn.not_toggled;
        if (!settingsBtn.not_toggled) {
            settingsBtn.childNodes[0].style.backgroundImage = "url('../jitsi/images/icons/roundedsettings.png')";
            signIn();
        } else {
            settingsBtn.childNodes[0].style.backgroundImage = "url('../jitsi/images/icons/slashroundedsettings.png')";
            signOut();
        }
    });

    var iconsDiv = document.getElementById('iconsDiv');
    iconsDiv.appendChild(settingsBtn);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log(responseObject.errorMessage);
    } // reconnect
    // TODO: mqttConnect();
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
    if (!window.mqttClient.isConnected()) return;

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

function drawVideoCube(entityEl, slot) {
    var theslot = "#box" + (slot).toString();
    //console.log("theslot: " + theslot);

    // attach video to head
    const videoCube = document.createElement('a-box');
    videoCube.setAttribute('id', "videoCube" + theslot);
    videoCube.setAttribute('position', '0 0 0');
    videoCube.setAttribute('scale', '0.8 0.6 0.8');
    videoCube.setAttribute('material', 'shader', 'flat');
    //    videoCube.setAttribute('multisrc', "src4:"+theslot); // horrible bug crashes ARENA - why?!
    videoCube.setAttribute('src', theslot); // video only (!audio)

    const videoCube2 = document.createElement('a-box');
    videoCube2.setAttribute('id', "videoCube2" + theslot);
    videoCube2.setAttribute('position', '0 0 0.01');
    videoCube2.setAttribute('scale', '0.81 0.61 0.8');
    videoCube2.setAttribute('material', 'shader', 'flat');
    videoCube2.setAttribute("transparent", "true");
    videoCube2.setAttribute('color', 'black');
    videoCube2.setAttribute("opacity", "0.8");

    entityEl.appendChild(videoCube);
    entityEl.appendChild(videoCube2);
}

function highlightVideoCube(entityEl, oldEl, slot) {
    // var theslot = "#wallbox"+(slot).toString();
    // console.log("highlightVideoCube: " + theslot);
    // var wallBox = document.querySelector(theslot);

    // var videoCube = document.querySelector("#videoWallHighlightBox");
    // if (!videoCube) {
    //  videoCube = document.createElement('a-box');
    //  videoCube.setAttribute('scale', '1 0.8 0.05');
    //     videoCube.setAttribute('color', "green");
    //  videoCube.setAttribute('id', "videoWallHighlightBox");
    //     videoCube.setAttribute('material', 'shader', 'flat');
    //     globals.sceneObjects.scene.appendChild(videoCube);
    // }

    // var thex = wallBox.object3D.position.x;
    // var they = wallBox.object3D.position.y;
    // var thez = wallBox.object3D.position.z;
    // videoCube.object3D.position.set(thex, they, thez - 0.03);

    // entityEl is the head
    var videoHat = document.querySelector("#videoHatHighlightBox");
    if (!videoHat) {
        videoHat = document.createElement('a-box');
        videoHat.setAttribute('scale', '0.8 0.05 0.8');
        videoHat.setAttribute('color', "green");
        videoHat.setAttribute('position', '0 0.325 0');
        videoHat.setAttribute('material', 'shader', 'flat');
        videoHat.setAttribute('id', "videoHatHighlightBox");
        // globals.sceneObjects.scene.appendChild(videoCube);
    }
    // remove old
    if (oldEl) {
        var parentEl = videoHat.parentEl;
        if (parentEl) {
            parentEl.removeChild(videoHat);
        }
    }
    // add new
    entityEl.appendChild(videoHat);
}

// set up local corner video window
function setupCornerVideo() {
    const localvidbox = document.getElementById("localvidbox");
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    })
    .then(stream => {
        const videoSettings = stream.getVideoTracks()[0].getSettings();
        if (localvidbox) {
            localvidbox.srcObject = stream;
            localvidbox.play();
        }
    })
    .catch(function(err) {
        console.log("ERROR: " + err);
    });

    if (localvidbox) {
        localvidbox.setAttribute("width", globals.localvidboxWidth);
        localvidbox.setAttribute("height", globals.localvidboxHeight);
    }
}

// slightly modified from:
// https://github.com/mozilla/hubs/blob/0c26af207bbbc3983409cdab7210b219b53449ca/src/systems/audio-system.js
async function enableChromeAEC(gainNode) {
    /**
    *  workaround for: https://bugs.chromium.org/p/chromium/issues/detail?id=687574
    *  1. grab the GainNode from the scene's THREE.AudioListener
    *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out), this prevents hearing the audio twice.
    *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
    *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
    *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
    *  6. connect the other RTCPeerConnection's stream to a new audio element.
    *  All audio is now routed through Chrome's audio mixer, thus enabling AEC, while preserving all the audio processing that was performed via the WebAudio API.
    */

    const audioEl = new Audio();
    audioEl.setAttribute("autoplay", "autoplay");
    audioEl.setAttribute("playsinline", "playsinline");

    const context = THREE.AudioContext.getContext();
    const loopbackDestination = context.createMediaStreamDestination();
    const outboundPeerConnection = new RTCPeerConnection();
    const inboundPeerConnection = new RTCPeerConnection();

    const onError = e => {
        console.error("RTCPeerConnection loopback initialization error", e);
    };

    outboundPeerConnection.addEventListener("icecandidate", e => {
        inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener("icecandidate", e => {
        outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener("track", e => {
        audioEl.srcObject = e.streams[0];
    });

    gainNode.disconnect();
    gainNode.connect(context.destination);

    loopbackDestination.stream.getTracks().forEach(track => {
        outboundPeerConnection.addTrack(track, loopbackDestination.stream);
    });

    const offer = await outboundPeerConnection.createOffer().catch(onError);
    outboundPeerConnection.setLocalDescription(offer).catch(onError);
    await inboundPeerConnection.setRemoteDescription(offer).catch(onError);

    const answer = await inboundPeerConnection.createAnswer();
    inboundPeerConnection.setLocalDescription(answer).catch(onError);
    outboundPeerConnection.setRemoteDescription(answer).catch(onError);
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
    //    console.log(theMessage.object_id);

    switch (theMessage.action) { // clientEvent, create, delete, update
        case "clientEvent": {
            const entityEl = sceneObjects[theMessage.object_id];
            let myPoint = '';
            if (theMessage.data.position)
                myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
                    parseFloat(theMessage.data.position.y),
                    parseFloat(theMessage.data.position.z));
            else
                console.log("Error: theMessage.data.position not defined", theMessage);
            const clicker = theMessage.data.source;

            if (entityEl == undefined) {
                console.log(message.payloadString);
                return;
            }

            switch (theMessage.type) {
                case "collision":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mousedown', {
                        "clicker": clicker,
                        intersection: {
                            point: myPoint
                        }
                    }, false);
                    break;
                case "mousedown":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mousedown', {
                        "clicker": clicker,
                        intersection: {
                            point: myPoint
                        }
                    }, false);
                    break;
                case "mouseup":
                    // emit a synthetic click event with ugly data syntax
                    entityEl.emit('mouseup', {
                        "clicker": clicker,
                        intersection: {
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
                parentEl.removeChild(sceneObjects[name]);
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

                    headModelEl.setAttribute("gltf-model", "url(models/Head.gltf)"); // actually a face mesh

                    // place a colored text above the head
                    const headtext = document.createElement('a-text');
                    const personName = name.split('_')[2];

                    headtext.setAttribute('id', "headtext_" + name);
                    headtext.setAttribute('value', personName);
                    headtext.setAttribute('position', '0 0.45 0.05');
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

                case "videoconf":
                    // handle changes to other users audio/video status
                    // console.log("got videoconf");

                    if (theMessage.hasOwnProperty("jitsiId") && theMessage.hasVideo) {
                        // possibly change active speaker

                        let slot = getSlotOfCaller(theMessage.jitsiId); // 0 indexed
                        //console.log("SPEAKER, slot: ", theMessage.jitsiId, slot);

                        if (globals.activeSpeaker != globals.previousSpeakerId) {
                            highlightVideoCube(entityEl, globals.previousSpeakerEl, slot);
                            globals.previousSpeakerId = theMessage.jitsiId;
                            globals.previousSpeakerEl = entityEl;
                        }
                    }

                    return;
                    break;

                case "camera":
                    // decide if we need draw or delete videoBox around head
                    // console.log("camera: audio, video", theMessage.hasAudio, theMessage.hasVideo);

                    if (theMessage.hasOwnProperty("jitsiId")) {
                        if (theMessage.hasVideo) {
                            if (!(entityEl.getAttribute('videoCubeDrawn')=='true')) {
                                // console.log("draw videoCube: " + theMessage.jitsiId);

                                // call function in jitsi-arena.js
                                let slot = getSlotOfCaller(theMessage.jitsiId); // 0 indexed
                                if (slot == -1) {
                                    console.log("not a caller (yet)");
                                    return;
                                }

                                if (theMessage.jitsiId == "") {
                                    console.log("jitsiId empty");
                                    break; // other-person has no camera ... yet
                                }

                                // console.log("slot ", slot, "ID ", theMessage.jitsiId);
                                // console.log("SLOT: " + slot);

                                // set up positional audio, but only once per camera
                                if (!entityEl.hasAttribute('posAudioAdded')) {
                                    // assume jitsi remoteTracks[0] is audio and [1] video
                                    let audioStream = new MediaStream();
                                    audioStream.addTrack(remoteTracks[theMessage.jitsiId][0].track);

                                    let sceneEl = globals.sceneObjects.scene;
                                    // if (sceneEl.audioListener)
                                    //      console.log("VERY WEIRD SCENE ALREADY HAS audioListener");

                                    let listener = null;
                                    if (sceneEl.audioListener) {
                                        // console.log("EXISTING (camera) sceneEl.audioListener:", sceneEl.audioListener);
                                        listener = sceneEl.audioListener;
                                    } else {
                                        listener = new THREE.AudioListener();
                                        // console.log("NEW HEAD AUDIO LISTENER:", listener);
                                        let camEl = globals.sceneObjects.myCamera.object3D;
                                        // console.log("children:", camEl.children);
                                        camEl.add(listener);
                                        globals.audioListener = listener;
                                        sceneEl.audioListener = listener;
                                    }

                                    // var listener = sceneEl.audioListener || new THREE.AudioListener();
                                    // sceneEl.audioListener = listener;

                                    let audioSource = new THREE.PositionalAudio(listener);
                                    audioSource.setMediaStreamSource(audioStream);
                                    audioSource.setRefDistance(1); // L-R panning
                                    audioSource.setRolloffFactor(1);
                                    entityEl.object3D.add(audioSource);

                                    // https://github.com/mozilla/hubs/blob/0c26af207bbbc3983409cdab7210b219b53449ca/src/systems/audio-system.js
                                    const audioCtx = THREE.AudioContext.getContext();
                                    const resume = () => {
                                        audioCtx.resume();
                                        setTimeout(function() {
                                            if (audioCtx.state === "running") {
                                                if (!AFRAME.utils.device.isMobile() && /chrome/i.test(navigator.userAgent)) {
                                                    enableChromeAEC(listener.gain);
                                                }
                                                document.body.removeEventListener("touchend", resume, false);
                                                document.body.removeEventListener("mouseup", resume, false);
                                            }
                                        }, 0);
                                    };
                                    document.body.addEventListener("touchend", resume, false);
                                    document.body.addEventListener("mouseup", resume, false);

                                    entityEl.setAttribute('posAudioAdded', true);
                                }

                                drawVideoCube(entityEl, slot);
                                entityEl.setAttribute('videoCubeDrawn', true);
                            }
                        }
                        else {
                            if (entityEl) {
                                for (let child of entityEl.children) {
                                    if (child.getAttribute("id").includes("videoCube") ||
                                        child.getAttribute("id").includes("videoHat")) {
                                        entityEl.removeChild(child);
                                    }
                                }
                                entityEl.setAttribute('videoCubeDrawn', false);
                            }
                        }
                    }
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
            // BUG
            //            for (const [attribute, value] of Object.entries(theMessage.data)) {
            //console.log("setting attr", attribute);
            //                entityEl.setAttribute(attribute, value);
            //            }
            const thing = Object.entries(theMessage.data);
            const len = thing.length;
            for (let i = 0; i < len; i++) {
                const theattr = thing[i][0]; // attribute
                const thevalue = thing[i][1]; // value
                entityEl.setAttribute(theattr, thevalue);
            }

            break;
        }
        case "update": {
            const name = theMessage.object_id;
            switch (theMessage.type) { // "object", "rig"
                case "rig": {
                    if (name === globals.camName) { // our camera Rig
                        // console.log("moving our camera rig, sceneObject: " + name);

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
                        // console.log(xrot, yrot, zrot, wrot);
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
