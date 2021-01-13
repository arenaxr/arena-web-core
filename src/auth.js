/* eslint-disable no-unused-vars */
/* global ARENA */

// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="https://apis.google.com/js/platform.js"></script>
//  <script src="./vendor/jsrsasign-all-min.js" type="text/javascript"></script>
//  <script src="./conf/defaults.js"></script>  <!-- for window.ARENADefaults -->
//  <script src="./auth.js"></script>  <!-- browser authorization flow -->
//  <script type="text/javascript">authCheck({ signInPath: "./signin" });</script>
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

// eslint-disable-next-line no-var
var auth2;

/**
 * check if the current user is already signed in
 * @param {object} args auth arguments
 */
function authCheck(args) {
    localStorage.removeItem('mqtt_token'); // deprecate local token storage
    AUTH.signInPath = args.signInPath;
    switch (localStorage.getItem('auth_choice')) {
    case 'anonymous':
        window.addEventListener('load', checkAnonAuth);
        break;
    case 'google':
    default: // default = can mean private browser
        // normal check for google auth2
        try {
            gapi.load('auth2', checkGoogleAuth);
        } catch (e) {
            console.error(e);
            // send login with redirection url from this page
            localStorage.setItem('request_uri', location.href);
            location.href = AUTH.signInPath;
        }
        break;
    }
};

/**
 * check anonymous authentication
 * @param {object} event event
 */
function checkAnonAuth(event) {
    // prefix all anon users with "anonymous-"
    const anonName = processUserNames(localStorage.getItem('display_name'), 'anonymous-');
    requestMqttToken('anonymous', anonName);
}

/**
 * check google oauth authentication
 */
function checkGoogleAuth() {
    auth2 = gapi.auth2.init({
        client_id: ARENADefaults.gAuthClientId,
    }).then(function() {
        auth2 = gapi.auth2.getAuthInstance();
        if (!auth2.isSignedIn.get()) {
            console.log('User is not signed in.');
            // send login with redirection url from this page
            localStorage.setItem('request_uri', location.href);
            location.href = AUTH.signInPath;
        } else {
            console.log('User is already signed in.');
            localStorage.setItem('auth_choice', 'google');
            const googleUser = auth2.currentUser.get();
            onSignIn(googleUser);
        }
    }, function(error) {
        console.error(error);
        // send login with redirection url from this page
        localStorage.setItem('request_uri', location.href);
        location.href = AUTH.signInPath;
    });
}

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
 * Processes user signin.
 * @param {object} googleUser user data
 */
function onSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Full Name: ' + profile.getName());
    console.log('Email: ' + profile.getEmail());
    processUserNames(profile.getName());
    // request mqtt-auth
    const idToken = googleUser.getAuthResponse().id_token;
    requestMqttToken('google', profile.getEmail(), idToken);
}

/**
 * Processes user sign out.
 */
function signOut() {
    // logout, and disassociate user
    switch (localStorage.getItem('auth_choice')) {
    case 'google':
        const auth2 = gapi.auth2.getAuthInstance();
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
    location.href = AUTH.signInPath;
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
 * Request token to auth service
 * @param {string} authType authentication type
 * @param {string} mqttUsername mqtt user name
 * @param {string} idToken id to use in the token
 */
function requestMqttToken(authType, mqttUsername, idToken = null) {
    // Request JWT before connection
    const xhr = new XMLHttpRequest();
    let params = 'username=' + mqttUsername + '&id_token=' + idToken;
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
            params += `&userid=${ARENA.idTag}`;
        }
        if (ARENA.camName) {
            params += `&camid=${ARENA.camName}`;
        }
        if (ARENA.viveLName) {
            params += `&ctrlid1=${ARENA.viveLName}`;
        }
        if (ARENA.viveRName) {
            params += `&ctrlid2=${ARENA.viveRName}`;
        }
    }
    xhr.open('POST', ARENADefaults.urlMqttAuth);
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
            AUTH.user_type = authType;
            AUTH.user_username = xhr.response.username;
            switch (authType) {
            case 'google':
                const googleUser = auth2.currentUser.get();
                const profile = googleUser.getBasicProfile();
                AUTH.user_fullname = profile.getName();
                AUTH.user_email = profile.getEmail();
                break;
            default:
                AUTH.user_fullname = localStorage.getItem('display_name');
                AUTH.user_email = 'N/A';
                break;
            }

            // keep payload for later viewing
            const tokenObj = KJUR.jws.JWS.parse(xhr.response.token);
            AUTH.token_payload = tokenObj.payloadObj;
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
    localStorage.setItem('mqtt_username', username);
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
    // emit custom event to window
    const authCompleteEvent = new CustomEvent('onauth', {detail: onAuthEvt});
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
 * @return {string} html formated string
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
