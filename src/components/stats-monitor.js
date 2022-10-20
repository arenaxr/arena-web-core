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
        totalJSHeapSize: { // The total allocated heap size, in bytes. (Chrome/Edge only)
            default: 0,
        },
        usedJSHeapSize: { // The currently active segment of JS heap, in bytes. (Chrome/Edge only)
            default: 0,
        },
    },

    init: function() {
        //this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);

        if (!this.data.enabled) {
            this.el.sceneEl.removeBehavior(this);
            return;
        }
        this.el.sceneEl.setAttribute('stats', '');
    },

    update: function() {},

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


        const camRoot = document.getElementById('my-camera');
        if (camRoot && !this.hudStatsText){
            console.warn(camRoot)
            this.hudStatsText = document.createElement('a-text');
            this.hudStatsText.setAttribute('id', 'myStats');
            this.hudStatsText.setAttribute('position', '0 0 -1');
            this.hudStatsText.setAttribute('scale', '0.5 0.5 0.5');
            this.hudStatsText.setAttribute('side', 'double');
            this.hudStatsText.setAttribute('align', 'left');
            this.hudStatsText.setAttribute('anchor', 'center');
            this.hudStatsText.setAttribute('color', '#cccccc');
            this.hudStatsText.setAttribute('width', 3);
            camRoot.appendChild(this.hudStatsText);
        }

        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            this.usedJSHeapSize = memory.usedJSHeapSize;
            this.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        }

        if (this.hudStatsText){
            const pctHeap =  Math.trunc(this.usedJSHeapSize / this.jsHeapSizeLimit / 100).toFixed(1);
            this.hudStatsText.setAttribute('value', `fps: ${this.fps}\nraf: ${this.raf}\nused heap: ${this.usedJSHeapSize} (${pctHeap}%)\nmax heap: ${this.jsHeapSizeLimit}`);
        }

        if (ARENA.confstats) {
            if (ARENA && ARENA.Jitsi && ARENA.chat && ARENA.chat.settings) {
                const perfStats = {
                    jitsiStats: {
                        arenaId: ARENA.idTag,
                        jitsiId: ARENA.Jitsi.jitsiId,
                        renderFps: this.fps,
                        requestAnimationFrame: this.raf,
                        stats: ARENA.chat.settings.stats,
                    },
                };
                if (window.performance && window.performance.memory) {
                    perfStats.jitsiStats.usedJSHeapSize = this.usedJSHeapSize;
                    perfStats.jitsiStats.jsHeapSizeLimit = this.jsHeapSizeLimit;
                }
                ARENAUtils.debug(perfStats);
            }
        }
    },
});
