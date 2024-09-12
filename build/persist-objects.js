/**
 * @fileoverview Manage objects on persistence server
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global Alert, ARENAAUTH, ARENADefaults, Swal, THREE */
/* eslint-disable import/extensions */
import MqttClient from './mqtt-client.js';
import ARENAUserAccount from './arena-account.js';
import { TTLCache } from './ttl-cache.js';

let persist;

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
    if (settings.objList === undefined) throw 'Must provide a list element';
    // handle default settings
    settings = settings || {};
    persist = {
        mqttUri: settings.mqttUri !== undefined ? settings.mqttUri : 'wss://arena.andrew.cmu.edu/mqtt/',
        persistUri:
            settings.persistUri !== undefined
                ? settings.persistUri
                : `${window.location.hostname + (window.location.port ? `:${window.location.port}` : '')}/persist/`,
        objList: settings.objList,
        addEditSection: settings.addEditSection,
        editObjHandler: settings.editObjHandler,
        visObjHandler: settings.visObjHandler,
        programList: settings.programList,
        authState: settings.authState,
        mqttUsername: settings.mqttUsername,
        mqttToken: settings.mqttToken,
        exportSceneButton: settings.exportSceneButton,
    };

    persist.currentSceneObjs = [];
    persist.programs = new TTLCache({
        mutationCall: () => {
            console.log('mutation');
            populateProgramInstanceList();
        },
    });

    // set select when clicking on a list item
    persist.objList.addEventListener(
        'click',
        (ev) => {
            if (ev.target.tagName === 'LI') {
                ev.target.classList.toggle('checked');
            }
        },
        false
    );

    mqttReconnect();
}

