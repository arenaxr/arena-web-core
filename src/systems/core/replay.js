/**
 * @fileoverview ARENA 3D Replay System - read-only playback of recorded scenes.
 *
 * This system is part of the main ARENA bundle. When 'arena-replay' attribute is
 * present on the a-scene, the core ARENA systems (arena-scene, arena-mqtt, arena-jitsi)
 * skip their initialization, leaving this system to handle scene rendering via
 * the shared CreateUpdate/Delete handlers.
 */

import axios from 'axios';
import { CreateUpdate, Delete } from './message-actions/index';

// The Replay System
AFRAME.registerSystem('arena-replay', {
    init: function () {
        // Only initialize when replay mode is explicitly enabled on the scene
        if (!this.el.hasAttribute('arena-replay')) return;

        console.log('ARENA 3D Replay System Initialized');
        console.log('[Replay] sceneRoot:', !!document.getElementById('sceneRoot'));
        console.log('[Replay] CreateUpdate:', typeof CreateUpdate?.handle);

        this.messages = [];
        this.playhead = 0;
        this.isPlaying = false;

        this.setupUI();
        this.fetchRecordingsList().then(() => {
            const params = new URLSearchParams(window.location.search);
            const recordingFilename = params.get('recording');
            if (recordingFilename) {
                const select = document.getElementById('recordingSelect');
                if (select) select.value = recordingFilename;
                this.fetchReplayData(recordingFilename);
            }
        });
    },

    setupUI: function() {
        const playBtn = document.getElementById('playBtn');
        const timeline = document.getElementById('timeline');
        const recordingSelect = document.getElementById('recordingSelect');

        if (!playBtn || !timeline || !recordingSelect) return;

        playBtn.addEventListener('click', () => {
            if (this.messages.length > 0) {
                this.isPlaying = !this.isPlaying;
                if (this.isPlaying) {
                    this.lastTickTime = performance.now();
                }
            }
        });

        timeline.addEventListener('input', (e) => {
            const pct = e.target.value / 100;
            if (this.messages.length > 0) {
                const targetTime = pct * this.duration;
                let targetIdx = 0;
                for (let i = 0; i < this.messages.length; i++) {
                    if (this.messages[i].timeOffset >= targetTime) {
                        targetIdx = i;
                        break;
                    }
                }
                if (targetIdx === 0 && targetTime > 0) targetIdx = this.messages.length - 1;

                this.playhead = targetIdx;
                this.fastForwardTo(this.playhead);
            }
        });

        recordingSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.fetchReplayData(e.target.value);
            }
        });
    },

    fetchRecordingsList: async function() {
        try {
            const res = await axios.get('/recorder/list', { withCredentials: true });
            const select = document.getElementById('recordingSelect');
            if (res.data && res.data.length > 0) {
                res.data.forEach(rec => {
                    const opt = document.createElement('option');
                    opt.value = rec.filename;
                    const date = new Date(parseInt(rec.timestamp) * 1000).toLocaleString();
                    opt.text = `${rec.name} (${date})`;
                    select.appendChild(opt);
                });
            }
        } catch(e) {
            console.error("[Replay] Failed to fetch recordings list", e);
        }
    },

    fetchReplayData: async function(filename) {
        this.isPlaying = false;
        this.messages = [];
        this.playhead = 0;
        this.playheadTime = 0;
        this.duration = 0;
        this.lastTickTime = 0;
        document.getElementById('timeline').value = 0;

        try {
            const res = await axios.get(`/recorder/files/${filename}`, { withCredentials: true });
            let rawData = typeof res.data === 'string' ? res.data.split('\n').filter(l => l.trim()).map(JSON.parse) : res.data;

            this.messages = rawData.filter(m => m.timestamp);

            if (this.messages.length > 0) {
                const startT = new Date(this.messages[0].timestamp).getTime();
                this.messages.forEach(m => {
                    // Legacy compatibility: map 'attributes' (MongoDB schema) to 'data' (MQTT wire)
                    if (m.attributes && !m.data) {
                        m.data = m.attributes;
                        delete m.attributes;
                    }
                    m.timeOffset = new Date(m.timestamp).getTime() - startT;
                });
                this.duration = this.messages[this.messages.length - 1].timeOffset;
            }

            console.log(`[Replay] Loaded ${this.messages.length} frames, duration: ${this.duration}ms`);
            this.updateTimeDisplay();

            // Find the end of the persist snapshot (all messages with timeOffset === 0)
            // These are the initial scene objects dumped from arena-persist at recording start
            let persistEndIdx = 0;
            for (let i = 0; i < this.messages.length; i++) {
                if (this.messages[i].timeOffset === 0) {
                    persistEndIdx = i;
                } else {
                    break;
                }
            }
            console.log(`[Replay] Persist snapshot: ${persistEndIdx + 1} objects`);

            // Bootstrap the scene with the full persist snapshot
            this.fastForwardTo(persistEndIdx);
        } catch(e) {
            console.error("[Replay] Failed to fetch replay data", e);
        }
    },

    /**
     * Apply a single recorded message to the scene using the shared CreateUpdate/Delete handlers.
     * These handlers are the same ones used by the live ARENA client, ensuring rendering parity.
     */
    applyMessage: function(msg) {
        if (!msg.object_id || !msg.data) return;

        // Clone message to avoid modifying the timeline history cache
        const clone = JSON.parse(JSON.stringify(msg));
        clone.id = clone.object_id;
        delete clone.object_id;

        // Ensure 'type' defaults to 'object' if not set
        if (!clone.type) {
            clone.type = 'object';
        }

        try {
            if (clone.action === 'delete') {
                Delete.handle(clone);
            } else if (clone.action === 'create' || clone.action === 'update') {
                CreateUpdate.handle(clone.action, clone);
            }
        } catch(e) {
            console.warn('[Replay] applyMessage error for', clone.id, ':', e.message);
        }
    },

    fastForwardTo: function(targetIndex) {
        // Clear scene objects (keep camera rig and environment)
        const sceneRoot = document.getElementById('sceneRoot');

        if (sceneRoot) {
            const children = Array.from(sceneRoot.children);
            children.forEach(child => {
                if (child.id !== 'cameraRig' && child.id !== 'cameraSpinner' && child.id !== 'my-camera' && child.id !== 'env') {
                    sceneRoot.removeChild(child);
                }
            });
        } else {
            console.warn('[Replay] sceneRoot not found, clearing scene-level entities');
            const scene = document.querySelector('a-scene');
            if (scene) {
                Array.from(scene.querySelectorAll(':scope > a-entity')).forEach(child => {
                    if (!['cameraRig', 'cameraSpinner', 'my-camera', 'env', 'sceneRoot'].includes(child.id)) {
                        child.parentNode.removeChild(child);
                    }
                });
            }
        }

        console.log(`[Replay] Seeking to index ${targetIndex}`);
        for (let i = 0; i <= targetIndex; i++) {
            if (i < this.messages.length) {
                this.applyMessage(this.messages[i]);
            }
        }

        if (this.messages[targetIndex]) {
            this.playheadTime = this.messages[targetIndex].timeOffset;
        }
        this.updateTimeDisplay();
    },

    formatTime: function(msOffset) {
        if (!this.messages || this.messages.length === 0) return "--:--:--";
        try {
            const startT = new Date(this.messages[0].timestamp).getTime();
            const date = new Date(startT + msOffset);
            if (isNaN(date.getTime())) return "--:--:--";
            return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
        } catch(e) {
            return "--:--:--";
        }
    },

    updateTimeDisplay: function() {
        const timeDisplay = document.getElementById('timeDisplay');
        const timeline = document.getElementById('timeline');

        if (timeDisplay) {
            timeDisplay.textContent = `${this.formatTime(this.playheadTime || 0)} / ${this.formatTime(this.duration || 0)}`;
        }
        if (timeline && this.duration > 0) {
            timeline.value = ((this.playheadTime || 0) / this.duration) * 100;
        }
    },

    tick: function (time, timeDelta) {
        if (!this.isPlaying || !this.messages || this.messages.length === 0) return;

        const now = performance.now();
        const delta = now - this.lastTickTime;
        this.lastTickTime = now;

        this.playheadTime += delta;

        while (this.playhead < this.messages.length && this.messages[this.playhead].timeOffset <= this.playheadTime) {
            this.applyMessage(this.messages[this.playhead]);
            this.playhead++;
        }

        this.updateTimeDisplay();

        if (this.playhead >= this.messages.length) {
            this.isPlaying = false;
        }
    }
});

// Attach system to scene and set default environment when loaded via replay page
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene && scene.hasAttribute('arena-replay')) {
        // Set default environment for lighting and ground plane (matches ARENA default)
        scene.setAttribute('environment', 'preset: default; seed: 1');
    }
});
