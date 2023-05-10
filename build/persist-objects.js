/**
 * @fileoverview Manage objects on persistence server
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import MqttClient from "./mqtt-client.js";
import { ARENAUserAccount } from "./arena-account.js";

var persist;

function type_order(type) {
    switch (type) {
        case "scene-options":
            return 0;
        case "landmarks":
            return 1;
        case "program":
            return 2;
        case "object":
            return 3;
        default:
            return 4;
    }
}

/**
 *
 */
export async function init(settings) {
    if (settings.objList == undefined) throw "Must provide a list element";
    // handle default settings
    settings = settings || {};
    persist = {
        mqttUri: settings.mqttUri !== undefined ? settings.mqttUri : "wss://arena.andrew.cmu.edu/mqtt/",
        persistUri:
            settings.persistUri !== undefined
                ? settings.persistUri
                : location.hostname + (location.port ? ":" + location.port : "") + "/persist/",
        objList: settings.objList,
        addEditSection: settings.addEditSection,
        editObjHandler: settings.editObjHandler,
        authState: settings.authState,
        mqttUsername: settings.mqttUsername,
        mqttToken: settings.mqttToken,
        exportSceneButton: settings.exportSceneButton,
    };

    persist.currentSceneObjs = [];

    // set select when clicking on a list item
    persist.objList.addEventListener(
        "click",
        function (ev) {
            if (ev.target.tagName === "LI") {
                ev.target.classList.toggle("checked");
            }
        },
        false
    );

    // start mqtt client
    persist.mc = new MqttClient({
        uri: persist.mqttUri,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqttUsername,
        mqtt_token: persist.mqttToken,
        dbg: true,
    });

    console.info("Starting connection to " + persist.mqttUri + "...");

    // connect
    try {
        persist.mc.connect();
    } catch (error) {
        console.error(error); // Failure!
        Alert.fire({
            icon: "error",
            title: `Error connecting to MQTT: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }

    persist.mqttConnected = true;
    console.info("Connected.");
}

export async function populateSceneAndNsLists(nsInput, nsList, sceneInput, sceneList) {
    try {
        persist.authState = await ARENAUserAccount.userAuthState();
    } catch (err) {
        Swal.fire({
            icon: "Error",
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
            icon: "error",
            title: "Please do a non-anonymous login.",
            allowEscapeKey: false,
            allowOutsideClick: false,
        }).then((result) => {
            signOut();
        });

        var option = document.createElement("option");
        option.text = "";
        nsList.add(option);
        nsInput.disabled = true;
        emptySceneInput(sceneInput);
        return undefined;
    }

    let ns = await populateNamespaceList(nsInput, nsList);
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

    if (noObjNotification == undefined) return;

    let li = document.createElement("li");
    let t = document.createTextNode(noObjNotification);
    li.appendChild(t);

    persist.objList.appendChild(li);
}

export async function fetchSceneObjects(scene) {
    if (persist.persistUri == undefined) {
        throw "Persist DB URL not defined."; // should be called after persist_url is set
    }
    let sceneObjs;
    try {
        let persistOpt = ARENADefaults.disallowJWT ? {} : { credentials: "include" };
        let data = await fetch(persist.persistUri + scene, persistOpt);
        if (!data) {
            throw "Could not fetch data";
        }
        if (!data.ok) {
            throw "Fetch request result not ok";
        }
        sceneObjs = await data.json();
    } catch (err) {
        throw `${err}`;
    }
    return sceneObjs;
}

export async function populateObjectList(scene, filter, objTypeFilter, focusObjectId = undefined) {
    clearObjectList();

    let sceneObjs;
    try {
        sceneObjs = await fetchSceneObjects(scene);
    } catch (err) {
        Alert.fire({
            icon: "error",
            title: `Error fetching scene from database. ${err}`,
            timer: 5000,
        });
        return;
    }
    persist.currentSceneObjs = sceneObjs;

    // sort object list by type, then object_id
    sceneObjs.sort(function (a, b) {
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
    if (sceneObjs.length == 0) {
        var li = document.createElement("li");
        var t = document.createTextNode("No objects in the scene");
        li.appendChild(t);
        persist.objList.appendChild(li);
        persist.addEditSection.style = "display:block";
        persist.exportSceneButton.setAttribute("href", "#"); // No download
        persist.exportSceneButton.removeAttribute("download"); // No download
        return;
    }

    // Update scene obj list to download as json
    persist.exportSceneButton.setAttribute(
        "href",
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sceneObjs, null, 2))
    );
    persist.exportSceneButton.setAttribute("download", `${scene.replace("/", "__")}.json`);

    // create regex
    let re;
    try {
        re = new RegExp(filter);
    } catch (err) {
        Alert.fire({
            icon: "error",
            title: `Invalid filter ${JSON.stringify(err)} (NOTE: '.*' matches all object ids)`,
            timer: 5000,
        });
        return;
    }

    for (let i = 0; i < sceneObjs.length; i++) {
        let li = document.createElement("li");
        let span = document.createElement("span");
        let img = document.createElement("img");

        // save obj json so we can use later in selected object actions (delete/copy)
        li.setAttribute("data-obj", JSON.stringify(sceneObjs[i]));
        let inputValue = "";

        if (sceneObjs[i].attributes == undefined) continue;
        if (objTypeFilter[sceneObjs[i].type] == false) continue;
        if (re.test(sceneObjs[i].object_id) == false) continue;

        if (sceneObjs[i].type == "object") {
            inputValue = sceneObjs[i].object_id + " ( " + sceneObjs[i].attributes.object_type + " )";
            img.src = "assets/3dobj-icon.png";
            if (objTypeFilter[sceneObjs[i].attributes.object_type] == false) continue;
        } else if (sceneObjs[i].type == "program") {
            var ptype = sceneObjs[i].attributes.filetype == "WA" ? "WASM program" : "python program";
            inputValue = sceneObjs[i].object_id + " ( " + ptype + ": " + sceneObjs[i].attributes.filename + " )";
            img.src = "assets/program-icon.png";
        } else if (sceneObjs[i].type == "scene-options") {
            inputValue = sceneObjs[i].object_id + " ( scene options )";
            img.src = "assets/options-icon.png";
        } else if (sceneObjs[i].type == "landmarks") {
            inputValue = sceneObjs[i].object_id + " ( landmarks )";
            img.src = "assets/map-icon.png";
        }

        const r = sceneObjs[i].attributes.rotation;
        if (r) {
            // convert deprecated euler-style rotation to quaternions if needed
            if (!r.hasOwnProperty("w")) {
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

        let t = document.createTextNode(inputValue);
        li.appendChild(t);

        // add image
        img.width = 16;
        span.className = "objtype";
        span.appendChild(img);
        li.appendChild(span);

        // add edit "button"
        let editspan = document.createElement("span");
        let ielem = document.createElement("i");
        ielem.className = "icon-edit";
        editspan.className = "edit";
        editspan.title = "Edit JSON";
        editspan.appendChild(ielem);
        li.appendChild(editspan);

        editspan.onclick = (function () {
            let obj = sceneObjs[i];
            return function () {
                persist.editObjHandler(obj);
            };
        })();

        if (sceneObjs[i].object_id == focusObjectId) {
            persist.editObjHandler(sceneObjs[i]);
        }

        // add 3d edit "button"
        if (sceneObjs[i].type != "program") {
            let editspan3d = document.createElement("span");
            let ielem3d = document.createElement("i");
            ielem3d.className = "icon-fullscreen";
            editspan3d.className = "edit3d";
            editspan3d.title = "Edit 3D";
            editspan3d.appendChild(ielem3d);
            li.appendChild(editspan3d);

            editspan3d.onclick = function () {
                if (sceneObjs[i].type == "scene-options") {
                    window.open(`/${scene}?build3d=1&objectId=env`, "Arena3dEditor");
                } else {
                    window.open(`/${scene}?build3d=1&objectId=${sceneObjs[i].object_id}`, "Arena3dEditor");
                }
            };
        }

        persist.objList.appendChild(li);
    }
    persist.addEditSection.style = "display:block";
}

export async function populateNamespaceList(nsInput, nsList) {
    if (!persist.authState.authenticated) return; // should not be called when we are not logged in

    let scenes = [];
    // get editable scenes...
    try {
        const u_scenes = await ARENAUserAccount.userScenes();
        u_scenes.forEach((u_scene) => {
            scenes.push(u_scene.name);
        });
    } catch (err) {
        Alert.fire({
            icon: "error",
            title: `Error fetching scene list from account: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
        return undefined;
    }

    // get public scenes...
    if (persist.persistUri == undefined) {
        throw "Persist DB URL not defined."; // should be called after persist_url is set
    }
    let sceneObjs;
    try {
        let persistOpt = ARENADefaults.disallowJWT
            ? {}
            : {
                  credentials: "include",
              };
        let data = await fetch(`${persist.persistUri}public/!allscenes`, persistOpt);
        if (!data) {
            throw "Could not fetch data";
        }
        if (!data.ok) {
            throw "Fetch request result not ok";
        }
        const p_scenes = await data.json();
        scenes.push(...p_scenes);
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
            let sn = scenes[i].split("/");
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
    if (persist.namespaces.indexOf("public") < 0) {
        var option = document.createElement("option");
        option.text = "public";
        nsList.appendChild(option);
    }

    // populate list
    for (let i = 0; i < persist.namespaces.length; i++) {
        var option = document.createElement("option");
        option.text = persist.namespaces[i];
        nsList.appendChild(option);
    }
    nsInput.value = persist.authState.username;
    return persist.authState.username;
}

export function emptySceneInput(sceneInput) {
    sceneInput.value = "No Scenes";
    sceneInput.disabled = true;
    clearObjectList("No Scene Selected");
    persist.addEditSection.style = "display:none";
}

export function populateSceneList(ns, sceneInput, sceneList, selected = undefined) {
    if (!persist.authState.authenticated) return; // should not be called when we are not logged in
    if (persist.scenes.length == 0) {
        emptySceneInput(sceneInput);
        return;
    }

    // clear list
    while (sceneList.firstChild) {
        sceneList.removeChild(sceneList.firstChild);
    }

    sceneInput.disabled = false;
    let first = undefined;
    let selectedExists = false;
    for (let i = 0; i < persist.scenes.length; i++) {
        if (ns && persist.scenes[i].ns !== ns) continue;
        if (!first) first = persist.scenes[i].name;
        if (selected) {
            if (selected == persist.scenes[i].name) selectedExists = true;
        }
        let option = document.createElement("option");
        option.text = ns == undefined ? `${persist.scenes[i].ns}/${persist.scenes[i].name}` : persist.scenes[i].name;
        //sceneList.add(option);
        sceneList.appendChild(option);
    }
    if (!first) {
        emptySceneInput(sceneInput);
    } else {
        if (!selected || !selectedExists) sceneInput.value = first;
        else sceneInput.value = selected;
    }
}

export function populateNewSceneNamespaces(nsInput, nsList) {
    if (!persist.authState.authenticated) {
        throw "User must be authenticated.";
    }

    let ns = persist.namespaces;
    if (persist.namespaces.indexOf("public") > 0) {
        ns.push("public");
    }

    // clear list
    while (nsList.firstChild) {
        nsList.removeChild(nsList.firstChild);
    }

    // populate list
    for (let i = 0; i < ns.length; i++) {
        var option = document.createElement("option");
        option.text = ns[i];
        nsList.appendChild(option);
    }
    nsInput.value = persist.authState.username;
    return ns;
}

export async function addNewScene(ns, sceneName, newObjs) {
    let exists = persist.scenes.find((scene) => scene.ns == ns && scene.name == sceneName);
    if (!exists) {
        try {
            let result = await ARENAUserAccount.requestUserNewScene(`${ns}/${sceneName}`);
        } catch (err) {
            Alert.fire({
                icon: "error",
                title: `Error adding scene: ${err.statusText}`,
                timer: 5000,
            });
        }
        Alert.fire({
            icon: "info",
            title: "Scene added",
            timer: 5000,
        });
        persist.scenes.push({ ns: ns, name: sceneName });
    }
    if (!newObjs) return exists;

    // add objects to the new scene
    newObjs.forEach((obj) => {
        addObject(obj, `${ns}/${sceneName}`);
    });
    return exists;
}

export async function deleteScene(ns, sceneName) {
    selectedObjsPerformAction("delete", `${ns}/${sceneName}`, true);
    let result;
    try {
        result = await ARENAUserAccount.requestDeleteUserScene(`${ns}/${sceneName}`);
    } catch (err) {
        Alert.fire({
            icon: "error",
            title: `Error deleting scene: ${err.statusText}`,
            timer: 5000,
        });
        console.error(err);
    }
}

export function selectedObjsPerformAction(action, scene, all = false) {
    var items = persist.objList.getElementsByTagName("li");
    var objList = [];
    for (var i = 0; i < items.length; i++) {
        if (!items[i].classList.contains("checked") && !all) continue;
        var objJson = items[i].getAttribute("data-obj");
        if (!objJson) continue;
        objList.push(objJson);
    }
    performActionArgObjList(action, scene, objList);
}

export function performActionArgObjList(action, scene, objList, json = true) {
    let theNewScene = scene;
    if (!persist.mqttConnected) mqttReconnect();
    for (var i = 0; i < objList.length; i++) {
        var obj = json ? JSON.parse(objList[i]) : objList[i];
        var actionObj = JSON.stringify({
            object_id: obj.object_id,
            action: action,
            persist: true,
            type: obj.type,
            data: obj.attributes != undefined ? obj.attributes : obj.data,
        });
        if (!scene) {
            scene = `${obj.namespace}/${obj.sceneId}`;
            theNewScene = obj.sceneId;
        }
        var topic = `realm/s/${scene}/${obj.object_id}`;
        console.info("Publish [ " + topic + "]: " + actionObj);
        try {
            persist.mc.publish(topic, actionObj);
        } catch (error) {
            Alert.fire({
                icon: "error",
                title: `Error: ${JSON.stringify(error)}`,
                timer: 5000,
            });
            return;
        }
    }
    return theNewScene;
}

export function selectAll() {
    var items = persist.objList.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        items[i].classList.add("checked");
    }
}

export function clearSelected() {
    var items = persist.objList.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove("checked");
    }
}

export async function addObject(obj, scene) {
    var found = false;
    if (!persist.mqttConnected) mqttReconnect();

    for (let i = 0; i < persist.currentSceneObjs.length; i++) {
        if (persist.currentSceneObjs[i].object_id == obj.object_id) {
            found = true;
            break;
        }
    }

    if (obj.action === "update") {
        if (found === false) {
            let result = await Swal.fire({
                title: "Update non-existing object ?",
                html: "You probably want to <b>create</b> new objects (update usually will have no effect).",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: `Create`,
                denyButtonText: `Update (i'm sure)`,
            });
            console.log(result);
            if (result.isConfirmed) {
                obj.action = "create";
            } else if (result.isDismissed) {
                Alert.fire({
                    icon: "warning",
                    title: "Canceled",
                    html: "Add/Update Canceled",
                    timer: 10000,
                });
                return;
            }
        }
    }

    // set overwrite to true so previous attributes are removed
    if (found) obj.overwrite = true;

    let persistAlert = obj.persist == false ? "<br/><strong>Object not persisted.</strong>" : "";
    let objJson = JSON.stringify(obj);
    var topic = `realm/s/${scene}/${obj.object_id}`;
    console.info("Publish [ " + topic + "]: " + objJson);
    try {
        persist.mc.publish(topic, objJson);
    } catch (error) {
        console.error(error);
        Alert.fire({
            icon: "error",
            title: `Error adding object. MQTT Error: ${error.message}. Try reloading.`,
            timer: 5000,
        });
        return;
    }

    if (obj.action == "update") {
        if (found == true)
            Alert.fire({
                icon: "warning",
                title: "Updated",
                html: `Object update published (previous attributes overwritten/deleted). ${persistAlert}`,
                timer: 5000,
            });
    } else {
        Alert.fire({
            icon: "info",
            title: "Created",
            html: `Object create published. ${persistAlert}`,
            timer: 5000,
        });
    }
}

export function mqttReconnect(settings) {
    settings = settings || {};

    persist.mqttUri = settings.mqtt_uri !== undefined ? settings.mqtt_uri : "wss://arena.andrew.cmu.edu/mqtt/";

    if (persist.mc) persist.mc.disconnect();

    console.info("Disconnected.");

    // start mqtt client
    persist.mc = new MqttClient({
        uri: persist.mqttUri,
        onMessageCallback: onMqttMessage,
        onConnectionLost: onMqttConnectionLost,
        mqtt_username: persist.mqttUsername,
        mqtt_token: persist.mqttToken,
    });

    try {
        persist.mc.connect();
    } catch (error) {
        Alert.fire({
            icon: "error",
            title: `Error connecting to MQTT: ${JSON.stringify(error)}`,
            timer: 5000,
        });
        return;
    }
    persist.mqttConnected = true;
    console.info("Connected to " + persist.mqttUri);
}

// callback from mqttclient; on reception of message
function onMqttMessage(message) {}

function onMqttConnectionLost() {
    persist.mqttConnected = false;
}
