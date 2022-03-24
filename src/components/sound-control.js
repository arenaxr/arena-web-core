/* global AFRAME, ARENA */

/**
 * @fileoverview Adds a sound to an entity and controls its playback.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Adds a sound to an entity and controls its playback.
 * @module sound-control
 * @property {string} sound_object - the object id of the element where to display the sound
 * @property {string} sound_path - path/url to the sound
 * @property {string} [frame_object] - path/url to the keyframe to display
 * @property {boolean} [anyone_clicks=true] - anyone clicks
 * @property {boolean} [sound_loop=true] - sound loop
 * @property {boolean} [autoplay=false] - sound autoplays on load
 * @property {number} [volume=1] - sound sound volume
 *
 */
 AFRAME.registerComponent('sound-control', {
    schema: {
        sound_object: {type: 'string', default: ''},
        sound_path: {type: 'string', default: ''},
        frame_object: {type: 'string', default: ''},
        anyone_clicks: {type: 'boolean', default: true},
        sound_loop: {type: 'boolean', default: true},
        autoplay: {type: 'boolean', default: false},
        volume: {type: 'number', default: 1},
    },

    multiple: true,

    init: function() {
        const data = this.data;
        const theID = data.sound_object;
        const soundPath = data.sound_path;
        const anyoneClicks = data.anyone_clicks;
        const soundLoop = data.sound_loop;
        const autoplay = data.autoplay;
        const volume = data.volume;

        let frameSrc = 'static/images/conix-face.white.jpg'; // default
        if (data.frame_object) {
            frameSrc = data.frame_object;
        }

        this.player = document.getElementById(theID);
        const theAssets = $('a-assets');

        this.soundNum = this.el.id;
        const soundId = this.soundNum + '_soundId';

        theAssets.append(
            `<sound id='${soundId}' src='${soundPath}' ${(autoplay) ? 'autoplay':''} loop='${soundLoop}'/>`,
        );

        const frameId = this.soundNum + '_frameId';
        theAssets.append(
            `<image id='${frameId}' src='${frameSrc}'/>`,
        );

        this.player.setAttribute('material', 'src', `#${frameId}`);

        // save the sound or frozen frame URL as 'frameSrc'
        this.player.setAttribute('arenasound', frameSrc);
        this.player.setAttribute('soundId', soundId);
        this.player.setAttribute('frameId', frameId);

        if (autoplay) {
            // start sound
            this.sound = document.getElementById(soundId);
            const thesoundId = this.player.getAttribute('soundId');
            this.player.setAttribute('material', 'src', `#${thesoundId}`);
            this.player.setAttribute('arenasound', soundPath);
            this.sound.volume = volume;
            this.sound.play(); // play the html sound elem ==> play aframe sound elem
        } else {
            this.sound.pause();
        }

        this.el.addEventListener('mousedown', function(evt) {
            if (evt.detail.clicker == ARENA.camName ||
                anyoneClicks && evt.detail.clicker && (evt.detail.clicker != ARENA.camName)) {
                const theSource = this.player.getAttribute('arenasound');
                const thesoundId = this.player.getAttribute('soundId');
                const theFrameId = this.player.getAttribute('frameId');

                if (theSource != frameSrc) {
                    // FRAME
                    this.sound.pause(); // pause the html sound elem ==> pause aframe sound elem
                    this.player.setAttribute('material', 'src', `#${theFrameId}`);
                    this.player.setAttribute('arenasound', frameSrc);
                } else {
                    // sound
                    this.player.setAttribute('material', 'src', `#${thesoundId}`);
                    this.player.setAttribute('arenasound', soundPath);
                    this.sound.volume = volume;
                    this.sound.play(); // play the html sound elem ==> play aframe sound elem
                }
            }
        });
    },

    update: function(oldData) {
        const volume = this.data.volume;
        this.sound.volume = volume;
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
