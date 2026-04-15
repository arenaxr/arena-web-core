/**
 * @fileoverview ARENA 3D Replay System - read-only playback of recorded scenes.
 *
 * This system is part of the main ARENA bundle. When 'arena-replay' attribute is
 * present on the a-scene, the core ARENA systems (arena-scene, arena-mqtt, arena-jitsi)
 * skip their initialization, leaving this system to handle scene rendering via
 * the shared CreateUpdate/Delete handlers.
 */

/* global ARENAAUTH */

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
        this.keyframes = [];
        this.currentState = {}; // tracks what's currently rendered in the DOM
        this.playhead = 0;
        this.isPlaying = false;

        this.setupUI();

        const loadRecordings = () => {
            this.fetchRecordingsList().then(() => {
                const params = new URLSearchParams(window.location.search);
                const namespace = params.get('namespace');
                const sceneId = params.get('sceneId');
                const session = params.get('session');
                
                let recordingFilename = params.get('recording');
                if (namespace && sceneId && session) {
                    recordingFilename = `${namespace}~${sceneId}~${session}.jsonl`;
                }

                if (recordingFilename) {
                    const select = document.getElementById('recordingSelect');
                    if (select) select.value = recordingFilename;

                    // Refresh JWT with scene-specific subs rights before fetching
                    const sceneAuth = (namespace && sceneId)
                        ? ARENAAUTH.refreshSceneAuth(`${namespace}/${sceneId}`)
                        : Promise.resolve();
                    sceneAuth.then(() => this.fetchReplayData(recordingFilename));
                }
            });
        };

        if (window.ARENAAUTH && window.ARENAAUTH.mqtt_token) {
            loadRecordings();
        } else {
            window.addEventListener('onauth', loadRecordings, { once: true });
        }
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
                    if (this.messages[i].timeOffset <= targetTime) {
                        targetIdx = i;
                    } else {
                        break;
                    }
                }

                this.playhead = targetIdx;
                this.fastForwardTo(this.playhead);
            }
        });

        recordingSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const newUrl = new URL(window.location.href);

            if (val) {
                let namespace, sceneId, session;
                const parts = val.replace('.jsonl', '').split('~');
                if (parts.length === 3) {
                    namespace = parts[0];
                    sceneId = parts[1];
                    session = parts[2];
                }

                if (namespace && sceneId && session) {
                    newUrl.searchParams.set('namespace', namespace);
                    newUrl.searchParams.set('sceneId', sceneId);
                    newUrl.searchParams.set('session', session);
                    newUrl.searchParams.delete('recording');
                }
                window.history.replaceState({}, '', newUrl);

                // Refresh JWT with scene-specific subs rights before fetching
                const sceneAuth = (namespace && sceneId)
                    ? ARENAAUTH.refreshSceneAuth(`${namespace}/${sceneId}`)
                    : Promise.resolve();
                sceneAuth.then(() => this.fetchReplayData(val));
            } else {
                newUrl.searchParams.delete('namespace');
                newUrl.searchParams.delete('sceneId');
                newUrl.searchParams.delete('session');
                newUrl.searchParams.delete('recording');
                window.history.replaceState({}, '', newUrl);
                this.clearScene();
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
            console.warn("[Replay] Failed to fetch Recordings list, service may be unavailable.", e);
            const select = document.getElementById('recordingSelect');
            if (select) {
                const opt = document.createElement('option');
                opt.text = "⚠️ Recorder service unavailable";
                opt.value = "";
                // Do not disable option in case they need to clear it back out
                select.appendChild(opt);
                select.value = "";
            }
        }
    },

    clearScene: function() {
        this.isPlaying = false;
        this.messages = [];
        this.keyframes = [];
        this.currentState = {};
        this.playhead = 0;
        this.playheadTime = 0;
        this.duration = 0;
        this.lastTickTime = 0;
        const timeline = document.getElementById('timeline');
        if (timeline) timeline.value = 0;
        this.updateTimeDisplay();

        const sceneRoot = document.getElementById('sceneRoot');
        const scene = document.querySelector('a-scene');

        if (sceneRoot) {
            let envObj = document.getElementById('env');
            if (envObj) {
                // Completely remove the old one to avoid state leakage in the complex environment component
                sceneRoot.removeChild(envObj);
            }
            envObj = document.createElement('a-entity');
            envObj.id = 'env';
            envObj.setAttribute('environment', 'preset: default; seed: 1', true);
            sceneRoot.appendChild(envObj);
        }

        if (sceneRoot) {
            Array.from(sceneRoot.children).forEach(child => {
                if (!['cameraRig', 'cameraSpinner', 'my-camera', 'env'].includes(child.id)) {
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
    },

    fetchReplayData: async function(filename) {
        this.clearScene();

        try {
            const res = await axios.get(`/recorder/files/${filename}`, { withCredentials: true });
            let rawData = typeof res.data === 'string' ? res.data.split('\n').filter(l => l.trim()).map(JSON.parse) : res.data;

            // Extract keyframe_index if present (last line of cleanly-closed recordings)
            if (rawData.length > 0 && rawData[rawData.length - 1].action === 'keyframe_index') {
                const idxLine = rawData.pop();
                console.log(`[Replay] Found keyframe index with ${idxLine.index.length} entries`);
            }

            // Separate keyframes from delta messages.
            // Keyframes are stored separately for fast seeking; only delta messages
            // (create/update/delete) remain in the main messages array.
            this.keyframes = [];
            this.messages = [];
            for (const m of rawData) {
                if (m.action === 'keyframe') {
                    this.keyframes.push({
                        messageIndex: this.messages.length,
                        timestamp: m.timestamp,
                        state: m.state,
                    });
                } else {
                    // Legacy compatibility: map 'attributes' (MongoDB schema) to 'data' (MQTT wire)
                    if (m.attributes && !m.data) {
                        m.data = m.attributes;
                        delete m.attributes;
                    }
                    if (m.timestamp) {
                        this.messages.push(m);
                    }
                }
            }

            if (this.messages.length > 0) {
                const startT = new Date(this.messages[0].timestamp).getTime();
                this.messages.forEach(m => {
                    m.timeOffset = new Date(m.timestamp).getTime() - startT;
                });
                // Compute timeOffset for keyframes as well
                this.keyframes.forEach(kf => {
                    kf.timeOffset = new Date(kf.timestamp).getTime() - startT;
                });
                this.duration = this.messages[this.messages.length - 1].timeOffset;
            }

            console.log(`[Replay] Loaded ${this.messages.length} delta messages, ${this.keyframes.length} keyframes, duration: ${this.duration}ms`);
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

            // When keyframes are present, the first keyframe already captures the persist
            // snapshot as a compacted state map — applyKeyframeState handles topo-sort internally.
            // The legacy topo-sort and scene-options hoisting are only needed for old recordings.
            if (this.keyframes.length === 0) {
                // Topological sort the persist snapshot to ensure parents are created before children
                const snapshot = this.messages.slice(0, persistEndIdx + 1);
                const orderedSnapshot = [];
                const snapshotMap = new Map(snapshot.map(m => [m.object_id, m]));

                const addMsg = (msg, descendants = []) => {
                    if (!snapshotMap.has(msg.object_id)) return;
                    const parent = msg.data?.parent;
                    if (parent && snapshotMap.has(parent)) {
                        if (descendants.includes(parent) || msg.object_id === parent) {
                            console.warn('[Replay] Circular reference detected in snapshot for', msg.object_id);
                        } else {
                            addMsg(snapshotMap.get(parent), [...descendants, msg.object_id]);
                        }
                    }
                    orderedSnapshot.push(msg);
                    snapshotMap.delete(msg.object_id);
                };

                while (snapshotMap.size > 0) {
                    const [id, msg] = snapshotMap.entries().next().value;
                    addMsg(msg);
                }

                for (let i = 0; i <= persistEndIdx; i++) {
                    this.messages[i] = orderedSnapshot[i];
                }

                // Ensure scene-options geometry is processed first so environment/lighting exists
                for (let i = 0; i <= persistEndIdx; i++) {
                    if (this.messages[i].type === 'scene-options') {
                        const sceneOpt = this.messages.splice(i, 1)[0];
                        this.messages.unshift(sceneOpt);
                        break;
                    }
                }
            }

            console.log(`[Replay] Persist snapshot: ${persistEndIdx + 1} objects`);

            // Bootstrap the scene with the full persist snapshot
            this.fastForwardTo(persistEndIdx);
        } catch(e) {
            console.warn('[Replay] Failed to fetch replay data, service may be unavailable.', e);
        }
    },

    /**
     * Apply a single recorded message to the scene using the shared CreateUpdate/Delete handlers.
     * These handlers are the same ones used by the live ARENA client, ensuring rendering parity.
     */
    applyMessage: function(msg) {
        if (!msg.object_id || !msg.data) return;
        // Skip keyframe meta-actions — these are handled separately by applyKeyframeState
        if (msg.action === 'keyframe' || msg.action === 'keyframe_index') return;

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

    /**
     * Topologically sort a set of objects so parents are created before children.
     * Input: plain object { object_id: obj, ... }. Returns: ordered array of objects.
     */
    topoSortObjects: function(stateObj) {
        const entries = Object.entries(stateObj);
        const stateMap = new Map(entries.map(([id, obj]) => [id, obj]));
        const ordered = [];

        const add = (objId, visited = new Set()) => {
            if (!stateMap.has(objId) || visited.has(objId)) return;
            visited.add(objId);
            const obj = stateMap.get(objId);
            const parent = obj.data?.parent;
            if (parent && stateMap.has(parent) && parent !== objId) {
                add(parent, visited);
            }
            ordered.push(obj);
            stateMap.delete(objId);
        };

        for (const [objId] of entries) {
            add(objId);
        }
        return ordered;
    },

    /**
     * Diff the target state against the currently rendered state and apply
     * only the necessary DOM changes: delete removed objects, create new ones,
     * and update changed ones. This avoids the visual flash of a full scene clear
     * and preserves cached models/components for unchanged objects.
     *
     * Objects with time-sensitive components (animations, particles, sounds) are
     * force-recreated (delete → create) since their internal state won't reset
     * with a simple attribute update.
     */
    diffAndApplyState: function(targetState) {
        // Components with internal timers/state that require a full recreate on seek
        const RECREATE_COMPONENTS = ['animation', 'animation-mixer', 'sound', 'particle', 'blip'];

        const currentIds = new Set(Object.keys(this.currentState));
        const targetIds = new Set(Object.keys(targetState));

        // 1. Delete objects that exist in current scene but not in target
        for (const id of currentIds) {
            if (!targetIds.has(id)) {
                this.applyMessage({ object_id: id, action: 'delete', data: {} });
            }
        }

        // 2. Separate new objects (need create + topo sort) from existing
        const toCreate = {};
        for (const [id, obj] of Object.entries(targetState)) {
            if (!currentIds.has(id)) {
                toCreate[id] = obj;
            } else {
                // Check if this object has time-sensitive components that need a full recreate
                const needsRecreate = obj.data && RECREATE_COMPONENTS.some(c => c in obj.data);
                if (needsRecreate) {
                    this.applyMessage({ object_id: id, action: 'delete', data: {} });
                    toCreate[id] = obj;
                } else {
                    // Safe to update in place — preserves cached models, textures, etc.
                    this.applyMessage({ ...obj, action: 'update' });
                }
            }
        }

        // 3. Create new objects in parent-first order
        const ordered = this.topoSortObjects(toCreate);
        for (const obj of ordered) {
            this.applyMessage({ ...obj, action: 'create' });
        }

        // Track what's now rendered
        this.currentState = targetState;
    },

    /**
     * Recursively merge src into dst. Maps are merged recursively;
     * arrays and primitives are overwritten. Matches the Go recorder's deepMerge semantics.
     *
     * Optimized for ARENA's data shape: all values are plain JSON (no Date, RegExp,
     * Symbol, or prototype chains). We skip cloning src values since message objects
     * are already independent (parsed from JSON wire data).
     */
    deepMerge: function(dst, src) {
        if (!dst || typeof dst !== 'object' || Array.isArray(dst)) return src;
        if (!src || typeof src !== 'object' || Array.isArray(src)) return src;
        const result = { ...dst };
        const keys = Object.keys(src);
        for (let i = 0, len = keys.length; i < len; ++i) {
            const key = keys[i];
            const sv = src[key];
            // Recurse only when both sides are non-null plain objects (not arrays)
            if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
                const dv = result[key];
                result[key] = (dv && typeof dv === 'object' && !Array.isArray(dv))
                    ? this.deepMerge(dv, sv)
                    : sv;
            } else {
                result[key] = sv;
            }
        }
        return result;
    },

    /**
     * Build a compacted state map from a range of delta messages by applying
     * create/update/delete operations in memory without touching the DOM.
     * Returns a plain object: { object_id: compacted_object, ... }
     */
    compactMessages: function(startIdx, endIdx, initialState = {}) {
        const state = {};
        // Deep-copy initial state so we don't mutate keyframe caches
        for (const [id, obj] of Object.entries(initialState)) {
            state[id] = JSON.parse(JSON.stringify(obj));
        }

        for (let i = startIdx; i <= endIdx && i < this.messages.length; i++) {
            const msg = this.messages[i];
            const objId = msg.object_id;
            if (!objId) continue;

            const action = msg.action;
            if (action === 'delete') {
                delete state[objId];
            } else if (action === 'create' || action === 'update') {
                state[objId] = this.deepMerge(state[objId] || {}, msg);
            }
        }
        return state;
    },

    fastForwardTo: function(targetIndex) {
        // Find the nearest keyframe at or before the target message index.
        let nearestKf = null;
        for (const kf of this.keyframes) {
            if (kf.messageIndex <= targetIndex) {
                nearestKf = kf;
            } else {
                break;
            }
        }

        // Compact all deltas into a single state map in memory (no DOM touches),
        // then diff against the current scene to apply only the changes.
        let targetState;
        if (nearestKf) {
            console.log(`[Replay] Seeking to index ${targetIndex} via keyframe at ${nearestKf.messageIndex} (${Object.keys(nearestKf.state).length} objects, ${targetIndex - nearestKf.messageIndex} deltas)`);
            targetState = this.compactMessages(nearestKf.messageIndex, targetIndex, nearestKf.state);
        } else {
            console.log(`[Replay] Seeking to index ${targetIndex} (no keyframe, compacting from 0)`);
            targetState = this.compactMessages(0, targetIndex);
        }

        this.diffAndApplyState(targetState);

        if (this.messages[targetIndex]) {
            this.playheadTime = this.messages[targetIndex].timeOffset;
        }
        this.updateTimeDisplay();
    },

    formatTime: function(msOffset) {
        if (!this.messages || this.messages.length === 0) return "--:--";
        try {
            if (isNaN(msOffset) || msOffset < 0) msOffset = 0;
            const date = new Date(msOffset);
            // Returns HH:MM:SS format based on epoch. We strip '00:' for shorter durations.
            const iso = date.toISOString().substr(11, 8);
            return iso.startsWith('00:') ? iso.substr(3) : iso; 
        } catch(e) {
            return "--:--";
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
    const sceneRoot = document.getElementById('sceneRoot');
    const scene = document.querySelector('a-scene');
    if (scene && sceneRoot && scene.hasAttribute('arena-replay')) {
        // Set default environment for lighting and ground plane (matches ARENA default)
        let envObj = document.getElementById('env');
        if (envObj) {
            sceneRoot.removeChild(envObj);
        }
        envObj = document.createElement('a-entity');
        envObj.id = 'env';
        envObj.setAttribute('environment', 'preset: default; seed: 1', true);
        sceneRoot.appendChild(envObj);
    }
});
