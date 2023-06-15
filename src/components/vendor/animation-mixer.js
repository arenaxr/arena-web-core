/**
 * @fileoverview Monkeypatch of animation-mixer, to better track animation ends
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/* global AFRAME, THREE */

AFRAME.components['animation-mixer'].Component.prototype.load = function(model) {
    const el = this.el;
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.mixer.addEventListener('loop', (e) => {
        el.emit('animation-loop', {action: e.action, loopDelta: e.loopDelta});
    });
    this.mixer.addEventListener('finished', (e) => {
        el.emit('animation-finished', {action: e.action, direction: e.direction});
        const thisAction = this.activeActions.indexOf(e.action);
        if (thisAction > -1) {
            this.activeActions.splice(thisAction, 1);
            if (!this.activeActions.length) {
                this.el.removeAttribute('animation-mixer');
            }
        }
    });
    if (this.data.clip) this.update({});
};
