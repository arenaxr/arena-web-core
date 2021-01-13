/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import {ARENAUtils} from './utils.js';
import {ARENAMqtt} from './mqtt.js';
import {ARENAJitsi} from './jitsi.js';
import {ARENAChat} from './chat/';
import {ARENAEventEmitter} from './event-emitter.js';
import {SideMenu} from './icons/';

/**
 * Arena Object
 */
export class Arena {

    static init() {
        return new Arena();
    }

    /**
     * Constructor; init arena properties
     */
    constructor() {
        this.defaults = ARENADefaults; // "get" arena defaults
        this.events = new ARENAEventEmitter(); // arena events target
        this.timeID = new Date().getTime() % 10000;
        this.sceneObjects = new Map();
        this.camUpdateIntervalMs = ARENAUtils.getUrlParam('camUpdateIntervalMs', this.defaults.camUpdateIntervalMs);
        this.startCoords = ARENAUtils.getUrlParam('startCoords', this.defaults.startCoords).replace(/,/g, ' ');
        this.ATLASurl = ARENAUtils.getUrlParam('ATLASurl', this.defaults.ATLASurl);
        this.localVideoWidth = AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300;
        this.latencyTopic = this.defaults.latencyTopic;
        this.vioTopic = this.defaults.vioTopic;

        // set scene name from url
        this.setSceneName();

        // set user name from url params or defaults
        this.setUserName();

        // set mqttHost and mqttHostURI from url params or defaults
        this.setmqttHost()

        //console.log(ARENA);

        // setup event listner
        this.events.on(ARENAEventEmitter.events.ONAUTH, this.onAuth.bind(this));
    }

    /**
     * Sets this.userName using name given as argument, url parameter value, or default
     * Important: Also sets idTag which depends on user name (and other properties that depend on idTag)
     * @param {string} name user name to set; will use url parameter value or default is no name is given
     */
    setUserName = (name=undefined) => {
        // set userName
        if (name == undefined) name = ARENAUtils.getUrlParam('name', this.defaults.userName); // check url params, defaults
        this.userName = name;

        // set idTag (based on userName)
        this.setIdTag();
    }

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, avatarName, viveLName, viveRName which depend on idTag
     * Important: User name must be set
     * @param {string} name user name to set; will use url parameter value or default is no name is given
     */
    setIdTag = (idTag=undefined) => {
        if (this.userName == undefined) throw "setIdTag: user name not defined."; // user name must be set
        if (idTag == undefined) idTag = new Date().getTime() % 10000 + '_' + this.userName; // e.g. 1234_eric
        this.idTag = idTag;

        // set camName
        this.camName = 'camera_' + this.idTag; // e.g. camera_1234_eric
        // if fixedCamera is given, then camName must be set accordingly
        this.fixedCamera = ARENAUtils.getUrlParam('fixedCamera', '');
        if (this.fixedCamera !== '') {
            this.camName = this.fixedCamera;
        }

        // set faceName, avatarName, viveLName, viveRName which depend on user name
        this.faceName = 'face_' + this.idTag; // e.g. face_9240_X
        this.avatarName = 'avatar_' + this.idTag; // e.g. avatar_9240_X
        this.viveLName = 'viveLeft_' + this.idTag; // e.g. viveLeft_9240_X
        this.viveRName = 'viveRight_' + this.idTag; // e.g. viveRight_9240_X
    }

    /**
     * Sets this.sceneName from url. Includes namespace prefix (e.g. `namespace/foo`)
     * Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
     * Also sets persistenceUrl, outputTopic, renderTopic which depend on scene name
     */
    setSceneName = () => {
        let path = window.location.pathname.substring(1);
        let {namespace: namespace, sceneName: scenename} = this.defaults;
        if (this.defaults.supportDevFolders && path.length > 0) {
            const devPrefix = path.match(/(?:x|dev)\/([^\/]+)\/?/g);
            if (devPrefix) {
                path = path.replace(devPrefix[0], '');
            }
        }
        if (path === '' || path === 'index.html') {
            scenename = ARENAUtils.getUrlParam('scene', scenename);
            this.sceneName = `${namespace}/${scenename}`;
        } else {
            try {
                const r = new RegExp(/^(?<namespace>[^\/]+)(\/(?<scenename>[^\/]+))?/g);
                const matches = r.exec(path).groups;
                // Only first group is given, namespace is actually the scene name
                if (matches.scenename === undefined) {
                    scenename = matches.namespace;
                    this.sceneName = `${namespace}/${scenename}`;
                } else {
                    // Both scene and namespace are defined, return regex as-is
                    this.sceneName = `${matches.namespace}/${matches.scenename}`;
                }
            } catch (e) {
                scenename = ARENAUtils.getUrlParam('scene', scenename);
                this.sceneName = `${namespace}/${scenename}`;
            }
        }
        // Sets persistenceUrl, outputTopic, renderTopic
        this.persistenceUrl = '//' + this.defaults.persistHost + this.defaults.persistPath + this.sceneName;
        this.outputTopic = this.defaults.realm + '/s/' + this.sceneName + '/';
        this.renderTopic = this.outputTopic + '#';
    }

