// arena.js
//
// globals
// 'use strict';

// Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
const getSceneName = () => {
    let path = window.location.pathname.substring(1);
    if (defaults.supportDevFolders && path.length > 0) {
        path = path.replace(path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0], '');
    }
    if (path === '' || path === 'index.html') {
        return getUrlParam('scene', defaults.scenenameParam);
    }
    try {
        return path.match(/^[^\/]+(\/[^\/]+)?/g)[0];
    } catch (e) {
        return getUrlParam('scene', defaults.scenenameParam);
    }
};

window.ARENA = {};

// arena events target
ARENA.events = new ARENAEventEmitter();

window.globals = {
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    // TODO(mwfarb): push per scene themes/styles into json scene object
    updateMillis: getUrlParam('camUpdateRate', defaults.updateMillis),
    scenenameParam: getSceneName(), // scene
    userParam: getUrlParam('name', defaults.userParam),
    startCoords: getUrlParam('location', defaults.startCoords).replace(/,/g, ' '),
    weatherParam: getUrlParam('weather', defaults.weatherParam),
    mqttParamZ: getUrlParam('mqttServer', defaults.mqttParamZ),
    fixedCamera: getUrlParam('fixedCamera', defaults.fixedCamera),
    ATLASurl: getUrlParam('ATLASurl', defaults.ATLASurl),
    localVideoWidth: AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300,
    vioTopic: defaults.vioTopic,
    latencyTopic: defaults.latencyTopic,
    lastMouseTarget: undefined,
    inAR: false,
    isWebXRViewer: navigator.userAgent.includes('WebXRViewer'),
    onEnterXR: function(xrType) {
        // debug("ENTERING XR");

        if (xrType === 'ar') {
            // debug("xrType is ar");

            this.isAR = true;
            if (this.isWebXRViewer) {
                // debug("isWebXRViewer = true");

                const base64script = document.createElement('script');
                base64script.onload = async () => {
                    await importScript('/apriltag/script.js');
                };
                base64script.src = '/apriltag/base64_binary.js';
                document.head.appendChild(base64script);

                document.addEventListener('mousedown', function(e) {
                    // debug("MOUSEDOWN " + window.globals.lastMouseTarget);

                    if (window.globals.lastMouseTarget) {
                        // debug("has target: "+window.globals.lastMouseTarget);

                        const el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        const elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        // debug("worldPosition is:");
                        // debug(elPos.x.toString()+","+elPos.x.toString()+","+elPos.x.toString());
                        const intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z,
                        };
                        el.emit('mousedown', {
                            'clicker': window.globals.camName,
                            'intersection': {
                                point: intersection,
                            },
                            'cursorEl': true,
                        }, false);
                    } else {
                        // debug("no lastMouseTarget");
                    }
                });
                document.addEventListener('mouseup', function(e) {
                    if (window.globals.lastMouseTarget) {
                        const el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        const elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        const intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z,
                        };
                        // debug(elPos.x);
                        el.emit('mouseup', {
                            'clicker': window.globals.camName,
                            'intersection': {
                                point: intersection,
                            },
                            'cursorEl': true,
                        }, false);
                    }
                });
                let cursor = document.getElementById('mouseCursor');
                const cursorParent = cursor.parentNode;
                cursorParent.removeChild(cursor);
                cursor = document.createElement('a-cursor');
                cursor.setAttribute('fuse', false);
                cursor.setAttribute('scale', '0.1 0.1 0.1');
                cursor.setAttribute('position', '0 0 -0.1'); // move reticle closer (side effect: bigger!)
                cursor.setAttribute('color', '#333');
                cursor.setAttribute('max-distance', '10000');
                cursor.setAttribute('id', 'fuse-cursor');
                cursorParent.appendChild(cursor);
            }
            document.getElementById('env').setAttribute('visible', false);
        }
    },
};

const urlLat = getUrlParam('lat');
const urlLong = getUrlParam('long');
if (urlLat && urlLong) {
    globals.clientCoords = {
        latitude: urlLat,
        longitude: urlLong,
    };
} else {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            globals.clientCoords = position.coords;
        });
    }
}