export async function populateSceneAndNsLists(nsInput, nsList, sceneInput, sceneList) {
    try {
        persist.authState = await ARENAUserAccount.userAuthState();
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

    if (!persist.authState.authenticated) {
        Swal.fire({
            icon: 'error',
            title: 'Please do a non-anonymous login.',
            allowEscapeKey: false,
            allowOutsideClick: false,
        }).then((result) => {
            ARENAAUTH.signOut();
        });

        const option = document.createElement('option');
        option.text = '';
        nsList.add(option);
        nsInput.disabled = true;
        emptySceneInput(sceneInput);
        return undefined;
    }

    const ns = await populateNamespaceList(nsInput, nsList);
    if (ns) {
        populateSceneList(ns, sceneInput, sceneList);
    } else {
        emptySceneInput(sceneInput);
    }
    return ns;
}

export function clearObjectList(noObjNotification = undefined) {
    persist.currentSceneObjs = [];
    while (persist.objList.firstChild) {
        persist.objList.removeChild(persist.objList.firstChild);
    }

    if (noObjNotification === undefined) return;

    const li = document.createElement('li');
    const t = document.createTextNode(noObjNotification);
    li.appendChild(t);

    persist.objList.appendChild(li);
}

export async function fetchSceneObjects(scene) {
    if (persist.persistUri === undefined) {
        throw 'Persist DB URL not defined.'; // should be called after persist_url is set
    }
    let sceneObjs;
    try {
        const persistOpt = ARENADefaults.disallowJWT ? {} : { credentials: 'include' };
        const data = await fetch(persist.persistUri + scene, persistOpt);
        if (!data) {
            throw 'Could not fetch data';
        }
        if (!data.ok) {
            throw 'Fetch request result not ok';
        }
        sceneObjs = await data.json();
    } catch (err) {
        throw `${err}`;
    }
    return sceneObjs;
}

export function updateListItemVisibility(visible, li, iconVis) {
    iconVis.className = visible ? 'icon-eye-open' : 'icon-eye-close';
    li.style.color = visible ? 'black' : 'gray';
}

export async function populateObjectList(scene, filter, objTypeFilter, focusObjectId = undefined) {
    clearObjectList();

    let sceneObjs;
    try {
        sceneObjs = await fetchSceneObjects(scene);
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Error fetching scene from database. ${err}`,
            timer: 5000,
        });
        return;
    }
    persist.currentSceneObjs = sceneObjs;

    // sort object list by type, then object_id
    sceneObjs.sort((a, b) => {
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

    // console.log(sceneobjs);
    if (sceneObjs.length === 0) {
        const li = document.createElement('li');
        const t = document.createTextNode('No objects in the scene');
        li.appendChild(t);
        persist.objList.appendChild(li);
        persist.addEditSection.style = 'display:block';
        persist.exportSceneButton.setAttribute('href', '#'); // No download
        persist.exportSceneButton.removeAttribute('download'); // No download
        return;
    }

    // Update scene obj list to download as json
    const exportJSON = sceneObjs.map((obj) => {
        const filteredObj = { ...obj };
        filteredObj.data = filteredObj.attributes;
        delete filteredObj.createdAt;
        delete filteredObj.updatedAt;
        delete filteredObj.attributes;
        return filteredObj;
    });
    persist.exportSceneButton.setAttribute(
        'href',
        `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportJSON, null, 2))}`
    );
    persist.exportSceneButton.setAttribute('download', `${scene.replace('/', '__')}.json`);

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

    for (let i = 0; i < sceneObjs.length; i++) {
        const li = document.createElement('li');
        const span = document.createElement('span');
        const img = document.createElement('img');

        // save obj json so we can use later in selected object actions (delete/copy)
        li.setAttribute('data-obj', JSON.stringify(sceneObjs[i]));
        let objectDisplay = '';

        if (sceneObjs[i].attributes === undefined) continue;
        if (objTypeFilter[sceneObjs[i].type] === false) continue;
        if (re.test(sceneObjs[i].object_id) === false) continue;

        if (sceneObjs[i].type === 'object') {
            objectDisplay = `${sceneObjs[i].object_id} ( ${sceneObjs[i].attributes.object_type} )`;
            img.src = 'assets/3dobj-icon.png';
            if (objTypeFilter[sceneObjs[i].attributes.object_type] === false) continue;
        } else if (sceneObjs[i].type === 'program') {
            const program = sceneObjs[i].attributes;
            objectDisplay = `${sceneObjs[i].object_id} (${program.name}): ${program.file}`;
            img.src = 'assets/prog-icon.png';
        } else if (sceneObjs[i].type === 'scene-options') {
            objectDisplay = `${sceneObjs[i].object_id} ( 'scene options' )`;
            img.src = 'assets/options-icon.png';
        } else if (sceneObjs[i].type === 'landmarks') {
            objectDisplay = `${sceneObjs[i].object_id} ( 'landmarks' )`;
            img.src = 'assets/map-icon.png';
        } else {
            objectDisplay = `${sceneObjs[i].object_id} ( sceneObjs[i].type; )`; // display unknown type
        }

        const r = sceneObjs[i].attributes.rotation;
        if (r) {
            // convert deprecated euler-style rotation to quaternions if needed
            if (!r.hasOwnProperty('w')) {
                const q = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        THREE.MathUtils.degToRad(r.x),
                        THREE.MathUtils.degToRad(r.y),
                        THREE.MathUtils.degToRad(r.z)
                    )
                );
                sceneObjs[i].attributes.rotation = {
                    x: parseFloat(q.x.toFixed(5)),
                    y: parseFloat(q.y.toFixed(5)),
                    z: parseFloat(q.z.toFixed(5)),
                    w: parseFloat(q.w.toFixed(5)),
                };
            }
        }

        const t = document.createTextNode(objectDisplay);
        li.appendChild(t);

        // add image
        img.width = 16;
        span.className = 'objtype';
        span.appendChild(img);
        li.appendChild(span);

        // add edit "button"
        const editspan = document.createElement('span');
        const ielem = document.createElement('i');
        ielem.className = 'icon-edit';
        editspan.className = 'edit';
        editspan.title = 'Edit JSON';
        editspan.appendChild(ielem);
        li.appendChild(editspan);

        editspan.onclick = (function () {
            const obj = sceneObjs[i];
            return function () {
                persist.editObjHandler(obj);
            };
        })();

        if (sceneObjs[i].object_id === focusObjectId) {
            persist.editObjHandler(sceneObjs[i]);
        }

        // add 3d edit "button"
        if (sceneObjs[i].type !== 'program') {
            const editspan3d = document.createElement('span');
            const ielem3d = document.createElement('i');
            ielem3d.className = 'icon-globe';
            editspan3d.className = 'edit3d';
            editspan3d.title = 'Edit 3D';
            editspan3d.appendChild(ielem3d);
            li.appendChild(editspan3d);

            editspan3d.onclick = function () {
                if (sceneObjs[i].type === 'scene-options') {
                    window.open(`/${scene}?build3d=1&objectId=env`, 'Arena3dEditor');
                } else {
                    window.open(`/${scene}?build3d=1&objectId=${sceneObjs[i].object_id}`, 'Arena3dEditor');
                }
            };
        }

        // add visibility convenience "button"
        if (sceneObjs[i].type === 'object') {
            let visible = Object.hasOwn(sceneObjs[i].attributes, 'visible') ? sceneObjs[i].attributes.visible : true;
            const visspan = document.createElement('span');
            const iconVis = document.createElement('i');
            updateListItemVisibility(visible, li, iconVis);
            visspan.className = 'visible';
            visspan.title = 'Toggle Visible';
            visspan.appendChild(iconVis);
            li.appendChild(visspan);

            visspan.onclick = function () {
                visible = !visible;
                updateListItemVisibility(visible, li, iconVis);
                persist.visObjHandler(sceneObjs[i], visible);
            };
        }

        // highlight object type errors
        const schemaType = sceneObjs[i].type === 'object' ? sceneObjs[i].attributes.object_type : sceneObjs[i].type;
        if (!objTypeFilter[schemaType]) {
            li.style.color = 'red';
        }

        persist.objList.appendChild(li);
    }
    persist.addEditSection.style = 'display:block';

    updateSubscribeTopic(scene);
}

export function updateSubscribeTopic(scene) {
    if (persist.currentScene === scene) return;
    if (!persist.mqttConnected) persist.pendingSubscribeUpdate = (scene) => updateSubscribeTopic(scene);

    if (persist.currentScene) persist.mc.unsubscribe(persist.currentScene);
    if (scene) {
        const topic = `realm/s/${scene}/#`;
        persist.mc.subscribe(topic);
        persist.currentScene = scene;
        populateProgramInstanceList();
    }
}

