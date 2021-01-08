/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, THREE, Paho */

import {ARENAEventEmitter} from './event-emitter.js';
import * as ARENAUtils from './utils.js'; 
import {ARENAMqttAPI} from './mqtt.js'
import {ARENAJitsiAPI} from './jitsi.js';
import {setupIcons} from './icons/icons.js';
import {ARENAChat} from './chat/arena-chat.js';

/**
 * ARENA object
 */
 window.ARENA = {
    // arena events target
    events: new ARENAEventEmitter(),
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    // TODO(mwfarb): push per scene themes/styles into json scene object
    updateMillis: ARENAUtils.getUrlParam('camUpdateRate', defaults.updateMillis),
    scenenameParam: ARENAUtils.getSceneName(), // scene
    userParam: ARENAUtils.getUrlParam('name', defaults.userParam),
    startCoords: ARENAUtils.getUrlParam('location', defaults.startCoords).replace(/,/g, ' '),
    weatherParam: ARENAUtils.getUrlParam('weather', defaults.weatherParam),
    mqttParamZ: ARENAUtils.getUrlParam('mqttServer', defaults.mqttParamZ),
    fixedCamera: ARENAUtils.getUrlParam('fixedCamera', defaults.fixedCamera),
    ATLASurl: ARENAUtils.getUrlParam('ATLASurl', defaults.ATLASurl),
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
                    await ARENAUtils.importScript('/apriltag/script.js');
                };
                base64script.src = '/apriltag/base64_binary.js';
                document.head.appendChild(base64script);

                document.addEventListener('mousedown', function(e) {
                    // debug("MOUSEDOWN " + window.ARENA.lastMouseTarget);

                    if (window.ARENA.lastMouseTarget) {
                        // debug("has target: "+window.ARENA.lastMouseTarget);

                        const el = window.ARENA.sceneObjects[window.ARENA.lastMouseTarget];
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
                            'clicker': window.ARENA.camName,
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
                    if (window.ARENA.lastMouseTarget) {
                        const el = window.ARENA.sceneObjects[window.ARENA.lastMouseTarget];
                        const elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        const intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z,
                        };
                        // debug(elPos.x);
                        el.emit('mouseup', {
                            'clicker': window.ARENA.camName,
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

const urlLat = ARENAUtils.getUrlParam('lat');
const urlLong = ARENAUtils.getUrlParam('long');
if (urlLat && urlLong) {
    ARENA.clientCoords = {
        latitude: urlLat,
        longitude: urlLong,
    };
} else {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            ARENA.clientCoords = position.coords;
        });
    }
}

ARENA.persistenceUrl = '//' + defaults.persistHost + defaults.persistPath + ARENA.scenenameParam;
ARENA.mqttParam = 'wss://' + ARENA.mqttParamZ + defaults.mqttPath[Math.floor(Math.random() * defaults.mqttPath.length)];
ARENA.outputTopic = defaults.realm + '/s/' + ARENA.scenenameParam + '/';
ARENA.renderTopic = ARENA.outputTopic + '#';
ARENA.camName = '';
ARENA.displayName = decodeURI(ARENA.userParam); // set initial name
ARENA.idTag = ARENA.timeID + '_' + ARENA.userParam; // e.g. 1234_eric

if (ARENA.fixedCamera !== '') {
    ARENA.camName = 'camera_' + ARENA.fixedCamera + '_' + ARENA.fixedCamera;
} else {
    ARENA.camName = 'camera_' + ARENA.idTag; // e.g. camera_1234_eric
}

ARENA.avatarName = 'avatar_' + ARENA.idTag;
ARENA.viveLName = 'viveLeft_' + ARENA.idTag; // e.g. viveLeft_9240_X
ARENA.viveRName = 'viveRight_' + ARENA.idTag; // e.g. viveRight_9240_X

/**
 * loads scene objects from specified persistence URL if specified,
 * or ARENA.persistenceUrl if not
 * @param {string} urlToLoad which url to load arena from
 * @param {Object} position initial position
 * @param {Object} rotation initial rotation
 */
ARENA.loadArena = (urlToLoad, position, rotation) => {
    
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !defaults.disallowJWT; // Include JWT cookie
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', ARENA.persistenceUrl);

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
                console.log("HERE", obj);
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
                if (obj.object_id === ARENA.camName) {
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

                    ARENA.mqtt.processMessage(msg);
                }
            }
            const l2 = deferredObjects.length;
            for (let i = 0; i < l2; i++) {
                const obj = deferredObjects[i];
                if (obj.attributes.parent === ARENA.camName) {
                    continue; // don't load our own camera/head assembly
                }
                const msg = {
                    object_id: obj.object_id,
                    action: 'create',
                    data: obj.attributes,
                };
                console.log('adding deferred object ' + obj.object_id + ' to parent ' + obj.attributes.parent);
                ARENA.mqtt.processMessage(msg);
            }
        }
    };
};

