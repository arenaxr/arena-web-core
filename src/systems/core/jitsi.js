/**
 * @fileoverview Jitsi API for the ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA, JitsiMeetJS, $ */
import { ARENAUtils } from '../../utils';
import { ARENA_EVENTS, JITSI_EVENTS, EVENT_SOURCES } from '../../constants';

// log lib-jitsi-meet.js version
if (JitsiMeetJS) {
    console.info(`JitsiMeetJS version https://github.com/jitsi/lib-jitsi-meet/commit/${JitsiMeetJS.version}`);
}

/**
 * The ARENA Jitsi client connection system.
 */
AFRAME.registerSystem('arena-jitsi', {
    schema: {
        jitsiHost: { type: 'string', default: ARENA.defaults.jitsiHost },
        arenaAppId: { type: 'string', default: 'arena' },
        screensharePrefix: { type: 'string', default: '#5cr33n5h4r3' }, // unique prefix for screenshare clients
        arenaUserPrefix: { type: 'string', default: '#4r3n4' }, // unique arena client "tag"
        newUserTimeoutMs: { type: 'number', default: 2000 },
        pano: { type: 'boolean', default: false },
    },

    init() {
        const { data } = this;

        this.connectOptions = {
            hosts: {
                domain: data.jitsiHost.split(':')[0], // remove port, if exists.
                muc: `conference.${data.jitsiHost.split(':')[0]}`, // remove port, if exists. FIXME: use XEP-0030
            },
            bosh: `//${data.jitsiHost}/http-bind`, // FIXME: use xep-0156 for that

            // The name of client node advertised in XEP-0115 'c' stanza
            clientNode: 'http://jitsi.org/jitsimeet',
        };

        this.connection = null;
        this.conference = null;
        this.initialized = false;

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
         * we wait newUserTimeoutMs to hear about these in case it is an arena user and notify anyway after this timeout
         */
        this.newUserTimers = [];

        this.unload = this.unload.bind(this);
        this.onConnectionSuccess = this.onConnectionSuccess.bind(this);
        this.onConferenceJoined = this.onConferenceJoined.bind(this);
        this.onUserJoined = this.onUserJoined.bind(this);
        this.onUserLeft = this.onUserLeft.bind(this);
        this.onDeviceListChanged = this.onDeviceListChanged.bind(this);
        this.onConnectionFailed = this.onConnectionFailed.bind(this);
        this.onRemoteTrack = this.onRemoteTrack.bind(this);
        this.onDominantSpeakerChanged = this.onDominantSpeakerChanged.bind(this);
        this.setResolutionRemotes = this.setResolutionRemotes.bind(this);
        this.onConferenceError = this.onConferenceError.bind(this);
        this.disconnect = this.disconnect.bind(this);

        $(window).bind('beforeunload', this.unload);
        $(window).bind('unload', this.unload);

        if (!window.JitsiMeetJS) {
            console.warn('Jitsi is not found!');
            return;
        }
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, this.ready.bind(this));
    },
    ready() {
        const { el } = this;
        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];
        this.health = sceneEl.systems['arena-health-ui'];

        // we use the scene name as the jitsi room name, handle RFC 3986 reserved chars as = '_'
        this.conferenceName = this.arena.namespacedScene.toLowerCase().replace(/[!#$&'()*+,/:;=?@[\]]/g, '_');

        JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

        // signal that jitsi is loaded. note: jitsi is not necessarily CONNECTED when this event is fired,
        ARENA.events.emit(ARENA_EVENTS.JITSI_LOADED, true);

        if (!this.arena.params.noav && this.arena.isJitsiPermitted()) {
            const _this = this;
            ARENA.events.addEventListener(ARENA_EVENTS.SETUPAV_LOADED, () => {
                // Only show if no previous preferences were set / first time AV setup
                if (ARENA.params.armode) {
                    ARENA.events.addEventListener(ARENA_EVENTS.CV_INITIALIZED, _this.connect.bind(_this));
                } else if (localStorage.getItem('prefAudioInput') === null && ARENA.params.skipav === undefined) {
                    window.setupAV(() => {
                        // Initialize Jitsi videoconferencing after A/V setup window
                        _this.connect();
                    });
                } else {
                    ARENA.events.addEventListener(ARENA_EVENTS.SCENE_OBJ_LOADED, _this.connect.bind(_this));
                }
            });
        }
    },

    /**
     * Connect to the Jitsi server.
     */
    connect() {
        const { data } = this;

        JitsiMeetJS.mediaDevices.addEventListener(
            JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
            this.onDeviceListChanged
        );

        // Firefox does not allow audio output device change
        try {
            const prefAudioOutput = localStorage.getItem('prefAudioOutput');
            JitsiMeetJS.mediaDevices.setAudioOutputDevice(prefAudioOutput);
        } catch {
            // empty
        }

        JitsiMeetJS.init(this.initOptions);
        console.info('Jitsi, connecting:', this.connectOptions);

        this.connection = new JitsiMeetJS.JitsiConnection(
            data.arenaAppId,
            this.arena.mqttToken.mqtt_token,
            this.connectOptions
        );
        this.connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            this.onConnectionSuccess
        );
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.onConnectionFailed);
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
        this.connection.connect();

        if (!(ARENA.params.armode && ARENAUtils.isWebXRViewer())) {
            this.avConnect();
        }
    },

    /**
     * Called when user joins
     * @param {string} participantId Participant id
     * @param {string} trackType track type ('audio'/'video')
     */
    connectArena(participantId, trackType) {
        this.jitsiId = participantId;
        console.debug(`connectArena: ${participantId}`, trackType);
    },

    /**
     * Handles local tracks.
     * @param {[]} tracks Array with JitsiTrack objects
     */
    async onLocalTracks(tracks) {
        this.localTracks = tracks;

        for (let i = 0; i < this.localTracks.length; i++) {
            const track = this.localTracks[i];
            track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
                console.debug(`Audio Level local: ${audioLevel}`)
            );
            track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
                console.debug('local track state changed')
            );
            track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
                console.debug('local track stopped')
            );
            track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
                console.debug(`track audio output device was changed to ${deviceId}`)
            );

            // append our own video/audio elements to <body>

            /* eslint-disable no-await-in-loop */
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
            /* eslint-disable no-await-in-loop */
            if (this.initialized) {
                // mobile only?
                track.mute();
                this.conference.addTrack(track);
                this.connectArena(this.conference.myUserId(), track.getType());
            }
        }
        const sceneEl = document.querySelector('a-scene');
        const sideMenu = sceneEl.systems['arena-side-menu-ui'];
        if (this.prevVideoUnmuted) sideMenu.clickButton(sideMenu.buttons.VIDEO);
        if (this.prevAudioUnmuted) sideMenu.clickButton(sideMenu.buttons.AUDIO);
    },

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
            // create if doesn't exist
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
        screenShareEl.setAttribute('material', 'shader', 'flat');
        screenShareEl.setAttribute('material-extras', 'colorSpace', 'SRGBColorSpace');
        screenShareEl.setAttribute('material-extras', 'needsUpdate', 'true');
        this.screenShareDict[participantId] = screenShareEl;
    },

    /**
     * Handles remote tracks
     * @param {object} track JitsiTrack object
     */
    async onRemoteTrack(track) {
        const { data } = this;
        const { el } = this;

        const { sceneEl } = el;

        if (track.isLocal()) {
            return;
        }

        const participantId = track.getParticipantId();

        if (!this.remoteTracks[participantId]) {
            // new participantId
            this.remoteTracks[participantId] = [null, null]; // create array to hold their tracks
        }

        if (track.getType() === 'audio') {
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
        } else if (track.getType() === 'video') {
            if (this.remoteTracks[participantId][1]) {
                this.remoteTracks[participantId][1].dispose();
            }
            this.remoteTracks[participantId][1] = track;

            const videoId = `video${participantId}`;
            // create HTML video elem to store video
            let vidEl = document.getElementById(videoId);
            if (!vidEl) {
                vidEl = $(`<video autoplay='autoplay' id='${videoId}' playsinline/>`);
                $('a-assets').append(vidEl);
            }
            track.attach(vidEl[0]);

            const user = this.conference.getParticipantById(participantId);
            let camNames = user.getProperty('arenaCameraName');
            if (!camNames) camNames = user.getDisplayName();
            if (!camNames) return; // handle jitsi-only users that have not set the display name

            if (camNames.includes(data.screensharePrefix)) {
                let dn = user.getProperty('screenshareDispName');
                if (!dn) dn = user.getDisplayName();
                if (!dn) dn = `No Name #${participantId}`;
                const camName = user.getProperty('screenshareCamName');
                let objectIds = user.getProperty('screenshareObjIds');

                if (camName && objectIds) {
                    sceneEl.emit(JITSI_EVENTS.SCREENSHARE, {
                        jid: participantId,
                        id: participantId,
                        dn,
                        cn: camName,
                        scene: this.arena.namespacedScene,
                        src: EVENT_SOURCES.JITSI,
                    });
                    objectIds = objectIds.split(',');

                    // handle screen share video
                    for (let i = 0; i < objectIds.length; i++) {
                        if (objectIds[i]) {
                            const video = $(`#${videoId}`);
                            video.on('loadeddata', () => {
                                this.updateScreenShareObject(objectIds[i], videoId, participantId);
                            });
                        }
                    }
                } else {
                    // display as external user; possible spoofer
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                        jid: participantId,
                        id: participantId,
                        dn,
                        cn: undefined,
                        scene: this.arena.namespacedScene,
                        src: EVENT_SOURCES.JITSI,
                    });
                    return;
                }
            }
        }

        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
            console.debug(`Audio Level remote: ${audioLevel}`)
        );
        track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () => {
            console.debug('remote track stopped');
        });
        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
            console.debug(`track audio output device was changed to ${deviceId}`)
        );
        // track.addEventListener(
        //     JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        //     () => {
        //         console.log('remote track muted')
        //     });
    },

    /**
     * This function is executed when the this.conference is joined
     */
    onConferenceJoined() {
        const { el } = this;

        const { sceneEl } = el;

        console.debug('Joined conf! localTracks.length: ', this.localTracks.length);

        if (this.localTracks.length === 0) {
            console.debug('NO LOCAL TRACKS but UserId is: ', this.conference.myUserId());
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

        this.initialized = true;

        sceneEl.emit(JITSI_EVENTS.CONNECTED, {
            scene: this.arena.namespacedScene,
            pl,
        });
    },

    /**
     * Called when user joins
     * @param {string} id
     */
    async onUserJoined(id) {
        const { data } = this;
        const { el } = this;

        const { sceneEl } = el;

        console.debug('New user joined:', id, this.conference.getParticipantById(id).getDisplayName());
        this.remoteTracks[id] = [null, null]; // create an array to hold tracks of new user

        const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
        const arenaDisplayName = this.conference.getParticipantById(id).getProperty('arenaDisplayName');
        const arenaCameraName = this.conference.getParticipantById(id).getProperty('arenaCameraName');
        if (arenaId && arenaDisplayName && arenaCameraName) {
            // emit user joined event in the off chance we know all properties of this arena user
            sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                jid: id,
                id: arenaId,
                dn: arenaDisplayName,
                cn: arenaCameraName,
                scene: this.arena.namespacedScene,
                src: EVENT_SOURCES.JITSI,
            });
        } else {
            let dn = this.conference.getParticipantById(id).getDisplayName(); // get display name
            if (!dn) dn = `No Name #${id}`; // jitsi user that did not set his display name

            // user join event args, to be emited below
            const userJoinedArgs = {
                jid: id,
                id,
                dn,
                cn: undefined,
                scene: this.arena.namespacedScene,
                src: EVENT_SOURCES.JITSI,
            };

            // this might be a jitsi-only user; emit event if name does not have the arena tag
            if (!dn.includes(data.arenaUserPrefix)) {
                if (!dn.includes(data.screensharePrefix)) {
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, userJoinedArgs);
                }
            } else {
                this.newUserTimers[id] = setTimeout(() => {
                    // emit event anyway in newUserTimeoutMs if we dont hear from this user
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, userJoinedArgs);
                }, data.newUserTimeoutMs);
            }
        }
    },

    /**
     * Called when user leaves
     * @param {string} id user Id
     * @param {object} user user object (JitsiParticipant)
     */
    onUserLeft(id, user) {
        const { el } = this;

        const { sceneEl } = el;

        console.debug('user left:', id);

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
        sceneEl.emit(JITSI_EVENTS.USER_LEFT, {
            jid: id,
            id: arenaId,
            src: EVENT_SOURCES.JITSI,
        });
    },

    /**
     * Called when dominant speaker changes.
     * @param {string} id user Id
     */
    onDominantSpeakerChanged(id) {
        const { el } = this;

        const { sceneEl } = el;

        // console.log(`(conference) Dominant Speaker ID: ${id}`);
        this.prevActiveSpeaker = this.activeSpeaker;
        this.activeSpeaker = id;

        let actArenaId;
        let prevArenaId;

        const actJitsiId = this.conference.getParticipantById(this.activeSpeaker);
        if (actJitsiId) actArenaId = actJitsiId.getProperty('arenaId');

        const prevJitsiId = this.conference.getParticipantById(this.prevActiveSpeaker);
        if (prevJitsiId) prevArenaId = prevJitsiId.getProperty('arenaId');

        sceneEl.emit(JITSI_EVENTS.DOMINANT_SPEAKER_CHANGED, {
            id: actArenaId,
            pid: prevArenaId,
            scene: this.conferenceName,
            src: EVENT_SOURCES.JITSI,
        });
    },

    /**
     * This function is called when connection is established successfully
     */
    onConnectionSuccess() {
        const { data, el } = this;

        const { sceneEl } = el;

        console.info('Conference server connected!');
        this.conference = this.connection.initJitsiConference(this.conferenceName, this.confOptions);

        this.conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.onRemoteTrack);
        this.conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
            console.debug(`track removed!!!${track}`);
        });
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.onConferenceJoined);
        this.conference.on(JitsiMeetJS.events.conference.USER_JOINED, this.onUserJoined);
        this.conference.on(JitsiMeetJS.events.conference.USER_LEFT, this.onUserLeft);
        this.conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, this.onDominantSpeakerChanged);
        this.conference.on(JitsiMeetJS.events.conference.TALK_WHILE_MUTED, () => {
            console.debug(`Talking on mute detected!`);
            sceneEl.emit(JITSI_EVENTS.TALK_WHILE_MUTED, true);
        });
        this.conference.on(JitsiMeetJS.events.conference.NOISY_MIC, () => {
            console.debug(`Non-speech noise detected on microphone.`);
            sceneEl.emit(JITSI_EVENTS.NOISY_MIC, true);
        });
        this.conference.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (userID, displayName) =>
            console.debug(`${userID} - ${displayName}`)
        );
        this.conference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (userID, audioLevel) =>
            console.debug(`${userID} - ${audioLevel}`)
        );
        // this.conference.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
        //     console.debug(`${conference.getPhoneNumber()} - ${conference.getPhonePin()}`)
        // );
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, this.onConferenceError);
        this.conference.on(JitsiMeetJS.events.conference.CONFERENCE_ERROR, this.onConferenceError);
        this.conference.on(JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED, (stats) => {
            this.updateUserStatus();
            this.conference.sendEndpointStatsMessage(stats); // send to remote
            sceneEl.emit(JITSI_EVENTS.STATS_LOCAL, {
                jid: this.jitsiId,
                id: this.arena.idTag,
                stats,
            });
        });
        this.conference.on(JitsiMeetJS.events.connectionQuality.REMOTE_STATS_UPDATED, (id, stats) => {
            const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
            sceneEl.emit(JITSI_EVENTS.STATS_REMOTE, {
                jid: id,
                id: arenaId,
                stats,
            });
        });
        this.conference.on(JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED, (id, statusPayload) => {
            sceneEl.emit(JITSI_EVENTS.STATUS, statusPayload);
        });

        // set the ARENA user's name with a "unique" ARENA tag
        this.conference.setDisplayName(`${this.arena.displayName} (${data.arenaUserPrefix}_${this.arena.idTag})`);

        // set local properties
        this.conference.setLocalParticipantProperty('arenaId', this.arena.idTag);
        this.conference.setLocalParticipantProperty('arenaDisplayName', this.arena.displayName);
        this.conference.setLocalParticipantProperty('arenaCameraName', this.arena.camName);

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
                        delete this.newUserTimers[id];
                        // emit new user event
                        sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                            jid: id,
                            id: arenaId,
                            dn: arenaDisplayName,
                            cn: arenaCameraName,
                            scene: this.conferenceName,
                            src: EVENT_SOURCES.JITSI,
                        });
                    }
                }
            }
        );

        this.conference.join(); // this.conference.join(password);
        this.health.removeError('connection.connectionFailed');
    },

    updateUserStatus() {
        const { el } = this;

        const { sceneEl } = el;

        const statusPayload = {
            jid: this.jitsiId,
            id: this.arena.idTag,
            status: {
                role: this.conference.getRole(),
            },
        };
        this.conference.sendEndpointMessage('', statusPayload);
        sceneEl.emit(JITSI_EVENTS.STATUS, statusPayload);
    },

    /**
     * Called for conference errors/failures
     * @param {*} err
     */
    onConferenceError(err) {
        const { el } = this;

        const { sceneEl } = el;

        console.error(`Conference error ${err}!`);
        sceneEl.emit(JITSI_EVENTS.CONFERENCE_ERROR, {
            errorCode: err,
        });
        this.health.addError(err);
    },

    /**
     * This function is called when the this.connection fails.
     */
    onConnectionFailed() {
        const { el } = this;

        const { sceneEl } = el;

        const err = 'connection.connectionFailed';
        console.error('Conference server connection failed!');
        sceneEl.emit(JITSI_EVENTS.CONFERENCE_ERROR, {
            errorCode: err,
        });
        this.health.addError(err);
    },

    /**
     * This function is called when device list changes
     * @param {object} devices List of devices
     */
    onDeviceListChanged(devices) {
        console.info('current devices', devices);
    },

    /**
     * This function is called when we disconnect.
     */
    disconnect() {
        console.warn('Conference server disconnected!');
        this.connection.removeEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            this.onConnectionSuccess
        );
        this.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.onConnectionFailed);
        this.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);
    },

    /**
     * called on unload; release tracks, leave this.conference
     */
    unload() {
        for (let i = 0; i < this.localTracks.length; i++) {
            this.localTracks[i].dispose();
        }
        if (this.conference) this.conference.leave();
        if (this.connection) this.connection.disconnect();
    },

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
            deviceOpts.constraints = {
                video: {
                    aspectRatio: 2,
                    height: {
                        ideal: 1920,
                        max: 1920,
                        min: 960,
                    },
                    width: {
                        ideal: 3840,
                        max: 3840,
                        min: 1920,
                    },
                },
            };
        }

        try {
            let vidConstraint = true;
            if (prefVideoInput) {
                vidConstraint = { deviceId: { exact: prefVideoInput } };
                try {
                    await navigator.mediaDevices.getUserMedia({ video: vidConstraint });
                    deviceOpts.cameraDeviceId = prefVideoInput;
                } catch {
                    await navigator.mediaDevices.getUserMedia({ video: true });
                }
            } else {
                await navigator.mediaDevices.getUserMedia({ video: true });
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
            } */
        }
        this.avConnected = true;

        if (!ARENA.params.armode) {
            JitsiMeetJS.createLocalTracks({ devices, ...deviceOpts })
                .then(async (tracks) => {
                    await this.onLocalTracks(tracks);
                    if (this.withVideo) this.setupCornerVideo.bind(this)();
                    this.stopVideo();
                })
                .catch((err) => {
                    this.initialized = false;
                    console.warn(err);
                });
        }
    },

    /**
     * show user video in the corner
     */
    setupCornerVideo() {
        let localVideoWidth = window.matchMedia('(max-width: 1024px)').matches ? Number(window.innerWidth / 5) : 300;

        // video window for jitsi
        this.jitsiVideoElem = document.getElementById('cornerVideo');
        this.jitsiVideoElem.classList.add('flip-video');
        this.jitsiVideoElem.classList.add('arena-corner-video');
        this.jitsiVideoElem.style.opacity = '0.9'; // slightly see through
        this.jitsiVideoElem.style.display = 'none';

        /**
         * set video element size
         */
        function setCornerVideoHeight() {
            const videoWidth = localVideoWidth;
            const videoHeight = this.jitsiVideoElem.videoHeight / (this.jitsiVideoElem.videoWidth / videoWidth);
            this.jitsiVideoElem.style.width = `${videoWidth}px`;
            this.jitsiVideoElem.style.height = `${videoHeight}px`;
        }

        this.jitsiVideoElem.onloadedmetadata = setCornerVideoHeight.bind(this);

        // mobile only
        window.addEventListener('orientationchange', () => {
            localVideoWidth = Number(window.innerWidth / 5);
            setCornerVideoHeight();
        });
    },

    /**
     * Show the client user's video
     */
    showVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'block';
    },

    /**
     * Hide the client user's video
     */
    hideVideo() {
        if (this.jitsiVideoElem) this.jitsiVideoElem.style.display = 'none';
    },

    /**
     * Getter for the client users Jitsi Id
     * @return {string} The Jitsi Id
     */
    getJitsiId() {
        return this.jitsiId;
    },

    /**
     * Has the active speaker changed
     * @return {boolean} if the active speaker has changed
     */
    activeSpeakerChanged() {
        return this.prevActiveSpeaker !== this.activeSpeaker;
    },

    /**
     * Begin the audio feed
     * @return {*} Promise for the track unmute
     */
    unmuteAudio() {
        return new Promise((resolve, reject) => {
            if (this.jitsiAudioTrack) {
                this.jitsiAudioTrack
                    .unmute()
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
        });
    },

    /**
     * End the audio feed
     * @return {*} Promise for the track mute
     */
    muteAudio() {
        return new Promise((resolve, reject) => {
            if (this.jitsiAudioTrack) {
                this.jitsiAudioTrack
                    .mute()
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
        });
    },

    /**
     * Begin the video feed
     * @return {*} Promise for the track unmute
     */
    startVideo() {
        return new Promise((resolve, reject) => {
            if (this.jitsiVideoTrack) {
                this.jitsiVideoTrack
                    .unmute()
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
        });
    },

    /**
     * End the video feed
     * @return {*} Promise for the track mute
     */
    stopVideo() {
        return new Promise((resolve, reject) => {
            if (this.jitsiVideoTrack) {
                this.jitsiVideoTrack
                    .mute()
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
        });
    },

    /**
     * Getter for the audio feed by jisti id
     * @param {*} jitsiId The jitsi user id
     * @return {*} remote track object
     */
    getAudioTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][0];
        }
        return null;
    },

    /**
     * Getter for the video feed by jisti id
     * @param {*} jitsiId The jitsi user id
     * @return {*} remote track object
     */
    getVideoTrack(jitsiId) {
        if (this.remoteTracks[jitsiId]) {
            return this.remoteTracks[jitsiId][1];
        }
        return null;
    },

    /**
     * Set received resolution of remote video. Used to prioritize high, medium, low, drop
     * resolution. Can be expanded. Individual resolution per ID overwrites previous calls to
     * setReceiverConstraints. Setting the order of these id arrays is important. Examples at:
     * https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md
     * @param {*} panoIds Array of jitsi ids panoramic, first is 'on-stage', others get lower res.
     * @param {*} constraints ID and resolution value object to update.
     */
    setResolutionRemotes(panoIds = [], constraints = {}) {
        const videoConstraints = {};
        videoConstraints.colibriClass = 'ReceiverVideoConstraints';
        // The endpoint ids of the participants that are prioritized up to a higher resolution.
        try {
            videoConstraints.onStageSources = panoIds;
        } catch (error) {
            console.error(`Upgrade to latest Jitsi, older API is causing: ${error}`);
            videoConstraints.onStageEndpoints = panoIds;
        }
        videoConstraints.constraints = constraints;
        this.conference.setReceiverConstraints(videoConstraints);
    },

    setDefaultResolutionRemotes(resolution) {
        const videoConstraints = {};
        videoConstraints.colibriClass = 'ReceiverVideoConstraints';
        videoConstraints.defaultConstraints = {
            maxHeight: resolution,
        };
        this.conference.setReceiverConstraints(videoConstraints);
    },

    /**
     * Remove a user from the conference
     * @param {*} participantJitsiId The user to kick out
     * @param {*} msg The message for the user
     */
    kickout(participantJitsiId, msg) {
        if (this.conference) {
            this.conference.kickParticipant(participantJitsiId, msg);
        }
    },

    /**
     * Disconnect from the conference
     */
    leave() {
        this.unload();
        this.disconnect();
    },

    /**
     *
     * @param {*} participantJitsiId
     * @returns
     */
    getUserId(participantJitsiId) {
        if (this.jitsiId === participantJitsiId) return this.arena.camName;
        // our arena id (camera name) is the jitsi display name
        return this.conference.getParticipantById(participantJitsiId)._displayName;
    },

    /**
     *
     * @param {*} participantJitsiId
     * @param {*} property
     * @returns
     */
    getProperty(participantJitsiId, property) {
        return this.conference.getParticipantById(participantJitsiId).getProperty(property);
    },

    /**
     * Get color based on 0-100% connection quality.
     * @param {int} quality Connection Quality
     * @return {string} Color string
     */
    getConnectionColor(quality) {
        if (quality > 66.7) {
            return 'green';
        }
        if (quality > 33.3) {
            return 'orange';
        }
        if (quality > 0) {
            return 'gold';
        }
        return 'red';
    },

    /**
     * Get readable video stats.
     * @param {string} name The display name of the user
     * @param {Object} stats The jisti video stats object if any
     * @param {Object} status The jisti video status object if any
     * @return {string} Readable stats
     */
    getConnectionText(name, stats, status) {
        const lines = [];
        let sendmax = '';
        lines.push(`Name: ${name}`);
        if (status && status.role) {
            lines.push(`Jitsi Role: ${status.role}`);
        }
        if (stats.conn) {
            lines.push(`Quality: ${Math.round(stats.conn.connectionQuality)}%`);
            if (stats.conn.bitrate) {
                lines.push(`Bitrate: ↓${stats.conn.bitrate.download} ↑${stats.conn.bitrate.upload} Kbps`);
            }
            if (stats.conn.packetLoss) {
                lines.push(`Loss: ↓${stats.conn.packetLoss.download}% ↑${stats.conn.packetLoss.upload}%`);
            }
            if (stats.conn.jvbRTT) {
                lines.push(`RTT: ${stats.conn.jvbRTT} ms`);
            }
            if (stats.conn.maxEnabledResolution) {
                sendmax = ` (max↑ ${stats.conn.maxEnabledResolution}p)`;
            }
        }
        if (stats.resolution) {
            lines.push(`Video: ${this._extractResolutionString(stats)}${sendmax}`);
        }
        if (stats.codec) {
            lines.push(`Codecs (A/V): ${this._extractCodecs(stats)}`);
        }
        return lines.join('\r\n');
    },

    // From https://github.com/jitsi/jitsi-meet/blob/master/react/features/video-menu/components/native/ConnectionStatusComponent.js
    /**
     * Extracts the resolution and framerate.
     *
     * @param {Object} stats - Connection stats from the library.
     * @private
     * @return {string}
     */
    _extractResolutionString(stats) {
        const { framerate, resolution } = stats;

        const resolutionString =
            Object.keys(resolution || {})
                .map((ssrc) => {
                    const { width, height } = resolution[ssrc];

                    return `${width}x${height}`;
                })
                .join(', ') || null;

        const frameRateString =
            Object.keys(framerate || {})
                .map((ssrc) => framerate[ssrc])
                .join(', ') || null;

        return resolutionString && frameRateString ? `${resolutionString}@${frameRateString}fps` : undefined;
    },

    /**
     * Extracts the audio and video codecs names.
     *
     * @param {Object} stats - Connection stats from the library.
     * @private
     * @return {string}
     */
    _extractCodecs(stats) {
        const { codec } = stats;

        let codecString;

        // Only report one codec, in case there are multiple for a user.
        Object.keys(codec || {}).forEach((ssrc) => {
            const { audio, video } = codec[ssrc];

            codecString = `${audio}, ${video}`;
        });

        return codecString;
    },

    initOptions: {
        disableAudioLevels: true,
    },

    // Connection recommendations and specs:
    // https://jitsi-club.gitlab.io/jitsi-self-hosting/en/01-deployment-howto/03-tuning/
    // https://github.com/jitsi/jitsi-meet/blob/master/config.js
    confOptions: {
        openBridgeChannel: true,
        enableTalkWhileMuted: true,
        enableNoisyMicDetection: true,
        p2p: {
            enabled: false,
        },

        // https://jitsi.org/blog/new-off-stage-layer-suppression-feature/
        // Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth
        enableLayerSuspension: true,

        // https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md.
        useNewBandwidthAllocationStrategy: true,
    },
});
