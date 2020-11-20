// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="https://apis.google.com/js/platform.js"></script>
//  <script src="./defaults.js"></script>  <!-- for window.defaults -->
//  <script src="./auth.js"></script>  <!-- browser authorization flow -->
//  <script type="text/javascript">authCheck({ signInPath: "./user" });</script>
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

if (!storageAvailable('localStorage')) {
    alert('QUACK!\n\nLocalStorage has been disabled, and the ARENA needs it. Bugs are coming! Perhaps you have disabled cookies?');
}

var auth2;
var signInPath;
// check if the current user is already signed in
var authCheck = function(args) {
    signInPath = args.signInPath;
    switch (localStorage.getItem("auth_choice")) {
        case "anonymous":
            window.addEventListener('load', checkAnonAuth);
            break;
        default: // default = can mean private browser
            window.addEventListener('load', checkAnonAuth);
            break;
    }
};

function checkAnonAuth(event) {
    // prefix all anon users with "anonymous-"
    var anonName = processUserNames(localStorage.getItem("display_name"), 'anonymous-');
    verifyMqttToken("anonymous", anonName);
}

function checkGoogleAuth() {
    auth2 = gapi.auth2.init({
        client_id: defaults.gAuthClientId
    }).then(function() {
        auth2 = gapi.auth2.getAuthInstance();
        if (!auth2.isSignedIn.get()) {
            console.log("User is not signed in.");
            // send login with redirection url from this page
            localStorage.setItem("request_uri", location.href);
            location.href = signInPath;
        } else {
            console.log("User is already signed in.");
            localStorage.setItem("auth_choice", "google");
            var googleUser = auth2.currentUser.get();
            onSignIn(googleUser);
        }
    }, function(error) {
        console.error(error);
        // send login with redirection url from this page
        localStorage.setItem("request_uri", location.href);
        location.href = signInPath;
    });
}

/**
 * Processes name sources from auth for downstream use.
 * @param {string} authName - Preferred name from auth source.
 * @return {string} A username suitable for auth requests.
 */
function processUserNames(authName, prefix = null) {
    // var processedName = encodeURI(authName);
    var processedName = authName.replace(/[^a-zA-Z0-9]/g, '');
    if (typeof globals !== 'undefined') {
        if (typeof defaults !== 'undefined' && globals.userParam !== defaults.userParam) {
            // userParam set? persist to storage
            localStorage.setItem("display_name", decodeURI(globals.userParam));
            processedName = globals.userParam;
        }
        if (localStorage.getItem("display_name") === null) {
            // Use auth name to create human-readable name
            localStorage.setItem("display_name", authName);
        }
        globals.displayName = localStorage.getItem("display_name");
    }
    if (prefix !== null) {
        processedName = `${prefix}${processedName}`;
    }
    if (typeof globals !== 'undefined') {
        globals.userParam = processedName;
        // replay global id setup from events.js
        globals.idTag = globals.timeID + "_" + globals.userParam; // e.g. 1234_eric
        if (globals.fixedCamera !== '') {
            globals.camName = "camera_" + globals.fixedCamera + "_" + globals.fixedCamera;
        } else {
            globals.camName = "camera_" + globals.idTag; // e.g. camera_1234_eric
        }
        globals.viveLName = "viveLeft_" + globals.idTag; // e.g. viveLeft_9240_X
        globals.viveRName = "viveRight_" + globals.idTag; // e.g. viveRight_9240_X
    }
    return processedName;
}

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Full Name: ' + profile.getName());
    console.log('Email: ' + profile.getEmail());
    processUserNames(profile.getName());
    // request mqtt-auth
    var id_token = googleUser.getAuthResponse().id_token;
    verifyMqttToken("google", profile.getEmail(), id_token);
}

function signOut() {
    // logout, and disassociate user
    switch (localStorage.getItem("auth_choice")) {
        case "google":
            var auth2 = gapi.auth2.getAuthInstance();
            auth2.signOut().then(function() {
                console.log('User signed out.');
            });
            auth2.disconnect();
            break;
        default:
            break;
    }
    localStorage.removeItem("auth_choice");
    localStorage.removeItem("mqtt_username");
    localStorage.removeItem("mqtt_token");
    // back to signin page
    localStorage.setItem("request_uri", location.href);
    location.href = signInPath;
}

function verifyMqttToken(auth_type, mqtt_username, id_token = null) {
    // read current token if any and check
    var mqtt_token = localStorage.getItem("mqtt_token");
    var bad_token = mqtt_token == null;
    // low-security check for reusable token avoiding unneeded auth backend requests
    if (!bad_token) {
        var tokenObj = KJUR.jws.JWS.parse(mqtt_token);
        // TODO (mwfarb): for now, new cam name requires new token, reevaluate later
        if (typeof globals !== 'undefined' && globals.camName) {
            bad_token = true;
        } else {
            var now = new Date().getTime() / 1000;
            bad_token = tokenObj.payloadObj.exp < now;
        }
    }
    if (bad_token) {
        requestMqttToken(auth_type, mqtt_username, id_token);
    } else {
        completeAuth(mqtt_username, mqtt_token);
    }
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

function requestMqttToken(auth_type, mqtt_username, id_token = null) {
    // Request JWT before connection
    let xhr = new XMLHttpRequest();
    var params = "username=" + mqtt_username + `&id_auth=${auth_type}`;
    // provide user control topics for token construction
    if (typeof defaults !== 'undefined') {
        if (defaults.realm) {
            params += "&realm=" + defaults.realm;
        }
    }
    if (typeof globals !== 'undefined') {
        if (globals.scenenameParam) {
            params += "&scene=" + globals.scenenameParam;
        }
        if (globals.idTag) {
            params += "&userid=" + globals.idTag;
        }
        if (globals.camName) {
            params += "&camid=" + globals.camName;
        }
        if (globals.viveLName) {
            params += "&ctrlid1=" + globals.viveLName;
        }
        if (globals.viveRName) {
            params += "&ctrlid2=" + globals.viveRName;
        }
    }
    xhr.open('POST', defaults.urlMqttAuth);
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
            completeAuth(xhr.response.username, xhr.response.token);
        }
    };
}

function completeAuth(username, token) {
    console.log("got mqtt-user/mqtt-token:", username, token);
    localStorage.setItem("mqtt_username", username);
    localStorage.setItem("mqtt_token", token);
    // mqtt-token must be set to authorize access to MQTT broker
    const authCompleteEvent = new CustomEvent('onauth', {
        detail: {
            mqtt_username: username,
            mqtt_token: token
        }
    });
    window.dispatchEvent(authCompleteEvent);
}

function getAuthStatus() {
    switch (localStorage.getItem("auth_choice")) {
        case "google":
            var googleUser = auth2.currentUser.get();
            var profile = googleUser.getBasicProfile();
            return {
                type: "Google",
                name: profile.getName(),
                email: profile.getEmail(),
            };
        default:
            return {
                type: "Anonymous",
                name: localStorage.getItem("display_name"),
                email: "N/A",
            };
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (e) {
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
