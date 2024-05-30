/* global ARENA, ARENAAUTH, ARENADefaults, KJUR, Swal, MQTTPattern */

// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="../vendor/jsrsasign-all-min.js" type="text/javascript"></script>
//  <script src="../conf/defaults.js"></script>  <!-- for window.ARENADefaults -->
//  <script src="../static/auth.js"></script>  <!-- browser authorization flow -->
//
// Implement the following 'onauth' event handler and use it to start code that would
// automatically connects to the MQTT broker so that authentication and access tokens
// can be present when making a broker connection which will need username (email) and
// password (access token).
//
// window.addEventListener('onauth', async function (e) {
//     client.connect({
//         onSuccess: onConnect,
//         userName: e.detail.mqtt_username,
//         password: e.detail.mqtt_token
//     });
// });

// import * as MQTTPattern from 'mqtt-pattern';

// auth namespace
window.ARENAAUTH = {
    signInPath: `//${window.location.host}/user/login`,
    signOutPath: `//${window.location.host}/user/logout`,
    uploadFileTypes: {
        image: 'image/*',
        'gltf-model': '*.glb',
        'obj-model': '*.obj',
        'pcd-model': '*.pcd',
        'threejs-scene': '*.json',
        gaussian_splatting: '*.splat',
        'urdf-model': '*.urdf',
    },
    /**
     * Merge defaults and any URL params into single ARENA.params obj. Nonexistent keys should be checked as undefined.
     */
    setArenaParams() {
        const queryParams = new URLSearchParams(window.location.search);
        ARENA.params = { ...ARENA.defaults, ...Object.fromEntries(queryParams) };
    },
    /**
     * Get auth status
     * @return {object} auth status object
     */
    getAuthStatus() {
        return {
            authenticated: this.authenticated,
            type: this.user_type,
            username: this.user_username,
            fullname: this.user_fullname,
            email: this.user_email,
            is_staff: this.user_is_staff,
        };
    },
    authCheck() {
        this.setArenaParams();
        ARENA.userName = ARENA.params.name ?? ARENA.defaults.userName;
        // For now, just an alias for legacy code.
        // TODO: consolidate userName, params.name, and arena-system.data.name
        this.setSceneName();
        this.requestAuthState();
    },
    /**
     * Display user-friendly error message.
     * @param {string} title Title of error
     * @param {string} text Error message
     */
    authError(title, text) {
        console.error(`${title}: ${text}`);
        if (ARENA?.health) {
            ARENA.health.addError(title);
        } else if (Swal) {
            Swal.fire({
                icon: 'error',
                title,
                html: text,
            });
        }
    },
    /**
     * Processes name sources from auth for downstream use.
     * @param {string} authName Preferred name from auth source
     * @param {string} prefix User name prefix
     * @return {string} A username suitable for auth requests
     */
    processUserNames(authName, prefix = null) {
        // var processedName = encodeURI(authName);
        let processedName = authName.replace(/[^a-zA-Z0-9]/g, '');
        if (ARENA.userName !== ARENADefaults?.userName) {
            // userName set? persist to storage
            localStorage.setItem('display_name', decodeURI(ARENA.userName));
            processedName = ARENA.userName;
        }
        const savedName = localStorage.getItem('display_name');
        if (savedName === null || !savedName || savedName === 'undefined') {
            // Use auth name to create human-readable name
            localStorage.setItem('display_name', authName);
        }
        ARENA.displayName = localStorage.getItem('display_name');
        if (prefix !== null) {
            processedName = `${prefix}${processedName}`;
        }
        return processedName;
    },
    /**
     * Request user state data for client-side state management.
     * This is a blocking request
     */
    requestAuthState() {
        // 'remember' uri for post-login, just before login redirect
        localStorage.setItem('request_uri', window.location.href);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/user/user_state`, false); // Blocking call
        xhr.setRequestHeader('X-CSRFToken', this.getCookie('csrftoken'));
        xhr.send();
        // Block on this request
        if (xhr.status !== 200) {
            const title = 'Error loading user state';
            const text = `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`;
            this.authError(title, text);
        } else {
            let userStateRes;
            try {
                userStateRes = JSON.parse(xhr.response);
            } catch (e) {
                const title = 'Error parsing user state';
                const text = `${e}: ${xhr.response}`;
                this.authError(title, text);
            }
            this.authenticated = userStateRes.authenticated;
            this.user_type = userStateRes.type; // user database auth state
            const urlAuthType = ARENA.params.auth;
            if (urlAuthType !== undefined) {
                localStorage.setItem('auth_choice', urlAuthType);
            }

            const savedAuthType = localStorage.getItem('auth_choice'); // user choice auth state
            if (this.authenticated) {
                // auth user login
                localStorage.setItem('auth_choice', userStateRes.type);
                this.processUserNames(userStateRes.fullname ? userStateRes.fullname : userStateRes.username);
                this.user_username = userStateRes.username;
                this.user_fullname = userStateRes.fullname;
                this.user_email = userStateRes.email;
                this.user_is_staff = userStateRes.is_staff;
                this.requestMqttToken(userStateRes.type, userStateRes.username, true).then();
            } else if (savedAuthType === 'anonymous') {
                const urlName = ARENA.params.userName;
                const savedName = localStorage.getItem('display_name');
                if (savedName === null) {
                    if (urlName !== null) {
                        localStorage.setItem('display_name', urlName);
                    } else {
                        localStorage.setItem('display_name', `UnnamedUser${Math.floor(Math.random() * 10000)}`);
                    }
                }
                const anonName = this.processUserNames(localStorage.getItem('display_name'), 'anonymous-');
                this.user_username = anonName;
                this.user_fullname = localStorage.getItem('display_name');
                this.user_email = 'N/A';
                this.user_is_staff = userStateRes.is_staff;
                this.requestMqttToken('anonymous', anonName, true).then();
            } else {
                // user is logged out or new and not logged in
                window.location.href = this.signInPath;
            }
        }
    },
    /**
     * Processes user sign out.
     */
    signOut() {
        // 'remember' uri for post-login, just before login redirect
        localStorage.setItem('request_uri', window.location.href);
        // back to signin page
        window.location.href = window.ARENAAUTH.signOutPath;
    },
    /**
     * Utility function to get cookie value
     * @param {string} name cookie name
     * @return {string} cookie value
     */
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === `${name}=`) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },
    /**
     * Request token to auth service
     * @param {string} authType authentication type
     * @param {string} mqttUsername mqtt user name
     * @param {boolean} completeOnload wait for page load before firing callback
     */
    async requestMqttToken(authType, mqttUsername, completeOnload = false) {
        const nonScenePaths = ['/scenes/', '/build/', '/programs/', '/network/', '/files/'];
        const authParams = {
            username: mqttUsername,
            id_auth: authType,
        };
        if (ARENA.params.realm) {
            authParams.realm = ARENA.params.realm;
        }

        if (ARENA.params.scene) {
            authParams.scene = decodeURIComponent(ARENA.params.scene);
        } else if (!nonScenePaths.includes(window.location.pathname)) {
            // handle full ARENA scene
            if (ARENA.sceneName) {
                authParams.scene = ARENA.namespacedScene;
            }
            authParams.userid = true;
            authParams.camid = true;
            authParams.handleftid = true;
            authParams.handrightid = true;
        }
        try {
            const authRes = await fetch('/user/mqtt_auth', {
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                method: 'POST',
                body: new URLSearchParams(authParams),
            });
            if (!authRes.ok) {
                const title = 'Error loading MQTT token';
                const text = `${authRes.status}: ${authRes.statusText} ${JSON.stringify(authRes.response)}`;
                this.authError(title, text);
                return;
            }

            const authData = await authRes.json();
            this.user_type = authType;
            this.user_username = authData.username;
            // keep payload for later viewing
            const tokenObj = KJUR.jws.JWS.parse(authData.token);
            this.token_payload = tokenObj.payloadObj;
            authData.token_payload = tokenObj.payloadObj;
            if (!completeOnload || document.readyState === 'complete') {
                // Also handle crazy case page already loaded
                this.completeAuth(authData);
            } else {
                window.addEventListener('load', () => {
                    ARENAAUTH.completeAuth(authData);
                });
            }
        } catch (e) {
            throw Error(`Error requesting auth token: ${e.message}`);
        }
    },
    /**
     * Auth is done; persist data in local storage and emit event
     * @param {object} response The mqtt_auth response json
     */
    completeAuth(response) {
        const onAuthEvt = {
            mqtt_username: response.username,
            mqtt_token: response.token,
            token_payload: response.token_payload,
        };
        if (response.ids) {
            onAuthEvt.ids = response.ids;
        }
        localStorage.removeItem('request_uri'); // 'forget' login redirect on success

        // emit custom event to window
        const authCompleteEvent = new CustomEvent('onauth', {
            detail: onAuthEvt,
        });
        window.dispatchEvent(authCompleteEvent);
    },
    /**
     * Utility function to format token contents
     * @param {object} perms token permissions
     * @return {string} html formatted string
     */
    formatPerms(perms) {
        const lines = [];
        if (perms.sub) {
            lines.push(`User: ${perms.sub}`);
        }
        if (perms.exp) {
            const date = new Date(perms.exp * 1000);
            lines.push(`Expires: ${date.toLocaleString()}`);
        }
        if (ARENA) {
            // TODO: Check for some other indicator
            lines.push('');
            if (perms.room) {
                lines.push(`Video Conference: allowed`);
            } else {
                lines.push(`Video Conference: disallowed`);
            }
        }
        lines.push('');
        lines.push(`MQTT Publish topics:`);
        if (perms.publ && perms.publ.length > 0) {
            perms.publ.forEach((pub) => {
                lines.push(`- ${pub}`);
            });
        } else {
            lines.push(`- `);
        }
        lines.push('');
        lines.push(`MQTT Subscribe topics:`);
        if (perms.subs && perms.subs.length > 0) {
            perms.subs.forEach((sub) => {
                lines.push(`- ${sub}`);
            });
        } else {
            lines.push(`- `);
        }
        return lines.join('\r\n');
    },
    async uploadSceneFileStore(objtype, oldObj) {
        const accept = this.uploadFileTypes[objtype];
        const htmlopt =
            objtype === 'gltf-model'
                ? `<div style="float: left;">
            <input type="checkbox" id="cbhideinar" name="cbhideinar" >
            <label for="cbhideinar" style="display: inline-block;">Room-scale digital-twin model? Hide in AR.</label>
            </div>`
                : '';
        const htmlval = `${htmlopt}`;

        await Swal.fire({
            title: `Upload ${objtype} to Filestore & Publish`,
            html: htmlval,
            input: 'file',
            inputAttributes: {
                accept: `${accept}`,
                'aria-label': `Select ${objtype}`,
            },
            confirmButtonText: 'Upload & Publish',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            showLoaderOnConfirm: true,
            preConfirm: (resultFileOpen) => {
                const fn = resultFileOpen.name.substr(0, resultFileOpen.name.lastIndexOf('.'));
                const safeFilename = fn.replace(/(\W+)/gi, '-');
                let hideinar = false;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    const file = document.querySelector('.swal2-file');
                    if (!file) {
                        Swal.showValidationMessage(`${objtype} file not loaded!`);
                        return;
                    }
                    if (objtype === 'gltf-model') {
                        // allow model checkboxes hide in ar/vr (recommendations)
                        hideinar = Swal.getPopup().querySelector('#cbhideinar').checked;
                    }
                    // request fs token endpoint if auth not ready or expired
                    let token = this.getCookie('auth');
                    if (!this.isTokenUsable(token)) {
                        try {
                            await this.requestStoreLogin();
                        } catch (err) {
                            Swal.showValidationMessage(`Error requesting file store login: ${err.statusText}`);
                            return;
                        }
                        token = this.getCookie('auth');
                    }
                    // update user/staff scoped path
                    const storeResPrefix = this.user_is_staff ? `users/${this.user_username}/` : ``;
                    const userFilePath = `scenes/${ARENA.sceneName}/${resultFileOpen.name}`;
                    const storeResPath = `${storeResPrefix}${userFilePath}`;
                    const storeExtPath = `store/users/${this.user_username}/${userFilePath}`;
                    Swal.fire({
                        title: 'Wait for Upload',
                        imageUrl: evt.target.result,
                        imageAlt: `The uploaded ${objtype}`,
                        showConfirmButton: false,
                        showCancelButton: true,
                        cancelButtonText: 'Cancel',
                        didOpen: () => {
                            Swal.showLoading();
                            // request fs file upload with fs auth
                            return fetch(`/storemng/api/resources/${storeResPath}?override=true`, {
                                method: 'POST',
                                headers: {
                                    Accept: resultFileOpen.type,
                                    'X-Auth': `${token}`,
                                },
                                body: file.files[0],
                            })
                                .then((responsePostFS) => {
                                    if (!responsePostFS.ok) {
                                        throw new Error(responsePostFS.statusText);
                                    }
                                    let obj;
                                    try {
                                        obj = JSON.parse(oldObj);
                                    } catch (err) {
                                        console.error(err);
                                        throw err;
                                    }
                                    if (obj.object_id === '') {
                                        obj.object_id = safeFilename;
                                    }
                                    if (objtype === 'gaussian_splatting') {
                                        obj.data.src = `${storeExtPath}`;
                                    } else if (objtype === 'obj-model') {
                                        obj.data.obj = `${storeExtPath}`;
                                    } else {
                                        obj.data.url = `${storeExtPath}`;
                                    }
                                    if (hideinar) {
                                        obj.data['hide-on-enter-ar'] = true;
                                    }
                                    if (objtype === 'image') {
                                        // try to preserve image aspect ratio in mesh, user can scale to resize
                                        const img = Swal.getPopup().querySelector('.swal2-image');
                                        if (img.width > img.height) {
                                            const ratio = img.width / img.height;
                                            obj.data.width = ratio;
                                            obj.data.height = 1;
                                        } else {
                                            const ratio = img.height / img.width;
                                            obj.data.width = 1;
                                            obj.data.height = ratio;
                                        }
                                        obj.data.scale = { x: 1, y: 1, z: 1 };
                                    }
                                    return obj;
                                })
                                .catch((error) => {
                                    Swal.showValidationMessage(`Request failed: ${error}`);
                                })
                                .finally(() => {
                                    Swal.hideLoading();
                                });
                        },
                        willClose: () => {
                            console.debug('Nothing');
                        },
                    }).then((resultDidOpen) => {
                        if (resultDidOpen.dismiss === Swal.DismissReason.timer) {
                            console.error(`Upload ${objtype} file dialog timed out!`);
                        }
                    });
                };
                reader.readAsDataURL(resultFileOpen);
            },
        });
    },
    /**
     * Checks loaded MQTT token for full scene object write permissions.
     * @param {string} token The JWT token for the user to connect to MQTT.
     * @param {string} objectsTopic
     * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneEditor(token, objectsTopic) {
        if (token) {
            const tokenObj = KJUR.jws.JWS.parse(token);
            const perms = tokenObj.payloadObj;
            if (this.matchJWT(objectsTopic, perms.publ)) {
                return true;
            }
        }
        return false;
    },
    isTokenUsable(token) {
        if (token) {
            const tokenObj = KJUR.jws.JWS.parse(token);
            const exp = tokenObj.payloadObj.exp * 1000;
            const now = new Date().getTime();
            return now < exp;
        }
        return false;
    },
    /**
     * Utility to match MQTT topic within permissions.
     * @param {string} topic The MQTT topic to test.
     * @param {string[]} rights The list of topic wild card permissions.
     * @return {boolean} True if the topic matches the list of topic wildcards.
     */
    matchJWT(topic, rights) {
        const len = rights.length;
        let valid = false;
        for (let i = 0; i < len; i++) {
            // if (MQTTPattern.matches(rights[i], topic)) {
            valid = true;
            break;
        }
        // }
        return valid;
    },
    /**
     * Open profile in new page to avoid mqtt disconnect.
     */
    showProfile() {
        window.open(`${window.location.protocol}//${window.location.host}/user/profile`);
    },

    /**
     * Present a div with token permissions
     */
    showPerms() {
        Swal.fire({
            title: 'Permissions',
            html: `<pre style='text-align: left;'>${ARENAAUTH.formatPerms(ARENAAUTH.token_payload)}</pre>`,
        });
    },
    setSceneName() {
        // private function to set scenename, namespacedScene and namespace
        const _setNames = (ns, sn) => {
            ARENA.namespacedScene = `${ns}/${sn}`;
            ARENA.sceneName = sn;
            ARENA.nameSpace = ns;
        };
        let path = window.location.pathname.substring(1);
        const { namespace } = ARENA.params;
        let { sceneName } = ARENA.params;
        if (ARENADefaults.devInstance && path.length > 0) {
            const devPrefix = path.match(/(?:x|dev)\/([^/]+)\/?/g);
            if (devPrefix) {
                path = path.replace(devPrefix[0], '');
            }
        }
        if (path === '' || path === 'index.html') {
            sceneName = ARENA.params.scene ?? sceneName;
            _setNames(namespace, sceneName);
        } else {
            try {
                const r = /^(?<namespace>[^/]+)(\/(?<sceneName>[^/]+))?/g;
                const matches = r.exec(path).groups;
                // Only first group is given, namespace is actually the scene name
                if (matches.sceneName === undefined) {
                    _setNames(namespace, matches.namespace);
                } else {
                    // Both scene and namespace are defined, return regex as-is
                    _setNames(matches.namespace, matches.sceneName);
                }
            } catch (e) {
                sceneName = ARENA.params.scene ?? sceneName;
                _setNames(namespace, sceneName);
            }
        }
    },

    /**
     * Internal call to perform xhr request
     * TODO (mwfarb): remove me
     */
    _makeRequest(method, url, params = undefined, contentType = undefined) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            const csrftoken = ARENAAUTH.getCookie('csrftoken');
            xhr.setRequestHeader('X-CSRFToken', csrftoken);
            if (contentType) xhr.setRequestHeader('Content-Type', contentType);
            xhr.responseType = 'json';
            xhr.onload = function onload() {
                if (this.status >= 200 && this.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject(
                        new Error({
                            status: this.status,
                            statusText: xhr.statusText,
                        })
                    );
                }
            };
            xhr.onerror = function onerror() {
                reject(
                    new Error({
                        status: this.status,
                        statusText: xhr.statusText,
                    })
                );
            };
            xhr.send(params);
        });
    },

    /**
     * Request file store auth token for this user
     * @return {} status, should have updated cookie: 'auth'
     */
    async requestStoreLogin() {
        return this._makeRequest('GET', '/user/storelogin');
    },
};

// This is meant to pre-empt any ARENA systems loading, so we bootstrap keys that are needed for auth
if (typeof ARENA === 'undefined') {
    window.ARENA = {
        defaults: ARENADefaults,
    };
}

window.onload = function authOnLoad() {
    // load sweetalert if not already loaded
    if (typeof Swal === 'undefined') {
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'static/vendor/sweetalert2.all.min.js';
        head.appendChild(script);
    }
};

/**
 * Check if local storage is available
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 * @param {string} type storage type
 * @return {boolean} storage available true/false
 */
function storageAvailable(type) {
    let storage;
    try {
        storage = window[type];
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return (
            e instanceof DOMException &&
            // everything except Firefox
            (e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage &&
            storage.length !== 0
        );
    }
}

if (!storageAvailable('localStorage')) {
    const title = 'LocalStorage has been disabled';
    const text = 'The ARENA needs LocalStorage. Bugs are coming! Perhaps you have disabled cookies?';
    ARENAAUTH.authError(title, text);
}

// start authentication flow
ARENAAUTH.authCheck();
