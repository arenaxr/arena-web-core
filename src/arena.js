/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import {ARENAEventEmitter} from './event-emitter.js';
import * as ARENAUtils from './utils.js';
import {ARENAMqttAPI} from './mqtt.js'
import {ARENAJitsiAPI} from './jitsi.js';
import {setupIcons} from './icons/icons.js';
import {ARENAChat} from './chat/arena-chat.js';

/**
 * ARENA object
 */
window.ARENA = {};

ARENA.events = new ARENAEventEmitter(); // arena events target
ARENA.timeID = new Date().getTime() % 10000;
ARENA.sceneObjects = new Map();
ARENA.updateMillis = ARENAUtils.getUrlParam('camUpdateRate', defaults.updateMillis);
ARENA.scenenameParam = ARENAUtils.getSceneName(); // scene
ARENA.userParam = ARENAUtils.getUrlParam('name', defaults.userParam);
ARENA.startCoords = ARENAUtils.getUrlParam('location', defaults.startCoords).replace(/,/g, ' ');

ARENA.mqttParamZ = ARENAUtils.getUrlParam('mqttServer', defaults.mqttParamZ);
ARENA.fixedCamera = ARENAUtils.getUrlParam('fixedCamera', defaults.fixedCamera);
ARENA.ATLASurl = ARENAUtils.getUrlParam('ATLASurl', defaults.ATLASurl);
ARENA.localVideoWidth = AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300;
ARENA.latencyTopic = defaults.latencyTopic;

ARENA.persistenceUrl = '//' + defaults.persistHost + defaults.persistPath + ARENA.scenenameParam;
ARENA.mqttParam = 'wss://' + ARENA.mqttParamZ + defaults.mqttPath[Math.floor(Math.random() * defaults.mqttPath.length)];

ARENA.outputTopic = defaults.realm + '/s/' + ARENA.scenenameParam + '/';
ARENA.vioTopic = defaults.vioTopic;
ARENA.renderTopic = ARENA.outputTopic + '#';

ARENA.idTag = ARENA.timeID + '_' + ARENA.userParam; // e.g. 1234_eric

ARENA.camName = '';
if (ARENA.fixedCamera !== '') {
    ARENA.camName = 'camera_' + ARENA.fixedCamera + '_' + ARENA.fixedCamera;
} else {
    ARENA.camName = 'camera_' + ARENA.idTag; // e.g. camera_1234_eric
}

ARENA.faceName = 'face_' + ARENA.idTag; // e.g. face_9240_X
ARENA.avatarName = 'avatar_' + ARENA.idTag; // e.g. avatar_9240_X
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
 * Loads and applied scene-options (if it exists), otherwise set to default enviornment
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
                const sceneRoot = document.getElementById('sceneRoot');

                // enviornment.setAttribute('particle-system', 'preset', 'snow');
                // enviornment.setAttribute('particle-system', 'enabled', 'true');
                enviornment.setAttribute('environment', 'preset', 'starry');
                enviornment.setAttribute('environment', 'seed', 3);
                enviornment.setAttribute('environment', 'flatShading', true);
                enviornment.setAttribute('environment', 'groundTexture', 'squares');
                enviornment.setAttribute('environment', 'grid', 'none');
                enviornment.setAttribute('environment', 'fog', 0);
                enviornment.setAttribute('environment', 'fog', 0);
                sceneRoot.appendChild(enviornment);

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

                sceneRoot.appendChild(light);
                sceneRoot.appendChild(light1);
            }
        }

        ARENA.maxAVDist = ARENA.maxAVDist ? ARENA.maxAVDist : 20;
    };
};

window.addEventListener('onauth', function(e) {
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
        username: ARENAUtils.getDisplayName(),
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
