/**
 * @fileoverview Component to monitor client-performance: fps, memory, etc, and relay to MQTT debug channel if enabled.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA */
import { ARENAUtils } from '../../utils';
import { JITSI_EVENTS } from '../../constants';

AFRAME.registerComponent('stats-monitor', {
    schema: {
        enabled: {
            type: 'boolean',
            default: true,
        },
    },

    multiple: false,

    init() {
        const { data, el } = this;

        const { sceneEl } = el;

        this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);

        this.jitsiStatsLocalCallback = this.jitsiStatsLocalCallback.bind(this);

        this.registerListeners();
        if (!data.enabled) {
            sceneEl.removeBehavior(this);
            return;
        }
        sceneEl.setAttribute('stats', '');
    },

    update(oldData) {
        if (this.data && !oldData) {
            this.registerListeners();
        } else if (!this.data && oldData) {
            this.unregisterListeners();
        }
    },

    remove() {
        this.unregisterListeners();
    },

    registerListeners() {
        const { el } = this;

        const { sceneEl } = el;

        sceneEl.addEventListener(JITSI_EVENTS.STATS_LOCAL, this.jitsiStatsLocalCallback);
    },

    unregisterListeners() {
        const { el } = this;

        const { sceneEl } = el;

        sceneEl.removeEventListener(JITSI_EVENTS.STATS_LOCAL, this.jitsiStatsLocalCallback);
    },

    /**
     * Called when Jitsi local stats are updated, used to save local status for stats-monitor.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiStatsLocalCallback(e) {
        this.callStats = e.detail.stats;
    },

    tick() {
        this.raf = this.el.sceneEl.components.stats?.stats('rAF')?.value() ?? 0;
        this.fps = this.el.sceneEl.components.stats?.stats('FPS')?.value() ?? 0;

        if (window.performance && window.performance.memory) {
            const { memory } = window.performance;
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
            if (ARENA && ARENA.jitsi) {
                const perfStats = {
                    jitsiStats: {
                        arenaId: ARENA.idTag,
                        jitsiId: ARENA.jitsi.jitsiId,
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
            let str = `
            [Browser]\nPlatform: ${navigator.platform}\nVersion: ${navigator.appVersion}\nFPS: ${this.fps}\n
            RAF: ${this.raf}\nUsed Heap: ${this.usedJSHeapSize} (${pctHeap}%)\nMax Heap: ${this.jsHeapSizeLimit}
            `;
            if (ARENA && ARENA.jitsi && this.callStats) {
                str += `\n\n[Jitsi]\n${ARENA.jitsi.getConnectionText(
                    ARENA.displayName,
                    { conn: this.callStats },
                    null
                )}`;
            }
            this.hudStatsText.setAttribute('value', str);
        }
    },
});
