/* eslint-disable no-case-declarations */

/* global AFRAME, ARENA, THREE */

import { ARENAUtils } from '../../../utils';
import { ACTIONS, ARENA_EVENTS } from '../../../constants';

// default render order of objects; reserve 0 for occlusion
const RENDER_ORDER = 1;

// const camMatrixInverse = new THREE.Matrix4();
// const rigMatrix = new THREE.Matrix4();
// const overrideQuat = new THREE.Quaternion();

const warn = AFRAME.utils.debug('ARENA:warn');
const error = AFRAME.utils.debug('ARENA:error');
const createWarn = AFRAME.utils.debug('ARENA:create:warn');
const updateWarn = AFRAME.utils.debug('ARENA:update:warn');
// const createError = AFRAME.utils.debug('ARENA:create:error');
// const updateError = AFRAME.utils.debug('ARENA:update:error');
const cameraLookAtWarn = AFRAME.utils.debug('ARENA:camera look-at:warn');
const cameraLookAtError = AFRAME.utils.debug('ARENA:camera look-at:error');

/**
 * Create/Update object handler
 */
export default class CreateUpdate {
    /**
     * Create/Update handler
     * @param {int} action action to carry out; one of: ACTIONS.CREATE, ACTIONS.UPDATE
     * @param {object} message message to be parsed
     */
    static handle(action, message) {
        const { id } = message;

        /**
         * Enable/Disable object MutationObserver for build-3d watcher.
         * @param {*} entityEl The scene object to observe mutations
         * @param {*} msg Incoming ARENA message payload.
         * @param {*} enable true=start mutation observer, false=pause mutation observer
         */
        function enableBuildWatchObject(entityEl, msg, enable) {
            if (msg.persist) {
                entityEl.setAttribute('build3d-mqtt-object', 'enabled', enable);
            }
        }

        switch (message.type) {
            case 'object':
                // our own camera/controllers: bail, this message is meant for all other viewers
                if (id === ARENA.camName) {
                    return;
                }
                if (id === ARENA.handLName) {
                    return;
                }
                if (id === ARENA.handRName) {
                    return;
                }
                if (id === ARENA.faceName) {
                    return;
                }

                const buildWatchScene = document.querySelector('a-scene').getAttribute('build3d-mqtt-scene');

                let entityEl = document.getElementById(id);

                // create entity, if does not exist
                let addObj = false;
                if (!entityEl) {
                    // createWarn(`Object with object_id "${id}" does not exist; Creating...`);

                    // create object
                    if (message.data.object_type === 'videosphere') {
                        entityEl = document.createElement('a-videosphere');
                    } else {
                        entityEl = document.createElement('a-entity');
                    }
                    entityEl.setAttribute('id', id);
                    // after setting object attributes, we will add it to the scene
                    addObj = true;
                }

                // disable build-watch when applying remote updates to this object
                if (buildWatchScene) enableBuildWatchObject(entityEl, message, false);

                // set to default render order
                entityEl.object3D.renderOrder = RENDER_ORDER;

                // handle attributes of object
                if (!this.setObjectAttributes(entityEl, message)) return;

                const sceneRoot = document.getElementById('sceneRoot');
                let parentName = message.data.parent;

                // add object to the scene after setting all attributes
                if (addObj) {
                    // Parent/Child handling
                    if (parentName) {
                        if (ARENA.camName === message.data.parent) {
                            // our camera is named 'my-camera'
                            if (!message.data.camera) {
                                // Don't attach extra cameras, use own id to skip
                                parentName = 'my-camera';
                            } else {
                                return;
                            }
                        }

                        const parentEl = document.getElementById(parentName);
                        if (parentEl) {
                            entityEl.removeAttribute('parent');
                            entityEl.flushToDOM();
                            parentEl.appendChild(entityEl);
                        } else {
                            createWarn('Orphaned:', `${id} cannot find parent: ${message.data.parent}!`);
                        }
                    } else {
                        sceneRoot.appendChild(entityEl);
                    }
                } else {
                    // Parent/Child handling
                    const oldParent = entityEl.parentNode;
                    if (parentName === null) {
                        if (oldParent) oldParent.object3D.remove(entityEl.object3D);
                        sceneRoot.object3D.add(entityEl.object3D);
                    } else if (parentName !== undefined) {
                        const parentEl = document.getElementById(parentName);
                        if (parentEl !== oldParent) {
                            if (oldParent) oldParent.object3D.remove(entityEl.object3D);
                            parentEl.object3D.add(entityEl.object3D);
                        }
                    }
                }

                if (message.ttl !== undefined) {
                    // Allow falsy value of 0
                    entityEl.setAttribute('ttl', { seconds: message.ttl });
                }

                // re-enable build-watch done with applying remote updates to this object, to handle local mutation observer
                if (buildWatchScene) enableBuildWatchObject(entityEl, message, true);

                if (id === ARENA.params.camFollow) {
                    ARENAUtils.relocateUserCamera(entityEl.object3D.position, entityEl.object3D.rotation);
                }
                return;

            case 'camera-override':
                if (id !== ARENA.camName) return; // bail if not for us
                this.handleCameraOverride(action, message);
                return;

            case 'rig':
                if (id === ARENA.camName) {
                    // our camera Rig
                    const cameraSpinnerObj3D = document.getElementById('cameraSpinner').object3D;
                    const cameraRigObj3D = document.getElementById('cameraRig').object3D;
                    const { position, rotation } = message.data;
                    if (rotation) {
                        if (Object.hasOwn(rotation, 'w')) {
                            // has 'w' coordinate: a quaternion
                            cameraSpinnerObj3D.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
                        } else {
                            // otherwise its a rotation given in degrees
                            cameraSpinnerObj3D.rotation.set(
                                THREE.MathUtils.degToRad(rotation.x),
                                THREE.MathUtils.degToRad(rotation.y),
                                THREE.MathUtils.degToRad(rotation.z)
                            );
                        }
                    }
                    if (position) {
                        cameraRigObj3D.position.set(position.x, position.y, position.z);
                    }
                    const { xrSession } = AFRAME.scenes[0];
                    if (xrSession?.persistentAnchors) {
                        /*
                        Only add if persist anchor support, which implies a device (e.g. quest)
                        that retains map of area. Otherwise, there is no guarantee that the device
                        has any feature data of that location for this anchor
                         */
                        let rotQuat;
                        const { armarker: arMarkerSys } = AFRAME.scenes[0].systems;
                        if (!Object.hasOwn(rotation, 'w')) {
                            rotQuat = new THREE.Quaternion();
                            rotQuat.setFromEuler(cameraSpinnerObj3D.rotation);
                        } else {
                            rotQuat = rotation;
                        }
                        xrSession.requestAnimationFrame((time, frame) => {
                            arMarkerSys.setOriginAnchor({ position, rotation }, frame);
                        });
                    }
                }
                return;

            case 'scene-options':
                // update env-presets section in real-time
                const environmentOld = document.getElementById('env');
                const environment = document.createElement('a-entity');
                environment.id = 'env';
                const envPresets = message.data['env-presets'];
                Object.entries(envPresets).forEach(([attribute, value]) => {
                    environment.setAttribute('environment', attribute, value);
                });
                environmentOld.parentNode.replaceChild(environment, environmentOld);
                return;

            case 'face-features':
            case 'landmarks':
            case 'program':
                // TODO : Remove once all existing persist landmark entities have converted
                return;

            default:
                if (action === ACTIONS.CREATE) {
                    createWarn('Unknown type:', JSON.stringify(message));
                } else {
                    updateWarn('Unknown type:', JSON.stringify(message));
                }
        }
    }

