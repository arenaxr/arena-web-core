/* global AFRAME, ARENA, ARENAUtils */

import {
    ARENAChat
} from "../chat";

/**
 * @fileoverview Component to monitor client-performance: fps, memory, etc.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.registerComponent('stats-monitor', {
    schema: {
        enabled: {
            default: true,
        },
        fps: {
            default: 0,
        },
    },

    init: function() {
        if (!this.data.enabled) {
            this.el.sceneEl.removeBehavior(this);
            return;
        }
        this.el.sceneEl.setAttribute('stats', '');

        // this.el.addEventListener(ARENAEventEmitter.events.JITSI_STATS_LOCAL, function(e) {
        ARENA.events.on(ARENAEventEmitter.events.JITSI_STATS_LOCAL, function(e) {
            console.warn('JITSI_STATS_LOCAL', e);

            if (ARENA.confstats) {
                ARENAUtils.debug(({
                    jitsiStats: {
                        arenaId: e.detail.id,
                        jitsiId: e.detail.jid,
                        renderFps: this.fps,
                        stats: e.detail.stats,
                    },
                }));
            }
        });
    },

    tick: function(t, dt) {
        if (!this.fpsDiv) {
            this.fpsDiv = document.querySelector('.rs-counter-base:nth-child(2) .rs-counter-value');
            return;
        }
        this.fps = parseFloat(this.fpsDiv.innerHTML, 10);
        // console.warn('fps', this.fps);
    },
});
