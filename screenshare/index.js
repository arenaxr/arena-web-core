/* global $, JitsiMeetJS */

/**
 * Read the share parameters. The ARENA tab stores them on itself (window.arenaScreenshareParams)
 * before opening this popup, so they survive a navigation of an already-open share window, which
 * gets a fresh Window object. window.params is the older handoff, set on the new window directly.
 * @return {object|null} share parameters, or null when this page was not opened from ARENA
 */
function getShareParams() {
    if (window.params) return window.params;
    try {
        return window.opener?.arenaScreenshareParams || null;
    } catch (e) {
        return null; // opener is not readable (e.g. navigated away to another origin)
    }
}

const params = getShareParams();

// status panel: tells the user what is happening and offers a retry when capture fails
const statusPanel = document.createElement('div');
statusPanel.className = 'share-status';
const statusText = document.createElement('p');
const statusHint = document.createElement('p');
statusHint.className = 'share-status-hint';
const retryButton = document.createElement('button');
retryButton.className = 'share-retry-button';
retryButton.textContent = 'Choose what to share';
statusPanel.append(statusText, statusHint, retryButton);
document.body.appendChild(statusPanel);

/**
 * Show a status message in the popup.
 * @param {string} text main message
 * @param {string} [hint] secondary guidance
 * @param {boolean} [canRetry] show the "Choose what to share" button
 */
function setStatus(text, hint = '', canRetry = false) {
    statusText.textContent = text;
    statusHint.textContent = hint;
    statusHint.hidden = !hint;
    retryButton.hidden = !canRetry;
    statusPanel.hidden = false;
}

/**
 * Hide the status panel once the share preview is showing.
 */
function clearStatus() {
    statusPanel.hidden = true;
}

if (!params) {
    setStatus('Start screen sharing from the Share Screen button in an ARENA scene.');
    throw new Error('screenshare: opened without ARENA share parameters');
}

const options = params.connectOptions;
const { appID } = params;
const token = params.token.mqtt_token;
const confOptions = {
    openBridgeChannel: true,
};

let connection = null;
let isJoined = false;
let conference = null;

let localTracks = [];
const remoteTracks = {};
let connectionFailed = false;
let unloaded = false; // guard against re-entrant / repeated teardown (issue #616)

/**
 * Release tracks, leave the conference, and disconnect. Idempotent and single-pass:
 * safe to call from the Exit button, the LOCAL_TRACK_STOPPED handler, and the window
 * unload events without re-entrant double teardown that would knock out other users'
 * screenshares (issue #616). Does NOT close the window; callers close it once.
 */
function unload() {
    if (unloaded) return;
    unloaded = true;
    for (let i = 0; i < localTracks.length; i++) {
        try {
            localTracks[i].dispose();
        } catch (e) {
            console.warn('screenshare track dispose failed', e);
        }
    }
    if (conference) {
        try {
            conference.leave();
        } catch (e) {
            console.warn('screenshare conference.leave failed', e);
        }
    }
    if (connection) {
        try {
            connection.disconnect();
        } catch (e) {
            console.warn('screenshare connection.disconnect failed', e);
        }
    }
}

/**
 * Handles the browser's native "Stop sharing" chrome: tear down once, then close.
 * Skipped while our own unload() is running to avoid re-entrant teardown (issue #616).
 */
function onLocalTrackStopped() {
    console.log('local track stopped');
    if (!unloaded) {
        unload();
        window.close();
    }
}

// create exit button; shown from the start so the user can always back out, even if capture fails
const exitButton = document.createElement('button');
exitButton.id = 'exitButton';
exitButton.className = 'leave-button';
exitButton.title = 'End Screen Sharing';
exitButton.innerHTML = 'Exit';
exitButton.onclick = () => {
    unload();
    window.close();
};
document.body.appendChild(exitButton);

/**
 * Handles local tracks.
 * @param {[]} tracks Array with JitsiTrack objects
 */
