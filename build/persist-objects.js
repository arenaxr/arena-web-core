/**
 * @fileoverview Manage objects on persistence server
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import MqttClient from './mqtt-client.js';
import { ARENAUserAccount } from './arena-account.js';

var persist;

function type_order(type) {
    switch (type) {
        case 'scene-options':
            return 0;
        case 'landmarks':
            return 1;
        case 'program':
            return 2;
        case 'object':
            return 3;
        default:
            return 4;
    }
}

/**
 *
 */
export async function init(settings) {
    if (settings.obj_list == undefined) throw 'Must provide a list element';
    // handle default settings
    settings = settings || {};
    persist = {
        mqtt_uri: settings.mqtt_uri !== undefined ? settings.mqtt_uri : 'wss://arena.andrew.cmu.edu/mqtt/',
        persist_uri:
            settings.persist_uri !== undefined
                ? settings.persist_uri
                : location.hostname + (location.port ? ':' + location.port : '') + '/persist/',
        obj_list: settings.obj_list,
        addeditsection: settings.addeditsection,
        editobj_handler: settings.editobj_handler,
        auth_state: settings.auth_state,
        mqtt_username: settings.mqtt_username,
        mqtt_token: settings.mqtt_token,
    };

    persist.currentSceneObjs = [];

    // set select when clicking on a list item
    persist.obj_list.addEventListener(
        'click',
        function(ev) {
            if (ev.target.tagName === 'LI') {
                ev.target.classList.toggle('checked');
            }
        },
        false
    );

    // start mqtt client
    persist.mc = new MqttClient({
        uri: persist.mqtt_uri,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqtt_username,
        mqtt_token: persist.mqtt_token,
    });

    console.info('Starting connection to ' + persist.mqtt_uri + '...');

    // connect
    try {
        persist.mc.connect();
    } catch (error) {
        console.error(error); // Failure!
        Alert.fire({
            icon: 'error',
            title: `Error connecting to MQTT: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }

    console.info('Connected.');
}

// change options; mqtt host and port are changed with mqttReconnect()
export async function set_options(settings) {
    // handle default settings
    settings = settings || {};
    (persist.persist_uri = settings.persist_uri !== undefined ? settings.persist_uri : persist.persist_uri),
        (persist.obj_list = settings.obj_list !== undefined ? settings.obj_list : persist.obj_list),
        (persist.editobj_handler =
            settings.editobj_handler !== undefined ? settings.editobj_handler : persist.editobj_handler);
}

export async function populateSceneAndNsLists(nsList, sceneList) {
    try {
        persist.auth_state = await ARENAUserAccount.userAuthState();
    } catch (err) {
        Swal.fire({
            icon: 'Error',
            title: `Error querying user authentication status: ${err.statusText}`,
            allowEscapeKey: false,
            allowOutsideClick: false,
            showConfirmButton: false,
        });
        console.error(err);
        return undefined;
    }

    if (!persist.auth_state.authenticated) {
        Swal.fire({
            icon: 'error',
            title: 'Please do a non-anonymous login.',
            allowEscapeKey: false,
            allowOutsideClick: false,
        }).then((result) => {
            signOut();
        });

        var option = document.createElement('option');
        option.text = '';
        nsList.add(option);
        nsList.disabled = true;
        disableSceneList(sceneList);
        return undefined;
    }

    let ns = await populateNamespaceList(nsList);
    if (ns) {
        populateSceneList(ns, sceneList);
    } else {
        disableSceneList(sceneList);
    }
    return ns;
}

export function clearObjectList(noObjNotification = true) {
    persist.currentSceneObjs = [];
    while (persist.obj_list.firstChild) {
        persist.obj_list.removeChild(persist.obj_list.firstChild);
    }

    if (!noObjNotification) return;

    var li = document.createElement('li');
    var span = document.createElement('span');
    var img = document.createElement('img');
    var t = document.createTextNode('No objects in the scene');
    li.appendChild(t);

    persist.obj_list.appendChild(li);
}

export async function fetchSceneObjects(scene) {
    if (persist.persist_uri == undefined) {
        throw 'Persist DB URL not defined.'; // should be called after persist_url is set
    }

    try {
        let persistOpt = ARENADefaults.disallowJWT ? {} : { credentials: 'include' };
        var data = await fetch(persist.persist_uri + scene, persistOpt);
        if (!data) {
            throw 'Could not fetch data'; 
        }
        if (!data.ok) {
            throw 'Fetch request result not ok'; 
        }
        var sceneobjs = await data.json();
    } catch (err) {
        throw `Error fetching scene from database: ${JSON.stringify(err)}`
    }
    return sceneobjs;
}

export async function populateObjectList(
    scene,
    filter,
    objTypeFilter 
) {
    clearObjectList(false);

    var sceneobjs;
    try {
        sceneobjs = await fetchSceneObjects(scene);
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: 'Error fetching scene from database: ${err}',
            timer: 5000,
        });
        return;        
    }
    persist.currentSceneObjs = sceneobjs;

    // sort object list by type, then object_id
    sceneobjs.sort(function(a, b) {
        // order by type
        if (type_order(a.type) < type_order(b.type)) {
            return -1;
        }
        if (type_order(a.type) > type_order(b.type)) {
            return 1;
        }
        // then by object_id
        if (a.object_id < b.object_id) {
            return -1;
        }
        if (a.object_id > b.object_id) {
            return 1;
        }
        return 0;
    });

    //console.log(sceneobjs);
    if (sceneobjs.length == 0) {
        var li = document.createElement('li');
        var t = document.createTextNode('No objects in the scene');
        li.appendChild(t);
        persist.obj_list.appendChild(li);
        persist.addeditsection.style = 'display:block';
        return;
    }

    // create regex
    let re;
    try {
        re = new RegExp(filter);
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Invalid filter ${JSON.stringify(err)} (NOTE: '.*' matches all object ids)`,
            timer: 5000,
        });
        return;
    }

    for (let i = 0; i < sceneobjs.length; i++) {
        var li = document.createElement('li');
        var span = document.createElement('span');
        var img = document.createElement('img');

        // save obj json so we can use later in slected object actions (delete/copy)
        li.setAttribute('data-obj', JSON.stringify(sceneobjs[i]));
        var inputValue = '';

        if (sceneobjs[i].attributes == undefined) continue;
        if (objTypeFilter[sceneobjs[i].type] == false) continue;
        if (re.test(sceneobjs[i].object_id) == false) continue;

        if (sceneobjs[i].type == 'object') {
            inputValue = sceneobjs[i].object_id + ' ( ' + sceneobjs[i].attributes.object_type + ' )';
            img.src = 'assets/3dobj-icon.png';
            if (objTypeFilter[sceneobjs[i].attributes.object_type] == false) continue;
        } else if (sceneobjs[i].type == 'program') {
            var ptype = sceneobjs[i].attributes.filetype == 'WA' ? 'WASM program' : 'python program';
            inputValue = sceneobjs[i].object_id + ' ( ' + ptype + ': ' + sceneobjs[i].attributes.filename + ' )';
            img.src = 'assets/program-icon.png';
        } else if (sceneobjs[i].type == 'scene-options') {
            inputValue = sceneobjs[i].object_id + ' ( scene options )';
            img.src = 'assets/options-icon.png';
        } else if (sceneobjs[i].type == 'landmarks') {
            inputValue = sceneobjs[i].object_id + ' ( landmarks )';
            img.src = 'assets/map-icon.png';
        }

        var t = document.createTextNode(inputValue);
        li.appendChild(t);

        // add image
        img.width = 16;
        span.className = 'objtype';
        span.appendChild(img);
        li.appendChild(span);

        // add edit "button"
        var editspan = document.createElement('span');
        var ielem = document.createElement('i');
        ielem.className = 'icon-edit';
        editspan.className = 'edit';
        editspan.appendChild(ielem);
        li.appendChild(editspan);

        editspan.onclick = (function() {
            var obj = sceneobjs[i];
            return function() {
                persist.editobj_handler(obj);
            };
        })();

        persist.obj_list.appendChild(li);
    }
    persist.addeditsection.style = 'display:block';
}

