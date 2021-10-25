import * as PersistObjects from "./persist-objects.js"
import {ARENAUserAccount} from "./arena-account.js"

const Alert = Swal.mixin({
    toast: true,
    position: 'bottom-end',
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
    var dfts;
    var objSchemas
    var dftSceneObjects;
    var objTypeFilter = {};

    var username = e.detail.mqtt_username;
    var mqttToken = e.detail.mqtt_token;

    // Divs/textareas on the page
    var output = document.getElementById("output");
    var editor = document.getElementById("editor");
    var validate = document.getElementById("validate");
    var sceneinput = document.getElementById("sceneinput");
    var namespaceinput = document.getElementById("namespaceinput");
    var scenelist = document.getElementById("scenelist");
    var namespacelist = document.getElementById("namespacelist");    
    var sceneUrl = document.getElementById("scene_url");
    var scenePermsUrl = document.getElementById("scene_perms_url");
    var objFilter = document.getElementById("objfilter");
    var objFilterSel = document.getElementById("objfiltersel");
    var arenaHostLbl = document.getElementById("arenahost");

    // Buttons/s
    var openAddSceneButton = document.getElementById("openaddscene");
    var deleteSceneButton = document.getElementById("deletescene");
    var importSceneButton = document.getElementById("importscene");
    var setValueButton = document.getElementById("setvalue");
    var selectSchema = document.getElementById("objtype");
    var genidButton = document.getElementById("genid");
    var clearformButton = document.getElementById("clearform");
    var delButton = document.getElementById("delobj");
    var cpyButton = document.getElementById("copyobj");
    var allButton = document.getElementById("selectall");
    var clearselButton = document.getElementById("clearlist");
    var refreshButton = document.getElementById("refreshlist");
    var refreshSlButton = document.getElementById("refreshscenelist");
    var showAllTypesButton = document.getElementById("objfiltershowall");
    var hideAllTypesButton = document.getElementById("objfilterhideall");

    var newScene=true;
    var saved_namespace;
    var saved_scene;

    // add page header
    $("#header").load("../header.html");

    // copy to clipboard buttons
    new ClipboardJS(document.querySelector("#copy_json"), {
        text: function() {
            return output.value;
        }
    });

    new ClipboardJS(document.querySelector("#copy_json_oneline"), {
        text: function() {
          let json = jsoneditor.getValue();
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
        let permsp = 'user/profile/scenes/';
        sceneUrl.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${dp}${namespaceinput.value}/${sceneinput.value}`;
        scenePermsUrl.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${permsp}${namespaceinput.value}/${sceneinput.value}`;
    };

    var updateUrl = function() {
        let newUrl = new URL(window.location.href);
        newUrl.searchParams.set('scene', `${namespaceinput.value}/${sceneinput.value}`);
        window.history.pushState({ path: newUrl.href }, '', newUrl.href);
    };

    // return uris assuming persist and mqtt are accessed through the webhost; use arenadefaults if defined
    var mqttAndPersistURI = function() {
        if (ARENADefaults) {
            return {
                host: ARENADefaults.mqttHost,
                persist_uri: location.protocol + "//"+ ARENADefaults.persistHost + ARENADefaults.persistPath,
                mqtt_uri: "wss://"+ ARENADefaults.mqttHost + "/mqtt/"
            };
        }
        return {
            host: ARENADefaults.mqttHost,
            persist_uri: location.protocol + "//"+ location.hostname + (location.port ? ":" + location.port : "") + "/persist/",
            mqtt_uri: "wss://"+ location.hostname + (location.port ? ":" + location.port : "") + "/mqtt/"
        };
    };

    var reload = function(keep_value) {
        let startval = (jsoneditor && keep_value) ? jsoneditor.getValue() : window.startval;
        window.startval = undefined;

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema: schema,
            startval: startval,
            ajax: true
        });

        // When the value of the editor changes, update the JSON output and validation message
        jsoneditor.on("change", function() {
            let json = jsoneditor.getValue();

            output.value = JSON.stringify(json, null, 2);

            let validation_errors = jsoneditor.validate();
            // Show validation errors if there are any
            if (validation_errors.length) {
                validate.value = JSON.stringify(validation_errors, null, 2);
            } else {
                validate.value = "valid";
            }
        });

        let typeSel = document.getElementsByName("root[type]")[0];
        let objTypeSel = document.getElementsByName("root[data][object_type]")[0];
        if (typeSel) typeSel.disabled = true;
        if (objTypeSel) objTypeSel.disabled = true;
    };

    var getARENAObject = function(obj, action="create", persist=true) {
        // create updateobj, where data = attributes if object comes from persist
        let arenaObj = {
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
        let updateobj = getARENAObject(obj, action);

        let schemaType = (updateobj.type === 'object') ? updateobj.data.object_type : updateobj.type
        let schemaFile = objSchemas[schemaType].file;
        let data = await fetch(schemaFile);
        schema = await data.json();
        selectSchema.value = schemaFile;

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema: schema,
            startval: updateobj
        });

        await jsoneditor.on('ready',function() {
            window.jsoneditor = jsoneditor;
            jsoneditor.setValue(updateobj);
            output.value = JSON.stringify(updateobj, null, 2);
            reload(true);

            window.location.hash = "edit_section";

            Alert.fire({
                icon: 'info',
                title: 'Loaded.',
                html: 'Loaded&nbspinto&nbsp<b>Add/Edit&nbspObject</b>&nbspform. <br/> Press "Add or Update Object" button when done.',
                timer: 10000,
            });
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
    JSONEditor.defaults.options.ajax = true;

    // Open new scene modal
    openAddSceneButton.addEventListener("click", async function() {
        Swal.fire({
            title: 'Add New Scene',
            html: `<div class="input-prepend">
                    <span class="add-on" style="width:125px">User or Organization</span>
                    <select id="modalnamespaceinput" style="width:215px"> <option value="public">public</option></select>
                  </div>
                  <div class="input-prepend">
                    <span class="add-on" style="width:125px">Scene</span>
                    <input type="text" style="width:200px" id="modalscenename" placeholder="Scene Name">
                  </div>
                  <p><small>Scene will be created with default permissions.</small></p>`,
            confirmButtonText: 'Add Scene',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            input: 'checkbox',
            inputValue: 1,
            inputPlaceholder:`Add Objects from Default Scene: ${dfts.default_objs_scene}`,
            willOpen: () => {
                const modalNsList = Swal.getPopup().querySelector('#modalnamespaceinput');
                PersistObjects.populateNewSceneNamespaces(modalNsList);
              },
            preConfirm: () => {
              const ns = Swal.getPopup().querySelector('#modalnamespaceinput').value;
              const scene = Swal.getPopup().querySelector('#modalscenename').value;
              const addobjs = !!Swal.getPopup().querySelector('#swal2-checkbox').checked;

              if (!scene.match(/^[a-zA-Z0-9_-]{3,20}$/g)) {
                Swal.showValidationMessage(`Valid scene names are between 3 and 20 characters long, and only have letters, numbers, '_', or '-'.`)
              }
              return { ns: ns, scene: scene, addobjs: addobjs}
            }
          }).then(async (result) => {
            if (result.isDismissed) return;
            let exists = await PersistObjects.addNewScene(result.value.ns, result.value.scene, (result.value.addobjs) ? dftSceneObjects : undefined);
            setTimeout(async () => {
                await PersistObjects.populateSceneList(result.value.ns, sceneinput, scenelist, result.value.scene);
                if (sceneinput.disabled === false) await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
                reload();
                updateLink();
              }, 500); // refresh after a while, so that delete messages are processed
          })
    });

    deleteSceneButton.addEventListener("click", async function() {
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
              await PersistObjects.deleteScene(namespaceinput.value, sceneinput.value, !!result.value);
              setTimeout(async () => {
                await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
                await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
                reload();
                updateLink();
                localStorage.setItem("scene", sceneinput.value );
                updateUrl();
              }, 500); // refresh after a while, so that delete messages are processed
            }
          });
    });

    importSceneButton.addEventListener('click', async function () {
        Swal.fire({
            title: 'Import from JSON',
            html: `<div class="input-prepend">
                  <span class="add-on" style="width:120px">JSON Path</span>
                  <input type="text" style="width:320px" id="jsonpath" placeholder="/store/users/user/blender-exports/scene/scene.json">            
                </div>
                <p style="font-size:10px"><strong>You can enter the blender export scene name and use the default export path.<strong></p>`,
            width: 700,
            confirmButtonText: 'Import',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            input: 'checkbox',
            inputValue: 0,
            inputPlaceholder: 'Create new scene from JSON data (add to current scene otherwise)',
            willOpen: () => {
                const path = Swal.getPopup().querySelector('#jsonpath');
                path.value = `/store/users/${username}/blender-exports/scene/scene.json`;
            },
            preConfirm: () => {
                const path = Swal.getPopup().querySelector('#jsonpath').value;
                const newScene = !!Swal.getPopup().querySelector('#swal2-checkbox').checked;

                if (!path) {
                    Swal.showValidationMessage(`Please enter a valid filestore path`);
                }
                return {jsonpath: path, newscene: newScene};
            },
        }).then((result) => {
            if (result.isDismissed) {
                console.log('canceled');
                return;
            }
            let path = `${document.location.protocol}//${document.location.hostname}${document.location.port}${
                result.value.jsonpath.startsWith('/') ? result.value.jsonpath : '/' + result.value.jsonpath}`; // full path given
            if (result.value.jsonpath.indexOf('/') == -1) {
                // blender folder name given
                path = `${document.location.protocol}//${document.location.hostname}${document.location.port}/store/users/${username}/blender-exports/${result.value.jsonpath}/scene.json`;
            }
            fetch(path)
                .then((response) => {
                    if (!response.ok) {
                        Alert.fire({
                            icon: 'error',
                            title: 'Error loading JSON.',
                            html: `Error: ${response.statusText}`,
                            timer: 8000,
                        });
                        return;
                    } else response.json();
                })
                .then((importObjs) => {
                    if (!importObjs) return;
                    let scene = `${namespaceinput.value}/${sceneinput.value}`;
                    if (result.value.newscene) {
                        scene = undefined; // will get scene from importObjs data
                    }
                    try {
                        PersistObjects.performActionArgObjList('create', scene, importObjs, false);
                    } catch (err) {
                        Alert.fire({
                            icon: 'error',
                            title: 'Error loading JSON.',
                            html: `Error: ${err}`,
                            timer: 8000,
                        });
                        return;
                    }
                    setTimeout(async () => {
                        await PersistObjects.populateObjectList(
                            `${namespaceinput.value}/${sceneinput.value}`,
                            objFilter.value,
                            objTypeFilter
                        );
                        reload();
                    }, 500);
                });
        });
    });

    // close modal
    document.querySelectorAll('.close-modal').forEach(item => {
        item.addEventListener("click", function() {
            let modal = document.getElementById("newSceneModal");
            modal.style.display = "none";
        });
    });

    // When the "update form" button is clicked, set the editor"s value
    setValueButton.addEventListener("click", function() {
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
    clearformButton.addEventListener("click", function() {
      reload();
    });

    // generate a random object_id
    genidButton.addEventListener("click", function() {
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
    selectSchema.addEventListener("change", async function() {
        let schemaFile = selectSchema.value;
        let data = await fetch(schemaFile);
        schema = await data.json();
        localStorage.setItem("schemaFile", schemaFile);
        reload();
    });

    // Change listener for namespace
    namespaceinput.addEventListener("change", async function() {
        PersistObjects.populateSceneList(namespaceinput.value, sceneinput, scenelist);
        updateLink();
        localStorage.setItem("namespace", namespaceinput.value );
        sceneinput.dispatchEvent(new Event('change'));
        saved_namespace = namespaceinput.value;
    });

    // Focus listener for namespace
    namespaceinput.addEventListener("focus", async function() {
        saved_namespace = namespaceinput.value;
        namespaceinput.value = "";        
    });    

    // Focus out listener for namespace
    namespaceinput.addEventListener("focusout", async function() {
        if (saved_namespace && saved_namespace.length > 0) namespaceinput.value = saved_namespace;
        if (saved_namespace && saved_namespace.length == 0 && namespacelist && namespacelist.options[0]) namespaceinput.value = namespacelist.options[0].value;        
    });

    // Change listener for scene list
    sceneinput.addEventListener("change", async function() {
        if (sceneinput.disabled === true) return;
        let foundScene = false;
        for (let i = 0; i < scenelist.options.length; i++) {
            if (scenelist.options[i].value == sceneinput.value) {
                foundScene = true;
                break;
            }
        }
        newScene = !foundScene;
        saved_scene = sceneinput.value;
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
        reload();
        updateLink();
        localStorage.setItem("scene", sceneinput.value );
        updateUrl();
    });

    // Focus listener for scene
    sceneinput.addEventListener("focus", async function() {
        saved_scene = sceneinput.value;
        sceneinput.value = "";        
    });    

    // Focus out listener for scene
    sceneinput.addEventListener("focusout", async function() {
        if (saved_scene && saved_scene.length > 0) sceneinput.value = saved_scene;
        if (saved_scene && saved_scene.length == 0 && scenelist && scenelist.options[0]) sceneinput.value = scenelist.options[0].value;        
    });

    // Change listener for object id filter regex
    objFilter.addEventListener("change", async function() {
        if (sceneinput.disabled === true) return;
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
    });

    objFilterSel.addEventListener("click", async function() {
        objTypeFilter[objFilterSel.value] = !objTypeFilter[objFilterSel.value];
        let opt = objFilterSel.namedItem('objfilter_' + objFilterSel.value);
        let text = ((objTypeFilter[objFilterSel.value]) ? 'Hide':'Show') + opt.textContent.substring(4);
        opt.textContent = text;
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
    });

    // listeners for buttons
    allButton.addEventListener("click", function() {
        PersistObjects.selectAll();
    });

    clearselButton.addEventListener("click", function() {
        PersistObjects.clearSelected();
    });

    refreshButton.addEventListener("click", async function() {
        if (sceneinput.disabled === true) return;
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
    });

    refreshSlButton.addEventListener("click", async function() {
        await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
        reload();
        updateLink();
    });

    delButton.addEventListener("click", async function() {
        PersistObjects.selectedObjsPerformAction('delete', `${namespaceinput.value}/${sceneinput.value}`);
        setTimeout(async () => {
            if (sceneinput.disabled === false) await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
            reload();
        }, 500); // refresh after a while, so that delete messages are processed
    });

    cpyButton.addEventListener("click", function() {
        Swal.fire({
            title: 'Copy selected objects',
            html: `<p>Copy to existing scene</p>
                   <div class="input-prepend">
                    <span class="add-on" style="width:120px">Destination Scene</span>
                    <select id="modalsceneinput" style="width:215px"></select>
                  </div>`,
            confirmButtonText: 'Copy Objects',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            willOpen: () => {
              const nsList = Swal.getPopup().querySelector('#modalsceneinput');
              PersistObjects.populateSceneList(undefined, nsList, nsList);
            },
            preConfirm: () => {
              const scene = Swal.getPopup().querySelector('#modalsceneinput').value;
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
    
    async function setAllTypes(showHide) {
        for (const [key, value] of Object.entries(objTypeFilter)) {
            objTypeFilter[key] = showHide; // true = show
            let opt = objFilterSel.namedItem('objfilter_' + key);
            let text = ((showHide) ? 'Hide':'Show') + opt.textContent.substring(4);
            opt.textContent = text;
        }
        await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
    }
    showAllTypesButton.addEventListener("click", async function() {
        setAllTypes(true);
    });
    hideAllTypesButton.addEventListener("click", async function() {
        setAllTypes(false);
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
        // add scene if it does not exist
        if (newScene) await PersistObjects.addNewScene(namespaceinput.value, sceneinput.value, undefined);

        await PersistObjects.addObject(obj, `${namespaceinput.value}/${sceneinput.value}`);
        setTimeout(async () => {
            PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
        }, 500); // refresh after a while, so that new object messages are processed
    };
    document.querySelectorAll('.addobj').forEach(item => {
      item.addEventListener("click", addObjHandler);
    });

    /**
     * Load defaults, setup initial state of the page
     */

    try {
        let data = await fetch("./dft-config.json");
        dfts = await data.json();
      } catch (err) {
        console.error("Error loading defaults:", err.message);
        return;
      }

      try {
          let data = await fetch(dfts.schema_definitions);
          objSchemas = await data.json();
        } catch (err) {
          console.error("Error loading schema definitions:", err.message);
          return;
      }

      for (let objtype in objSchemas) {
          // add schema files to select
          let ofile = document.createElement("option");
          ofile.value = objSchemas[objtype].file;
          ofile.title = objSchemas[objtype].description;
          ofile.id = 'objtype_' + objtype;
          ofile.appendChild(document.createTextNode(objSchemas[objtype].title));
          selectSchema.appendChild(ofile);

          let ofilter = document.createElement("option");
          ofilter.value = objtype;
          ofilter.title = `Show/Hide ${objSchemas[objtype].title}`;
          ofilter.id = 'objfilter_' + objtype;
          ofilter.appendChild(document.createTextNode(`Hide ${objSchemas[objtype].title}`));
          objFilterSel.appendChild(ofilter);
          objTypeFilter[objtype] = true;
      }

      // load values from defaults or local storage, if they exist
      selectSchema.value = localStorage.getItem("schema_file") === null ? dfts.schema_file : localStorage.getItem("schema_file");
      selectSchema.dispatchEvent(new Event("change"));

      // Scene config schema
      if (!schema) {
          let data = await fetch(dfts.schema_file);
          schema = await data.json();
      }

    let hostData = mqttAndPersistURI(location.hostname);
    let authState = await ARENAUserAccount.userAuthState();
    arenaHostLbl.value = hostData.host;

    // start persist object mngr
    PersistObjects.init({
        persistUri: hostData.persist_uri,
        mqttUri: hostData.mqtt_uri,
        objList: document.getElementById("objlist"),
        addEditSection: document.getElementById("addeditsection"),
        editObjHandler: editObject,
        authState: authState,
        mqttUsername: username,
        mqttToken: mqttToken,
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
    let result = await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
    if (!result) return;
    
    namespaceinput.value = username; // default to user namespace

    // load namespace from defaults or local storage, if they exist; prefer url parameter, if given
    let url = new URL(window.location.href);
    let sceneParam = url.searchParams.get('scene');
    let ns, s;
    if (sceneParam) {
        let sn = sceneParam.split('/');
        ns = sn[0];
        s = sn[1];
    } else {
        ns = localStorage.getItem("namespace") === null ? username : localStorage.getItem("namespace");
        s = localStorage.getItem("scene") === null ? dfts.scene : localStorage.getItem("scene");
    }
    // do initial update
    if (ns !== namespaceinput.value) { // if we changed namespace
        namespaceinput.value = ns;
        PersistObjects.populateSceneList(namespaceinput.value, sceneinput, scenelist, s);
        localStorage.setItem("namespace", namespaceinput.value );
    }
    if (s !== sceneinput.value) { // if we changed scene
        sceneinput.value = s;
    }
    if (sceneinput.disabled === false) await PersistObjects.populateObjectList(`${namespaceinput.value}/${sceneinput.value}`, objFilter.value, objTypeFilter);
    localStorage.setItem("scene", sceneinput.value );
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
