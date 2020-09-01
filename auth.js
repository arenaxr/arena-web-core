// auth.js
//
// Authentication and Authorization for the following ARENA assets:
// - MQTT broker

//'use strict';

// startup authentication context
var auth2;
//var googleUser;
var urlMqttAuth = "https://xr.andrew.cmu.edu:8888";

window.globals.username = undefined;
window.globals.mqttToken = undefined;

async function operation() {
    return new Promise(function(resolve, reject) {
        var a = 0;
        var b = 1;
        a = a + b;
        a = 5;

        // may be a heavy db call or http request?

	gapi.load('auth2', function () {
            auth2 = gapi.auth2.init({
                // test CONIX Research Center ARENA auth id for xr
                client_id: '58999217485-jjkjk88jcl2gfdr45p31p9imbl1uv1iq.apps.googleusercontent.com'
            });
        });
    
        resolve(a) // successfully fill promise
    })
}

async function app() {
    var a = await operation() // a is 5

        auth2 = gapi.auth2.getAuthInstance();

        //setupIcons(); // don't regen on mqtt reconnect

        if (!auth2.isSignedIn.get()) {
            console.log("User is not logged in.");
            // auto sign in?
            //signIn();
            location.href = "./signin";
            // TODO: send login with redirection url from this page
        } else {
            console.log("User is already logged in.");
            googleUser = auth2.currentUser.get();
            onSignIn(googleUser);
        }
}

app()

//gapi.load('auth2', function () {
//    auth2 = gapi.auth2.init({
//        // test CONIX Research Center ARENA auth id for xr
//        client_id: '58999217485-jjkjk88jcl2gfdr45p31p9imbl1uv1iq.apps.googleusercontent.com'
//    }).then(function () {
//        auth2 = gapi.auth2.getAuthInstance();
//
 //       //setupIcons(); // don't regen on mqtt reconnect
//
 //       if (!auth2.isSignedIn.get()) {
//            console.log("User is not logged in.");
//            // auto sign in?
//            //signIn();
//            location.href = "./signin";
//            // TODO: send login with redirection url from this page
//	} else {
//	    console.log("User is already logged in.");
 //           googleUser = auth2.currentUser.get();
//            onSignIn(googleUser);
//        }
//    });
//});


//checkAuth();

function signIn() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then(function () {
        googleUser = auth2.currentUser.get();
        onSignIn(googleUser);
    });
}

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Full Name: ' + profile.getName());
    console.log('Given Name: ' + profile.getGivenName());
    console.log('Family Name: ' + profile.getFamilyName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail());

    // TODO: might be early enough to reset cam name?
    var cam = globals.camName.split('_');
    cam[2] = profile.getName().replace(/[^a-zA-Z0-9]/g, '');
    globals.camName = cam.join('_');

    var id_token = googleUser.getAuthResponse().id_token;
    requestMqttToken(id_token);
}

function signOut() {
    // disconnect does not use LWT, so delete manual
//    let msg = { object_id: globals.camName, action: "delete" };
//    publish(globals.outputTopic + globals.camName, msg);
    mqttClient.disconnect();
    // logout, and dissassociate user
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
    auth2.disconnect();
}

function requestMqttToken(id_token) {
    // Request JWT before connection
    let xhr = new XMLHttpRequest();
    var params = "scene=" + globals.scenenameParam + "&username=" + globals.username;
    if (globals.camName) {
        params += "&camid=" + globals.camName
    }
    if (globals.viveLName) {
        params += "&ctrlid1=" + globals.viveLName
    }
    if (globals.viveRName) {
        params += "&ctrlid2=" + globals.viveRName
    }
    // if (id_token) {
    //     params += "&id_token=" + id_token
    // }
    xhr.open('GET', urlMqttAuth + '/?' + params); // TODO: xhr.open('POST', url);
    // TODO: xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(); // TODO: xhr.send(params);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status !== 200) {
            alert(`Error loading token: ${xhr.status}: ${xhr.statusText}`);
        } else {
            console.log("got user/token:", xhr.response.username, xhr.response.token);
	    // token must be set to authorize acccess to MQTT broker
            globals.mqttToken = xhr.response.token;
        }
    };
}


