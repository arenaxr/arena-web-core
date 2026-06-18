/**
 * @fileoverview Jitsi API for the ARENA
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global JitsiMeetJS, $ */
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
        // Skip Jitsi in replay mode
        if (this.el.hasAttribute('arena-replay')) return;

        const { data } = this;

        this.connectOptions = {
            hosts: {
                domain: data.jitsiHost.split(':')[0], // remove port, if exists.
                muc: `conference.${data.jitsiHost.split(':')[0]}`, // remove port, if exists. FIXME: use XEP-0030
            },
            serviceUrl: `//${data.jitsiHost}/http-bind`, // FIXME: use xep-0156 for that
            // TODO (mwfarb) for v1844 serviceUrl: `//${data.jitsiHost}/http-bind`, // FIXME: use xep-0156 for that

            // The name of client node advertised in XEP-0115 'c' stanza
            clientNode: 'http://jitsi.org/jitsimeet',
        };

        this.connection = null;
        this.conference = null;
        this.initialized = false;

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

        this.screenShareDict = {}; // participantId -> Set of object element ids they share on
        this.screenShareOwners = {}; // object element id -> participantId currently displayed on it
        this.screenShareSourceNames = new Set(); // jitsi video source names of active screenshares
        this.screenShareRestore = {}; // object element id -> pristine state to restore when share ends
        // last receiver video constraints set by avatars/defaults, re-applied when screenshares change
        this.lastVideoConstraints = { colibriClass: 'ReceiverVideoConstraints' };

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

        this.health = sceneEl.systems['arena-health-ui'];

        // we use the scene name as the jitsi room name, handle RFC 3986 reserved chars as = '_'
        this.conferenceName = ARENA.namespacedScene.toLowerCase().replace(/[!#$&'()*+,/:;=?@[\]]/g, '_');

        JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);

        // signal that jitsi is loaded. note: jitsi is not necessarily CONNECTED when this event is fired,
        ARENA.events.emit(ARENA_EVENTS.JITSI_LOADED, true);

        if (!ARENA.params.noav && ARENA.isJitsiPermitted()) {
            const _this = this;
            ARENA.events.addEventListener(ARENA_EVENTS.SETUPAV_LOADED, async () => {
                // Only show if no previous preferences were set / first time AV setup
                if (ARENA.params.armode) {
                    ARENA.events.addEventListener(ARENA_EVENTS.CV_INITIALIZED, _this.connect.bind(_this));
                } else if (!(await _this.validateDeviceIds()) ||
                           (localStorage.getItem('prefAudioInput') === null && ARENA.params.skipav === undefined)) {
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
     * Validate saved device IDs against currently available devices.
     * Clears only the preference(s) whose device is no longer available, leaving the rest intact.
     * @return {Promise<boolean>} true if all saved devices are still valid
     */
    async validateDeviceIds() {
        const prefKeys = ['prefAudioInput', 'prefVideoInput', 'prefAudioOutput'];
        const prefs = prefKeys.map((key) => [key, localStorage.getItem(key)]);
        if (prefs.every(([, value]) => !value)) return true;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const deviceIds = new Set(devices.map((d) => d.deviceId));
            let allValid = true;
            prefs.forEach(([key, value]) => {
                if (value && !deviceIds.has(value)) {
                    // Only clear the specific device that is gone. macOS/Chrome rotates deviceIds
                    // (sleep/wake, plug/unplug, the floating "default" entry); clearing all prefs
                    // when any one is stale would discard the user's still-valid mic/camera choice
                    // and fall back to the system default.
                    console.warn(`Saved A/V device no longer available, clearing ${key}`);
                    localStorage.removeItem(key);
                    allValid = false;
                }
            });
            return allValid;
        } catch (e) {
            return true; // Can't enumerate devices, assume valid
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
            // only set an explicit output device; passing null/'' would force the system default
            if (prefAudioOutput) {
                JitsiMeetJS.mediaDevices.setAudioOutputDevice(prefAudioOutput);
            }
        } catch {
            // empty
        }

        JitsiMeetJS.init(this.initOptions);
        console.info('Jitsi, connecting:', this.connectOptions);

        this.connection = new JitsiMeetJS.JitsiConnection(
            data.arenaAppId,
            ARENA.mqttToken.mqtt_token,
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
     * @param {Array} tracks Array with JitsiTrack objects
     */
    async onLocalTracks(tracks) {
        this.localTracks = tracks;

        for (let i = 0; i < this.localTracks.length; i++) {
            const track = this.localTracks[i];
            track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, (audioLevel) =>
                console.debug(`Audio Level local: ${audioLevel}`)
            );
            track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, (track1) => {
                // console.debug('local track state changed', track1.track.muted);
                if (track.getType() !== 'audio') return;
                const participantId = track1.getParticipantId();
                this.el.sceneEl.emit(JITSI_EVENTS.TRACK_MUTE_CHANGED, {
                    jid: this.jitsiId,
                    id: ARENA.idTag,
                    muted: track.isMuted(),
                });
                // console.warn('local track mute changed', participantId, track.isMuted(), track);
            });
            // Emit initial state for audio tracks only
            if (track.getType() === 'audio') {
                this.el.sceneEl.emit(JITSI_EVENTS.TRACK_MUTE_CHANGED, {
                    jid: this.jitsiId,
                    id: ARENA.idTag,
                    muted: track.isMuted(),
                });
            }
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
        const created = !screenShareEl;
        if (created) {
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

        // Capture the object's pristine state once, before screenshare styling, so it can be
        // restored when the share ends (otherwise the frozen last video frame stays on the object
        // and there is no visual cue that sharing has stopped). Auto-created objects are removed
        // on end; pre-existing scene objects (e.g. a 'screenshare' cube) revert to their material.
        if (!this.screenShareRestore[screenShareId]) {
            this.screenShareRestore[screenShareId] = {
                created,
                material: created ? null : { ...screenShareEl.getAttribute('material') },
                hadExtras: !created && screenShareEl.hasAttribute('material-extras'),
                hadLandmark: !created && screenShareEl.hasAttribute('landmark'),
            };
        }

        screenShareEl.setAttribute('muted', 'false');
        screenShareEl.setAttribute('autoplay', 'true');
        screenShareEl.setAttribute('playsinline', 'true');
        screenShareEl.setAttribute('material', 'src', `#${videoId}`);
        screenShareEl.setAttribute('material', 'shader', 'flat');
        screenShareEl.setAttribute('material-extras', 'colorSpace', 'SRGBColorSpace');

        // Track which participant is currently displayed on this object, and the set of
        // objects this participant shares on, so that when one sharer leaves we never clear
        // another sharer's still-active video on a shared object (issue: same-object collision).
        this.screenShareOwners[screenShareId] = participantId;
        if (!this.screenShareDict[participantId]) {
            this.screenShareDict[participantId] = new Set();
        }
        this.screenShareDict[participantId].add(screenShareId);

        // add a default landmark for any screen share object
        if (!screenShareEl.hasAttribute('landmark')) {
            screenShareEl.setAttribute(
                'landmark',
                `label: Screen: ${screenShareId} (nearby); randomRadiusMin: 2; randomRadiusMax: 3`
            );
        }
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

            // Autoplay of an unmuted MediaStream <video> is blocked by Firefox until a user
            // gesture, so the element never decodes, `canplay`/`loadeddata` never fire, and the
            // remote videosphere/avatar stays blank. Chrome's MediaStream autoplay is lenient and
            // renders anyway -- which is why this only reproduced on Firefox receivers. Mute (this
            // is the video-only track; audio rides the separate `audio<id>` element) and start
            // playback immediately, mirroring the screenshare path below.
            vidEl[0].muted = true;
            if (vidEl[0].paused) {
                vidEl[0].play().catch((e) => console.warn('jitsi-video: remote video play failed', e));
            }

            const user = this.conference.getParticipantById(participantId);
            let idTags = user.getProperty('arenaId');
            if (!idTags) idTags = user.getDisplayName();
            if (!idTags) return; // handle jitsi-only users that have not set the display name

            if (idTags.includes(data.screensharePrefix)) {
                let dn = user.getProperty('screenshareDispName');
                if (!dn) dn = user.getDisplayName();
                if (!dn) dn = `No Name #${participantId}`;
                const idTag = user.getProperty('screenshareidTag');
                let objectIds = user.getProperty('screenshareObjIds');

                if (idTag && objectIds) {
                    objectIds = objectIds.split(',');
                    sceneEl.emit(JITSI_EVENTS.SCREENSHARE, {
                        jid: participantId,
                        id: participantId,
                        dn,
                        sn: objectIds[0],
                        scene: ARENA.namespacedScene,
                        src: EVENT_SOURCES.JITSI,
                    });

                    // Start decoding the screenshare video now. The `autoplay` attribute alone is
                    // blocked by the browser until the viewer makes a user gesture, so without
                    // this the video stays paused, `loadeddata` never fires, and the texture is
                    // empty ("texImage2D: no video") -- which is why sharing only rendered after a
                    // viewer enabled their own mic/camera. Mute so autoplay is always permitted
                    // (screenshare audio, if any, rides a separate audio track) and play.
                    vidEl[0].muted = true;
                    if (vidEl[0].paused) {
                        vidEl[0].play().catch((e) => console.warn('screenshare video play failed', e));
                    }

                    // Explicitly request this screenshare's video from the bridge. ARENA only builds
                    // receiver constraints from [arena-user] avatars, so a screenshare endpoint (not an
                    // avatar) is otherwise never requested and, with enableLayerSuspension, the bridge
                    // forwards no frames -- the video element stays at readyState 0 / 0x0 and renders blank.
                    this.screenShareSourceNames.add(`${participantId}-v0`);
                    this.applyReceiverConstraints(this.lastVideoConstraints);

                    // handle screen share video
                    for (let i = 0; i < objectIds.length; i++) {
                        const objectId = objectIds[i];
                        if (objectId) {
                            // if the video already has data (loadeddata fired before we could
                            // attach the listener), render now; otherwise wait for it once.
                            // Mirrors the readyState guard in the jitsi-video component and
                            // avoids the race that left named objects unrendered.
                            if (vidEl[0].readyState >= 2) {
                                this.updateScreenShareObject(objectId, videoId, participantId);
                            } else {
                                $(`#${videoId}`).one('loadeddata', () => {
                                    this.updateScreenShareObject(objectId, videoId, participantId);
                                });
                            }
                        }
                    }
                } else {
                    // display as external user; possible spoofer
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                        jid: participantId,
                        id: participantId,
                        dn,
                        scene: ARENA.namespacedScene,
                        src: EVENT_SOURCES.JITSI,
                        arena: false,
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
        track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () => {
            // console.log('remote track muted')
            if (track.getType() !== 'audio') return;
            const participant = this.conference.getParticipantById(participantId);
            const arenaId = participant ? participant.getProperty('arenaId') : participantId;
            sceneEl.emit(JITSI_EVENTS.TRACK_MUTE_CHANGED, {
                jid: participantId,
                id: arenaId,
                muted: track.isMuted(),
            });
            // console.warn('jitsi remote track mute changed', participantId, track.isMuted(), track);
        });
        
        // Emit initial state for audio tracks only
        if (track.getType() === 'audio') {
            const participant = this.conference.getParticipantById(participantId);
            const arenaId = participant ? participant.getProperty('arenaId') : participantId;
            sceneEl.emit(JITSI_EVENTS.TRACK_MUTE_CHANGED, {
                jid: participantId,
                id: arenaId,
                muted: track.isMuted(),
            });
        }
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
            if (arenaId) {
                pl.push({
                    jid: user._id,
                    id: arenaId,
                    dn: arenaDisplayName,
                });
            }
        });

        this.initialized = true;

        ARENA.events.emit(JITSI_EVENTS.CONNECTED, {
            scene: ARENA.namespacedScene,
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
        if (arenaId && arenaDisplayName) {
            // emit user joined event in the off chance we know all properties of this arena user
            sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                jid: id,
                id: arenaId,
                dn: arenaDisplayName,
                scene: ARENA.namespacedScene,
                src: EVENT_SOURCES.JITSI,
                arena: true,
            });
        } else {
            let dn = this.conference.getParticipantById(id).getDisplayName(); // get display name
            if (!dn) dn = `No Name #${id}`; // jitsi user that did not set his display name

            // user join event args, to be emited below
            const userJoinedArgs = {
                jid: id,
                id,
                dn,
                scene: ARENA.namespacedScene,
                src: EVENT_SOURCES.JITSI,
            };

            // this might be a jitsi-only user; emit event if name does not have the arena tag
            if (!dn.includes(data.arenaUserPrefix)) {
                if (!dn.includes(data.screensharePrefix)) {
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, { ...userJoinedArgs, arena: false });
                }
            } else {
                // This IS an ARENA user (display name carries the #4r3n4_ tag) whose arenaId
                // property hasn't propagated yet. Notify after the timeout using the idTag parsed
                // from the tag (the same key MQTT presence uses) and flag it as ARENA, so it is not
                // mislabeled "(external)" when property propagation is slow.
                const tagMatch = dn.match(new RegExp(`${data.arenaUserPrefix}([^)]*)\\)`));
                const parsedIdTag = tagMatch ? tagMatch[1] : id;
                this.newUserTimers[id] = setTimeout(() => {
                    sceneEl.emit(JITSI_EVENTS.USER_JOINED, { ...userJoinedArgs, id: parsedIdTag, arena: true });
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
        const sharedObjIds = this.screenShareDict[id];
        if (sharedObjIds) {
            sharedObjIds.forEach((objId) => {
                // only restore the object if THIS leaving participant still owns it; if another
                // sharer has since taken it over, leave their video intact (same-object collision).
                if (this.screenShareOwners[objId] === id) {
                    const screenShareEl = document.getElementById(objId);
                    const restore = this.screenShareRestore[objId];
                    if (screenShareEl) {
                        if (restore && restore.created) {
                            // ARENA created this object for the share; remove it so it clearly ends
                            screenShareEl.remove();
                        } else {
                            // pre-existing scene object: clear the frozen video frame and revert to
                            // its original material/look so it's obvious the share has stopped
                            if (restore && restore.material) {
                                screenShareEl.setAttribute('material', restore.material);
                            } else {
                                screenShareEl.removeAttribute('material', 'src');
                            }
                            if (restore && !restore.hadExtras) screenShareEl.removeAttribute('material-extras');
                            if (restore && !restore.hadLandmark) screenShareEl.removeAttribute('landmark');
                        }
                    }
                    delete this.screenShareRestore[objId];
                    delete this.screenShareOwners[objId];
                }
            });
            delete this.screenShareDict[id];
        }
        // stop requesting this endpoint's screenshare video from the bridge
        if (this.screenShareSourceNames.delete(`${id}-v0`)) {
            this.applyReceiverConstraints(this.lastVideoConstraints);
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
        this.conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
            // A remote source can stop/start its camera without leaving the conference, so no
            // USER_LEFT fires. Surface remote video mute state so objects bound to that source
            // (e.g. a videosphere via jitsi-video) can revert/re-render instead of freezing on
            // the last decoded frame.
            if (track.isLocal() || track.getType() !== 'video') return;
            sceneEl.emit(JITSI_EVENTS.VIDEO_MUTE_CHANGED, {
                jid: track.getParticipantId(),
                muted: track.isMuted(),
                src: EVENT_SOURCES.JITSI,
            });
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
                id: ARENA.idTag,
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
        this.conference.setDisplayName(`${ARENA.displayName} (${data.arenaUserPrefix}_${ARENA.idTag})`);

        // set local properties
        this.conference.setLocalParticipantProperty('arenaId', ARENA.idTag);
        this.conference.setLocalParticipantProperty('arenaDisplayName', ARENA.displayName);

        this.conference.on(
            JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
            (user, propertyKey, oldPropertyValue, propertyValue) => {
                // console.log(`Property changed: ${user.getId()} ${propertyKey} ${propertyValue} ${oldPropertyValue}`);
                const id = user.getId();
                if (propertyKey === 'arenaId' || propertyKey === 'arenaDisplayName') {
                    const arenaId = this.conference.getParticipantById(id).getProperty('arenaId');
                    const arenaDisplayName = this.conference.getParticipantById(id).getProperty('arenaDisplayName');
                    if (arenaId && arenaDisplayName) {
                        // clear timeout for new user notification
                        clearInterval(this.newUserTimers[id]);
                        delete this.newUserTimers[id];
                        // emit new user event
                        sceneEl.emit(JITSI_EVENTS.USER_JOINED, {
                            jid: id,
                            id: arenaId,
                            dn: arenaDisplayName,
                            scene: this.conferenceName,
                            src: EVENT_SOURCES.JITSI,
                            arena: true,
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
            id: ARENA.idTag,
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
    onConnectionFailed(errType, msg, credentials, details) {
        const { el } = this;

        const { sceneEl } = el;

        const err = 'connection.connectionFailed';
        console.error('Conference server connection failed!', errType, msg, credentials, details);
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
        if (ARENA.params.armode) {
            return;
        }
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

        let stream;
        try {
            let vidConstraint = true;
            if (prefVideoInput) {
                vidConstraint = { deviceId: { exact: prefVideoInput } };
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: vidConstraint });
                    deviceOpts.cameraDeviceId = prefVideoInput;
                } catch {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        stream?.getTracks().forEach((track) => track.stop());

        JitsiMeetJS.createLocalTracks({ devices, ...deviceOpts })
            .then(async (tracks) => {
                await this.onLocalTracks(tracks);
                if (this.withVideo) {
                    this.setupCornerVideo.bind(this)();
                    this.stopVideo();
                }
            })
            .catch((err) => {
                // TODO (mwfarb): is this generic catch causing arena-camera to remove JitsiId from mqtt pub?
                // err = gum.unsupported_resolution: Video resolution is not supported:
                // this.initialized = false;
                console.warn(err);
            });
    },

    /**
     * show user video in the corner
     */
    setupCornerVideo() {
        let localVideoWidth = window.matchMedia('(max-width: 1024px)').matches ? Number(window.innerWidth / 5) : 300;

        // video window for jitsi
        this.jitsiVideoElem = document.getElementById('cornerVideo');
        if (localStorage.getItem('prefPresence') !== 'Portal') {
            this.jitsiVideoElem.classList.remove('flip-video-portal');
            this.jitsiVideoElem.classList.add('flip-video');
        } else {
            this.jitsiVideoElem.classList.remove('flip-video');
            this.jitsiVideoElem.classList.add('flip-video-portal');
        }
        this.jitsiVideoElem.classList.add('arena-corner-video');
        this.jitsiVideoElem.style.opacity = '0.9'; // slightly see through
        this.jitsiVideoElem.style.display = 'none';

        /**
         * set video element size
         */
        function setCornerVideoHeight() {
            const videoWidth = localVideoWidth;
            if (!this.jitsiVideoElem) {
                console.error('Attempting to set cornerVideo size before element is available!');
                return;
            }
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
        this.applyReceiverConstraints(videoConstraints);
    },

    setDefaultResolutionRemotes(resolution) {
        const videoConstraints = {};
        videoConstraints.colibriClass = 'ReceiverVideoConstraints';
        videoConstraints.defaultConstraints = {
            maxHeight: resolution,
        };
        this.applyReceiverConstraints(videoConstraints);
    },

    /**
     * Apply receiver video constraints to the bridge, always keeping any active screenshares
     * requested at full resolution. ARENA builds constraints only from [arena-user] avatars and
     * each call replaces the whole set; a screenshare endpoint (not an avatar) would otherwise be
     * dropped and, with enableLayerSuspension, suspended by the bridge so it renders blank. The
     * base constraints are remembered so screenshare add/remove can re-apply them.
     * @param {object} videoConstraints ReceiverVideoConstraints object (avatar/default constraints)
     */
    applyReceiverConstraints(videoConstraints) {
        if (!this.conference) return;
        this.lastVideoConstraints = videoConstraints;
        // shallow-clone so the screenshare additions don't mutate the remembered base constraints
        const merged = { ...videoConstraints };
        if (this.screenShareSourceNames.size > 0) {
            const onStageSources = [...(merged.onStageSources || [])];
            const constraints = { ...(merged.constraints || {}) };
            this.screenShareSourceNames.forEach((sourceName) => {
                if (!onStageSources.includes(sourceName)) onStageSources.push(sourceName);
                constraints[sourceName] = { maxHeight: 2160 };
            });
            merged.onStageSources = onStageSources;
            merged.constraints = constraints;
        }
        this.conference.setReceiverConstraints(merged);
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
     * @returns {String}
     */
    getUserId(participantJitsiId) {
        if (this.jitsiId === participantJitsiId) return ARENA.idTag;
        // our arena id (camera name) is the jitsi display name
        return this.conference.getParticipantById(participantJitsiId)._displayName;
    },

    /**
     *
     * @param {*} participantJitsiId
     * @param {*} property
     * @returns {Object}
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
        // enableTalkWhileMuted: true,
        // enableNoisyMicDetection: true,
        p2p: {
            enabled: false,
        },

        // https://jitsi.org/blog/new-off-stage-layer-suppression-feature/
        // Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth
        enableLayerSuspension: true,

        // https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md.
        useNewBandwidthAllocationStrategy: true,

        // TODO (mwfarb): resolve bitrate throttle in lib-jitsi-meet v1844, starts at v1654
        // Current v1844 jitsi-meet client config.js:

        // Specify the settings for video quality optimizations on the client.
        // videoQuality: {
        //
        //    // Provides a way to set the codec preference on desktop based endpoints.
        //    codecPreferenceOrder: [ 'VP9', 'VP8', 'H264' ],
        //
        //    // Provides a way to set the codec for screenshare.
        //    screenshareCodec: 'AV1',
        //    mobileScreenshareCodec: 'VP8',
        //
        //    // Codec specific settings for scalability modes and max bitrates.
        //    av1: {
        //      maxBitratesVideo: {
        //          low: 100000,
        //          standard: 300000,
        //          high: 1000000,
        //          fullHd: 2000000,
        //          ultraHd: 4000000,
        //          ssHigh: 2500000
        //      },
        //      scalabilityModeEnabled: true,
        //      useSimulcast: false,
        //      useKSVC: true
        //    },
        //    h264: {
        //      maxBitratesVideo: {
        //          low: 200000,
        //          standard: 500000,
        //          high: 1500000,
        //          fullHd: 3000000,
        //          ultraHd: 6000000,
        //          ssHigh: 2500000
        //      },
        //      scalabilityModeEnabled: true
        //    },
        //    vp8: {
        //      maxBitratesVideo: {
        //          low: 200000,
        //          standard: 500000,
        //          high: 1500000,
        //          fullHd: 3000000,
        //          ultraHd: 6000000,
        //          ssHigh: 2500000
        //      },
        //      scalabilityModeEnabled: false
        //    },
        //    vp9: {
        //      maxBitratesVideo: {
        //          low: 100000,
        //          standard: 300000,
        //          high: 1200000,
        //          fullHd: 2500000,
        //          ultraHd: 5000000,
        //          ssHigh: 2500000
        //      },
        //      scalabilityModeEnabled: true,
        //      useSimulcast: false,
        //      useKSVC: true
        //    },
        //
        //    // The options can be used to override default thresholds of video thumbnail heights corresponding to
        //    // the video quality levels used in the application. At the time of this writing the allowed levels are:
        //    //     'low' - for the low quality level (180p at the time of this writing)
        //    //     'standard' - for the medium quality level (360p)
        //    //     'high' - for the high quality level (720p)
        //    // The keys should be positive numbers which represent the minimal thumbnail height for the quality level.
        //    //
        //    // With the default config value below the application will use 'low' quality until the thumbnails are
        //    // at least 360 pixels tall. If the thumbnail height reaches 720 pixels then the application will switch to
        //    // the high quality.
        //    minHeightForQualityLvl: {
        //        360: 'standard',
        //        720: 'high',
        //    },
        //
        //    // Provides a way to set the codec preference on mobile devices, both on RN and mobile browser based endpoint
        //    mobileCodecPreferenceOrder: [ 'VP8', 'VP9', 'H264' ],
        //
        // },
    },
});
