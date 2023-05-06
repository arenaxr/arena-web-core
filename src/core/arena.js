/**
 * @fileoverview Main ARENA Object
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import { ARENADefaults } from '../../conf/defaults.js';
import { ARENAUtils } from '../utils';
import { ARENAJitsi } from './jitsi.js';
import { ARENAHealth } from '../health/index.js';
import { ARENAWebARUtils } from '../webar/index.js';
import { EVENTS } from '../constants/index.js';
import Swal from 'sweetalert2';

AFRAME.registerSystem('arena-scene', {
    schema: {
        devInstance: {type: 'boolean', default: ARENADefaults.devInstance},
        persistHost: {type: 'string', default: ARENADefaults.persistHost},
        persistPath: {type: 'string', default: ARENADefaults.persistPath},
        camHeight: {type: 'number', default: ARENADefaults.camHeight},
        jitsiHost: {type: 'string', default: ARENADefaults.jitsiHost},
        disallowJWT: {type: 'boolean', default: !!ARENADefaults.disallowJWT},
    },

    init: function(evt) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        // wait for auth to authorize user, init called from onAuth with evt detail of token
        if (!evt) {
            window.addEventListener(EVENTS.ON_AUTH, this.init.bind(this));
            return;
        }

        // start client health monitor
        this.health = new ARENAHealth();

        // Sync params with bootstrap ARENA object from Auth
        this.params = { ...ARENA.params };
        this.defaults = ARENA.defaults;
        this.userName = ARENA.userName;
        this.displayName = ARENA.displayName;
        this.sceneName = ARENA.sceneName;
        this.namespacedScene = ARENA.namespacedScene;
        // Sets namespace, persistenceUrl, outputTopic, renderTopic, vioTopic
        this.nameSpace = ARENA.nameSpace;
        this.persistenceUrl = "//" + this.params.persistHost + this.params.persistPath + this.namespacedScene;
        this.outputTopic = this.params.realm + "/s/" + this.namespacedScene + "/";
        this.renderTopic = this.outputTopic + "#";
        this.vioTopic = this.params.realm + "/vio/" + this.namespacedScene + "/";

        window.ARENA = this; // alias to window for easy access

        // query string start coords given as a comma-separated string, e.g.: 'startCoords=0,1.6,0'
        if (typeof this.params.startCoords === 'string') {
            this.startCoords = this.params.startCoords.split(",").map((i) => Number(i));
        }

        // setup required scene-options defaults
        // TODO: pull these from a schema
        this.clickableOnlyEvents = true;
        this.maxAVDist = 20;
        this.privateScene = false;
        this.videoFrustumCulling = true;
        this.videoDistanceConstraints = true;

        this.mqttToken = evt.detail;

        // id tag including name is set from authentication service
        this.setIdTag(this.mqttToken.ids.userid, ARENA);

        if (this.isUsersPermitted()) {
            this.showEchoDisplayName();
        } else {
            // prevent local name when non-interactive
            this.params.noname = true;
        }

        sceneEl.ARENAUserParamsLoaded = true;
        sceneEl.emit(EVENTS.USER_PARAMS_LOADED, true);

        this.loadScene();

        // setup webar session
        ARENAWebARUtils.handleARButtonForNonWebXRMobile();

        // setup event listeners
        sceneEl.addEventListener(EVENTS.NEW_SETTINGS, (e) => {
            const args = e.detail;
            if (!args.userName) return; // only handle a user name change
            this.showEchoDisplayName();
        });

        // this.events.on(ARENAEventEmitter.events.DOMINANT_SPEAKER, (e) => {
        //     const speaker = (!e.detail.id || e.detail.id === this.idTag); // self is speaker
        //     this.showEchoDisplayName(speaker);
        // });
    },

    loadScene: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        // wait for mqtt client to be loaded
        if (!sceneEl.ARENAMqttLoaded) {
            sceneEl.addEventListener(EVENTS.MQTT_LOADED, this.loadScene.bind(this));
            return;
        }

        // wait for aframe scene to be ready to render
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('loaded', this.loadScene.bind(this));
            return;
        }

        if (this.params.armode) {
            /*
            Instantly enter AR mode for now.
            TODO: incorporate AV selection for possible Jitsi and multicamera
            */
            if (ARENAUtils.isWebXRViewer() || AFRAME.utils.device.checkARSupport()) {
                sceneEl.enterAR();
            } else {
                ARENAWebARUtils.enterARNonWebXR();
            }
        } else if (this.params.skipav) {
            // Directly initialize Jitsi videoconferencing
            this.Jitsi = ARENAJitsi.init(data.jitsiHost);
        } else if (!this.params.noav && this.isJitsiPermitted()) {
            window.setupAV(() => {
                // Initialize Jitsi videoconferencing after A/V setup window
                this.Jitsi = ARENAJitsi.init(data.jitsiHost);
            });
        }

        if (this.params.build3d) {
            sceneEl.setAttribute('build-watch-scene', true);
            sceneEl.setAttribute('debug', true);
        }

        this.loadSceneOptions();
        this.loadSceneObjects();
        this.loadUser();

        console.info(`* ARENA Started * Scene:${this.namespacedScene}; User:${this.userName}; idTag:${this.idTag}`);

        sceneEl.ARENALoaded = true;
        sceneEl.emit(EVENTS.ARENA_LOADED, true);
        console.log(this.camName)
    },

    /**
     * Sets this.idTag using name given as argument, url parameter value, or default
     * Important: Also sets amName, faceName, handLName, handRName which depend on idTag
     * @param {string} idTag user name to set; will use url parameter value or default is no name is given
     */
    setIdTag: function (idTag) {
        if (idTag === undefined) throw 'setIdTag: idTag not defined.'; // idTag must be set
        this.idTag = idTag;

        // set camName
        this.camName = `camera_${this.idTag}`; // e.g. camera_1234_eric
        // if fixedCamera is given, then camName must be set accordingly
        if (this.params.fixedCamera) {
            this.camName = this.params.fixedCamera;
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
    getDisplayName: function () {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(this.userName);
        return displayName;
    },

    /**
     * Checks loaded MQTT/Jitsi token for Jitsi video conference permission.
     * @return {boolean} True if the user has permission to stream audio/video in this scene.
     */
    isJitsiPermitted: function () {
        if (this.params.build3d) return false; // build3d is used on a new page
        return !!this.mqttToken.token_payload.room;
    },

    /**
     * Checks loaded MQTT/Jitsi token for user interaction permission.
     * TODO: This should perhaps use another flag, more general, not just chat.
     * @return {boolean} True if the user has permission to send/receive chats in this scene.
     */
    isUsersPermitted: function () {
        const data = this.data;
        if (this.params.build3d) return false; // build3d is used on a new page
        return ARENAUtils.matchJWT(`${this.params.realm}/c/${this.nameSpace}/o/#`, this.mqttToken.token_payload.subs);
    },

    /**
     * Checks token for full scene object write permissions.
     * @param {object} mqttToken - token with user permissions; Defaults to currently loaded MQTT token
     * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneWriter: function () {
        return ARENAUtils.matchJWT(this.renderTopic, this.mqttToken.token_payload.publ);
    },

    /**
     * Renders/updates the display name in the top left corner of a scene.
     * @param {boolean} speaker If the user is the dominant speaker
     */
    showEchoDisplayName: function (speaker) {
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
    loadUser: function () {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        const cameraEl = sceneEl.camera.el;
        cameraEl.setAttribute('arena-camera', 'enabled', this.isUsersPermitted());
        cameraEl.setAttribute('arena-camera', 'displayName', this.getDisplayName());

        const startPos = new THREE.Vector3();
        if (this.startCoords instanceof Array) { // This is a split string to array
            startPos.set(...this.startCoords);
            cameraEl.object3D.position.copy(startPos);
            cameraEl.object3D.position.y += data.camHeight;
            this.startCoords = startPos;
        } else if (this.params.startLastPos) {
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            const lastPos = sceneHist[this.namespacedScene]?.lastPos;
            if (lastPos) {
                startPos.copy(lastPos);
                cameraEl.object3D.position.copy(startPos);
                cameraEl.object3D.position.y += data.camHeight;
                this.startCoords = startPos;
            }
        }

        const systems = sceneEl.systems;
        const landmark = systems['landmark'];

        // Fallthrough failure if startLastPos fails
        if (!this.startCoords && landmark) {
            // Try to define starting position if the scene has startPosition objects
            const startPosition = landmark.getRandom(true);
            if (startPosition) {
                console.log('Moving camera to start position', startPosition.el.id);
                startPosition.teleportTo();
                startPos.copy(cameraEl.object3D.position);
                startPos.y -= data.camHeight;
                this.startCoords = startPos;
            }
        }

        if (!this.startCoords) { // Final fallthrough for failures, resort to default
            const navSys = systems.nav;
            startPos.copy(this.defaults.startCoords);
            if (navSys.navMesh) {
                try {
                    const closestGroup = navSys.getGroup(startPos, false);
                    const closestNode = navSys.getNode(startPos, closestGroup, false);
                    navSys.clampStep(startPos, startPos, closestGroup, closestNode, startPos);
                } catch {
                }
            }
            cameraEl.object3D.position.copy(startPos);
            cameraEl.object3D.position.y += data.camHeight;
        }

        // enable vio if fixedCamera is given
        if (this.params.fixedCamera) {
            cameraEl.setAttribute('arena-camera', 'vioEnabled', true);
        }

        if (this.params.build3d) {
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
    loadArenaInspector: function () {
        const data = this.data;

        const sceneEl = this.el.sceneEl;

        let el;
        if (this.params.objectId) {
            el = document.getElementById(this.params.objectId); // requested id
        } else {
            el = document.querySelector("[build-watch-object]"); // first id
        }
        sceneEl.components.inspector.openInspector(el ? el : null);
        console.log('build3d', 'A-Frame Inspector loaded');

        setTimeout(() => {
            const perm = this.isUserSceneWriter();
            updateInspectorPanel(perm, '#inspectorContainer #scenegraph');
            updateInspectorPanel(perm, '#inspectorContainer #viewportBar #transformToolbar');
            updateInspectorPanel(perm, '#inspectorContainer #rightPanel');

            // use "Back to Scene" to send to real ARENA scene
            $('a.toggle-edit').click(function () {
                // remove the build3d a-frame inspector
                const url = new URL(window.location.href);
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
    loadSceneObjects: function (urlToLoad, parentName, prefixName) {
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
    unloadsceneEl: function (urlToLoad) {
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
    loadSceneOptions: function () {
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

                    if (sceneOptions['physics']) {
                        // physics system, build with cannon-js: https://github.com/n5ro/aframe-physics-system
                        import('../systems/vendor/aframe-physics-system.min.js');
                        document.getElementById('groundPlane').setAttribute('static-body', 'true');
                    }

                    if (sceneOptions['ar-hit-test']) {
                        sceneEl.setAttribute('ar-hit-test', sceneOptions['ar-hit-test']);
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
    setupSceneHeadModels: function () {
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