    /**
     * Sets this.mqttHost and this.mqttHostURI from url params or defaults
     */
    setmqttHost = () => {
        this.mqttHost = ARENAUtils.getUrlParam('mqttHost', this.defaults.mqttHost);
        this.mqttHostURI = 'wss://' + this.mqttHost + this.defaults.mqttPath[Math.floor(Math.random() * this.defaults.mqttPath.length)];
    }

    /**
     * Gets display name either from local storage or from userName
     * @return {string} display name
     */
    getDisplayName = () => {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(this.userName);
        return displayName;
    };

    /**
     * loads scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to load arena from
     * @param {Object} position initial position
     * @param {Object} rotation initial rotation
     */
    loadArena = (urlToLoad, position, rotation) => {

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT; // Include JWT cookie
        if (urlToLoad) xhr.open('GET', urlToLoad);
        else xhr.open('GET', this.persistenceUrl);

        xhr.responseType = 'json';
        xhr.send();
        const deferredObjects = [];
        const Parents = {};
        xhr.onload = () => {
            if (xhr.status !== 200) {
                alert(`Error loading initial scene data: ${xhr.status}: ${xhr.statusText}`);
            } else {
                if (xhr.response == undefined) {
                    console.error("No scene objects found in persistence.")
                    return;
                }
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
                        // this.RuntimeManager.createModule(pobj);
                        continue;
                    }
                    if (obj.object_id === this.camName) {
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

                        this.Mqtt.processMessage(msg);
                    }
                }
                const l2 = deferredObjects.length;
                for (let i = 0; i < l2; i++) {
                    const obj = deferredObjects[i];
                    if (obj.attributes.parent === this.camName) {
                        continue; // don't load our own camera/head assembly
                    }
                    const msg = {
                        object_id: obj.object_id,
                        action: 'create',
                        data: obj.attributes,
                    };
                    console.log('adding deferred object ' + obj.object_id + ' to parent ' + obj.attributes.parent);
                    this.Mqtt.processMessage(msg);
                }
            }
        };
    };

    /**
     * deletes scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to unload arena from
     */
    unloadArena = (urlToLoad) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT;
        if (urlToLoad) xhr.open('GET', urlToLoad);
        else xhr.open('GET', this.persistenceUrl);

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
                    if (obj.object_id === this.camName) {
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
    loadScene = () => {
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
        xhr.withCredentials = !this.defaults.disallowJWT;
        xhr.open('GET', this.persistenceUrl + '?type=scene-options');
        xhr.responseType = 'json';
        xhr.send();
        xhr.onload = async () => {
            if (xhr.status !== 200 || xhr.response == undefined) {
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

            this.maxAVDist = this.maxAVDist ? this.maxAVDist : 20;

            // initialize Jitsi videoconferencing
            this.Jitsi = ARENAJitsi.init(sceneOptions.jitsiServer);
        };
    };

    /**
     * When user auth is done, startup mqtt, runtime, chat and other ui elements;
     * Remaining init will be done once mqtt connection is done
     */
    onAuth = async (e) => {
        this.clientCoords = ARENAUtils.getLocation();

        this.Mqtt = ARENAMqtt.init(); // mqtt API (after this.* above, are defined)

        this.username = e.detail.mqtt_username;
        this.mqttToken = e.detail.mqtt_token;

        this.Mqtt.connect({
            onSuccess: function() {
                console.log('MQTT scene connection success.');
            },
            onFailure: function(res) {
                console.error(`MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
            },
            reconnect: true,
            userName: this.username,
            password: this.mqttToken,
        },
        // last will message
        JSON.stringify({object_id: this.camName, action: 'delete'}),
        // last will topic
        this.outputTopic + this.camName,
        );
        /*
        // init runtime manager
        this.RuntimeManager.init({
            mqtt_uri: this.mqttHostURI,
            onInitCallback: function() {
                console.log('Runtime init done.');
            },
            name: 'rt-' + Math.round(Math.random() * 10000) + '-' + this.username,
            dbg: false,
            mqtt_username: this.username,
            mqtt_token: this.mqttToken,
        });
        */

        console.log(ARENA.defaults, this.getDisplayName());
        // init chat after
        this.chat = new ARENAChat({
            userid: this.idTag,
            cameraid: this.camName,
            username: this.getDisplayName(),
            realm: this.defaults.realm,
            scene: this.sceneName,
            persist_uri: 'https://' + this.defaults.persistHost + this.defaults.persistPath,
            keepalive_interval_ms: 30000,
            mqtt_host: this.mqttHostURI,
            mqtt_username: this.username,
            mqtt_token: this.mqttToken,
            supportDevFolders: this.defaults.supportDevFolders,
        });
        this.chat.start();

        // initialize face tracking if not on mobile
        if (this.FaceTracker && !AFRAME.utils.device.isMobile()) {
            const displayBbox = false;
            const flipped = true;
            this.FaceTracker.init(displayBbox, flipped);
        }

        SideMenu.setupIcons();
    }
}

/**
 * ARENA global object
 */
module.exports = window.ARENA = Arena.init();