export async function populateNamespaceList(nsList) {
    if (!persist.auth_state.authenticated) return; // should not be called when we are not logged in

    let scenes;
    try {
        scenes = await ARENAUserAccount.userScenes();
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Error fetching scene list from account: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
        return undefined;
    }

    // clear list
    while (nsList.firstChild) {
        nsList.removeChild(nsList.firstChild);
    }

    persist.scenes = [];
    persist.namespaces = [];

    if (scenes.length > 0) {
        nsList.disabled = false;
        // split scenes into scene name and namespace
        for (let i = 0; i < scenes.length; i++) {
            let sn = scenes[i].name.split('/');
            if (sn.length < 2) continue;
            if (persist.namespaces.indexOf(sn[0]) < 0) persist.namespaces.push(sn[0]);
            persist.scenes.push({ ns: sn[0], name: sn[1] });
        }

        // sort lists
        persist.namespaces.sort();
        persist.scenes.sort();
    }

    // add user namespace if needed
    if (persist.namespaces.indexOf(persist.auth_state.username) < 0) {
        var option = document.createElement('option');
        option.text = persist.auth_state.username;
        nsList.add(option);
    }

    // populate list
    for (let i = 0; i < persist.namespaces.length; i++) {
        var option = document.createElement('option');
        option.text = persist.namespaces[i];
        nsList.add(option);
    }
    nsList.value = persist.auth_state.username;
    return persist.auth_state.username;
}