export async function populateNamespaceList(nsInput, nsList) {
    if (!persist.authState.authenticated) return; // should not be called when we are not logged in

    let scenes = [];
    // get editable scenes...
    try {
        const uScenes = await ARENAUserAccount.userScenes();
        uScenes.forEach((uScene) => {
            scenes.push(uScene.name);
        });
    } catch (err) {
        Alert.fire({
            icon: 'error',
            title: `Error fetching scene list from account: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
        return undefined;
    }

    // get public scenes...
    if (persist.persistUri === undefined) {
        throw 'Persist DB URL not defined.'; // should be called after persist_url is set
    }
    let sceneObjs;
    try {
        const persistOpt = ARENADefaults.disallowJWT
            ? {}
            : {
                  credentials: 'include',
              };
        const data = await fetch(`${persist.persistUri}public/!allscenes`, persistOpt);
        if (!data) {
            throw 'Could not fetch data';
        }
        if (!data.ok) {
            throw 'Fetch request result not ok';
        }
        const pScenes = await data.json();
        scenes.push(...pScenes);
    } catch (err) {
        console.error(err);
        return undefined;
    }

    // make distinct
    scenes = [...new Set(scenes)];

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
            const sn = scenes[i].split('/');
            if (sn.length < 2) continue;
            if (persist.namespaces.indexOf(sn[0]) < 0) persist.namespaces.push(sn[0]);
            persist.scenes.push({ ns: sn[0], name: sn[1] });
        }

        // sort lists
        persist.namespaces.sort();
        persist.scenes.sort();
    }

    // add user namespace if needed
    if (persist.namespaces.indexOf(persist.authState.username) < 0) {
        persist.namespaces.push(persist.authState.username);
    }

    // add public namespace if needed
    if (persist.namespaces.indexOf('public') < 0) {
        const option = document.createElement('option');
        option.text = 'public';
        nsList.appendChild(option);
    }

    // populate list
    for (let i = 0; i < persist.namespaces.length; i++) {
        const option = document.createElement('option');
        option.text = persist.namespaces[i];
        nsList.appendChild(option);
    }
    nsInput.value = persist.authState.username;
    return persist.authState.username;
}

export function emptySceneInput(sceneInput) {
    sceneInput.value = 'No Scenes';
    sceneInput.disabled = true;
    clearObjectList('No Scene Selected');
    persist.addEditSection.style = 'display:none';
}

export function populateSceneList(ns, sceneInput, sceneList, selected = undefined) {
    if (!persist.authState.authenticated) return; // should not be called when we are not logged in
    if (persist.scenes.length === 0) {
        emptySceneInput(sceneInput);
        return;
    }

    // clear list
    while (sceneList.firstChild) {
        sceneList.removeChild(sceneList.firstChild);
    }

    sceneInput.disabled = false;
    let first;
    let selectedExists = false;
    for (let i = 0; i < persist.scenes.length; i++) {
        if (ns && persist.scenes[i].ns !== ns) continue;
        if (!first) first = persist.scenes[i].name;
        if (selected) {
            if (selected === persist.scenes[i].name) selectedExists = true;
        }
        const option = document.createElement('option');
        option.text = ns === undefined ? `${persist.scenes[i].ns}/${persist.scenes[i].name}` : persist.scenes[i].name;
        // sceneList.add(option);
        sceneList.appendChild(option);
    }
    if (!first) {
        emptySceneInput(sceneInput);
    } else if (!selected || !selectedExists) sceneInput.value = first;
    else sceneInput.value = selected;
}

export function populateNewSceneNamespaces(nsInput, nsList) {
    if (!persist.authState.authenticated) {
        throw 'User must be authenticated.';
    }

    const ns = persist.namespaces;
    if (persist.namespaces.indexOf('public') > 0) {
        ns.push('public');
    }

    // clear list
    while (nsList.firstChild) {
        nsList.removeChild(nsList.firstChild);
    }

    // populate list
    for (let i = 0; i < ns.length; i++) {
        const option = document.createElement('option');
        option.text = ns[i];
        nsList.appendChild(option);
    }
    nsInput.value = persist.authState.username;
    return ns;
}

export async function addNewScene(ns, sceneName, newObjs) {
    const exists = persist.scenes.find((scene) => scene.ns === ns && scene.name === sceneName);
    if (!exists) {
        try {
            const result = await ARENAUserAccount.requestUserNewScene(`${ns}/${sceneName}`);
        } catch (err) {
            Alert.fire({
                icon: 'error',
                title: `Error adding scene: ${err.statusText}`,
                timer: 5000,
            });
        }
        Alert.fire({
            icon: 'info',
            title: 'Scene added',
            timer: 5000,
        });
        persist.scenes.push({ ns, name: sceneName });
    }
    if (!newObjs) return exists;

    // add objects to the new scene
    newObjs.forEach((obj) => {
        addObject(obj, `${ns}/${sceneName}`);
    });
    return exists;
}

export async function deleteScene(ns, sceneName) {
    selectedObjsPerformAction('delete', `${ns}/${sceneName}`, true);
    let result;
    try {
        result = await ARENAUserAccount.requestDeleteUserScene(`${ns}/${sceneName}`);
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
    const items = persist.objList.getElementsByTagName('li');
    const objList = [];
    for (let i = 0; i < items.length; i++) {
        if (!items[i].classList.contains('checked') && !all) continue;
        const objJson = items[i].getAttribute('data-obj');
        if (!objJson) continue;
        objList.push(objJson);
    }
    performActionArgObjList(action, scene, objList);
}

export function performActionArgObjList(action, scene, objList, json = true) {
    let theNewScene = scene;
    if (!persist.mqttConnected) mqttReconnect();
    for (let i = 0; i < objList.length; i++) {
        const obj = json ? JSON.parse(objList[i]) : objList[i];
        const actionObj = JSON.stringify({
            object_id: obj.object_id,
            action,
            persist: true,
            type: obj.type,
            data: obj.attributes !== undefined ? obj.attributes : obj.data,
        });
        if (!scene) {
            scene = `${obj.namespace}/${obj.sceneId}`;
            theNewScene = obj.sceneId;
        }
        const topic = `realm/s/${scene}/${obj.object_id}`;
        console.info(`Publish [ ${topic}]: ${actionObj}`);
        try {
            persist.mc.publish(topic, actionObj);
        } catch (error) {
            Alert.fire({
                icon: 'error',
                title: `Error: ${JSON.stringify(error)}`,
                timer: 5000,
            });
            return;
        }
    }
    return theNewScene;
}

export function selectAll() {
    const items = persist.objList.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        items[i].classList.add('checked');
    }
}

export function clearSelected() {
    const items = persist.objList.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('checked');
    }
}

export async function addObject(obj, scene) {
    let found = false;
    if (!persist.mqttConnected) mqttReconnect();

    for (let i = 0; i < persist.currentSceneObjs.length; i++) {
        if (persist.currentSceneObjs[i].object_id === obj.object_id) {
            found = true;
            break;
        }
    }

    if (obj.action === 'update') {
        if (found === false) {
            const result = await Swal.fire({
                title: 'Update non-existing object ?',
                html: 'You probably want to <b>create</b> new objects (update usually will have no effect).',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: `Create`,
                denyButtonText: `Update (i'm sure)`,
            });
            if (result.isConfirmed) {
                obj.action = 'create';
            } else if (result.isDismissed) {
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

    const persistAlert = obj.persist === false ? '<br/><strong>Object not persisted.</strong>' : '';
    const objJson = JSON.stringify(obj);
    const topic = `realm/s/${scene}/${obj.object_id}`;
    console.info(`Publish [ ${topic}]: ${objJson}`);
    try {
        persist.mc.publish(topic, objJson);
    } catch (error) {
        console.error(error);
        Alert.fire({
            icon: 'error',
            title: `Error adding object. MQTT Error: ${error.message}. Try reloading.`,
            timer: 5000,
        });
        return;
    }

    if (obj.action === 'update') {
        if (found === true)
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

export function mqttReconnect(settings = undefined) {
    settings = settings || persist;

    persist.mqttUri = settings.mqttUri !== undefined ? settings.mqttUri : 'wss://arena.andrew.cmu.edu/mqtt/';

    if (persist.mc) persist.mc.disconnect();

    console.info('Disconnected.');

    // start mqtt client
    persist.mc = new MqttClient({
        uri: settings.mqttUri,
        onMessageCallback: onMqttMessage,
        onConnectionLost: onMqttConnectionLost,
        mqtt_username: settings.mqttUsername,
        mqtt_token: settings.mqttToken,
    });

    try {
        settings.mc.connect();
    } catch (error) {
        Alert.fire({
            icon: 'error',
            title: `Error connecting to MQTT: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }
    settings.mqttConnected = true;
    console.info(`Connected to ${settings.mqttUri}`);
    if (persist.pendingSubscribeUpdate) {
        persist.pendingSubscribeUpdate();
        persist.pendingSubscribeUpdate = undefined;
    }
}

// callback from mqttclient; on reception of message
function onMqttMessage(message) {
    const payload = message.payloadString; // .split("\\").join("");
    const obj = JSON.parse(payload);
    if (obj.type === 'program') {
        if (obj.data) {
            persist.programs.set(obj.object_id, { ...{ uuid: obj.object_id }, ...obj.data });
        }
    }
}

function onMqttConnectionLost() {
    persist.mqttConnected = false;
}

export function pubProgramMsg(action, obj) {
    const programTopic = 'realm/proc/control';
    const programObj = JSON.stringify({
        object_id: ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        ),
        action,
        type: 'req',
        data: {
            type: 'module',
            uuid: obj.object_id ? obj.object_id : obj.uuid,
            name: obj.name,
            parent: obj.parent,
            file: obj.file,
            location: obj.location,
            filetype: obj.filetype,
            env: obj.env,
            args: obj.args ? obj.args : [],
            channels: obj.chanels ? obj.chanels : {},
            apis: obj.apis ? obj.apis : [],
        },
    });
    persist.mc.publish(programTopic, programObj);
}

export function populateProgramInstanceList() {
    const { programList } = persist;

    // if (persist.programs == undefined) return;

    while (programList.firstChild) {
        programList.removeChild(programList.firstChild);
    }

    const programs = persist.programs.list();

    if (programs.length == 0) {
        const li = document.createElement('li');
        const t = document.createTextNode('No running programs found in the scene');
        li.appendChild(t);
        programList.appendChild(li);
    }

    programs.forEach((program) => {
        console.log(program);
        const li = document.createElement('li');
        const span = document.createElement('span');
        const img = document.createElement('img');

        img.src = 'assets/prog-icon.png';
        li.title = `Run info:\n${JSON.stringify(program.run_info, undefined, 2).replace('{', '', -1).slice(0, -1)}`;
        const t = document.createTextNode(
            `${program.uuid.substr(0, 8)}... (${program.name}): ${program.file}@${program.parent} (${program.state}) ${program.display_msg ? `- ${program.display_msg}` : ''}`
        );
        li.appendChild(t);

        // add image
        img.width = 16;
        span.className = 'objtype';
        span.appendChild(img);
        li.appendChild(span);

        // add stop "button"
        const stopspan = document.createElement('span');
        const ielem = document.createElement('i');
        ielem.className = 'icon-trash';
        stopspan.className = 'edit';
        stopspan.title = 'Stop Program';
        stopspan.appendChild(ielem);
        stopspan.style.backgroundColor = '#da4f49';
        li.appendChild(stopspan);

        console.log(JSON.stringify(program));
        stopspan.onclick = function () {
            Swal.fire({
                title: 'Stop Program ?',
                text: "You won't be able to revert this.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, stop it!',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    pubProgramMsg('delete', { ...program });
                    persist.programs.set(program.uuid, { ...program, ...{ display_msg: 'deleting...' } }, true, true);
                }
            });
        };

        programList.appendChild(li);
    });

    programList.style.visibility = 'visible';
}

export function hideProgramInstanceList() {
    programList.style.visibility = 'hidden';
}
