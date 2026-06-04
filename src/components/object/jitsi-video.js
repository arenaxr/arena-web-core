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
        ARENA.events.addEventListener(ARENA_EVENTS.JITSI_LOADED, this.ready.bind(this));
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.onJitsiConnect = this.onJitsiConnect.bind(this);
        this.onJitsiNewUser = this.onJitsiNewUser.bind(this);
        this.onJitsiUserLeft = this.onJitsiUserLeft.bind(this);

        ARENA.events.addEventListener(JITSI_EVENTS.CONNECTED, this.onJitsiConnect);
        sceneEl.addEventListener(JITSI_EVENTS.USER_JOINED, this.onJitsiNewUser);
        sceneEl.addEventListener(JITSI_EVENTS.USER_LEFT, this.onJitsiUserLeft);
    },

    update(oldData) {
        const { data } = this;
        if (!data) return;

        if (data.jitsiId !== oldData.jitsiId) {
            this.retryCount = 0;
            this.bridgeRequested = false;
            this.updateVideo();
        }

        if (data.displayName !== oldData.displayName) {
            this.retryCount = 0;
            this.bridgeRequested = false;
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

        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.retryCount = 0;
            this.bridgeRequested = false;
            this.updateVideo();
        }
    },

    onJitsiUserLeft(e) {
        if (e.detail.jid === this.data.jitsiId) {
            this.el.removeAttribute('material', 'src');
            this.bridgeRequested = false;
        }
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

        if (ARENA.jitsi.getJitsiId() === data.jitsiId) {
            const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
            if (pano) {
                // ensure panoramic videosphere local has max upload resolution, update local tracks
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

        // readyState >= 2 (HAVE_CURRENT_DATA) is sufficient for texture rendering;
        // previously required exactly 4 (HAVE_ENOUGH_DATA) which could miss valid frames
        if (jitsiVideo.readyState >= 2) {
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            this.retryCount = 0; // success, reset for any future re-attempts
            return;
        }

        // if not loaded yet, try to wait
        this.retryWaitVideoLoad();
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
