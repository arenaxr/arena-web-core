/* global ARENAAUTH, ARENADefaults */

// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
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

// auth namespace
window.ARENAAUTH = {
    nonScenePaths: ['scenes', 'build', 'programs', 'network', 'files', 'dashboard', 'replay'],
    signInPath: `//${window.location.host}/user/v2/login`,
    signOutPath: `//${window.location.host}/user/v2/logout`,
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
                text,
                allowEscapeKey: false,
                allowOutsideClick: true,
                showConfirmButton: false,
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
        let processedName = authName ? authName.replace(/[^a-zA-Z0-9]/g, '') : '';
        if (ARENA.userName !== ARENADefaults?.userName) {
            // userName set? persist to storage
            localStorage.setItem('display_name', decodeURI(ARENA.userName));
            processedName = ARENA.userName.replace(/[^a-zA-Z0-9]/g, '');
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
    async requestAuthState() {
        // 'remember' uri for post-login, just before login redirect
        localStorage.setItem('request_uri', window.location.href);

        const res = await this.makeUserRequest('GET', '/user/v2/user_state');
        if (!res) return;
        const userStateRes = await res.json();
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
            await this.requestMqttToken(userStateRes.type, userStateRes.username, true);
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
            await this.requestMqttToken('anonymous', anonName, true);
        } else {
            // user is logged out or new and not logged in
            window.location.href = this.signInPath;
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
        const authParams = {
            username: mqttUsername,
            id_auth: authType,
            client: 'web',
        };
        if (ARENA.params.realm) {
            authParams.realm = ARENA.params.realm;
        }

        // only request single-scene specific perms when rendering scene
        // other functional pages should have general permissions for the user's scene objects
        if (!this.nonScenePaths.includes(window.location.pathname.split('/')[1])) {
            // handle full ARENA scene
            if (ARENA.sceneName) {
                authParams.scene = ARENA.namespacedScene;
            }
            authParams.camid = true;
            authParams.handleftid = true;
            authParams.handrightid = true;
        }
        try {
            const res = await this.makeUserRequest(
                'POST',
                '/user/v2/mqtt_auth',
                authParams,
                'application/x-www-form-urlencoded'
            );
            if (!res) return;
            const authData = await res.json();
            this.user_type = authType;
            this.user_username = authData.username;
            // keep payload for later viewing
            this.token_payload = this.parseJwt(authData.token);
            authData.token_payload = this.token_payload;
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
     * Re-request the MQTT auth token scoped to a specific scene.
     * Use this when the current JWT may not have subscribe/publish rights for a
     * particular namespace/scene (e.g., switching scenes in the Build page or
     * Replay viewer). This updates the mqtt_token cookie server-side.
     * @param {string} namespacedScene - Scene in "namespace/sceneName" format
     * @return {Promise<{mqtt_username: string, mqtt_token: string}>}
     */
    async refreshSceneAuth(namespacedScene) {
        if (!this.user_type || !this.user_username) {
            console.warn('[Auth] Cannot refresh scene auth: user not authenticated yet');
            return null;
        }
        const authParams = {
            username: this.user_username,
            id_auth: this.user_type,
            client: 'web',
            realm: ARENA.params?.realm || (typeof ARENADefaults !== 'undefined' ? ARENADefaults.realm : 'realm'),
            scene: namespacedScene,
        };
        try {
            const res = await this.makeUserRequest(
                'POST',
                '/user/v2/mqtt_auth',
                authParams,
                'application/x-www-form-urlencoded'
            );
            if (!res) return null;
            const authData = await res.json();
            this.user_username = authData.username;
            this.token_payload = this.parseJwt(authData.token);
            console.log(`[Auth] Refreshed JWT for scene: ${namespacedScene}`);
            return { mqtt_username: authData.username, mqtt_token: authData.token, ids: authData.ids };
        } catch (e) {
            console.error(`[Auth] Failed to refresh scene auth: ${e.message}`);
            return null;
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
    /**
     * Parse the JWT payload into a JSON object.
     * @param {*} jwt The JWT
     * @return {Object} the JSON payload
     */
    parseJwt(jwt) {
        const parts = jwt.split('.');
        if (parts.length !== 3) {
            throw new Error('JWT format invalid!');
        }
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join('')
        );
        return JSON.parse(jsonPayload);
    },
    /**
     * Checks loaded MQTT token for full scene object write permissions.
     * @param {string} token The JWT token for the user to connect to MQTT.
     * @param {string} objectsTopic
     * @return {boolean} True if the user has permission to write in this scene.
     */
    isUserSceneEditor(token, objectsTopic) {
        if (token) {
            const perms = this.parseJwt(token);
            if (this.matchJWT(objectsTopic, perms.publ)) {
                return true;
            }
        }
        return false;
    },
    isTokenUsable(token) {
        if (token) {
            const payloadObj = this.parseJwt(token);
            const exp = payloadObj.exp * 1000;
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
            if (this.mqttPatternMatches(rights[i], topic)) {
                valid = true;
                break;
            }
        }
        return valid;
    },
    /**
     * Open profile in new page to avoid mqtt disconnect.
     */
    showProfile() {
        window.open(`${window.location.protocol}//${window.location.host}/user/v2/profile`);
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
    /**
     * Private function to set scenename, namespacedScene and namespace.
     */
    setSceneName() {
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
                const matches = r.exec(path)?.groups;
                if (!matches) throw new Error('No matches');
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
     * Internal call to perform fetch request
     */
    /**
     * Request user state data for client-side state management
     * @return {Promise<object>} object with user account data
     */
    async userAuthState() {
        const res = await this.makeUserRequest('GET', `/user/v2/user_state`);
        if (!res) return null;
        return res.json();
    },
    /**
     * Request scene names which the user has permission to from user database
     * @return {Promise<string[]>} list of scene names
     */
    async userScenes() {
        const res = await this.makeUserRequest('GET', '/user/v2/my_scenes');
        if (!res) return null;
        return res.json();
    },
    /**
     * Request a scene is added to the user database.
     * @param {string} sceneNamespace name of the scene without namespace
     * @param {boolean} isPublic true when 'public' namespace is used, false for user namespace
     */
    async requestUserNewScene(sceneNamespace, isPublic = false) {
        // TODO: add public parameter
        const res = await this.makeUserRequest('POST', `/user/v2/scenes/${sceneNamespace}`);
        if (!res) return null;
        return res.json();
    },
    /**
     * Request to delete scene permissions from user db
     * @param {string} sceneNamespace name of the scene without namespace
     */
    async requestDeleteUserScene(sceneNamespace) {
        const res = await this.makeUserRequest('DELETE', `/user/v2/scenes/${sceneNamespace}`);
        if (!res) return null;
        return res.json();
    },
    async makeUserRequest(method, url, params = undefined, contentType = undefined) {
        return fetch(url, {
            headers: {
                'X-CSRFToken': this.getCookie('csrftoken'),
                'Content-Type': contentType || null,
            },
            method,
            body: params ? new URLSearchParams(params) : null,
        })
            .then((response) => {
                if (response.ok || (method === 'DELETE' && response.status === 404)) {
                    return response;
                }
                throw new Error(
                    `${response.status}: ${response.statusText} - ${url} - ${response.response ? response.response : ''}`
                );
            })
            .catch((error) => {
                this.authError('Request Error', error.message);
            });
    },
    /**
     * MQTTPattern matches from: https://github.com/RangerMauve/mqtt-pattern/blob/master/index.js
     * @param {string} pattern
     * @param {string} topic
     * @returns {boolean}
     */
    mqttPatternMatches(pattern, topic) {
        const SEPARATOR = '/';
        const SINGLE = '+';
        const ALL = '#';
        const patternSegments = pattern.split(SEPARATOR);
        const topicSegments = topic.split(SEPARATOR);

        const patternLength = patternSegments.length;
        const topicLength = topicSegments.length;
        const lastIndex = patternLength - 1;

        for (let i = 0; i < patternLength; i++) {
            const currentPattern = patternSegments[i];
            const patternChar = currentPattern[0];
            const currentTopic = topicSegments[i];

            if (!currentTopic && !currentPattern) continue;
            if (!currentTopic && currentPattern !== ALL) return false;

            // Only allow # at end
            if (patternChar === ALL) return i === lastIndex;
            if (patternChar !== SINGLE && currentPattern !== currentTopic) return false;
        }

        return patternLength === topicLength;
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
        script.src = '/static/vendor/sweetalert2.all.min.js';
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
