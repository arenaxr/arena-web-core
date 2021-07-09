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
 * @property {string} [displayName] - ARENA or Jitsi display name of the video source; Will be ignored if jitsiId is given. IMPORTANT: editing this property requires reload 
 *
 */
AFRAME.registerComponent('jitsi-video', {
    schema: {
        jitsiId: {type: 'string', default: undefined},
        displayName: {type: 'string', default: undefined},
    },
    init: function() {
        const el = this.el;
        ARENA.events.on(ARENAEventEmitter.events.JITSI_CONNECT, (e) => this.jitsiConnect(e.detail));
        ARENA.events.on(ARENAEventEmitter.events.USER_JOINED, (e) => this.jitsiNewUser(e.detail));
    },
    update: function(oldData) {
        const data = this.data;
        if (!data) return;
        if (data.jitsiId !== oldData.jitsiId) {
            this.updateVideo();
        }
        if (data.displayName !== oldData.displayName) {
            this.updateVideo(); // note: user will need to enter the conference again
        }        
    },
    jitsiConnect: function(args) {
        if (this.data.jitsiId !== undefined) {
            this.updateVideo();
            return;
        }
        if (this.data.displayName === undefined) return;
        args.pl.forEach((user) => {
            if (user.dn === this.data.displayName) {
                this.data.jitsiId = user.jid;
                this.updateVideo();
                return;
            }
        });
    },
    jitsiNewUser: function(user) {
        if (this.data.displayName === undefined) return;
        if (user.dn === this.data.displayName) {
            this.data.jitsiId = user.jid;
            this.updateVideo();
        }
    },
    updateVideo: function() {
        const data = this.data;
        if (!data) return;        
        if (!data.jitsiId) return;
        if (!ARENA.Jitsi) {
            this.retryWaitVideoLoad();
            return;
        }
        this.videoID = `video${data.jitsiId}`;
        if (!ARENA.Jitsi.getVideoTrack(data.jitsiId)) {
            this.retryWaitVideoLoad();
            return;
        }
        const jitsiVideo = document.getElementById(this.videoID);
        if (!jitsiVideo) {
            this.retryWaitVideoLoad();
            return;
        }
        let _this = this;
        jitsiVideo.onloadeddata = function() {
            console.log('src', `#${_this.videoID}`);
            _this.el.setAttribute('material','src', `#${_this.videoID}`); // video only! (no audio)
            _this.el.setAttribute('material', 'shader', 'flat');
            _this.el.setAttribute('material-extras', 'encoding', 'sRGBEncoding');
            _this.el.setAttribute('material-extras', 'needsUpdate', 'true');
        };        
    },
    retryWaitVideoLoad: function() {
        setTimeout(async () => {
            this.updateVideo();
        }, 1000); // try again in a bit
    }
});
