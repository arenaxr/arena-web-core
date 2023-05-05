/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import {ARENAMqttConsole} from './arena-console.js';
import {ARENAUtils} from './utils.js';
import {ARENAJitsi} from './jitsi.js';
import {ARENAHealth} from './health/';
import {ARENAWebARUtils} from './webar/';
import {EVENTS} from './constants/events';
import Swal from 'sweetalert2';

/* global ARENA, KJUR */

AFRAME.registerSystem('arena-scene', {
    schema: {
        devInstance: {type: 'boolean', default: ARENADefaults.devInstance},
        userName: {type: 'string', default: ARENADefaults.userName},
        realm: {type: 'string', default: ARENADefaults.realm},
        sceneName: {type: 'string', default: ARENADefaults.sceneName},
        namespace: {type: 'string', default: ARENADefaults.namespace},
        persistHost: {type: 'string', default: ARENADefaults.persistHost},
        persistPath: {type: 'string', default: ARENADefaults.persistPath},
        camHeight: {type: 'number', default: ARENADefaults.camHeight},
        jitsiHost: {type: 'string', default: ARENADefaults.jitsiHost},
        disallowJWT: {type: 'boolean', default: !!ARENADefaults.disallowJWT},
    },

    init: async function(evt) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        // wait for auth to authorize user, init called from onAuth with evt detail of token
        if (!evt) {
            window.addEventListener(EVENTS.ON_AUTH, this.init.bind(this));
            return;
        }

        // replace console with our logging (only when not in dev)
        if (!data.devInstance) {
            // will queue messages until MQTT connection is available (indicated by console.setOptions())
            ARENAMqttConsole.init();
        }

        // start client health monitor
        this.health = new ARENAHealth();

        this.startCoords = ARENAUtils.getUrlParam('startCoords', undefined); // leave undefined if not specified
        // query string start coords given as a comma-separated string, e.g.: 'startCoords=0,1.6,0'
        if (this.startCoords !== undefined) {
            this.startCoords = this.startCoords.split(',').map((i) => Number(i));
        }

        // get url params
        const url = new URL(window.location.href);
        this.skipav = url.searchParams.get('skipav');
        this.armode = url.searchParams.get('armode');
        this.vr = url.searchParams.get('vr');
        this.noav = url.searchParams.get('noav');
        this.noname = url.searchParams.get('noname');
        this.confstats = url.searchParams.get('confstats');
        this.hudstats = url.searchParams.get('hudstats');
        this.camFollow = url.searchParams.get('camFollow');
        this.build3d = url.searchParams.get('build3d');

        // setup required scene-options defaults
        // TODO: pull these from a schema
        this.clickableOnlyEvents = true;
        this.maxAVDist = 20;
        this.privateScene = false;
        this.videoFrustumCulling = true;
        this.videoDistanceConstraints = true;

        this.mqttToken = evt.detail.mqtt_token;

        // id tag including name is set from authentication service
        this.setIdTag(this.mqttToken.ids.userid);

        if (this.isUsersPermitted()) {
            this.showEchoDisplayName();
        } else {
            // prevent local name when non-interactive
            this.noname = true;
        }

        sceneEl.ARENAUserParamsLoaded = true;
        sceneEl.emit(EVENTS.USER_PARAMS_LOADED, true);

        this.onMqttReady();

        // setup event listeners
        // this.events.on(ARENAEventEmitter.events.NEW_SETTINGS, (e) => {
        //     const args = e.detail;
        //     if (!args.userName) return; // only handle a user name change
        //     this.showEchoDisplayName();
        // });
        // this.events.on(ARENAEventEmitter.events.DOMINANT_SPEAKER, (e) => {
        //     const speaker = (!e.detail.id || e.detail.id === this.idTag); // self is speaker
        //     this.showEchoDisplayName(speaker);
        // });
        // // setup webar session
        // this.events.on(ARENAEventEmitter.events.SCENE_OBJ_LOADED, ARENAWebARUtils.handleARButtonForNonWebXRMobile);
    },

    onMqttReady() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        if (!sceneEl.ARENAMqttLoaded) {
            sceneEl.addEventListener(EVENTS.MQTT_LOADED, this.onMqttReady.bind(this));
            return;
        }

        if (this.armode) {
            /*
            Instantly enter AR mode for now.
            TODO: incorporate AV selection for possible Jitsi and multicamera
            */
            // this.events.on(ARENAEventEmitter.events.SCENE_OBJ_LOADED, () => {
            //     if (this.isWebARViewer || AFRAME.utils.device.checkARSupport()) {
            //         sceneEl.enterAR();
            //     } else {
            //         ARENAWebARUtils.enterARNonWebXR();
            //     }
            // });
        } else if (this.skipav) {
            // Directly initialize Jitsi videoconferencing
            this.Jitsi = ARENAJitsi.init(data.jitsiHost);
        } else if (!this.noav && this.isJitsiPermitted()) {
            window.setupAV(() => {
                // Initialize Jitsi videoconferencing after A/V setup window
                this.Jitsi = ARENAJitsi.init(data.jitsiHost);
            });
        }

        if (this.build3d) {
            sceneEl.setAttribute('build-watch-scene', true);
            sceneEl.setAttribute('debug', true);
        }

        this.loadSceneOptions();
        this.loadSceneObjects();
        this.loadUser();

        console.info(`* ARENA Started * Scene:${this.namespacedScene}; User:${this.userName}; idTag:${this.idTag}`);

        sceneEl.ARENALoaded = true;
        sceneEl.emit(EVENTS.ARENA_LOADED, true);
    },

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, handLName, handRName which depend on idTag
     * @param {string} idTag user name to set; will use url parameter value or default is no name is given
     */
    setIdTag: function(idTag) {
        if (idTag === undefined) throw 'setIdTag: idTag not defined.'; // idTag must be set
        this.idTag = idTag;

        // set camName
        this.camName = `camera_${this.idTag}`; // e.g. camera_1234_eric
        // if fixedCamera is given, then camName must be set accordingly
        this.fixedCamera = ARENAUtils.getUrlParam('fixedCamera', '');
        if (this.fixedCamera !== '') {
            this.camName = this.fixedCamera;
        }

        // set faceName, avatarName, handLName, handRName which depend on user name
        this.faceName = `face_${this.idTag}`; // e.g. face_9240_X
        this.handLName = `handLeft_${this.idTag}`; // e.g. handLeft_9240_X
        this.handRName = `handRight_${this.idTag}`; // e.g. handRight_9240_X
    },

    /**
     * Gets display name either from local storage or from userName
     * @return {string} display name
     */
    getDisplayName: function() {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(this.userName);
        return displayName;
    },

    /**
     * Checks loaded MQTT/Jitsi token for Jitsi video conference permission.
     * @return {boolean} True if the user has permission to stream audio/video in this scene.
     */
    isJitsiPermitted: function() {
        if (this.build3d) return false; // build3d is used on a new page

        const tokenObj = KJUR.jws.JWS.parse(this.mqttToken.mqtt_token);
        const perms = tokenObj.payloadObj;
        if (perms.room) return true;
        return false;
    },

    /**
     * Checks loaded MQTT/Jitsi token for user interaction permission.
     * TODO: This should perhaps use another flag, more general, not just chat.
     * @return {boolean} True if the user has permission to send/receive chats in this scene.
     */
    isUsersPermitted: function() {
        const data = this.data;
        const el = this.el;

        if (this.build3d) return false; // build3d is used on a new page

        const tokenObj = KJUR.jws.JWS.parse(this.mqttToken.mqtt_token);
        const perms = tokenObj.payloadObj;
        return ARENAUtils.matchJWT(`${data.realm}/c/${data.namespace}/o/#`, perms.subs);
    },

    /**
     * Checks token for full scene object write permissions.
     * @param {object} mqttToken - token with user permissions; Defaults to currently loaded MQTT token
     * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneWriter: function() {
        const tokenObj = KJUR.jws.JWS.parse(this.mqttToken.mqtt_token);
        const perms = tokenObj.payloadObj;
        return ARENAUtils.matchJWT(this.renderTopic, perms.publ);
    },

    /**
     * Renders/updates the display name in the top left corner of a scene.
     * @param {boolean} speaker If the user is the dominant speaker
     */
    showEchoDisplayName: function(speaker = false) {
        const url = new URL(window.location.href);
        const echo = document.getElementById('echo-name');
        echo.textContent = localStorage.getItem('display_name');
        if (!this.noname) {
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
    loadUser: function() {
        const data = this.data;
        const el = this.el;

        // TODO (mwfarb): fix race condition in slow networks; too mitigate, warn user for now
        if (!AFRAME || !AFRAME.scenes[0] || !AFRAME.scenes[0].systems) {
            if (this.health) {
                this.health.addError('slow.network');
                return;
            }
        }

        const systems = AFRAME.scenes[0].systems;
        let color = Math.floor(Math.random() * 16777215).toString(16);
        if (color.length < 6) color = '0' + color;
        color = '#' + color;

        const camera = document.getElementById('my-camera');
        camera.setAttribute('arena-camera', 'enabled', this.isUsersPermitted());
        camera.setAttribute('arena-camera', 'color', color);
        camera.setAttribute('arena-camera', 'displayName', this.getDisplayName());

        const startPos = new THREE.Vector3();
        if (this.startCoords) {
            startPos.set(...this.startCoords);
            camera.object3D.position.copy(startPos);
            camera.object3D.position.y += data.camHeight;
            this.startCoords = startPos;
        } else if (ARENAUtils.getUrlParam('startLastPos', false)) {
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            const lastPos = sceneHist[this.namespacedScene]?.lastPos;
            if (lastPos) {
                startPos.copy(lastPos);
                camera.object3D.position.copy(startPos);
                camera.object3D.position.y += data.camHeight;
                this.startCoords = startPos;
            }
        }
        // Fallthrough failure if startLastPos fails
        if (!this.startCoords && systems.landmark) {
            // Try to define starting position if the scene has startPosition objects
            const startPosition = systems.landmark.getRandom(true);
            if (startPosition) {
                console.log('Moving camera to start position', startPosition.el.id);
                startPosition.teleportTo();
                startPos.copy(camera.object3D.position);
                startPos.y -= data.camHeight;
                this.startCoords = startPos;
            }
        }
        if (!this.startCoords) { // Final fallthrough for failures
            const navSys = systems.nav;
            startPos.copy(this.startCoords);
            if (navSys.navMesh) {
                try {
                    const closestGroup = navSys.getGroup(startPos, false);
                    const closestNode = navSys.getNode(startPos, closestGroup, false);
                    navSys.clampStep(startPos, startPos, closestGroup, closestNode, startPos);
                } catch {}
            }
            camera.object3D.position.copy(startPos);
            camera.object3D.position.y += data.camHeight;
        }
        // enable vio if fixedCamera is given
        if (this.fixedCamera !== '') {
            camera.setAttribute('arena-camera', 'vioEnabled', true);
        }

        let url = new URL(window.location.href);
        if (url.searchParams.get('build3d')){
            this.loadArenaInspector();
        }

        // TODO (mwfarb): fix race condition in slow networks; too mitigate, warn user for now
        if (this.health) {
            this.health.removeError('slow.network');
        }
    },

    /**
     * Loads the a-frame inspector, with MutationObserver connected to MQTT.
     * Expects all known objects to be loaded first.
     */
    loadArenaInspector: function() {
        const sceneEl = sceneEl;
        const object_id = ARENAUtils.getUrlParam('objectId', '');
        let el;
        if (object_id) {
            el = document.getElementById(object_id); // requested id
        } else {
            el = document.querySelector('[build-watch-object]'); // first id
        }
        sceneEl.components.inspector.openInspector(el ? el : null);
        console.log('build3d', 'A-Frame Inspector loaded');

        setTimeout(() => {
            const perm = this.isUserSceneWriter();
            updateInspectorPanel(perm, '#inspectorContainer #scenegraph');
            updateInspectorPanel(perm, '#inspectorContainer #viewportBar #transformToolbar');
            updateInspectorPanel(perm, '#inspectorContainer #rightPanel');

            // use "Back to Scene" to send to real ARENA scene
            $('a.toggle-edit').click(function() {
                // remove the build3d a-frame inspector
                let url = new URL(window.location.href);
                url.searchParams.delete('build3d');
                url.searchParams.delete('objectId');
                window.parent.window.history.pushState({
                    path: url.href
                }, '', decodeURIComponent(url.href));
                window.location.reload();
            });
        }, 2000);

        function updateInspectorPanel(perm, jqSelect) {
            $(jqSelect).css('opacity', '.75');
            if (!perm) {
                // no permission to edit
                $(jqSelect).css('background-color', 'orange');
                $(jqSelect).css('pointer-events', 'none');
                $(`${jqSelect} :input`).attr('disabled', true);
            }
        }
    },

    /**
     * loads scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to load arena from
     * @param {string} [parentName] parentObject to attach sceneObjects to
     * @param {string} [prefixName] prefix to add to container
     */
    loadSceneObjects: function(urlToLoad, parentName, prefixName) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        const mqtt = sceneEl.systems['arena-mqtt'];

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !data.disallowJWT; // Include JWT cookie
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
                if (xhr.response === undefined || xhr.response.length === 0) {
                    console.warn('No scene objects found in persistence.');
                    // this.events.emit(ARENAEventEmitter.events.SCENE_OBJ_LOADED, true);
                    return;
                }
                let containerObjName;
                if (parentName && prefixName && document.getElementById(parentName)) {
                    containerObjName = `${prefixName}_container`;
                    // Make container to hold all scene objects
                    const msg = {
                        object_id: containerObjName,
                        action: 'create',
                        type: 'object',
                        data: {parent: parentName},
                    };
                    mqtt.processMessage(msg);
                }
                const arenaObjects = new Map(
                    xhr.response.map((object) => [object.object_id, object]),
                );

                /**
                 * Recursively creates objects with parents, keep list of descendants to prevent circular references
                 * @param {Object} obj - msg from persistence
                 * @param {Array} [descendants] - running list of descendants
                 */
                const createObj = (obj, descendants = []) => {
                    const parent = obj.attributes.parent;
                    if (obj.object_id === this.camName) {
                        arenaObjects.delete(obj.object_id); // don't load our own camera/head assembly
                        return;
                    }
                    // if parent is specified, but doesn't yet exist
                    if (parent && document.getElementById(parent) === null) {
                        // Check for circular references
                        if (obj.object_id === parent || descendants.includes(parent)) {
                            console.log('Circular reference detected, skipping', obj.object_id);
                            arenaObjects.delete(obj.object_id);
                            return;
                        }
                        if (arenaObjects.has(parent)) { // Does exist in pending objects
                            // Recursively create parent, include this as child
                            createObj(arenaObjects.get(parent), [...descendants, obj.object_id]);
                        } else { // Parent doesn't exist in DOM, doesn't exist in pending arenaObjects, skip orphan
                            console.log('Orphaned object detected, skipping', obj.object_id);
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
                    mqtt.processMessage(msg);
                    arenaObjects.delete(obj.object_id);
                };
                let i = 0;
                const xhrLen = xhr.response.length;
                while (arenaObjects.size > 0) {
                    if (++i > xhrLen) {
                        console.error('Looped more than number of persist objects, aborting. Objects:', arenaObjects);
                        break;
                    }
                    const iter = arenaObjects.entries();
                    const [objId, obj] = iter.next().value; // get first entry
                    if (obj.type === 'program') {
                        // arena variables that are replaced; keys are the variable names e.g. ${scene},${cameraid}, ...
                        // const avars = {
                        //     scene: this.sceneName,
                        //     namespace: this.nameSpace,
                        //     cameraid: this.camName,
                        //     username: this.getDisplayName,
                        //     mqtth: this.mqttHost,
                        // };
                        // // ask runtime manager to start this program
                        // this.RuntimeManager.createModuleFromPersist(obj, avars);
                        // arenaObjects.delete(objId);
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
                // window.setTimeout(
                //     () => this.events.emit(ARENAEventEmitter.events.SCENE_OBJ_LOADED, !containerObjName),
                //     500,
                // );
            }
        };
    },

    /**
     * deletes scene objects from specified persistence URL if specified,
     * or this.persistenceUrl if not
     * @param {string} urlToLoad which url to unload arena from
     */
    unloadArenaScene: function(urlToLoad) {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = !data.disallowJWT;
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
    },

    /**
     * Loads and applies scene-options (if it exists), otherwise set to default environment
     */
    loadSceneOptions: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        const sceneOptions = {};

        // we add all elements to our scene root
        const sceneRoot = document.getElementById('sceneRoot');

        // set renderer defaults that are different from THREE/aframe defaults
        const renderer = sceneEl.renderer;
        renderer.gammaFactor = 2.2;
        renderer.outputEncoding = THREE['sRGBEncoding'];

        const environment = document.createElement('a-entity');
        environment.id = 'env';

        fetch(`${this.persistenceUrl}?type=scene-options`, {
            method: 'GET',
            credentials: data.disallowJWT ? 'omit' : 'same-origin',
        }).
            then((res) => res.json()).
            then((data) => {
                const payload = data[data.length - 1];
                if (payload) {
                    const options = payload['attributes'];
                    Object.assign(sceneOptions, options['scene-options']);
                    const arenaScene = document.getElementById('ARENAScene');

                    if (sceneOptions['physics']) {
                        // physics system, build with cannon-js: https://github.com/n5ro/aframe-physics-system
                        import('./systems/vendor/aframe-physics-system.min.js');
                        document.getElementById('groundPlane').setAttribute('static-body', 'true');
                    }

                    if (sceneOptions['ar-hit-test']) {
                        arenaScene.setAttribute('ar-hit-test', sceneOptions['ar-hit-test']);
                    }

                    // deal with scene attribution
                    if (sceneOptions['attribution']) {
                        const sceneAttr = document.createElement('a-entity');
                        sceneAttr.setAttribute('id', 'scene-options-attribution');
                        sceneAttr.setAttribute('attribution', sceneOptions['attribution']);
                        sceneRoot.appendChild(sceneAttr);
                        delete sceneOptions.attribution;
                    }

                    if (sceneOptions['navMesh']) {
                        sceneOptions['navMesh'] = ARENAUtils.crossOriginDropboxSrc(sceneOptions['navMesh']);
                        const navMesh = document.createElement('a-entity');
                        navMesh.id = 'navMesh';
                        navMesh.setAttribute('gltf-model', sceneOptions['navMesh']);
                        navMesh.setAttribute('nav-mesh', '');
                        sceneRoot.appendChild(navMesh);
                    }

                    if (sceneOptions['sceneHeadModels']) {
                        // add scene custom scene heads to selection list
                        this.setupSceneHeadModels();
                    }

                    if (!sceneOptions['clickableOnlyEvents']) {
                    // unusual case: clickableOnlyEvents = true by default, add warning...
                        this.health.addError('scene-options.allObjectsClickable');
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
                sceneEl.emit(EVENTS.SCENE_OPT_LOADED, true);
            });
    },

    /**
     * Update the list of scene-specific heads the user can select from
     */
    setupSceneHeadModels: function() {
        const sceneHeads = sceneOptions['sceneHeadModels'];
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
        if (sceneHeadModelPathIdx != undefined) {
            headModelPathIdx = sceneHeadModelPathIdx;
        } else if (headModelPathSelect.selectedIndex == 0) {
            // if default ARENA head used, replace with default scene head
            headModelPathIdx = defaultHeadsLen;
        } else if (localStorage.getItem('headModelPathIdx')) {
            headModelPathIdx = localStorage.getItem('headModelPathIdx');
        }
        headModelPathSelect.selectedIndex = headModelPathIdx < headModelPathSelect.length ? headModelPathIdx : 0;
    },
});
