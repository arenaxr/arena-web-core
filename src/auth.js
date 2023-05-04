/* eslint-disable no-unused-vars */
/* global ARENA */

// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="../vendor/jsrsasign-all-min.js" type="text/javascript"></script>
//  <script src="../conf/defaults.js"></script>  <!-- for window.ARENADefaults -->
//  <script src="../src/auth.js"></script>  <!-- browser authorization flow -->
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

window.AUTH = {
    getMQTTToken: function() {
        if (this.mqtt_token) {
            const token = this.mqtt_token;
            delete this.mqtt_token;
            return token;
        } else {
            console.error('MQTT Token Invalidated');
            return null;
        }
    },
}; // auth namespace
// This is meant to pre-empt any ARENA systems loading, so we bootstrap keys that are needed for auth
if (typeof ARENA === 'undefined') {
    window.ARENA = {
        defaults: ARENADefaults,
    };
    // These need to be refactored into some initial loading function, maybe just the util class (which
    // is totally different from the new ARENA system btw...)
    ARENA.setSceneName = function(sceneName) {
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
            if (!ARENA.queryParams) {
                scenename = ARENAUtils?.getUrlParam('scene', scenename);
            } else {
                scenename = ARENA.queryParams.get('scene') || scenename;
            }
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
                // TODO: consolidate this
                if (!ARENA.queryParams) {
                    scenename = ARENAUtils?.getUrlParam('scene', scenename);
                } else {
                    scenename = ARENA.queryParams.get('scene') || scenename;
                }
                _setNames(namespace, scenename);
            }
        }
        // Sets namespace, persistenceUrl, outputTopic, renderTopic, vioTopic
        this.persistenceUrl = '//' + this.defaults.persistHost + this.defaults.persistPath + this.namespacedScene;
        this.outputTopic = this.defaults.realm + '/s/' + this.namespacedScene + '/';
        this.renderTopic = this.outputTopic + '#';
        this.vioTopic = this.defaults.realm + '/vio/' + this.namespacedScene + '/';
    }.bind(ARENA);
    ARENA.setUserName = function(name = undefined) {
        // set userName
        if (name === undefined) {
            if (!ARENA.queryParams) {
                name = ARENAUtils?.getUrlParam('name', this.defaults.userName);
            } else {
                name = ARENA.queryParams.get('name') || this.defaults.userName;
            }
        } // check url params, defaults
        this.userName = name;
    }.bind(ARENA);
}
ARENA.queryParams = new URLSearchParams(window.location.search);

if (!storageAvailable('localStorage')) {
    const title = 'LocalStorage has been disabled';
    const text = 'The ARENA needs LocalStorage. ' + 'Bugs are coming! Perhaps you have disabled cookies?';
    authError(title, text);
}

window.onload = function() {
    // load sweetalert if not already loaded
    if (typeof Swal === 'undefined') {
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@10';
        head.appendChild(script);
    }
};

/**
 * Display user-friendly error message.
 * @param {string} title Title of error
 * @param {string} text Error message
 */
function authError(title, text) {
    console.error(`${title}: ${text}`);
    if (ARENA?.health) {
        ARENA.health.addError(title);
    } else if (Swal) {
        Swal.fire({
            icon: 'error',
            title: title,
            html: text,
        });
    }
}

/**
 * Initialize and launch start of authentication flow.
 * @param {boolean} [blocking]- whether this should block before anything else loads
 */
const authCheck = function(loadBlocking = false) {
    AUTH.signInPath = `//${window.location.host}/user/login`;
    AUTH.signOutPath = `//${window.location.host}/user/logout`;
    if (loadBlocking) {
        ARENA.setSceneName();
        ARENA.setUserName();
        requestAuthState(true);
    } else {
        window.addEventListener('load', requestAuthState);
    }
};

/**
 * Processes name sources from auth for downstream use.
 * @param {string} authName Preferred name from auth source
 * @param {string} prefix User name prefix
 * @return {string} A username suitable for auth requests
 */
function processUserNames(authName, prefix = null) {
    // var processedName = encodeURI(authName);
    let processedName = authName.replace(/[^a-zA-Z0-9]/g, '');
    if (ARENA) {
        if (ARENADefaults && ARENA.userName !== ARENADefaults.userName) {
            // userName set? persist to storage
            localStorage.setItem('display_name', decodeURI(ARENA.userName));
            processedName = ARENA.userName;
        }
        const savedName = localStorage.getItem('display_name');
        if (savedName === null || !savedName || savedName == 'undefined') {
            // Use auth name to create human-readable name
            localStorage.setItem('display_name', authName);
        }
        ARENA.displayName = localStorage.getItem('display_name');
    }
    if (prefix !== null) {
        processedName = `${prefix}${processedName}`;
    }
    return processedName;
}

/**
 * Processes user sign out.
 */
function signOut() {
    localStorage.removeItem('auth_choice');
    // back to signin page
    location.href = AUTH.signOutPath;
}

/**
 * Utility function to get cookie value
 * @param {string} name cookie name
 * @return {string} cookie value
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Request user state data for client-side state management.
 * This is a blocking request
 * @param {boolean} [completeOnload=false] Defer final auth callback to onload
 */
