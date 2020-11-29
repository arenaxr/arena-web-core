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
        mqtt_uri: settings.mqtt_uri !== undefined ? settings.mqtt_uri : "wss://arena.andrew.cmu.edu/mqtt/",
        persist_uri: settings.persist_uri !== undefined ? settings.persist_uri : location.hostname+(location.port ? ":"+location.port : "")+"/persist/",
        obj_list: settings.obj_list,
        scene_list: settings.scene_list,
        scene_textbox: settings.scene_textbox,
        log_panel: settings.log_panel,
        editobj_handler: settings.editobj_handler,
        mqtt_username: settings.mqtt_username,
        mqtt_token: settings.mqtt_token,
    }

    // set select when clicking on a list item
    persist.obj_list.addEventListener('click', function(ev) {
        if (ev.target.tagName === 'LI') {
            ev.target.classList.toggle('checked');
        }
    }, false);

    // start mqtt client
    persist.mc = new MqttClient({
        uri: persist.mqtt_uri,
        onMessageCallback: onMqttMessage,
        mqtt_username: persist.mqtt_username,
        mqtt_token: persist.mqtt_token,
    });

    log("Starting connection to " + persist.mqtt_uri + "...");

    // connect
    try {
        persist.mc.connect();
    } catch (error) {
        console.error(error) // Failure!
        displayAlert("Error connecting to MQTT: " + error, "error", 2000);
        return;
    }

    log("Connected.");

}

// change options; mqtt host and port are changed with mqttReconnect()
export async function set_options(settings) {
    // handle default settings
    settings = settings || {};
    persist.persist_uri = settings.persist_uri !== undefined ? settings.persist_uri : persist.persist_uri,
    persist.obj_list = settings.obj_list !== undefined ? settings.obj_list : persist.obj_list,
    persist.scene_list = settings.scene_list !== undefined ? settings.scene_list : persist.scene_list,
    persist.scene_textbox = settings.scene_textbox !== undefined ? settings.scene_textbox : persist.scene_textbox,
    persist.log_panel = settings.log_panel !== undefined ? settings.log_panel : persist.log_panel,
    persist.editobj_handler = settings.editobj_handler !== undefined ? settings.editobj_handler : persist.editobj_handler
}

// log a message
export function log(message) {
    if (persist.log_panel !== undefined) {
        persist.log_panel.value += message + "\n";
        persist.log_panel.scrollTop = persist.log_panel.scrollHeight;
    }
}

