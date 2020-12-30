// 'use strict';

window.ARENA = {};

ARENA.mqttClient = new Paho.Client(globals.mqttParam, 'webClient-' + globals.timeID);
ARENA.mqttClient.onConnected = onConnected;
ARENA.mqttClient.onConnectionLost = onConnectionLost;
ARENA.mqttClient.onMessageArrived = onMessageArrived;

// loads scene objects from specified persistence URL if specified,
// or globals.persistenceUrl if not
const loadArena = (urlToLoad, position, rotation) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !defaults.disallowJWT; // Include JWT cookie
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', globals.persistenceUrl);

    xhr.responseType = 'json';
    xhr.send();
    const deferredObjects = [];
    const Parents = {};
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
        } else {
            const arenaObjects = xhr.response;
            const l = arenaObjects.length;
            for (let i = 0; i < l; i++) {
                const obj = arenaObjects[i];
                if (obj.type == 'program') {
                    const pobj = {
                        'object_id': obj.object_id,
                        'action': 'create',
                        'type': 'program',
                        'data': obj.attributes,
                    };
                    // ask runtime manager to start this program
                    ARENA.RuntimeManager.createModule(pobj);
                    continue;
                }
                if (obj.object_id === globals.camName) {
                    continue; // don't load our own camera/head assembly
                }
                if (obj.attributes.parent) {
                    deferredObjects.push(obj);
                    Parents[obj.attributes.parent] = obj.attributes.parent;
                } else {
                    const msg = {
                        object_id: obj.object_id,
                        action: 'create',
                        data: obj.attributes,
                    };
                    if (position) {
                        msg.data.position.x = msg.data.position.x + position.x;
                        msg.data.position.y = msg.data.position.y + position.y;
                        msg.data.position.z = msg.data.position.z + position.z;
                    }
                    if (rotation) {
                        const r = new THREE.Quaternion(msg.data.rotation.x, msg.data.rotation.y,
                            msg.data.rotation.z, msg.data.rotation.w);
                        const q = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
                        r.multiply(q);
                        msg.data.rotation.x = r.x;
                        msg.data.rotation.y = r.y;
                        msg.data.rotation.z = r.z;
                        msg.data.rotation.w = r.w;
                    }

                    onMessageArrived(undefined, msg);
                }
            }
            const l2 = deferredObjects.length;
            for (let i = 0; i < l2; i++) {
                const obj = deferredObjects[i];
                if (obj.attributes.parent === globals.camName) {
                    continue; // don't load our own camera/head assembly
                }
                const msg = {
                    object_id: obj.object_id,
                    action: 'create',
                    data: obj.attributes,
                };
                console.log('adding deferred object ' + obj.object_id + ' to parent ' + obj.attributes.parent);
                onMessageArrived(undefined, msg);
            }
        }
    };
};

// deletes scene objects from specified persistence URL if specified,
// or globals.persistenceUrl if not
const unloadArena = (urlToLoad) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !defaults.disallowJWT;
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', globals.persistenceUrl);

    xhr.responseType = 'json';
    xhr.send();

    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
        } else {
            const arenaObjects = xhr.response;
            const l = arenaObjects.length;
            for (let i = 0; i < l; i++) {
                const obj = arenaObjects[i];
                if (obj.object_id === globals.camName) {
                    // don't load our own camera/head assembly
                } else {
                    const msg = {
                        object_id: obj.object_id,
                        action: 'delete',
                    };
                    onMessageArrived(undefined, msg);
                }
            }
        }
    };
};

