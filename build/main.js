/* global ARENAAUTH, ARENADefaults, ClipboardJS, JSONEditor, Swal, THREE, $ */

/* eslint-disable import/extensions */
import * as PersistObjects from './persist-objects.js';
import ARENAUserAccount from './arena-account.js';
import TOPICS from '../src/constants/topics.js';

const Alert = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    showCancelButton: true,
    cancelButtonColor: '#a3320f',
    cancelButtonText: 'X',
});
window.Alert = Alert;

window.addEventListener('onauth', async (e) => {
    let schema;
    let jsoneditor;
    let dfts;
    let objSchemas;
    let dftSceneObjects = [];
    let currentEditObj;
    const objTypeFilter = {};

    const username = e.detail.mqtt_username;
    const mqttToken = e.detail.mqtt_token;
    const userClient = e.detail.ids.userclient;

    // Divs/textareas on the page
    const output = document.getElementById('output');
    const editor = document.getElementById('editor');
    const validate = document.getElementById('validate');
    const sceneinput = document.getElementById('sceneinput');
    const namespaceinput = document.getElementById('namespaceinput');
    const scenelist = document.getElementById('scenelist');
    const namespacelist = document.getElementById('namespacelist');
    const sceneUrl = document.getElementById('scene_url');
    const scenePermsUrl = document.getElementById('scene_perms_url');
    const objFilter = document.getElementById('objfilter');
    const objFilterSel = document.getElementById('objfiltersel');
    const arenaHostLbl = document.getElementById('arenahost');
    const sceneLinks = document.getElementById('scenelinks');

    // Buttons/s
    const openAddSceneButton = document.getElementById('openaddscene');
    const deleteSceneButton = document.getElementById('deletescene');
    const importSceneButton = document.getElementById('importscene');
    const exportSceneButton = document.getElementById('exportscene');
    const uploadFilestoreButton = document.getElementById('uploadfilestore');
    const setValueButton = document.getElementById('setvalue');
    const selectSchema = document.getElementById('objtype');
    const genidButton = document.getElementById('genid');
    const clearformButton = document.getElementById('clearform');
    const delButton = document.getElementById('delobj');
    const cpyButton = document.getElementById('copyobj');
    const allButton = document.getElementById('selectall');
    // const programStopButton = document.getElementById('stoppgrm');
    // const programStartButton = document.getElementById('startpgrm');
    // const programRestartButton = document.getElementById('restartpgrm');
    const clearselButton = document.getElementById('clearlist');
    const refreshButton = document.getElementById('refreshlist');
    const refreshSlButton = document.getElementById('refreshscenelist');
    const showAllTypesButton = document.getElementById('objfiltershowall');
    const hideAllTypesButton = document.getElementById('objfilterhideall');

    let newScene = true;
    let saved_namespace;
    let saved_scene;

    // copy to clipboard buttons
    new ClipboardJS(document.querySelector('#copy_json'), {
        text() {
            return output.value;
        },
    });

    new ClipboardJS(document.querySelector('#copy_json_oneline'), {
        text() {
            const json = jsoneditor.getValue();
            return JSON.stringify(json, null, 0);
        },
    });

    const getDevPath = function () {
        const path = window.location.pathname.substring(1);
        let devPath = '';
        if (ARENADefaults && ARENADefaults.devInstance && path.length > 0) {
            try {
                devPath = path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0];
            } catch (e) {
                // no devPath
            }
        }
        return devPath;
    };

    const updateLink = function () {
        if (sceneinput.disabled === true) {
            sceneLinks.style = 'display:none';
            return;
        }
        sceneLinks.style = 'display:block';
        const dp = getDevPath();
        const permsp = 'user/profile/scenes/';
        sceneUrl.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${dp}${namespaceinput.value}/${sceneinput.value}`;
        scenePermsUrl.href = `${document.location.protocol}//${document.location.hostname}${document.location.port}/${permsp}${namespaceinput.value}/${sceneinput.value}`;
    };

    const updateUrl = function () {
        if (sceneinput.disabled === true) return;
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('scene', `${namespaceinput.value}/${sceneinput.value}`);
        window.history.pushState({ path: newUrl.href }, '', decodeURIComponent(newUrl.href));
    };

    // return uris assuming persist and mqtt are accessed through the webhost; use arenadefaults if defined
    const mqttAndPersistURI = function () {
        if (ARENADefaults) {
            return {
                host: ARENADefaults.mqttHost,
                persist_uri: `${location.protocol}//${ARENADefaults.persistHost}${ARENADefaults.persistPath}`,
                mqtt_uri: `wss://${ARENADefaults.mqttHost}/mqtt/`,
            };
        }
        return {
            host: ARENADefaults.mqttHost,
            persist_uri: `${location.protocol}//${location.hostname}${
                location.port ? `:${location.port}` : ''
            }/persist/`,
            mqtt_uri: `wss://${location.hostname}${location.port ? `:${location.port}` : ''}/mqtt/`,
        };
    };

    const reload = function (keep_value) {
        const startval = jsoneditor && keep_value ? jsoneditor.getValue() : window.startval;
        window.startval = undefined;

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema,
            startval,
            ajax: true,
        });

        // When the value of the editor changes, update the JSON output and validation message
        jsoneditor.on('change', () => {
            const json = jsoneditor.getValue();

            output.value = JSON.stringify(json, null, 2);

            const validation_errors = jsoneditor.validate();
            // Show validation errors if there are any
            if (validation_errors.length) {
                validate.value = JSON.stringify(validation_errors, null, 2);
            } else {
                validate.value = 'valid';
            }
            insertEulerRotationEditor();
            uploadFilestoreButton.style.display =
                ARENAAUTH.filestoreUploadSchema[json.data.object_type] === undefined ? 'none' : 'inline';
        });

        const typeSel = document.getElementsByName('root[type]')[0];
        const objTypeSel = document.getElementsByName('root[data][object_type]')[0];
        if (typeSel) typeSel.disabled = true;
        if (objTypeSel) objTypeSel.disabled = true;
    };

    const getARENAObject = function (obj, action = 'create', persist = true) {
        // create arena object, where data = attributes if object comes from persist
        const arenaObj = {
            object_id: obj.object_id,
            action,
            persist,
            type: obj.type,
            data: obj.attributes !== undefined ? obj.attributes : obj.data,
        };
        return arenaObj;
    };

    // we indicate this function as the edit handler to persist
    const editObject = async function (obj, action = 'update') {
        // create editObj, where data = attributes if object comes from persist
        currentEditObj = getARENAObject(obj, action);

        const schemaType = currentEditObj.type === 'object' ? currentEditObj.data.object_type : currentEditObj.type;
        let schemaFile = objSchemas.entity.file; // use default in case schema type is undefined
        if (objSchemas[schemaType]) {
            schemaFile = objSchemas[schemaType].file;
        }
        const data = await fetch(schemaFile);
        schema = await data.json();
        selectSchema.value = schemaFile;

        if (jsoneditor) jsoneditor.destroy();
        jsoneditor = new JSONEditor(editor, {
            schema,
            startval: currentEditObj,
        });

        await jsoneditor.on('ready', () => {
            window.jsoneditor = jsoneditor;
            jsoneditor.setValue(currentEditObj);
            output.value = JSON.stringify(currentEditObj, null, 2);
            reload(true);

            window.location.hash = 'edit_section';

            Alert.fire({
                icon: objSchemas[schemaType] ? 'info' : 'error',
                title: objSchemas[schemaType] ? 'Loaded.' : `Unknown "${schemaType}" loaded as "entity".`,
                html: 'Loaded&nbspinto&nbsp<b>Add/Edit&nbspObject</b>&nbspform. <br/> Press "<b>A</b>dd/Update Object" button when done.',
                timer: 10000,
            });
        });

        // if program, show program instances
        if (currentEditObj.type === 'program') {
            PersistObjects.populateProgramInstanceList();
        } else {
            PersistObjects.hideProgramInstanceList();
        }
    };

    /**
     * The visibility edit handler to persist. Update visible property, publish, refresh list.
     * @param {Object} refObj The object referenced in the list, used for 1 param update.
     * @param {boolean} visible If the object should be visible.
     */
    const visObject = async function (refObj, visible) {
        const obj = {
            object_id: refObj.object_id,
            action: 'update',
            persist: true,
            type: refObj.type,
            data: { visible },
        };
        const scene = `${namespaceinput.value}/${sceneinput.value}`;
        PersistObjects.performActionArgObjList('update', scene, [obj], false);
        setTimeout(async () => {
            await PersistObjects.populateObjectList(
                `${namespaceinput.value}/${sceneinput.value}`,
                objFilter.value,
                objTypeFilter
            );
        }, 500);
    };

    /**
     * Seeks the Rotation block (if any) and inserts a user-friendly Euler degree editor.
     * @param {*} json The object returned from editor.getValue().
     */
    let insertEulerRotationEditor = function () {
        editor.querySelectorAll('[data-schemapath="root.data.rotation"]').forEach((rowRotation) => {
            // divide rotation attribute into 2 GUI columns
            const rowQuat = rowRotation.childNodes[3];
            rowQuat.classList.remove('span12');
            rowQuat.classList.add('span6');
            // add second column of euler values
            const fragment = document.createDocumentFragment();
            const rowEuler = fragment.appendChild(document.createElement('div'));
            rowEuler.setAttribute('id', 'rotation-euler');
            rowRotation.appendChild(fragment);
            const elQx = document.getElementsByName('root[data][rotation][x]')[0];
            const elQy = document.getElementsByName('root[data][rotation][y]')[0];
            const elQz = document.getElementsByName('root[data][rotation][z]')[0];
            const elQw = document.getElementsByName('root[data][rotation][w]')[0];
            let elEx;
            let elEy;
            let elEz;
            $('#rotation-euler').load('rotation-euler.html', () => {
                // update euler degrees on form from quaternions
                [elEx] = document.getElementsByName('root[data][rotation][euler-x]');
                [elEy] = document.getElementsByName('root[data][rotation][euler-y]');
                [elEz] = document.getElementsByName('root[data][rotation][euler-z]');
                const eu = new THREE.Euler().setFromQuaternion(
                    new THREE.Quaternion(
                        parseFloat(elQx.value),
                        parseFloat(elQy.value),
                        parseFloat(elQz.value),
                        parseFloat(elQw.value)
                    )
                );
                elEx.value = parseFloat(THREE.MathUtils.radToDeg(eu.x).toFixed(3));
                elEy.value = parseFloat(THREE.MathUtils.radToDeg(eu.y).toFixed(3));
                elEz.value = parseFloat(THREE.MathUtils.radToDeg(eu.z).toFixed(3));
            });
            rowEuler.addEventListener('change', () => {
                // update quaternions on form from euler degree changes
                [elEx] = document.getElementsByName('root[data][rotation][euler-x]');
                [elEy] = document.getElementsByName('root[data][rotation][euler-y]');
                [elEz] = document.getElementsByName('root[data][rotation][euler-z]');
                const q = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        THREE.MathUtils.degToRad(elEx.value),
                        THREE.MathUtils.degToRad(elEy.value),
                        THREE.MathUtils.degToRad(elEz.value)
                    )
                );
                const json = jsoneditor.getValue();
                if (json) {
                    json.data.rotation.x = parseFloat(q.x.toFixed(5));
                    json.data.rotation.y = parseFloat(q.y.toFixed(5));
                    json.data.rotation.z = parseFloat(q.z.toFixed(5));
                    json.data.rotation.w = parseFloat(q.w.toFixed(5));
                    jsoneditor.setValue(json);
                    output.value = JSON.stringify(json, null, 2);
                }
            });
        });
    };

    // Start the output textarea empty
    output.value = '';

    // set defaults
    JSONEditor.defaults.options.display_required_only = true;
    JSONEditor.defaults.options.required_by_default = false;
    JSONEditor.defaults.options.theme = 'bootstrap2';
    JSONEditor.defaults.options.iconlib = 'fontawesome4';
    JSONEditor.defaults.options.object_layout = 'normal';
    JSONEditor.defaults.options.show_errors = 'interaction';
    JSONEditor.defaults.options.ajax = true;

    // show new scene modal
    function newSceneModal(theNewScene = undefined) {
        Swal.fire({
            title: 'Add New or Unlisted Scene',
            html: `<div class='input-prepend'>
                    <span class='add-on' style='width:125px'>Namespace</span>
                    <input type='text' class='input-medium' style='width:215px' list='modalnamespacelist' placeholder='Select Namespace...' id='modalnamespaceinput'>
                    <datalist id='modalnamespacelist'></datalist>
                  </div>
                  <div class='input-prepend'>
                    <span class='add-on' style='width:125px'>Scene</span>
                    <input type='text' style='width:215px' id='modalscenename' placeholder='New Scene Name'>
                  </div>
                  <p><small>You can enter an existing unlisted Scene. New Scenes will be created with default permissions.</small></p>`,
            width: 600,
            confirmButtonText: 'Add Scene',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            input: 'checkbox',
            inputValue: 0,
            inputPlaceholder: `Add Objects from Default Scene: ${dfts.default_objs_scene}`,
            willOpen: () => {
                const modalNsList = Swal.getPopup().querySelector('#modalnamespacelist');
                const modalNsInput = Swal.getPopup().querySelector('#modalnamespaceinput');
                const modalScenename = Swal.getPopup().querySelector('#modalscenename');
                if (theNewScene) modalScenename.value = theNewScene;
                PersistObjects.populateNewSceneNamespaces(modalNsInput, modalNsList);
                modalNsInput.value = namespaceinput.value;
                let savedModalNs;
                modalNsInput.addEventListener('change', () => {
                    savedModalNs = modalNsInput.value;
                });
                modalNsInput.addEventListener('focus', () => {
                    savedModalNs = modalNsInput.value;
                    modalNsInput.value = '';
                });
                modalNsInput.addEventListener('focusout', () => {
                    if (savedModalNs && savedModalNs.length > 0) modalNsInput.value = savedModalNs;
                    if (modalNsInput && modalNsInput.value.length === 0 && modalNsList && modalNsList.options[0])
                        modalNsInput.value = modalNsList.options[0].value;
                });
            },
            preConfirm: () => {
                const ns = Swal.getPopup().querySelector('#modalnamespaceinput').value;
                const scene = Swal.getPopup().querySelector('#modalscenename').value;
                const addobjs = !!Swal.getPopup().querySelector('#swal2-checkbox').checked;

                if (!scene.match(/^[a-zA-Z0-9_-]{3,20}$/g)) {
                    Swal.showValidationMessage(
                        `Valid scene names are between 3 and 20 characters long, and only have letters, numbers, '_', or '-'.`
                    );
                }
                return { ns, scene, addobjs };
            },
        }).then(async (result) => {
            if (result.isDismissed) return;
            // TODO: check if add new objects is check on an existing unlisted scene? Might result in adding objects to the scene...
            const namespacedScene = `${result.value.ns}/${result.value.scene}`;
            ARENAUserAccount.refreshAuthToken('google', username, namespacedScene);
            const exists = await PersistObjects.addNewScene(
                result.value.ns,
                result.value.scene,
                result.value.addobjs ? dftSceneObjects : undefined
            );
            namespaceinput.value = result.value.ns;
            sceneinput.value = result.value.scene;
            setTimeout(async () => {
                await PersistObjects.populateSceneList(result.value.ns, sceneinput, scenelist, result.value.scene);
                if (sceneinput.disabled === false)
                    await PersistObjects.populateObjectList(namespacedScene, objFilter.value, objTypeFilter);
                reload();
                updateLink();
            }, 500); // refresh after a while, so that delete messages are processed
        });
    }

    function publishUploadedFile(newObj) {
        if (newObj) {
            // publish to mqtt
            const scene = `${namespaceinput.value}/${sceneinput.value}`;
            PersistObjects.performActionArgObjList('update', scene, [newObj], false);
            setTimeout(async () => {
                await PersistObjects.populateObjectList(
                    `${namespaceinput.value}/${sceneinput.value}`,
                    objFilter.value,
                    objTypeFilter,
                    newObj.object_id
                );
                $(`label[innerHTML='${newObj.object_id} (${newObj.data.object_type})']`).focus();
            }, 500);
            // push updated data to forms
            output.value = JSON.stringify(newObj, null, 2);
            jsoneditor.setValue(newObj);
        }
    }

    // switch image/model
    uploadFilestoreButton.addEventListener('click', async () => {
        const oldObj = JSON.parse(output.value);
        await ARENAAUTH.uploadFileStoreDialog(sceneinput.value, oldObj.data.object_type, oldObj, publishUploadedFile);
    });

    openAddSceneButton.addEventListener('click', async () => {
        newSceneModal();
    });

    deleteSceneButton.addEventListener('click', async () => {
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
            inputPlaceholder: 'Remove permission information',
        }).then(async (result) => {
            if (result.isConfirmed) {
                // delete
                await PersistObjects.deleteScene(namespaceinput.value, sceneinput.value, !!result.value);
                setTimeout(async () => {
                    await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
                    if (!sceneinput.disabled)
                        await PersistObjects.populateObjectList(
                            `${namespaceinput.value}/${sceneinput.value}`,
                            objFilter.value,
                            objTypeFilter
                        );
                    reload();
                    updateLink();
                    localStorage.setItem('scene', sceneinput.value);
                    updateUrl();
                    updatePublishControlsByToken(namespaceinput.value, sceneinput.value, mqttToken, userClient);
                }, 500); // refresh after a while, so that delete messages are processed
            }
        });
    });

    importSceneButton.addEventListener('click', async () => {
        Swal.fire({
            title: 'Import from JSON',
            html: `<div>
                   <p style='text-align:center'>Select JSON File</p>
                   <input type='file' accept='.json,.txt' id='jsonfile'>
                   </div>`,
            width: 700,
            confirmButtonText: 'Import',
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            input: 'checkbox',
            inputValue: 0,
            inputPlaceholder: 'Create new scene from JSON data (add to current scene otherwise)',
            preConfirm: () => {
                const jsonFile = Swal.getPopup().querySelector('#jsonfile').files[0];
                const newScene = !!Swal.getPopup().querySelector('#swal2-checkbox').checked;

                if (!jsonFile) {
                    Swal.showValidationMessage(`Please select a valid json file`);
                }
                return { jsonFile, newscene: newScene };
            },
        }).then((result) => {
            if (result.isDismissed) {
                console.log('canceled');
                return;
            }
            result.value.jsonFile.text().then((jsonText) => {
                let importObjs;
                try {
                    importObjs = JSON.parse(jsonText);
                } catch {
                    Alert.fire({
                        icon: 'error',
                        title: 'Could not parse JSON.',
                        timer: 8000,
                    });
                    return;
                }
                if (!importObjs) return;
                if (sceneinput.disabled === true && !result.value.newscene) {
                    Alert.fire({
                        icon: 'error',
                        title: 'New scene not requested.',
                        html: `Must import into an existing scene.`,
                        timer: 8000,
                    });
                    return;
                }
                let scene = `${namespaceinput.value}/${sceneinput.value}`;
                if (result.value.newscene) {
                    scene = undefined; // will get scene from importObjs data
                }
                let theNewScene;
                try {
                    theNewScene = PersistObjects.performActionArgObjList('create', scene, importObjs, false);
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
                    await PersistObjects.populateSceneList(namespaceinput.value, sceneinput, scenelist, theNewScene);
                    await PersistObjects.populateObjectList(
                        `${namespaceinput.value}/${theNewScene}`,
                        objFilter.value,
                        objTypeFilter
                    );
                    reload();
                    updateLink();
                }, 500);
            });
        });
    });

    // close modal
    document.querySelectorAll('.close-modal').forEach((item) => {
        item.addEventListener('click', () => {
            const modal = document.getElementById('newSceneModal');
            modal.style.display = 'none';
        });
    });

    // When the "update form" button is clicked, set the editor"s value
    setValueButton.addEventListener('click', () => {
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
    clearformButton.addEventListener('click', () => {
        reload();
    });

    // generate a random object_id
    genidButton.addEventListener('click', () => {
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
        if (obj.object_id !== undefined) {
            obj.object_id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
                (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
            );
        }
        output.value = JSON.stringify(obj, null, 2);
        jsoneditor.setValue(obj);
    });

    // Change listener for object type
    selectSchema.addEventListener('change', async () => {
        const schemaFile = selectSchema.value;
        const data = await fetch(schemaFile);
        schema = await data.json();
        localStorage.setItem('schemaFile', schemaFile);
        reload();
    });

    // Change listener for namespace
    namespaceinput.addEventListener('change', async () => {
        PersistObjects.populateSceneList(namespaceinput.value, sceneinput, scenelist);
        updateLink();
        localStorage.setItem('namespace', namespaceinput.value);
        sceneinput.dispatchEvent(new Event('change'));
        saved_namespace = namespaceinput.value;
    });

    // Focus listener for namespace
    namespaceinput.addEventListener('focus', async () => {
        saved_namespace = namespaceinput.value;
        namespaceinput.value = '';
    });

    // Focus out listener for namespace
    namespaceinput.addEventListener('focusout', async () => {
        if (saved_namespace && saved_namespace.length > 0) namespaceinput.value = saved_namespace;
        if (saved_namespace && saved_namespace.length === 0 && namespacelist && namespacelist.options[0])
            namespaceinput.value = namespacelist.options[0].value;
    });

    // Change listener for scene list
    sceneinput.addEventListener('change', async () => {
        if (sceneinput.disabled === true) return;
        let foundScene = false;
        for (let i = 0; i < scenelist.options.length; i++) {
            if (scenelist.options[i].value === sceneinput.value) {
                foundScene = true;
                break;
            }
        }
        newScene = !foundScene;
        if (newScene) {
            newSceneModal(sceneinput.value);
        }
        saved_scene = sceneinput.value;
        const namespacedScene = `${namespaceinput.value}/${sceneinput.value}`;
        // TODO: trigger auth
        ARENAUserAccount.refreshAuthToken('google', username, namespacedScene);
        await PersistObjects.populateObjectList(namespacedScene, objFilter.value, objTypeFilter);
        reload();
        updateLink();
        localStorage.setItem('scene', sceneinput.value);
        updateUrl();
        updatePublishControlsByToken(namespaceinput.value, sceneinput.value, mqttToken, userClient);
    });

    // Focus listener for scene
    sceneinput.addEventListener('focus', async () => {
        saved_scene = sceneinput.value;
        sceneinput.value = '';
    });

    // Focus out listener for scene
    sceneinput.addEventListener('focusout', async () => {
        if (saved_scene && saved_scene.length > 0) sceneinput.value = saved_scene;
        if (saved_scene && saved_scene.length === 0 && scenelist && scenelist.options[0])
            sceneinput.value = scenelist.options[0].value;
    });

    // Change listener for object id filter regex
    objFilter.addEventListener('change', async () => {
        if (sceneinput.disabled === true) return;
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter
        );
    });

    objFilterSel.addEventListener('click', async () => {
        objTypeFilter[objFilterSel.value] = !objTypeFilter[objFilterSel.value];
        const opt = objFilterSel.namedItem(`objfilter_${objFilterSel.value}`);
        const text = (objTypeFilter[objFilterSel.value] ? 'Hide' : 'Show') + opt.textContent.substring(4);
        opt.textContent = text;
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter
        );
    });

    // listeners for buttons
    allButton.addEventListener('click', () => {
        PersistObjects.selectAll();
    });

    clearselButton.addEventListener('click', () => {
        PersistObjects.clearSelected();
    });

    refreshButton.addEventListener('click', async () => {
        if (sceneinput.disabled === true) return;
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter
        );
    });

    refreshSlButton.addEventListener('click', async () => {
        await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter
        );
        reload();
        updateLink();
    });

    delButton.addEventListener('click', async () => {
        PersistObjects.selectedObjsPerformAction('delete', `${namespaceinput.value}/${sceneinput.value}`);
        setTimeout(async () => {
            if (sceneinput.disabled === false)
                await PersistObjects.populateObjectList(
                    `${namespaceinput.value}/${sceneinput.value}`,
                    objFilter.value,
                    objTypeFilter
                );
            reload();
        }, 500); // refresh after a while, so that delete messages are processed
    });

    cpyButton.addEventListener('click', () => {
        Swal.fire({
            title: 'Copy selected objects',
            html: `<p>Copy to existing scene</p>
                   <div class='input-prepend'>
                    <span class='add-on' style='width:120px'>Destination Scene</span>
                    <select id='modalsceneinput' style='width:215px'></select>
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
                    Swal.showValidationMessage(`Please select a destination scene`);
                }
                return { scene };
            },
        }).then((result) => {
            if (result.isDismissed) {
                console.log('canceled');
                return;
            }
            PersistObjects.selectedObjsPerformAction('create', result.value.scene);
            Alert.fire({
                icon: 'info',
                title: 'Objects copied',
                timer: 5000,
            });
        });
    });
    /*
    programStopButton.addEventListener('click', () => {
        if (!currentEditObj && !currentEditObj.type === 'program') return;

        if (currentEditObj.data.instantiate !== 'single' ) {
            Alert.fire({
                icon: 'info',
                title: 'For now, we only support stopping "instantiate=single" programs.',
                timer: 5000,
            });
            return;
        }
        PersistObjects.pubProgramMsg('delete', currentEditObj);
        Alert.fire({
            icon: 'info',
            title: 'Module requested to stop',
            timer: 5000,
        });
    });

    programStartButton.addEventListener('click', () => {
        Alert.fire({
            icon: 'info',
            title: 'Not implemented. <br/>(entering the scene will start programs)',
            timer: 5000,
        });
    });

    programRestartButton.addEventListener('click', () => {
        Alert.fire({
            icon: 'info',
            title: 'Not implemented. <br/>(entering the scene will start programs)',
            timer: 5000,
        });
    });
*/
    async function setAllTypes(showHide) {
        for (const [key, value] of Object.entries(objTypeFilter)) {
            objTypeFilter[key] = showHide; // true = show
            const opt = objFilterSel.namedItem(`objfilter_${key}`);
            const text = (showHide ? 'Hide' : 'Show') + opt.textContent.substring(4);
            opt.textContent = text;
        }
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter
        );
    }

    showAllTypesButton.addEventListener('click', async () => {
        setAllTypes(true);
    });
    hideAllTypesButton.addEventListener('click', async () => {
        setAllTypes(false);
    });

    window.addObjHandler = async function () {
        if (validate.value !== 'valid') {
            alert('Please check validation errors.');
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

        await PersistObjects.addObject(obj, namespaceinput.value, sceneinput.value);
        setTimeout(async () => {
            PersistObjects.populateObjectList(
                `${namespaceinput.value}/${sceneinput.value}`,
                objFilter.value,
                objTypeFilter
            );
        }, 500); // refresh after a while, so that new object messages are processed
    };

    document.querySelectorAll('.addobj').forEach((item) => {
        item.addEventListener('click', addObjHandler);
    });

    /*
    document.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) addObjHandler();
    });
    */

    /**
     * Load defaults, setup initial state of the page
     */

    try {
        const data = await fetch('./dft-config.json');
        dfts = await data.json();
    } catch (err) {
        console.error('Error loading defaults:', err.message);
        return;
    }

    try {
        const data = await fetch(dfts.schema_definitions);
        objSchemas = await data.json();
    } catch (err) {
        console.error('Error loading schema definitions:', err.message);
        return;
    }

    for (const objtype in objSchemas) {
        // add schema files to select
        const ofile = document.createElement('option');
        ofile.value = objSchemas[objtype].file;
        ofile.title = objSchemas[objtype].description;
        ofile.id = `objtype_${objtype}`;
        ofile.appendChild(document.createTextNode(objSchemas[objtype].title));
        selectSchema.appendChild(ofile);

        const ofilter = document.createElement('option');
        ofilter.value = objtype;
        ofilter.title = `Show/Hide ${objSchemas[objtype].title}`;
        ofilter.id = `objfilter_${objtype}`;
        ofilter.appendChild(document.createTextNode(`Hide ${objSchemas[objtype].title}`));
        objFilterSel.appendChild(ofilter);
        objTypeFilter[objtype] = true;
    }

    // load values from defaults or local storage, if they exist
    selectSchema.value =
        localStorage.getItem('schema_file') === null ? dfts.schema_file : localStorage.getItem('schema_file');
    selectSchema.dispatchEvent(new Event('change'));

    // Scene config schema
    if (!schema) {
        const data = await fetch(dfts.schema_file);
        schema = await data.json();
    }

    const hostData = mqttAndPersistURI(location.hostname);
    const authState = await ARENAUserAccount.userAuthState();
    if (!authState.authenticated) {
        Swal.fire({
            icon: 'error',
            title: 'Please do a non-anonymous login.',
            allowEscapeKey: false,
            allowOutsideClick: false,
        }).then(ARENAAUTH.signOut);
        return;
    }

    arenaHostLbl.value = hostData.host;

    const url = new URL(window.location.href);
    const sceneParam = url.searchParams.get('scene');
    const focusObjectId = url.searchParams.get('objectId');
    const debug = Boolean(url.searchParams.get('debug')); // deterministic truthy/falsy boolean

    // start persist object mngr
    PersistObjects.init({
        persistUri: hostData.persist_uri,
        mqttUri: hostData.mqtt_uri,
        objList: document.getElementById('objlist'),
        addEditSection: document.getElementById('addeditsection'),
        editObjHandler: editObject,
        visObjHandler: visObject,
        programList: document.getElementById('proglist'),
        authState,
        mqttUsername: username,
        mqttToken,
        userClient,
        exportSceneButton,
        dbg: debug,
    });

    // load default objects, convert to mqtt wire format
    try {
        dftSceneObjects = await PersistObjects.fetchSceneObjects(dfts.default_objs_scene);
    } catch (err) {
        console.warn(`Could not load default scene objects from ${dfts.default_objs_scene}: ${err}`);
    }
    for (let i = 0; i < dftSceneObjects.length; i++) {
        const dftObj = dftSceneObjects[i];
        dftSceneObjects[i] = getARENAObject(dftObj);
    }

    // load namespace and scene values
    const result = await PersistObjects.populateSceneAndNsLists(namespaceinput, namespacelist, sceneinput, scenelist);
    if (!result) return;

    namespaceinput.value = username; // default to user namespace

    // load namespace from defaults or local storage, if they exist; prefer url parameter, if given
    let ns;
    let s;
    if (sceneParam) {
        const sn = sceneParam.split('/');
        ns = sn[0];
        s = sn[1];
    } else {
        ns = localStorage.getItem('namespace') === null ? username : localStorage.getItem('namespace');
        s = localStorage.getItem('scene') === null ? dfts.scene : localStorage.getItem('scene');
    }
    // do initial update
    if (ns !== namespaceinput.value) {
        // if we changed namespace
        namespaceinput.value = ns;
        PersistObjects.populateSceneList(namespaceinput.value, sceneinput, scenelist, s);
        localStorage.setItem('namespace', namespaceinput.value);
    }
    if (s !== sceneinput.value) {
        // if we changed scene
        sceneinput.value = s;
    }
    if (sceneinput.disabled === false)
        await PersistObjects.populateObjectList(
            `${namespaceinput.value}/${sceneinput.value}`,
            objFilter.value,
            objTypeFilter,
            focusObjectId
        );
    localStorage.setItem('scene', sceneinput.value);
    reload();
    updateLink();
    updateUrl();
    updatePublishControlsByToken(ns, s, mqttToken, userClient);

    Swal.close();
});

Swal.fire({
    title: 'Loading...',
    allowEscapeKey: false,
    allowOutsideClick: false,
    timer: 20000,
    didOpen: () => {
        Swal.showLoading();
    },
}).then((result) => {
    if (result.dismiss === Swal.DismissReason.timer) {
        Swal.fire({
            icon: 'error',
            title: 'Opps. Something went wrong loading.',
            allowEscapeKey: false,
            allowOutsideClick: false,
            showConfirmButton: false,
        });
    }
});

/**
 * Enable some "publish" buttons by token access
 * @param {string} namespace
 * @param {string} scenename
 * @param {string} mqttToken
 */
function updatePublishControlsByToken(namespace, scenename, mqttToken, userClient) {
    const objectsTopic = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr({
        nameSpace: namespace,
        sceneName: scenename,
        userClient,
        objectId: '+',
    });
    const editor = ARENAAUTH.isUserSceneEditor(mqttToken, objectsTopic);
    const delButton = document.getElementById('delobj');
    const deleteSceneButton = document.getElementById('deletescene');
    if (editor) {
        delButton.classList.remove('isDisabled');
        deleteSceneButton.classList.remove('isDisabled');
    } else {
        delButton.classList.add('isDisabled');
        deleteSceneButton.classList.add('isDisabled');
    }
    document.querySelectorAll('.addobj').forEach((item) => {
        item.disabled = !editor;
    });
}

// eslint-disable-next-line no-extend-native
String.prototype.formatStr = function formatStr(...args) {
    const params = arguments.length === 1 && typeof args[0] === 'object' ? args[0] : args;
    return this.replace(/\{([^}]+)\}/g, (match, key) => (typeof params[key] !== 'undefined' ? params[key] : match));
};
