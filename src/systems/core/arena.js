/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global ARENAAUTH, $ */

import { ARENAMqttConsole, ARENAUtils } from '../../utils';
import ARENAWebARUtils from '../webar';
import { ARENA_EVENTS, JITSI_EVENTS, TOPICS } from '../../constants';
import RuntimeMngr from './runtime-mngr';

AFRAME.registerSystem('arena-scene', {
    schema: {
        devInstance: { type: 'boolean', default: ARENA.defaults.devInstance },
        persistHost: { type: 'string', default: ARENA.defaults.persistHost },
        persistPath: { type: 'string', default: ARENA.defaults.persistPath },
        camHeight: { type: 'number', default: ARENA.defaults.camHeight },
        disallowJWT: { type: 'boolean', default: !!ARENA.defaults.disallowJWT },
    },

    init() {
        this.utils = ARENAUtils;

        window.addEventListener(ARENA_EVENTS.ON_AUTH, this.ready.bind(this));
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, this.fetchSceneOptions.bind(this));
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, () => {
            this.fetchSceneObjects().then(() => {});
        });
        ARENA.events.addEventListener(ARENA_EVENTS.MQTT_LOADED, () => {
            this.initRuntimeMngr().then(() => {});

            // replace console with our logging
            if (!ARENA.defaults.devInstance || ARENA.params.debug) {
                ARENAMqttConsole.init({
                    dbgTopic: TOPICS.PUBLISH.SCENE_DEBUG.formatStr(ARENA.topicParams),
                    publish: ARENA.Mqtt.publish.bind(ARENA.Mqtt),
                });
            }
        });
        ARENA.events.addMultiEventListener(
            [ARENA_EVENTS.MQTT_LOADED, ARENA_EVENTS.USER_PARAMS_LOADED, 'loaded'],
            this.loadScene.bind(this)
        );
    },

    ready(evt) {
        const { el } = this;

        const { sceneEl } = el;

        // Sync params with bootstrap ARENA object from Auth
        this.params = { ...ARENA.params };
        this.defaults = ARENA.defaults;

        this.userName = ARENA.userName;
        this.displayName = ARENA.displayName;
        this.sceneName = ARENA.sceneName;
        this.nameSpace = ARENA.nameSpace;
        this.namespacedScene = ARENA.namespacedScene;

        // Sets persistenceUrl, outputTopic
        this.persistenceUrl = `//${this.params.persistHost}${this.params.persistPath}${this.namespacedScene}`;

        this.events = sceneEl.systems['arena-event-manager'];
        this.health = sceneEl.systems['arena-health-ui'];
        this.jitsi = sceneEl.systems['arena-jitsi'];

        window.ARENA = this; // alias to window for easy access

        // query string start coords given as a comma-separated string, e.g.: 'startCoords=0,1.6,0'
        if (typeof this.params.startCoords === 'string') {
            this.startCoords = this.params.startCoords.split(',').map((i) => Number(i));
        }

        // setup required scene-options defaults
        // TODO: pull these from a schema
        this.clickableOnlyEvents = true;
        this.maxAVDist = 20;
        this.privateScene = false;
        this.videoFrustumCulling = true;
        this.videoDistanceConstraints = true;
        this.videoDefaultResolutionConstraint = 180;
        this.physics = false;

        this.mqttToken = evt.detail;

        // id tag including name is set from authentication service
        this.setIdTag(this.mqttToken.ids.userid);
        this.userClient = this.mqttToken.ids.userclient;

        // Reuse object for topic parameters
        this.topicParams = {
            nameSpace: this.nameSpace,
            sceneName: this.sceneName,
            userClient: this.userClient,
            idTag: this.idTag,
            userObj: this.idTag,
        };

        if (this.isUsersPermitted()) {
            this.showEchoDisplayName();
        } else {
            // prevent local name when non-interactive
            this.params.noname = true;
        }

        this.events.emit(ARENA_EVENTS.USER_PARAMS_LOADED, true);

        // setup event listeners
        sceneEl.addEventListener(ARENA_EVENTS.NEW_SETTINGS, (e) => {
            const args = e.detail;
            if (!args.userName) return; // only handle a user name change
            this.showEchoDisplayName();
        });
        ARENA.events.addEventListener(ARENA_EVENTS.SCENE_OBJ_LOADED, (e) => {
            if (this.params.build3d) {
                if (this.isBuild3dEnabled()) {
                    this.loadArenaInspector();
                } else {
                    Swal.fire({
                        title: 'Build 3D',
                        text: `Build 3D not enabled. You do not have the required permission to edit this scene.`,
                        icon: 'error',
                        showConfirmButton: true,
                        confirmButtonText: 'Ok',
                    }).then((result) => {
                        this.removeBuild3d();
                    });
                }
            }
        });
        sceneEl.addEventListener(JITSI_EVENTS.DOMINANT_SPEAKER_CHANGED, (e) => {
            const speaker = !e.detail.id || e.detail.id === this.idTag; // self is speaker
            this.showEchoDisplayName(speaker);
        });
    },

    /**
     * Fetches scene options from persistence server, deferring loading until user params are loaded.
     * @return {Promise<void>}
     */
    async fetchSceneOptions() {
        fetch(`${this.persistenceUrl}?type=scene-options`, {
            method: 'GET',
            credentials: this.data.disallowJWT ? 'omit' : 'same-origin',
        })
            .then((res) => {
                if (res.status === 200) {
                    return res.json();
                }
                Swal.fire({
                    title: 'Error loading initial scene options',
                    text: `${res.status}: ${res.statusText} ${JSON.stringify(res.response)}`,
                    icon: 'error',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                });
                throw new Error('Error loading initial scene options');
            })
            .then((sceneData) => {
                this.events.addEventListener('loaded', () => {
                    this.loadSceneOptions(sceneData[sceneData.length - 1]);
                });
            });
    },

    /**
     * Fetches scene objects from persistence server, deferring loading until userparams and scene are loaded.
     * @param {string} [urlToLoad] which url to load arena from
     * @param {string} [parentName] parentObject to attach sceneObjects to
     * @param {string} [prefixName] prefix to add to container
     */
    async fetchSceneObjects(urlToLoad, parentName, prefixName) {
        fetch(urlToLoad || this.persistenceUrl, {
            method: 'GET',
            credentials: this.data.disallowJWT ? 'omit' : 'same-origin',
        })
            .then((res) => {
                if (res.status === 200) {
                    return res.json();
                }
                Swal.fire({
                    title: 'Error loading initial scene data',
                    text: `${res.status}: ${res.statusText} ${JSON.stringify(res.response)}`,
                    icon: 'error',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                });
                throw new Error('Error loading initial scene data');
            })
            .then((sceneObjs) => {
                const startCount = sceneObjs.filter((obj) => !!obj.attributes.landmark?.startingPosition).length;
                // Initial scene load, fast scan for landmark starting positions, fire if none found
                if (urlToLoad === undefined && startCount === 0) {
                    this.events.emit(ARENA_EVENTS.STARTPOS_LOADED, true);
                }
                this.sceneEl.systems.landmark.expectedStarts = startCount;
                this.events.addMultiEventListener(
                    [ARENA_EVENTS.SCENE_OPT_LOADED, ARENA_EVENTS.MQTT_LOADED, 'loaded'],
                    () => {
                        this.loadSceneObjects(sceneObjs, parentName, prefixName);
                    }
                );
            });
    },

    /**
     * Init runtime manager; must be called after mqtt is loaded
     */
    async initRuntimeMngr() {
        const mqtt = this.sceneEl.systems['arena-mqtt'];

        // init runtime manager
        this.RuntimeManager = new RuntimeMngr({
            realm: this.defaults.realm,
            mqttHost: mqtt.mqttHostURI,
            onInitCallback() {
                console.info('Runtime init done.');
            },
            name: `rt-${this.idTag}`,
            mqttUsername: this.mqttToken.mqtt_username,
            mqttToken: this.mqttToken.mqtt_token,
            nameSpace: this.nameSpace,
            sceneName: this.sceneName,
            idTag: this.idTag,
            userClient: this.userClient,
            debug: Boolean(ARENA.params.debug), // deterministic truthy/falsy boolean
        });
        this.RuntimeManager.init();
    },

    /**
     * Load Scene; checks URI parameters
     */
    loadScene() {
        const { el } = this;

        const { sceneEl } = el;

        if (this.params.armode) {
            /*
            Instantly enter AR mode for now.
            TODO: incorporate AV selection for possible Jitsi and multicamera
            */
            if (ARENAUtils.isWebXRViewer() || AFRAME.utils.device.checkARSupport()) {
                sceneEl.enterAR();
            } else {
                window.setTimeout(ARENAWebARUtils.enterARNonWebXR, 1500);
            }
        } else if (this.params.vrmode) {
            sceneEl.enterVR();
        }

        if (this.isBuild3dEnabled()) {
            sceneEl.setAttribute('build3d-mqtt-scene', true);
            sceneEl.setAttribute('debug', true);
        }

        this.loadUser();

        // setup webar session
        ARENAWebARUtils.handleARButtonForNonWebXRMobile();

        console.info(`* ARENA Started * Scene:${this.namespacedScene}; User:${this.userName}; idTag:${this.idTag}`);

        this.events.emit(ARENA_EVENTS.ARENA_LOADED, true);
    },

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, handLName, handRName which depend on idTag
     * @param {string} idTag user name to set; will use url parameter value or default is no name is given
     */
    setIdTag(idTag) {
        if (idTag === undefined) throw new Error('setIdTag: idTag not defined.'); // idTag must be set
        this.idTag = idTag;

        // set faceName, avatarName, handLName, handRName which depend on user name
        this.faceName = `face_${this.idTag}`; // e.g. face_9240_X
        this.handLName = `handLeft_${this.idTag}`; // e.g. handLeft_9240_X
        this.handRName = `handRight_${this.idTag}`; // e.g. handRight_9240_X
    },

    /**
     * Gets display name either from local storage or from userName
     * @return {string} display name
     */
    getDisplayName() {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(this.userName);
        return displayName;
    },

    /**
     * Checks loaded MQTT/Jitsi token for Jitsi video conference permission.
     * @return {boolean} True if the user has permission to stream audio/video in this scene.
     */
    isJitsiPermitted() {
        if (this.isBuild3dEnabled()) return false; // build3d is used on a new page
        return !!this.mqttToken.token_payload.room;
    },

    /**
     * Checks loaded MQTT/Jitsi token for user interaction permission.
     * @return {boolean} True if the user has permission to send/receive presence in this scene.
     */
    isUsersPermitted() {
        if (this.isBuild3dEnabled()) return false; // build3d is used on a new page
        /*
        This now checks if the public scene topic, which all users currently can *subscribe* to
        for all message types, is also *writable* for this JWT token.
        */
        const usersTopic = TOPICS.PUBLISH.SCENE_PRESENCE.formatStr({
            nameSpace: this.nameSpace,
            sceneName: this.sceneName,
            userClient: this.userClient,
            idTag: this.idTag,
        });
        return ARENAAUTH.matchJWT(usersTopic, this.mqttToken.token_payload.publ);
    },

    /**
     * Checks token for full scene object write permissions.
     // * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneWriter() {
        /*
        This now checks if the public scene topic, which all users currently can *subscribe* to
        for all message types, is also *writable* for this JWT token.
        */
        const writeTopic = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr({
            nameSpace: this.nameSpace,
            sceneName: this.sceneName,
            userClient: this.userClient,
            idTag: '+',
        });
        return ARENAAUTH.matchJWT(writeTopic, this.mqttToken.token_payload.publ);
    },

    /**
     * Checks token for scene chat write permissions.
     // * @return {boolean} True if the user has permission to chat in this scene.
     */
    isUserChatWriter() {
        if (this.isBuild3dEnabled()) return false; // build3d is used on a new page
        /*
        This now checks if the public scene topic, which all users currently can *subscribe* to
        for all message types, is also *writable* for this JWT token.
        */
        const chatTopic = TOPICS.PUBLISH.SCENE_CHAT.formatStr({
            nameSpace: this.nameSpace,
            sceneName: this.sceneName,
            userClient: this.userClient,
            idTag: this.idTag,
        });
        return ARENAAUTH.matchJWT(chatTopic, this.mqttToken.token_payload.publ);
    },

    /**
     * Checks the state of build3d request and for scene write permissions.
     */
    isBuild3dEnabled() {
        return this.params.build3d && this.isUserSceneWriter();
    },

    /**
     * Renders/updates the display name in the top left corner of a scene.
     * @param {boolean} [speaker=false] If the user is the dominant speaker
     */
    showEchoDisplayName(speaker = false) {
        const echo = document.getElementById('echo-name');
        echo.textContent = localStorage.getItem('display_name');
        if (!this.params.noname) {
            if (speaker) {
                echo.style.backgroundColor = '#0F08'; // green alpha
            } else {
                echo.style.backgroundColor = '#0008'; // black alpha
            }
            echo.style.display = 'block';
        } else {
            echo.style.display = 'none';
        }
    },

    /**
     * loads this user's presence and camera
     */
    loadUser() {
        const { data, el } = this;

        const { sceneEl } = el;

        const cameraEl = sceneEl.camera.el;
        cameraEl.setAttribute('arena-camera', 'enabled', this.isUsersPermitted());
        cameraEl.setAttribute('arena-camera', 'displayName', this.getDisplayName());

        const cameraRigObj3D = document.getElementById('cameraRig').object3D;

        const startPos = new THREE.Vector3();
        if (this.startCoords instanceof Array) {
            // This is a split string to array
            startPos.set(...this.startCoords);
            cameraRigObj3D.position.copy(startPos);
            cameraEl.object3D.position.y += data.camHeight;
            this.startCoords = startPos;
        } else if (this.params.startLastPos) {
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            const lastPos = sceneHist[this.namespacedScene]?.lastPos;
            if (lastPos) {
                startPos.copy(lastPos);
                cameraRigObj3D.position.copy(startPos);
                cameraEl.object3D.position.y += data.camHeight;
                this.startCoords = startPos;
            }
        }

        // We have no immediate start positions from URL or localStorage, wait for landmarks
        const { systems } = sceneEl;
        const { landmark } = systems;

        ARENA.events.addEventListener(ARENA_EVENTS.STARTPOS_LOADED, () => {
            if (ARENA.params.camFollow || ARENA.params.orbit) {
                return; // defer to other starting movement
            }
            // Fallthrough failure if startLastPos fails
            if (!this.startCoords && landmark) {
                // Try to define starting position if the scene has startPosition objects
                const startPosition = landmark.getRandom(true);
                if (startPosition) {
                    console.debug('Moving camera to start position', startPosition.el.id);
                    startPosition.teleportTo();
                    startPos.copy(cameraEl.object3D.position);
                    startPos.y -= data.camHeight;
                    this.startCoords = startPos;
                }
            }

            if (!this.startCoords) {
                // Final fallthrough for failures, resort to default
                const navSys = systems.nav;
                startPos.copy(this.defaults.startCoords);
                if (navSys.navMesh) {
                    try {
                        const closestGroup = navSys.getGroup(startPos, false);
                        const closestNode = navSys.getNode(startPos, closestGroup, false);
                        navSys.clampStep(startPos, startPos, closestGroup, closestNode, startPos);
                    } catch {
                        /* empty */
                    }
                }
                cameraEl.object3D.position.copy(startPos);
                cameraEl.object3D.position.y += data.camHeight;
            }

            // TODO (mwfarb): fix race condition in slow networks; too mitigate, warn user for now
            if (this.health) {
                this.health.removeError('slow.network');
            }
        });
    },

    /**
     * Loads the a-frame inspector, with MutationObserver connected to MQTT.
     * Expects all known objects to be loaded first.
     * Expects that permissions have been checked so users won't be confused if publish fails.
     */
    loadArenaInspector() {
        const { sceneEl } = this.el;

        let el;
        if (this.params.objectId) {
            el = document.getElementById(this.params.objectId); // requested id if any
        }
        sceneEl.components.inspector.openInspector(el || null);
        console.log('build3d', 'A-Frame Inspector loaded');

        // auto-start build3d scene when pause occurs, activate play
        document.querySelector('a-scene').addEventListener('pause', (evt) => {
            if (evt.target === sceneEl) {
                document.querySelector('a-scene').play();
                console.log('build3d', 'scene is playing...');
            }
            // TODO (mwfarb): would be nice to update play button visually to pause, to reflect current state
        });

        function updateInspectorPanel(perm, jqSelect, permColor = false) {
            $(jqSelect).css('opacity', '.75');
            if (permColor) {
                $(jqSelect).css('background-color', perm ? 'darkgreen' : 'darkorange');
            }
        }

        setTimeout(() => {
            const perm = this.isUserSceneWriter();
            updateInspectorPanel(perm, '#inspectorContainer #scenegraph');
            updateInspectorPanel(perm, '#inspectorContainer #viewportBar', true);
            updateInspectorPanel(perm, '#inspectorContainer #rightPanel');

            // use "Back to Scene" to send to real ARENA scene
            $('a.toggle-edit').click(() => {
                this.removeBuild3d();
            });
        }, 500);
    },

    /**
     *  remove the build3d a-frame inspector
     */
    removeBuild3d() {
        const url = new URL(window.location.href);
        url.searchParams.delete('build3d');
        url.searchParams.delete('objectId');
        window.parent.window.history.pushState(
            {
                path: url.href,
            },
            '',
            decodeURIComponent(url.href)
        );
        window.location.reload();
    },

    /**
     * loads scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {[{Object}]} [sceneObjs] Objects to load
     * @param {string} [parentName] parentObject to attach sceneObjects to
     * @param {string} [prefixName] prefix to add to container
     */
    loadSceneObjects(sceneObjs, parentName, prefixName) {
        const { el } = this;

        const { sceneEl } = el;

        const programs = [];

        if (sceneObjs.length === 0) {
            console.warn('No scene objects found in persistence.');
            sceneEl.emit(ARENA_EVENTS.SCENE_OBJ_LOADED, true);
            return;
        }

        const mqtt = sceneEl.systems['arena-mqtt'];

        let containerObjName;
        if (parentName && prefixName && document.getElementById(parentName)) {
            containerObjName = `${prefixName}_container`;
            // Make container to hold all scene objects
            const msg = {
                object_id: containerObjName,
                action: 'create',
                type: 'object',
                data: { parent: parentName },
            };
            mqtt.handleSceneObjectMessage(msg);
        }

        const arenaObjects = new Map(sceneObjs.map((object) => [object.object_id, object]));

        /**
         * Recursively creates objects with parents, keep list of descendants to prevent circular references
         * @param {Object} obj - msg from persistence
         * @param {Array} [descendants] - running list of descendants
         */
        const createObj = (obj, descendants = []) => {
            const { parent } = obj.attributes;
            if (obj.object_id === this.idTag) {
                arenaObjects.delete(obj.object_id); // don't load our own camera/head assembly
                return;
            }
            // add a default landmark for any screen share object
            if (obj.object_id === 'screenshare' && !obj.attributes?.landmark) {
                obj.attributes.landmark = {
                    label: `Screen: ${obj.object_id} (nearby)`,
                    randomRadiusMin: 2,
                    randomRadiusMax: 3,
                };
            }
            // if parent is specified, but doesn't yet exist
            if (parent && document.getElementById(parent) === null) {
                // Check for circular references
                if (obj.object_id === parent || descendants.includes(parent)) {
                    console.warn('Circular reference detected, skipping', obj.object_id);
                    arenaObjects.delete(obj.object_id);
                    return;
                }
                if (arenaObjects.has(parent)) {
                    // Does exist in pending objects
                    // Recursively create parent, include this as child
                    createObj(arenaObjects.get(parent), [...descendants, obj.object_id]);
                } else {
                    // Parent doesn't exist in DOM, doesn't exist in pending arenaObjects, skip orphan
                    console.warn('Orphaned object detected, skipping', obj.object_id);
                    arenaObjects.delete(obj.object_id);
                    return;
                }
            }
            // Parent null or has been recursively created, create this object
            const msg = {
                object_id: obj.object_id,
                action: 'create',
                type: obj.type,
                persist: true,
                data: obj.attributes,
            };
            mqtt.handleSceneObjectMessage(msg);
            arenaObjects.delete(obj.object_id);
        };

        let i = 0;
        while (arenaObjects.size > 0) {
            if (++i > sceneObjs.length) {
                console.error('Looped more than number of persist objects, aborting. Objects:', arenaObjects);
                break;
            }

            const iter = arenaObjects.entries();
            const [objId, obj] = iter.next().value; // get first entry
            if (obj.type === 'program') {
                // Defer to end with separate event listener for runtime mngr load
                programs.push(obj);
                arenaObjects.delete(objId);
            } else if (obj.type === 'object') {
                if (containerObjName && obj.attributes.parent === undefined) {
                    // Add first-level objects as children to container if applicable
                    obj.attributes.parent = containerObjName;
                }
                createObj(obj);
            } else {
                // Scene Options, what else? Skip
                arenaObjects.delete(objId);
            }
        }
        ARENA.events.addEventListener(ARENA_EVENTS.RUNTIME_MNGR_LOADED, () => {
            // arena variables that are replaced; keys are the variable names e.g. ${scene},${userid}, ...
            const avars = {
                scene: this.sceneName,
                namespace: this.nameSpace,
                userid: this.idTag,
                username: this.getDisplayName(),
                mqtth: ARENA.Mqtt.mqttHost,
            };
            programs.forEach((program) => {
                // ask runtime manager to start this program
                this.RuntimeManager.createModuleFromPersist(program, avars);
            });
        });
        sceneEl.emit(ARENA_EVENTS.SCENE_OBJ_LOADED, !containerObjName);
    },

    /**
     * deletes scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to unload arena from
     */
    // unloadArenaScene(urlToLoad) {
    //     const { data } = this;
    //     const xhr = new XMLHttpRequest();
    //     xhr.withCredentials = !data.disallowJWT;
    //     if (urlToLoad) {
    //         xhr.open('GET', urlToLoad);
    //     } else {
    //         xhr.open('GET', this.persistenceUrl);
    //     }
    //
    //     xhr.send();
    //     xhr.responseType = 'json';
    //     xhr.onload = () => {
    //         if (xhr.status !== 200) {
    //             Swal.fire({
    //                 title: 'Error loading initial scene data',
    //                 text: `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`,
    //                 icon: 'error',
    //                 showConfirmButton: true,
    //                 confirmButtonText: 'Ok',
    //             });
    //         } else {
    //             const arenaObjects = xhr.response;
    //             const l = arenaObjects.length;
    //             for (let i = 0; i < l; i++) {
    //                 const obj = arenaObjects[i];
    //                 if (obj.object_id === this.idTag) {
    //                     // don't load our own camera/head assembly
    //                 } else {
    //                     const msg = {
    //                         object_id: obj.object_id,
    //                         action: 'delete',
    //                     };
    //                     onMessageArrived(undefined, msg);
    //                 }
    //             }
    //         }
    //     };
    // },

    /**
     * Loads and applies scene-options (if it exists), otherwise set to default environment
     * @param {Object} sceneData - scene data from persistence, already JSON parsed
     */
    loadSceneOptions(sceneData) {
        const { el } = this;

        const { sceneEl } = el;

        // we add all elements to our scene root
        const sceneRoot = document.getElementById('sceneRoot');

        // set renderer defaults that are different from THREE/aframe defaults
        const { renderer } = sceneEl;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // always include the default environment, users can remove in scene-options.env-presets.active=false if desired
        const environment = document.createElement('a-entity');
        environment.id = 'env';
        environment.setAttribute('environment', true); // always ensure the component is added

        if (sceneData) {
            const options = sceneData.attributes;

            const sceneOptions = options['scene-options'];
            if (sceneOptions) {
                // save scene-options
                Object.entries(sceneOptions).forEach(([attribute, value]) => {
                    ARENA[attribute] = value;
                });

                // process special handling of scene-options properties...

                if (sceneOptions.physics?.enabled) {
                    delete sceneOptions.physics.enabled;
                    // physx physics system, https://github.com/c-frame/physx
                    const leftHand = document.getElementById('leftHand');
                    const rightHand = document.getElementById('rightHand');
                    sceneEl.addEventListener('componentregistered', (evt) => {
                        if (evt.detail.name === 'physx-contact-sound') {
                            // Wait for last physx main component loaded
                            sceneEl.setAttribute('physx', {
                                autoLoad: true,
                                wasmUrl: './static/vendor/physx.release.wasm',
                                ...sceneOptions.physics,
                            });
                            leftHand.setAttribute('geometry', { primitive: 'sphere', radius: 0.02 });
                            leftHand.setAttribute('physx-body', { type: 'kinematic', emitCollisionEvents: true });
                            leftHand.setAttribute('physx-material', { restitution: 0 });
                            rightHand.setAttribute('geometry', { primitive: 'sphere', radius: 0.02 });
                            rightHand.setAttribute('physx-body', { type: 'kinematic', emitCollisionEvents: true });
                            rightHand.setAttribute('physx-material', { restitution: 0 });
                            this.events.emit(ARENA_EVENTS.PHYSICS_LOADED, true);
                        } else if (evt.detail.name === 'physx-grab') {
                            leftHand.setAttribute('physx-grab', { proximity: 0.25 });
                            rightHand.setAttribute('physx-grab', { proximity: 0.25 });
                        }
                    });
                    import('../vendor/physx.min').then(() => {
                        import('../../components/vendor/physx/grab');
                        import('../../components/vendor/physx/force-pushable');
                    });
                }

                if (sceneOptions['ar-hit-test']?.enabled !== false) {
                    sceneEl.setAttribute('ar-hit-test', {
                        enabled: true,
                        src: 'static/images/blank-pixel.png',
                        mapSize: { x: 0.005, y: 0.005 },
                    });
                    sceneEl.setAttribute('ar-hit-test-listener', { enabled: true });
                }

                const { enabled, imageUrl, meshUrl, interval } = sceneOptions.openvps || {};
                if (enabled && (imageUrl || meshUrl)) {
                    if (
                        ARENAUtils.isMobile() ||
                        ARENAUtils.isWebXRViewer() ||
                        ARENAUtils.detectARHeadset() !== 'unknown'
                    ) {
                        sceneEl.setAttribute('openvps', { imageUrl, meshUrl, interval });
                    }
                    delete sceneOptions.openvps;
                }

                // deal with scene attribution
                if (sceneOptions.attribution) {
                    const sceneAttr = document.createElement('a-entity');
                    sceneAttr.setAttribute('id', 'scene-options-attribution');
                    sceneAttr.setAttribute('attribution', sceneOptions.attribution);
                    sceneRoot.appendChild(sceneAttr);
                    delete sceneOptions.attribution;
                }

                if (sceneOptions.navMesh) {
                    sceneOptions.navMesh = ARENAUtils.crossOriginDropboxSrc(sceneOptions.navMesh);
                    const navMesh = document.createElement('a-entity');
                    navMesh.id = 'navMesh';
                    navMesh.setAttribute('gltf-model', sceneOptions.navMesh);
                    navMesh.setAttribute('nav-mesh', '');
                    sceneRoot.appendChild(navMesh);
                }

                if (sceneOptions.sceneHeadModels) {
                    // add scene custom scene heads to selection list
                    this.events.addEventListener(ARENA_EVENTS.SETUPAV_LOADED, () => {
                        this.setupSceneHeadModels(sceneOptions.sceneHeadModels);
                    });
                }

                if (typeof sceneOptions.clickableOnlyEvents !== 'undefined' && !sceneOptions.clickableOnlyEvents) {
                    // unusual case: clickableOnlyEvents = true by default, add warning...
                    this.health.addError('scene-options.allObjectsClickable');
                }

                if (sceneOptions.originMarker) {
                    const originMarker = document.createElement('a-entity');
                    originMarker.setAttribute('gltf-model', './static/models/origin_marker.glb');
                    originMarker.setAttribute('id', 'scene_default_originMarker');
                    originMarker.object3D.position.set(0, 0.01, 0);
                    originMarker.object3D.rotation.set(-Math.PI / 2, 0, 0);
                    originMarker.object3D.scale.set(0.15, 0.15, 0.15);
                    sceneRoot.appendChild(originMarker);
                }
            }

            const envPresets = options['env-presets'];
            if (envPresets) {
                // update default environment with specific requests
                Object.entries(envPresets).forEach(([attribute, value]) => {
                    environment.setAttribute('environment', attribute, value);
                });
            }

            const rendererSettings = options['renderer-settings'];
            if (rendererSettings) {
                Object.entries(rendererSettings).forEach(([attribute, value]) => {
                    renderer[attribute] =
                        attribute === 'outputColorSpace'
                            ? (renderer[attribute] = THREE[value])
                            : (renderer[attribute] = value);
                });
            }

            const postProcessing = options['post-processing'];
            if (postProcessing) {
                const effectsSystem = sceneEl.systems.effects;
                effectsSystem.loadEffects().then(() => {
                    Object.entries(postProcessing).forEach(([effectName, opts]) => {
                        if (opts === null) {
                            effectsSystem.removePass(effectName);
                        } else {
                            effectsSystem.addPass(effectName, opts);
                        }
                    });
                });
            }
        }

        // include desired environment, and make default env have lights
        sceneRoot.appendChild(environment);
        this.addDefaultLights();

        this.events.emit(ARENA_EVENTS.SCENE_OPT_LOADED, true);
    },

    /**
     * Add default lights to the scene
     * @param {boolean} [ifNoNonEnv=false] - add lights only if no non-environment lights are present
     */
    addDefaultLights(ifNoNonEnv = false) {
        const sceneRoot = document.getElementById('sceneRoot');
        if (document.getElementById('ambient-light') && document.getElementById('point-light')) {
            return; // already have default lights
        }
        if (ifNoNonEnv && document.querySelectorAll('[light]:not([class=environment])').length > 0) {
            return; // already have non-environment lights
        }
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
    },

    /**
     * Update the list of scene-specific heads the user can select from
     */
    setupSceneHeadModels(sceneHeads) {
        const headModelPathSelect = document.getElementById('headModelPathSelect');
        const defaultHeadsLen = headModelPathSelect.length; // static default heads list length
        sceneHeads.forEach((head) => {
            const opt = document.createElement('option');
            opt.value = ARENAUtils.crossOriginDropboxSrc(head.url);
            opt.text = `${head.name} (scene-options)`;
            headModelPathSelect.add(opt, null);
        });
        let headModelPathIdx = 0;
        const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
        const sceneHeadModelPathIdx = sceneHist[this.namespacedScene]?.headModelPathIdx;
        if (sceneHeadModelPathIdx !== undefined) {
            headModelPathIdx = sceneHeadModelPathIdx;
        } else if (headModelPathSelect.selectedIndex === 0) {
            // if default ARENA head used, replace with default scene head
            headModelPathIdx = defaultHeadsLen;
        } else if (localStorage.getItem('headModelPathIdx')) {
            headModelPathIdx = localStorage.getItem('headModelPathIdx');
        }
        headModelPathSelect.selectedIndex = headModelPathIdx < headModelPathSelect.length ? headModelPathIdx : 0;
    },
});
