/* global AFRAME */
import URDFLoader from "../vendor/urdf-loader/URDFLoader.js";

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
 * @module pcd-model
 */

AFRAME.registerComponent("urdf-model", {
  schema: {
    src: { type: 'string' },
    url: { type: 'string' },
  },
  init: function () {
    this.scene = this.el.sceneEl.object3D;
    this.manager = new THREE.LoadingManager();
    this.loader = new URDFLoader(this.manager);
    this.model = null;
  },

  update: function () {
    var self = this;
    var el = this.el;
    const src = this.data.src ? this.data.src : this.data.url;

    if (!src) {
      return;
    }
   
    this.remove();
    
    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

    this.loader.load(src, (urdfModel) => {
      self.model = urdfModel;
    });

    self.manager.onProgress = function ( src, itemsLoaded, itemsTotal ) {
      el.emit('model-progress', { src, progress: (itemsLoaded / itemsTotal) * 100 });
    };    

    self.manager.onLoad = () => {
      el.setObject3D('mesh', self.model);
      el.emit("model-loaded", { format: "urdf", model: self.model });
    };

    self.manager.onError = (src) => {
      warn(`Failed to load urdf model: ${src}`);
      el.emit("model-error", { format: "urfd", src: src });
    };

  },
  remove: function () {
    if (!this.model) { return; }
    var entity = this.el;    
    entity.parentNode.removeChild(entity);    
  }  
});
