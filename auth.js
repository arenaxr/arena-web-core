// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker
//
// Implement the following method and use it to start code that autimatically connects to 
// the MQTT broker so that authentication and access tokens can be present when making
// a broker connection which will need username (email) and password (access token).
//
// window.addEventListener('onauth', function (e) {
//     client.connect({
//         onSuccess: onConnect,
//         userName: e.detail.mqtt_username,
//         password: e.detail.mqtt_token
//     });
// });

'use strict';

// startup authentication context
var auth2;
// TODO: load auth urls and client ids from config file for new users to define
var urlMqttAuth = "https://xr.andrew.cmu.edu:8888";
var gAuthClientId = '58999217485-jjkjk88jcl2gfdr45p31p9imbl1uv1iq.apps.googleusercontent.com';

// check if the current user is already loggedin
gapi.load('auth2', function () {
    auth2 = gapi.auth2.init({
        client_id: gAuthClientId
    }).then(function () {
        auth2 = gapi.auth2.getAuthInstance();
        if (!auth2.isSignedIn.get()) {
            console.log("User is not logged in.");
            // send login with redirection url from this page
            location.href = "./signin?redirect_uri=" + encodeURI(location.href);;
        } else {
            console.log("User is already logged in.");
            var googleUser = auth2.currentUser.get();
            onSignIn(googleUser);
        }
    });
});

function signIn() {
    // currently unused, old way
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then(function () {
        var googleUser = auth2.currentUser.get();
        onSignIn(googleUser);
    });
}

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Full Name: ' + profile.getName());
    console.log('Email: ' + profile.getEmail());

    // early enough to reset cam name
    if (typeof globals !== 'undefined' && globals.camName) {
        var cam = globals.camName.split('_');
        globals.userParam = profile.getName().replace(/[^a-zA-Z0-9]/g, '');
        cam[2] = globals.userParam;
        globals.camName = cam.join('_');
    }
    // request mqtt-auth
    var id_token = googleUser.getAuthResponse().id_token;
    requestMqttToken(profile.getEmail(), id_token);
}

function signOut(rootPath) {
    // TODO: disconnect does not use LWT, so delete manual
    //    let msg = { object_id: globals.camName, action: "delete" };
    //    publish(globals.outputTopic + globals.camName, msg);
    // mqttClient.disconnect();
    // logout, and dissassociate user
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
    auth2.disconnect();
    // back to signin page
    location.href = rootPath + "/signin?redirect_uri=" + encodeURI(location.href);
}

function requestMqttToken(mqtt_username, id_token) {
    // Request JWT before connection
    let xhr = new XMLHttpRequest();
    var params = "username=" + mqtt_username + "&id_token=" + id_token;
    params += "&id_auth=google";
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
    xhr.open('POST', urlMqttAuth);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading token: ${xhr.status}: ${xhr.statusText}`);
        } else {
            console.log("got user/token:", xhr.response.username, xhr.response.token);
            // token must be set to authorize acccess to MQTT broker
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


