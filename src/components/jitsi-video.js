/* global AFRAME */
import {ARENAEventEmitter} from '../event-emitter.js';

/**
 * @fileoverview Apply a jitsi video to a geometry
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

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
        jitsiId: {type: 'string', default: ''},
        displayName: {type: 'string', default: ''},
    },
    init: function() {
        const el = this.el;

        ARENA.events.on(ARENAEventEmitter.events.JITSI_CONNECT, (e) => this.jitsiConnect(e.detail));
        ARENA.events.on(ARENAEventEmitter.events.USER_JOINED, (e) => this.jitsiNewUser(e.detail));
        ARENA.events.on(ARENAEventEmitter.events.USER_LEFT, (e) => this.jitsiUserLeft(e.detail));
    },
    update: function(oldData) {
        const data = this.data;
        if (!data) return;
        if (data.jitsiId !== oldData.jitsiId) {
            this.updateVideo();
        }
        if (data.displayName !== oldData.displayName) {
            this.updateVideo(); // user will need to enter the conference again
        }
    },
    jitsiConnect: function(args) {
        if (this.data.jitsiId !== '') {
            this.updateVideo();
            return;
        }
        if (this.data.displayName === '') return;
        // check local video first
        if (ARENA.Jitsi && ARENA.getDisplayName() === this.data.displayName) {
            this.data.jitsiId = ARENA.Jitsi.getJitsiId();
            this.updateVideo();
            return;
        }
        // check remote video
        args.pl.forEach((user) => {
            if (user.dn === this.data.displayName) {
                this.data.jitsiId = user.jid;
                this.updateVideo();
                return;
            }
        });
        this.updateVideo();
    },
    jitsiNewUser: function(user) {
        if (this.data.displayName === '') return;
        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.updateVideo();
        }
    },
    jitsiUserLeft: function(details) {
        if (details.jid === this.data.jitsiId) {
            this.el.removeAttribute('material', 'src');
        }
    },
    setVideoSrc: function() {
        const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
        if (pano) {
            this.el.setAttribute('src', `#${this.videoID}`); // video only! (no audio)
            // ensure panoramic videospheres have max download resolution
            const users = document.querySelectorAll('[arena-user]');
            users.forEach((user) => {
                const data = user.components['arena-user'].data;
                if (data.jitsiId === this.data.jitsiId) {
                    data.pano = pano;
                }
            });
        } else {
            this.el.setAttribute('material', 'src', `#${this.videoID}`); // video only! (no audio)
            this.el.setAttribute('material-extras', 'encoding', 'sRGBEncoding');
            this.el.setAttribute('material-extras', 'needsUpdate', 'true');
        }
        this.el.setAttribute('material', 'shader', 'flat');
    },
    updateVideo: function() {
        const data = this.data;
        if (!data) return;
        if (!data.jitsiId) {
            return;
        }
        if (!ARENA.Jitsi) {
            return;
        }

        if (ARENA.Jitsi.getJitsiId() === data.jitsiId) {
            const pano = this.el.tagName.toLowerCase() === 'a-videosphere';
            if (pano) {
                // ensure panoramic videosphere local has max upload resolution, update local tracks
                ARENA.Jitsi.pano = pano;
                ARENA.Jitsi.avConnect();
            }
            this.videoID = 'cornerVideo';
        } else {
            this.videoID = `video${data.jitsiId}`;
            if (!ARENA.Jitsi.getVideoTrack(data.jitsiId)) {
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
        if (jitsiVideo.readyState == 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            return;
        }
        // if not loaded yet, try to wait
        this.retryWaitVideoLoad();
    },
    retryWaitVideoLoad: function() {
        setTimeout(async () => {
            this.updateVideo();
        }, 500); // try again in a bit
    },
});
