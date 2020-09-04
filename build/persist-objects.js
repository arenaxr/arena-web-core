/**
 * @fileoverview Manage objects on persistence server
 *
 */

import MqttClient from "./mqtt-client.js";

var persist;

/**
 *
 */
export async function init(settings) {
    if (settings.obj_list == undefined) throw "Must provide a list element";
    // handle default settings
    settings = settings || {};
    persist = {
        mqtt_host: settings.mqtt_host !== undefined ? settings.mqtt_host : "spatial.andrew.cmu.edu",
        mqtt_port: settings.mqtt_port !== undefined ? settings.mqtt_port : 8083,
        persist_url: settings.persist_url !== undefined ? settings.persist_url : location.hostname+(location.port ? ':'+location.port : '')+"/persist/",
        obj_list: settings.obj_list,
        scene_list: settings.scene_list,
        scene_textbox: settings.scene_textbox,
        log_panel: settings.log_panel,
        editobj_handler: settings.editobj_handler,
        mqtt_username: settings.mqtt_username,
        mqtt_token: settings.mqtt_token,
    }

    // Add a "checked" symbol when clicking on a list item
    persist.obj_list.addEventListener('click', function(ev) {
        if (ev.target.tagName === 'LI') {
            ev.target.classList.toggle('checked');
        }
    }, false);

    // start mqtt client
    persist.mc = new MqttClient({
        host: persist.mqtt_host,
        port: persist.mqtt_port,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqtt_username,
        mqtt_token: persist.mqtt_token,
    });

    log("Starting connection to " + persist.mqtt_host + ":" + persist.mqtt_port + "...");

    // connect
    try {
        persist.mc.connect();
    } catch (error) {
        console.log(error) // Failure!
        displayAlert(error, "error", 2000);
        return;
    }

    log("Connected.");

}

// change options; mqtt host and port are changed with mqttReconnect()
export async function set_options(settings) {
    // handle default settings
    settings = settings || {};
    persist = {
        persist_url: settings.persist_url !== undefined ? settings.persist_url : persist.persist_url,
        obj_list: settings.obj_list !== undefined ? settings.obj_list : persist.obj_list,
        scene_list: settings.scene_list !== undefined ? settings.scene_list : persist.scene_list,
        scene_textbox: settings.scene_textbox !== undefined ? settings.scene_textbox : persist.scene_textbox,
        log_panel: settings.log_panel !== undefined ? settings.log_panel : persist.log_panel,
        editobj_handler: settings.editobj_handler !== undefined ? settings.editobj_handler : persist.editobj_handler
    }
}

// log a message
export function log(message) {
    if (persist.log_panel !== undefined) {
        persist.log_panel.value += message + '\n';
        persist.log_panel.scrollTop = persist.log_panel.scrollHeight;
    }
}

// try to find the right persist db url by fetching a "known" scene
export async function fetchPersistURL(urls) {
    var knownScene = 'render';

    persist.persist_url = undefined;
    for (var i = 0; i < urls.length; i++) {
        var url = urls[i];
        if (url.slice(-1) != '/') url += '/';
        try {
            var response = await fetch(url + knownScene);
        } catch (err) {
            continue;
        };
        if (response) {
            if (response.ok) {
                persist.persist_url = url;
                //console.log("Persist fetch success:", url);
                displayAlert("Persist at:" + url, "success", 2000);
                break;
            }
        }
    }

    if (persist.persist_url == undefined) {
      displayAlert("Failed to find persist DB URL!", "error", 2000);
    }
}

