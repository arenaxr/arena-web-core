import {Logger} from './logger.js';
import {Parser} from './parser.js';
import {GLTFProgress} from './gltf-progress.js';

/**
 * Create object handler
 */
export class Create {
    /**
     * Create handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        if (message.type === 'scene-options') {
            return; // don't create another env
        }
        if (message.type === 'face-features') {
            return; // ignore face features
        }

        const sceneEl = document.querySelector('a-scene');
        const result = Parser.parse('create', message);
        if (result === undefined) return;

        const name = result.name;
        if (name === ARENA.camName) {
            this.handleCameraOverride(message);
            return;
        }

        let x; let y; let z;
        let xrot; let yrot; let zrot; let wrot;
        let xscale; let yscale; let zscale;
        let color;

        // Strategy: remove JSON for core attributes (position, rotation, color, scale) after parsing
        // what remains are attribute-value pairs that can be set iteratively
        if (message.data.position) {
            x = message.data.position.x;
            y = message.data.position.y;
            z = message.data.position.z;
            delete message.data.position;
        } else { // useful defaults if unspecified
            x = 0;
            y = 0;
            z = 0;
        }

        if (message.data.rotation) {
            xrot = message.data.rotation.x;
            yrot = message.data.rotation.y;
            zrot = message.data.rotation.z;
            wrot = message.data.rotation.w;
            delete message.data.rotation;
        } else { // useful defaults
            xrot = 0;
            yrot = 0;
            zrot = 0;
            wrot = 1;
        }

        if (message.data.scale) {
            xscale = message.data.scale.x;
            yscale = message.data.scale.y;
            zscale = message.data.scale.z;
            delete message.data.scale;
        } else { // useful defaults
            xscale = 1;
            yscale = 1;
            zscale = 1;
        }

        if (message.data.color) {
            color = message.data.color;
            delete message.data.color;
        } else {
            color = 'white';
        }

        let type = message.data.object_type;
        delete message.data.object_type;

        if (type === 'cube') { // different name in Unity
            type = 'box';
        }
        if (type === 'quad') { // also different
            type = 'plane';
        }

        let entityEl = document.getElementById(message.object_id);
        // Reduce, reuse, recycle!
        if (entityEl) {
            entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
        } else { // CREATE NEW SCENE OBJECT
            entityEl = document.createElement('a-entity');
            entityEl.setAttribute('id', name);

            // wacky idea: force render order
            entityEl.object3D.renderOrder = 1;

            if (type === 'viveLeft' || type === 'viveRight') {
                entityEl.setAttribute('rotation.order', 'YXZ');

                if (type === 'viveLeft') {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_left.gltf)');
                } else {
                    entityEl.setAttribute('gltf-model', 'url(models/valve_index_right.gltf)');
                }

                entityEl.object3D.position.set(x, y, z);
                entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);

                sceneEl.appendChild(entityEl);
            } else if (type === 'camera') {
                entityEl.setAttribute('arena-user', 'color', color);
                sceneEl.appendChild(entityEl);
            } else {
                entityEl.setAttribute('rotation.order', 'YXZ');

                // Parent/Child handling
                if (message.data.parent) {
                    const parentEl = document.getElementById(message.data.parent);
                    if (parentEl) {
                        entityEl.flushToDOM();
                        parentEl.appendChild(entityEl);
                    } else {
                        Logger.warn('create', 'Orphaned:', `${name} cannot find parent: ${message.data.parent}!`);
                    }
                } else {
                    sceneEl.appendChild(entityEl);
                }
            }

            if (message.ttl !== undefined) { // Allow falsy value of 0
                entityEl.setAttribute('ttl', {seconds: message.ttl});
            }
        }

        switch (type) {
        case 'headtext':
            // handle changes to other users head text
            if (message.hasOwnProperty('displayName')) {
                entityEl.setAttribute('arena-user', 'displayName', message.displayName); // update head text
            }
            return;

        case 'camera':
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

        case 'viveLeft':
            break;
        case 'viveRight':
            break;

        case 'light':
            entityEl.setAttribute('light', 'type', 'ambient');
            entityEl.setAttribute('light', 'color', color); // does this work for light a-entities?
            break;

        case 'line':
            entityEl.setAttribute('line', message.data);
            entityEl.setAttribute('line', 'color', color);
            break;

        case 'thickline':
            entityEl.setAttribute('meshline', message.data);
            entityEl.setAttribute('meshline', 'color', color);
            delete message.data.thickline;
            break;

        case 'particle':
            entityEl.setAttribute('particle-system', message.data);
            break;

        case 'gltf-model':
            entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
            entityEl.setAttribute('gltf-model', message.data.url);

            entityEl.addEventListener('model-progress', (evt) => {
                GLTFProgress.updateProgress(false, evt);
            });
            entityEl.addEventListener('model-error', (evt) => {
                GLTFProgress.updateProgress(true, evt);
            });

            delete message.data.url;
            break;

        case 'image': // use special 'url' data slot for bitmap URL (like gltf-models do)
            entityEl.setAttribute('geometry', 'primitive', 'plane');
            entityEl.setAttribute('material', 'src', message.data.url);
            entityEl.setAttribute('material', 'shader', 'flat');
            entityEl.object3D.scale.set(xscale, yscale, zscale);

            delete message.data.url;
            break;

        case 'text':
            // set a bunch of defaults
            entityEl.setAttribute('text', 'width', 5); // the default for <a-text>
            // Support legacy `data: { text: 'STRING TEXT' }`
            const theText = message.data.text;
            if (typeof theText === 'string' || theText instanceof String) {
                entityEl.setAttribute('text', 'value', message.data.text);
                delete message.data.text;
            }
            entityEl.setAttribute('text', 'color', color);
            entityEl.setAttribute('text', 'side', 'double');
            entityEl.setAttribute('text', 'align', 'center');
            entityEl.setAttribute('text', 'anchor', 'center');
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            break;

        default:
            // handle arbitrary A-Frame geometry primitive types
            if (type) entityEl.setAttribute('geometry', 'primitive', type);
            entityEl.object3D.scale.set(xscale, yscale, zscale);
            if (color) entityEl.setAttribute('material', 'color', color);
            break;
        } // switch(type)

        if (type !== 'line' && type !== 'thickline') {
            // Common for all but lines: set position & rotation
            entityEl.object3D.position.set(x, y, z);
            entityEl.object3D.quaternion.set(xrot, yrot, zrot, wrot);
        }

        // what remains are attributes for special cases; iteratively set them
        const entries = Object.entries(message.data);
        const len = entries.length;
        for (let i = 0; i < len; i++) {
            const attr = entries[i][0]; // attribute
            const val = entries[i][1]; // value
            entityEl.setAttribute(attr, val);
        }
    }

    /**
     * Create handler
     * @param {object} message message to be parsed
     */
    static handleCameraOverride(message) {
        const myCamera = document.getElementById('my-camera');
        // check if it is a command for the local camera
        if (message.type === 'camera-override') {
            if (message.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                Logger.error('camera override', 'object_type must be camera.');
                return;
            }
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
        } else if (message.type === 'look-at') {
            if (message.data.object_type !== 'camera') { // object_id of was camera given; should be a camera
                Logger.error('camera look-at', 'object_type must be camera.');
                return;
            }
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
                myCamera.components['look-controls'].yawObject.lookAt( target.x, target.y, target.z);
                myCamera.components['look-controls'].pitchObject.lookAt( target.x, target.y, target.z);
            }
        }
    }
}
