/* global $, JitsiMeetJS */

const ARENAJitsiAPI = (async function(jitsiServer) {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================

    // These match config info on Jitsi Meet server (oz.andrew.cmu.edu)
    // in lines 7-37 of file /etc/jitsi/meet/oz.andrew.cmu.edu-config.js
    const arenaConferenceName = globals.scenenameParam.toLowerCase();

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
    let isJoined = false;
    let conference = null;

    let jitsiId = null;

    let chromeSpatialAudioOn = null;
    let localTracks = []; // just our set of audio,video tracks
    const remoteTracks = {}; // map of arrays of tracks

    let jitsiAudioTrack = null; let jitsiVideoTrack = null;
    let jitsiVideoElem = null;
    let prevActiveSpeaker = null; let activeSpeaker = null;

    let hasAudio = false; let hasVideo = false;

    const SCREENSHARE = 'scr33nsh4r3'; // unique prefix for screenshare clients
    const screenShareDict = {};

    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================

    /**
     * Called when user joins
     * @param {String} participantId Participant id
     * @param {String} trackType track type ('audio'/'video')
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
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                (audioLevel) => console.log(`Audio Level local: ${audioLevel}`));
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => console.log('local track state changed'));
            track.addEventListener(
                JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stopped'));
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                (deviceId) =>
                    console.log(
                        `track audio output device was changed to ${deviceId}`));
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
            if (isJoined) { // mobile only?
                conference.addTrack(track);
                connectArena(conference.myUserId(), track.getType());
            }
        }
        if (jitsiAudioTrack) jitsiAudioTrack.mute();
        if (jitsiVideoTrack) jitsiVideoTrack.mute();
    }

    /**
     * Update screen share object
     * @param {String} screenShareId JitsiTrack object
     * @param {String} videoId Jitsi video Id
     * @param {String} participantId Jitsi participand Id
     * @return {Object} screenShare scene object
     */
    function updateScreenShareObject(screenShareId, videoId, participantId) {
        if (!screenShareId) return;
        screenShareId = screenShareId.replace(SCREENSHARE, '');
        let screenShareEl = globals.sceneObjects[screenShareId];
        if (!screenShareEl) { // create if doesnt exist
            screenShareEl = document.createElement('a-entity');
            screenShareEl.setAttribute('geometry', 'primitive', 'plane');
            screenShareEl.setAttribute('rotation.order', 'YXZ');
            screenShareEl.setAttribute('id', screenShareId);
            screenShareEl.setAttribute('scale', '8 6 0.01');
            screenShareEl.setAttribute('position', '0 3.1 -3');
            screenShareEl.setAttribute('material', 'shader: flat; side: double');
            globals.sceneObjects.scene.appendChild(screenShareEl);
            globals.sceneObjects[screenShareId] = screenShareEl;
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
     * @param {Object} track JitsiTrack object
     */
    function onRemoteTrack(track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        if (!remoteTracks[participant]) { // new participant
            remoteTracks[participant] = [null, null]; // create array to hold their tracks
        }

        if (track.getType() == 'audio') {
            if (remoteTracks[participant][0]) remoteTracks[participant][0].dispose();
            remoteTracks[participant][0] = track;
        } else if (track.getType() == 'video') {
            if (remoteTracks[participant][1]) remoteTracks[participant][1].dispose();
            remoteTracks[participant][1] = track;
        }

        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
            (audioLevel) => console.log(`Audio Level remote: ${audioLevel}`));
        track.addEventListener(
            JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
            () => console.log('remote track stopped'));
        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
            (deviceId) =>
                console.log(`track audio output device was changed to ${deviceId}`));
        // track.addEventListener(
        //     JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        //     () => {
        //         console.log('remote track muted')
        //     });

        const videoId = `video${participant}`;
        const displayNames = conference.getParticipantById(participant)._displayName;
        const objectIds = displayNames.split(',');

        // create HTML video elem to store video
        if (!document.getElementById(videoId)) { // create
            $('a-assets').append(
                `<video autoplay='1' id='${videoId}'/>`);
        }
        track.attach($(`#${videoId}`)[0]);

        // handle screen share video
        for (let i = 0; i < objectIds.length; i++) {
            if (objectIds[i] && objectIds[i].includes(SCREENSHARE)) {
                const video = $(`#${videoId}`);
                video.on('loadeddata', (e) => {
                    screenShareEl = updateScreenShareObject(objectIds[i], videoId, participant);
                });
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
    }

    /**
     * Called when user joins
     * @param {String} id user Id
     */
    function onUserLeft(id) {
        console.log('user left:', id);
        if (!remoteTracks[id]) return;
        const screenShareEl = screenShareDict[id];
        if (screenShareEl) {
            screenShareEl.setAttribute('material', 'src', null);
            delete screenShareDict[id];
        }
        $(`#video${id}`).remove();
        delete remoteTracks[id];
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
        conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_JOINED,
            onConferenceJoined);
        conference.on(JitsiMeetJS.events.conference.USER_JOINED, (id) => {
            console.log('New user joined:', id);
            remoteTracks[id] = [null, null]; // create an array to hold tracks of new user
        });
        conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
        // conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
        // });
        conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
            console.log(`(conference) Dominant Speaker ID: ${id}`);
            prevActiveSpeaker = activeSpeaker;
            activeSpeaker = id;
        });
        conference.on(
            JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
            (userID, displayName) => console.log(`${userID} - ${displayName}`));
        conference.on(
            JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
            (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`));
        conference.on(
            JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED,
            () => console.log(`${conference.getPhoneNumber()} - ${conference.getPhonePin()}`));

        // set the (unique) ARENA user's name
        conference.setDisplayName(globals.camName);
        conference.join(); // conference.join(password);

        chromeSpatialAudioOn = AFRAME.utils.device.isMobile();
        if (!chromeSpatialAudioOn) {
            // only tested and working on mac on chrome
            navigator.mediaDevices.enumerateDevices()
                .then(function(devices) {
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
     * @param {Object} devices List of devices
     */
    function onDeviceListChanged(devices) {
        console.info('current devices', devices);
    }

    /**
     * This function is called when we disconnect.
     */
    function disconnect() {
        console.log('disconnected!');
        connection.removeEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            onConnectionSuccess);
        connection.removeEventListener(
            JitsiMeetJS.events.connection.CONNECTION_FAILED,
            onConnectionFailed);
        connection.removeEventListener(
            JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
            disconnect);
    }

    /**
     * called on unload; release tracks, leave conference
     */
    function unload() {
        for (let i = 0; i < localTracks.length; i++) {
            localTracks[i].dispose();
        }
        conference.leave();
        connection.disconnect();
    }

    $(window).bind('beforeunload', unload);
    $(window).bind('unload', unload);

    JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

    JitsiMeetJS.mediaDevices.addEventListener(
        JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
        onDeviceListChanged);

    // ==================================================
    // MAIN START
    // ==================================================
    JitsiMeetJS.init(initOptions);

    connection = new JitsiMeetJS.JitsiConnection(null, null, connectOptions);
    connection.addEventListener(
        JitsiMeetJS.events.connection.DOMINANT_SPEAKER_CHANGED,
        (id) => console.log(`(connection) Dominant Speaker ID: ${id}`));
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        disconnect);
    connection.connect();

    const devices = ['audio'];
    let withVideo = false;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
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
    JitsiMeetJS.createLocalTracks({devices})
        .then(onLocalTracks)
        .catch((error) => {
            console.warn(error);
            isJoined = false;
        });
    if (withVideo) setupLocalVideo();

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

        /**
        * set video element size
        */
        function setupCornerVideo() {
            const videoHeight = jitsiVideoElem.videoHeight / (jitsiVideoElem.videoWidth / globals.localVideoWidth);
            jitsiVideoElem.setAttribute('width', globals.localVideoWidth);
            jitsiVideoElem.setAttribute('height', videoHeight);
        }

        jitsiVideoElem.addEventListener('loadeddata', setupCornerVideo);
        window.addEventListener('orientationchange', () => { // mobile only
            globals.localVideoWidth = Number(window.innerWidth / 5);
            this.stopVideo();
            setupCornerVideo();
            this.startVideo();
        });
    }

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        serverName: jitsiServer,

        screenSharePrefix: SCREENSHARE,

        ready: function() {
            return isJoined && jitsiAudioTrack && (!withVideo || jitsiVideoTrack);
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

        chromeSpatialAudioOn: function() {
            return chromeSpatialAudioOn;
        },

        unmuteAudio: function() {
            jitsiAudioTrack.unmute();
            hasAudio = true;
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        muteAudio: function() {
            jitsiAudioTrack.mute();
            hasAudio = false;
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        startVideo: function() {
            jitsiVideoTrack.unmute();
            hasVideo = true;
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        stopVideo: function() {
            jitsiVideoTrack.mute();
            hasVideo = false;
            return new Promise(function(resolve, reject) {
                resolve();
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
            disconnect();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },
    };
});