const loadScene = () => {
    let sceneOptions = {
        jitsiServer: 'mr.andrew.cmu.edu',
    };

    globals.sceneObjects.env = document.createElement('a-entity');
    globals.sceneObjects.env.id = 'env';

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !defaults.disallowJWT;
    xhr.open('GET', globals.persistenceUrl + '?type=scene-options');
    xhr.responseType = 'json';
    xhr.send();
    xhr.onload = async () => {
        if (xhr.status !== 200) {
            console.log('No scene-options object found');
        } else {
            const payload = xhr.response[xhr.response.length - 1];
            if (payload) {
                const options = payload['attributes'];
                sceneOptions = options['scene-options'];
                for (const [attribute, value] of Object.entries(sceneOptions)) {
                    globals[attribute] = value;
                }
                const envPresets = options['env-presets'];
                for (const [attribute, value] of Object.entries(envPresets)) {
                    globals.sceneObjects.env.setAttribute('environment', attribute, value);
                }
                document.getElementById('sceneRoot').appendChild(globals.sceneObjects.env);
            } else {
                // set defaults
                globals.sceneObjects.env.setAttribute('environment', 'preset', 'starry');
                globals.sceneObjects.env.setAttribute('environment', 'seed', 3);
                globals.sceneObjects.env.setAttribute('environment', 'flatShading', true);
                globals.sceneObjects.env.setAttribute('environment', 'groundTexture', 'squares');
                globals.sceneObjects.env.setAttribute('environment', 'grid', 'none');
                globals.sceneObjects.env.setAttribute('environment', 'fog', 0);
                globals.sceneObjects.env.setAttribute('environment', 'fog', 0);
                document.getElementById('sceneRoot').appendChild(globals.sceneObjects.env);

                // make default env have lights
                const light = document.createElement('a-light');
                light.id = 'ambient-light';
                light.setAttribute('type', 'ambient');
                light.setAttribute('color', '#363942');

                const light1 = document.createElement('a-light');
                light1.id = 'point-light';
                light1.setAttribute('type', 'point');
                light1.setAttribute('position', '-0.272 0.39 1.25');
                light1.setAttribute('color', '#C2E6C7');

                document.getElementById('sceneRoot').appendChild(light);
                document.getElementById('sceneRoot').appendChild(light1);
            }
        }
        // initialize Jitsi videoconferencing
        ARENA.JitsiAPI = await ARENAJitsiAPI(sceneOptions.jitsiServer ? sceneOptions.jitsiServer : 'mr.andrew.cmu.edu');
        // init chat after JitsiAPI starts
        ARENA.Chat.init({
            userid: globals.idTag,
            cameraid: globals.camName,
            username: globals.displayName,
            arena_conference: ARENA.JitsiAPI, // pass reference to JitsiAPI
            realm: defaults.realm,
            scene: globals.scenenameParam,
            persist_uri: 'https://' + defaults.persistHost + defaults.persistPath,
            keepalive_interval_ms: 30000,
            mqtt_host: globals.mqttParam,
            mqtt_username: globals.username,
            mqtt_token: globals.mqttToken,
            supportDevFolders: defaults.supportDevFolders,
        });
    };
};