function requestAuthState(completeOnload = false) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/user/user_state`, false); // Blocking call
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.send();
    // Block on this request
    if (xhr.status !== 200) {
        const title = 'Error loading user state';
        const text = `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`;
        authError(title, text);
    } else {
        let userStateRes;
        try {
            userStateRes = JSON.parse(xhr.response);
        } catch (e) {
            const title = 'Error parsing user state';
            const text = `${e}: ${xhr.response}`;
            authError(title, text);
        }
        AUTH.authenticated = userStateRes.authenticated;
        AUTH.user_type = userStateRes.type; // user database auth state
        const queryParams = ARENA.queryParams;
        const urlAuthType = queryParams.get('auth');
        if (urlAuthType !== null) {
            localStorage.setItem('auth_choice', urlAuthType);
        }

        const savedAuthType = localStorage.getItem('auth_choice'); // user choice auth state
        if (AUTH.authenticated) {
            // auth user login
            localStorage.setItem('auth_choice', userStateRes.type);
            processUserNames(userStateRes.fullname ? userStateRes.fullname : userStateRes.username);
            AUTH.user_username = userStateRes.username;
            AUTH.user_fullname = userStateRes.fullname;
            AUTH.user_email = userStateRes.email;
            requestMqttToken(userStateRes.type, userStateRes.username, completeOnload).then();
        } else {
            if (savedAuthType === 'anonymous') {
                const urlName = queryParams.get('name');
                if (urlName !== null) {
                    localStorage.setItem('display_name', urlName);
                } else if (localStorage.getItem('display_name') === null) {
                    localStorage.setItem('display_name', `UnnamedUser${Math.floor(Math.random() * 10000)}`);
                }
                const anonName = processUserNames(
                    localStorage.getItem('display_name'), 'anonymous-');
                AUTH.user_username = anonName;
                AUTH.user_fullname = localStorage.getItem('display_name');
                AUTH.user_email = 'N/A';
                requestMqttToken('anonymous', anonName, completeOnload).then();
            } else {
                // user is logged out or new and not logged in
                // 'remember' uri for post-login, just before login redirect
                localStorage.setItem('request_uri', location.href);
                location.href = AUTH.signInPath;
            }
        }
    }
}

/**
 * Request token to auth service
 * @param {string} authType authentication type
 * @param {string} mqttUsername mqtt user name
 * @param {boolean} completeOnload wait for page load before firing callback
 */
async function requestMqttToken(authType, mqttUsername, completeOnload = false) {
    const queryParams = ARENA.queryParams;
    const authParams = {
        username: mqttUsername,
        id_auth: authType,
    };
    if (typeof defaults !== 'undefined') {
        // Where does "defaults" come from?
        if (ARENADefaults.realm) {
            authParams.realm = ARENADefaults.realm;
        }
    }

    const urlNamespacedScene = queryParams.get('scene');
    if (urlNamespacedScene) {
        authParams.scene = decodeURIComponent(urlNamespacedScene);
    } else if (ARENA) {
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
            headers: {'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': 'application/x-www-form-urlencoded'},
            method: 'POST',
            body: new URLSearchParams(authParams),
        });
        if (!authRes.ok) {
            const title = 'Error loading MQTT token';
            const text = `${authRes.status}: ${authRes.statusText} ${JSON.stringify(authRes.response)}`;
            authError(title, text);
            return;
        }

        const authData = await authRes.json();
        AUTH.user_type = authType;
        AUTH.user_username = authData.username;
        // keep payload for later viewing
        const tokenObj = KJUR.jws.JWS.parse(authData.token);
        AUTH.token_payload = tokenObj.payloadObj;
        if (!completeOnload || document.readyState === 'complete') { // Also handle crazy case page already loaded
            completeAuth(authData);
        } else {
            window.addEventListener('load', () => {
                completeAuth(authData);
            });
        }
    } catch (e) {
        throw Error('Error requesting auth token: ' + e.message);
    }
}

/**
 * Auth is done; persist data in local storage and emit event
 * @param {object} response The mqtt_auth response json
 */
function completeAuth(response) {
    const onAuthEvt = {
        mqtt_username: response.username,
        mqtt_token: response.token,
    };
    if (response.ids) {
        onAuthEvt.ids = response.ids;
    }
    AUTH.mqtt_token = onAuthEvt;
    localStorage.removeItem('request_uri'); // 'forget' login redirect on success
    // mqtt-token must be set to authorize access to MQTT broker
    if (ARENA?.events) {
        // emit event to ARENA.event
        ARENA.events.emit('onauth', onAuthEvt);
        return;
    }

    // emit custom event to window
    const authCompleteEvent = new CustomEvent('onauth', {
        detail: onAuthEvt,
    });
    window.dispatchEvent(authCompleteEvent);
}

/**
 * Get auth status
 * @return {object} auth status object
 */
function getAuthStatus() {
    return {
        authenticated: AUTH.authenticated,
        type: AUTH.user_type,
        username: AUTH.user_username,
        fullname: AUTH.user_fullname,
        email: AUTH.user_email,
    };
}

/**
 * Utility function to format token contents
 * @param {object} perms token permissions
 * @return {string} html formatted string
 */
function formatPerms(perms) {
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
}

/**
 * Open profile in new page to avoid mqtt disconnect.
 */
function showProfile() {
    window.open(`${window.location.protocol}//${window.location.host}/user/profile`);
}

/**
 * Present a div with token permissions
 */
function showPerms() {
    Swal.fire({
        title: 'Permissions',
        html: `<pre style="text-align: left;">${formatPerms(AUTH.token_payload)}</pre>`,
    });
}

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

// start authentication flow
authCheck(true);
