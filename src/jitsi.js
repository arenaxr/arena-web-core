/**
 * @fileoverview Jitsi API for the ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, ARENA, JitsiMeetJS */
import $ from 'jquery';
import Swal from 'sweetalert2';
import {ARENAEventEmitter} from './event-emitter.js';

export class ARENAJitsi {
    static ARENA_APP_ID = 'arena';
    static SCREENSHARE_PREFIX = '#5cr33n5h4r3'; // unique prefix for screenshare clients
    static ARENA_USER = '#4r3n4'; // unique arena client "tag"
    static NEW_USER_TIMEOUT_MS = 2000;
    static jitsi = undefined;

    static init(jitsiServer) {
        if (!this.jitsi) {
            this.jitsi = new ARENAJitsi(jitsiServer);
            this.jitsi.connect();
            this.jitsi.avConnect();
        }
        return this.jitsi;
    }

    constructor(jitsiServer) {
        if (!window.JitsiMeetJS) {
            console.warn('Jitsi is not found!');
            return;
        }
        this.serverName = jitsiServer;

        // we use the scene name as the jitsi room name, handle RFC 3986 reserved chars as = '_'
        this.arenaConferenceName = ARENA.namespacedScene.toLowerCase().replace(/[!#$&'()*+,\/:;=?@[\]]/g, '_');

        this.connectOptions = {
            hosts: {
                domain: this.serverName.split(':')[0], // remove port, if exists.
                muc: 'conference.' + this.serverName.split(':')[0], // remove port, if exists. FIXME: use XEP-0030
            },
            bosh: '//' + this.serverName + '/http-bind', // FIXME: use xep-0156 for that

            // The name of client node advertised in XEP-0115 'c' stanza
            clientNode: 'http://jitsi.org/jitsimeet',
        };

        // TODO: is this how to p2p.enabled false? https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/API.md
        this.confOptions = {
            openBridgeChannel: true,
            p2p: {enabled: false},
        };

        this.initOptions = {
            disableAudioLevels: true,
        };

        this.connection = null;
        this.conference = null;
        this.ready = false;

        this.avConnected = false;
        this.withVideo = false;

        this.jitsiId = null;

        this.localTracks = []; // just our set of audio,video tracks
        this.remoteTracks = {}; // map of arrays of tracks

        this.jitsiAudioTrack = null;
        this.jitsiVideoTrack = null;
        this.jitsiVideoElem = null;
        this.prevActiveSpeaker = null;
        this.activeSpeaker = null;

        this.hasAudio = false;
        this.hasVideo = false;

        this.screenShareDict = {};
        /**
         * list of timers to send new user notifications; when a user enters jitsi, there is some delay until other
         * participants receive data about its properties (e.g. arenaDisplayName and arenaUserName).
         * we wait NEW_USER_TIMEOUT_MS to hear about these in case it is an arena user and notify anyway after this timeout
         */
        this.newUserTimers = [];
    }

    connect() {
        $(window).bind('beforeunload', this.unload.bind(this));
        $(window).bind('unload', this.unload.bind(this));

        JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

        JitsiMeetJS.mediaDevices.addEventListener(JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED, this.onDeviceListChanged.bind(this));

        // Firefox does not allow audio output device change
        try {
            const prefAudioOutput = localStorage.getItem('prefAudioOutput');
            JitsiMeetJS.mediaDevices.setAudioOutputDevice(prefAudioOutput);
        } catch {}

        JitsiMeetJS.init(this.initOptions);
        console.info('Jitsi, connecting:', this.connectOptions);
        this.connection = new JitsiMeetJS.JitsiConnection(ARENAJitsi.ARENA_APP_ID, ARENA.mqttToken, this.connectOptions);
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, this.onConnectionSuccess.bind(this));
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.onConnectionFailed.bind(this));
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect.bind(this));
        this.connection.connect();
    }

    /**
     * Called when user joins
     * @param {string} participantId Participant id
     * @param {string} trackType track type ('audio'/'video')
     */
    connectArena(participantId, trackType) {
        this.jitsiId = participantId;
        console.log('connectArena: ' + participantId, trackType);
    }

    /**
     * Handles local tracks.
     * @param {[]} tracks Array with JitsiTrack objects
     */
    onLocalTracks(tracks) {
        this.localTracks = tracks;

        for (let i = 0; i < this.localTracks.length; i++) {
            const track = this.localTracks[i];
            track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
                console.log(`Audio Level local: ${audioLevel}`),
            );
            track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
                console.log('local track state changed'),
            );
            track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
                console.log('local track stopped'),
            );
            track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
                console.log(`track audio output device was changed to ${deviceId}`),
            );
            // append our own video/audio elements to <body>
            if (track.getType() === 'video') {
                // use already defined e.g. <video id="cornerVideo" ...>
                track.attach($(`#cornerVideo`)[0]);
                this.jitsiVideoTrack = track;
            } else if (track.getType() === 'audio') {
                this.jitsiAudioTrack = track;
            }
            if (this.ready) {
                // mobile only?
                this.conference.addTrack(track);
                this.connectArena(this.conference.myUserId(), track.getType());
            }
        }
        if (this.jitsiAudioTrack) this.jitsiAudioTrack.mute();
        if (this.jitsiVideoTrack) this.jitsiVideoTrack.mute();
    }

    /**
     * Update screen share object
     * @param {string} screenShareId JitsiTrack object
     * @param {string} videoId Jitsi video Id
     * @param {string} participantId Jitsi participand Id
     * @return {object} screenShare scene object
     */
    updateScreenShareObject(screenShareId, videoId, participantId) {
        if (!screenShareId) return;

        let screenShareEl = document.getElementById(screenShareId);
        if (!screenShareEl) {
            const sceneEl = document.querySelector('a-scene');
            // create if doesnt exist
            screenShareEl = document.createElement('a-entity');
            screenShareEl.setAttribute('geometry', 'primitive', 'plane');
            screenShareEl.setAttribute('rotation.order', 'YXZ');
            screenShareEl.setAttribute('id', screenShareId);
            screenShareEl.setAttribute('scale', '8 6 0.01');
            screenShareEl.setAttribute('position', '0 3.1 -3');
            screenShareEl.setAttribute('material', 'shader: flat; side: double');
            sceneEl.appendChild(screenShareEl);
        }
        screenShareEl.setAttribute('muted', 'false');
        screenShareEl.setAttribute('autoplay', 'true');
        screenShareEl.setAttribute('playsinline', 'true');
        screenShareEl.setAttribute('material', 'src', `#${videoId}`);
        screenShareEl.setAttribute('material-extras', 'encoding', 'sRGBEncoding');
        screenShareEl.setAttribute('material-extras', 'needsUpdate', 'true');
        this.screenShareDict[participantId] = screenShareEl;
        return screenShareEl;
    }

    /**
     * Handles remote tracks
     * @param {object} track JitsiTrack object
     */
    async onRemoteTrack(track) {
        if (track.isLocal()) {
            return;
        }
        const participantId = track.getParticipantId();

        if (!this.remoteTracks[participantId]) {
            // new participantId
            this.remoteTracks[participantId] = [null, null]; // create array to hold their tracks
        }

        if (track.getType() == 'audio') {
            if (this.remoteTracks[participantId][0]) {
                this.remoteTracks[participantId][0].dispose();
            }
            this.remoteTracks[participantId][0] = track;

            const audioId = `audio${participantId}`;
            // create HTML audio elem to store audio
            if (!document.getElementById(audioId)) {
                $('a-assets').append(`<audio id='${audioId}'/>`);
            }
            track.attach($(`#${audioId}`)[0]);
        } else if (track.getType() == 'video') {
            if (this.remoteTracks[participantId][1]) {
                this.remoteTracks[participantId][1].dispose();
            }
            this.remoteTracks[participantId][1] = track;

            const videoId = `video${participantId}`;
            // create HTML video elem to store video
            if (!document.getElementById(videoId)) {
                $('a-assets').append(`<video autoplay='1' id='${videoId}'/>`);
            }
            track.attach($(`#${videoId}`)[0]);

            const user = this.conference.getParticipantById(participantId);
            let camNames = user.getProperty('arenaCameraName');
            if (!camNames) camNames = user.getDisplayName();
            if (!camNames) return; // handle jitsi-only users that have not set the display name

            if (camNames.includes(ARENAJitsi.SCREENSHARE_PREFIX)) {
                let dn = user.getProperty('screenshareDispName');
                if (!dn) dn = user.getDisplayName();
                if (!dn) dn = `No Name #${id}`;
                const camName = user.getProperty('screenshareCamName');
                let objectIds = user.getProperty('screenshareObjIds');

                if (camName && objectIds) {
                    ARENA.events.emit(ARENAEventEmitter.events.SCREENSHARE, {
                        id: participantId,
                        dn: dn,
                        cn: camName,
                        scene: ARENA.namespacedScene,
                        src: ARENAEventEmitter.sources.JITSI,
                    });
                    objectIds = objectIds.split(',');

                    // handle screen share video
                    for (let i = 0; i < objectIds.length; i++) {
                        if (objectIds[i]) {
                            const video = $(`#${videoId}`);
                            video.on('loadeddata', (e) => {
                                this.updateScreenShareObject(objectIds[i], videoId, participantId);
                            });
                        }
                    }
                } else { // display as external user; possible spoofer
                    ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                        id: participantId,
                        dn: dn,
                        cn: undefined,
                        scene: ARENA.namespacedScene,
                        src: ARENAEventEmitter.sources.JITSI,
                    });
                    return;
                }
            }
        }

        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
            console.log(`Audio Level remote: ${audioLevel}`),
        );
        track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () => console.log('remote track stopped'));
        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
            console.log(`track audio output device was changed to ${deviceId}`),
        );
        // track.addEventListener(
        //     JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        //     () => {
        //         console.log('remote track muted')
        //     });
    }

    /**
     * This function is executed when the this.conference is joined
     */
    onConferenceJoined() {
        this.ready = true;
        console.log('Joined conf! localTracks.length: ', this.localTracks.length);

        if (this.localTracks.length == 0) {
            console.log('NO LOCAL TRACKS but UserId is: ', this.conference.myUserId());
            this.connectArena(this.conference.myUserId(), '');
        } else {
            for (let i = 0; i < this.localTracks.length; i++) {
                const track = this.localTracks[i];
                this.conference.addTrack(track);
                // connect to ARENA; draw media button(s)
                this.connectArena(this.conference.myUserId(), track.getType());
            }
        }

        // create participant list and emit jitsi connect event
        const pl = [];
        this.conference.getParticipants().forEach((user) => {
            const arenaId = user.getProperty('arenaId');
            const arenaDisplayName = user.getProperty('arenaDisplayName');
            const arenaCameraName = user.getProperty('arenaCameraName');
            if (arenaId) {
                pl.push({
                    id: arenaId,
                    dn: arenaDisplayName,
                    cn: arenaCameraName,
                });
            }
        });
        ARENA.events.emit(ARENAEventEmitter.events.JITSI_CONNECT, {
            scene: ARENA.namespacedScene,
            pl: pl,
        });
    }

    /**
     * Called when user joins
     * @param {string} id
     */
    async onUserJoined(id) {
        console.log('New user joined:', id, this.conference.getParticipantById(id).getDisplayName());
        this.remoteTracks[id] = [null, null]; // create an array to hold tracks of new user

        const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
        const arenaDisplayName = this.conference.getParticipantById(id).getProperty('arenaDisplayName');
        const arenaCameraName = this.conference.getParticipantById(id).getProperty('arenaCameraName');
        if (arenaId && arenaDisplayName && arenaCameraName) {
            // emit user joined event in the off chance we know all properties of this arena user
            ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                id: arenaId,
                dn: arenaDisplayName,
                cn: arenaCameraName,
                scene: ARENA.namespacedScene,
                src: ARENAEventEmitter.sources.JITSI,
            });
        } else {
            let dn = this.conference.getParticipantById(id).getDisplayName(); // get display name
            if (!dn) dn = `No Name #${id}`; // jitsi user that did not set his display name
            // user join event args, to be emited below
            const userJoinedArgs = {
                id: id,
                dn: dn,
                cn: undefined,
                scene: ARENA.namespacedScene,
                src: ARENAEventEmitter.sources.JITSI,
            };
            // this might be a jitsi-only user; emit event if name does not have the arena tag
            if (!dn.includes(ARENAJitsi.ARENA_USER)) {
                if (!dn.includes(ARENAJitsi.SCREENSHARE_PREFIX)) {
                    ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, userJoinedArgs);
                }
            } else {
                this.newUserTimers[id] = setTimeout(() => {
                    // emit event anyway in NEW_USER_TIMEOUT_MS if we dont hear from this user
                    ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, userJoinedArgs);
                }, ARENAJitsi.NEW_USER_TIMEOUT_MS);
            }
        }
    }

    /**
     * Called when user leaves
     * @param {string} id user Id
     * @param {object} user user object (JitsiParticipant)
     */
    onUserLeft(id, user) {
        console.log('user left:', id);
        let arenaId = user.getProperty('arenaId');
        if (!arenaId) arenaId = id; // this was a jitsi-only user

        if (!this.remoteTracks[id]) return;
        const screenShareEl = this.screenShareDict[id];
        if (screenShareEl) {
            screenShareEl.setAttribute('material', 'src', null);
            delete this.screenShareDict[id];
        }
        $(`#video${id}`).remove();
        $(`#audio${id}`).remove();
        delete this.remoteTracks[id];

        // emit user left event
        ARENA.events.emit(ARENAEventEmitter.events.USER_LEFT, {
            id: arenaId,
            src: ARENAEventEmitter.sources.JITSI,
        });
    }

    /**
     * This function is called when connection is established successfully
     */
    onConnectionSuccess() {
        this.conference = this.connection.initJitsiConference(this.arenaConferenceName, this.confOptions);

        this.conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.onRemoteTrack.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
            console.log(`track removed!!!${track}`);
        });
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.onConferenceJoined.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.USER_JOINED, this.onUserJoined.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.USER_LEFT, this.onUserLeft.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
            console.log(`(conference) Dominant Speaker ID: ${id}`);
            this.prevActiveSpeaker = this.activeSpeaker;
            this.activeSpeaker = id;
            let actArenaId = this.conference.getParticipantById(this.activeSpeaker);
            if (actArenaId) actArenaId = actArenaId.getProperty('arenaId');
            let prevArenaId = this.conference.getParticipantById(this.prevActiveSpeaker);
            if (prevArenaId) prevArenaId = prevArenaId.getProperty('arenaId');
            ARENA.events.emit(ARENAEventEmitter.events.DOMINANT_SPEAKER_CHANGED, {
                id: actArenaId,
                pid: prevArenaId,
                scene: this.arenaConferenceName,
                src: ARENAEventEmitter.sources.JITSI,
            });
        });
        this.conference.on(JitsiMeetJS.events.conference.TALK_WHILE_MUTED, () => {
            console.log(`(conference) Speaking while muted.`);
            Swal.fire({
                title: 'Speaking while muted',
                icon: 'warning',
                timer: 2000,
            });
        });
        this.conference.on(JitsiMeetJS.events.conference.NOISY_MIC, () => {
            console.log(`(conference) Noisy mic (speaking).`);
            Swal.fire({
                title: 'Noisy mic (speaking).',
                icon: 'warning',
                timer: 2000,
            });
        });
        this.conference.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (userID, displayName) =>
            console.log(`${userID} - ${displayName}`),
        );
        this.conference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (userID, audioLevel) =>
            console.log(`${userID} - ${audioLevel}`),
        );
        this.conference.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
            console.log(`${conference.getPhoneNumber()} - ${conference.getPhonePin()}`),
        );

        // set the ARENA user's name with a "unique" ARENA tag
        this.conference.setDisplayName(ARENA.displayName + ` (${ARENAJitsi.ARENA_USER}_${ARENA.idTag})`);

        // set local properties
        this.conference.setLocalParticipantProperty('arenaId', ARENA.idTag);
        this.conference.setLocalParticipantProperty('arenaDisplayName', ARENA.displayName);
        this.conference.setLocalParticipantProperty('arenaCameraName', ARENA.camName);

        this.conference.on(
            JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
            (user, propertyKey, oldPropertyValue, propertyValue) => {
                // console.log(`Property changed: ${user.getId()} ${propertyKey} ${propertyValue} ${oldPropertyValue}`);
                const id = user.getId();
                if (
                    propertyKey === 'arenaId' ||
                    propertyKey === 'arenaDisplayName' ||
                    propertyKey === 'arenaCameraName'
                ) {
                    const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
                    const arenaDisplayName = this.conference.getParticipantById(id).getProperty('arenaDisplayName');
                    const arenaCameraName = this.conference.getParticipantById(id).getProperty('arenaCameraName');
                    if (arenaId && arenaDisplayName && arenaCameraName) {
                        // clear timeout for new user notification
                        clearInterval(this.newUserTimers[id]);
                        delete(this.newUserTimers[id]);
                        // emit new user event
                        ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                            id: arenaId,
                            dn: arenaDisplayName,
                            cn: arenaCameraName,
                            scene: this.arenaConferenceName,
                            src: ARENAEventEmitter.sources.JITSI,
                        });
                    }
                }
            },
        );

        this.conference.join(); // this.conference.join(password);

        this.spatialAudioOn = AFRAME.utils.device.isMobile();
        if (!this.spatialAudioOn) {
            // only tested and working on mac on chrome
            navigator.mediaDevices.enumerateDevices().then(function(devices) {
                const headphonesConnected = devices
                    .filter((device) => /audio\w+/.test(device.kind))
                    .find((device) => device.label.toLowerCase().includes('head'));
                this.spatialAudioOn = !!headphonesConnected;
            }.bind(this));
        }
    }

    /**
     * This function is called when the this.connection fails.
     */
    onConnectionFailed() {
        console.error('Connection Failed!');
    }

    /**
     * This function is called when device list changes
     * @param {object} devices List of devices
     */
    onDeviceListChanged(devices) {
        console.info('current devices', devices);
    }

    /**
     * This function is called when we disconnect.
     */
    disconnect() {
        console.log('disconnected!');
        this.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, this.onConnectionSuccess);
        this.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.onConnectionFailed);
        this.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
    }

    /**
     * called on unload; release tracks, leave this.conference
     */
    unload() {
        for (let i = 0; i < this.localTracks.length; i++) {
            this.localTracks[i].dispose();
        }
        if (this.conference) this.conference.leave();
        if (this.connection) this.connection.disconnect();
    }

    /**
     * Connect audio and video and start sending local tracks
     * @return {promise}
     */
    async avConnect() {
        if (this.avConnected) {
            return;
        }

        const perfAudioInput = localStorage.getItem('prefAudioInput');
        const perfVideoInput = localStorage.getItem('prefVideoInput');
        const devices = ['audio'];
        const deviceOpts = {};
        if (perfAudioInput) {
            deviceOpts.micDeviceId = perfAudioInput;
        }

        try {
            let vidConstraint = true;
            if (perfVideoInput) {
                vidConstraint = {deviceId: {exact: perfVideoInput}};
                try {
                    await navigator.mediaDevices.getUserMedia({video: vidConstraint});
                    deviceOpts.cameraDeviceId = perfVideoInput;
                } catch {
                    await navigator.mediaDevices.getUserMedia({video: true});
                }
            } else {
                await navigator.mediaDevices.getUserMedia({video: true});
            }
            devices.push('video');
            this.withVideo = true;
        } catch (e) {
            const vidbtn = document.getElementById('btn-video-off');
            if (vidbtn) vidbtn.remove();
            const audbtn = document.getElementById('btn-audio-off');
            if (audbtn) audbtn.remove();
            if (!localStorage.getItem('hideNoAV')) {
                Swal.fire({
                    title: 'No Webcam or Audio Input Device found!',
                    html: `You are now in <i>"spectator mode"</i>. This means you won\'t be able to share audio or video,
                       but can still interact with other users.`,
                    icon: 'warning',
                    showConfirmButton: true,
                    confirmButtonText: 'Ok',
                    input: 'checkbox',
                    inputPlaceholder: 'Don\'t remind me again on this device.',
                }).then((result) => {
                    if (result.value) {
                        localStorage.setItem('hideNoAV', 'true');
                    }
                });
            }
        }
        this.avConnected = true;

        JitsiMeetJS.createLocalTracks({devices, ...deviceOpts})
            .then((tracks) => {
                this.onLocalTracks(tracks);
                if (this.withVideo) setupCornerVideo.bind(this)();
            })
            .catch((err) => {
                this.ready = false;
                console.warn(err);
            });

        /**
         * show user video in the corner
         */
        function setupCornerVideo() {
            // video window for jitsi
            this.jitsiVideoElem = document.getElementById('cornerVideo');
            this.jitsiVideoElem.className = 'flipVideo';
            this.jitsiVideoElem.style.opacity = '0.9'; // slightly see through
            this.jitsiVideoElem.style.display = 'none';
            this.jitsiVideoElem.style.width = ARENA.localVideoWidth + 'px';

            const _this = this;
            /**
             * set video element size
             */
            function setCornerVideoHeight() {
                const videoWidth = _this.jitsiVideoElem.style.width;
                const videoHeight = _this.jitsiVideoElem.videoHeight /
                                        (_this.jitsiVideoElem.videoWidth / videoWidth);
                _this.jitsiVideoElem.style.height = videoHeight + 'px';
            }

            this.jitsiVideoElem.onloadedmetadata = () => {
                setCornerVideoHeight();
            };

            // mobile only
            window.addEventListener('orientationchange', () => {
                ARENA.localVideoWidth = Number(window.innerWidth / 5);
                setCornerVideoHeight();
            });
        }
    }

    showVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'block';
    }

    hideVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'none';
    }

    getJitsiId() {
        return this.jitsiId;
    }

    activeSpeakerChanged() {
        return this.prevActiveSpeaker !== this.activeSpeaker;
    }

    unmuteAudio() {
        return new Promise(function(resolve, reject) {
            if (this.jitsiAudioTrack) {
                this.jitsiAudioTrack.unmute()
                    .then(() => {
                        this.hasAudio = true;
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                reject(new Error('Jitsi is not ready yet'));
            }
        }.bind(this));
    }

    muteAudio() {
        return new Promise(function(resolve, reject) {
            if (this.jitsiAudioTrack) {
                this.jitsiAudioTrack.mute()
                    .then(() => {
                        this.hasAudio = false;
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                reject(new Error('Jitsi is not ready yet'));
            }
        }.bind(this));
    }

    startVideo() {
        return new Promise(function(resolve, reject) {
            if (this.jitsiVideoTrack) {
                this.jitsiVideoTrack.unmute()
                    .then(() => {
                        this.hasVideo = true;
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                reject(new Error('Jitsi is not ready yet'));
            }
        }.bind(this));
    }

    stopVideo() {
        return new Promise(function(resolve, reject) {
            if (this.jitsiVideoTrack) {
                this.jitsiVideoTrack.mute()
                    .then(() => {
                        this.hasVideo = false;
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                reject(new Error('Jitsi is not ready yet'));
            }
        }.bind(this));
    }

    getAudioTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][0];
        } else {
            return null;
        }
    }

    getVideoTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][1];
        } else {
            return null;
        }
    }

    leave() {
        this.unload();
        this.disconnect();
    }

    getUserId(participantJitsiId) {
        if (this.jitsiId == participantJitsiId) return ARENA.camName;
        // our arena id (camera name) is the jitsi display name
        return this.conference.getParticipantById(participantJitsiId)._displayName;
    }

    getProperty(participantJitsiId, property) {
        return this.conference.getParticipantById(participantJitsiId).getProperty(property);
    }
};
