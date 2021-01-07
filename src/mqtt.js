/* global AFRAME, THREE, ARENA */

// 'use strict';

ARENA.mqttClient = new Paho.Client(ARENA.mqttParam, 'webClient-' + ARENA.timeID);
ARENA.mqttClient.onConnected = onConnected;
ARENA.mqttClient.onConnectionLost = onConnectionLost;
ARENA.mqttClient.onMessageArrived = onMessageArrived;

/**
 * MQTT onConnected callback
 * @param {Boolean} reconnect is a reconnect
 * @param {Object} uri uri used
 */
function onConnected(reconnect, uri) {
    if (reconnect) {
        // For reconnect, do not reinitialize user state, that will warp user back and lose
        // current state. Instead, reconnection should naturally allow messages to continue.
        // need to resubscribe however, to keep receiving messages
        if (!ARENA.JitsiAPI.ready()) {
            ARENA.JitsiAPI = ARENAJitsiAPI(ARENA.jitsiServer);
            console.warn(`ARENA Jitsi restarting...`);
        }
        ARENA.mqttClient.subscribe(ARENA.renderTopic);
        console.warn(`MQTT scene reconnected to ${uri}`);
        return; // do not continue!
    }

    // first connection for this client
    console.log(`MQTT scene init user state, connected to ${uri}`);

    // Add scene objects to dictionary of scene objects
    const sceneObjects = ARENA.sceneObjects;

    sceneObjects.cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    sceneObjects.cameraSpinner = document.getElementById('CameraSpinner'); // this is an <a-entity>

    sceneObjects.myCamera = document.getElementById('my-camera');
    sceneObjects[ARENA.camName] = sceneObjects.myCamera;

    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    sceneObjects.myCamera.setAttribute('arena-camera', 'enabled', true);
    sceneObjects.myCamera.setAttribute('arena-camera', 'color', color);
    sceneObjects.myCamera.setAttribute('position', ARENA.startCoords);

    const viveLeft = document.getElementById('vive-leftHand');
    viveLeft.setAttribute('arena-vive', 'enabled', true);
    viveLeft.setAttribute('arena-vive', 'name', ARENA.viveLName);
    viveLeft.setAttribute('arena-vive', 'hand', 'left');
    viveLeft.setAttribute('arena-vive', 'color', color);
    sceneObjects[ARENA.viveLName] = viveLeft;

    const viveRight = document.getElementById('vive-rightHand');
    viveRight.setAttribute('arena-vive', 'enabled', true);
    viveRight.setAttribute('arena-vive', 'name', ARENA.viveRName);
    viveRight.setAttribute('arena-vive', 'hand', 'right');
    viveRight.setAttribute('arena-vive', 'color', color);
    sceneObjects[ARENA.viveRName] = viveRight;

    loadScene();
    loadArena();

    // start listening for MQTT messages
    ARENA.mqttClient.subscribe(ARENA.renderTopic);
}

/**
 * MQTT onConnectionLost callback
 * @param {Object} responseObject paho response object
 */
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error(
            `MQTT scene connection lost, code: ${responseObject.errorCode}, reason: ${responseObject.errorMessage}`,
        );
    }
    console.warn('MQTT scene automatically reconnecting...');
    // no need to connect manually here, "reconnect: true" already set
}

window.publish = (dest, msg) => {
    if (!ARENA.mqttClient.isConnected()) return;

    if (typeof msg === 'object') {
        // add timestamp to all published messages
        const d = new Date();
        const n = d.toISOString();
        msg['timestamp'] = n;

        msg = JSON.stringify(msg);
    }
    const message = new Paho.Message(msg);
    message.destinationName = dest;
    ARENA.mqttClient.send(message);
};

/**
 * Call internal MessageArrived handler; Isolates message error handling
 * Also called to handle persist objects
 * @param {Object} message
 * @param {String} jsonMessage
 */
function onMessageArrived(message, jsonMessage) {
    try {
        _onMessageArrived(message, jsonMessage);
    } catch (err) {
        if (message) {
            if (message.payloadString) {
                console.error('onMessageArrived Error!', err, message.payloadString);
            } else {
                console.error('onMessageArrived Error!', err,
                    new TextDecoder('utf-8').decode(message.payloadBytes), message.payloadBytes);
            }
        } else if (jsonMessage) {
            console.error('onMessageArrived Error!', err, JSON.stringify(jsonMessage));
        }
    }
}

let progMsgs = {};

/**
 * Internal MessageArrived handler; handles object create/delete/event/... messages
 * @param {Object} message
 * @param {String} jsonMessage
 */
