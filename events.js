// events.js
//
// Realtime event handler and globals
// 'use strict';

// Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
const getSceneName = () => {
    let path = window.location.pathname.substring(1);
    if (defaults.supportDevFolders && path.length > 0) {
        path = path.replace(path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0], '');
    }
    if (path === '' || path === 'index.html') {
        return getUrlParam('scene', defaults.scenenameParam);
    }
    try {
        return path.match(/^[^\/]+(\/[^\/]+)?/g)[0];
    } catch (e) {
        return getUrlParam('scene', defaults.scenenameParam);
    }
};

window.ARENA = {};

// arena events target
ARENA.events = new ARENAEventEmitter();

window.globals = {
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    // TODO(mwfarb): push per scene themes/styles into json scene object
    updateMillis: getUrlParam('camUpdateRate', defaults.updateMillis),
    scenenameParam: getSceneName(), // scene
    userParam: getUrlParam('name', defaults.userParam),
    startCoords: getUrlParam('location', defaults.startCoords).replace(/,/g, ' '),
    weatherParam: getUrlParam('weather', defaults.weatherParam),
    mqttParamZ: getUrlParam('mqttServer', defaults.mqttParamZ),
    fixedCamera: getUrlParam('fixedCamera', defaults.fixedCamera),
    ATLASurl: getUrlParam('ATLASurl', defaults.ATLASurl),
    localVideoWidth: AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300,
    vioTopic: defaults.vioTopic,
    latencyTopic: defaults.latencyTopic,
    lastMouseTarget: undefined,
    inAR: false,
    isWebXRViewer: navigator.userAgent.includes('WebXRViewer'),
    onEnterXR: function(xrType) {
        // debug("ENTERING XR");

        if (xrType === 'ar') {
            // debug("xrType is ar");

            this.isAR = true;
            if (this.isWebXRViewer) {
                // debug("isWebXRViewer = true");

                const base64script = document.createElement('script');
                base64script.onload = async () => {
                    await importScript('/apriltag/script.js');
                };
                base64script.src = '/apriltag/base64_binary.js';
                document.head.appendChild(base64script);

                document.addEventListener('mousedown', function(e) {
                    // debug("MOUSEDOWN " + window.globals.lastMouseTarget);

                    if (window.globals.lastMouseTarget) {
                        // debug("has target: "+window.globals.lastMouseTarget);

                        const el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        const elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        // debug("worldPosition is:");
                        // debug(elPos.x.toString()+","+elPos.x.toString()+","+elPos.x.toString());
                        const intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z,
                        };
                        el.emit('mousedown', {
                            'clicker': window.globals.camName,
                            'intersection': {
                                point: intersection,
                            },
                            'cursorEl': true,
                        }, false);
                    } else {
                        // debug("no lastMouseTarget");
                    }
                });
                document.addEventListener('mouseup', function(e) {
                    if (window.globals.lastMouseTarget) {
                        const el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        const elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        const intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z,
                        };
                        // debug(elPos.x);
                        el.emit('mouseup', {
                            'clicker': window.globals.camName,
                            'intersection': {
                                point: intersection,
                            },
                            'cursorEl': true,
                        }, false);
                    }
                });
                let cursor = document.getElementById('mouseCursor');
                const cursorParent = cursor.parentNode;
                cursorParent.removeChild(cursor);
                cursor = document.createElement('a-cursor');
                cursor.setAttribute('fuse', false);
                cursor.setAttribute('scale', '0.1 0.1 0.1');
                cursor.setAttribute('position', '0 0 -0.1'); // move reticle closer (side effect: bigger!)
                // cursor.setAttribute('animation__22', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                cursor.setAttribute('color', '#333');
                cursor.setAttribute('max-distance', '10000');
                cursor.setAttribute('id', 'fuse-cursor');
                cursorParent.appendChild(cursor);
            }
            document.getElementById('env').setAttribute('visible', false);
        }
    },
};

const urlLat = getUrlParam('lat');
const urlLong = getUrlParam('long');
if (urlLat && urlLong) {
    globals.clientCoords = {
        latitude: urlLat,
        longitude: urlLong,
    };
} else {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            globals.clientCoords = position.coords;
        });
    }
}

globals.persistenceUrl = '//' + defaults.persistHost + defaults.persistPath + globals.scenenameParam;
globals.mqttParam = 'wss://' + globals.mqttParamZ + defaults.mqttPath[Math.floor(Math.random() * defaults.mqttPath.length)];
globals.outputTopic = defaults.realm + '/s/' + globals.scenenameParam + '/';
globals.renderTopic = globals.outputTopic + '#';
globals.camName = '';
globals.displayName = decodeURI(globals.userParam); // set initial name
globals.idTag = globals.timeID + '_' + globals.userParam; // e.g. 1234_eric

if (globals.fixedCamera !== '') {
    globals.camName = 'camera_' + globals.fixedCamera + '_' + globals.fixedCamera;
} else {
    globals.camName = 'camera_' + globals.idTag; // e.g. camera_1234_eric
}

globals.viveLName = 'viveLeft_' + globals.idTag; // e.g. viveLeft_9240_X
globals.viveRName = 'viveRight_' + globals.idTag; // e.g. viveRight_9240_X

globals.newRotation = new THREE.Quaternion();
globals.newPosition = new THREE.Vector3();
globals.vioRotation = new THREE.Quaternion();
globals.vioPosition = new THREE.Vector3();
globals.vioMatrix = new THREE.Matrix4();
let camParent = new THREE.Matrix4();
let cam = new THREE.Matrix4();
const cpi = new THREE.Matrix4();

globals.newViveLRotation = new THREE.Quaternion();
globals.newViveLPosition = new THREE.Vector3();
globals.vioViveLRotation = new THREE.Quaternion();
globals.vioViveLPosition = new THREE.Vector3();
const ViveLcamParent = new THREE.Matrix4();
const ViveLcam = new THREE.Matrix4();
const ViveLcpi = new THREE.Matrix4();

globals.newViveRRotation = new THREE.Quaternion();
globals.newViveRPosition = new THREE.Vector3();
globals.vioViveRRotation = new THREE.Quaternion();
globals.vioViveRPosition = new THREE.Vector3();
const ViveRcamParent = new THREE.Matrix4();
const ViveRcam = new THREE.Matrix4();
const ViveRcpi = new THREE.Matrix4();

function eventAction(evt, eventName, myThis) {
    const newPosition = myThis.object3D.position;

    const coordsData = {
        x: newPosition.x.toFixed(3),
        y: newPosition.y.toFixed(3),
        z: newPosition.z.toFixed(3),
    };

    // publish to MQTT
    const objName = myThis.id + '_' + globals.idTag;
    publish(globals.outputTopic + objName, {
        object_id: objName,
        action: 'clientEvent',
        type: eventName,
        data: {
            position: coordsData,
            source: globals.camName,
        },
    });
}
