/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { ARENAUtils } from './utils.js';
import { ARENAMqtt } from './mqtt.js';
import { ARENAJitsi } from './jitsi.js';
import { ARENAChat } from './chat/';
import { ARENAEventEmitter } from './event-emitter.js';
import { SideMenu } from './icons/';
import { RuntimeMngr } from './runtime-mngr';
import Swal from 'sweetalert2';

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
        this.camUpdateIntervalMs = ARENAUtils.getUrlParam('camUpdateIntervalMs', this.defaults.camUpdateIntervalMs);
        this.startCoords = ARENAUtils.getUrlParam('startCoords', undefined); // leave undefined if URL parameter not given
        // query string start coords given as a comma-separated string, e.g.: 'startCoords=0,1.6,0'
        if (this.startCoords) this.startCoords = this.startCoords.replace(/,/g, ' ');
        this.ATLASurl = ARENAUtils.getUrlParam('ATLASurl', this.defaults.ATLASurl);
        this.localVideoWidth = AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300;
        this.latencyTopic = this.defaults.latencyTopic;
        this.clientCoords = ARENAUtils.getLocation();

        // set scene name from url
        this.setSceneName();

        // set user name from url params or defaults
        this.setUserName();

        // set mqttHost and mqttHostURI from url params or defaults
        this.setmqttHost()

        // setup event listner
        this.events.on(ARENAEventEmitter.events.ONAUTH, this.onAuth.bind(this));
    }

    /**
     * Sets this.userName using name given as argument, url parameter value, or default
     * @param {string} name user name to set; will use url parameter value or default is no name is given
     */
    setUserName = (name = undefined) => {
        // set userName
        if (name == undefined) name = ARENAUtils.getUrlParam('name', this.defaults.userName); // check url params, defaults
        this.userName = name;
    }

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, viveLName, viveRName which depend on idTag
     * @param {string} name user name to set; will use url parameter value or default is no name is given
     */
    setIdTag = (idTag = undefined) => {
        if (idTag == undefined) throw "setIdTag: idTag not defined."; // idTag must be set
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
        this.viveLName = 'viveLeft_' + this.idTag; // e.g. viveLeft_9240_X
        this.viveRName = 'viveRight_' + this.idTag; // e.g. viveRight_9240_X
    }

    /**
     * Sets this.sceneName from url. Includes namespace prefix (e.g. `namespace/foo`)
     * Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
     * Also sets persistenceUrl, outputTopic, renderTopic, vioTopic which depend on scene name
     */
    setSceneName = () => {
        let path = window.location.pathname.substring(1);
        let { namespace: namespace, sceneName: scenename } = this.defaults;
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
        // Sets namespace, persistenceUrl, outputTopic, renderTopic, vioTopic
        this.nameSpace = namespace;
        this.persistenceUrl = '//' + this.defaults.persistHost + this.defaults.persistPath + this.sceneName;
        this.outputTopic = this.defaults.realm + '/s/' + this.sceneName + '/';
        this.renderTopic = this.outputTopic + '#';
        this.vioTopic = this.defaults.realm + '/vio/' + this.sceneName + '/';
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
     * scene init before starting to receive messages
     */
    initScene = () => {
        // add our camera to scene

        // after scene is completely loaded, add user camera
        this.events.on(ARENAEventEmitter.events.SCENE_LOADED, () => {
            let color = Math.floor(Math.random() * 16777215).toString(16);
            if (color.length < 6) color = "0" + color;
            color = '#' + color

            const camera = document.getElementById('my-camera');
            camera.setAttribute('arena-camera', 'enabled', true);
            camera.setAttribute('arena-camera', 'color', color);
            camera.setAttribute('arena-camera', 'displayName', ARENA.getDisplayName());

            // try to define starting position if the scene has startPosition objects
            if (!ARENA.startCoords) {
                // get startPosition objects
                const startPositions = Array.from(document.querySelectorAll('[id^="startPosition"]'));
                if (startPositions.length > 0) {
                    let posi = Math.floor(Math.random() * startPositions.length);
                    ARENA.startCoords = startPositions[posi].getAttribute('position');
                    // also set rotation
                    camera.setAttribute('position', startPositions[posi].getAttribute('rotation'));
                }
            }
            if (!ARENA.startCoords) ARENA.startCoords = ARENA.defaults.startCoords; // default position
            console.log("startCoords", ARENA.startCoords);
            camera.setAttribute('position', ARENA.startCoords); // an x, y, z object or a space-separated string

            // enable vio if fixedCamera is given
            if (ARENA.fixedCamera !== '') {
                camera.setAttribute('arena-camera', 'vioEnabled', true);
            }

        });

        // load scene
        ARENA.loadSceneOptions();
        ARENA.loadScene();

        //setTimeout(async () => {
        //}, 1000);
    }

    /**
     * loads scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to load arena from
     * @param {Object} position initial position
     * @param {Object} rotation initial rotation
     */
    loadScene = (urlToLoad, position, rotation) => {

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT; // Include JWT cookie
        if (urlToLoad) xhr.open('GET', urlToLoad);
        else xhr.open('GET', this.persistenceUrl);
        xhr.send();
        xhr.responseType = 'json';
        const deferredObjects = [];
        const Parents = {};
        xhr.onload = () => {
            if (xhr.status !== 200) {
                Swal.fire({
                    title: 'Error loading initial scene data',
                    text:  `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`,
                    icon: 'error',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                });
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
                        // construct program object for rt manager request
                        const pobj = {
                            'object_id': obj.object_id,
                            'action': 'create',
                            'type': 'program',
                            'data': obj.attributes,
                        };
                        // arena variables that are replaced; keys are the variable names e.g. ${scene}, ${cameraid}, ...
                        const avars = {
                            scene: ARENA.sceneName,
                            cameraid: ARENA.camName,
                            username: ARENA.getDisplayName,
                            mqtth: ARENA.mqttHost
                        };
                        // ask runtime manager to start this program
                        this.RuntimeManager.createModule(pobj, avars);
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
                            type: obj.type,
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
                            msg.data.rotation = r;
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
                        type: obj.type,
                        data: obj.attributes,
                    };
                    console.log('adding deferred object ' + obj.object_id + ' to parent ' + obj.attributes.parent);
                    this.Mqtt.processMessage(msg);
                }
                ARENA.events.emit(ARENAEventEmitter.events.SCENE_LOADED, true);
            }
        };
    };

    /**
     * deletes scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to unload arena from
     */
    unloadArenaScene = (urlToLoad) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT;
        if (urlToLoad) xhr.open('GET', urlToLoad);
        else xhr.open('GET', this.persistenceUrl);
        xhr.send();
        xhr.responseType = 'json';
        xhr.onload = () => {
            if (xhr.status !== 200) {
                Swal.fire({
                    title: 'Error loading initial scene data',
                    text:  `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`,
                    icon: 'error',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                });
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
     * Loads and applies scene-options (if it exists), otherwise set to default environment
     */
    loadSceneOptions = () => {
        let sceneOptions = {
            jitsiServer: ARENA.defaults.jitsiHost,
        };

        // we add all elements to our scene root
        const sceneRoot = document.getElementById('sceneRoot');

        // set renderer defaults that are different from THREE/aframe defaults
        const renderer = document.querySelector('a-scene').renderer;
        renderer.gammaFactor = 2.2;
        renderer.outputEncoding = THREE['sRGBEncoding'];

        const environment = document.createElement('a-entity');
        environment.id = 'env';

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT;
        xhr.open('GET', this.persistenceUrl + '?type=scene-options');
        xhr.send();
        xhr.responseType = 'json';
        xhr.onload = async () => {
            if (xhr.status !== 200 || xhr.response == undefined) {
                console.log(`No scene-options object found: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
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
                        environment.setAttribute('environment', attribute, value);
                    }
                    sceneRoot.appendChild(environment);

                    const rendererSettings = options['renderer-settings'];
                    if (rendererSettings) {
                        for (const [attribute, value] of Object.entries(rendererSettings)) {
                            if (attribute === 'outputEncoding') renderer[attribute] = THREE[value];
                            else renderer[attribute] = value;
                        }
                    }
                } else {
                    // set defaults
                    environment.setAttribute('environment', 'preset', 'starry');
                    environment.setAttribute('environment', 'seed', 3);
                    environment.setAttribute('environment', 'flatShading', true);
                    environment.setAttribute('environment', 'groundTexture', 'squares');
                    environment.setAttribute('environment', 'grid', 'none');
                    environment.setAttribute('environment', 'fog', 0);
                    environment.setAttribute('environment', 'fog', 0);
                    sceneRoot.appendChild(environment);

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

            this.sceneOptions = sceneOptions;
        };
    };

    /**
     * When user auth is done, startup mqtt, runtime, chat and other ui elements;
     * Remaining init will be done once mqtt connection is done
     */
    onAuth = async (e) => {
        const args = e.detail;

        this.username = args.mqtt_username;
        this.mqttToken = args.mqtt_token;

        // match name on the end of the id tag
        this.setUserName(args.mqtt_username);

        // id tag including name is set from authentication service
        this.setIdTag(args.ids.userid);

        this.Mqtt = ARENAMqtt.init(); // mqtt API (after this.* above, are defined)
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
            JSON.stringify({ object_id: this.camName, action: 'delete' }),
            // last will topic
            this.outputTopic + this.camName,
        );

        // init runtime manager
        this.RuntimeManager = RuntimeMngr;
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

        // init chat after
        this.chat = new ARENAChat({
            userid: this.idTag,
            cameraid: this.camName,
            username: this.getDisplayName(),
            realm: this.defaults.realm,
            namespace: this.nameSpace,
            scene: this.sceneName,
            persist_uri: 'https://' + this.defaults.persistHost + this.defaults.persistPath,
            keepalive_interval_ms: 30000,
            mqtt_host: this.mqttHostURI,
            mqtt_username: this.username,
            mqtt_token: this.mqttToken,
            supportDevFolders: this.defaults.supportDevFolders,
        });
        this.chat.start();

        window.setupAV(() => {
            // initialize Jitsi videoconferencing
            this.Jitsi = ARENAJitsi.init(this.sceneOptions.jitsiServer);
        });

        // initialize face tracking if not on mobile
        if (this.FaceTracker && !AFRAME.utils.device.isMobile()) {
            const displayBbox = false;
            const flipped = true;
            this.FaceTracker.init(displayBbox, flipped);
        }

        SideMenu.setupIcons();

        console.log("ARENA Started; ARENA=", ARENA);
    }
}

/**
 * ARENA global object
 */
module.exports = window.ARENA = Arena.init();