/**
 * deletes scene objects from specified persistence URL if specified,
 * or ARENA.persistenceUrl if not
 * @param {string} urlToLoad which url to unload arena from
 */
ARENA.unloadArena = (urlToLoad) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !defaults.disallowJWT;
    if (urlToLoad) xhr.open('GET', urlToLoad);
    else xhr.open('GET', ARENA.persistenceUrl);

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
                if (obj.object_id === ARENA.camName) {
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
ARENA.loadScene = () => {
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
    xhr.open('GET', ARENA.persistenceUrl + '?type=scene-options');
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
                    ARENA[attribute] = value;
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

        ARENA.maxAVDist = ARENA.maxAVDist ? ARENA.maxAVDist : 20;

        // initialize Jitsi videoconferencing
        //ARENA.JitsiAPI = await ARENAJitsiAPI(sceneOptions.jitsiServer ? sceneOptions.jitsiServer : 'mr.andrew.cmu.edu');
    };
};

window.addEventListener('onauth', function(e) {
    ARENA.username = e.detail.mqtt_username;
    ARENA.mqttToken = e.detail.mqtt_token;

    ARENA.mqtt = ARENAMqttAPI();
    
    ARENA.mqtt.connect({
        onSuccess: function() {
            console.log('MQTT scene connection success.');
        },
        onFailure: function(res) {
            console.error(`MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
        },
        reconnect: true,
        userName: ARENA.username,
        password: ARENA.mqttToken,
        },
        // last will message
        JSON.stringify({object_id: ARENA.camName, action: 'delete'}),
        // last will topic
        ARENA.outputTopic + ARENA.camName
        );
/*
    // init runtime manager
    ARENA.RuntimeManager.init({
        mqtt_uri: ARENA.mqttParam,
        onInitCallback: function() {
            console.log('Runtime init done.');
        },
        name: 'rt-' + Math.round(Math.random() * 10000) + '-' + ARENA.username,
        dbg: false,
        mqtt_username: ARENA.username,
        mqtt_token: ARENA.mqttToken,
    });
*/
    // init chat after
    ARENA.chat = new ARENAChat({
        userid: ARENA.idTag,
        cameraid: ARENA.camName,
        username: ARENA.displayName,
        realm: defaults.realm,
        scene: ARENA.scenenameParam,
        persist_uri: 'https://' + defaults.persistHost + defaults.persistPath,
        keepalive_interval_ms: 30000,
        mqtt_host: ARENA.mqttParam,
        mqtt_username: ARENA.username,
        mqtt_token: ARENA.mqttToken,
        supportDevFolders: defaults.supportDevFolders,
    });
    ARENA.chat.start();

    // initialize face tracking if not on mobile
    if (!AFRAME.utils.device.isMobile()) {
        const displayBbox = false;
        const flipped = false;
        ARENA.FaceTracker.init(displayBbox, flipped);
    }

    setupIcons();
});