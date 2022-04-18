/* eslint-disable no-unused-vars */
/* global ARENA */

// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="./vendor/jsrsasign-all-min.js" type="text/javascript"></script>
//  <script src="./conf/defaults.js"></script>  <!-- for window.ARENADefaults -->
//  <script src="./src/auth.js"></script>  <!-- browser authorization flow -->
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

window.AUTH = {}; // auth namespace

if (!storageAvailable('localStorage')) {
    const title = 'LocalStorage has been disabled';
    const text = 'The ARENA needs LocalStorage. ' +
        'Bugs are coming! Perhaps you have disabled cookies?';
    authError(title, text);
}

window.onload = function() {
    initAuthPanel(); // add auth details panel
};

/**
 * Display user-friendly error message.
 * @param {string} title Title of error
 * @param {string} text Error message
 */
function authError(title, text) {
    console.error(`${title}: ${text}`);
    if (typeof ARENA !== 'undefined' && ARENA.health) {
        ARENA.health.addError(title);
    } else {
        alert(`${title}\n\n${text}`);
    }
}

/**
 * Initialize and launch start of authentication flow.
 * @param {object} args auth arguments
 */
const authCheck = function() {
    AUTH.signInPath = `${window.location.protocol}//${window.location.host}/user/login`;
    AUTH.signOutPath = `${window.location.protocol}//${window.location.host}/user/logout`;
    window.addEventListener('load', requestAuthState);
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
    if (typeof ARENA !== 'undefined') {
        if (typeof ARENADefaults !== 'undefined' && ARENA.userName !== ARENADefaults.userName) {
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
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Request user state data for client-side state management.
 */
function requestAuthState() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/user/user_state`);
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send();
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            const title = 'Error loading user state';
            const text = `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`;
            authError(title, text);
        } else {
            AUTH.user_type = xhr.response.type; // user database auth state

            // provide url auth choice override
            const url = new URL(window.location.href);
            const urlAuthType = url.searchParams.get('auth');
            if (urlAuthType !== null) {
                localStorage.setItem('auth_choice', urlAuthType);
            }

            const savedAuthType = localStorage.getItem('auth_choice'); // user choice auth state
            if (xhr.response.authenticated) {
                // auth user login
                localStorage.setItem('auth_choice', xhr.response.type);
                processUserNames(xhr.response.fullname ? xhr.response.fullname : xhr.response.username);
                AUTH.user_username = xhr.response.username;
                AUTH.user_fullname = xhr.response.fullname;
                AUTH.user_email = xhr.response.email;
                requestMqttToken(xhr.response.type, xhr.response.username);
            } else {
                if (savedAuthType == 'anonymous') {
                    // user chose to login as 'anonymous', a name is required
                    const urlName = url.searchParams.get('name');
                    if (urlName !== null) {
                        localStorage.setItem('display_name', urlName);
                    } else if (localStorage.getItem('display_name') === null) {
                        localStorage.setItem('display_name', `UnnamedUser${Math.floor(Math.random() * 10000)}`);
                    }

                    // prefix all anon users with "anonymous-"
                    const anonName = processUserNames(localStorage.getItem('display_name'), 'anonymous-');
                    AUTH.user_username = anonName;
                    AUTH.user_fullname = localStorage.getItem('display_name');
                    AUTH.user_email = 'N/A';
                    requestMqttToken('anonymous', anonName);
                } else {
                    // user is logged out or new and not logged in
                    // 'remember' uri for post-login, just before login redirect
                    localStorage.setItem('request_uri', location.href);
                    location.href = AUTH.signInPath;
                }
            }
        }
    };
}

/**
 * Request token to auth service
 * @param {string} authType authentication type
 * @param {string} mqttUsername mqtt user name
 */
function requestMqttToken(authType, mqttUsername) {
    // Request JWT before connection
    const xhr = new XMLHttpRequest();
    let params = 'username=' + mqttUsername;
    params += `&id_auth=${authType}`;
    // provide user control topics for token construction
    if (typeof defaults !== 'undefined') {
        if (ARENADefaults.realm) {
            params += `&realm=${ARENADefaults.realm}`;
        }
    }
    const url = new URL(window.location.href);
    const urlNamespacedScene = url.searchParams.get('scene');
    if (urlNamespacedScene) {
        // handle build, build3d scene-specific
        params += `&scene=${decodeURIComponent(urlNamespacedScene)}`;
    } else if (typeof ARENA !== 'undefined') {
        // handle full ARENA scene
        if (ARENA.sceneName) {
            params += `&scene=${ARENA.namespacedScene}`;
        }
        params += `&userid=true`;
        params += `&camid=true`;
        params += `&handleftid=true`;
        params += `&handrightid=true`;
    }
    xhr.open('POST', `/user/mqtt_auth`);
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            const title = 'Error loading MQTT token';
            const text = `${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`;
            authError(title, text);
        } else {
            AUTH.user_type = authType;
            AUTH.user_username = xhr.response.username;
            // keep payload for later viewing
            const tokenObj = KJUR.jws.JWS.parse(xhr.response.token);
            AUTH.token_payload = tokenObj.payloadObj;
            completeAuth(xhr.response);
        }
    };
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
    localStorage.removeItem('request_uri'); // 'forget' login redirect on success
    // mqtt-token must be set to authorize access to MQTT broker
    if (typeof ARENA !== 'undefined') {
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
    if (typeof ARENA !== 'undefined') {
        lines.push('');
        if (perms.room) {
            lines.push(`Video Conference: allowed`);
        } else {
            lines.push(`Video Conference: disallowed`);
        }
    }
    lines.push('');
    lines.push(`Publish topics:`);
    if (perms.publ && perms.publ.length > 0) {
        perms.publ.forEach((pub) => {
            lines.push(`- ${pub}`);
        });
    } else {
        lines.push(`- `);
    }
    lines.push('');
    lines.push(`Subscribe topics:`);
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
    const overlayDiv = document.querySelector('#perms-overlay');
    const dataDiv = document.querySelector('#perms-data');
    dataDiv.textContent = `${formatPerms(AUTH.token_payload)}`;
    overlayDiv.style.display = 'block';
}

/**
 * Create auth ui panel
 */
function initAuthPanel() {
    const body = document.querySelector('body');
    const overlayDiv = document.createElement('div');
    overlayDiv.id = 'perms-overlay';
    overlayDiv.style.position = 'fixed';
    overlayDiv.style.width = '100%';
    overlayDiv.style.height = '100%';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.right = '0';
    overlayDiv.style.bottom = '0';
    overlayDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlayDiv.style.zIndex = '10';
    overlayDiv.style.textAlign = '-webkit-center';
    overlayDiv.style.display = 'none';
    body.appendChild(overlayDiv);

    const modalDiv = document.createElement('div');
    modalDiv.style.textAlign = 'left';
    modalDiv.style.marginTop = '27vh';
    modalDiv.style.color = 'black';
    modalDiv.style.backgroundColor = 'white';
    modalDiv.style.width = '50%';
    modalDiv.style.height = '50%';
    modalDiv.style.padding = '5px';
    modalDiv.style.borderRadius = '5px';
    overlayDiv.appendChild(modalDiv);

    const title = document.createElement('h3');
    title.style.textAlign = 'center';
    title.innerHTML = 'MQTT/Video Permissions';
    modalDiv.appendChild(title);

    const dataDiv = document.createElement('div');
    dataDiv.id = 'perms-data';
    dataDiv.style.height = '75%';
    dataDiv.style.width = '100%';
    dataDiv.style.overflow = 'auto';
    dataDiv.style.overflowWrap = 'break-word';
    dataDiv.style.font = '11px monospace';
    dataDiv.style.whiteSpace = 'pre';
    modalDiv.appendChild(dataDiv);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'Close';
    closeBtn.addEventListener('click', (event) => {
        overlayDiv.style.display = 'none';
    });
    modalDiv.appendChild(closeBtn);
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
        return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

// start authentication flow
authCheck();
