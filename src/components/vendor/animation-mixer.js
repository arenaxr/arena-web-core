/**
 * @fileoverview Monkeypatch of animation-mixer, to better track animation ends
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/* global AFRAME, THREE */

const LoopMode = {
    once: THREE.LoopOnce,
    repeat: THREE.LoopRepeat,
    pingpong: THREE.LoopPingPong
};

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

AFRAME.components['animation-mixer'].Component.prototype.playAction = function() {
    if (!this.mixer) return;

    const model = this.model,
        data = this.data,
        clips = model.animations || (model.geometry || {}).animations || [];

    if (!clips.length) return;

    const re = wildcardToRegExp(data.clip);

    for (let clip, i = 0; (clip = clips[i]); i++) {
        if (clip.name.match(re)) {
            const action = this.mixer.clipAction(clip, model);

            action.enabled = true;
            action.clampWhenFinished = data.clampWhenFinished;
            if (data.duration) action.setDuration(data.duration);
            if (data.timeScale !== 1) action.setEffectiveTimeScale(data.timeScale);
            action
            .setLoop(LoopMode[data.loop], data.repetitions)
            .fadeIn(data.crossFadeDuration)
            .play();
            this.activeActions.push(action);
            // this.mixer.setTime(data.startFrame / 1000);
        }
    }
}

/**
 * Creates a RegExp from the given string, converting asterisks to .* expressions,
 * and escaping all other characters.
 */
function wildcardToRegExp(s) {
    return new RegExp('^' + s.split(/\*+/).map(regExpEscape).join('.*') + '$');
}

/**
 * RegExp-escapes all characters in the given string.
 */
function regExpEscape(s) {
    return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}