    /**
     * Handles object attributes
     * @param {object} entityEl the new aframe object
     * @param {object} message message to be parsed
     */
    static setObjectAttributes(entityEl, message) {
        const { data } = message;
        let type = data.object_type;
        delete data.object_type; // remove attribute so we don't set it later

        if (!type) {
            warn('Malformed message; type is undefined; attributes might not be set correctly.');
        }

        if (message.action === ACTIONS.CREATE && data.blip?.blipin === true) {
            // special case where we want to handle this attribute before any others like gltf or geometry
            entityEl.setAttribute('blip', data.blip);
            delete data.blip; // remove attribute so we don't reset it later
        }

        // handle geometries and some type special cases
        // TODO: using components (e.g. for image, ...) that handle these would allow to remove most of the
        // special cases
        let isGeometry = false;
        switch (type) {
            case 'camera':
                this.setEntityAttributes(entityEl, {
                    position: data.position,
                    rotation: data.rotation,
                    'arena-user': data['arena-user'],
                }); // Only set permitted camera attributes, return
                return true;
            case 'gltf-model':
                if (ARENA.params.armode && Object.hasOwn(data, 'hide-on-enter-ar')) {
                    warn(`Skipping hide-on-enter-ar GLTF: ${entityEl.getAttribute('id')}`);
                    return false; // do not add this object
                }
                if (ARENA.params.vrmode && Object.hasOwn(data, 'hide-on-enter-vr')) {
                    warn(`Skipping hide-on-enter-vr GLTF: ${entityEl.getAttribute('id')}`);
                    return false; // do not add this object
                }
                // support both url and src property
                if (Object.hasOwn(data, 'url')) {
                    data.src = data.url; // make src=url
                    delete data.url; // remove attribute so we don't set it later
                }
                // gltf is a special case in that the src is applied to the component 'gltf-model'
                if (Object.hasOwn(data, 'src')) {
                    if (!(Object.hasOwn(data, 'remote-render') && data['remote-render'].enabled === true)) {
                        entityEl.setAttribute('gltf-model', ARENAUtils.crossOriginDropboxSrc(data.src));
                    }
                    delete data.src; // remove attribute so we don't set it later
                }
                // add attribution by default, if not given
                if (!Object.hasOwn(data, 'attribution')) {
                    entityEl.setAttribute('attribution', 'extractAssetExtras', true);
                }
                if (Object.hasOwn(data, 'modelUpdate')) {
                    /*
                 Only apply update directly on update. If this is a CREATE msg (from persist most likely), let a
                 element prop be set and actual updates deferred, to be picked up by gltf-model after model load.
                 */
                    const modelUpdateData = { ...data.modelUpdate };
                    if (message.action === ACTIONS.UPDATE) {
                        ARENAUtils.updateModelComponents(entityEl.object3D, modelUpdateData);
                    } else {
                        // eslint-disable-next-line no-param-reassign
                        entityEl.deferredModelUpdate = modelUpdateData;
                    }
                    delete data.modelUpdate; // remove attribute so we don't set it later
                }
                break;
            case 'image':
                // image is just a textured plane
                // TODO: create an aframe component for this
                entityEl.setAttribute('geometry', 'primitive', 'plane');
                // don't strip out other plane geometry attributes users may want
                type = 'plane';
                isGeometry = true;
                if (Object.hasOwn(data, 'url')) {
                    entityEl.setAttribute('material', 'src', ARENAUtils.crossOriginDropboxSrc(data.url));
                    delete data.url; // remove attribute so we don't set it later
                }
                if (Object.hasOwn(data, 'src')) {
                    entityEl.setAttribute('material', 'src', ARENAUtils.crossOriginDropboxSrc(data.src));
                    delete data.src; // remove attribute so we don't set it later
                }
                if (!Object.hasOwn(data, 'material-extras')) {
                    // default images to SRGBColorSpace, if not specified
                    entityEl.setAttribute('material-extras', 'colorSpace', 'SRGBColorSpace');
                }
                delete data.image; // no other properties applicable to image; delete it
                break;
            case 'text':
                // Support legacy `data: { text: 'STRING TEXT' }`
                const theText = data.text;
                if (typeof theText === 'string' || theText instanceof String) {
                    entityEl.setAttribute('text', 'value', data.text);
                    delete data.text;
                }
                if (!Object.hasOwn(data, 'side')) entityEl.setAttribute('text', 'side', 'double'); // default to double (aframe default=front)
                if (!Object.hasOwn(data, 'width')) entityEl.setAttribute('text', 'width', 5); // default to width to 5 (aframe default=derived from geometry)
                if (!Object.hasOwn(data, 'align')) entityEl.setAttribute('text', 'align', 'center'); // default to align to center (aframe default=left)
                break;
            case 'handLeft':
            case 'handRight':
                const newAttributes = {
                    position: data.position,
                    rotation: data.rotation,
                    'gltf-model': data.url,
                    // TODO: Add support new component for arena-other-user-hand for grab handling
                };
                if (data.scale !== undefined) {
                    newAttributes.scale = data.scale;
                }
                this.setEntityAttributes(entityEl, newAttributes); // Only set permitted hands attributes, return
                return true;
            case 'cube':
                type = 'box'; // arena legacy! new libraries/persist objects should use box!
            // eslint-disable-next-line no-fallthrough
            case 'box':
            case 'circle':
            case 'cone':
            case 'cylinder':
            case 'dodecahedron':
            case 'icosahedron':
            case 'octahedron':
            case 'plane':
            case 'ring':
            case 'sphere':
            case 'tetrahedron':
            case 'torus':
            case 'torusKnot':
            case 'triangle':
                // handle A-Frame geometry types here for performance (custom geometries are handled in the default case)
                if (type) {
                    entityEl.setAttribute('geometry', 'primitive', type);
                    isGeometry = true;
                }
                break;
            default:
                // check if the type is a registered geometry (that we do not catch in the cases above)
                if (AFRAME.geometries[type]) {
                    entityEl.setAttribute('geometry', 'primitive', type);
                    isGeometry = true;
                }
        } // switch(type)

        // handle geometry attributes
        if (isGeometry) {
            this.setGeometryAttributes(entityEl, data, type);
        }

        if (!isGeometry && type) {
            // check if we have a registered component (type = component name) that takes the attributes received
            this.setComponentAttributes(entityEl, data, type);
        }

        // what remains in data are components we set as attributes of the entity
        this.setEntityAttributes(entityEl, data);

        if (typeof ARENA.clickableOnlyEvents !== 'undefined' && !ARENA.clickableOnlyEvents) {
            // unusual case: clickableOnlyEvents = true by default
            if (!Object.hasOwn(entityEl, 'click-listener')) {
                // attach click-listener to all objects that don't already have them
                entityEl.setAttribute('click-listener', '');
            }
        }
        return true;
    }