export async function populateList(scene, filter='.*', chk_type={'object': true, 'program': true, 'scene-options': true, 'landmarks': true}) {
    if (persist.persist_uri == undefined) {
        console.error("Persist DB URL not defined."); // populate list should be called after persist_url is set
        return;
    }

    try {
        var data = await fetch(persist.persist_uri + "!allscenes");
        if (!data) {
          displayAlert("Error fetching scene list from database.", "error", 5000);
          return;
        }
        if (!data.ok) {
          displayAlert("Error fetching scene list from database.", "error", 5000);
          return;
        }
        var scenes = await data.json();

    } catch (err) {
        displayAlert("Error fetching scene list from database: " + err, "error", 5000);
        console.error(err);
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

    try {
        var data = await fetch(persist.persist_uri + scene);
        if (!data) {
          displayAlert("Error fetching scene from database.", "error", 5000);
          return;
        }
        if (!data.ok) {
          displayAlert("Error fetching scene from database.", "error", 5000);
          return;
        }
        var sceneobjs = await data.json();
    } catch (err) {
        displayAlert("Error fetching scene from database: " + err, "error", 5000);
        return;
    }
    persist.currentSceneObjs = sceneobjs;
    while (persist.obj_list.firstChild) {
        persist.obj_list.removeChild(persist.obj_list.firstChild);
    }
    //console.log(sceneobjs);
    if (sceneobjs.length == 0) {
        var li = document.createElement("li");
        var t = document.createTextNode("No objects in the scene");
        li.appendChild(t);
        persist.obj_list.appendChild(li);
        return;
    }


    // create regex
    let re;
    try {
      re = new RegExp(filter);
    } catch (err) {
        displayAlert("Invalid filter " + err + " (NOTE: '.*' matches all object ids)", "error", 5000);
        return;
    }

    for (let i = 0; i < sceneobjs.length; i++) {
        var li = document.createElement("li");
        var span = document.createElement("span");
        var img = document.createElement("img");

        // save obj id so we can use in delete later
        li.setAttribute("data-objid", sceneobjs[i].object_id);
        var inputValue = "";

        if (sceneobjs[i].attributes == undefined) continue;
        if (chk_type[sceneobjs[i].type] == false) continue;
        if (re.test(sceneobjs[i].object_id) == false) continue;

        if (sceneobjs[i].type == "object") {
            inputValue = sceneobjs[i].object_id + " ( " + sceneobjs[i].attributes.object_type + " )";
            img.src = "assets/3dobj-icon.png";
        } else if (sceneobjs[i].type == "program") {
            var ptype = sceneobjs[i].attributes.filetype == "WA" ? "WASM program" : "python program";
            inputValue =  sceneobjs[i].object_id + " ( " + ptype + ": "+ sceneobjs[i].attributes.filename +" )";
            img.src = "assets/program-icon.png";
        } else if (sceneobjs[i].type == "scene-options") {
            inputValue = sceneobjs[i].object_id + " ( scene options )";
            img.src = "assets/options-icon.png";
        } else if (sceneobjs[i].type == "landmarks") {
          inputValue = sceneobjs[i].object_id + " ( landmarks )";
          img.src = "assets/map-icon.png";
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
        if (items[i].classList.contains("checked")) {
            var object_id = items[i].getAttribute("data-objid");
            //console.log(object_id);
            var delJson = JSON.stringify({
                object_id: object_id,
                action: "delete"
            });
            var topic = "realm/s/" + scene;
            log("Publish [ " + topic + "]: " + delJson);
            try {
                persist.mc.publish(topic, delJson);
            } catch (error) {
                displayAlert("Error deleting: " + error, "error", 5000);
                return;
            }
        }
    }
}

export function selectAll() {
    var items = persist.obj_list.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        items[i].classList.add("checked");
    }
}

export function clearSelected() {
    var items = persist.obj_list.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove("checked");
    }
}

export function addObject(objJson, scene) {

    var obj = JSON.parse(objJson);

    var found = false;
    for (let i = 0; i < persist.currentSceneObjs.length; i++) {
        if (persist.currentSceneObjs[i].object_id == obj.object_id) {
          found = true;
          break;
        }
    }

    // set overwrite to true so previous attributes are removed
    if (obj.action == "update" && found) obj.overwrite = true;

    let persistAlert = (obj.persist == false) ? "<br/>This object will be added added to the scene, but not to the list of persisted objects. <br/><strong>Are you sure you don't want persist=true ?</strong>":'';
    objJson = JSON.stringify(obj);
    var topic = "realm/s/" + scene;
    log("Publish [ " + topic + "]: " + objJson);
    try {
      persist.mc.publish(topic, objJson);
    } catch (error) {
        displayAlert("Error adding object: " + error, "error", 5000);
        return;
    }

    if (obj.action == "update") {
      if (found==false) displayAlert("Sent update to new object id; Are you sure you don't want action=create ?" + persistAlert, "info", 5000);
      else displayAlert("Object update published (previous attributes overwritten/deleted)." + persistAlert, "info", 5000);
    } else {
      if (found==false) displayAlert("Object create published." + persistAlert, "info", 5000);
      else displayAlert("Sent create to existing object id; Previous attibutes not cleared. Are you sure you don't want action=update ?" + persistAlert, "info", 5000);
    }
    populateList(scene);
}

export function mqttReconnect(settings) {
    settings = settings || {};

    persist.mqtt_uri = settings.mqtt_uri !== undefined ? settings.mqtt_uri : "wss://arena.andrew.cmu.edu/mqtt/";

    if (persist.mc)
        persist.mc.disconnect();

    log("Disconnected.");

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
        displayAlert("Error connecting to MQTT: " + error, "error", 5000);
        return;
    }

    log("Connected to " + persist.mqtt_uri );
}

// callback from mqttclient; on reception of message
function onMqttMessage(message) {

}
