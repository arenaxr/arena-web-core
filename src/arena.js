/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */
import {ARENAMqttConsole} from './arena-console.js';
import {ARENAUtils} from './utils.js';
import {ARENAMqtt} from './mqtt.js';
import {ARENAJitsi} from './jitsi.js';
import {ARENAChat} from './chat/';
import {ARENAEventEmitter} from './event-emitter.js';
import {SideMenu} from './icons/';
import {RuntimeMngr} from './runtime-mngr';
import Swal from 'sweetalert2';

/* global ARENA */


/**
 * Arena Object
 */
export class Arena {
    /**
     * Factory for ARENA
     * @return {Arena}
     */
    static init() {
        return new Arena();
    }

    /**
     * Constructor; init arena properties
     */
    constructor() {
        // replace console with our logging (only when not in dev)
        if (!ARENADefaults.devInstance) {
            // will queue messages until MQTT connection is available (indicated by console.setOptions())
            ARENAMqttConsole.init();
        }
        this.defaults = ARENADefaults; // "get" arena defaults
        this.events = new ARENAEventEmitter(); // arena events target
        this.timeID = new Date().getTime() % 10000;
        this.camUpdateIntervalMs = ARENAUtils.getUrlParam('camUpdateIntervalMs', this.defaults.camUpdateIntervalMs);
        this.startCoords = ARENAUtils.getUrlParam('startCoords', undefined); // leave undefined if not specified
        // query string start coords given as a comma-separated string, e.g.: 'startCoords=0,1.6,0'
        if (this.startCoords) {
            this.startCoords = this.startCoords.split(',').map((i) => Number(i));
        }
        this.jitsiHost = this.defaults.jitsiHost;
        this.ATLASurl = ARENAUtils.getUrlParam('ATLASurl', this.defaults.ATLASurl);
        this.localVideoWidth = AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300;
        this.latencyTopic = this.defaults.latencyTopic;
        ARENAUtils.getLocation((coords, err) => {
            if (!err) ARENA.clientCoords = coords;
        });
        this.maxAVDist = 20;

        // set scene name from url
        this.setSceneName();

        // set user name from url params or defaults
        this.setUserName();

        // set mqttHost and mqttHostURI from url params or defaults
        this.setmqttHost();

        // setup event listener
        this.events.on(ARENAEventEmitter.events.ONAUTH, this.onAuth.bind(this));
        this.events.on(ARENAEventEmitter.events.NEW_SETTINGS, (e) => {
            const args = e.detail;
            if (!args.userName) return; // only handle a user name change
            this.showEchoDisplayName();
        });
        this.events.on(ARENAEventEmitter.events.DOMINANT_SPEAKER, (e) => {
            const speaker = (!e.detail.id || e.detail.id === this.idTag); // self is speaker
            this.showEchoDisplayName(speaker);
        });
    }

    /**
     * Sets this.userName using name given as argument, url parameter value, or default
     * @param {string} name user name to set; will use url parameter value or default is no name is given
     */
    setUserName(name = undefined) {
        // set userName
        if (name === undefined) {
            name = ARENAUtils.getUrlParam('name', this.defaults.userName);
        } // check url params, defaults
        this.userName = name;
    }

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, handLName, handRName which depend on idTag
     * @param {string} idTag user name to set; will use url parameter value or default is no name is given
     */
    setIdTag(idTag = undefined) {
        if (idTag === undefined) throw 'setIdTag: idTag not defined.'; // idTag must be set
        this.idTag = idTag;

        // set camName
        this.camName = 'camera_' + this.idTag; // e.g. camera_1234_eric
        // if fixedCamera is given, then camName must be set accordingly
        this.fixedCamera = ARENAUtils.getUrlParam('fixedCamera', '');
        if (this.fixedCamera !== '') {
            this.camName = this.fixedCamera;
        }

        // set faceName, avatarName, handLName, handRName which depend on user name
        this.faceName = 'face_' + this.idTag; // e.g. face_9240_X
        this.handLName = 'handLeft_' + this.idTag; // e.g. handLeft_9240_X
        this.handRName = 'handRight_' + this.idTag; // e.g. handRight_9240_X
    }

