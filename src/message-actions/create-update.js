import {Logger} from './logger.js';
import {GLTFProgress} from '../gltf-progress/';

// handle actions
const ACTIONS = {
    CREATE: 'create',
    UPDATE: 'update'
}

// path to controler models
const viveControllerPath = { 
    viveLeft: 'store/models/valve_index_left.gltf',
    viveRight: 'store/models/valve_index_left.gltf'
};

/**
 * Create/Update object handler
 */
export class CreateUpdate {

   /**
     * Create/Update handler
     * @param {int} action action to carry out; one of: ACTIONS.CREATE, ACTIONS.UPDATE
     * @param {object} message message to be parsed
     */
    static handle(action, message) {
        const id = message.id;

        switch (message.type) {

            case 'object': 
                // our own camera/controllers: bail, this message is meant for all other viewers
                if (id === ARENA.camName) {
                    return;
                }
                if (id === ARENA.viveLName) {
                    return;
                }
                if (id === ARENA.viveRName) {
                    return;
                }
                if (id === ARENA.faceName) {
                    return;
                }
                
                let entityEl = document.getElementById(id);

                if (action === ACTIONS.CREATE) { 
                    // delete object, if exists; ensures create clears all properties
                    if (entityEl) {
                        const parentEl = entityEl.parentEl;
                        if (parentEl) {
                            parentEl.removeChild(entityEl);
                        } else {
                            Logger.error('create', `Could not find parent of object_id "${id}" to clear object properties.`);
                        }
                        entityEl = undefined;
                    }
                } else if (action === ACTIONS.UPDATE) {
                    // warn that update to non-existing object will create it
                    if (!entityEl) {
                        Logger.warning('update', `Object with object_id "${id}" does not exist; Creating...`);
                    }    
                }

                // create entity, if does not exist
                let addObj = false;
                if (!entityEl) {
                    // create object
                    entityEl = document.createElement('a-entity');
                    entityEl.setAttribute('id', id);
                    // after setting object attributes, we will add it to the scene
                    addObj = true;
                }

                // handle attributes of object
                this.updateObject(entityEl, message);

                // add object to the scene after setting all attributes
                if (addObj) {
                    // Parent/Child handling
                    const sceneEl = document.querySelector('a-scene');
                    if (message.data.parent) {
                        const parentEl = document.getElementById(message.data.parent);
                        if (parentEl) {
                            entityEl.flushToDOM();
                            parentEl.appendChild(entityEl);
                        } else {
                            Logger.warning('create', 'Orphaned:', `${name} cannot find parent: ${message.data.parent}!`);
                        }
                    } else {
                        sceneEl.appendChild(entityEl);
                    }
                    
                    // special case for vive controllers; add gltf model on creation
                    if (message.data.object_type === 'viveLeft' || message.data.object_type === 'viveRight') {
                        entityEl.setAttribute('gltf-model', viveControllerPath[message.data.object_type]);
                    }
                }

                return;

            case 'camera-override': 
                handleCameraOverride(message);
                return;

            case 'rig':                
                if (id === ARENA.camName) { // our camera Rig
                    const entityEl = document.getElementById('CameraRig');

                    this.updateObject(entityEl, message);
                }
                return;

            default: 
                Logger.warning((action === ACTIONS.UPDATE) ? 'update':'create', 'Ignored:', JSON.stringify(message));
        }
    }

