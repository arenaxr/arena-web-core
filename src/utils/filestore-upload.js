/* global ARENADefaults */

export const filestoreUploadSchema = {
    // top level data adds, first
    'arenaui-card': ['img'],
    gaussian_splatting: ['src'],
    'gltf-model': ['url'],
    image: ['url'],
    'obj-model': ['obj', 'mtl'],
    'pcd-model': ['url'],
    'threejs-scene': ['url'],
    'urdf-model': ['url'],
    videosphere: ['src'],
    // next level data.something adds, second
    'gltf-model-lod': ['gltf-model-lod.detailedUrl'],
    material: ['material.src'],
    'material-extras': ['material-extras.overrideSrc'],
    sound: ['sound.src'],
    'spe-particles': ['spe-particles.texture'],
    'video-control': ['video-control.frame_object', 'video-control.video_path'],
    // TODO (mwfarb): 'scene-options': ['scene-options.navMesh'],
};

/**
 * Long chain of upload dialogs and fetch calls to select and upload a file for the object, returning the updated wire format.
 * @param {string} namespacedName
 * @param {string} sceneName
 * @param {string} objid
 * @param {string} objtype
 * @param {function} onFileUpload
 */
export async function uploadFileStoreDialog(namespacedName, sceneName, objid, objtype, onFileUpload) {
    let newObj;

    function formatUploadHtmlOptions() {
        const htmlopt = [];
        htmlopt.push(`<div style="text-align: left;"><b>Object:</b> ${objtype}<br>`);
        if (objtype === 'gltf-model') {
            htmlopt.push(`<input type="checkbox" id="cbhideinar" name="cbhideinar" >
        <label for="cbhideinar" style="display: inline-block;">Room-scale digital-twin model? Hide in AR.</label>`);
        }
        htmlopt.push(`<div style="text-align: left;">`);
        let first = true;
        Object.keys(filestoreUploadSchema).forEach((type) => {
            // look for object types, look for components
            if (type === objtype) {
                filestoreUploadSchema[type].forEach((element) => {
                    const prop = `data.${element}`;
                    htmlopt.push(`<input type="radio" id="radioAttr-${prop}" name="radioAttr" value="${prop}" ${first ? 'checked' : ''}>
                <label for="${prop}" style="display: inline-block;">Save URL to ${prop}</label><br>`);
                    first = false;
                });
            }
        });
        htmlopt.push(`</div>`);
        htmlopt.push(`</div>`);
        return `${htmlopt.join('')}`;
    }

    async function updateWireFormat(safeFilename, fullDestUrlAttr, storeExtPath, hideinar) {
        let objexists = false;
        const newobjid = !objid ? safeFilename : objid;
        const persistUri = `${window.location.protocol}//${ARENADefaults.persistHost}${ARENADefaults.persistPath}`;
        try {
            const persistOpt = ARENADefaults.disallowJWT ? {} : { credentials: 'include' };
            const data = await fetch(`${persistUri}${namespacedName}/${sceneName}/${newobjid}`, persistOpt);
            const sceneObjs = await data.json();
            objexists = !!sceneObjs && sceneObjs.length > 0;
        } catch (err) {
            console.error(err);
            return undefined;
        }
        const obj = {
            object_id: newobjid,
            action: objexists ? 'update' : 'create',
            type: 'object',
            persist: true,
            data: { object_type: objtype },
        };
        // place url nested in wire format
        const elems = fullDestUrlAttr.split('.');
        if (elems.length === 3) {
            obj.data[elems[1]][elems[2]] = `${storeExtPath}`;
        } else if (elems.length === 2) {
            obj.data[elems[1]] = `${storeExtPath}`;
        }
        if (hideinar) {
            obj.data['hide-on-enter-ar'] = true;
        }
        if (objtype === 'image') {
            // try to preserve image aspect ratio in mesh, user can scale to resize
            const img = Swal.getPopup().querySelector('.swal2-image');
            if (img.width > img.height) {
                obj.data.width = img.width / img.height;
                obj.data.height = 1;
            } else {
                obj.data.width = 1;
                obj.data.height = img.height / img.width;
            }
            obj.data.scale = { x: 1, y: 1, z: 1 };
        }
        return obj;
    }

    await Swal.fire({
        title: `Upload to Filestore & Publish`,
        html: formatUploadHtmlOptions(),
        input: 'file',
        inputAttributes: {
            'aria-label': `Select File`,
        },
        confirmButtonText: 'Upload & Publish',
        focusConfirm: false,
        showCancelButton: true,
        showLoaderOnConfirm: true,
        inputValidator: (inputfn) =>
            new Promise((resolve) => {
                if (inputfn) {
                    resolve();
                } else {
                    resolve(`${objtype} file not selected!`);
                }
            }),
        preConfirm: async (resultFileOpen) => {
            const fn = resultFileOpen.name.substr(0, resultFileOpen.name.lastIndexOf('.'));
            const safeFilename = fn.replace(/(\W+)/gi, '-');
            let hideinar = false;
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    const file = document.querySelector('.swal2-file');
                    if (!file) {
                        Swal.showValidationMessage(`${objtype} file not loaded!`);
                        return;
                    }
                    if (objtype === 'gltf-model') {
                        // allow model checkboxes hide in ar/vr (recommendations)
                        hideinar = Swal.getPopup().querySelector('#cbhideinar').checked;
                    }
                    // request fs token endpoint if auth not ready or expired
                    // Note: Now using the global ARENAAUTH from auth.js
                    let token = window.ARENAAUTH.getCookie('auth');
                    if (!window.ARENAAUTH.isTokenUsable(token)) {
                        await window.ARENAAUTH.makeUserRequest('GET', '/user/v2/storelogin');
                        token = window.ARENAAUTH.getCookie('auth');
                    }
                    const fullDestUrlAttr = document.querySelector('input[name=radioAttr]:checked').value;
                    // update user/staff scoped path
                    const storeResPrefix = window.ARENAAUTH.user_is_staff
                        ? `users/${window.ARENAAUTH.user_username}/`
                        : ``;
                    const userFilePath = `scenes/${sceneName}/${resultFileOpen.name}`;
                    const storeResPath = `${storeResPrefix}${userFilePath}`;
                    const storeExtPath = `store/users/${window.ARENAAUTH.user_username}/${userFilePath}`;
                    Swal.fire({
                        title: 'Wait for Upload',
                        imageUrl: evt.target.result,
                        imageAlt: `The uploaded ${objtype}`,
                        showConfirmButton: false,
                        showCancelButton: true,
                        didOpen: () => {
                            Swal.showLoading();
                            // request fs file upload with fs auth
                            return fetch(`/storemng/api/resources/${storeResPath}?override=true`, {
                                method: 'POST',
                                headers: {
                                    Accept: resultFileOpen.type,
                                    'X-Auth': `${token}`,
                                },
                                body: file.files[0],
                            })
                                .then((responsePostFS) => {
                                    if (!responsePostFS.ok) {
                                        throw new Error(responsePostFS.statusText);
                                    }
                                    newObj = updateWireFormat(safeFilename, fullDestUrlAttr, storeExtPath, hideinar);
                                    resolve(newObj);
                                })
                                .catch((error) => {
                                    Swal.showValidationMessage(`Request failed: ${error}`);
                                })
                                .finally(() => {
                                    Swal.hideLoading();
                                });
                        },
                    }).then((resultDidOpen) => {
                        if (resultDidOpen.dismiss === Swal.DismissReason.timer) {
                            console.error(`Upload ${objtype} file dialog timed out!`);
                        }
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(resultFileOpen);
            }).then((obj) => {
                Swal.close();
                onFileUpload(obj);
            });
        },
    });
}