export async function populateList(scene, editobjhandler) {
    if (persist.persist_url == undefined) {
        displayAlert("Persist DB URL not defined.", "error", 2000);
        return;
    }

    // scene list
    //console.log("Fetch: ", persist.persist_url + "!allscenes");
    try {
        var data = await fetch(persist.persist_url + "!allscenes");
        var scenes = await data.json();
    } catch (err) {
        console.log(err);
        return;
    }
    while (persist.scene_list.firstChild) {
        persist.scene_list.removeChild(persist.scene_list.firstChild);
    }

    if (scenes.length == 0) {
      var option = document.createElement("option");
      option.text = "No scenes found.";
      persist.scene_list.add(option);
    } else {
      let exists = false;
      for (let i = 0; i < scenes.length; i++) {
        var option = document.createElement("option");
        option.text = scenes[i];
        persist.scene_list.add(option);
        if (scenes[i] == persist.scene_textbox.value) exists = true;
      }
      if (exists) persist.scene_list.value = persist.scene_textbox.value;
    }

    // object list
    //console.log("Fetch: ", persist.persist_url + scene);
    try {
        var data = await fetch(persist.persist_url + scene);
        var sceneobjs = await data.json();
    } catch (err) {
        displayAlert(err, "error", 5000);
        return;
    }
    while (persist.obj_list.firstChild) {
        persist.obj_list.removeChild(persist.obj_list.firstChild);
    }
    //console.log(sceneobjs);
    if (sceneobjs.length == 0) {
        var li = document.createElement("li");
        var t = document.createTextNode('No objects in the scene');
        li.appendChild(t);
        persist.obj_list.appendChild(li);
        return;
    }

    for (let i = 0; i < sceneobjs.length; i++) {
        var li = document.createElement("li");
        var span = document.createElement("span");
        var img = document.createElement("img");
        // save obj id so we can use in delete later
        li.setAttribute("data-objid", sceneobjs[i].object_id);
        var inputValue = sceneobjs[i].object_id;
        if (sceneobjs[i].attributes) {
            if (sceneobjs[i].attributes.object_type) {
                inputValue += ' (' + sceneobjs[i].attributes.object_type + ')';
                img.src = "assets/3dobj-icon.png";
            } else if (sceneobjs[i].attributes.filetype) {
                let ptype = sceneobjs[i].attributes.filetype == "WA" ? "WASM Program" : "Python Program";
                inputValue += ' (' + ptype + ')';
                img.src = "assets/program-icon.png";
            }
        }
        var t = document.createTextNode(inputValue);
        li.appendChild(t);

        // add image
        img.width = 16;
        span.className = "objtype";
        span.appendChild(img);
        li.appendChild(span);

        // add edit "button"
        var editspan = document.createElement("span");
        var ielem = document.createElement("i");
        ielem.className = "icon-edit";
        editspan.className = "edit";
        editspan.appendChild(ielem);
        li.appendChild(editspan);

        editspan.onclick = (function() {
          var obj = sceneobjs[i];
          return function() {
            persist.editobj_handler(obj);
        }})();

        persist.obj_list.appendChild(li);
    }
}

export function deleteSelected(scene) {
    var items = persist.obj_list.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        if (items[i].classList.contains('checked')) {
            var object_id = items[i].getAttribute("data-objid");
            //console.log(object_id);
            var delJson = JSON.stringify({
                object_id: object_id,
                action: "delete"
            });
            var topic = 'realm/s/' + scene;
            log("Publish [ " + topic + "]: " + delJson);
            persist.mc.publish(topic, delJson);
        }
    }
}

export function clearSelected() {
    var items = persist.obj_list.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('checked');
    }
}

export function addObject(objJson, scene) {
    //console.log(objJson);
    var obj = JSON.parse(objJson);
    // make sure persist is true
    obj.persist = true;
    objJson = JSON.stringify(obj);
    var topic = 'realm/s/' + scene;
    log("Publish [ " + topic + "]: " + objJson);
    persist.mc.publish(topic, objJson);
    populateList(scene);
}

export function mqttReconnect(settings) {
    settings = settings || {};

    persist.mqtt_host = settings.mqtt_host !== undefined ? settings.mqtt_host : "spatial.andrew.cmu.edu";
    persist.mqtt_port = settings.mqtt_port !== undefined ? settings.mqtt_port : 8083;

    if (persist.mc)
        persist.mc.disconnect();

    log("Disconnected.");

    // start mqtt client
    persist.mc = new MqttClient({
        host: persist.mqtt_host,
        port: persist.mqtt_port,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqtt_username,
        mqtt_token: persist.mqtt_token,
    });

    try {
        persist.mc.connect();
    } catch (error) {
        displayAlert(error, "error", 5000);
        return;
    }

    log("Connected to " + persist.mqtt_host + ":" + persist.mqtt_port);
}

// callback from mqttclient; on reception of message
function onMqttMessage(message) {

}
