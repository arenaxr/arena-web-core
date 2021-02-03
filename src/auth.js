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
//  <script type="text/javascript">authCheck();</script>
//
// Implement the following 'onauth' event handler and use it to start code that would
// automatically connects to the MQTT broker so that authentication and access tokens
// can be present when making a broker connection which will need username (email) and
// password (access token).
//
// window.addEventListener('onauth', function (e) {
//     client.connect({
//         onSuccess: onConnect,
//         userName: e.detail.mqtt_username,
//         password: e.detail.mqtt_token
//     });
// });


window.AUTH = {}; // auth namespace

if (!storageAvailable('localStorage')) {
    alert('QUACK!\n\nLocalStorage has been disabled, and the ARENA needs it.' +
        'Bugs are coming! Perhaps you have disabled cookies?');
}

window.onload = function() {
    initAuthPanel(); // add auth details panel
};

/**
 * Initialize and launch start of authentication flow.
 * @param {object} args auth arguments
 */
const authCheck = function() {
    localStorage.setItem('request_uri', location.href); // save current in case of login redirect
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
        if (localStorage.getItem('display_name') === null) {
            // Use auth name to create human-readable name
            localStorage.setItem('display_name', authName);
        }
        ARENA.displayName = localStorage.getItem('display_name');
    }
    if (prefix !== null) {
        processedName = `${prefix}${processedName}`;
    }
    if (typeof ARENA !== 'undefined') {
        ARENA.setUserName(processedName);
    }
    return processedName;
}

/**
 * Processes user sign out.
 */
function signOut() {
    localStorage.removeItem('auth_choice');
    // back to signin page
    localStorage.setItem('request_uri', location.href);
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
            console.error(`Error loading user_state: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
        } else {
            AUTH.user_type = xhr.response.type; // user database auth state
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
                    // user chose to login as 'anonymous'
                    // prefix all anon users with "anonymous-"
                    const anonName = processUserNames(localStorage.getItem('display_name'), 'anonymous-');
                    AUTH.user_username = anonName;
                    AUTH.user_fullname = localStorage.getItem('display_name');
                    AUTH.user_email = 'N/A';
                    requestMqttToken('anonymous', anonName);
                } else {
                    // user is logged out or new and not logged in
                    location.href = AUTH.signInPath;
                }
            }
        }
    };
}

/**
 * API SAMPLE: Request scene names which the user has permission to from user database.
 */
function _requestUserScenes() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/user/my_scenes');
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send();
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error(`Error: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
        } else {
            const scenes = xhr.response;
            console.debug('user scenes count:', scenes.length);
            scenes.forEach((s) => {
                console.debug('user scene name:', s.name);
            });
        }
    };
}

/**
 * API SAMPLE: Request a scene is added to the user database.
 * @param {string} sceneNameOnly name of the scene without namespace
 * @param {boolean} isPublic true when 'public' namespace is used, false for user namespace
 */
function _requestUserNewScene(sceneNameOnly, isPublic) {
    const params = new FormData();
    params.append('scene', sceneNameOnly);
    params.append('is_public', isPublic);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/user/new_scene');
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error(`Error: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
        } else {
            console.debug('added new scene ', sceneNameOnly);
        }
    };
}

function _requestDeleteScene(sceneNameOnly) {
    const params = new FormData();
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', `/user/scenes/${sceneNameOnly}`);
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error(`Error: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
        } else {
            console.debug(xhr.response);
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
    if (typeof ARENA !== 'undefined') {
        if (ARENA.sceneName) {
            params += `&scene=${ARENA.sceneName}`;
        }
        if (ARENA.idTag) {
        }
        if (ARENA.camName) {
        }
        if (ARENA.viveLName) {
        }
        if (ARENA.viveRName) {
        }
        params += `&userid=true`;
        params += `&camid=true`;
        params += `&ctrlid1=true`;
        params += `&ctrlid2=true`;
    }
    xhr.open('POST', `/user/mqtt`);
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading mqtt-token: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
            signOut(); // critical error
        } else {
            console.log(xhr.response)
            AUTH.user_type = authType;
            AUTH.user_username = xhr.response.username;
            // keep payload for later viewing
            const tokenObj = KJUR.jws.JWS.parse(xhr.response.token);
            AUTH.token_payload = tokenObj.payloadObj;

            ARENA.setIdTag(xhr.response.user_ids.userid);

            completeAuth(xhr.response.username, xhr.response.token);
        }
    };
}

/**
 * Auth is done; persist data in local storage and emit event
 * @param {string} username auth user name
 * @param {string} token mqtt token
 */
function completeAuth(username, token) {
    const onAuthEvt = {
        mqtt_username: username,
        mqtt_token: token,
    };
    // mqtt-token must be set to authorize access to MQTT broker
    if (typeof ARENA !== 'undefined') {
        // emit event to ARENA.event
        ARENA.events.emit('onauth', onAuthEvt);
        return;
    }
    localStorage.removeItem('request_uri');

    // emit custom event to window
    const authCompleteEvent = new CustomEvent('onauth', { detail: onAuthEvt });
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
    lines.push(`<br>Publish topics:`);
    if (perms.publ && perms.publ.length > 0) {
        perms.publ.forEach((pub) => {
            lines.push(`- ${pub}`);
        });
    } else {
        lines.push(`- `);
    }
    lines.push(`<br>Subscribe topics:`);
    if (perms.subs && perms.subs.length > 0) {
        perms.subs.forEach((sub) => {
            lines.push(`- ${sub}`);
        });
    } else {
        lines.push(`- `);
    }
    return lines.join('<br>');
}

function showProfile() {
    // open profile in new page to avoid mqtt disconnect
    window.open(`${window.location.protocol}//${window.location.host}/user/profile`);
}

/**
 * Present a div with token permissions
 */
function showPerms() {
    const overlayDiv = document.querySelector('#perms-overlay');
    const dataDiv = document.querySelector('#perms-data');
    dataDiv.innerHTML = `${formatPerms(AUTH.token_payload)}`;
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
    modalDiv.style.backgroundColor = 'white';
    modalDiv.style.width = '50%';
    modalDiv.style.height = '50%';
    modalDiv.style.padding = '5px';
    modalDiv.style.borderRadius = '5px';
    overlayDiv.appendChild(modalDiv);

    const title = document.createElement('h3');
    title.style.textAlign = 'center';
    title.innerHTML = 'MQTT Permissions';
    modalDiv.appendChild(title);

    const dataDiv = document.createElement('div');
    dataDiv.id = 'perms-data';
    dataDiv.style.height = '75%';
    dataDiv.style.width = '100%';
    dataDiv.style.overflow = 'auto';
    dataDiv.style.overflowWrap = 'break-word';
    dataDiv.style.font = '11px monospace';
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