    /**
     * Sets this.sceneName and this.namespacedScene from url. this.namespacedScene
     * includes namespace prefix (e.g. `namespace/foo`)
     * Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
     * Also sets persistenceUrl, outputTopic, renderTopic, vioTopic which depend on scene name
     */
    setSceneName() {
        // private function to set scenename, namespacedScene and namespace
        const _setNames = (ns, sn) => {
            this.namespacedScene = `${ns}/${sn}`;
            this.sceneName = sn;
            this.nameSpace = ns;
        };
        let path = window.location.pathname.substring(1);
        let {namespace: namespace, sceneName: scenename} = this.defaults;
        if (this.defaults.devInstance && path.length > 0) {
            const devPrefix = path.match(/(?:x|dev)\/([^\/]+)\/?/g);
            if (devPrefix) {
                path = path.replace(devPrefix[0], '');
            }
        }
        if (path === '' || path === 'index.html') {
            scenename = ARENAUtils.getUrlParam('scene', scenename);
            _setNames(namespace, scenename);
        } else {
            try {
                const r = new RegExp(/^(?<namespace>[^\/]+)(\/(?<scenename>[^\/]+))?/g);
                const matches = r.exec(path).groups;
                // Only first group is given, namespace is actually the scene name
                if (matches.scenename === undefined) {
                    _setNames(namespace, matches.namespace);
                } else {
                    // Both scene and namespace are defined, return regex as-is
                    _setNames(matches.namespace, matches.scenename);
                }
            } catch (e) {
                scenename = ARENAUtils.getUrlParam('scene', scenename);
                _setNames(namespace, scenename);
            }
        }
        // Sets namespace, persistenceUrl, outputTopic, renderTopic, vioTopic
        this.persistenceUrl = '//' + this.defaults.persistHost + this.defaults.persistPath + this.namespacedScene;
        this.outputTopic = this.defaults.realm + '/s/' + this.namespacedScene + '/';
        this.renderTopic = this.outputTopic + '#';
        this.vioTopic = this.defaults.realm + '/vio/' + this.namespacedScene + '/';
    }

    /**
     * Sets this.mqttHost and this.mqttHostURI from url params or defaults
     */
    setmqttHost() {
        this.mqttHost = ARENAUtils.getUrlParam('mqttHost', this.defaults.mqttHost);
        this.mqttHostURI = 'wss://' + this.mqttHost + this.defaults.mqttPath[Math.floor(Math.random() * this.defaults.mqttPath.length)];
    }

    /**
     * Gets display name either from local storage or from userName
     * @return {string} display name
     */
    getDisplayName() {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(this.userName);
        return displayName;
    };

    /**
     * Checks loaded MQTT/Jitsi token for Jitsi video conference permission.
     * @param {string} mqttToken The JWT token for the user to connect to MQTT/Jitsi.
     * @return {boolean} True if the user has permission to stream audio/video in this scene.
     */
    isJitsiPermitted(mqttToken) {
        if (mqttToken) {
            const tokenObj = KJUR.jws.JWS.parse(mqttToken);
            const perms = tokenObj.payloadObj;
            if (perms.room) return true;
        }
        return false;
    }

    /**
     * Renders/updates the display name in the top left corner of a scene.
     * @param {boolean} speaker If the user is the dominant speaker
     */
    showEchoDisplayName = (speaker = false) => {
        const url = new URL(window.location.href);
        const noname = url.searchParams.get('noname');
        const echo = document.getElementById('echo-name');
        echo.textContent = localStorage.getItem('display_name');
        if (!noname) {
            if (speaker) {
                echo.style.backgroundColor = '#0F08'; // green alpha
            } else {
                echo.style.backgroundColor = '#0008'; // black alpha
            }
            echo.style.display = 'block';
        } else {
            echo.style.display = 'none';
        }
    };

