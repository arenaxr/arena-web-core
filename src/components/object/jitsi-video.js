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
 *
 */
AFRAME.registerComponent('jitsi-video', {
    schema: {
        jitsiId: { type: 'string', default: '' },
        displayName: { type: 'string', default: '' },
    },

    init() {
        ARENA.events.addEventListener(ARENA_EVENTS.JITSI_LOADED, this.ready.bind(this));
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.onJitsiConnect = this.onJitsiConnect.bind(this);
        this.onJitsiNewUser = this.onJitsiNewUser.bind(this);
        this.onJitsiUserLeft = this.onJitsiUserLeft.bind(this);

        sceneEl.addEventListener(JITSI_EVENTS.CONNECTED, this.onJitsiConnect);
        sceneEl.addEventListener(JITSI_EVENTS.USER_JOINED, this.onJitsiNewUser);
        sceneEl.addEventListener(JITSI_EVENTS.USER_LEFT, this.onJitsiUserLeft);
    },

    update(oldData) {
        const { data } = this;
        if (!data) return;

        if (data.jitsiId !== oldData.jitsiId) {
            this.updateVideo();
        }

        if (data.displayName !== oldData.displayName) {
            this.updateVideo(); // user will need to enter the conference again
        }
    },

    onJitsiConnect(e) {
        const args = e.detail;
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
        args.pl.forEach((user) => {
            if (user.dn === this.data.displayName) {
                this.data.jitsiId = user.jid;
                this.updateVideo();
            }
        });

        this.updateVideo();
    },

    onJitsiNewUser(e) {
        const user = e.detail;
        if (this.data.displayName === '') return;

        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.updateVideo();
        }
    },

    onJitsiUserLeft(e) {
        if (e.detail.jid === this.data.jitsiId) {
            this.el.removeAttribute('material', 'src');
        }
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

        if (jitsiVideo.readyState === 4) {
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            return;
        }

        // if not loaded yet, try to wait
        this.retryWaitVideoLoad();
    },

    retryWaitVideoLoad() {
        setTimeout(async () => {
            this.updateVideo();
        }, 500); // try again in a bit
    },
});
