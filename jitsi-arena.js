/* global $, JitsiMeetJS */

var ARENAJitsiAPI = (function () {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================
    const globals = window.globals;
    const SCREENSHARE = "arena_screen_share";

    // These match config info on Jitsi Meet server (oz.andrew.cmu.edu)
    // in lines 7-37 of file /etc/jitsi/meet/oz.andrew.cmu.edu-config.js
    let jitsiServer = 'mr.andrew.cmu.edu';
    let arenaConference = globals.scenenameParam.toLowerCase();

    const connectOptions = {
        hosts: {
            domain: jitsiServer,
            muc: 'conference.' + jitsiServer // FIXME: use XEP-0030
        },
        bosh: '//' + jitsiServer + '/http-bind', // FIXME: use xep-0156 for that

        // The name of client node advertised in XEP-0115 'c' stanza
        clientNode: 'http://jitsi.org/jitsimeet'
    };

    const confOptions = {
        openBridgeChannel: true,
    };

    const initOptions = {
        disableAudioLevels: true
    };

    let connection = null;
    let isJoined = false;
    let conference = null;

    let currScreenId = null;
    let jitsiId = null;

    let chromeSpatialAudioOn = null;
    let localTracks = []; // just our set of audio,video tracks
    let remoteTracks = {}; // map of arrays of tracks

    let jitsiAudioTrack = null, jitsiVideoTrack = null;
    let jitsiVideoElem = null;

    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================
    function connectArena(participantId, trackType) {
        jitsiId = participantId;
        console.log("connectArena: " + participantId, trackType);
    }

    /**
     * Handles local tracks.
     * @param tracks Array with JitsiTrack objects
     */
    function onLocalTracks(tracks) {
        localTracks = tracks;

        for (let i = 0; i < localTracks.length; i++) {
            const track = localTracks[i];
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevel => console.log(`Audio Level local: ${audioLevel}`));
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => console.log('local track state changed'));
            track.addEventListener(
                JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stopped'));
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                deviceId =>
                console.log(
                    `track audio output device was changed to ${deviceId}`));
            // append our own video/audio elements to <body>
            if (track.getType() === 'video') {
                //$('body').append(`<video autoplay='1' id='localVideo${i}' />`);

                // instead use already defined e.g. <video id="localVideo" ...>
                track.attach($(`#localVideo`)[0]);
                jitsiVideoTrack = track;
            } else if (track.getType() === 'audio') {
                //$('body').append(`<audio autoplay='1' muted='true' id='localAudio${i}' />`);

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

    function createScreenSharePlane(id) {
        let planeElement = document.getElementById(currScreenId);
        if (currScreenId && planeElement) {
            planeElement.setAttribute("id", id);
        }
        else {
            planeElement = document.createElement('a-plane');
            planeElement.setAttribute("id", id);
            planeElement.setAttribute("muted", "false");
            planeElement.setAttribute("autoplay", "true");
            planeElement.setAttribute("playsinline", "true");
            planeElement.setAttribute("material", "shader: flat; side: double");
            planeElement.setAttribute("scale", "8 6 0.01");
            planeElement.setAttribute("position", "0 3.1 -3");
            globals.sceneObjects.scene.appendChild(planeElement);
        }
        currScreenId = id;
        return planeElement;
    }

    /**
     * Handles remote tracks
     * @param track JitsiTrack object
     */
    function onRemoteTrack(track) {
        if (track.isLocal()) {
            return;
        }
        const participant = track.getParticipantId();

        if (!remoteTracks[participant]) { // new participant
            remoteTracks[participant] = [null, null]; // create array to hold their tracks
        }

        // remoteTracks[participant].push(track)
        if (track.getType() == "audio") {
            if (remoteTracks[participant][0]) remoteTracks[participant][0].dispose();
            remoteTracks[participant][0] = track;
        }
        else if (track.getType() == "video") {
            if (remoteTracks[participant][1]) remoteTracks[participant][1].dispose();
            remoteTracks[participant][1] = track;
        }

        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
            audioLevel => console.log(`Audio Level remote: ${audioLevel}`));
        // track.addEventListener(
        //     JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        //     () => {
        //         console.log('remote track muted')
        //     });
        track.addEventListener(
            JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
            () => console.log('remote track stopped'));
        track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
            deviceId =>
            console.log(
                `track audio output device was changed to ${deviceId}`));

        const videoID = `video${participant}`;
        const displayName = conference.getParticipantById(participant)._displayName;
        if (track.getType() === 'audio') {
            if (displayName && displayName.includes(SCREENSHARE)) {
                let audioStream = new MediaStream();
                audioStream.addTrack(remoteTracks[participant][0].track);

                let sceneEl = globals.sceneObjects.scene;
                let listener = null;
                if (sceneEl.audioListener) {
                    listener = sceneEl.audioListener;
                } else {
                    listener = new THREE.AudioListener();
                    let camEl = globals.sceneObjects.myCamera.object3D;
                    camEl.add(listener);
                    globals.audioListener = listener;
                    sceneEl.audioListener = listener;
                }

                let audioSource = new THREE.PositionalAudio(listener);
                audioSource.setMediaStreamSource(audioStream);
                audioSource.setRefDistance(1); // L-R panning
                audioSource.setRolloffFactor(1);

                const video = $(`#${videoID}`);
                video.on('loadeddata', (e) => {
                    const screenShareID = displayName+participant;
                    let planeElement = document.getElementById(screenShareID);
                    if (!planeElement) {
                        planeElement = createScreenSharePlane(screenShareID);
                    }

                    // add to scene
                    planeElement.object3D.add(audioSource);
                    remoteTracks[participant].screenShareID = screenShareID;
                });
            }
        }
        else { // video
            // use already existing video element e.g. video<jitsi_id>
            if (!document.getElementById(videoID)) { // create
                $('a-assets').append(
                    `<video autoplay='1' id='${videoID}'/>` );
            }
            track.attach($(`#${videoID}`)[0]);

            if (displayName && displayName.includes(SCREENSHARE)) {
                const video = $(`#${videoID}`);
                video.on('loadeddata', (e) => {
                    const screenShareID = displayName+participant;
                    let planeElement = document.getElementById(screenShareID);
                    if (!planeElement) {
                        planeElement = createScreenSharePlane(screenShareID);
                    }
                    planeElement.setAttribute("src", "#"+videoID);
                });
            }
        }
    }

    /**
     * That function is executed when the conference is joined
     */
    function onConferenceJoined() {
        isJoined = true;
        console.log('Joined conf! localTracks.length: ', localTracks.length);

        if (localTracks.length == 0) {
            console.log("NO LOCAL TRACKS but UserId is: ", conference.myUserId());
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
     * @param id
     */
    function onUserLeft(id) {
        console.log('user left:', id);
        if (!remoteTracks[id]) return;
        if (currScreenId.includes(id)) {
            globals.sceneObjects.scene.removeChild(document.getElementById(currScreenId));
        }
        $(`#video${id}`).remove();
        delete remoteTracks[id];
    }

    /**
     * That function is called when connection is established successfully
     */
    function onConnectionSuccess() {
        conference = connection.initJitsiConference(arenaConference, confOptions);

        conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
        conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
            console.log(`track removed!!!${track}`);
        });
        conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_JOINED,
            onConferenceJoined);
        conference.on(JitsiMeetJS.events.conference.USER_JOINED, id => {
            console.log('New user joined:', id);
            remoteTracks[id] = [null, null]; // create an array to hold tracks of new user
        });
        conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
        // conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
        // });
        conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, id => {
            console.log(`(conference) Dominant Speaker ID: ${id}`)
            globals.activeSpeaker = id;
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

        chromeSpatialAudioOn = false;
        // only tested and working on mac on chrome
        navigator.mediaDevices.enumerateDevices()
            .then(function(devices) {
                const headphonesConnected = devices
                    .filter(device => /audio\w+/.test(device.kind))
                    .find(device => device.label.toLowerCase().includes('head'));
                chromeSpatialAudioOn = !!headphonesConnected;
        });
    }

    /**
     * This function is called when the connection fails.
     */
    function onConnectionFailed() {
        console.error('Connection Failed!');
    }

    /**
     * This function is called when device list changes
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
     *
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

    // ==================================================
    // MAIN START
    // ==================================================
    JitsiMeetJS.init(initOptions);

    connection = new JitsiMeetJS.JitsiConnection(null, null, connectOptions);
    connection.addEventListener(
        JitsiMeetJS.events.connection.DOMINANT_SPEAKER_CHANGED,
        id => console.log(`(connection) Dominant Speaker ID: ${id}`));
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        disconnect);

    JitsiMeetJS.mediaDevices.addEventListener(
        JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
        onDeviceListChanged);

    connection.connect();

    JitsiMeetJS.createLocalTracks({
        devices: ['audio', 'video']
    })
    .then(onLocalTracks)
    .catch(error => {
        throw error;
    });

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        ready: function() {
            return isJoined && jitsiAudioTrack && jitsiVideoTrack;
        },
        setupLocalVideo: function() {
            // video window for jitsi
            jitsiVideoElem = document.getElementById("localVideo");
            jitsiVideoElem.style.display = "none";
            jitsiVideoElem.style.position = "absolute";
            jitsiVideoElem.style.top = "15px";
            jitsiVideoElem.style.left = "15px";
            jitsiVideoElem.style.borderRadius = "10px";
            jitsiVideoElem.style.opacity = 0.8;

            function setupCornerVideo() {
                const videoHeight = jitsiVideoElem.videoHeight / (jitsiVideoElem.videoWidth / globals.localVideoWidth);
                jitsiVideoElem.setAttribute("width", globals.localVideoWidth);
                jitsiVideoElem.setAttribute("height", videoHeight);
                jitsiVideoElem.play();
                // jitsiVideoElem.removeEventListener('loadeddata', setupCornerVideo, false);
            }

            jitsiVideoElem.addEventListener('loadeddata', setupCornerVideo, false);
            window.addEventListener('orientationchange', () => { // mobile only
                globals.localVideoWidth = Number(window.innerWidth / 5);
                this.stopVideo();
                setupCornerVideo();
                this.startVideo();
            }, false);
        },
        showVideo: function() {
            if (jitsiVideoElem) jitsiVideoElem.style.display = "block";
        },
        hideVideo: function() {
            if (jitsiVideoElem) jitsiVideoElem.style.display = "none";
        },
        getJitsiId: function() {
            return jitsiId;
        },
        chromeSpatialAudioOn: function() {
            return chromeSpatialAudioOn;
        },
        unmuteAudio: function () {
            jitsiAudioTrack.unmute();
            return new Promise(function(resolve,reject) {
                resolve()
            });
        },
        muteAudio: function () {
            jitsiAudioTrack.mute();
            return new Promise(function(resolve,reject) {
                resolve()
            });
        },
        startVideo: function () {
            jitsiVideoTrack.unmute();
            return new Promise(function(resolve,reject) {
                resolve()
            });
        },
        stopVideo: function () {
            jitsiVideoTrack.mute();
            return new Promise(function(resolve,reject) {
                resolve()
            });
        },
        leave: function () {
            disconnect();
            return new Promise(function(resolve,reject) {
                resolve()
            });
        }
    }
})();