    /**
     * scene init before starting to receive messages
     */
    initScene = () => {
        // load scene
        ARENA.loadSceneOptions();

        this.events.on(ARENAEventEmitter.events.SCENE_OPT_LOADED, () => {
            ARENA.loadSceneObjects();
        });

        // after scene is completely loaded, add user camera
        this.events.on(ARENAEventEmitter.events.SCENE_OBJ_LOADED, () => {
            ARENA.loadUser();
        });
    }

    /**
     * loads this user's presence and camera
     */
    loadUser() {
        const systems = AFRAME.scenes[0].systems;
        let color = Math.floor(Math.random() * 16777215).toString(16);
        if (color.length < 6) color = '0' + color;
        color = '#' + color;

        const camera = document.getElementById('my-camera');
        camera.setAttribute('arena-camera', 'enabled', true);
        camera.setAttribute('arena-camera', 'color', color);
        camera.setAttribute('arena-camera', 'displayName', ARENA.getDisplayName());

        const startPos = new THREE.Vector3;
        if (ARENA.startCoords) {
            startPos.set(...ARENA.startCoords);
            camera.object3D.position.copy(startPos);
            camera.object3D.position.y += ARENA.defaults.camHeight;
            ARENA.startCoords = startPos;
        } else if (ARENAUtils.getUrlParam('startLastPos', false)) {
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            const lastPos = sceneHist[ARENA.namespacedScene]?.lastPos;
            if (lastPos) {
                startPos.copy(lastPos);
                camera.object3D.position.copy(startPos);
                camera.object3D.position.y += ARENA.defaults.camHeight;
                ARENA.startCoords = startPos;
            }
        }
        // Fallthrough failure if startLastPos fails
        if (!ARENA.startCoords && systems.landmark) {
            // Try to define starting position if the scene has startPosition objects
            const startPosition = systems.landmark.getRandom(true);
            if (startPosition) {
                console.log('Moving camera to start position', startPosition.el.id);
                startPosition.teleportTo();
                startPos.copy(camera.object3D.position);
                startPos.y -= ARENA.defaults.camHeight;
                ARENA.startCoords = startPos;
            }
        }
        if (!ARENA.startCoords) { // Final fallthrough for failures
            ARENA.startCoords = ARENA.defaults.startCoords; // default position
            const navSys = systems.nav;
            startPos.copy(ARENA.startCoords);
            if (navSys.navMesh) {
                try {
                    const closestGroup = navSys.getGroup(startPos, false);
                    const closestNode = navSys.getNode(startPos, closestGroup, false);
                    navSys.clampStep(startPos, startPos, closestGroup, closestNode, startPos);
                } catch {}
            }
            camera.object3D.position.copy(startPos);
            camera.object3D.position.y += ARENA.defaults.camHeight;
        }
        // enable vio if fixedCamera is given
        if (ARENA.fixedCamera !== '') {
            camera.setAttribute('arena-camera', 'vioEnabled', true);
        }
        SideMenu.setupIcons();
    }

