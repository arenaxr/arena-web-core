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
import {SideMenu} from './icons/index.js';

// log lib-jitsi-meet.js version
if (JitsiMeetJS) {
    console.info(`JitsiMeetJS version https://github.com/jitsi/lib-jitsi-meet/commit/${JitsiMeetJS.version}`);
}

/**
 * The ARENA Jitsi client connection class.
 */
export class ARENAJitsi {
    static ARENA_APP_ID = 'arena';
    static SCREENSHARE_PREFIX = '#5cr33n5h4r3'; // unique prefix for screenshare clients
    static ARENA_USER = '#4r3n4'; // unique arena client "tag"
    static NEW_USER_TIMEOUT_MS = 2000;
    static jitsi = undefined;

    /**
     * Initialize the Jitsi connection.
     * @param {*} jitsiServer The jitsi server url.
     * @return {*} Instantiated ARENAJitsi object.
     */
    static init(jitsiServer, pano = false) {
        if (!this.jitsi) {
            this.jitsi = new ARENAJitsi(jitsiServer, pano);
            this.jitsi.connect();
            this.jitsi.avConnect();
        }
        return this.jitsi;
    }

    /**
     * Configure the ARENA Jitsi client before connecting.
     * @param {*} jitsiServer The jitsi server url.
     */
    constructor(jitsiServer, pano = false) {
        this.pano = pano;
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

        // Connection recommendations and specs:
        // https://jitsi-club.gitlab.io/jitsi-self-hosting/en/01-deployment-howto/03-tuning/
        // https://github.com/jitsi/jitsi-meet/blob/master/config.js
        this.confOptions = {
            openBridgeChannel: true,
            enableNoAudioDetection: true,
            enableTalkWhileMuted: true,
            enableNoisyMicDetection: true,
            // startWithAudioMuted: true,
            // startWithVideoMuted: true,
            p2p: {
                enabled: false,
            },

            // https://jitsi.org/blog/new-off-stage-layer-suppression-feature/
            // Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth
            enableLayerSuspension: true,
            // backgroundAlpha: 0.5,

            // https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md.
            useNewBandwidthAllocationStrategy: true,
        };

        if (pano) {
            // his.confOptions.maxFullResolutionParticipants: 10;
            // this.confOptions.resolution: 960;
            // this.confOptions.constraints = {
            //     video: {
            //         aspectRatio: 2 / 1,
            //         height: {
            //             ideal: 960,
            //             max: 1920,
            //             min: 960,
            //         },
            //         width: {
            //             ideal: 1920,
            //             max: 3840,
            //             min: 1920,
            //         },
            //     },
            // };
        } else {
            // this.confOptions.constraints = {
            //     video: {
            //         height: {
            //             ideal: 1080,
            //             max: 2160,
            //             min: 240,
            //         },
            //     },
            // };
        }

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

    /**
     * Connect to the Jitsi server.
     */
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
    async onLocalTracks(tracks) {
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
                const cornerVidEl = document.getElementById('cornerVideo');
                if (this.jitsiVideoTrack) {
                    const oldTrack = this.jitsiVideoTrack;
                    await oldTrack.detach(cornerVidEl);
                    await this.conference.replaceTrack(oldTrack, track);
                    await oldTrack.dispose();
                }
                track.attach(cornerVidEl);
                this.jitsiVideoTrack = track;
            } else if (track.getType() === 'audio') {
                if (this.jitsiAudioTrack) {
                    const oldTrack = this.jitsiAudioTrack;
                    await this.conference.replaceTrack(oldTrack, track);
                    await oldTrack.dispose();
                }
                this.jitsiAudioTrack = track;
            }
            if (this.ready) {
                // mobile only?
                track.mute();
                this.conference.addTrack(track);
                this.connectArena(this.conference.myUserId(), track.getType());
            }
        }
        if (this.prevVideoUnmuted) SideMenu.clickButton(SideMenu.buttons.VIDEO);
        if (this.prevAudioUnmuted) SideMenu.clickButton(SideMenu.buttons.AUDIO);
    }

    /**
     * Update screen share object
     * @param {string} screenShareId JitsiTrack object
     * @param {string} videoId Jitsi video Id
     * @param {string} participantId Jitsi participant Id
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
                        jid: participantId,
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
                        jid: participantId,
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
                    jid: user._id,
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
                jid: id,
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
                jid: id,
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
            jid: id,
            id: arenaId,
            src: ARENAEventEmitter.sources.JITSI,
        });
    }

    /**
     * Called when dominant speaker changes.
     * @param {string} id user Id
     */
    onDominantSpeakerChanged(id) {
        // console.log(`(conference) Dominant Speaker ID: ${id}`);
        this.prevActiveSpeaker = this.activeSpeaker;
        this.activeSpeaker = id;
        let actArenaId;
        let prevArenaId;
        const actJitsiId = this.conference.getParticipantById(this.activeSpeaker);
        if (actJitsiId) actArenaId = actJitsiId.getProperty('arenaId');
        const prevJitsiId = this.conference.getParticipantById(this.prevActiveSpeaker);
        if (prevJitsiId) prevArenaId = prevJitsiId.getProperty('arenaId');
        ARENA.events.emit(ARENAEventEmitter.events.DOMINANT_SPEAKER, {
            id: actArenaId,
            pid: prevArenaId,
            scene: this.arenaConferenceName,
            src: ARENAEventEmitter.sources.JITSI,
        });
    }

    /**
     * This function is called when connection is established successfully
     */
    onConnectionSuccess() {
        console.log('Conference server connected!');
        this.conference = this.connection.initJitsiConference(this.arenaConferenceName, this.confOptions);
        this.conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.onRemoteTrack.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
            console.log(`track removed!!!${track}`);
        });
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.onConferenceJoined.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.USER_JOINED, this.onUserJoined.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.USER_LEFT, this.onUserLeft.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, this.onDominantSpeakerChanged.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.TALK_WHILE_MUTED, () => {
            console.log(`Talking on mute detected!`);
            ARENA.events.emit(ARENAEventEmitter.events.TALK_WHILE_MUTED, true);
        });
        this.conference.on(JitsiMeetJS.events.conference.NOISY_MIC, () => {
            console.log(`Non-speech noise detected on microphone.`);
            ARENA.events.emit(ARENAEventEmitter.events.NOISY_MIC, true);
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
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, this.onConferenceError.bind(this));
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_ERROR, this.onConferenceError.bind(this));
        this.conference.on(JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED, (stats) => {
            this.conference.sendEndpointStatsMessage(stats); // send to remote
            ARENA.events.emit(ARENAEventEmitter.events.JITSI_STATS_LOCAL, {
                jid: this.jitsiId,
                id: ARENA.idTag,
                stats: stats,
            });
        });
        this.conference.on(JitsiMeetJS.events.connectionQuality.REMOTE_STATS_UPDATED, (id, stats) => {
            const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
            ARENA.events.emit(ARENAEventEmitter.events.JITSI_STATS_REMOTE, {
                jid: id,
                id: arenaId,
                stats: stats,
            });
        });

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
        ARENA.health.removeError('connection.connectionFailed');
    }

    /**
     * Called for conference errors/failures
     * @param {*} err
     */
    onConferenceError(err) {
        console.error(`Conference error ${err}!`);
        ARENA.events.emit(ARENAEventEmitter.events.CONFERENCE_ERROR, {
            errorCode: err,
        });
        ARENA.health.addError(err);
    }

    /**
     * This function is called when the this.connection fails.
     */
    onConnectionFailed() {
        const err ='connection.connectionFailed';
        console.error('Conference server connection failed!');
        ARENA.events.emit(ARENAEventEmitter.events.CONFERENCE_ERROR, {
            errorCode: err,
        });
        ARENA.health.addError(err);
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
        console.warning('Conference server disconnected!');
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
        const prefAudioInput = localStorage.getItem('prefAudioInput');
        const prefVideoInput = localStorage.getItem('prefVideoInput');
        const devices = ['audio'];
        const deviceOpts = {};
        if (prefAudioInput) {
            deviceOpts.micDeviceId = prefAudioInput;
        }
        if (this.pano) {
            deviceOpts.minFps = 5;
            // deviceOpts.maxFps = 20;
            deviceOpts.constraints = {
                video: {
                    aspectRatio: 2 / 1,
                    height: {
                        ideal: 960,
                        max: 1920,
                        min: 960,
                    },
                    width: {
                        ideal: 1920,
                        max: 3840,
                        min: 1920,
                    },
                },
            };
        }
        try {
            let vidConstraint = true;
            if (prefVideoInput) {
                vidConstraint = {deviceId: {exact: prefVideoInput}};
                try {
                    await navigator.mediaDevices.getUserMedia({video: vidConstraint});
                    deviceOpts.cameraDeviceId = prefVideoInput;
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
            /*
            if (!localStorage.getItem('hideNoAV')) {
                Swal.fire({
                    title: 'No Webcam or Audio Input Device found!',
                    html: `You are now in <i>"spectator mode"</i>. This means you won\'t be able to share video,
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
            }*/
        }
        this.avConnected = true;

        JitsiMeetJS.createLocalTracks({devices, ...deviceOpts}).
            then(async (tracks) => {
                await this.onLocalTracks(tracks);
                if (this.withVideo) setupCornerVideo.bind(this)();
            }).
            catch((err) => {
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

            const _this = this;
            /**
             * set video element size
             */
            function setCornerVideoHeight() {
                const videoWidth = ARENA.localVideoWidth;
                const videoHeight = _this.jitsiVideoElem.videoHeight /
                                        (_this.jitsiVideoElem.videoWidth / videoWidth);
                _this.jitsiVideoElem.style.width = videoWidth + 'px';
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

    /**
     * Show the client user's video
     */
    showVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'block';
    }

    /**
     * Hide the client user's video
     */
    hideVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'none';
    }

    /**
     * Getter for the client users Jitsi Id
     * @return {string} The Jitsi Id
     */
    getJitsiId() {
        return this.jitsiId;
    }

    /**
     * Has the active speaker changed
     * @return {boolean} if the active speaker has changed
     */
    activeSpeakerChanged() {
        return this.prevActiveSpeaker !== this.activeSpeaker;
    }

    /**
     * Begin the audio feed
     * @return {*} Promise for the track unmute
     */
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

    /**
     * End the audio feed
     * @return {*} Promise for the track mute
     */
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

    /**
     * Begin the video feed
     * @return {*} Promise for the track unmute
     */
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

    /**
     * End the video feed
     * @return {*} Promise for the track mute
     */
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

    /**
     * Getter for the audio feed by jisti id
     * @param {*} jitsiId The jitsi user id
     * @return {*} remote track object
     */
    getAudioTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][0];
        } else {
            return null;
        }
    }

    /**
     * Getter for the video feed by jisti id
     * @param {*} jitsiId The jitsi user id
     * @return {*} remote track object
     */
    getVideoTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][1];
        } else {
            return null;
        }
    }

    /**
     *
     * @param {*} jitsiId
     */
    setResolutionPanoramic(jitsiId) {
        const videoConstraints = {
            'colibriClass': 'ReceiverVideoConstraints',
            // Number of videos requested from the bridge.
            // 'lastN': 20,
            // The endpoints ids of the participants that are prioritized first.
            // 'selectedEndpoints': ['A', 'B', 'C'],
            // The endpoint ids of the participants that are prioritized up to a higher resolution.
            // 'onStageEndpoints': ['A'],
            'onStageEndpoints': [jitsiId],
            // Default resolution requested for all endpoints.
            'defaultConstraints': {
                'maxHeight': 180,
            },
            // Endpoint specific resolution.
            'constraints': {},
        };
        videoConstraints.constraints[jitsiId] = {
            'maxHeight': 960,
        };
        this.conference.setReceiverConstraints(videoConstraints);
    }

    /**
     * Remove a user from the conference
     * @param {*} participantJitsiId The user to kick out
     * @param {*} msg The message for the user
     */
    kickout(participantJitsiId, msg) {
        if (this.conference) {
            this.conference.kickParticipant(participantJitsiId, msg);
        }
    }

    /**
     * Disconnect from the conference
     */
    leave() {
        this.unload();
        this.disconnect();
    }

    /**
     *
     * @param {*} participantJitsiId
     * @returns
     */
    getUserId(participantJitsiId) {
        if (this.jitsiId == participantJitsiId) return ARENA.camName;
        // our arena id (camera name) is the jitsi display name
        return this.conference.getParticipantById(participantJitsiId)._displayName;
    }

    /**
     *
     * @param {*} participantJitsiId
     * @param {*} property
     * @returns
     */
    getProperty(participantJitsiId, property) {
        return this.conference.getParticipantById(participantJitsiId).getProperty(property);
    }
};
