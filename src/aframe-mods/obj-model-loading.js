/**
 * @fileoverview Emit model onProgress (loading) event for obj models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

const warn = AFRAME.utils.debug('components:obj-model:warn');

// AFRAME Monkeypatch (src/components/obj-model.js)
AFRAME.components['obj-model'].Component.prototype.loadObj = function loadObj(objUrl, mtlUrl) {
    const self = this;
    const { el } = this;
    const { mtlLoader } = this;
    const { objLoader } = this;
    const rendererSystem = this.el.sceneEl.systems.renderer;
    const BASE_PATH = mtlUrl.substr(0, mtlUrl.lastIndexOf('/') + 1);

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, mtlUrl || objUrl);

    if (mtlUrl) {
        // .OBJ with an .MTL.
        if (el.hasAttribute('material')) {
            warn('Material component properties are ignored when a .MTL is provided');
        }

        mtlLoader.setResourcePath(BASE_PATH);
        mtlLoader.load(
            mtlUrl,
            (materials) => {
                materials.preload();
                objLoader.setMaterials(materials);
                objLoader.load(objUrl, (objModel) => {
                    self.model = objModel;
                    self.model.traverse((object) => {
                        if (object.isMesh) {
                            const { material } = object;
                            if (material.map) rendererSystem.applyColorCorrection(material.map);
                            if (material.emissiveMap) rendererSystem.applyColorCorrection(material.emissiveMap);
                        }
                    });
                    el.setObject3D('mesh', objModel);
                    el.emit('model-loaded', { format: 'obj', model: objModel });
                });
            },
            (xhr) => {
                el.emit('model-progress', { objUrl, loaded: xhr.loaded, total: xhr.total });
            },
            (error) => {
                const message = error && error.message ? error.message : 'Failed to load OBJ model';
                console.error(message);
                el.emit('model-error', { format: 'obj', objUrl });
            }
        );
        return;
    }

    // .OBJ only.
    objLoader.load(
        objUrl,
        (objModel) => {
            self.model = objModel;
            self.applyMaterial();
            el.setObject3D('mesh', objModel);
            el.emit('model-loaded', { format: 'obj', model: objModel });
        },
        (xhr) => {
            el.emit('model-progress', { objUrl, loaded: xhr.loaded, total: xhr.total });
        },
        (error) => {
            const message = error && error.message ? error.message : 'Failed to load OBJ model';
            console.error(message);
            el.emit('model-error', { format: 'obj', objUrl });
        }
    );
};
