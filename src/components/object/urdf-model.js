/* global AFRAME */
import URDFLoader from '../vendor/urdf-loader/URDFLoader.js';

/**
 * @fileoverview Load URDF models
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Load URDF models using urdf-loader example.
 *
 * @example <caption>Set joint values (in degrees) in the form "JointName1: ValueInDegrees1, JointName2: ValueInDegrees2, ...". Example: </caption>
 *   "HP1:30, KP1:120, AP1:-60, HP2:30, KP2:120, AP2:-60, HP3:30, KP3:120, AP3:-60, HP4:30, KP4:120, AP4:-60, HP5:30, KP5:120, AP5:-60, HP6:30, KP6:120, AP6:-60"
 * @module pcd-model
 * @property {string} url - the model URL
 * @property {string} joints - dictionary with joints values (degrees), in the form "JointName1: ValueInDegrees1, JointName2: ValueInDegrees2, ..." (see example)
 */
AFRAME.registerComponent('urdf-model', {
    schema: {
        url: { type: 'string' },
        joints: {
            default: '',
            // Deserialize joints in the form J1:V1,J2:V2, ...
            // attempts to deal with some input malforms, such as missing { }, or 'J1=V1,J2=V2', ...
            parse(value) {
                if (typeof value === 'object') {
                    return value;
                } // return value if already an object
                if (value.length == 0) {
                    return {};
                }
                // remove space; replace equal for ":"
                value = value.replace(/ /g, '').replace(/=/g, ': ').trim();
                // handle keys with no quotes; fails on values with colons
                value = value.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');
                try {
                    return JSON.parse(value);
                } catch (SyntaxError) {
                    // attempt to add "{ ... }"
                    return JSON.parse(`{ ${value} }`);
                }
            },
            // Serialize object
            stringify(data) {
                return JSON.stringify(data);
            },
        },
    },
    init() {
        this.scene = this.el.sceneEl.object3D;
        this.manager = new THREE.LoadingManager();
        this.loader = new URDFLoader(this.manager);
        this.model = null;
    },

    update(oldData) {
        let self = this;
        let {el} = this;
        const {url} = this.data;

        if (!url) {
            return;
        }

        if (oldData.url !== url) {
            this.remove();

            // register with model-progress system to handle model loading events
            document.querySelector('a-scene').systems['model-progress'].registerModel(el, url);

            this.loader.load(url, (urdfModel) => {
                self.model = urdfModel;
            });

            self.manager.onProgress = function (url, itemsLoaded, itemsTotal) {
                el.emit('model-progress', { url, progress: (itemsLoaded / itemsTotal) * 100 });
            };

            self.manager.onLoad = () => {
                el.setObject3D('mesh', self.model);
                el.emit('model-loaded', { format: 'urdf', model: self.model });
                this.updateJoints();
            };

            self.manager.onError = (url) => {
                warn(`Failed to load urdf model: ${url}`);
                el.emit('model-error', { format: 'urfd', src: url });
            };
        } else if (AFRAME.utils.deepEqual(oldData.joints, this.data.joints) == false) this.updateJoints();
    },
    updateJoints() {
        if (!this.model) {
            return;
        }
        const joints = this.data.joints ? this.data.joints : {};

        // set joints, if given
        for (const [key, value] of Object.entries(joints)) {
            this.model.joints[key].setJointValue(THREE.MathUtils.degToRad(value));
        }
    },
    remove() {
        if (!this.model) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