globals.persistenceUrl = '//' + defaults.persistHost + defaults.persistPath + globals.scenenameParam;
globals.mqttParam = 'wss://' + globals.mqttParamZ + defaults.mqttPath[Math.floor(Math.random() * defaults.mqttPath.length)];
globals.outputTopic = defaults.realm + '/s/' + globals.scenenameParam + '/';
globals.renderTopic = globals.outputTopic + '#';
globals.camName = '';
globals.displayName = decodeURI(globals.userParam); // set initial name
globals.idTag = globals.timeID + '_' + globals.userParam; // e.g. 1234_eric

if (globals.fixedCamera !== '') {
    globals.camName = 'camera_' + globals.fixedCamera + '_' + globals.fixedCamera;
} else {
    globals.camName = 'camera_' + globals.idTag; // e.g. camera_1234_eric
}

globals.viveLName = 'viveLeft_' + globals.idTag; // e.g. viveLeft_9240_X
globals.viveRName = 'viveRight_' + globals.idTag; // e.g. viveRight_9240_X

globals.newRotation = new THREE.Quaternion();
globals.newPosition = new THREE.Vector3();
globals.vioRotation = new THREE.Quaternion();
globals.vioPosition = new THREE.Vector3();
globals.vioMatrix = new THREE.Matrix4();

/**
 * loads scene objects from specified persistence URL if specified,
 * or globals.persistenceUrl if not
 * @param {string} urlToLoad which url to load arena from
 * @param {object} position initial position
 * @param {object} rotation initial rotation
 */
function loadArena(urlToLoad, position, rotation) {
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

/**
 * deletes scene objects from specified persistence URL if specified,
 * or globals.persistenceUrl if not
 * @param {string} urlToLoad which url to unload arena from
 */
function unloadArena(urlToLoad) {
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

/**
 * Loads and applied scene-options, if it exists, otherwise set to default enviornment
 */
function loadScene() {
    let sceneOptions = {
        jitsiServer: 'mr.andrew.cmu.edu',
    };

    // set renderer defaults that are different from THREE/aframe defaults
    const renderer = document.querySelector('a-scene').renderer;
    renderer.gammaFactor = 2.2;
    renderer.outputEncoding = THREE['sRGBEncoding'];

    const enviornment = document.createElement('a-entity');
    enviornment.id = 'env';

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
                    enviornment.setAttribute('environment', attribute, value);
                }
                document.getElementById('sceneRoot').appendChild(enviornment);

                const rendererSettings = options['renderer-settings'];
                if (rendererSettings) {
                    for (const [attribute, value] of Object.entries(rendererSettings)) {
                        if (attribute === 'outputEncoding') renderer[attribute] = THREE[value];
                        else renderer[attribute] = value;
                    }
                }
            } else {
                // set defaults
                // enviornment.setAttribute('particle-system', 'preset', 'snow');
                // enviornment.setAttribute('particle-system', 'enabled', 'true');
                enviornment.setAttribute('environment', 'preset', 'starry');
                enviornment.setAttribute('environment', 'seed', 3);
                enviornment.setAttribute('environment', 'flatShading', true);
                enviornment.setAttribute('environment', 'groundTexture', 'squares');
                enviornment.setAttribute('environment', 'grid', 'none');
                enviornment.setAttribute('environment', 'fog', 0);
                enviornment.setAttribute('environment', 'fog', 0);
                document.getElementById('sceneRoot').appendChild(enviornment);

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

    // init chat after
    ARENA.Chat.init({
        userid: globals.idTag,
        cameraid: globals.camName,
        username: globals.displayName,
        realm: defaults.realm,
        scene: globals.scenenameParam,
        persist_uri: 'https://' + defaults.persistHost + defaults.persistPath,
        keepalive_interval_ms: 30000,
        mqtt_host: globals.mqttParam,
        mqtt_username: globals.username,
        mqtt_token: globals.mqttToken,
        supportDevFolders: defaults.supportDevFolders,
    });
});
