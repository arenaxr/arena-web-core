import {
    ARENAUtils
} from '../src/utils.js';
import {
    ARENAMqtt
} from '../src/mqtt.js';
import {
    ARENAEventEmitter
} from '../src/event-emitter.js';
import {
    ARENAHealth
} from '../src/health/';
import Swal from 'sweetalert2';

/* global ARENA, KJUR */

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
        this.health = new ARENAHealth();

        // replace console with our logging (only when not in dev)
        if (!ARENADefaults.devInstance) {
            // will queue messages until MQTT connection is available (indicated by console.setOptions())
            ARENAMqttConsole.init();
        }
        this.defaults = ARENADefaults; // "get" arena defaults
        this.events = new ARENAEventEmitter(); // arena events target
        this.timeID = new Date().getTime() % 10000;
        this.camUpdateIntervalMs = ARENAUtils.getUrlParam('camUpdateIntervalMs', this.defaults.camUpdateIntervalMs);

        this.latencyTopic = this.defaults.latencyTopic;

        // set scene name from url
        this.setSceneName();

        // set user name from url params or defaults
        this.setUserName();

        // set mqttHost and mqttHostURI from url params or defaults
        this.setmqttHost();

        // setup event listener
        this.events.on(ARENAEventEmitter.events.ONAUTH, this.onAuth.bind(this));
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
    }

    /**
     * Sets this.sceneName and this.namespacedScene from url. this.namespacedScene
     * includes namespace prefix (e.g. `namespace/foo`)
     * Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
     * Also sets persistenceUrl, outputTopic, renderTopic which depend on scene name
     */
    setSceneName() {
        // private function to set scenename, namespacedScene and namespace
        const _setNames = (ns, sn) => {
            this.namespacedScene = `${ns}/${sn}`;
            this.sceneName = sn;
            this.nameSpace = ns;
        };
        let path = window.parent.window.location.pathname.substring(1);
        let {
            namespace: namespace,
            sceneName: scenename
        } = this.defaults;
        if (this.defaults.devInstance && path.length > 0) {
            const devPrefix = path.match(/(?:x|dev)\/([^\/]+)\/?/g);
            if (devPrefix) {
                path = path.replace(devPrefix[0], '');
            }
        }
        if (path === '' || path === 'scene.html') {
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

        // load namespace from defaults or local storage, if they exist; prefer url parameter, if given
        let url = new URL(window.parent.window.location.href);
        let sceneParam = decodeURI(url.searchParams.get('scene'));
        let ns, s;
        if (sceneParam) {
            let sn = sceneParam.split('/');
            ns = sn[0];
            s = sn[1];
        } else {
            ns = localStorage.getItem('namespace') === null ? username : localStorage.getItem('namespace');
            s = localStorage.getItem('scene') === null ? dfts.scene : localStorage.getItem('scene');
        }
        localStorage.setItem('namespace', ns);
        localStorage.setItem('scene', s);
        // pass updated scene param back to address bar url
        let newUrl = new URL(window.parent.window.location.href);
        newUrl.searchParams.set('scene', `${ns}/${s}`);
        window.parent.window.history.pushState({
            path: newUrl.href
        }, '', newUrl.href);

        _setNames(ns, s);

        // Sets namespace, persistenceUrl, outputTopic, renderTopic
        this.persistenceUrl = '//' + this.defaults.persistHost + this.defaults.persistPath + this.namespacedScene;
        this.outputTopic = this.defaults.realm + '/s/' + this.namespacedScene + '/';
        this.renderTopic = this.outputTopic + '#';
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
     * Checks token for full scene object write permissions.
     * @param {object} mqttToken - token with user permissions; Defaults to currently loaded MQTT token
     * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneWriter(mqttToken = ARENA.mqttToken) {
        if (mqttToken) {
            const tokenObj = KJUR.jws.JWS.parse(this.mqttToken);
            const perms = tokenObj.payloadObj;
            if (ARENAUtils.matchJWT(ARENA.renderTopic, perms.publ)) {
                return true;
            }
        }
        return false;
    }

    /**
     * scene init before starting to receive messages
     */
    initScene = () => {
        // load scene
        ARENA.loadSceneOptions();

        ARENA.events.on(ARENAEventEmitter.events.SCENE_OPT_LOADED, () => {
            ARENA.loadSceneObjects();
        });

        // after scene is completely loaded, add user camera
        ARENA.events.on(ARENAEventEmitter.events.SCENE_OBJ_LOADED, () => {
            ARENA.loadSceneInspector();
        });
    };

    /**
     * Auto load the a-frame inspector, expects all known object to be loaded first
     */
    loadSceneInspector() {
        const sceneEl = document.querySelector('a-scene');
        const object_id = ARENAUtils.getUrlParam('object_id', '');
        if (object_id) {
            console.log(`object_id`, object_id);
            const el = document.querySelector(`#${object_id}`);
            sceneEl.components.inspector.openInspector(el);
        } else {
            sceneEl.components.inspector.openInspector();
        }
        console.log('build3d', 'A-Frame Inspector loaded');

        // TODO: (mwfarb) fix hack to modify a-frame
        setTimeout(() => {
            // force TRS buttons visibility
            $('#aframeInspector #viewportBar').css('align-items', 'unset');
            // use "Back to Scene" to send to real ARENA scene
            $('a.toggle-edit').click(function() {
                const scene = decodeURI(ARENAUtils.getUrlParam('scene', ''));
                window.parent.window.location.href = `https://${window.parent.window.location.host}/${scene}`;
            });
        }, 2000);
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
                        console.warn(`Ignoring program '${obj.attributes.name}' for build3d.`);
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

                if (sceneOptions['physics']) {
                    // physics system, build with cannon-js: https://github.com/n5ro/aframe-physics-system
                    import('../src/components/vendor/aframe-physics-system.min.js');
                    document.getElementById('groundPlane').setAttribute('static-body', 'true');
                }

                // deal with navMesh dropbox links
                if (sceneOptions['navMesh']) {
                    sceneOptions['navMesh'] = ARENAUtils.crossOriginDropboxSrc(sceneOptions['navMesh']);
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
     * When user auth is done, startup mqtt...
     * Remaining init will be done once mqtt connection is done
     * @param {event} e
     */
    async onAuth(e) {
        const args = e.detail;

        this.username = args.mqtt_username;
        this.mqttToken = args.mqtt_token;

        // add page header
        $('#header').load('../header-old.html');

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
                JSON.stringify({
                    object_id: this.camName,
                    action: 'delete'
                }),
                // last will topic
                this.outputTopic + this.camName,
            );

            console.info(
                `* ARENA Started * Scene:${ARENA.namespacedScene}; User:${ARENA.userName}; idTag:${ARENA.idTag} `);
        }); // mqtt API (after this.* above, are defined)
    }
}

/**
 * ARENA global object
 */
module.exports = window.ARENA = Arena.init();
