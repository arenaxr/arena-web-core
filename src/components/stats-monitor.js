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
            type: 'boolean', default: true,
        },
        fps: { // A-Frame stats, Frames rendered in the last second.
            type: 'number', default: 0,
        },
        raf: { // A-Frame stats, Milliseconds needed to render a frame. (latency)
            type: 'number', default: 0,
        },
        totalJSHeapSize: { // The total allocated heap size, in bytes. (Chrome/Edge only)
            type: 'number', default: 0,
        },
        usedJSHeapSize: { // The currently active segment of JS heap, in bytes. (Chrome/Edge only)
            type: 'number', default: 0,
        },
    },

    init: function() {
        const data = this.data;
        const el = this.el;
        const sceneEl = el.sceneEl;

        this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);

        if (!data.enabled) {
            sceneEl.removeBehavior(this);
            return;
        }
        sceneEl.setAttribute('stats', '');
    },

    tick: function(time, timeDelta) {
        const data = this.data;
        const el = this.el;
        const sceneEl = el.sceneEl;

        const chat = sceneEl.components['arena-chat-ui'];

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

        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            this.usedJSHeapSize = memory.usedJSHeapSize;
            this.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        }

        if (ARENA && ARENA.hudstats) {
            const camRoot = document.getElementById('my-camera');
            if (camRoot && !this.hudStatsText) {
                console.warn(camRoot);
                this.hudStatsText = document.createElement('a-text');
                this.hudStatsText.setAttribute('id', 'myStats');
                this.hudStatsText.setAttribute('position', '0 0 -1');
                this.hudStatsText.setAttribute('side', 'double');
                this.hudStatsText.setAttribute('align', 'left');
                this.hudStatsText.setAttribute('anchor', 'center');
                this.hudStatsText.setAttribute('color', '#cccccc');
                this.hudStatsText.setAttribute('scale', '0.25 0.25 0.25');
                this.hudStatsText.setAttribute('width', 2);
                camRoot.appendChild(this.hudStatsText);
            }
        }

        if (ARENA && ARENA.confstats && chat) {
            if (ARENA && ARENA.Jitsi) {
                const perfStats = {
                    jitsiStats: {
                        arenaId: ARENA.idTag,
                        jitsiId: ARENA.Jitsi.jitsiId,
                        renderFps: this.fps,
                        requestAnimationFrame: this.raf,
                        stats: chat.settings.stats,
                    },
                };
                if (window.performance && window.performance.memory) {
                    perfStats.jitsiStats.usedJSHeapSize = this.usedJSHeapSize;
                    perfStats.jitsiStats.jsHeapSizeLimit = this.jsHeapSizeLimit;
                }
                ARENAUtils.debug(perfStats);
            }
        }

        if (ARENA && ARENA.hudstats && this.hudStatsText) {
            const pctHeap = Math.trunc(this.usedJSHeapSize / this.jsHeapSizeLimit * 100).toFixed(0);
            let str = `[Browser]\nPlatform: ${navigator.platform}\nVersion: ${navigator.appVersion}\nFPS: ${this.fps}\nRAF: ${this.raf}\nUsed Heap: ${this.usedJSHeapSize} (${pctHeap}%)\nMax Heap: ${this.jsHeapSizeLimit}`;
            if (ARENA && ARENA.Jitsi && chat) {
                str += `\n\n[Jitsi]\n${chat.getConnectionText(ARENA.getDisplayName(), chat.settings.stats)}`;
            }
            this.hudStatsText.setAttribute('value', str);
        }
    },
});
