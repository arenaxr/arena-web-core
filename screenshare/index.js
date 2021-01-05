/* global $, JitsiMeetJS */

const jitsiServer = window.jitsiURL;
if (!jitsiServer) window.close();

const options = {
    hosts: {
        domain: jitsiServer,
        muc: 'conference.' + jitsiServer, // FIXME: use XEP-0030
    },
    bosh: '//' + jitsiServer + '/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet',
};

const confOptions = {
    openBridgeChannel: true,
};

let connection = null;
let isJoined = false;
let conference = null;

let localTracks = [];
const remoteTracks = {};

/**
 * Handles local tracks.
 * @param {[]} tracks Array with JitsiTrack objects
 */
function onLocalTracks(tracks) {
    localTracks = tracks;
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
            (audioLevel) => console.log(`Audio Level local: ${audioLevel}`));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => console.log('local track muted'));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
            () => console.log('local track stoped'));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
            (deviceId) =>
                console.log(
                    `track audio output device was changed to ${deviceId}`));
        if (localTracks[i].getType() === 'audio') {
            $('body').append(
                `<audio autoplay='1' muted='true' id='localAudio${i}' />`);
            localTracks[i].attach($(`#localAudio${i}`)[0]);
        } else { // desktop
            $('body').append(
                `<video autoplay='1' id='localScreenShare${i}' class='screen-share' />`);
            $(`#localScreenShare${i}`).css('width', '100%');
            $(`#localScreenShare${i}`).css('height', 'auto');
            localTracks[i].attach($(`#localScreenShare${i}`)[0]);
        }
        if (isJoined) {
            conference.addTrack(localTracks[i]);
        }
    }
}

/**
 * That function is executed when the conference is joined
 */
function onConferenceJoined() {
    console.log('conference joined!');
    isJoined = true;
    for (let i = 0; i < localTracks.length; i++) {
        conference.addTrack(localTracks[i]);
    }
}

/**
 * That function is called when connection is established successfully
 */
function onConnectionSuccess() {
    conference = connection.initJitsiConference(window.scene, confOptions);
    conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
        console.log(`track removed!!!${track}`);
    });
    conference.on(
        JitsiMeetJS.events.conference.CONFERENCE_JOINED,
        onConferenceJoined);
    conference.on(JitsiMeetJS.events.conference.USER_JOINED, (id) => {
        console.log('user join');
        remoteTracks[id] = [];
    });
    conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
        console.log(`${track.getType()} - ${track.isMuted()}`);
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

    conference.setDisplayName(`${(+new Date).toString(36)} ${window.screenSharePrefix}_${window.camName}`);
    conference.setLocalParticipantProperty('screenshareDispName', window.displayName);
    conference.setLocalParticipantProperty('screenshareCamName', window.camName);
    conference.setLocalParticipantProperty('screenshareObjIds', window.objectIds);

    conference.join();
}

/**
 * This function is called when the connection fail.
 */
function onConnectionFailed() {
    console.error('Connection Failed!');
}

/**
 * This function is called when the connection fail.
 * @param {[]} devices list of devices
 */
function onDeviceListChanged(devices) {
    console.info('current devices', devices);
}

/**
 * This function is called when we disconnect.
 */
function disconnect() {
    console.log('disconnect!');
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
    window.close();
}

$(window).bind('beforeunload', unload);
$(window).bind('unload', unload);

// JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
const initOptions = {
    disableAudioLevels: true,
};

JitsiMeetJS.init(initOptions);

connection = new JitsiMeetJS.JitsiConnection(null, null, options);

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

JitsiMeetJS.createLocalTracks({devices: ['desktop']})
    .then(onLocalTracks)
    .catch((error) => {
        throw error;
    });
