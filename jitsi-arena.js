/* global $, JitsiMeetJS */

// These match config info on Jitsi Meet server (oz.andrew.cmu.edu)
// in lines 7-37 of file /etc/jitsi/meet/oz.andrew.cmu.edu-config.js
const jitsiServer = 'mr.andrew.cmu.edu';
const arenaConference = globals.scenenameParam.toLowerCase();

const BIGSCREEN = "bigscreen"
const DISPLAYNAME = "arena_screen_share"

const options = {
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

var remoteAudioTracks = {};

// Jitsi globals
let connection = null;
let isJoined = false;
let conference = null;
let jitsiAudioTrack;
let jitsiVideoTrack;
let listener = null;

let localTracks = []; // just our set of audio,video tracks
const remoteTracks = {}; // it's a map of arrays of tracks

function connectArena(participantId, trackType) {
    globals.jitsiId = participantId;
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

            // instead use already defined e.g. <video id="localvidbox" ...>
            track.attach($(`#localvidbox`)[0]);
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

let leftRightToggle = true, screenPlaneLeftIdx = 0, screenPlaneRightIdx = 0;
function createScreenSharePlane(id) {
    let planeElement = document.createElement('a-plane');
    planeElement.setAttribute("id", id);
    planeElement.setAttribute("muted", "false");
    planeElement.setAttribute("autoplay", "true");
    planeElement.setAttribute("playsinline", "true");
    planeElement.setAttribute("material", "shader: flat; side: double");
    planeElement.setAttribute("scale", "8 6 0.01");
    if (leftRightToggle) {
        planeElement.setAttribute("position", 8.1*screenPlaneRightIdx+" 3.1 -3");
        screenPlaneRightIdx++;
    }
    else {
        planeElement.setAttribute("position", 8.1*-screenPlaneLeftIdx+" 3.1 -3");
        screenPlaneLeftIdx++;
    }
    leftRightToggle = !leftRightToggle;
    globals.sceneObjects.scene.appendChild(planeElement);
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
    track.addEventListener(
        JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        () => {
            //console.log('remote track muted')
        });
    track.addEventListener(
        JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
        () => console.log('remote track stopped'));
    track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
        deviceId =>
        console.log(
            `track audio output device was changed to ${deviceId}`));

    const displayName = conference.getParticipantById(participant)._displayName;
    //    console.log("onRemoteTrack() conference.getParticipantById(participant)._displayName ", participant, displayName);

    if (track.getType() === 'audio') {
        if (displayName && displayName.includes(DISPLAYNAME)) {
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

            const screenShareID = displayName+participant;
            let planeElement = document.getElementById(screenShareID);
            if (!planeElement) {
                planeElement = createScreenSharePlane(screenShareID);
            }

            // add to scene
            planeElement.object3D.add(audioSource);
            remoteTracks[participant].screenShareID = screenShareID;
        }
    }
    else { // video
        // use already existing video element e.g. video<jitsi_id>
        const videoID = `video${participant}`;
        if (!document.getElementById(videoID)) { // create
            $('a-assets').append(
                `<video autoplay='1' id='${videoID}'/>` );
        }
        track.attach($(`#${videoID}`)[0]);

        if (displayName && displayName.includes(DISPLAYNAME)) {
            const screenShareID = displayName+participant;
            let planeElement = document.getElementById(screenShareID);
            if (!planeElement) {
                planeElement = createScreenSharePlane(screenShareID);
            }
            planeElement.setAttribute("src", "#"+videoID);
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
    if (remoteTracks[id].screenShareID) {
        $(`#${remoteTracks[id].screenShareID}`).remove();
    }
    $(`#video${id}`).remove();
    delete remoteTracks[id];
}

function publishJitsiArenaMessage() {
    let msg = {
        object_id: globals.camName,
        jitsiId: globals.jitsiId,
        hasVideo: globals.hasVideo,
        hasAudio: globals.hasAudio,
        activeSpeaker: globals.activeSpeaker,
        action: 'create',
        type: 'object',
        data: {
            object_type: 'videoconf',
        }
    };

    publish(globals.outputTopic + globals.camName, msg);
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
        console.log('remote user join   : ', id);
        remoteTracks[id] = [null, null]; // create an array to hold tracks of new user
    });
    conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
    conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
        //        console.log(`${track.getType()} - ${track.isMuted()}`);
    });

    conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, id => {
        console.log(`(conference) Dominant Speaker ID: ${id}`)
        globals.activeSpeaker = id;
        publishJitsiArenaMessage();
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

    globals.chromeSpatialAudioOn = false;
    // only tested and working on mac on chrome
    navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            const headphonesConnected = devices
                .filter(device => /audio\w+/.test(device.kind))
                .find(device => device.label.toLowerCase().includes('head'));
            globals.chromeSpatialAudioOn = !!headphonesConnected;
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

let isVideo = true;

/**
 *
 */
function switchVideo() { // eslint-disable-line no-unused-vars
    isVideo = !isVideo;
    if (localTracks[1]) {
        localTracks[1].dispose();
        localTracks.pop();
    }
    JitsiMeetJS.createLocalTracks({
            devices: [isVideo ? 'video' : 'desktop']
        })
        .then(tracks => {
            localTracks.push(tracks[0]);
            localTracks[1].addEventListener(
                JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                () => console.log('local track state changed'));
            localTracks[1].addEventListener(
                JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                () => console.log('local track stopped'));
            localTracks[1].attach($('#localvidbox')[0]);
            conference.addTrack(localTracks[1]);
        })
        .catch(error => console.log(error));
}

$(window).bind('beforeunload', unload);
$(window).bind('unload', unload);

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
const initOptions = {
    disableAudioLevels: true
};

// MAIN START
JitsiMeetJS.init(initOptions);

connection = new JitsiMeetJS.JitsiConnection(null, null, options);

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
