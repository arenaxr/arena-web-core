/**
 * @fileoverview Apply a jitsi video to a geometry
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import { ARENA_EVENTS, JITSI_EVENTS } from '../../constants';

/**
 * Apply a jitsi video to a geometry
 * Jitsi video source can be defined using a jitsiId or (ARENA/Jitsi) display name
 * @module jitsi-video
 * @property {string} [jitsiId] - JitsiId of the video source; If defined will override displayName
 * @property {string} [displayName] - ARENA or Jitsi display name of the video source; Will be ignored if jitsiId is given. Editing this property requires reload
 * @property {number} [maxRetries=20] - Maximum number of retries to wait for video to load
 *
 */
AFRAME.registerComponent('jitsi-video', {
    schema: {
        jitsiId: { type: 'string', default: '' },
        displayName: { type: 'string', default: '' },
        maxRetries: { type: 'number', default: 20 },
    },

    init() {
        this.retryCount = 0;
        this.retryTimer = null;
        this.bridgeRequested = false;
        this.localPanoRequested = false;
        ARENA.events.addEventListener(ARENA_EVENTS.JITSI_LOADED, this.ready.bind(this));
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.onJitsiConnect = this.onJitsiConnect.bind(this);
        this.onJitsiNewUser = this.onJitsiNewUser.bind(this);
        this.onJitsiUserLeft = this.onJitsiUserLeft.bind(this);
        this.onJitsiVideoMuteChanged = this.onJitsiVideoMuteChanged.bind(this);

        ARENA.events.addEventListener(JITSI_EVENTS.CONNECTED, this.onJitsiConnect);
        sceneEl.addEventListener(JITSI_EVENTS.USER_JOINED, this.onJitsiNewUser);
        sceneEl.addEventListener(JITSI_EVENTS.USER_LEFT, this.onJitsiUserLeft);
        sceneEl.addEventListener(JITSI_EVENTS.VIDEO_MUTE_CHANGED, this.onJitsiVideoMuteChanged);
    },

    update(oldData) {
        const { data } = this;
        if (!data) return;

        if (data.jitsiId !== oldData.jitsiId) {
            this.retryCount = 0;
            this.bridgeRequested = false;
            this.localPanoRequested = false;
            this.updateVideo();
        }

        if (data.displayName !== oldData.displayName) {
            this.retryCount = 0;
            this.bridgeRequested = false;
            this.localPanoRequested = false;
            this.updateVideo(); // user will need to enter the conference again
        }
    },

    onJitsiConnect(e) {
        const args = e.detail;
        if (!args) return;
        if (this.data.jitsiId !== '') {
            this.updateVideo();
            return;
        }

        if (this.data.displayName === '') return;

        // check local video first
        if (ARENA.jitsi && ARENA.getDisplayName() === this.data.displayName) {
            this.data.jitsiId = ARENA.jitsi.getJitsiId();
            this.updateVideo();
            return;
        }

        // check remote video
        if (args.pl) {
            args.pl.forEach((user) => {
                if (user.dn === this.data.displayName) {
                    this.data.jitsiId = user.jid;
                    this.updateVideo();
                }
            });
        }

        this.updateVideo();
    },

    onJitsiNewUser(e) {
        const user = e.detail;
        if (this.data.displayName === '') return;

        // The local user owns this displayName: the local cornerVideo source is authoritative.
        // Ignore any remote participant sharing the name -- in particular a reload ghost of our
        // own previous session, which Jitsi keeps alive ~30-60s -- otherwise it overwrites jitsiId
        // and flips the videosphere onto a dead remote stream (the sphere never binds #cornerVideo
        // and stays blank until the ghost times out). onJitsiConnect handles the local binding.
        if (ARENA.jitsi && ARENA.getDisplayName() === this.data.displayName) return;

        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.retryCount = 0;
            this.bridgeRequested = false;
            this.localPanoRequested = false;
            this.updateVideo();
        }
    },

    onJitsiUserLeft(e) {
        if (e.detail.jid === this.data.jitsiId) {
            // Revert to the pre-video look so a lingering receiver doesn't freeze on the last
            // frame when the source leaves/times out (mirrors the screenshare restore).
            this.restoreObject();
            // Drop the bridge-forwarding request we added for this source (keyed by jitsiId) so it
            // doesn't linger as a stale high-res constraint on the bridge after the user leaves.
            if (ARENA.jitsi?.screenShareSourceNames?.delete(`${this.data.jitsiId}-v0`)) {
                ARENA.jitsi.applyReceiverConstraints(ARENA.jitsi.lastVideoConstraints);
            }
            this.bridgeRequested = false;
        }
    },

    onJitsiVideoMuteChanged(e) {
        if (e.detail.jid !== this.data.jitsiId) return;
        if (e.detail.muted) {
            // Source turned its camera off but stayed in the conference (no USER_LEFT fires), so
            // revert to the pristine look instead of freezing a lingering receiver on the last frame.
            this.restoreObject();
        } else {
            // Source turned its camera back on -- re-render its stream.
            this.retryCount = 0;
            this.updateVideo();
        }
    },

    /**
     * Revert the object to the pristine look captured before the video was applied, so lingering
     * receivers don't stay frozen on the last decoded frame after the source leaves or its stream
     * times out. The remote video<id> element is removed by the jitsi system on USER_LEFT, so the
     * texture would otherwise keep showing its final frame.
     */
    restoreObject() {
        const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
        // a-videosphere maps the `src` attribute to material.src; clear it so A-Frame's mapping
        // doesn't immediately re-apply the (now removed) video element.
        if (pano) this.el.removeAttribute('src');
        const restore = this.restoreState;
        if (restore && Object.keys(restore.material).length) {
            // Restoring the whole material swaps out the frozen video texture map.
            this.el.setAttribute('material', restore.material);
        } else {
            this.el.removeAttribute('material', 'src');
        }
        if (restore && !restore.hadExtras) this.el.removeAttribute('material-extras');
    },

    /**
     * Request the Jitsi bridge to forward video for this jitsiId. Videosphere sources
     * rendered on a-videosphere elements don't have their own arena-user component, so
     * they are never included in the constraints built by evaluateRemoteResolution. With
     * enableLayerSuspension active, the bridge won't forward frames for unrequested
     * endpoints, causing the video element to stay blank (the root cause of #734).
     */
    requestBridgeConstraint() {
        if (this.bridgeRequested) return;
        if (!ARENA.jitsi?.conference) return;

        const { data } = this;
        const sourceName = `${data.jitsiId}-v0`;
        const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
        const resolution = pano ? 1920 : 480;

        // Add to screenshare source names so applyReceiverConstraints always includes it
        ARENA.jitsi.screenShareSourceNames.add(sourceName);
        // Re-apply current constraints with the new source included
        ARENA.jitsi.applyReceiverConstraints(ARENA.jitsi.lastVideoConstraints);

        this.bridgeRequested = true;
        console.info(`jitsi-video: requested bridge constraint for ${sourceName} at ${resolution}p`);
    },

    setVideoSrc() {
        const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
        // Capture the object's pristine look ONCE, before we overlay the video, so a lingering
        // receiver can be reverted to it (instead of frozen on the last frame) when the source
        // leaves/times out. Mirrors the screenshare restore in jitsi.js onUserLeft. On an
        // a-videosphere the `src` attribute maps to material.src, so the pristine src lives in
        // the captured material object.
        if (!this.restoreState) {
            this.restoreState = {
                material: { ...(this.el.getAttribute('material') || {}) },
                hadExtras: this.el.hasAttribute('material-extras'),
            };
        }
        if (pano) {
            this.el.setAttribute('src', `#${this.videoID}`); // video only! (no audio)
            // ensure panoramic videospheres have max download resolution
            const users = document.querySelectorAll('[arena-user]');
            users.forEach((user) => {
                const { data } = user.components['arena-user'];
                if (data.jitsiId === this.data.jitsiId) {
                    data.pano = pano;
                    data.panoId = this.el.id;
                }
            });

            // Ensure the video element plays; autoplay alone can be blocked by the browser
            // until a user gesture. Mute so autoplay is always permitted (audio rides a
            // separate track through WebAudio/positional audio).
            const vidEl = document.getElementById(this.videoID);
            if (vidEl) {
                vidEl.muted = true;
                if (vidEl.paused) {
                    vidEl.play().catch((e) => console.warn('jitsi-video: videosphere play failed', e));
                }
            }
        } else {
            this.el.setAttribute('material', 'src', `#${this.videoID}`); // video only! (no audio)
            this.el.setAttribute('material-extras', 'colorSpace', 'SRGBColorSpace');
        }
        this.el.setAttribute('material', 'shader', 'flat');
    },

    updateVideo() {
        const { data } = this;
        if (!data) return;

        if (!data.jitsiId) {
            return;
        }

        let isLocal = false;
        if (ARENA.jitsi.getJitsiId() === data.jitsiId) {
            isLocal = true;
            const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
            if (pano && !this.localPanoRequested) {
                // Switch the local camera to high-res pano upload mode — ONCE. avConnect() rebuilds
                // and re-mutes the local track each time it runs; calling it on every 500ms poll tick
                // (below) churns cornerVideo so its readyState can never settle at 4 and the local
                // videosphere never renders. Request it a single time, then just poll for readiness.
                this.localPanoRequested = true;
                ARENA.jitsi.pano = pano;
                ARENA.jitsi.avConnect();
            }
            this.videoID = 'cornerVideo';
        } else {
            this.videoID = `video${data.jitsiId}`;
            if (!ARENA.jitsi.getVideoTrack(data.jitsiId)) {
                this.retryWaitVideoLoad();
                return;
            }
        }

        const jitsiVideo = document.getElementById(this.videoID);
        if (!jitsiVideo) {
            // if object not created yet, try to wait
            this.retryWaitVideoLoad();
            return;
        }

        if (jitsiVideo.readyState === 4) {
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            this.retryCount = 0; // success, reset for any future re-attempts
            return;
        }

        if (isLocal) {
            // Local video: avConnect() is async with high-res getUserMedia (3840x1920 for pano);
            // use simple unbounded poll matching original behavior — it always resolves
            if (this.retryTimer) clearTimeout(this.retryTimer);
            this.retryTimer = setTimeout(() => {
                this.updateVideo();
            }, 500);
        } else {
            // Remote video: use event listener for reliable, non-polling wait
            this.waitForVideoReady(jitsiVideo);
        }
    },

    /**
     * Wait for the video element to be ready using event listeners rather than polling.
     * This avoids both infinite polling loops and premature timeout issues.
     * @param {HTMLVideoElement} videoEl The video element to wait on
     */
    waitForVideoReady(videoEl) {
        // Unblock decoding before we rely on an event. An unmuted MediaStream <video> won't
        // autoplay in Firefox, so it never reaches a playable state and `canplay` never fires.
        // (jitsi.js onRemoteTrack now does this at attach too; kept here so the component is
        // self-sufficient regardless of how the element was created.)
        videoEl.muted = true; // eslint-disable-line no-param-reassign
        if (videoEl.paused) {
            videoEl.play().catch((e) => console.warn('jitsi-video: remote video play failed', e));
        }

        // If the bridge hasn't been asked to forward this source yet, request it now
        // (don't wait for retries to exhaust first — this is the main #734 fix)
        if (!this.bridgeRequested) {
            this.requestBridgeConstraint();
        }

        // Level-check FIRST: `canplay` is edge-triggered, so if the element is already playable
        // (readyState >= HAVE_FUTURE_DATA) the event has already fired and a freshly-attached
        // listener would wait forever. This is the race that left Firefox receivers blank.
        if (videoEl.readyState >= 3) {
            this.setVideoSrc();
            this.retryCount = 0;
            return;
        }

        // Remove any previous listener to avoid duplicates
        if (this._onCanPlay) {
            videoEl.removeEventListener('canplay', this._onCanPlay);
        }
        this._onCanPlay = () => {
            videoEl.removeEventListener('canplay', this._onCanPlay);
            this._onCanPlay = null;
            this.setVideoSrc();
            this.retryCount = 0;
        };
        videoEl.addEventListener('canplay', this._onCanPlay);
    },

    retryWaitVideoLoad() {
        const { data } = this;

        if (this.retryCount >= data.maxRetries) {
            // On exhaustion, request the bridge to forward this source and try once more
            if (!this.bridgeRequested) {
                console.warn(
                    `jitsi-video: retries exhausted for ${data.jitsiId}, ` +
                        `requesting bridge constraint and trying once more`
                );
                this.requestBridgeConstraint();
                this.retryCount = 0; // reset to allow a second round after bridge request
                this.retryTimer = setTimeout(() => {
                    this.updateVideo();
                }, 1000);
                return;
            }
            console.warn(
                `jitsi-video: video load failed for ${data.jitsiId} after ${data.maxRetries} retries ` +
                    `(even after bridge constraint request)`
            );
            return;
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms cap
        const delay = Math.min(500 * 2 ** this.retryCount, 4000);
        this.retryCount++;

        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        this.retryTimer = setTimeout(() => {
            this.updateVideo();
        }, delay);
    },
});
