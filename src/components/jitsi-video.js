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
            console.log(user.dn);
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
    setVideoSrc: function(){
        console.log('src', `#${this.videoID}`);
        this.el.setAttribute('material','src', `#${this.videoID}`); // video only! (no audio)
        this.el.setAttribute('material', 'shader', 'flat');
        this.el.setAttribute('material-extras', 'encoding', 'sRGBEncoding');
        this.el.setAttribute('material-extras', 'needsUpdate', 'true');
    },
    updateVideo: function() {
        const data = this.data;
        if (!data) return;        
        if (!data.jitsiId) {
            console.log('no jid');
            return;
        }
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
        if (jitsiVideo.readyState == 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.setVideoSrc();
            return;
        }
        // if not loaded yet, try to wait for load
        this.retryWaitVideoLoad();
    },
    retryWaitVideoLoad: function() {
        setTimeout(async () => {
            console.log('retry');
            this.updateVideo();
        }, 1000); // try again in a bit
    }
});