let lwt;
window.addEventListener('onauth', function(e) {
    globals.username = e.detail.mqtt_username;
    globals.mqttToken = e.detail.mqtt_token;

    // Last Will and Testament message sent to subscribers if this client loses connection
    lwt = new Paho.Message(JSON.stringify({
        object_id: globals.camName,
        action: 'delete',
    }));
    lwt.destinationName = globals.outputTopic + globals.camName;
    lwt.qos = 2;
    lwt.retained = false;
    ARENA.mqttClient.connect({
        onSuccess: function() {
            console.log('MQTT scene connection success.');
        },
        onFailure: function(res) {
            console.error(`MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
        },
        reconnect: true,
        willMessage: lwt,
        userName: globals.username,
        password: globals.mqttToken,
    });

    // init runtime manager
    ARENA.RuntimeManager.init({
        mqtt_uri: globals.mqttParam,
        onInitCallback: function() {
            console.log('Runtime init done.');
        },
        name: 'rt-' + Math.round(Math.random() * 10000) + '-' + globals.username,
        dbg: false,
        mqtt_username: globals.username,
        mqtt_token: globals.mqttToken,
    });
});

let oldMsg = '';

/**
 * MQTT onConnected callback
 * @param {Boolean} reconnect is a reconnect
 * @param {Object} uri uri used
 */
function onConnected(reconnect, uri) {
    if (reconnect) {
        // For reconnect, do not reinitialize user state, that will warp user back and lose
        // current state. Instead, reconnection should naturally allow messages to continue.
        // need to resubscribe however, to keep receiving messages
        if (!ARENA.JitsiAPI.ready()) {
            ARENA.JitsiAPI = ARENAJitsiAPI(globals.jitsiServer);
            console.warn(`ARENA Jitsi restarting...`);
            //TODO: ARENA.Chat.setArenaConference(ARENA.JitsiAPI); // tell chat about new conference object
        }
        ARENA.mqttClient.subscribe(globals.renderTopic);
        console.warn(`MQTT scene reconnected to ${uri}`);
        return; // do not continue!
    }

    // first connection for this client
    console.log(`MQTT scene init user state, connected to ${uri}`);

    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event

    // make 'env' and 'box-obj' (from index.html) scene objects so they can be modified
    // Add them to our dictionary of scene objects
    const sceneObjects = globals.sceneObjects;

    sceneObjects.vive_leftHand = document.getElementById('vive-leftHand');
    sceneObjects.vive_rightHand = document.getElementById('vive-rightHand');

    sceneObjects.groundPlane = document.getElementById('groundPlane'); // this is an <a-entity>

    sceneObjects.cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    sceneObjects.cameraSpinner = document.getElementById('CameraSpinner'); // this is an <a-entity>

    sceneObjects.weather = document.getElementById('weather');
    sceneObjects.scene = document.querySelector('a-scene');
    // sceneObjects.scene = document.getElementById('sceneRoot');
    // sceneObjects.env = document.getElementById('env');
    sceneObjects.myCamera = document.getElementById('my-camera');
    sceneObjects[globals.camName] = sceneObjects.myCamera;
    sceneObjects.conix_box = document.getElementById('conix_box');
    sceneObjects.conix_box3 = document.getElementById('dots_sphere');
    sceneObjects.env_box = document.getElementById('env_box');
    sceneObjects.sound_box = document.getElementById('sound_box');
    sceneObjects.conix_text = document.getElementById('conix_text');

    if (globals.weatherParam !== 'none') {
        if (sceneObjects.weather) {
            sceneObjects.weather.setAttribute('particle-system', 'preset', globals.weatherParam);
            sceneObjects.weather.setAttribute('particle-system', 'enabled', 'true');
        }
    } else if (sceneObjects.weather) {
        sceneObjects.weather.setAttribute('particle-system', 'enabled', 'false');
    }

    // Publish initial camera presence
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    const thex = sceneObjects.myCamera.object3D.position.x;
    const they = sceneObjects.myCamera.object3D.position.y;
    const thez = sceneObjects.myCamera.object3D.position.z;
    const myMsg = {
        object_id: globals.camName,
        action: 'create',
        data: {
            object_type: 'camera',
            position: {
                x: thex,
                y: they,
                z: thez,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
                w: 0,
            },
            color: color,
        },
    };
    console.log(navigator.userAgent);

    publish(globals.outputTopic + globals.camName, myMsg);

    // console.log("my-camera element", sceneObjects.myCamera);
    console.log('my-camera name', globals.camName);
    sceneObjects.myCamera.setAttribute('position', globals.startCoords);

    sceneObjects.myCamera.addEventListener('vioChanged', (e) => {
        // console.log("vioChanged", e.detail);

        if (globals.fixedCamera !== '') {
            const msg = {
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
                },
            };
            publish(globals.vioTopic + globals.camName, msg); // extra timestamp info at end for debugging
        }
    });

    sceneObjects.myCamera.addEventListener('poseChanged', (e) => {
        // console.log("poseChanged", e.detail);
        const msg = {
            object_id: globals.camName,
            jitsiId: ARENA.JitsiAPI ? ARENA.JitsiAPI.getJitsiId() : null,
            hasAudio: ARENA.JitsiAPI ? ARENA.JitsiAPI.hasAudio() : false,
            hasVideo: ARENA.JitsiAPI ? ARENA.JitsiAPI.hasVideo() : false,
            hasAvatar: (ARENA.FaceTracker !== undefined) && ARENA.FaceTracker.running(),
            displayName: globals.displayName,
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
            },
        };

        // if (true) { // Publish camera coordinates with great vigor
        if (msg !== oldMsg) { // suppress duplicates
            publish(globals.outputTopic + globals.camName, msg); // extra timestamp info at end for debugging
            oldMsg = msg;
        }
    });

    if (sceneObjects.vive_leftHand) {
        sceneObjects.vive_leftHand.addEventListener('viveChanged', (e) => {
            // console.log(e.detail);

            const msg = {
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
                },
            };

            // rate limiting is handled in vive-pose-listener
            publish(globals.outputTopic + globals.viveLName, msg);
        });
    }
    // realtime position tracking of right hand controller
    if (sceneObjects.vive_rightHand) {
        sceneObjects.vive_rightHand.addEventListener('viveChanged', (e) => {
            // console.log(e.detail);

            const msg = {
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
                },
            };
            // e.g. realm/s/render/viveRight_9240_X or realm/s/render/viveRight_eric
            publish(globals.outputTopic + globals.viveRName, msg);
        });
    }

    loadScene();
    loadArena();

    // ok NOW start listening for MQTT messages
    // * moved this out of loadArena() since it is conceptually a different thing
    ARENA.mqttClient.subscribe(globals.renderTopic);
}

/**
 * MQTT onConnectionLost callback
 * @param {Object} responseObject paho response object
 */
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error(`MQTT scene connection lost, code:
            ${responseObject.errorCode}, reason: ${responseObject.errorMessage}`);
    }
    console.warn('MQTT scene automatically reconnecting...');
    // no need to connect manually here, "reconnect: true" already set
}

window.publish = (dest, msg) => {
    if (!ARENA.mqttClient.isConnected()) return;

    if (typeof msg === 'object') {
        // add timestamp to all published messages
        const d = new Date();
        const n = d.toISOString();
        msg['timestamp'] = n;

        msg = JSON.stringify(msg);
    }
    // console.log('desint :', dest, 'msggg', msg)
    const message = new Paho.Message(msg);
    message.destinationName = dest;
    ARENA.mqttClient.send(message);
};

/**
 * Utility function to check incoming messages
 * @param {String} str string with message to check
 * @return {Bolean}
 */
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

/**
 * Draw video head
 * @param {Object} entityEl scene entity
 * @param {Number} videoID video Id
 */
function drawVideoCube(entityEl, videoID) {
    // attach video to head
    const videoCube = document.createElement('a-box');
    videoCube.setAttribute('id', videoID + 'cube');
    videoCube.setAttribute('position', '0 0 0');
    videoCube.setAttribute('scale', '0.6 0.4 0.6');
    videoCube.setAttribute('material', 'shader', 'flat');
    videoCube.setAttribute('src', `#${videoID}`); // video only (!audio)

    const videoCubeDark = document.createElement('a-box');
    videoCubeDark.setAttribute('id', videoID + 'cubeDark');
    videoCubeDark.setAttribute('position', '0 0 0.01');
    videoCubeDark.setAttribute('scale', '0.61 0.41 0.6');
    videoCubeDark.setAttribute('material', 'shader', 'flat');
    videoCubeDark.setAttribute('transparent', 'true');
    videoCubeDark.setAttribute('color', 'black');
    videoCubeDark.setAttribute('opacity', '0.8');

    entityEl.appendChild(videoCube);
    entityEl.appendChild(videoCubeDark);
}

/**
 * Draw microphone
 * @param {Object} entityEl scene entity
 * @param {Boolean} hasAudio
 */
function drawMicrophoneState(entityEl, hasAudio) {
    // entityEl is the head
    const name = 'muted_' + entityEl.id;
    let micIconEl = document.querySelector('#' + name);
    if (!micIconEl && !hasAudio) {
        micIconEl = document.createElement('a-image');
        micIconEl.setAttribute('id', name);
        micIconEl.setAttribute('scale', '0.2 0.2 0.2');
        micIconEl.setAttribute('position', '0 0.3 0.045');
        micIconEl.setAttribute('src', 'url(images/icons/audio-off.png)');
        entityEl.appendChild(micIconEl);
    } else if (micIconEl && hasAudio) {
        entityEl.removeChild(micIconEl);
    }
}

/**
 * Workaround for AEC when using Web Audio API (https://bugs.chromium.org/p/chromium/issues/detail?id=687574)
 * https://github.com/mozilla/hubs/blob/master/src/systems/audio-system.js
 * @param {Object} gainNode
 */
async function enableChromeAEC(gainNode) {
    /**
     *  workaround for: https://bugs.chromium.org/p/chromium/issues/detail?id=687574
     *  1. grab the GainNode from the scene's THREE.AudioListener
     *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out),
     *     this prevents hearing the audio twice.
     *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
     *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
     *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
     *  6. connect the other RTCPeerConnection's stream to a new audio element.
     *  All audio is now routed through Chrome's audio mixer, thus enabling AEC,
     *  while preserving all the audio processing that was performed via the WebAudio API.
     */

    const audioEl = new Audio();
    audioEl.setAttribute('autoplay', 'autoplay');
    audioEl.setAttribute('playsinline', 'playsinline');

    const context = THREE.AudioContext.getContext();
    const loopbackDestination = context.createMediaStreamDestination();
    const outboundPeerConnection = new RTCPeerConnection();
    const inboundPeerConnection = new RTCPeerConnection();

    const onError = (e) => {
        console.error('RTCPeerConnection loopback initialization error', e);
    };

    outboundPeerConnection.addEventListener('icecandidate', (e) => {
        inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener('icecandidate', (e) => {
        outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener('track', (e) => {
        audioEl.srcObject = e.streams[0];
    });

    try {
        /* The following should never fail, but just in case, we won't disconnect/reconnect
           the gainNode unless all of this succeeds */
        loopbackDestination.stream.getTracks().forEach((track) => {
            outboundPeerConnection.addTrack(track, loopbackDestination.stream);
        });

        const offer = await outboundPeerConnection.createOffer();
        outboundPeerConnection.setLocalDescription(offer);
        await inboundPeerConnection.setRemoteDescription(offer);

        const answer = await inboundPeerConnection.createAnswer();
        inboundPeerConnection.setLocalDescription(answer);
        outboundPeerConnection.setRemoteDescription(answer);

        gainNode.disconnect();
        if (ARENA.JitsiAPI.chromeSpatialAudioOn()) {
            gainNode.connect(context.destination);
        } else {
            gainNode.connect(loopbackDestination);
        }
    } catch (e) {
        onError(e);
    }
}

/**
 * Call internal MessageArrived handler; Isolates message error handling
 * Also called to handle persist objects
 * @param {Object} message
 * @param {String} jsonMessage
 */
function onMessageArrived(message, jsonMessage) {
    try {
        _onMessageArrived(message, jsonMessage);
    } catch (err) {
        if (message) {
            if (message.payloadString) {
                console.error('onMessageArrived Error!', err, message.payloadString);
            } else {
                console.error('onMessageArrived Error!', err,
                    new TextDecoder('utf-8').decode(message.payloadBytes), message.payloadBytes);
            }
        } else if (jsonMessage) {
            console.error('onMessageArrived Error!', err, JSON.stringify(jsonMessage));
        }
    }
}

let progMsgs = {};

/**
 * Internal MessageArrived handler; handles object create/delete/event/... messages
 * @param {Object} message
 * @param {String} jsonMessage
 */
function _onMessageArrived(message, jsonMessage) {
    const sceneObjects = globals.sceneObjects;
    let theMessage = {};
    if (message) {
        // console.log(message.destinationName, message.payloadString);
        if (!isJson(message.payloadString)) {
            return;
        }
        theMessage = JSON.parse(message.payloadString);
    } else if (jsonMessage) {
        theMessage = jsonMessage;
    }
    //    console.log(theMessage.object_id);

    switch (theMessage.action) { // clientEvent, create, delete, update
    case 'clientEvent': {
        const entityEl = sceneObjects[theMessage.object_id];
        let myPoint = '';
        if (theMessage.data.position) {
            myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
                parseFloat(theMessage.data.position.y),
                parseFloat(theMessage.data.position.z));
        } else {
            console.error('Error: theMessage.data.position not defined', theMessage);
        }
        const clicker = theMessage.data.source;

        if (entityEl == undefined) {
            console.log(message.payloadString);
            return;
        }

        switch (theMessage.type) {
        case 'collision':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        case 'mousedown':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        case 'mouseup':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mouseup', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        default: // handle others here like mouseenter / mouseleave
            break; // never gets here haha
        }
        break;
    }
    case 'delete': {
        // An empty message after an object_id means remove it
        const name = theMessage.object_id;
        // console.log(message.payloadString, topic, name);

        if (sceneObjects[name]) {
            parentEl = sceneObjects[name].parentEl;
            parentEl.removeChild(sceneObjects[name]);
            delete sceneObjects[name];
            return;
        } else {
            console.log('Warning: ' + name + ' not in sceneObjects');
        }
        break;
    }
    case 'create': {
        const name = theMessage.object_id;
        delete theMessage.object_id;

        if (name === globals.camName) {
            // check if it is a command for the local camera
            if (theMessage.type === 'camera-override') {
                if (theMessage.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                    console.error('Camera override: object_type must be camera.');
                    return;
                }
                const myCamera=globals.sceneObjects.myCamera;
                if (!myCamera) {
                    console.error('Camera override: local camera object does not exist! (create camera before)');
                    return;
                }
                const p = theMessage.data.position;
                if (p) myCamera.object3D.position.set(p.x, p.y, p.z);
                const r = theMessage.data.rotation;
                if (r) {
                    myCamera.components['look-controls'].yawObject.rotation.setFromQuaternion(
                        new THREE.Quaternion(r.x, r.y, r.z, r.w));
                }
            } else if (theMessage.type === 'look-at') {
                if (theMessage.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                    console.error('Camera look-at: object_type must be camera.');
                    return;
                }
                const myCamera=globals.sceneObjects.myCamera;
                if (!myCamera) {
                    console.error('Camera look-at: local camera object does not exist! (create camera before)');
                    return;
                }
                let target = theMessage.data.target;
                if (!target.hasOwnProperty('x')) { // check if an object id was given
                    const targetObj = globals.sceneObjects[target];
                    if (targetObj) target = targetObj.object3D.position; // will be processed as x, y, z below
                    else {
                        console.error('Camera look-at: target not found.');
                        return;
                    }
                }
                if (target.hasOwnProperty('x') &&
                    target.hasOwnProperty('y') &&
                    target.hasOwnProperty('z'))
                { // x, y, z given
                    myCamera.components['look-controls'].yawObject.lookAt( target.x, target.y, target.z);
                    myCamera.components['look-controls'].pitchObject.lookAt( target.x, target.y, target.z);
                }
            }
            return;
        }

        if (theMessage.type === 'scene-options') {
            return; // don't create another env
        }

        let x; let y; let z; let xrot; let yrot; let zrot; let wrot; let xscale; let yscale; let zscale; let color;
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
            color = 'white';
        }

        let type = theMessage.data.object_type;
        delete theMessage.data.object_type;
        if (type === 'cube') {
            type = 'box';
        }
        // different name in Unity
        if (type === 'quad') {
            type = 'plane';
        }
        // also different

        let entityEl;

        // Reduce, reuse, recycle!
        if (name in sceneObjects) {
            entityEl = sceneObjects[name];
            entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
            // console.log("existing object: ", name);
            // console.log(entityEl);
        } else { // CREATE NEW SCENE OBJECT
            entityEl = document.createElement('a-entity');

            // wacky idea: force render order
            entityEl.object3D.renderOrder = 1;

            if (type === 'viveLeft' || type === 'viveRight') {
                // create vive controller for 'other persons controller'
                entityEl.setAttribute('id', name);
                entityEl.setAttribute('rotation.order', 'YXZ');
                // entityEl.setAttribute('obj-model', "obj: #viveControl-obj; mtl: #viveControl-mtl");
                if (type === 'viveLeft') {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_left.gltf)');
                } else {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_right.gltf)');
                }

                entityEl.object3D.position.set(x, y, z);
                entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);

                // Add it to our dictionary of scene objects
                sceneObjects.scene.appendChild(entityEl);
                sceneObjects[name] = entityEl;
            } else if (type === 'camera') {
                entityEl.setAttribute('id', name); // e.g. camera_1234_er1k
                entityEl.setAttribute('rotation.order', 'YXZ');
                entityEl.object3D.position.set(0, 0, 0);
                entityEl.object3D.rotation.set(0, 0, 0);

                // this is the head 3d model
                const headModelEl = document.createElement('a-entity');
                headModelEl.setAttribute('id', 'head-model_' + name);
                headModelEl.setAttribute('rotation', '0 180 0');
                headModelEl.object3D.scale.set(1, 1, 1);
                headModelEl.setAttribute('dynamic-body', 'type', 'static');

                headModelEl.setAttribute('gltf-model', 'url(models/Head.gltf)'); // actually a face mesh

                // place a colored text above the head
                const headtext = document.createElement('a-text');
                const decodeName = decodeURI(name.split('_')[2]);
                // TODO(mwfarb): support full unicode in a-frame text, until then, normalize headtext
                const personName = decodeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                headtext.setAttribute('id', 'headtext_' + name);
                headtext.setAttribute('value', personName);
                headtext.setAttribute('position', '0 0.45 0.05');
                headtext.setAttribute('side', 'double');
                headtext.setAttribute('align', 'center');
                headtext.setAttribute('anchor', 'center');
                headtext.setAttribute('scale', '0.4 0.4 0.4');
                headtext.setAttribute('rotation', '0 180 0');
                headtext.setAttribute('color', color); // color
                headtext.setAttribute('width', 5); // try setting last

                entityEl.appendChild(headtext);
                entityEl.appendChild(headModelEl);
                sceneObjects['head-text_' + name] = headtext;
                sceneObjects['head-model_' + name] = headModelEl;

                sceneObjects.scene.appendChild(entityEl);
                sceneObjects[name] = entityEl;

                // console.log("their camera:", entityEl);
            } else {
                entityEl.setAttribute('id', name);
                entityEl.setAttribute('rotation.order', 'YXZ');

                // Parent/Child handling
                if (theMessage.data.parent) {
                    const parentEl = sceneObjects[theMessage.data.parent];
                    if (parentEl) {
                        entityEl.flushToDOM();
                        parentEl.appendChild(entityEl);
                        // Add it to our dictionary of scene objects
                        sceneObjects[name] = entityEl;
                    } else {
                        console.log('orphaned; parent ' + name + ' cannot find ' + theMessage.data.parent + ' yet');
                    }
                } else {
                    sceneObjects.scene.appendChild(entityEl);
                    // Add it to our dictionary of scene objects
                    sceneObjects[name] = entityEl;
                }
            }
            if (theMessage.ttl !== undefined) { // Allow falsy value of 0
                entityEl.setAttribute('ttl', {seconds: theMessage.ttl});
            }
        }

        switch (type) {
        case 'light':
            entityEl.setAttribute('light', 'type', 'ambient');
            // does this work for light a-entities ?
            entityEl.setAttribute('light', 'color', color);
            break;

        case 'headtext':
            // handle changes to other users head text
            if (theMessage.hasOwnProperty('displayName')) {
                // update head text
                for (const child of entityEl.children) {
                    if (child.getAttribute('id').includes('headtext_')) {
                        // TODO(mwfarb): support full unicode in a-frame text, until then, normalize headtext
                        const name = theMessage.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        child.setAttribute('value', name);
                    }
                }
            }
            return;

        case 'videoconf':
            // handle changes to other users audio/video status
            if (theMessage.hasOwnProperty('jitsiId')) {
                // possibly change active speaker
                if (theMessage.hasVideo && ARENA.JitsiAPI.activeSpeakerChanged()) {
                    globals.previousSpeakerEl = entityEl;
                }
                drawMicrophoneState(entityEl, theMessage.hasAudio);
            }
            return;

        case 'camera':
            // decide if we need draw or delete videoCube around head
            if (theMessage.hasOwnProperty('jitsiId')) {
                if (!theMessage.jitsiId || (ARENA.JitsiAPI && !ARENA.JitsiAPI.ready())) {
                    // console.log('jitsiId empty');
                    break; // other-person has no jitsi stream ... yet
                }

                const camPos = globals.sceneObjects.myCamera.object3D.position;
                const entityPos = entityEl.object3D.position;
                const distance = camPos.distanceTo(entityPos);
                globals.maxAVDist = globals.maxAVDist ? globals.maxAVDist : 20;

                const videoID = `video${theMessage.jitsiId}`;
                if (theMessage.hasVideo) {
                    const videoElem = document.getElementById(videoID);
                    const videoTrack = ARENA.JitsiAPI ? ARENA.JitsiAPI.getVideoTrack(theMessage.jitsiId) : undefined;
                    if (!videoTrack) return;
                    entityEl.videoTrack = videoTrack;

                    // frustrum culling for WebRTC streams
                    const cam = globals.sceneObjects.myCamera.sceneEl.camera;
                    const frustum = new THREE.Frustum();
                    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,
                        cam.matrixWorldInverse));
                    const inFieldOfView = frustum.containsPoint(entityPos);

                    // check if A/V cut off distance has been reached
                    if (!inFieldOfView || distance > globals.maxAVDist) {
                        entityEl.videoTrack.enabled = false; // pause WebRTC video stream
                        if (videoElem && !videoElem.paused) videoElem.pause();
                    } else {
                        entityEl.videoTrack.enabled = true; // unpause WebRTC video stream
                        if (videoElem && videoElem.paused) videoElem.play();
                    }

                    // draw video cube, but only if it didnt exist before
                    if (videoElem && entityEl.getAttribute('videoCubeDrawn') != 'true') {
                        drawVideoCube(entityEl, videoID);
                        entityEl.setAttribute('videoCubeDrawn', true);
                    }
                } else {
                    if (entityEl.videoTrack) {
                        entityEl.videoTrack.enabled = false;
                    } // pause WebRTC video stream
                    // remove video cubes
                    const vidCube = document.getElementById(videoID + 'cube');
                    if (entityEl.contains(vidCube)) {
                        entityEl.removeChild(vidCube);
                    }
                    const vidCubeDark = document.getElementById(videoID + 'cubeDark');
                    if (entityEl.contains(vidCubeDark)) {
                        entityEl.removeChild(vidCubeDark);
                    }
                    entityEl.setAttribute('videoCubeDrawn', false);
                }

                drawMicrophoneState(entityEl, theMessage.hasAudio);
                if (theMessage.hasAudio) {
                    // set up positional audio, but only once per camera
                    const audioTrack = ARENA.JitsiAPI ? ARENA.JitsiAPI.getAudioTrack(theMessage.jitsiId) : undefined;
                    if (!audioTrack) return;

                    // check if audio track changed since last update
                    const oldAudioTrack = entityEl.audioTrack;
                    entityEl.audioTrack = audioTrack.track;

                    // check if A/V cut off distance has been reached
                    if (distance > globals.maxAVDist) {
                        entityEl.audioTrack.enabled = false; // pause WebRTC audio stream
                    } else {
                        entityEl.audioTrack.enabled = true; // unpause WebRTC audio stream
                    }

                    if (entityEl.audioTrack !== oldAudioTrack) {
                        // set up and attach positional audio
                        const audioStream = new MediaStream();
                        audioStream.addTrack(entityEl.audioTrack);

                        const sceneEl = globals.sceneObjects.scene;
                        let listener = null;
                        if (sceneEl.audioListener) {
                            listener = sceneEl.audioListener;
                        } else {
                            listener = new THREE.AudioListener();
                            const camEl = globals.sceneObjects.myCamera.object3D;
                            camEl.add(listener);
                            globals.audioListener = listener;
                            sceneEl.audioListener = listener;
                        }

                        // create positional audio, but only if didnt exist before
                        if (!entityEl.positionalAudio) {
                            const audioSource = new THREE.PositionalAudio(listener);
                            audioSource.setMediaStreamSource(audioStream);
                            entityEl.positionalAudio = audioSource;
                            entityEl.object3D.add(audioSource);
                        } else {
                            entityEl.positionalAudio.setMediaStreamSource(audioStream);
                        }

                        // set positional audio scene params
                        if (globals.refDist) { // L-R panning
                            entityEl.positionalAudio.setRefDistance(globals.refDist);
                        }
                        if (globals.rolloffFact) {
                            entityEl.positionalAudio.setRolloffFactor(globals.rolloffFact);
                        }
                        if (globals.distModel) {
                            entityEl.positionalAudio.setDistanceModel(globals.distModel);
                        }
                        if (globals.volume) {
                            entityEl.positionalAudio.setVolume(globals.volume);
                        }

                        // sorta fixes chrome echo bug, but not always
                        const audioCtx = THREE.AudioContext.getContext();
                        const resume = () => {
                            audioCtx.resume();
                            setTimeout(function() {
                                if (audioCtx.state === 'running') {
                                    if (!AFRAME.utils.device.isMobile() && /chrome/i.test(navigator.userAgent)) {
                                        enableChromeAEC(listener.gain);
                                    }
                                    document.body.removeEventListener('touchmove', resume, false);
                                    document.body.removeEventListener('mousemove', resume, false);
                                }
                            }, 0);
                        };
                        document.body.addEventListener('touchmove', resume, false);
                        document.body.addEventListener('mousemove', resume, false);
                    }
                } else {
                    if (entityEl.audioTrack) {
                        entityEl.audioTrack.enabled = false;
                    } // pause WebRTC audio stream
                }
            }

            if (theMessage.hasOwnProperty('displayName')) {
                // update head text
                for (const child of entityEl.children) {
                    if (child.getAttribute('id').includes('headtext_')) {
                        // TODO(mwfarb): support full unicode in a-frame text, until then, normalize headtext
                        const name = theMessage.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        child.setAttribute('value', name);
                    }
                }
            }

            // console.log("camera: audio, video", theMessage.hasAudio, theMessage.hasVideo);
            break;

        case 'viveLeft':
            break;
        case 'viveRight':
            break;

        case 'image': // use special 'url' data slot for bitmap URL (like gltf-models do)
            entityEl.setAttribute('geometry', 'primitive', 'plane');
            entityEl.setAttribute('material', 'src', theMessage.data.url);
            entityEl.setAttribute('material', 'shader', 'flat');
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            break;

        case 'line':
            entityEl.setAttribute('line', theMessage.data);
            entityEl.setAttribute('line', 'color', color);
            break;

        case 'thickline':
            entityEl.setAttribute('meshline', theMessage.data);
            entityEl.setAttribute('meshline', 'color', color);
            delete theMessage.data.thickline;
            break;

        case 'particle':
            entityEl.setAttribute('particle-system', theMessage.data);
            break;

        case 'gltf-model':
            entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
            entityEl.setAttribute('gltf-model', theMessage.data.url);

            const updateProgress = (failed, evt) => {
                const gltfProgressEl = document.getElementById('gltf-loading');
                let innerHTML = 'Loading 3D model:<br/>';
                for (const [src, progress] of Object.entries(progMsgs)) {
                    if (progress === 'failed') {
                        innerHTML += '<b>"' + src + '"' + '<br/>' + 'Failed!</b>' + '<br/>';
                    } else {
                        const shortName = src.length < 20 ? src : '…' + src.substring(src.length - 20);
                        innerHTML += shortName + '<br/>' + parseFloat(progress.toFixed(1)) + '%' + '<br/>';
                    }
                }
                gltfProgressEl.innerHTML = innerHTML;
                gltfProgressEl.className = 'show';
                if (evt.detail.progress == 100 || failed) {
                    setTimeout(() => {
                        progMsgs = {};
                        gltfProgressEl.className = 'hide';
                    }, 3000);
                }
            };

            entityEl.addEventListener('model-progress', (evt) => {
                progMsgs[evt.detail.src] = evt.detail.progress;
                updateProgress(false, evt);
                if (evt.detail.progress === 100) {
                    delete progMsgs[evt.detail.src];
                }
            });
            entityEl.addEventListener('model-error', (evt) => {
                progMsgs[evt.detail.src] = 'failed';
                updateProgress(true, evt);
            });
            delete theMessage.data.url;
            break;

        case 'text':
            // set a bunch of defaults
            entityEl.setAttribute('text', 'width', 5); // the default for <a-text>
            // Support legacy `data: { text: 'STRING TEXT' }`
            const theText = theMessage.data.text;
            if (typeof theText === 'string' || theText instanceof String) {
                entityEl.setAttribute('text', 'value', theMessage.data.text);
                delete theMessage.data.text;
            }
            entityEl.setAttribute('text', 'color', color);
            entityEl.setAttribute('text', 'side', 'double');
            entityEl.setAttribute('text', 'align', 'center');
            entityEl.setAttribute('text', 'anchor', 'center');
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
        // console.log("setting attr", attribute);
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
    case 'update': {
        const name = theMessage.object_id;
        switch (theMessage.type) { // "object", "rig"
        case 'rig': {
            if (name === globals.camName) { // our camera Rig
                // console.log("moving our camera rig, sceneObject: " + name);

                // "I do declare!"
                let x; let y; let z; let xrot; let yrot; let zrot; let wrot;

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
        case 'object': {
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
            /* just setAttribute() - data can contain multiple attribute-value pairs
             e.g: { ... "action": "update", "data":
                    { "animation": { "property": "rotation", "to": "0 360 0", "loop": "true", "dur": 10000}}}' ... } */

            const entityEl = sceneObjects[theMessage.object_id];
            if (entityEl) {
                for (const [attribute, value] of Object.entries(theMessage.data)) {
                    if (attribute === 'rotation') {
                        entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w);
                    } else if (attribute === 'position') {
                        entityEl.object3D.position.set(value.x, value.y, value.z);
                    } else if (attribute === 'color') {
                        if (!entityEl.hasOwnProperty('text')) {
                            entityEl.setAttribute('material', 'color', value);
                        } else {
                            entityEl.setAttribute('text', 'color', value);
                        }
                    } else if (attribute === 'text') {
                        if (entityEl.hasOwnProperty('text')) {
                            entityEl.setAttribute('text', 'value', value);
                        }
                    } else {
                        if (value === null) {
                            entityEl.removeAttribute(attribute);
                        } else {
                            entityEl.setAttribute(attribute, value);
                        }
                    }
                }
            } else {
                console.log('Warning: ' + theMessage.object_id + ' not in sceneObjects');
            }
            break;
        }
        default:
            console.log('Possibly Empty Message: ', message.destinationName, message.payloadString);
            break;
        } // switch (theMessage.type)
    } // case "update":
    } // switch (theMessage.action)
}