    /**
     * Handles geometry primitive attributes
     * @param {object} entityEl the new aframe object
     * @param {object} data data part of the message with the attributes
     * @param {string} gName geometry name
     */
    static setGeometryAttributes(entityEl, data, gName) {
        if (!AFRAME.geometries[gName]) return; // no geometry registered with this name
        Object.entries(data).forEach(([attribute, value]) => {
            if (AFRAME.geometries[gName].Geometry.prototype.schema[attribute]) {
                entityEl.setAttribute('geometry', attribute, value);
                // eslint-disable-next-line no-param-reassign
                delete data[attribute]; // we handled this attribute; remove it
            }
        });
    }

    /**
     * Handles component attributes
     * Check if we have a registered component that takes the attributes given in data
     * @param {object} entityEl the new aframe object
     * @param {object} data data part of the message with the attributes
     * @param {string} cName component name
     */
    static setComponentAttributes(entityEl, data, cName) {
        if (!AFRAME.components[cName]) return; // no component registered with this name
        Object.entries(data).forEach(([attribute, value]) => {
            if (AFRAME.components[cName].Component.prototype.schema[attribute]) {
                // replace dropbox links in any 'src' or 'url' attributes
                if (attribute === 'src' || attribute === 'url') {
                    // eslint-disable-next-line no-param-reassign
                    value = ARENAUtils.crossOriginDropboxSrc(value);
                }

                if (value === null) {
                    // if null, remove attribute
                    entityEl.removeAttribute(cName);
                } else {
                    entityEl.setAttribute(cName, attribute, value);
                }
                // eslint-disable-next-line no-param-reassign
                delete data[attribute]; // we handled this attribute; remove it
            }
        });
    }