function _onMessageArrived(message, jsonMessage) {
    const sceneObjects = ARENA.sceneObjects;
    const sceneEl = document.querySelector('a-scene');
    let theMessage = {};

    if (message) {
        if (!isJson(message.payloadString)) {
            return;
        }
        theMessage = JSON.parse(message.payloadString);
    } else if (jsonMessage) {
        theMessage = jsonMessage;
    }

    switch (theMessage.action) { // clientEvent, create, delete, update
    case 'clientEvent': {
        const entityEl = sceneObjects[theMessage.object_id];
        let myPoint = '';
        if (theMessage.data.position) {
            myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
                parseFloat(theMessage.data.position.y),
                parseFloat(theMessage.data.position.z));
        } else {
            console.error('Error: theMessage.data.position not defined', theMessage);
        }
        const clicker = theMessage.data.source;

        if (entityEl == undefined) {
            console.log(message.payloadString);
            return;
        }

        switch (theMessage.type) {
        case 'collision':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        case 'mousedown':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        case 'mouseup':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mouseup', {
                'clicker': clicker,
                'intersection': {
                    point: myPoint,
                },
            }, false);
            break;
        default: // handle others here like mouseenter / mouseleave
            break; // never gets here haha
        }
        break;
    }
    case 'delete': {
        // An empty message after an object_id means remove it
        const name = theMessage.object_id;
        // console.log(message.payloadString, topic, name);

        if (sceneObjects[name]) {
            parentEl = sceneObjects[name].parentEl;
            parentEl.removeChild(sceneObjects[name]);
            delete sceneObjects[name];
            return;
        } else {
            console.log('Warning: ' + name + ' not in sceneObjects');
        }
        break;
    }
    case 'create': {
        const name = theMessage.object_id;
        delete theMessage.object_id;

        if (name === ARENA.camName) {
            // check if it is a command for the local camera
            if (theMessage.type === 'camera-override') {
                if (theMessage.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                    console.error('Camera override: object_type must be camera.');
                    return;
                }
                const myCamera=ARENA.sceneObjects.myCamera;
                if (!myCamera) {
                    console.error('Camera override: local camera object does not exist! (create camera before)');
                    return;
                }
                const p = theMessage.data.position;
                if (p) myCamera.object3D.position.set(p.x, p.y, p.z);
                const r = theMessage.data.rotation;
                if (r) {
                    myCamera.components['look-controls'].yawObject.rotation.setFromQuaternion(
                        new THREE.Quaternion(r.x, r.y, r.z, r.w));
                }
            } else if (theMessage.type === 'look-at') {
                if (theMessage.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                    console.error('Camera look-at: object_type must be camera.');
                    return;
                }
                const myCamera=ARENA.sceneObjects.myCamera;
                if (!myCamera) {
                    console.error('Camera look-at: local camera object does not exist! (create camera before)');
                    return;
                }
                let target = theMessage.data.target;
                if (!target.hasOwnProperty('x')) { // check if an object id was given
                    const targetObj = ARENA.sceneObjects[target];
                    if (targetObj) target = targetObj.object3D.position; // will be processed as x, y, z below
                    else {
                        console.error('Camera look-at: target not found.');
                        return;
                    }
                }
                // x, y, z given
                if (target.hasOwnProperty('x') &&
                    target.hasOwnProperty('y') &&
                    target.hasOwnProperty('z')) {
                    myCamera.components['look-controls'].yawObject.lookAt( target.x, target.y, target.z);
                    myCamera.components['look-controls'].pitchObject.lookAt( target.x, target.y, target.z);
                }
            }
            return;
        }

        if (theMessage.type === 'scene-options') {
            return; // don't create another env
        }

        let x; let y; let z; let xrot; let yrot; let zrot; let wrot; let xscale; let yscale; let zscale; let color;
        // Strategy: remove JSON for core attributes (position, rotation, color, scale) after parsing
        // what remains are attribute-value pairs that can be set iteratively
        if (theMessage.data.position) {
            x = theMessage.data.position.x;
            y = theMessage.data.position.y;
            z = theMessage.data.position.z;
            delete theMessage.data.position;
        } else { // useful defaults if unspecified
            x = 0;
            y = 0;
            z = 0;
        }

        if (theMessage.data.rotation) {
            xrot = theMessage.data.rotation.x;
            yrot = theMessage.data.rotation.y;
            zrot = theMessage.data.rotation.z;
            wrot = theMessage.data.rotation.w;
            delete theMessage.data.rotation;
        } else { // useful defaults
            xrot = 0;
            yrot = 0;
            zrot = 0;
            wrot = 1;
        }

        if (theMessage.data.scale) {
            xscale = theMessage.data.scale.x;
            yscale = theMessage.data.scale.y;
            zscale = theMessage.data.scale.z;
            delete theMessage.data.scale;
        } else { // useful defaults
            xscale = 1;
            yscale = 1;
            zscale = 1;
        }

        if (theMessage.data.color) {
            color = theMessage.data.color;
            delete theMessage.data.color;
        } else {
            color = 'white';
        }

        let type = theMessage.data.object_type;
        delete theMessage.data.object_type;
        if (type === 'cube') {
            type = 'box';
        }
        // different name in Unity
        if (type === 'quad') {
            type = 'plane';
        }
        // also different

        let entityEl;

        // Reduce, reuse, recycle!
        if (name in sceneObjects) {
            entityEl = sceneObjects[name];
            entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
        } else { // CREATE NEW SCENE OBJECT
            entityEl = document.createElement('a-entity');

            // wacky idea: force render order
            entityEl.object3D.renderOrder = 1;

            if (type === 'viveLeft' || type === 'viveRight') {
                // create vive controller for 'other persons controller'
                entityEl.setAttribute('id', name);
                entityEl.setAttribute('rotation.order', 'YXZ');
                // entityEl.setAttribute('obj-model', "obj: #viveControl-obj; mtl: #viveControl-mtl");
                if (type === 'viveLeft') {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_left.gltf)');
                } else {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_right.gltf)');
                }

                entityEl.object3D.position.set(x, y, z);
                entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);

                // Add it to our dictionary of scene objects
                sceneEl.appendChild(entityEl);
                sceneObjects[name] = entityEl;
            } else if (type === 'camera') {
                entityEl.setAttribute('id', name); // e.g. camera_1234_er1k
                entityEl.setAttribute('arena-user', 'color', color);
                sceneEl.appendChild(entityEl);
                sceneObjects[name] = entityEl;
            } else {
                entityEl.setAttribute('id', name);
                entityEl.setAttribute('rotation.order', 'YXZ');

                // Parent/Child handling
                if (theMessage.data.parent) {
                    const parentEl = sceneObjects[theMessage.data.parent];
                    if (parentEl) {
                        entityEl.flushToDOM();
                        parentEl.appendChild(entityEl);
                        // Add it to our dictionary of scene objects
                        sceneObjects[name] = entityEl;
                    } else {
                        console.log('orphaned; parent ' + name + ' cannot find ' + theMessage.data.parent + ' yet');
                    }
                } else {
                    sceneEl.appendChild(entityEl);
                    // Add it to our dictionary of scene objects
                    sceneObjects[name] = entityEl;
                }
            }
            if (theMessage.ttl !== undefined) { // Allow falsy value of 0
                entityEl.setAttribute('ttl', {seconds: theMessage.ttl});
            }
        }

        switch (type) {
        case 'light':
            entityEl.setAttribute('light', 'type', 'ambient');
            // does this work for light a-entities ?
            entityEl.setAttribute('light', 'color', color);
            break;

        case 'headtext':
            // handle changes to other users head text
            if (theMessage.hasOwnProperty('displayName')) {
                // update head text
                for (const child of entityEl.children) {
                    if (child.getAttribute('id').includes('headtext_')) {
                        // TODO(mwfarb): support full unicode in a-frame text, until then, normalize headtext
                        const name = theMessage.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        child.setAttribute('value', name);
                    }
                }
            }
            return;

        case 'camera':
            // decide if we need draw or delete videoCube around head
            if (theMessage.hasOwnProperty('jitsiId')) {
                entityEl.setAttribute('arena-user', 'jitsiId', theMessage.jitsiId);
                entityEl.setAttribute('arena-user', 'hasVideo', theMessage.hasVideo);
                entityEl.setAttribute('arena-user', 'hasAudio', theMessage.hasAudio);
            }
            if (theMessage.hasOwnProperty('displayName')) {
                entityEl.setAttribute('arena-user', 'displayName', theMessage.displayName); // update head text
            }
            break;

        case 'viveLeft':
            break;
        case 'viveRight':
            break;

        case 'image': // use special 'url' data slot for bitmap URL (like gltf-models do)
            entityEl.setAttribute('geometry', 'primitive', 'plane');
            entityEl.setAttribute('material', 'src', theMessage.data.url);
            entityEl.setAttribute('material', 'shader', 'flat');
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            break;

        case 'line':
            entityEl.setAttribute('line', theMessage.data);
            entityEl.setAttribute('line', 'color', color);
            break;

        case 'thickline':
            entityEl.setAttribute('meshline', theMessage.data);
            entityEl.setAttribute('meshline', 'color', color);
            delete theMessage.data.thickline;
            break;

        case 'particle':
            entityEl.setAttribute('particle-system', theMessage.data);
            break;

        case 'gltf-model':
            entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
            entityEl.setAttribute('gltf-model', theMessage.data.url);

            const updateProgress = (failed, evt) => {
                const gltfProgressEl = document.getElementById('gltf-loading');
                let innerHTML = 'Loading 3D model:<br/>';
                for (const [src, progress] of Object.entries(progMsgs)) {
                    if (progress === 'failed') {
                        innerHTML += '<b>"' + src + '"' + '<br/>' + 'Failed!</b>' + '<br/>';
                    } else {
                        const shortName = src.length < 20 ? src : '…' + src.substring(src.length - 20);
                        innerHTML += shortName + '<br/>' + parseFloat(progress.toFixed(1)) + '%' + '<br/>';
                    }
                }
                gltfProgressEl.innerHTML = innerHTML;
                gltfProgressEl.className = 'show';
                if (evt.detail.progress == 100 || failed) {
                    setTimeout(() => {
                        progMsgs = {};
                        gltfProgressEl.className = 'hide';
                    }, 3000);
                }
            };

            entityEl.addEventListener('model-progress', (evt) => {
                progMsgs[evt.detail.src] = evt.detail.progress;
                updateProgress(false, evt);
                if (evt.detail.progress === 100) {
                    delete progMsgs[evt.detail.src];
                }
            });
            entityEl.addEventListener('model-error', (evt) => {
                progMsgs[evt.detail.src] = 'failed';
                updateProgress(true, evt);
            });
            delete theMessage.data.url;
            break;

        case 'text':
            // set a bunch of defaults
            entityEl.setAttribute('text', 'width', 5); // the default for <a-text>
            // Support legacy `data: { text: 'STRING TEXT' }`
            const theText = theMessage.data.text;
            if (typeof theText === 'string' || theText instanceof String) {
                entityEl.setAttribute('text', 'value', theMessage.data.text);
                delete theMessage.data.text;
            }
            entityEl.setAttribute('text', 'color', color);
            entityEl.setAttribute('text', 'side', 'double');
            entityEl.setAttribute('text', 'align', 'center');
            entityEl.setAttribute('text', 'anchor', 'center');
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            break;

        default:
            // handle arbitrary A-Frame geometry primitive types
            entityEl.setAttribute('geometry', 'primitive', type);
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            entityEl.setAttribute('material', 'color', color);
            break;
        } // switch(type)

        if (type !== 'line' && type !== 'thickline') {
            // Common for all but lines: set position & rotation
            entityEl.object3D.position.set(x, y, z);
            entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);
        }

        // what remains are attributes for special cases; iteratively set them
        const thing = Object.entries(theMessage.data);
        const len = thing.length;
        for (let i = 0; i < len; i++) {
            const theattr = thing[i][0]; // attribute
            const thevalue = thing[i][1]; // value
            entityEl.setAttribute(theattr, thevalue);
        }

        break;
    }
    case 'update': {
        const name = theMessage.object_id;
        switch (theMessage.type) { // "object", "rig"
        case 'object': {
            // our own camera/controllers: bail, this message is meant for all other viewers
            if (name === ARENA.camName) {
                return;
            }
            if (name === ARENA.viveLName) {
                return;
            }
            if (name === ARENA.viveRName) {
                return;
            }
            if (name === ARENA.avatarName) {
                return;
            }
            /* just setAttribute() - data can contain multiple attribute-value pairs
             e.g: { ... "action": "update", "data":
                    { "animation": { "property": "rotation", "to": "0 360 0", "loop": "true", "dur": 10000}}}' ... } */

            const entityEl = sceneObjects[theMessage.object_id];
            if (entityEl) {
                for (const [attribute, value] of Object.entries(theMessage.data)) {
                    if (attribute === 'rotation') {
                        entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w);
                    } else if (attribute === 'position') {
                        entityEl.object3D.position.set(value.x, value.y, value.z);
                    } else if (attribute === 'color') {
                        if (!entityEl.hasOwnProperty('text')) {
                            entityEl.setAttribute('material', 'color', value);
                        } else {
                            entityEl.setAttribute('text', 'color', value);
                        }
                    } else if (attribute === 'text') {
                        if (entityEl.hasOwnProperty('text')) {
                            entityEl.setAttribute('text', 'value', value);
                        }
                    } else {
                        if (value === null) {
                            entityEl.removeAttribute(attribute);
                        } else {
                            entityEl.setAttribute(attribute, value);
                        }
                    }
                }
            } else {
                console.log('Warning: ' + theMessage.object_id + ' not in sceneObjects');
            }
            break;
        }
        default:
            console.log('Possibly Empty Message: ', message.destinationName, message.payloadString);
            break;
        } // switch (theMessage.type)
    } // case "update":
    } // switch (theMessage.action)
}
