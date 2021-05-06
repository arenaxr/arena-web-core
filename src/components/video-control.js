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
 * @property {boolean} [anyone_clicks=true] - anyone clicks
 * @property {boolean} [video_loop=true] - video loop
 *
 */
AFRAME.registerComponent('video-control', {
    // e.g. <a-entity video-control="videoName: superVideo" ...>
    schema: {
        video_object: {type: 'string', default: ''},
        video_path: {type: 'string', default: ''},
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

        let frameSrc = 'images/conix-face.white.jpg'; // default
        if (data.frame_object) {
            frameSrc = data.frame_object;
        }

        const thePlayer = document.getElementById(theID);
        const theAssets = $('a-assets');

        this.videoNum = this.el.id;
        const videoId = this.videoNum + '_videoId';
        ;
        theAssets.append(
            `<video id='${videoId}' src='${videoPath}' ${(autoplay) ? 'autoplay':''} loop='${videoLoop}'/>`,
        );

        const frameId = this.videoNum + '_frameId';
        ;
        theAssets.append(
            `<image id='${frameId}' src='${frameSrc}'/>`,
        );

        thePlayer.setAttribute('material', 'src', `#${frameId}`);

        // save the video or frozen frame URL as 'frameSrc'
        thePlayer.setAttribute('arenaVideo', frameSrc);
        thePlayer.setAttribute('videoId', videoId);
        thePlayer.setAttribute('frameId', frameId);


        // start video
        const thevideo = document.getElementById(videoId);
        this.video = thevideo;
        const theVideoId = thePlayer.getAttribute('videoId');
        thePlayer.setAttribute('material', 'src', `#${theVideoId}`);
        thePlayer.setAttribute('arenaVideo', videoPath);
        thevideo.volume = volume;
        thevideo.play(); // play the html video elem ==> play aframe video elem

        this.el.addEventListener('mousedown', function(evt) {
            if (evt.detail.clicker == ARENA.camName ||
                anyoneClicks && evt.detail.clicker && (evt.detail.clicker != ARENA.camName)) {
                const theSource = thePlayer.getAttribute('arenaVideo');
                const theVideoId = thePlayer.getAttribute('videoId');
                const theFrameId = thePlayer.getAttribute('frameId');

                if (theSource != frameSrc) {
                    // FRAME
                    thevideo.pause(); // pause the html video elem ==> pause aframe video elem
                    thePlayer.setAttribute('material', 'src', `#${theFrameId}`);
                    thePlayer.setAttribute('arenaVideo', frameSrc);
                } else {
                    // VIDEO
                    thePlayer.setAttribute('material', 'src', `#${theVideoId}`);
                    thePlayer.setAttribute('arenaVideo', videoPath);
                    thevideo.volume = volume; // default is 1; this just demonstrates how to change
                    thevideo.play(); // play the html video elem ==> play aframe video elem
                }
            }
        });
    },

    update: function(oldData) {
        const volume = this.data.volume;
        this.video.volume = volume; // default is 1; this just demonstrates how to change
    },

    pause: function() {
        // this.removeEventListeners()
    },

    play: function() {
        // this.addEventListeners()
    },

    // handle component removal (why can't it just go away?)
    remove: function() {
        const data = this.data;
        const el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    },
});