    /**
     * Handles entity attributes (components)
     *
     * @param {object} entityEl the new aframe object
     * @param {object} data data part of the message with the attributes
     */
    static setEntityAttributes(entityEl, data) {
        Object.entries(data).forEach(([attribute, value]) => {
            // console.info("Set entity attribute [id type - attr value]:", entityEl.getAttribute('id'), attribute, value);

            // handle some special cases for attributes (e.g. attributes set directly to the THREE.js object);
            // default is to let aframe handle attributes directly
            switch (attribute) {
                // Defer until physics is loaded. If it never loads...trigger load??
                case 'static-body':
                case 'dynamic-body':
                    ARENA.events.addEventListener(ARENA_EVENTS.PHYSICS_LOADED, () => {
                        if (value === null) {
                            // if null, remove attribute
                            entityEl.removeAttribute(attribute);
                        } else {
                            entityEl.setAttribute(attribute, value);
                        }
                    });
                    break;
                case 'rotation':
                    // rotation is set directly in the THREE.js object, for performance reasons
                    if (Object.hasOwn(value, 'w')) {
                        entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w); // has 'w' coordinate: a quaternion
                    } else {
                        entityEl.object3D.rotation.set(
                            THREE.MathUtils.degToRad(value.x),
                            THREE.MathUtils.degToRad(value.y),
                            THREE.MathUtils.degToRad(value.z)
                        ); // otherwise its a rotation given in degrees
                    }
                    break;
                case 'position':
                    // position is set directly in the THREE.js object, for performance reasons
                    entityEl.object3D.position.set(value.x, value.y, value.z);
                    break;
                case 'color':
                    if (!Object.hasOwn(entityEl, 'text')) {
                        entityEl.setAttribute('material', 'color', value);
                    } else {
                        entityEl.setAttribute('text', 'color', value);
                    }
                    break;
                case 'scale':
                    // scale is set directly in the THREE.js object, for performance reasons
                    entityEl.object3D.scale.set(value.x, value.y, value.z);
                    break;
                case 'ttl':
                    // ttl is applied to property 'seconds' of ttl component
                    entityEl.setAttribute('ttl', { seconds: value });
                    break;
                case 'src':
                case 'url':
                    // replace dropbox links in any 'src'/'url' attributes that get here
                    entityEl.setAttribute(attribute, ARENAUtils.crossOriginDropboxSrc(value));
                    break;
                default:
                    // all other attributes are pushed directly to aframe
                    if (value === null) {
                        // if null, remove attribute
                        entityEl.removeAttribute(attribute);
                    } else {
                        // replace dropbox links in any url or src attribute inside value
                        /* eslint-disable no-param-reassign */
                        if (Object.hasOwn(value, 'src')) value.src = ARENAUtils.crossOriginDropboxSrc(value.src);
                        if (Object.hasOwn(value, 'url')) value.url = ARENAUtils.crossOriginDropboxSrc(value.url);
                        entityEl.setAttribute(attribute, value);
                    }
            } // switch attribute
        });
    }

    /**
     * Camera override handler
     * @param {int} action message action
     * @param {object} message message to be parsed
     */
    static handleCameraOverride(action, message) {
        if (action !== ACTIONS.UPDATE) return; // camera override must be an update

        const myCamera = document.getElementById('my-camera');

        if (message.data.object_type === 'camera') {
            // camera override
            if (!myCamera) {
                error('camera override', 'local camera object does not exist! (create camera before)');
                return;
            }
            const {
                data: { position, rotation },
            } = message;

            const target = document.getElementById(ARENA.params.camFollow);
            if (target) {
                ARENAUtils.relocateUserCamera(undefined, undefined, target.object3D.matrixWorld);
            } else {
                ARENAUtils.relocateUserCamera(position, rotation);
            }
        } else if (message.data.object_type === 'look-at') {
            // Note: this only makes sense when not in webxr session
            if (!myCamera) {
                cameraLookAtError('local camera object does not exist! (create camera before)');
                return;
            }

            let { target } = message.data;
            if (!Object.hasOwn(target, 'x')) {
                // check if an object id was given
                const targetObj = document.getElementById(target);
                if (targetObj) {
                    target = targetObj.object3D.position; // will be processed as x, y, z below
                } else {
                    cameraLookAtError('target not found.');
                    return;
                }
            }

            // x, y, z given
            if (Object.hasOwn(target, 'x') && Object.hasOwn(target, 'y') && Object.hasOwn(target, 'z')) {
                const cameraPos = myCamera.object3D.position;
                myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2(
                    cameraPos.x - target.x,
                    cameraPos.z - target.z
                );
                myCamera.components['look-controls'].pitchObject.rotation.x = Math.atan2(
                    target.y - cameraPos.y,
                    Math.sqrt((cameraPos.x - target.x) ** 2 + (cameraPos.z - target.z) ** 2)
                );
                cameraLookAtWarn(message);
            }
        } else if (message.data.object_type === 'teleport-to-landmark') {
            const { landmarkObj } = message.data;
            if (landmarkObj) {
                const landmarkContainer = document.getElementById(`lmList_${landmarkObj}`);
                if (landmarkContainer) {
                    landmarkContainer.children[0]?.children[0]?.click();
                }
            }
        }
    }
}
