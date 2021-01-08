/**
 * @fileoverview Jitsi API for the ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global AFRAME, ARENA, JitsiMeetJS */

import $ from "jquery";
import swal from 'sweetalert';
import {ARENAEventEmitter} from './event-emitter.js';

export const ARENAJitsiAPI = async function(jitsiServer) {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================

    // we use the scene name as the jitsi room name, handle RFC 3986 reserved chars as = '_'
    const arenaConferenceName = globals.scenenameParam.toLowerCase().replace(/[!#$&'()*+,\/:;=?@[\]]/g, '_');

    const connectOptions = {
        hosts: {
            domain: jitsiServer,
            muc: 'conference.' + jitsiServer, // FIXME: use XEP-0030
        },
        bosh: '//' + jitsiServer + '/http-bind', // FIXME: use xep-0156 for that

        // The name of client node advertised in XEP-0115 'c' stanza
        clientNode: 'http://jitsi.org/jitsimeet',
    };

    // TODO: is this how to p2p.enabled false? https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/API.md
    const confOptions = {
        openBridgeChannel: true,
        p2p: {enabled: false},
    };

    const initOptions = {
        disableAudioLevels: true,
    };

    let connection = null;
    let conference = null;
    let isJoined = false;

    let avConnected = false;
    let withVideo = false;

    let jitsiId = null;

    let chromeSpatialAudioOn = null;
    let localTracks = []; // just our set of audio,video tracks
    const remoteTracks = {}; // map of arrays of tracks

    let jitsiAudioTrack = null;
    let jitsiVideoTrack = null;
    let jitsiVideoElem = null;
    let prevActiveSpeaker = null;
    let activeSpeaker = null;

    let hasAudio = false;
    let hasVideo = false;

    const SCREENSHARE_PREFIX = '#5cr33n5h4r3'; // unique prefix for screenshare clients
    const screenShareDict = {};

    const ARENA_USER = '#4r3n4'; // unique arena client "tag"

    const NEW_USER_TIMEOUT_MS = 2000;

    /**
     * list of timers to send new user notifications; when a user enters jitsi, there is some delay until other
     * participants receive data about its properties (e.g. arenaDisplayName and arenaUserName).
     * we wait NEW_USER_TIMEOUT_MS to hear about these in case it is an arena user and notify anyway after this timeout
     */
    const newUserTimers = [];
    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================

    /**
     * Called when user joins
     * @param {string} participantId Participant id
     * @param {string} trackType track type ('audio'/'video')
     */
    function connectArena(participantId, trackType) {
        jitsiId = participantId;
        console.log('connectArena: ' + participantId, trackType);
    }

    /**
     * Handles local tracks.
     * @param {[]} tracks Array with JitsiTrack objects
     */
    function onLocalTracks(tracks) {
        localTracks = tracks;

        for (let i = 0; i < localTracks.length; i++) {
            const track = localTracks[i];
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
                // $('body').append(`<video autoplay='1' id='localVideo${i}' />`);

                // instead use already defined e.g. <video id="localVideo" ...>
                track.attach($(`#localVideo`)[0]);
                jitsiVideoTrack = track;
            } else if (track.getType() === 'audio') {
                // $('body').append(`<audio autoplay='1' muted='true' id='localAudio${i}' />`);

                // instead use already defined in index.html <audio id="aud0" ...>
                //            track.attach($(`#aud0`)[0]);
                jitsiAudioTrack = track;
            }
            if (isJoined) {
                // mobile only?
                conference.addTrack(track);
                connectArena(conference.myUserId(), track.getType());
            }
        }
        if (jitsiAudioTrack) jitsiAudioTrack.mute();
        if (jitsiVideoTrack) jitsiVideoTrack.mute();
    }

    /**
     * Update screen share object
     * @param {string} screenShareId JitsiTrack object
     * @param {string} videoId Jitsi video Id
     * @param {string} participantId Jitsi participand Id
     * @return {object} screenShare scene object
     */
    function updateScreenShareObject(screenShareId, videoId, participantId) {
        if (!screenShareId) return;

        let screenShareEl = ARENA.sceneObjects[screenShareId];
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
            ARENA.sceneObjects[screenShareId] = screenShareEl;
        }
        screenShareEl.setAttribute('muted', 'false');
        screenShareEl.setAttribute('autoplay', 'true');
        screenShareEl.setAttribute('playsinline', 'true');
        screenShareEl.setAttribute('material', 'src', `#${videoId}`);
        screenShareDict[participantId] = screenShareEl;
        return screenShareEl;
    }

    /**
     * Handles remote tracks
     * @param {object} track JitsiTrack object
     */
    async function onRemoteTrack(track) {
        if (track.isLocal()) {
            return;
        }
        const participantId = track.getParticipantId();

        if (!remoteTracks[participantId]) {
            // new participantId
            remoteTracks[participantId] = [null, null]; // create array to hold their tracks
        }

        if (track.getType() == 'audio') {
            if (remoteTracks[participantId][0]) {
                remoteTracks[participantId][0].dispose();
            }
            remoteTracks[participantId][0] = track;
        } else if (track.getType() == 'video') {
            if (remoteTracks[participantId][1]) {
                remoteTracks[participantId][1].dispose();
            }
            remoteTracks[participantId][1] = track;
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

        const videoId = `video${participantId}`;

        // create HTML video elem to store video
        if (!document.getElementById(videoId)) {
            // create
            $('a-assets').append(`<video autoplay='1' id='${videoId}'/>`);
        }
        track.attach($(`#${videoId}`)[0]);

        const user = conference.getParticipantById(participantId);
        let camNames = user.getProperty('arenaCameraName');
        if (!camNames) camNames = user.getDisplayName();
        if (!camNames) return; // handle jitsi-only users that have not set the display name

        if (camNames.includes(SCREENSHARE_PREFIX)) {
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
                    scene: arenaConferenceName,
                    src: ARENAEventEmitter.sources.JITSI,
                });
                objectIds = objectIds.split(',');

                // handle screen share video
                for (let i = 0; i < objectIds.length; i++) {
                    if (objectIds[i]) {
                        const video = $(`#${videoId}`);
                        video.on('loadeddata', (e) => {
                            updateScreenShareObject(objectIds[i], videoId, participantId);
                        });
                    }
                }
            } else { // display as external user; possible spoofer
                ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                    id: participantId,
                    dn: dn,
                    cn: undefined,
                    scene: arenaConferenceName,
                    src: ARENAEventEmitter.sources.JITSI,
                });
                return;
            }
        }
    }

    /**
     * This function is executed when the conference is joined
     */
    function onConferenceJoined() {
        isJoined = true;
        console.log('Joined conf! localTracks.length: ', localTracks.length);

        if (localTracks.length == 0) {
            console.log('NO LOCAL TRACKS but UserId is: ', conference.myUserId());
            connectArena(conference.myUserId(), '');
        } else {
            for (let i = 0; i < localTracks.length; i++) {
                track = localTracks[i];
                conference.addTrack(track);
                // connect to ARENA; draw media button(s)
                connectArena(conference.myUserId(), track.getType()); // desktop only?
            }
        }

        // create participant list and emit jitsi connect event
        const pl = [];
        conference.getParticipants().forEach((user) => {
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
            scene: arenaConferenceName,
            pl: pl,
        });
    }

    /**
     * Called when user joins
     * @param {string} id
     */
    async function onUserJoined(id) {
        console.log('New user joined:', id, conference.getParticipantById(id).getDisplayName());
        remoteTracks[id] = [null, null]; // create an array to hold tracks of new user

        const arenaId = conference.getParticipantById(id).getProperty('arenaId');
        const arenaDisplayName = conference.getParticipantById(id).getProperty('arenaDisplayName');
        const arenaCameraName = conference.getParticipantById(id).getProperty('arenaCameraName');
        if (arenaId && arenaDisplayName && arenaCameraName) {
            // emit user joined event in the off chance we know all properties of this arena user
            ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                id: arenaId,
                dn: arenaDisplayName,
                cn: arenaCameraName,
                scene: arenaConferenceName,
                src: ARENAEventEmitter.sources.JITSI,
            });
        } else {
            // this might be a jitsi-only user; emit event if name does not have the arena tag
            let dn = conference.getParticipantById(id).getDisplayName();
            if (!dn) dn = `No Name #${id}`; // jitsi user that did not set his display name
            if (!dn.includes(ARENA_USER)) {
                if (!dn.includes(SCREENSHARE_PREFIX)) {
                    ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                        id: id,
                        dn: dn,
                        cn: undefined,
                        scene: arenaConferenceName,
                        src: ARENAEventEmitter.sources.JITSI,
                    });
                }
            } else {
                newUserTimers[id] = setTimeout(() => {
                    // emit event anyway in NEW_USER_TIMEOUT_MS if we dont hear from this user
                    ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                        id: id,
                        dn: dn,
                        cn: undefined,
                        scene: arenaConferenceName,
                        src: ARENAEventEmitter.sources.JITSI,
                    });
                }, NEW_USER_TIMEOUT_MS);
            }
        }
    }

    /**
     * Called when user leaves
     * @param {string} id user Id
     * @param {object} user user object (JitsiParticipant)
     */
    function onUserLeft(id, user) {
        console.log('user left:', id);
        let arenaId = user.getProperty('arenaId');
        if (!arenaId) arenaId = id; // this was a jitsi-only user

        if (!remoteTracks[id]) return;
        const screenShareEl = screenShareDict[id];
        if (screenShareEl) {
            screenShareEl.setAttribute('material', 'src', null);
            delete screenShareDict[id];
        }
        $(`#video${id}`).remove();
        delete remoteTracks[id];

        // emit user left event
        ARENA.events.emit(ARENAEventEmitter.events.USER_LEFT, {
            id: arenaId,
            src: ARENAEventEmitter.sources.JITSI,
        });
    }

    /**
     * This function is called when connection is established successfully
     */
    function onConnectionSuccess() {
        conference = connection.initJitsiConference(arenaConferenceName, confOptions);

        conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
        conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
            console.log(`track removed!!!${track}`);
        });
        conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
        conference.on(JitsiMeetJS.events.conference.USER_JOINED, onUserJoined);
        conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
        conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
            console.log(`(conference) Dominant Speaker ID: ${id}`);
            prevActiveSpeaker = activeSpeaker;
            activeSpeaker = id;
        });
        conference.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (userID, displayName) =>
            console.log(`${userID} - ${displayName}`),
        );
        conference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (userID, audioLevel) =>
            console.log(`${userID} - ${audioLevel}`),
        );
        conference.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
            console.log(`${conference.getPhoneNumber()} - ${conference.getPhonePin()}`),
        );

        // set the ARENA user's name with a "unique" ARENA tag
        conference.setDisplayName(ARENA.displayName + ` (${ARENA_USER}_${ARENA.idTag})`);

        // set local properties
        conference.setLocalParticipantProperty('arenaId', ARENA.idTag);
        conference.setLocalParticipantProperty('arenaDisplayName', ARENA.displayName);
        conference.setLocalParticipantProperty('arenaCameraName', ARENA.camName);

        conference.on(
            JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
            (user, propertyKey, oldPropertyValue, propertyValue) => {
                // console.log(`Property changed: ${user.getId()} ${propertyKey} ${propertyValue} ${oldPropertyValue}`);
                const id = user.getId();
                if (
                    propertyKey === 'arenaId' ||
                    propertyKey === 'arenaDisplayName' ||
                    propertyKey === 'arenaCameraName'
                ) {
                    const arenaId = conference.getParticipantById(id).getProperty('arenaId');
                    const arenaDisplayName = conference.getParticipantById(id).getProperty('arenaDisplayName');
                    const arenaCameraName = conference.getParticipantById(id).getProperty('arenaCameraName');
                    if (arenaId && arenaDisplayName && arenaCameraName) {
                        // clear timeout for new user notification
                        clearInterval(newUserTimers[id]);
                        delete(newUserTimers[id]);
                        // emit new user event
                        ARENA.events.emit(ARENAEventEmitter.events.USER_JOINED, {
                            id: arenaId,
                            dn: arenaDisplayName,
                            cn: arenaCameraName,
                            scene: arenaConferenceName,
                            src: ARENAEventEmitter.sources.JITSI,
                        });
                    }
                }
            },
        );

        conference.join(); // conference.join(password);

        chromeSpatialAudioOn = AFRAME.utils.device.isMobile();
        if (!chromeSpatialAudioOn) {
            // only tested and working on mac on chrome
            navigator.mediaDevices.enumerateDevices().then(function(devices) {
                const headphonesConnected = devices
                    .filter((device) => /audio\w+/.test(device.kind))
                    .find((device) => device.label.toLowerCase().includes('head'));
                chromeSpatialAudioOn = !!headphonesConnected;
            });
        }
    }

    /**
     * This function is called when the connection fails.
     */
    function onConnectionFailed() {
        console.error('Connection Failed!');
    }

    /**
     * This function is called when device list changes
     * @param {object} devices List of devices
     */
    function onDeviceListChanged(devices) {
        console.info('current devices', devices);
    }

    /**
     * This function is called when we disconnect.
     */
    function disconnect() {
        console.log('disconnected!');
        connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
        connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
        connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);
    }

    /**
     * called on unload; release tracks, leave conference
     */
    function unload() {
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].dispose();
        }
        if (conference) conference.leave();
        if (connection) connection.disconnect();
    }

    $(window).bind('beforeunload', unload);
    $(window).bind('unload', unload);

    JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

    JitsiMeetJS.mediaDevices.addEventListener(JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED, onDeviceListChanged);

    // ==================================================
    // MAIN START
    // ==================================================
    JitsiMeetJS.init(initOptions);

    connection = new JitsiMeetJS.JitsiConnection(null, null, connectOptions);
    connection.addEventListener(JitsiMeetJS.events.connection.DOMINANT_SPEAKER_CHANGED, (id) =>
        console.log(`(connection) Dominant Speaker ID: ${id}`),
    );
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);
    connection.connect();

    /**
     * Connect audio and video and start sending local tracks
     * @return {promise}
     */
    function avConnect() {
        return new Promise(async function(resolve, reject) {
            if (avConnected) {
                resolve();
                return;
            }

            const devices = ['audio'];
            try {
                await navigator.mediaDevices.getUserMedia({video: true});
                devices.push('video');
                withVideo = true;
            } catch (e) {
                const vidbtn = document.getElementById('btn-video-off');
                if (vidbtn) vidbtn.remove();
                const audbtn = document.getElementById('btn-audio-off');
                if (audbtn) audbtn.remove();
                swal({
                    title: 'No Webcam or Audio Input Device found!',
                    text: `You are now in "spectator mode". This means you won\'t be able to share audio or video,
                            but can still interact with other users in the ARENA.`,
                    icon: 'warning',
                });
            }
            avConnected = true;

            JitsiMeetJS.createLocalTracks({devices})
                .then((tracks) => {
                    onLocalTracks(tracks);
                    if (withVideo) setupLocalVideo();
                    resolve();
                })
                .catch((err) => {
                    isJoined = false;
                    console.warn(err);
                    reject(err);
                });

            /**
             * show user video on the corner
             */
            function setupLocalVideo() {
                // video window for jitsi
                jitsiVideoElem = document.getElementById('localVideo');
                jitsiVideoElem.style.display = 'none';
                jitsiVideoElem.style.position = 'absolute';
                jitsiVideoElem.style.top = '15px';
                jitsiVideoElem.style.left = '15px';
                jitsiVideoElem.style.borderRadius = '10px';
                jitsiVideoElem.style.opacity = 0.95; // slightly see through
                jitsiVideoElem.setAttribute('width', ARENA.localVideoWidth);

                /**
                 * set video element size
                 */
                function setupCornerVideo() {
                    const videoHeight = jitsiVideoElem.videoHeight /
                                            (jitsiVideoElem.videoWidth / ARENA.localVideoWidth);
                    jitsiVideoElem.setAttribute('height', videoHeight);
                }

                jitsiVideoElem.onloadedmetadata = () => {
                    setupCornerVideo();
                };

                window.addEventListener('orientationchange', () => {
                    // mobile only
                    ARENA.localVideoWidth = Number(window.innerWidth / 5);
                    this.stopVideo();
                    setupCornerVideo();
                    this.startVideo();
                });
            }
        });
    }

    avConnect();

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        serverName: jitsiServer,

        screenSharePrefix: SCREENSHARE_PREFIX,

        // conference event constants (so other modules can use these without importing jitsiMeetJS)
        events: JitsiMeetJS.events.conference,

        ready: function() {
            return isJoined;
        },

        showVideo: function() {
            if (jitsiVideoElem) jitsiVideoElem.style.display = 'block';
        },

        hideVideo: function() {
            if (jitsiVideoElem) jitsiVideoElem.style.display = 'none';
        },

        getJitsiId: function() {
            return jitsiId;
        },

        activeSpeakerChanged: function() {
            return prevActiveSpeaker !== activeSpeaker;
        },

        activeSpeaker: function() {
            return activeSpeaker;
        },

        chromeSpatialAudioOn: function() {
            return chromeSpatialAudioOn;
        },

        unmuteAudio: function() {
            return new Promise(function(resolve, reject) {
                if (jitsiAudioTrack) {
                    jitsiAudioTrack.unmute()
                        .then(() => {
                            hasAudio = true;
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

        muteAudio: function() {
            return new Promise(function(resolve, reject) {
                if (jitsiAudioTrack) {
                    jitsiAudioTrack.mute()
                        .then(() => {
                            hasAudio = false;
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

        startVideo: function() {
            return new Promise(function(resolve, reject) {
                if (jitsiVideoTrack) {
                    jitsiVideoTrack.unmute()
                        .then(() => {
                            hasVideo = true;
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

        stopVideo: function() {
            return new Promise(function(resolve, reject) {
                if (jitsiVideoTrack) {
                    jitsiVideoTrack.mute()
                        .then(() => {
                            hasVideo = false;
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

        hasAudio: function() {
            return hasAudio;
        },

        hasVideo: function() {
            return hasVideo;
        },

        getAudioTrack: function(jitsiId) {
            return remoteTracks[jitsiId] && remoteTracks[jitsiId][0];
        },

        getVideoTrack: function(jitsiId) {
            return remoteTracks[jitsiId] && remoteTracks[jitsiId][1];
        },

        leave: function() {
            unload();
            disconnect();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        getUserId: function(participantJitsiId) {
            if (jitsiId == participantJitsiId) return ARENA.camName;
            // our arena id (camera name) is the jitsi display name
            return conference.getParticipantById(participantJitsiId)._displayName;
        },

        getProperty: function(participantJitsiId, property) {
            return conference.getParticipantById(participantJitsiId).getProperty(property);
        },
    };
};
