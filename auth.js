// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="https://apis.google.com/js/platform.js"></script>
//  <script src="./vendor/jsrsasign-all-min.js" type="text/javascript"></script>
//  <script src="./conf/defaults.js"></script>  <!-- for window.defaults -->
//  <script src="./auth.js"></script>  <!-- browser authorization flow -->
//  <script type="text/javascript">authCheck({ userRoot: "./user" });</script>
//
// Optional:
//  <script src="./events.js"></script>  <!-- for window.globals -->
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

'use strict';

window.AUTH = {}; // auth namespace

if (!storageAvailable('localStorage')) {
    alert('QUACK!\n\nLocalStorage has been disabled, and the ARENA needs it. Bugs are coming! Perhaps you have disabled cookies?');
}

window.onload = function() {
    initAuthPanel(); // add auth details panel
};

// check if the current user is already signed in.
const authCheck = function(args) {
    localStorage.removeItem('mqtt_token'); // localStorage deprecated for token
    AUTH.signInPath = `${args.userRoot}/login`;
    AUTH.signOutPath = `${args.userRoot}/logout`;
    if (localStorage.getItem('auth_choice')) {
        window.addEventListener('load', requestAuthState);
    } else {
        location.href = AUTH.signInPath;
    }
};

/**
 * Processes name sources from auth for downstream use.
 * @param {string} authName - Preferred name from auth source.
 * @return {string} A username suitable for auth requests.
 */
function processUserNames(authName, prefix = null) {
    // var processedName = encodeURI(authName);
    let processedName = authName.replace(/[^a-zA-Z0-9]/g, '');
    if (typeof globals !== 'undefined') {
        if (typeof defaults !== 'undefined' && globals.userParam !== defaults.userParam) {
            // userParam set? persist to storage
            localStorage.setItem('display_name', decodeURI(globals.userParam));
            processedName = globals.userParam;
        }
        if (localStorage.getItem('display_name') === null) {
            // Use auth name to create human-readable name
            localStorage.setItem('display_name', authName);
        }
        globals.displayName = localStorage.getItem('display_name');
    }
    if (prefix !== null) {
        processedName = `${prefix}${processedName}`;
    }
    if (typeof globals !== 'undefined') {
        globals.userParam = processedName;
        // replay global id setup from events.js
        globals.idTag = globals.timeID + '_' + globals.userParam; // e.g. 1234_eric
        if (globals.fixedCamera !== '') {
            globals.camName = 'camera_' + globals.fixedCamera + '_' + globals.fixedCamera;
        } else {
            globals.camName = 'camera_' + globals.idTag; // e.g. camera_1234_eric
        }
        globals.viveLName = 'viveLeft_' + globals.idTag; // e.g. viveLeft_9240_X
        globals.viveRName = 'viveRight_' + globals.idTag; // e.g. viveRight_9240_X
    }
    return processedName;
}

function signOut() {
    // logout, and disassociate user
    switch (localStorage.getItem('auth_choice')) {
    case 'google':
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut().then(function() {
            console.log('User signed out.');
        });
        auth2.disconnect();
        break;
    default:
        break;
    }
    localStorage.removeItem('auth_choice');
    localStorage.removeItem('mqtt_username');
    // back to signin page
    localStorage.setItem('request_uri', location.href);
    location.href = AUTH.signOutPath;
}

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

function requestAuthState() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/user/user_state`);
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send();
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            console.error(`Error loading user_state: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
        } else {
            AUTH.user_type = xhr.response.type;
            AUTH.user_username = xhr.response.username;
            AUTH.user_fullname = xhr.response.fullname;
            AUTH.user_email = xhr.response.email;
            localStorage.setItem('auth_choice', xhr.response.type);
            if (xhr.response.authenticated) {
                requestMqttToken(xhr.response.type, xhr.response.username);
            } else {
                // prefix all anon users with "anonymous-"
                const anonName = processUserNames(localStorage.getItem('display_name'), 'anonymous-');
                requestMqttToken('anonymous', anonName);
            }
        }
    };
}

function requestMqttToken(auth_type, mqtt_username) {
    // Request JWT before connection
    const xhr = new XMLHttpRequest();
    let params = 'username=' + mqtt_username; // + "&id_token=" + id_token;
    params += `&id_auth=${auth_type}`;
    // provide user control topics for token construction
    if (typeof defaults !== 'undefined') {
        if (defaults.realm) {
            params += `&realm=${defaults.realm}`;
        }
    }
    if (typeof globals !== 'undefined') {
        if (globals.scenenameParam) {
            params += `&scene=${globals.scenenameParam}`;
        }
        if (globals.idTag) {
            params += `&userid=${globals.idTag}`;
        }
        if (globals.camName) {
            params += `&camid=${globals.camName}`;
        }
        if (globals.viveLName) {
            params += `&ctrlid1=${globals.viveLName}`;
        }
        if (globals.viveRName) {
            params += `&ctrlid2=${globals.viveRName}`;
        }
    }
    xhr.open('POST', `/user/mqtt_auth`);
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
            // keep payload for later viewing
            const tokenObj = KJUR.jws.JWS.parse(xhr.response.token);
            AUTH.token_payload = tokenObj.payloadObj;
            completeAuth(xhr.response.username, xhr.response.token);
        }
    };
}

function completeAuth(username, token) {
    localStorage.setItem('mqtt_username', username);
    // mqtt-token must be set to authorize access to MQTT broker
    const authCompleteEvent = new CustomEvent('onauth', {
        detail: {
            mqtt_username: username,
            mqtt_token: token,
        },
    });
    window.dispatchEvent(authCompleteEvent);
}

function getAuthStatus() {
    return {
        type: AUTH.user_type,
        username: AUTH.user_username,
        fullname: AUTH.user_fullname,
        email: AUTH.user_email,
    };
}

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

function showPerms() {
    const overlayDiv = document.querySelector('#perms-overlay');
    const dataDiv = document.querySelector('#perms-data');
    dataDiv.innerHTML = `${formatPerms(AUTH.token_payload)}`;
    overlayDiv.style.display = 'block';
}

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

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
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