export function disableSceneList(sceneList) {
    if (!sceneList) return;
    sceneList.disabled = true;
    let option = document.createElement('option');
    option.text = 'No scenes.';
    sceneList.add(option);
    clearObjectList();
    persist.addeditsection.style = 'display:none';
}

export function populateSceneList(ns, sceneList, selected = undefined) {
    if (!persist.auth_state.authenticated) return; // should not be called when we are not logged in
    if (persist.scenes.length == 0) {
        disableSceneList(sceneList);
        return;
    }

    // clear list
    while (sceneList.firstChild) {
        sceneList.removeChild(sceneList.firstChild);
    }

    sceneList.disabled = false;
    let first = undefined;
    for (let i = 0; i < persist.scenes.length; i++) {
        if (ns && persist.scenes[i].ns !== ns) continue;
        if (!first) first = persist.scenes[i].name;
        let option = document.createElement('option');
        option.text = ns == undefined ? `${persist.scenes[i].ns}/${persist.scenes[i].name}` : persist.scenes[i].name;
        sceneList.add(option);
    }
    if (!first) {
        disableSceneList(sceneList);
    } else {
        if (!selected) sceneList.value = first;
        else sceneList.value = selected;
    }
}

export function populateNewSceneNamespaces(nsList) {
    if (!persist.auth_state.authenticated) {
        throw 'User must be authenticated.';
    }

    let ns = [persist.auth_state.username];
    if (persist.namespaces.indexOf('public') > 0) {
        ns.push('public');
    }

    // clear list
    while (nsList.firstChild) {
        nsList.removeChild(nsList.firstChild);
    }

    // populate list
    for (let i = 0; i < ns.length; i++) {
        var option = document.createElement('option');
        option.text = ns[i];
        nsList.add(option);
    }
    nsList.value = persist.auth_state.username;
    return ns;
}

export async function addNewScene(ns, sceneName, newObjs) {
    try {
        let result = await ARENAUserAccount.requestUserNewScene(`${ns}/${sceneName}`);
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Error adding scene: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
    }
    Alert.fire({
        icon: 'info',
        title: 'Scene added',
        timer: 5000,
    });
    persist.scenes.push({ ns: ns, name: sceneName });
    if (!newObjs) return;

    // add objects to the new scene
    newObjs.forEach((obj) => {
        addObject(obj, `${ns}/${sceneName}`);
    });
}