    static updateObject(entityEl, message) {

        let data = message.data;
        let type = data.object_type;
        delete data.object_type; // remove attribute so we don't set it later 

        // handle some geometries and type special cases 
        // TODO: using components that handle these would allow to remove most of the special cases 
        switch (type) {
            case 'headtext':
                // handle changes to other users head text
                if (message.hasOwnProperty('displayName')) {
                    entityEl.setAttribute('arena-user', 'displayName', message.displayName); // update head text
                }
                break; 
            case 'camera':
                if (data.hasOwnProperty('color')) {
                    entityEl.setAttribute('arena-user', 'color', data.color);
                }
                // decide if we need draw or delete videoCube around head
                if (message.hasOwnProperty('jitsiId')) {
                    entityEl.setAttribute('arena-user', 'jitsiId', message.jitsiId);
                    entityEl.setAttribute('arena-user', 'hasVideo', message.hasVideo);
                    entityEl.setAttribute('arena-user', 'hasAudio', message.hasAudio);
                }
                if (message.hasOwnProperty('displayName')) {
                    entityEl.setAttribute('arena-user', 'displayName', message.displayName); // update head text
                }
                break;
            case 'gltf-model':
                // gltf-model from data.url
                if (data.hasOwnProperty('url')) {
                    entityEl.setAttribute('gltf-model', data.url);
                }
                // add load event listners
                entityEl.addEventListener('model-progress', (evt) => {
                    GLTFProgress.updateProgress(false, evt);
                });
                entityEl.addEventListener('model-error', (evt) => {
                    GLTFProgress.updateProgress(true, evt);
                });

                delete data.url; // remove attribute so we don't set it later
                break;
            case 'thickline':
                // rename thickline to meshline (the actual component that deals with thicklines)
                data.meshline = data.thickline;
                delete message.data.thickline;
                break;                
            case 'image': 
                // image is just a textured plane
                entityEl.setAttribute('geometry', 'primitive', 'plane');
                if (data.hasOwnProperty('url')) {
                    entityEl.setAttribute('material', 'src', data.url); // image src from url
                    if (!data.hasOwnProperty('material-extras')) {
                        // default images to sRGBEncoding, if not specified
                        entityEl.setAttribute('material-extras', 'encoding', 'sRGBEncoding'); 
                    }
                }
                delete data.url;
                break;
            case 'cube':
                type='box'; // arena legacy! new libraries/persist objects should use box!
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
                // handle A-Frame geometry types (custom geometries must be added above)
                // Note: we could get a list of registered geometries with Object.keys(AFRAME.geometries)
                // and support arbritrary geometries
                if (type) entityEl.setAttribute('geometry', 'primitive', type);
                break;
        } // switch(type)

        for (const [attribute, value] of Object.entries(data)) {
            //console.info("Set attribute [id attr value]:", message.id, attribute, value);
            if (attribute === 'rotation') {
                if (value.hasOwnProperty('w')) entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w); // has 'w' coordinate: a quaternion 
                else entityEl.object3D.rotation.set(value.x, value.y, value.z); // otherwise its a rotation given in radians
            } else if (attribute === 'position') {
                entityEl.object3D.position.set(value.x, value.y, value.z);
            } else if (attribute === 'ttl') {
                entityEl.setAttribute('ttl', {seconds: value});
            } else {
                if (value === null) {
                    entityEl.removeAttribute(attribute);
                } else {
                    entityEl.setAttribute(attribute, value);
                }
            }
        }
    }

    /**
     * Create handler
     * @param {object} message message to be parsed
     */
    static handleCameraOverride(message) {
        const myCamera = document.getElementById('my-camera');

        if (message.data.object_type === 'camera') { // camera override
            if (!myCamera) {
                Logger.error('camera override', 'local camera object does not exist! (create camera before)');
                return;
            }
            const p = message.data.position;
            if (p) myCamera.object3D.position.set(p.x, p.y, p.z);
            const r = message.data.rotation;
            if (r) {
                myCamera.components['look-controls'].yawObject.rotation.setFromQuaternion(
                    new THREE.Quaternion(r.x, r.y, r.z, r.w));
            }
        } else if (message.data.object_type !== 'look-at') { // camera look-at
            if (!myCamera) {
                Logger.error('camera look-at', 'local camera object does not exist! (create camera before)');
                return;
            }
            let target = message.data.target;
            if (!target.hasOwnProperty('x')) { // check if an object id was given
                const targetObj = document.getElementById(target);
                if (targetObj) target = targetObj.object3D.position; // will be processed as x, y, z below
                else {
                    Logger.error('camera look-at', 'target not found.');
                    return;
                }
            }
            // x, y, z given
            if (target.hasOwnProperty('x') &&
                target.hasOwnProperty('y') &&
                target.hasOwnProperty('z')) {
                myCamera.components['look-controls'].yawObject.lookAt( target.x, target.y, target.z );
                myCamera.components['look-controls'].pitchObject.lookAt( target.x, target.y, target.z );
            }
        }
    }
}