    /**
     * loads scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to load arena from
     * @param {Object} position initial position
     * @param {Object} rotation initial rotation
     */
    loadSceneObjects(urlToLoad, position, rotation) {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !this.defaults.disallowJWT; // Include JWT cookie
        if (urlToLoad) xhr.open('GET', urlToLoad);
        else xhr.open('GET', this.persistenceUrl);
        xhr.send();
        xhr.responseType = 'json';
        const deferredObjects = [];
        xhr.onload = () => {
            if (xhr.status !== 200) {
                Swal.fire({
                    title: 'Error loading initial scene data',
                    text: `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`,
                    icon: 'error',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                });
            } else {
                if (xhr.response === undefined || xhr.response.length === 0) {
                    console.error('No scene objects found in persistence.');
                    ARENA.events.emit(ARENAEventEmitter.events.SCENE_OBJ_LOADED, true);
                    return;
                }
                const arenaObjects = xhr.response;
                for (let i = 0; i < arenaObjects.length; i++) {
                    const obj = arenaObjects[i];
                    if (obj.type === 'program') {
                        // construct program object for rt manager request
                        const pobj = {
                            'object_id': obj.object_id,
                            'action': 'create',
                            'type': 'program',
                            'data': obj.attributes,
                        };
                        // arena variables that are replaced; keys are the variable names e.g. ${scene},${cameraid}, ...
                        const avars = {
                            scene: ARENA.sceneName,
                            namespace: ARENA.nameSpace,
                            cameraid: ARENA.camName,
                            username: ARENA.getDisplayName,
                            mqtth: ARENA.mqttHost,
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
                for (let i = 0; i < deferredObjects.length; i++) {
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
                    console.info('adding deferred object ' + obj.object_id + ' to parent ' + obj.attributes.parent);
                    this.Mqtt.processMessage(msg);
                }
                window.setTimeout(() => ARENA.events.emit(ARENAEventEmitter.events.SCENE_OBJ_LOADED, true), 500);
            }
        };
    };

    /**
     * deletes scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to unload arena from
     */
    unloadArenaScene(urlToLoad) {
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
                    text: `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`,
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
    loadSceneOptions() {
        const sceneOptions = {};

        // we add all elements to our scene root
        const sceneRoot = document.getElementById('sceneRoot');

        // set renderer defaults that are different from THREE/aframe defaults
        const renderer = document.querySelector('a-scene').renderer;
        renderer.gammaFactor = 2.2;
        renderer.outputEncoding = THREE['sRGBEncoding'];

        const environment = document.createElement('a-entity');
        environment.id = 'env';

        fetch(`${this.persistenceUrl}?type=scene-options`, {
            method: 'GET',
            credentials: this.defaults.disallowJWT ? 'omit' : 'same-origin',
        }).
        then((res) => res.json()).
        then((data) => {
            const payload = data[data.length - 1];
            if (payload) {
                const options = payload['attributes'];
                Object.assign(sceneOptions, options['scene-options']);

                // deal with scene attribution
                if (sceneOptions['attribution']) {
                    const sceneAttr = document.createElement('a-entity');
                    sceneAttr.setAttribute('id', 'scene-options-attribution');
                    sceneAttr.setAttribute('attribution', sceneOptions['attribution']);
                    sceneRoot.appendChild(sceneAttr);
                    delete sceneOptions.attribution;
                }

                if (sceneOptions['navMesh']) {
                    const navMesh = document.createElement('a-entity');
                    navMesh.id = 'navMesh';
                    navMesh.setAttribute('gltf-model', sceneOptions['navMesh']);
                    navMesh.setAttribute('nav-mesh', '');
                    sceneRoot.appendChild(navMesh);
                }

                // save scene options
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
                        renderer[attribute] = (attribute === 'outputEncoding') ?
                            renderer[attribute] = THREE[value] :
                            renderer[attribute] = value;
                    }
                }
            } else {
                throw new Error('No scene-options');
            }
        }).
        catch(() => {
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
        }).
        finally(() => {
            this.sceneOptions = sceneOptions;
            ARENA.events.emit(ARENAEventEmitter.events.SCENE_OPT_LOADED, true);
        });
    };

    /**
     * When user auth is done, startup mqtt, runtime, chat and other ui elements;
     * Remaining init will be done once mqtt connection is done
     * @param {event} e
     */
    async onAuth(e) {
        const args = e.detail;

        this.username = args.mqtt_username;
        this.mqttToken = args.mqtt_token;

        // match name on the end of the id tag
        this.setUserName(args.mqtt_username);

        // id tag including name is set from authentication service
        this.setIdTag(args.ids.userid);

        ARENAMqtt.init().then(async (Mqtt) => {
            this.Mqtt = Mqtt;
            // Do not pass functions in mqttClientOptions
            await Mqtt.connect({
                reconnect: true,
                userName: this.username,
                password: this.mqttToken,
            },
            // last will message
            JSON.stringify({object_id: this.camName, action: 'delete'}),
            // last will topic
            this.outputTopic + this.camName,
            );

            // init runtime manager
            this.RuntimeManager = RuntimeMngr;
            this.RuntimeManager.init({
                realm: this.defaults.realm,
                mqtt_uri: this.mqttHostURI,
                onInitCallback: function() {
                    console.info('Runtime init done.');
                },
                name: 'rt-' + Math.round(Math.random() * 10000) + '-' + this.username,
                dbg: false,
                mqtt_username: this.username,
                mqtt_token: this.mqttToken,
            });

            // start sending console output to mqtt (topic: debug-topic/rt-uuid; e.g. realm/proc/debug/71ee5bad-f0d2-4abb-98a7-e4336daf628a)
            if (!ARENADefaults.devInstance) {
                let rtInfo = this.RuntimeManager.info();
                console.setOptions({dbgTopic: `${rtInfo.dbg_topic}/${rtInfo.uuid}`, publish: this.Mqtt.publish.bind(this.Mqtt)});
            }

            // init chat
            this.chat = new ARENAChat({
                userid: this.idTag,
                cameraid: this.camName,
                username: this.getDisplayName(),
                realm: this.defaults.realm,
                namespace: this.nameSpace,
                scene: this.namespacedScene,
                persist_uri: 'https://' + this.defaults.persistHost + this.defaults.persistPath,
                keepalive_interval_ms: 30000,
                mqtt_host: this.mqttHostURI,
                mqtt_username: this.username,
                mqtt_token: this.mqttToken,
                devInstance: this.defaults.devInstance,
            });
            await this.chat.start();

            const url = new URL(window.location.href);
            const skipav = url.searchParams.get('skipav');
            const armode = url.searchParams.get('armode');
            const noav = url.searchParams.get('noav');
            if (noav || !this.isJitsiPermitted(this.mqttToken)) {
                this.showEchoDisplayName();
            } else if (armode && AFRAME.utils.device.checkARSupport()) {
                /*
                Instantly enter AR mode for now.
                TODO: incorporate AV selection for possible Jitsi and multicamera
                 */
                Swal.fire({
                    title: 'Enter AR Mode',
                    html: `This is an immersive AR scene that requires access to your camera and device sensors.`,
                    icon: 'info',
                    showConfirmButton: true,
                    confirmButtonText: 'Enter',
                }).then(() => {
                    document.getElementsByTagName('a-scene')[0].enterAR();
                });
            } else if (skipav) {
                // Directly initialize Jitsi videoconferencing
                this.Jitsi = ARENAJitsi.init(this.jitsiHost);
                this.showEchoDisplayName();
            } else {
                window.setupAV(() => {
                    // Initialize Jitsi videoconferencing after A/V setup window
                    this.Jitsi = ARENAJitsi.init(this.jitsiHost);
                    this.showEchoDisplayName();
                });
            }

            // initialize face tracking if not on mobile
            if (!AFRAME.utils.device.isMobile()) {
                const faceTrackerModule = await import('./face-tracking/face-tracker.js');
                this.FaceTracker = faceTrackerModule.ARENAFaceTracker;

                const displayBbox = false;
                const flipped = true;
                this.FaceTracker.init(displayBbox, flipped);
            }
            console.info(`* ARENA Started * Scene:${ARENA.namespacedScene}; User:${ARENA.userName}; idTag:${ARENA.idTag} `);

        }); // mqtt API (after this.* above, are defined)
    }
}

/**
 * ARENA global object
 */
module.exports = window.ARENA = Arena.init();
