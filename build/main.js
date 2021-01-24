import * as PersistObjects from "./persist-objects.js"
import {ARENAUserAccount} from "./arena-account.js"

var schema_files = {
    "object": {
        file: "arena-obj3d.json",
        description: "3D Object"
    },
    "program": {
        file: "arena-program.json",
        description: "Program"
    },
    "scene-options": {
        file: "arena-scene-options.json",
        description: "Scene Options"
    },
    "landmarks": {
        file: "arena-landmarks.json",
        description: "Scene Landmarks"
    }
};

// display a floating alert message
// supported types (bootstrap): success, info, error
var displayAlert = window.displayAlert =  function(msg, type, timeMs) {
  let alert = document.getElementById("alert");
  alert.className = "alert" + " alert-" + type + " alert-block";

  alert.innerHTML = msg;
  //alert.style = "position: fixed; top: 1em; left: 1em; opacity: 0.9; width: 400px; display: block";
  alert.style.display = "block";
  if (timeMs == 0 ) return;
  setTimeout(() => {
      alert.style.display = "none";
  }, timeMs); // clear message in timeMs milliseconds

}

window.addEventListener('onauth', async function (e) {
    var schema;
    var jsoneditor;

    // Divs/textareas on the page
    var output = document.getElementById("output");
    var new_scene_modal = document.getElementById("newSceneModal");
    var editor = document.getElementById("editor");
    var validate = document.getElementById("validate");
    var scenelist = document.getElementById("scenelist");
    var namespacelist = document.getElementById("namespacelist");
    var arena_host = document.getElementById("arena_host");
    var scene_url = document.getElementById("scene_url");
    var objfilter = document.getElementById("objfilter");

    // Buttons/s
    var open_add_scene_button = document.getElementById("openaddscene");
    var add_scene_button = document.getElementById("addscene");
    var set_value_button = document.getElementById("setvalue");
    var select_schema = document.getElementById("objtype");
    var genid_button = document.getElementById("genid");
    var clearform_button = document.getElementById("clearform");
    var del_button = document.getElementById("delobj");
    var all_button = document.getElementById("selectall");
    var clearsel_button = document.getElementById("clearlist");
    var refresh_button = document.getElementById("refreshlist");

    // copy to clipboard buttons
    new ClipboardJS(document.querySelector("#copy_json"), {
        text: function(trigger) {
            return output.value;
        }
    });

    new ClipboardJS(document.querySelector("#copy_json_oneline"), {
        text: function(trigger) {
          var json = jsoneditor.getValue();
          return JSON.stringify(json, null, 0);
        }
    });

    // keep state of type checkboxes
    var typechkdiv =  document.getElementById("type_chk_div");
    var type_chk = {};

    for (var objtype in schema_files) {
        // add schema files to select
        var ofile = document.createElement("option");
        ofile.value = schema_files[objtype].file;
        ofile.appendChild(document.createTextNode(schema_files[objtype].description));
        select_schema.appendChild(ofile);

        // add type checkboxes
        var lbl = document.createElement("label");
        lbl.className = "checkbox inline ";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("checked", "true");
        input.setAttribute("value", objtype);
        lbl.appendChild(input);
        lbl.innerHTML += schema_files[objtype].description;
        typechkdiv.appendChild(lbl);
        type_chk[objtype] = true;
        lbl.addEventListener( 'change', function(e) {
              type_chk[e.target.value] = e.target.checked;
              PersistObjects.populateObjectList(scene_list.value, objfilter.value, type_chk);
        });
    }

    try {
      var data = await fetch("./dft-config.json");
      var dfts = await data.json();
    } catch (err) {
      console.error("Error loading defaults:", err.message);
      return;
    }
/*
    // load host values
    var arena_host_list = document.getElementById('arena_host_list');
    dfts.hosts.forEach(function(host) {
       var option = document.createElement('option');
       option.value = host.name;
       arena_host_list.appendChild(option);
    });
*/
    // load values from defaults or local storage, if they exist
    select_schema.value = localStorage.getItem("schema_file") === null ? dfts.schema_file : localStorage.getItem("schema_file");
    select_schema.dispatchEvent(new Event("change"));
    namespacelist.value = localStorage.getItem("namespace") === null ? dfts.namespace : localStorage.getItem("namespace");
    scenelist.value = localStorage.getItem("scene") === null ? dfts.scene : localStorage.getItem("scene");
    if (ARENADefaults && ARENADefaults.mqttHost) { // prefer deployed custom config
        arena_host.value = ARENADefaults.mqttHost;
    } else {
        arena_host.value = (localStorage.getItem("arena_host") === null || localStorage.getItem("arena_host").length <= 1) ? dfts.arena_host : localStorage.getItem("arena_host");
    }

    // Scene config schema
    if (!schema) {
        data = await fetch("arena-obj3d.json");
        schema = await data.json();
    }

    var updateLink = function() {
        let path = window.location.pathname.substring(1);
        let devPath='';
        if (ARENADefaults.supportDevFolders && path.length > 0) {
          try {
            devPath = path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0];
          } catch(e) {
            // no devPath
          }
        }
        
        scene_url.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${devPath}${namespacelist.value}/${scenelist.value}`;
    };

    // when a host addr is changed; update settings
    var updateHost = async function() {
        var hostData = mqttAndPersistURI(location.hostname);
        PersistObjects.set_options({ persist_uri: hostData.persist_uri });
        PersistObjects.mqttReconnect({ mqtt_uri: hostData.mqtt_uri});
        await PersistObjects.populateObjectList(scene_list.value, objfilter.value, type_chk);
        reload();
        updateLink();
    }

    // find host in defaults; otherwise return uris assuming persist and mqtt are accessed through the webhost
    var mqttAndPersistURI = function(hn) {
        var puri, muri, r;
        for (var i=0; i<dfts.hosts.length; i++) {
          if (hn === dfts.hosts[i].name) {
            return {
                persist_uri: dfts.hosts[i].persist_uri,
                mqtt_uri: dfts.hosts[i].mqtt_uri
            };
          }
        }
        return {
            persist_uri: location.protocol + "//"+ location.hostname + (location.port ? ":" + location.port : "") + "/persist/",
            mqtt_uri: "wss://"+ location.hostname + (location.port ? ":" + location.port : "") + "/mqtt/"
        };
    };

    var reload = function(keep_value) {
        var startval = (jsoneditor && keep_value) ? jsoneditor.getValue() : window.startval;
        window.startval = undefined;

        //new ClipboardJS(".btn");

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema: schema,
            startval: startval
        });
        window.jsoneditor = jsoneditor;

        // When the value of the editor changes, update the JSON output and validation message
        jsoneditor.on("change", function() {
            var json = jsoneditor.getValue();

            output.value = JSON.stringify(json, null, 2);

            var validation_errors = jsoneditor.validate();
            // Show validation errors if there are any
            if (validation_errors.length) {
                validate.value = JSON.stringify(validation_errors, null, 2);
            } else {
                validate.value = "valid";
            }
        });
    };

    // we indicate this function as the edit handler to persist
    var editObject = async function(obj, action="update") {

        // create updateobj, where data = attributes if object comes from persist
        var updateobj = {
          object_id: obj.object_id,
          action: action,
          persist: true,
          type: obj.type,
          data: (obj.attributes != undefined) ? obj.attributes : obj.data
        };

        var schemaFile = schema_files[updateobj.type].file;
        var data = await fetch(schemaFile);
        schema = await data.json();
        for (var opt, j = 0; opt = select_schema[j]; j++) {
            if (opt.value == schema_files[updateobj.type].file) {
                select_schema.selectedIndex = j;
                break;
            }
        }
        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema: schema,
            startval: updateobj
        });
        window.jsoneditor = jsoneditor;
        jsoneditor.setValue(updateobj);
        output.value = JSON.stringify(updateobj, null, 2);
        reload(true);

        window.location.hash = "edit_section";

        displayAlert("Object data loaded into the 'Add/Edit Object' form. <br />Press 'Add/Update Object' button when done.", "info", 5000);
    }

    // Start the output textarea empty
    output.value = "";

    // set defaults
    JSONEditor.defaults.options.display_required_only = true;
    JSONEditor.defaults.options.required_by_default = false;
    //JSONEditor.defaults.options.no_additional_properties = true;    
    JSONEditor.defaults.options.theme = "bootstrap2";
    JSONEditor.defaults.options.iconlib = "fontawesome4";
    JSONEditor.defaults.options.object_layout = "normal";
    JSONEditor.defaults.options.show_errors = "interaction";

    // Open new scene modal
    open_add_scene_button.addEventListener("click", function() {
        document.getElementById("newSceneModalLabel").innerHTML = `Add scene to user/org: ${namespacelist.value}`;
        new_scene_modal.style.display = "block";
    });

    // Add new scene 
    add_scene_button.addEventListener("click", function() {
        console.log("Add scene");
        new_scene_modal.style.display = "none";
    });

    // close modal
    document.querySelectorAll('.close-modal').forEach(item => {
        item.addEventListener("click", function() {
            var modal = document.getElementById("newSceneModal");
            modal.style.display = "none";
        });
    });

    // When the "update form" button is clicked, set the editor"s value
    set_value_button.addEventListener("click", function() {
        try {
            let obj = JSON.parse(output.value);
        } catch (err) {
            displayAlert(`Invalid JSON input: ${err}`, 'error', 5000);
            return;
        }
    
        editObject(obj, obj.action);
    });

    // clear form
    clearform_button.addEventListener("click", function() {
      reload();
    });
 
    // generate a random object_id
    genid_button.addEventListener("click", function() {
        var obj = JSON.parse(output.value);
        // if object has an object_id field, auto create a uuid
        if (obj.object_id != undefined) {
            obj.object_id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        }
        output.value = JSON.stringify(obj, null, 2);
        jsoneditor.setValue(obj);
    });

    // Change listener for object type
    select_schema.addEventListener("change", async function() {
        var schemaFile = select_schema.value;
        var data = await fetch(schemaFile);
        schema = await data.json();
        localStorage.setItem("schemaFile", schemaFile);
        reload();
    });

    var hostData = mqttAndPersistURI(location.hostname);

    // start persist object mngr
    PersistObjects.init({
        persist_uri: hostData.persist_uri,
        mqtt_uri: hostData.mqtt_uri,
        obj_list: document.getElementById("objlist"),
        scene_list: document.getElementById("scenelist"),
        ns_list: document.getElementById("namespacelist"),
        scene_textbox: document.getElementById("arena_scene"),
        log_panel: document.getElementById("logpanel"),
        editobj_handler: editObject,
        auth_state: await ARENAUserAccount.userAuthState(),
        mqtt_username: e.detail.mqtt_username,
        mqtt_token: e.detail.mqtt_token,
    });

    await PersistObjects.populateLists(objfilter.value, type_chk);
    reload();
    updateLink();

    displayAlert("Done loading.", "info", 1000);

    // Change listener for namespace
    namespacelist.addEventListener("change", async function() {
        PersistObjects.populateSceneList(namespacelist.value);
        reload();
        updateLink();
        localStorage.setItem("namespace", namespacelist.value );
        scenelist.dispatchEvent(new Event('change'));
    });

    // Change listener for scene list
    scenelist.addEventListener("change", async function() {
        if (scenelist.disabled === false) {
          PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, type_chk);
          reload();
          updateLink();
          localStorage.setItem("scene", scenelist.value );          
        }
    });

    // Change listener for object id filter regex
    objfilter.addEventListener("change", async function() {
        PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, type_chk);
    });

    // Change listener for arena URL
    arena_host.addEventListener("change", async function() {
        updateHost();
        localStorage.setItem("arena_host", arena_host.value);
    });

    // listeners for buttons
    all_button.addEventListener("click", function() {
        PersistObjects.selectAll();
    });

    clearsel_button.addEventListener("click", function() {
        PersistObjects.clearSelected();
    });

    refresh_button.addEventListener("click", function() {
        PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, type_chk);
    });

    del_button.addEventListener("click", function() {
        PersistObjects.deleteSelected(scene_list.value);
        setTimeout(() => {
            PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, type_chk);
            reload();
        }, 500); // refresh after a while, so that delete messages are processed
    });

    document.querySelectorAll('.addobj').forEach(item => {
      item.addEventListener("click", function() {
          if (validate.value != "valid") {
              alert("Please check validation errors.");
              return;
          }
          PersistObjects.addObject(output.value, scene_list.value);
      });
    });
});

displayAlert("Loading..", "info", 0);
