/* global AFRAME, ARENA */

/**
 * @fileoverview Adds a video to an entity and controls its playback.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Adds a video to an entity and controls its playback.
 * @module video-control
 * @property {string} video_object - the object id of the element where to display the video
 * @property {string} video_path - path/url to the video
 * @property {string} [frame_object] - path/url to the keyframe to display
 * @property {boolean} [anyone_clicks=true] - anyone clicks
 * @property {boolean} [video_loop=true] - video loop
 * @property {boolean} [autoplay=false] - video autoplays on load
 * @property {number} [volume=1] - video sound volume
 *
 */
AFRAME.registerComponent('video-control', {
    schema: {
        video_object: {type: 'string', default: ''},
        video_path: {type: 'string', default: ''},
        frame_object: {type: 'string', default: ''},
        anyone_clicks: {type: 'boolean', default: true},
        video_loop: {type: 'boolean', default: true},
        autoplay: {type: 'boolean', default: false},
        volume: {type: 'number', default: 1},
    },

    multiple: true,

    init: function() {
        const data = this.data;
        const theID = data.video_object;
        const videoPath = data.video_path;
        const anyoneClicks = data.anyone_clicks;
        const videoLoop = data.video_loop;
        const autoplay = data.autoplay;
        const volume = data.volume;

        let frameSrc = 'static/images/conix-face.white.jpg'; // default
        if (data.frame_object) {
            frameSrc = data.frame_object;
        }

        this.player = document.getElementById(theID);
        const theAssets = $('a-assets');

        this.videoNum = this.el.id;
        const videoId = this.videoNum + '_videoId';

        theAssets.append(
            `<video id='${videoId}' src='${videoPath}' ${(autoplay) ? 'autoplay':''} loop='${videoLoop}'/>`,
        );

        const frameId = this.videoNum + '_frameId';
        theAssets.append(
            `<image id='${frameId}' src='${frameSrc}'/>`,
        );

        this.player.setAttribute('material', 'src', `#${frameId}`);

        // save the video or frozen frame URL as 'frameSrc'
        this.player.setAttribute('arenaVideo', frameSrc);
        this.player.setAttribute('videoId', videoId);
        this.player.setAttribute('frameId', frameId);

        if (autoplay) {
            // start video
            this.video = document.getElementById(videoId);
            const theVideoId = this.player.getAttribute('videoId');
            this.player.setAttribute('material', 'src', `#${theVideoId}`);
            this.player.setAttribute('arenaVideo', videoPath);
            this.video.volume = volume;
            this.video.play(); // play the html video elem ==> play aframe video elem
        } else {
            this.video.pause();
        }

        this.el.addEventListener('mousedown', function(evt) {
            if (evt.detail.clicker == ARENA.camName ||
                anyoneClicks && evt.detail.clicker && (evt.detail.clicker != ARENA.camName)) {
                const theSource = this.player.getAttribute('arenaVideo');
                const theVideoId = this.player.getAttribute('videoId');
                const theFrameId = this.player.getAttribute('frameId');

                if (theSource != frameSrc) {
                    // FRAME
                    this.video.pause(); // pause the html video elem ==> pause aframe video elem
                    this.player.setAttribute('material', 'src', `#${theFrameId}`);
                    this.player.setAttribute('arenaVideo', frameSrc);
                } else {
                    // VIDEO
                    this.player.setAttribute('material', 'src', `#${theVideoId}`);
                    this.player.setAttribute('arenaVideo', videoPath);
                    this.video.volume = volume;
                    this.video.play(); // play the html video elem ==> play aframe video elem
                }
            }
        });
    },

    update: function(oldData) {
        const volume = this.data.volume;
        this.video.volume = volume;
    },

    pause: function() {
        // this.removeEventListeners()
    },

    play: function() {
        // this.addEventListeners()
    },

    // handle component removal
    remove: function() {
        const data = this.data;
        const el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    },
});
