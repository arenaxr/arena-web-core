// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="https://apis.google.com/js/platform.js"></script>
//  <script src="./defaults.js"></script>  <!-- for window.defaults -->
//  <script src="./auth.js"></script>  <!-- browser authorization flow -->
//  <script type="text/javascript">authCheck({ signInPath: "./signin" });</script>
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
var authCheck = function (args) {
    signInPath = args.signInPath;
    switch (localStorage.getItem("auth_choice")) {
        case "anonymous":
            window.addEventListener('load', checkAnonAuth);
            break;
        case "google":
        default:
            // normal check for google auth2
            gapi.load('auth2', checkGoogleAuth);
            break;
    }
};

function checkAnonAuth(event) {
    //TODO(mwfarb): also verify valid unexpired stored mqtt-token

    // prefix all anon users with "anon-"
    var anonName = processUserNames(localStorage.getItem("display_name"), 'anonymous-');
    requestMqttToken("anonymous", anonName);
}

function checkGoogleAuth() {
    auth2 = gapi.auth2.init({
        client_id: defaults.gAuthClientId
    }).then(function () {
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
    requestMqttToken("google", profile.getEmail(), id_token);
}

function signOut() {
    // logout, and disassociate user
    switch (localStorage.getItem("auth_choice")) {
        case "google":
            var auth2 = gapi.auth2.getAuthInstance();
            auth2.signOut().then(function () {
                console.log('User signed out.');
            });
            auth2.disconnect();
            break;
        default:
            break;
    }
    //TODO(mwfarb): also remove stored mqtt-token
    localStorage.removeItem("auth_choice");
    // back to signin page
    localStorage.setItem("request_uri", location.href);
    location.href = signInPath;
}

function requestMqttToken(auth_type, mqtt_username, id_token = null) {
    // Request JWT before connection
    let xhr = new XMLHttpRequest();
    var params = "username=" + mqtt_username + "&id_token=" + id_token;
    params += `&id_auth=${auth_type}`;
    // provide user control topics for token construction
    if (typeof globals !== 'undefined') {
        if (globals.scenenameParam) {
            params += "&scene=" + globals.scenenameParam;
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
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading mqtt-token: ${xhr.status}: ${xhr.statusText} ${JSON.stringify(xhr.response)}`);
            signOut(); // critical error
        } else {
            //TODO(mwfarb): also store mqtt-token
            console.log("got mqtt-user/mqtt-token:", xhr.response.username, xhr.response.token);
            // mqtt-token must be set to authorize access to MQTT broker
            const authCompleteEvent = new CustomEvent('onauth', {
                detail: {
                    mqtt_username: xhr.response.username,
                    mqtt_token: xhr.response.token
                }
            });
            window.dispatchEvent(authCompleteEvent);
        }
    };
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
