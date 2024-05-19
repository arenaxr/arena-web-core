/* global AFRAME, THREE */
import { XacroLoader } from 'xacro-parser';
import URDFLoader from '../vendor/urdf-loader/URDFLoader';

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
        //TODO: think this will have an issue if we change between xacro and urdf on the same object
        if (this.data.url.endsWith('.xacro')) {
            this.loader = new XacroLoader(this.manager);
        } else {
            this.loader = new URDFLoader(this.manager);
        }        
        this.model = null;
    },

    update(oldData) {
        const self = this;
        const { el } = this;
        const { url } = this.data;

        if (!url) {
            return;
        }

        if (oldData.url !== url) {
            self.remove();

            // register with model-progress system to handle model loading events
            document.querySelector('a-scene').systems['model-progress'].registerModel(el, url);

            if (self.data.url.endsWith('.xacro')) {
                self.loader.load(
                    url,
                    (xml) => {
                        const urdfLoader = new URDFLoader();
                        self.model = urdfLoader.parse(xml);
                        self.modelLoaded();
                    },
                    (err) => {
                        console.error('xacro err', err);
                    }
                );
            } else {
                self.loader.load(url, (urdfModel) => {                    
                    self.model = urdfModel;
                    self.modelLoaded();
                });
            }

            self.manager.onProgress = function (url, itemsLoaded, itemsTotal) {
                el.emit('model-progress', { url, progress: (itemsLoaded / itemsTotal) * 100 });
            };

            self.manager.onError = (url) => {
                console.warn(`Failed to load urdf model: ${url}`);
                el.emit('model-error', { format: 'urdf', src: url });
            };
        } else if (AFRAME.utils.deepEqual(oldData.joints, self.data.joints) == false) this.updateJoints();
    },

    modelLoaded() {
        const { el } = this;
        el.setObject3D('mesh', this.model);
        el.emit('model-loaded', { format: 'urdf', src: this.data });
        this.updateJoints();
    },

    updateJoints() {
        if (!this.model || !this.model.joints) {
            return;
        }
        const joints = this.data.joints ? this.data.joints : {};

        // set joints, if given
        for (const [key, value] of Object.entries(joints)) {
            if (this.model.joints[key]) this.model.joints[key].setJointValue(THREE.MathUtils.degToRad(value));
        }
    },

    remove() {
        if (!this.model) {
            return;
        }
        this.el.removeObject3D('mesh');
    },
});
