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

// Files larger than this are streamed in chunks via Range requests
const CHUNK_LOAD_THRESHOLD = 25 * 1024 * 1024; // 25MB
const MAX_CACHED_SEGMENTS = 5;

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

        // Chunked streaming state
        this.chunkedMode = false;
        this.fileUrl = null;
        this.fileSize = 0;
        this.segments = []; // [{startOffset, endOffset, keyframeOffset, keyframeLength, timestamp, timeOffset}, ...]
        this.segmentCache = new Map(); // segmentIdx → {keyframeState, messages}
        this.activeSegment = -1;
        this._prefetchingSegment = -1;

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
                    const sceneAuth =
                        namespace && sceneId
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

    setupUI: function () {
        const playBtn = document.getElementById('playBtn');
        const timeline = document.getElementById('timeline');
        const recordingSelect = document.getElementById('recordingSelect');

        if (!playBtn || !timeline || !recordingSelect) return;

        playBtn.addEventListener('click', () => {
            const hasData = this.chunkedMode ? this.segments.length > 0 : this.messages.length > 0;
            if (hasData) {
                this.isPlaying = !this.isPlaying;
                if (this.isPlaying) {
                    this.lastTickTime = performance.now();
                    // In chunked mode, ensure we have a segment loaded
                    if (this.chunkedMode && this.activeSegment < 0) {
                        this.seekToTime(0);
                    }
                }
            }
        });

        timeline.addEventListener('input', (e) => {
            const pct = e.target.value / 100;
            if (this.chunkedMode) {
                if (this.duration > 0) {
                    this.seekToTime(pct * this.duration);
                }
                return;
            }
            if (this.messages.length > 0) {
                const targetTime = pct * this.duration;

                // Use keyframes as scan-start hint: find the latest keyframe <= targetTime
                // and start scanning from its messageIndex instead of 0
                let targetIdx = 0;
                for (const kf of this.keyframes) {
                    if (kf.timeOffset <= targetTime) {
                        targetIdx = kf.messageIndex;
                    } else {
                        break;
                    }
                }

                for (let i = targetIdx; i < this.messages.length; i++) {
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
                const sceneAuth =
                    namespace && sceneId ? ARENAAUTH.refreshSceneAuth(`${namespace}/${sceneId}`) : Promise.resolve();
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

    fetchRecordingsList: async function () {
        try {
            const res = await axios.get('/recorder/list', { withCredentials: true });
            const select = document.getElementById('recordingSelect');
            if (res.data && res.data.length > 0) {
                res.data.forEach((rec) => {
                    const opt = document.createElement('option');
                    opt.value = rec.filename;
                    const date = new Date(parseInt(rec.timestamp) * 1000).toLocaleString();
                    opt.text = `${rec.name} (${date})`;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('[Replay] Failed to fetch Recordings list, service may be unavailable.', e);
            const select = document.getElementById('recordingSelect');
            if (select) {
                const opt = document.createElement('option');
                opt.text = '⚠️ Recorder service unavailable';
                opt.value = '';
                // Do not disable option in case they need to clear it back out
                select.appendChild(opt);
                select.value = '';
            }
        }
    },

    clearScene: function () {
        this.isPlaying = false;
        this.messages = [];
        this.keyframes = [];
        this.currentState = {};
        this.playhead = 0;
        this.playheadTime = 0;
        this.duration = 0;
        this.lastTickTime = 0;
        // Reset chunked mode state
        this.chunkedMode = false;
        this.fileUrl = null;
        this.fileSize = 0;
        this.segments = [];
        this.segmentCache = new Map();
        this.activeSegment = -1;
        this._prefetchingSegment = -1;
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
            Array.from(sceneRoot.children).forEach((child) => {
                if (!['cameraRig', 'cameraSpinner', 'my-camera', 'env'].includes(child.id)) {
                    sceneRoot.removeChild(child);
                }
            });
        } else {
            console.warn('[Replay] sceneRoot not found, clearing scene-level entities');
            const scene = document.querySelector('a-scene');
            if (scene) {
                Array.from(scene.querySelectorAll(':scope > a-entity')).forEach((child) => {
                    if (!['cameraRig', 'cameraSpinner', 'my-camera', 'env', 'sceneRoot'].includes(child.id)) {
                        child.parentNode.removeChild(child);
                    }
                });
            }
        }
    },

    fetchReplayData: async function (filename) {
        this.clearScene();
        const url = `/recorder/files/${filename}`;

        try {
            // Check file size to decide between full download and chunked streaming
            const head = await axios.head(url, { withCredentials: true });
            const fileSize = parseInt(head.headers['content-length'] || '0', 10);

            if (fileSize > CHUNK_LOAD_THRESHOLD) {
                await this.fetchChunked(url, fileSize);
            } else {
                await this.fetchFull(url);
            }
        } catch (e) {
            console.warn('[Replay] Failed to fetch replay data, service may be unavailable.', e);
        }
    },

    /**
     * Full-download path: load the entire file into memory.
     * Used for recordings under CHUNK_LOAD_THRESHOLD.
     */
    fetchFull: async function (url) {
        const res = await axios.get(url, { withCredentials: true });
        let rawData =
            typeof res.data === 'string'
                ? res.data
                      .split('\n')
                      .filter((l) => l.trim())
                      .map(JSON.parse)
                : res.data;

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
            this.messages.forEach((m) => {
                m.timeOffset = new Date(m.timestamp).getTime() - startT;
            });
            // Compute timeOffset for keyframes as well
            this.keyframes.forEach((kf) => {
                kf.timeOffset = new Date(kf.timestamp).getTime() - startT;
            });
            this.duration = this.messages[this.messages.length - 1].timeOffset;
        }

        console.log(
            `[Replay] Full load: ${this.messages.length} delta messages, ${this.keyframes.length} keyframes, duration: ${this.duration}ms`
        );
        this.updateTimeDisplay();

        // Find the end of the persist snapshot (all messages with timeOffset === 0)
        let persistEndIdx = 0;
        for (let i = 0; i < this.messages.length; i++) {
            if (this.messages[i].timeOffset === 0) {
                persistEndIdx = i;
            } else {
                break;
            }
        }

        // When keyframes are present, the first keyframe already captures the persist
        // snapshot as a compacted state map — topo-sort is handled internally.
        // The legacy topo-sort and scene-options hoisting are only needed for old recordings.
        if (this.keyframes.length === 0) {
            const snapshot = this.messages.slice(0, persistEndIdx + 1);
            const orderedSnapshot = [];
            const snapshotMap = new Map(snapshot.map((m) => [m.object_id, m]));

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

            for (let i = 0; i <= persistEndIdx; i++) {
                if (this.messages[i].type === 'scene-options') {
                    const sceneOpt = this.messages.splice(i, 1)[0];
                    this.messages.unshift(sceneOpt);
                    break;
                }
            }
        }

        console.log(`[Replay] Persist snapshot: ${persistEndIdx + 1} objects`);
        this.fastForwardTo(persistEndIdx);
    },

    // ========================================================================
    // Chunked streaming — Range-request based playback for large recordings
    // ========================================================================

    /**
     * Chunked-download path: fetch only the keyframe_index, then load segments on demand.
     * Segments are defined by consecutive keyframe entries in the index.
     */
    fetchChunked: async function (url, fileSize) {
        this.chunkedMode = true;
        this.fileUrl = url;
        this.fileSize = fileSize;

        // 1. Fetch the tail of the file to find the keyframe_index line
        const tailSize = Math.min(8192, fileSize);
        const tailRes = await axios.get(url, {
            withCredentials: true,
            headers: { Range: `bytes=${fileSize - tailSize}-${fileSize - 1}` },
            responseType: 'text',
        });

        const tailLines = tailRes.data.split('\n').filter((l) => l.trim());
        const lastLine = tailLines[tailLines.length - 1];
        let indexData;
        try {
            indexData = JSON.parse(lastLine);
        } catch (e) {
            console.warn('[Replay] Could not parse keyframe_index from file tail, falling back to full download');
            this.chunkedMode = false;
            await this.fetchFull(url);
            return;
        }

        if (indexData.action !== 'keyframe_index' || !indexData.index || indexData.index.length === 0) {
            console.warn('[Replay] No keyframe_index found, falling back to full download');
            this.chunkedMode = false;
            await this.fetchFull(url);
            return;
        }

        // 2. Build segment metadata from the keyframe index
        const idxEntries = indexData.index;
        // Byte offset where the keyframe_index line starts (everything before this is recording data)
        const dataEndOffset = fileSize - lastLine.length - 1; // -1 for the trailing newline

        const startT = new Date(idxEntries[0].timestamp).getTime();
        this.segments = [];
        for (let i = 0; i < idxEntries.length; i++) {
            const entry = idxEntries[i];
            const nextOffset = i + 1 < idxEntries.length ? idxEntries[i + 1].offset : dataEndOffset;
            this.segments.push({
                startOffset: entry.offset,
                endOffset: nextOffset - 1,
                keyframeOffset: entry.offset,
                keyframeLength: entry.length,
                timestamp: entry.timestamp,
                timeOffset: new Date(entry.timestamp).getTime() - startT,
            });
        }

        // Duration: approximate from last keyframe timestamp to recording end
        // (actual last message may be slightly later, but close enough for the timeline)
        this.duration = this.segments[this.segments.length - 1].timeOffset;
        // Try to get a better duration from the last segment's data on first load

        console.log(
            `[Replay] Chunked mode: ${fileSize} bytes, ${this.segments.length} segments, ~${Math.round(this.duration / 1000)}s`
        );
        this.updateTimeDisplay();

        // 3. Load first segment and bootstrap the scene
        await this.seekToTime(0);
    },

    /**
     * Fetch a single segment's data via HTTP Range request.
     * Parses the keyframe state and delta messages, caches the result.
     * Evicts oldest cached segment if cache exceeds MAX_CACHED_SEGMENTS.
     */
    fetchSegment: async function (segIdx) {
        if (this.segmentCache.has(segIdx)) return this.segmentCache.get(segIdx);

        const seg = this.segments[segIdx];
        const res = await axios.get(this.fileUrl, {
            withCredentials: true,
            headers: { Range: `bytes=${seg.startOffset}-${seg.endOffset}` },
            responseType: 'text',
        });

        const lines = res.data.split('\n').filter((l) => l.trim());
        let keyframeState = {};
        const messages = [];
        const startT = new Date(this.segments[0].timestamp).getTime();

        for (const line of lines) {
            try {
                const m = JSON.parse(line);
                if (m.action === 'keyframe') {
                    keyframeState = m.state;
                } else if (m.action === 'keyframe_index') {
                    continue; // shouldn't appear mid-segment, but skip if present
                } else {
                    // Legacy compatibility
                    if (m.attributes && !m.data) {
                        m.data = m.attributes;
                        delete m.attributes;
                    }
                    if (m.timestamp) {
                        m.timeOffset = new Date(m.timestamp).getTime() - startT;
                        messages.push(m);
                    }
                }
            } catch (e) {
                // Skip unparseable lines (e.g. partial writes)
            }
        }

        // Update duration if this segment's last message extends it
        if (messages.length > 0) {
            const lastTime = messages[messages.length - 1].timeOffset;
            if (lastTime > this.duration) this.duration = lastTime;
        }

        const cached = { keyframeState, messages };
        this.segmentCache.set(segIdx, cached);

        // LRU eviction: remove oldest if over limit
        if (this.segmentCache.size > MAX_CACHED_SEGMENTS) {
            const oldest = this.segmentCache.keys().next().value;
            if (oldest !== segIdx) this.segmentCache.delete(oldest);
        }

        console.log(
            `[Replay] Loaded segment ${segIdx}: ${Object.keys(keyframeState).length} objects, ${messages.length} deltas`
        );
        return cached;
    },

    /**
     * Find which segment a given timeOffset falls into.
     * Returns the segment index (linear scan over the small segments array).
     */
    getSegmentForTime: function (targetTime) {
        let segIdx = 0;
        for (let i = 0; i < this.segments.length; i++) {
            if (this.segments[i].timeOffset <= targetTime) {
                segIdx = i;
            } else {
                break;
            }
        }
        return segIdx;
    },

    /**
     * Seek to a specific time in chunked mode.
     * Loads the target segment, compacts keyframe + deltas, and applies to the scene.
     */
    seekToTime: async function (targetTime) {
        const wasPlaying = this.isPlaying;
        this.isPlaying = false; // pause during async fetch

        const segIdx = this.getSegmentForTime(targetTime);
        const cached = await this.fetchSegment(segIdx);

        // Set up active segment state so tick() can continue from here
        this.messages = cached.messages;
        this.activeSegment = segIdx;

        // Find targetIdx within this segment's messages
        let targetIdx = -1;
        for (let i = 0; i < cached.messages.length; i++) {
            if (cached.messages[i].timeOffset <= targetTime) {
                targetIdx = i;
            } else {
                break;
            }
        }

        // Compact keyframe state + deltas up to target
        const targetState =
            targetIdx >= 0
                ? this.compactMessages(0, targetIdx, cached.keyframeState)
                : this.compactMessagesFromState(cached.keyframeState);

        this.diffAndApplyState(targetState);

        this.playhead = targetIdx + 1;
        this.playheadTime = targetTime;
        this.updateTimeDisplay();

        // Prefetch adjacent segment
        this.maybePrefetch();

        if (wasPlaying) {
            this.isPlaying = true;
            this.lastTickTime = performance.now();
        }
    },

    /**
     * Clone a keyframe state as the target state when no deltas need to be applied.
     */
    compactMessagesFromState: function (keyframeState) {
        const state = {};
        for (const [id, obj] of Object.entries(keyframeState)) {
            state[id] = JSON.parse(JSON.stringify(obj));
        }
        return state;
    },

    /**
     * Prefetch the next segment in the background when the playhead is past
     * the midpoint of the current segment's time range.
     * Mirrors HLS/DASH adaptive streaming buffer strategy.
     */
    maybePrefetch: function () {
        if (!this.chunkedMode || this.activeSegment < 0) return;
        const nextIdx = this.activeSegment + 1;
        if (nextIdx >= this.segments.length) return;
        if (this.segmentCache.has(nextIdx)) return;
        if (this._prefetchingSegment === nextIdx) return;

        // Prefetch when past midpoint of current segment's time range
        const curStart = this.segments[this.activeSegment].timeOffset;
        const nextStart = this.segments[nextIdx].timeOffset;
        const midpoint = curStart + (nextStart - curStart) / 2;

        if (this.playheadTime >= midpoint) {
            this._prefetchingSegment = nextIdx;
            console.log(`[Replay] Prefetching segment ${nextIdx}`);
            this.fetchSegment(nextIdx)
                .then(() => {
                    this._prefetchingSegment = -1;
                })
                .catch(() => {
                    this._prefetchingSegment = -1;
                });
        }
    },

    /**
     * Apply a single recorded message to the scene using the shared CreateUpdate/Delete handlers.
     * These handlers are the same ones used by the live ARENA client, ensuring rendering parity.
     */
    applyMessage: function (msg) {
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
        } catch (e) {
            console.warn('[Replay] applyMessage error for', clone.id, ':', e.message);
        }
    },

    /**
     * Topologically sort a set of objects so parents are created before children.
     * Input: plain object { object_id: obj, ... }. Returns: ordered array of objects.
     */
    topoSortObjects: function (stateObj) {
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
    diffAndApplyState: function (targetState) {
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
                const needsRecreate = obj.data && RECREATE_COMPONENTS.some((c) => c in obj.data);
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
    deepMerge: function (dst, src) {
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
                result[key] = dv && typeof dv === 'object' && !Array.isArray(dv) ? this.deepMerge(dv, sv) : sv;
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
    compactMessages: function (startIdx, endIdx, initialState = {}) {
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

    fastForwardTo: function (targetIndex) {
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
            console.log(
                `[Replay] Seeking to index ${targetIndex} via keyframe at ${nearestKf.messageIndex} (${Object.keys(nearestKf.state).length} objects, ${targetIndex - nearestKf.messageIndex} deltas)`
            );
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

    formatTime: function (msOffset) {
        if ((!this.messages || this.messages.length === 0) && !this.chunkedMode) return '--:--';
        try {
            if (isNaN(msOffset) || msOffset < 0) msOffset = 0;
            const date = new Date(msOffset);
            // Returns HH:MM:SS format based on epoch. We strip '00:' for shorter durations.
            const iso = date.toISOString().substr(11, 8);
            return iso.startsWith('00:') ? iso.substr(3) : iso;
        } catch (e) {
            return '--:--';
        }
    },

    updateTimeDisplay: function () {
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

        // Chunked mode: handle segment boundary and prefetch
        if (this.chunkedMode) {
            if (this.playhead >= this.messages.length) {
                const nextSegIdx = this.activeSegment + 1;
                if (nextSegIdx < this.segments.length) {
                    if (this.segmentCache.has(nextSegIdx)) {
                        // Seamlessly advance to next segment
                        const cached = this.segmentCache.get(nextSegIdx);
                        this.messages = cached.messages;
                        this.activeSegment = nextSegIdx;
                        this.playhead = 0;
                        console.log(`[Replay] Advanced to segment ${nextSegIdx}`);
                    } else {
                        // Stall: segment not ready yet (prefetch didn't finish in time)
                        this.isPlaying = false;
                        console.log(`[Replay] Buffering segment ${nextSegIdx}...`);
                        this.fetchSegment(nextSegIdx).then(() => {
                            const cached = this.segmentCache.get(nextSegIdx);
                            this.messages = cached.messages;
                            this.activeSegment = nextSegIdx;
                            this.playhead = 0;
                            this.isPlaying = true;
                            this.lastTickTime = performance.now();
                            console.log(`[Replay] Resumed at segment ${nextSegIdx}`);
                        });
                    }
                } else {
                    // End of recording
                    this.isPlaying = false;
                }
            }
            this.maybePrefetch();
        } else if (this.playhead >= this.messages.length) {
            this.isPlaying = false;
        }

        this.updateTimeDisplay();
    },
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
