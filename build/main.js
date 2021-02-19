import * as PersistObjects from "./persist-objects.js"
import {ARENAUserAccount} from "./arena-account.js"

var schema_files = {
    "object": {
        file: "arena-obj3d.json",
        description: "3D Object"
    },
    "entity": {
        file: "schemas/entity.json",
        description: "Entity"
    },
    "object-test": {
        file: "schemas/entity.json",
        description: "Entity-New"
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

const Alert = Swal.mixin({
    toast: true,
    position: 'top-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    showCancelButton: true,
    cancelButtonColor: '#a3320f',
    cancelButtonText: 'X'
})
window.Alert = Alert;

window.addEventListener('onauth', async function (e) {
    var schema;
    var jsoneditor;
    var dftSceneObjects;

    // Divs/textareas on the page
    var output = document.getElementById("output");
    var editor = document.getElementById("editor");
    var validate = document.getElementById("validate");
    var scenelist = document.getElementById("scenelist");
    var namespacelist = document.getElementById("namespacelist");
    var scene_url = document.getElementById("scene_url");
    var objfilter = document.getElementById("objfilter");
    var objfiltersel = document.getElementById("objfiltersel");

    // Buttons/s
    var open_add_scene_button = document.getElementById("openaddscene");
    var delete_scene_button = document.getElementById("deletescene");
    var set_value_button = document.getElementById("setvalue");
    var select_schema = document.getElementById("objtype");
    var genid_button = document.getElementById("genid");
    var clearform_button = document.getElementById("clearform");
    var del_button = document.getElementById("delobj");
    var cpy_button = document.getElementById("copyobj");
    var all_button = document.getElementById("selectall");
    var clearsel_button = document.getElementById("clearlist");
    var refresh_button = document.getElementById("refreshlist");
    var refresh_sl_button = document.getElementById("refreshscenelist");
    
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

    var getDevPath = function() {
        let path = window.location.pathname.substring(1);
        let devPath='';
        if (ARENADefaults.supportDevFolders && path.length > 0) {
          try {
            devPath = path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0];
          } catch(e) {
            // no devPath
          }
        }
        return devPath;
    };

    var updateLink = function() {
        let dp = getDevPath();
        scene_url.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${dp}${namespacelist.value}/${scenelist.value}`;
    };

    var updateUrl = function() {
        let newUrl = new URL(window.location.href);
        newUrl.searchParams.set('scene', `${namespacelist.value}/${scenelist.value}`);
        window.history.pushState({ path: newUrl.href }, '', newUrl.href);
    };

    // return uris assuming persist and mqtt are accessed through the webhost
    var mqttAndPersistURI = function(hn) {
        return {
            persist_uri: location.protocol + "//"+ location.hostname + (location.port ? ":" + location.port : "") + "/persist/",
            mqtt_uri: "wss://"+ location.hostname + (location.port ? ":" + location.port : "") + "/mqtt/"
        };
    };

    var reload = function(keep_value) {
        var startval = (jsoneditor && keep_value) ? jsoneditor.getValue() : window.startval;
        window.startval = undefined;

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema: schema,
            startval: startval,
            ajax: true
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

    var getARENAObject = function(obj, action="create", persist=true) {
        // create updateobj, where data = attributes if object comes from persist
        var arenaObj = {
          object_id: obj.object_id,
          action: action,
          persist: persist,
          type: obj.type,
          data: (obj.attributes != undefined) ? obj.attributes : obj.data
        };
        return arenaObj;
    }

    // we indicate this function as the edit handler to persist
    var editObject = async function(obj, action="update") {

        // create updateobj, where data = attributes if object comes from persist
        var updateobj = getARENAObject(obj, action);

        var schemaType = (updateobj.type === 'object') ? updateobj.data.object_type : updateobj.type
        var schemaFile = obj_schemas[schemaType].file;
        var data = await fetch(schemaFile);
        schema = await data.json();
        select_schema.value = schemaFile;

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

        Alert.fire({
            icon: 'info',
            title: 'Loaded.',
            html: 'Loaded&nbspinto&nbsp<b>Add/Edit&nbspObject</b>&nbspform. <br/><button class="btn btn-primary btn-mini" type="button" title="Add or Update Object" onClick="addObjHandler()"><i class="icon-plus"></i> Add/Update Object</a> </button> when done.',
            timer: 10000,
        });        
    }

    // Start the output textarea empty
    output.value = "";

    // set defaults
    JSONEditor.defaults.options.display_required_only = true;
    JSONEditor.defaults.options.required_by_default = false;
    JSONEditor.defaults.options.theme = "bootstrap2";
    JSONEditor.defaults.options.iconlib = "fontawesome4";
    JSONEditor.defaults.options.object_layout = "normal";
    JSONEditor.defaults.options.show_errors = "interaction";

    // Open new scene modal
    open_add_scene_button.addEventListener("click", async function() {
        //document.getElementById("newSceneModalLabel").innerHTML = `Add scene to user/org: ${namespacelist.value}`;
        //new_scene_modal.style.display = "block";
        Swal.fire({
            title: 'Add New Scene',
            html: `<div class="input-prepend">
                    <span class="add-on" style="width:125px">User or Organization</span>
                    <select id="modalnamespacelist" style="width:215px"> <option value="public">public</option></select>
                  </div>
                  <div class="input-prepend">
                    <span class="add-on" style="width:125px">Scene</span>
                    <input type="text" style="width:200px" id="modalscenename" placeholder="Scene Name">
                  </div>  
                  <div class="input-prepend">
                    <span class="add-on" style="width:125px">Clone from Scene</span>
                    <select id="modalclonescenelist" style="width:215px" disabled=true></select>
                  </div>
                  <p><small>Scene will be created with default permissions.</small></p>`,    
            confirmButtonText: 'Add Scene',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            input: 'checkbox',
            inputValue: 1,
            inputPlaceholder:'Add Default Scene Options and Landmarks',
            willOpen: () => {
                const modalNsList = Swal.getPopup().querySelector('#modalnamespacelist');
                PersistObjects.populateNewSceneNamespaces(modalNsList);
              },            
            preConfirm: () => {
              const ns = Swal.getPopup().querySelector('#modalnamespacelist').value;
              const scene = Swal.getPopup().querySelector('#modalscenename').value;
              const clones = Swal.getPopup().querySelector('#modalclonescenelist').value;
              const addobjs = !!Swal.getPopup().querySelector('#swal2-checkbox').checked;
      
              if (!scene) {
                Swal.showValidationMessage(`Please enter a new scene name`)
              }    
              return { ns: ns, scene: scene, clones: clones, addobjs: addobjs}
            }
          }).then(async (result) => {
            if (result.isDismissed) return;
            await PersistObjects.addNewScene(result.value.ns, result.value.scene, (result.value.addobjs) ? dftSceneObjects : undefined);
            setTimeout(async () => {
                await PersistObjects.populateSceneList(result.value.ns, scenelist, result.value.scene);
                if (scenelist.disabled === false) await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
                reload();
                updateLink();
              }, 500); // refresh after a while, so that delete messages are processed
          })        
    });

    delete_scene_button.addEventListener("click", async function() {
        Swal.fire({
            title: 'Delete Scene ?',
            text: "You won't be able to revert this.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            input: 'checkbox',
            inputValue: 1,
            inputPlaceholder:
              'Remove permission information',
          }).then(async (result) => {
            if (result.isConfirmed) {
              // delete
              await PersistObjects.deleteScene(namespacelist.value, scenelist.value, !!result.value);
              setTimeout(async () => {
                await PersistObjects.populateSceneAndNsLists(namespacelist, scenelist);
                reload();
                updateLink();    
              }, 500); // refresh after a while, so that delete messages are processed
            }
          });
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
        let obj;
        try {
            obj = JSON.parse(output.value);
        } catch (err) {
            Alert.fire({
                icon: 'error',
                title: 'Invalid JSON input',
                html: `Error: ${err}`,
                timer: 8000,
            });    
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
        let obj;
        try {
            obj = JSON.parse(output.value);
        } catch (err) {
            Alert.fire({
                icon: 'error',
                title: 'Invalid JSON input',
                html: `Error: ${err}`,
                timer: 8000,
            });    
            return;
        }
        // if object has an object_id field, auto create a uuid
        if (obj.object_id != undefined) {
            obj.object_id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        }
        output.value = JSON.stringify(obj, null, 2);
        jsoneditor.setValue(obj);
    });

    // Change listener for object type
    select_schema.addEventListener("change", async function() {        
        let schemaFile = select_schema.value;
        let data = await fetch(schemaFile);
        schema = await data.json();
        localStorage.setItem("schemaFile", schemaFile);
        reload();
    });

    // Change listener for namespace
    namespacelist.addEventListener("change", async function() {
        PersistObjects.populateSceneList(namespacelist.value, scenelist);
        updateLink();
        localStorage.setItem("namespace", namespacelist.value );
        scenelist.dispatchEvent(new Event('change'));
    });

    // Change listener for scene list
    scenelist.addEventListener("change", async function() {
        if (scenelist.disabled === true) return;
        await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
        reload();
        updateLink();
        localStorage.setItem("scene", scenelist.value );
        updateUrl();
    });

    // Change listener for object id filter regex
    objfilter.addEventListener("change", async function() {
        if (scenelist.disabled === true) return;
        await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
    });

    objfiltersel.addEventListener("click", async function() {
        objTypeFilter[objfiltersel.value] = !objTypeFilter[objfiltersel.value];
        var opts = objfiltersel.options;
        let opt = objfiltersel.namedItem('objfilter_' + objfiltersel.value);
        let text = ((objTypeFilter[objfiltersel.value]) ? 'Hide':'Show') + opt.innerHTML.substring(4);
        opt.innerHTML = text;
        await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
    });

    // listeners for buttons
    all_button.addEventListener("click", function() {
        PersistObjects.selectAll();
    });

    clearsel_button.addEventListener("click", function() {
        PersistObjects.clearSelected();
    });

    refresh_button.addEventListener("click", async function() {
        if (scenelist.disabled === true) return;
        await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
    });

    refresh_sl_button.addEventListener("click", async function() {
        await PersistObjects.populateSceneAndNsLists(namespacelist, scenelist);
        reload();
        updateLink();    
    });

    del_button.addEventListener("click", async function() {
        PersistObjects.selectedObjsPerformAction('delete', `${namespacelist.value}/${scenelist.value}`);
        setTimeout(async () => {
            if (scenelist.disabled === false) await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter);
            reload();
        }, 500); // refresh after a while, so that delete messages are processed
    });

    cpy_button.addEventListener("click", function() {
        Swal.fire({
            title: 'Copy selected objects',
            html: `<p>Copy to existing scene</p>
                   <div class="input-prepend">
                    <span class="add-on" style="width:120px">Destination Scene</span>
                    <select id="modalscenelist" style="width:215px"></select>
                  </div>`,
            confirmButtonText: 'Copy Objects',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            willOpen: () => {
              const nsList = Swal.getPopup().querySelector('#modalscenelist');
              PersistObjects.populateSceneList(undefined, nsList);
            },
            preConfirm: () => {
              const scene = Swal.getPopup().querySelector('#modalscenelist').value;
              if (!scene) {
                Swal.showValidationMessage(`Please select a destination scene`)
              }
              return { scene: scene }
            }
          }).then((result) => {
            if (result.isDismissed) {
              console.log("canceled");
              return;
            }
            PersistObjects.selectedObjsPerformAction('create', result.value.scene);
            Alert.fire({
                icon: 'info',
                title: 'Objects copied',
                timer: 5000,
            });    
          })
    });

    window.addObjHandler = async function() {
        if (validate.value != "valid") {
            alert("Please check validation errors.");
            Alert.fire({
                icon: 'error',
                title: 'Please check validation errors.',
                timer: 8000,
            });              
            return;
        }
        let obj;
        try {
            obj = JSON.parse(output.value);
        } catch (err) {
            Alert.fire({
                icon: 'error',
                title: 'Invalid JSON input',
                html: `Error: ${err}`,
                timer: 8000,
            });    
            return;
        }
        await PersistObjects.addObject(obj, `${namespacelist.value}/${scenelist.value}`);
        setTimeout(async () => {
            PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter); 
        }, 500); // refresh after a while, so that new object messages are processed        
    };
    document.querySelectorAll('.addobj').forEach(item => {
      item.addEventListener("click", addObjHandler);
    });

    /**
     * Load defaults, setup initial state of the page
     */

    try {
        var data = await fetch("./dft-config.json");
        var dfts = await data.json();
      } catch (err) {
        console.error("Error loading defaults:", err.message);
        return;
      }
  
      try {
          var data = await fetch(dfts.schema_definitions);
          var obj_schemas = await data.json();
        } catch (err) {
          console.error("Error loading schema definitions:", err.message);
          return;
      }
      
      var objTypeFilter = {};
      for (var objtype in obj_schemas) {
          // add schema files to select
          var ofile = document.createElement("option");
          ofile.value = obj_schemas[objtype].file;
          ofile.title = obj_schemas[objtype].description;
          ofile.id = 'objtype_' + objtype;
          ofile.appendChild(document.createTextNode(obj_schemas[objtype].title));
          select_schema.appendChild(ofile);
  
          var ofilter = document.createElement("option");
          ofilter.value = objtype;
          ofilter.title = `Show/Hide ${obj_schemas[objtype].title}`;
          ofilter.id = 'objfilter_' + objtype;
          ofilter.appendChild(document.createTextNode(`Hide ${obj_schemas[objtype].title}`));
          objfiltersel.appendChild(ofilter);
          objTypeFilter[objtype] = true;
      }
  
      // load values from defaults or local storage, if they exist
      select_schema.value = localStorage.getItem("schema_file") === null ? dfts.schema_file : localStorage.getItem("schema_file");
      select_schema.dispatchEvent(new Event("change"));
  
      if (ARENADefaults.mqttHost) { // prefer deployed custom config
          arena_host.value = ARENADefaults.mqttHost;
      } else {
          arena_host.value = (localStorage.getItem("arena_host") === null || localStorage.getItem("arena_host").length <= 1) ? dfts.arena_host : localStorage.getItem("arena_host");
      }
  
      // Scene config schema
      if (!schema) {
          var data = await fetch(dfts.schema_file);
          schema = await data.json();
      }

    var hostData = mqttAndPersistURI(location.hostname);
    var auth_state = await ARENAUserAccount.userAuthState();

    // start persist object mngr
    PersistObjects.init({
        persist_uri: hostData.persist_uri,
        mqtt_uri: hostData.mqtt_uri,
        obj_list: document.getElementById("objlist"),
        addeditsection: document.getElementById("addeditsection"),
        editobj_handler: editObject,
        auth_state: auth_state,
        mqtt_username: e.detail.mqtt_username,
        mqtt_token: e.detail.mqtt_token,
    });

    // load default objects, convert to mqtt wire format
    try {
        dftSceneObjects = await PersistObjects.fetchSceneObjects(dfts.default_objs_scene);
    } catch (err) {
        console.warn(`Could not load default scene objects from ${dfts.default_objs_scene}: ${err}`);
    }
    for (let i=0; i<dftSceneObjects.length; i++) {
        let dftObj = dftSceneObjects[i];
        dftSceneObjects[i] = getARENAObject(dftObj);
    }

    // load namespace and scene values
    let result = await PersistObjects.populateSceneAndNsLists(namespacelist, scenelist);
    if (!result) return;

    // load namespace from defaults or local storage, if they exist; prefer url parameter, if given
    let url = new URL(window.location.href);
    let sceneParam = url.searchParams.get('scene');
    let ns = namespacelist.value;
    if (sceneParam) {
        let sn = sceneParam.split('/');
        namespacelist.value = sn[0];
        scenelist.value = sn[1];    
    } else {
        namespacelist.value = localStorage.getItem("namespace") === null ? dfts.namespace : localStorage.getItem("namespace");
        scenelist.value = localStorage.getItem("scene") === null ? dfts.scene : localStorage.getItem("scene");    
    }    
    // do initial update 
    if (ns !== namespacelist.value) { // if we changed namespace
        PersistObjects.populateSceneList(namespacelist.value, scenelist);
        localStorage.setItem("namespace", namespacelist.value );
    }
    if (scenelist.disabled === false) await PersistObjects.populateObjectList(`${namespacelist.value}/${scenelist.value}`, objfilter.value, objTypeFilter); 
    localStorage.setItem("scene", scenelist.value );
    reload();
    updateLink();
    updateUrl();

    Swal.close();
});

Swal.fire({
  title: 'Loading...',
  allowEscapeKey: false,
  allowOutsideClick: false,
  timer: 20000,
  didOpen: () => {
    Swal.showLoading()
  }
}).then((result) => {
    if (result.dismiss === Swal.DismissReason.timer) {
        Swal.fire({
            icon: 'error',
            title: 'Opps. Something went wrong loading.',
            allowEscapeKey: false,
            allowOutsideClick: false,
            showConfirmButton: false
        });
    }
});