export async function deleteScene(ns, sceneName) {
    selectedObjsPerformAction('delete', `${ns}/${sceneName}`, true);
    try {
        let result = await ARENAUserAccount.requestDeleteUserScene(`${ns}/${sceneName}`);
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Error deleting scene: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
    }
}

export function selectedObjsPerformAction(action, scene, all = false) {
    var items = persist.obj_list.getElementsByTagName('li');
    for (var i = 0; i < items.length; i++) {
        if (!items[i].classList.contains('checked') && !all) continue;
        var objJson = items[i].getAttribute('data-obj');
        if (!objJson) continue;
        var obj = JSON.parse(objJson);
        var actionObj = JSON.stringify({
            object_id: obj.object_id,
            action: action,
            persist: true,
            type: obj.type,
            data: obj.attributes != undefined ? obj.attributes : obj.data,
        });
        var topic = 'realm/s/' + scene;
        console.info('Publish [ ' + topic + ']: ' + actionObj);
        try {
            persist.mc.publish(topic, actionObj);
        } catch (error) {
            Alert.fire({
                icon: 'error',
                title: `Error deleting: ${JSON.stringify(error)}`,
                timer: 5000,
            });
            return;
        }
    }
}

export function selectAll() {
    var items = persist.obj_list.getElementsByTagName('li');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.add('checked');
    }
}

export function clearSelected() {
    var items = persist.obj_list.getElementsByTagName('li');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('checked');
    }
}

export async function addObject(obj, scene) {
    var found = false;
    for (let i = 0; i < persist.currentSceneObjs.length; i++) {
        if (persist.currentSceneObjs[i].object_id == obj.object_id) {
            found = true;
            break;
        }
    }

    if (obj.action === 'update') {
        if (found === false) {
            let result = await Swal.fire({
                title: 'Update non-existing object ?',
                html: 'You probably want to <b>create</b> new objects (update usually will have no effect).',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: `Create`,
                denyButtonText: `Update (i'm sure)`,
            });
            console.log(result);
            if (result.isConfirmed) {
                obj.action = 'create';
            } else if (result.isDismissed) {
                console.log('here');
                Alert.fire({
                    icon: 'warning',
                    title: 'Canceled',
                    html: 'Add/Update Canceled',
                    timer: 10000,
                });
                return;
            }
        }
    }

    // set overwrite to true so previous attributes are removed
    if (found) obj.overwrite = true;

    let persistAlert = obj.persist == false ? '<br/><strong>Object not persisted.</strong>' : '';
    let objJson = JSON.stringify(obj);
    var topic = 'realm/s/' + scene;
    console.info('Publish [ ' + topic + ']: ' + objJson);
    try {
        persist.mc.publish(topic, objJson);
    } catch (error) {
        Alert.fire({
            icon: 'error',
            title: `Error adding object: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }

    if (obj.action == 'update') {
        if (found == true)
            Alert.fire({
                icon: 'warning',
                title: 'Updated',
                html: `Object update published (previous attributes overwritten/deleted). ${persistAlert}`,
                timer: 5000,
            });
    } else {
        Alert.fire({
            icon: 'info',
            title: 'Created',
            html: `Object create published. ${persistAlert}`,
            timer: 5000,
        });
    }
}

export function mqttReconnect(settings) {
    settings = settings || {};

    persist.mqtt_uri = settings.mqtt_uri !== undefined ? settings.mqtt_uri : 'wss://arena.andrew.cmu.edu/mqtt/';

    if (persist.mc) persist.mc.disconnect();

    console.info('Disconnected.');

    // start mqtt client
    persist.mc = new MqttClient({
        uri: persist.mqtt_uri,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqtt_username,
        mqtt_token: persist.mqtt_token,
    });

    try {
        persist.mc.connect();
    } catch (error) {
        Alert.fire({
            icon: 'error',
            title: `Error connecting to MQTT: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }

    console.info('Connected to ' + persist.mqtt_uri);
}

// callback from mqttclient; on reception of message
function onMqttMessage(message) { }
