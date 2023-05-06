/* global AFRAME, ARENA */

import {ARENAUtils} from '../utils.js';

/**
 * @fileoverview Component to monitor client-performance: fps, memory, etc, and relay to MQTT debug channel if enabled.
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
    },

    multiple: false,

    init: function() {
        const data = this.data;
        const el = this.el;
        const sceneEl = el.sceneEl;

        this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);

        this.registerListeners();
        if (!data.enabled) {
            sceneEl.removeBehavior(this);
            return;
        }
        sceneEl.setAttribute('stats', '');
    },

    update: function(oldData) {
        if (this.data && !oldData) {
            this.registerListeners();
        } else if (!this.data && oldData) {
            this.unregisterListeners();
        }
    },

    remove: function() {
        this.unregisterListeners();
    },

    registerListeners: function() {
        // ARENA.events.on(ARENAEventEmitter.events.JITSI_STATS_LOCAL, this.jitsiStatsLocalCallback.bind(this));
    },

    unregisterListeners: function() {
        // ARENA.events.off(ARENAEventEmitter.events.JITSI_STATS_LOCAL, this.jitsiStatsLocalCallback.bind(this));
    },

    /**
     * Called when Jitsi local stats are updated, used to save local status for stats-monitor.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiStatsLocalCallback: function(e) {
        this.callStats = e.detail.stats;
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

        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            this.usedJSHeapSize = memory.usedJSHeapSize;
            this.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        }

        // format HUD
        if (ARENA && ARENA.params.hudstats) {
            const camRoot = document.getElementById('my-camera');
            if (camRoot && !this.hudStatsText) {
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

        // publish to mqtt debug channel the stats
        if (ARENA && ARENA.params.confstats) {
            if (ARENA && ARENA.Jitsi) {
                const perfStats = {
                    jitsiStats: {
                        arenaId: ARENA.idTag,
                        jitsiId: ARENA.Jitsi.jitsiId,
                        renderFps: this.fps,
                        requestAnimationFrame: this.raf,
                        stats: this.callStats,
                    },
                };
                if (window.performance && window.performance.memory) {
                    perfStats.jitsiStats.usedJSHeapSize = this.usedJSHeapSize;
                    perfStats.jitsiStats.jsHeapSizeLimit = this.jsHeapSizeLimit;
                }
                ARENAUtils.debug(perfStats);
            }
        }

        // display the stats on the HUD
        if (ARENA && ARENA.params.hudstats && this.hudStatsText) {
            const pctHeap = Math.trunc((this.usedJSHeapSize / this.jsHeapSizeLimit) * 100).toFixed(0);
            let str = `[Browser]\nPlatform: ${navigator.platform}\nVersion: ${navigator.appVersion}\nFPS: ${this.fps}\nRAF: ${this.raf}\nUsed Heap: ${this.usedJSHeapSize} (${pctHeap}%)\nMax Heap: ${this.jsHeapSizeLimit}`;
            if (ARENA && ARENA.Jitsi && this.callStats) {
                str += `\n\n[Jitsi]\n${ARENA.Jitsi.getConnectionText(
                    ARENA.displayName,
                    { conn: this.callStats },
                    null
                )}`;
            }
            this.hudStatsText.setAttribute('value', str);
        }
    },
});
