/* global AFRAME, ARENA */

import {
    ARENAUtils,
} from '../utils.js';

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
        fps: { // A-Frame stats, Frames rendered in the last second.
            default: 0,
        },
        raf: { // A-Frame stats, Milliseconds needed to render a frame. (latency)
            default: 0,
        },
    },

    init: function() {
        this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);

        if (!this.data.enabled) {
            this.el.sceneEl.removeBehavior(this);
            return;
        }
        this.el.sceneEl.setAttribute('stats', '');
    },

    update: function() {
    },

    tick: function(time, timeDelta) {
        if (!this.rafDiv) {
            this.rafDiv = document.querySelector('.rs-counter-base:nth-child(1) .rs-counter-value');
            return;
        }
        this.raf = parseFloat(this.rafDiv.innerHTML, 10);

        if (!this.fpsDiv) {
            this.fpsDiv = document.querySelector('.rs-counter-base:nth-child(2) .rs-counter-value');
            return;
        }
        this.fps = parseFloat(this.fpsDiv.innerHTML, 10);

        if (ARENA.confstats) {
            if (ARENA && ARENA.Jitsi && ARENA.chat && ARENA.chat.settings) {
                ARENAUtils.debug(({
                    jitsiStats: {
                        arenaId: ARENA.idTag, // ARENA local participant id
                        jitsiId: ARENA.Jitsi.jitsiId, // Jitsi local participant id
                        renderFps: this.fps,
                        requestAnimationFrame: this.raf,
                        stats: ARENA.chat.settings.stats, // Jitsi LOCAL_STATS_UPDATED result
                    },
                }));
            }
        }
    },
});