function onLocalTracks(tracks) {
    localTracks = tracks;
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
            console.log(`Audio Level local: ${audioLevel}`)
        );
        localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
            console.log('local track muted')
        );
        localTracks[i].addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, onLocalTrackStopped);
        localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
            console.log(`track audio output device was changed to ${deviceId}`)
        );
        if (localTracks[i].getType() === 'audio') {
            $('body').append(`<audio autoplay='1' muted='true' id='localAudio${i}' playsinline/>`);
            localTracks[i].attach($(`#localAudio${i}`)[0]);
        } else {
            // desktop
            $('body').append(`<video autoplay='1' id='localScreenShare${i}' class='screen-share' playsinline/>`);
            const thisLocalScreenshare = $(`#localScreenShare${i}`);
            thisLocalScreenshare.css('width', '100%');
            thisLocalScreenshare.css('height', 'auto');
            localTracks[i].attach(thisLocalScreenshare[0]);
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
    conference = connection.initJitsiConference(params.conferenceName, confOptions);
    conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
        console.log(`track removed!!!${track}`);
    });
    conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
    conference.on(JitsiMeetJS.events.conference.USER_JOINED, (id) => {
        console.log('user join');
        remoteTracks[id] = [];
    });
    conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
        console.log(`${track.getType()} - ${track.isMuted()}`);
    });
    conference.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (userID, displayName) =>
        console.log(`${userID} - ${displayName}`)
    );
    conference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (userID, audioLevel) =>
        console.log(`${userID} - ${audioLevel}`)
    );
    conference.on(JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () =>
        console.log(`${conference.getPhoneNumber()} - ${conference.getPhonePin()}`)
    );
    conference.on(JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED, (stats) => {
        conference.sendEndpointStatsMessage(stats); // send to remote
    });

    conference.setDisplayName(`${(+new Date()).toString(36)} ${params.screenSharePrefix}_${params.idTag}`);
    conference.setLocalParticipantProperty('screenshareDispName', params.displayName);
    conference.setLocalParticipantProperty('screenshareidTag', params.idTag);
    conference.setLocalParticipantProperty('screenshareObjIds', params.objectIds);

    conference.join();
}

/**
 * Show the connection failure; it outranks any capture status since nothing can be shared without it.
 */
function showConnectionFailed() {
    setStatus(
        'Could not connect to the conference server, so your screen is not being shared.',
        'Click Share Screen in the ARENA scene to try again.'
    );
}

/**
 * This function is called when the connection fail.
 */
function onConnectionFailed(errType, msg, credentials, details) {
    console.error('Connection Failed!', errType, msg, credentials, details);
    connectionFailed = true;
    showConnectionFailed();
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
    connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
    connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
    connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);
}

/**
 * Explain a failed screen capture and offer a retry from a real click.
 * lib-jitsi-meet folds most getDisplayMedia failures into SCREENSHARING_USER_CANCELED: the user
 * dismissed the picker, or the browser refused because the call had no user gesture (this popup
 * starts capture on load, which Firefox and Safari reject). A retry from the button carries a
 * gesture, so it works in either case. PERMISSION_DENIED means the operating system blocked
 * screen recording for the browser, most often macOS Screen & System Audio Recording.
 * @param {object} error JitsiTrackError
 */
function onCaptureError(error) {
    console.warn('screenshare: screen capture failed', error?.name, error?.message, error);
    if (connectionFailed) return; // the connection failure message stays up
    const trackErrors = JitsiMeetJS.errors.track;
    const isMac = /Mac/i.test(navigator.userAgentData?.platform || navigator.platform || '');
    const macHint =
        'On macOS, if the picker offers only tabs or shows a permission message, open System Settings > ' +
        'Privacy & Security > Screen & System Audio Recording, turn on your browser, then quit and reopen it.';
    switch (error?.name) {
        case trackErrors.PERMISSION_DENIED:
            setStatus(
                'Your computer blocked this browser from recording the screen.',
                isMac
                    ? 'Open System Settings > Privacy & Security > Screen & System Audio Recording, turn on ' +
                          'your browser, then quit and reopen it and try again.'
                    : "Allow screen recording for this browser in your system's privacy settings, then try again.",
                true
            );
            break;
        case trackErrors.SCREENSHARING_NOT_SUPPORTED_ERROR:
            setStatus(
                'This browser does not support screen sharing.',
                'Try a current desktop Chrome, Edge, or Firefox.'
            );
            break;
        case trackErrors.SCREENSHARING_USER_CANCELED:
            setStatus('Nothing is being shared yet.', isMac ? macHint : '', true);
            break;
        default:
            setStatus(`Screen sharing failed: ${error?.message || error?.name || error}`, isMac ? macHint : '', true);
            break;
    }
}

/**
 * Ask the browser for a screen, window, or tab to share. Runs once on load (no extra click when the
 * browser allows it) and again from the retry button.
 */
function startCapture() {
    if (connectionFailed) return;
    retryButton.disabled = true;
    setStatus('Choose a screen, window, or tab to share in the browser dialog.');
    JitsiMeetJS.createLocalTracks({ devices: ['desktop'] })
        .then((tracks) => {
            if (connectionFailed) showConnectionFailed();
            else clearStatus();
            onLocalTracks(tracks);
        })
        .catch(onCaptureError)
        .finally(() => {
            retryButton.disabled = false;
        });
}

retryButton.onclick = startCapture;

$(window).bind('beforeunload', unload);
$(window).bind('unload', unload);

// WARN keeps lib-jitsi-meet's "getDisplayMedia error" detail (the browser's own error) in the console
JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARN);

const initOptions = {
    disableAudioLevels: true,
};

JitsiMeetJS.init(initOptions);

connection = new JitsiMeetJS.JitsiConnection(appID, token, options);

connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);

JitsiMeetJS.mediaDevices.addEventListener(JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED, onDeviceListChanged);

connection.connect();

startCapture();
