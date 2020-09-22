// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Required:
//  <script src="https://apis.google.com/js/platform.js"></script>
//  <script src="./defaults.js"></script>  <!-- for window.defaults -->
//  <script src="./auth.js"></script>  <!-- browser authorization flow -->
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

//window.dispatchEvent(new CustomEvent('onauth', { detail: { mqtt_username: "test", mqtt_token: "test" } }));

if (!storageAvailable('localStorage')) {
    alert('QUACK!\n\nLocalStorage has been disabled, and the ARENA needs it. Bugs are coming! Perhaps you have disabled cookies?');
}

var auth2;
// check if the current user is already signed in
gapi.load('auth2', function () {
    auth2 = gapi.auth2.init({
        client_id: defaults.gAuthClientId
    }).then(function () {
        auth2 = gapi.auth2.getAuthInstance();
        if (!auth2.isSignedIn.get()) {
            console.log("User is not signed in.");
            // send login with redirection url from this page
            localStorage.setItem("request_uri", location.href);
            location.href = "./signin";
        } else {
            console.log("User is already signed in.");
            var googleUser = auth2.currentUser.get();
            onSignIn(googleUser);
        }
    });
});

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Full Name: ' + profile.getName());
    console.log('Email: ' + profile.getEmail());

    // add auth name to objects when user has not defined their name
    if (typeof globals !== 'undefined') {
        if (typeof defaults !== 'undefined' && globals.userParam == defaults.userParam) {
            // Use auth name to create human-readable name
            globals.displayName = localStorage.getItem("display_name") === null ? profile.getName() : localStorage.getItem("display_name");
            localStorage.setItem("display_name", globals.displayName);
            // globals.userParam = encodeURI(profile.getName());
            globals.userParam = profile.getName().replace(/[^a-zA-Z0-9]/g, '');

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
    }
    // request mqtt-auth
    var id_token = googleUser.getAuthResponse().id_token;
    requestMqttToken(profile.getEmail(), id_token);
}

function signOut(rootPath) {
    // logout, and disassociate user
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
    auth2.disconnect();
    // back to signin page
    localStorage.setItem("request_uri", location.href);
    location.href = rootPath + "/signin";
}

function requestMqttToken(mqtt_username, id_token) {
    // Request JWT before connection
    let xhr = new XMLHttpRequest();
    var params = "username=" + mqtt_username + "&id_token=" + id_token;
    params += "&id_auth=google";
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
            alert(`Error loading token: ${xhr.status}: ${xhr.statusText}`);
        } else {
            console.log("got user/token:", xhr.response.username, xhr.response.token);
            // token must be set to authorize access to MQTT broker
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
    var googleUser = auth2.currentUser.get();
    var profile = googleUser.getBasicProfile();
    return {
        type: "Google",
        name: profile.getName(),
        email: profile.getEmail(),
    };
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
