/**
 * @fileoverview ARENA Lite — Lightweight 2D conference client with spatial audio.
 *
 * Connects to the same Jitsi conference and MQTT broker as the full 3D client,
 * but renders only a gallery of video tiles with distance-based audio/video
 * constraints. No WebGL, no A-Frame, no scene rendering.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2024 ARENAXR. All rights reserved.
 */

/* global ARENAAUTH, ARENADefaults, JitsiMeetJS, $ */

// ============================================================
// Constants
// ============================================================

const SCREENSHARE_PREFIX = '#5cr33n5h4r3';
const ARENA_USER_PREFIX = '#4r3n4';
const CONF_ONLY_TAG = 'confOnly';

// Default screenshare object position (matches jitsi.js L299)
const DEFAULT_SCREENSHARE_POS = { x: 0, y: 3.1, z: -3 };
// Default spatial audio parameters (match A-Frame positional audio defaults)
const DEFAULT_MAX_AV_DIST = 20;
const DEFAULT_REF_DISTANCE = 1;
const DEFAULT_ROLLOFF_FACTOR = 1;

const DISTANCE_UPDATE_INTERVAL_MS = 1000;
const POSITION_HEARTBEAT_MS = 30000; // unused for now — Jitsi-only presence

// ============================================================
// State
// ============================================================

let conference = null;
let connection = null;
let mqttClient = null;

// Auth data from arena-account
let authData = null;

// Scene params parsed from URL path
let nameSpace = '';
let sceneName = '';
let namespacedScene = '';
let realm = 'realm';

// Our identity
let idTag = '';
let displayName = '';
let userClient = '';
const myColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

// Our slotted position in the scene
let myPosition = { ...DEFAULT_SCREENSHARE_POS };

// Spatial audio params (loaded from scene options via persistence)
let maxAVDist = DEFAULT_MAX_AV_DIST;
let refDistance = DEFAULT_REF_DISTANCE;
let rolloffFactor = DEFAULT_ROLLOFF_FACTOR;

// Screenshare anchor position
let screensharePosition = { ...DEFAULT_SCREENSHARE_POS };

// Track all remote users: jitsiId -> { arenaId, displayName, position, distance, confOnly, jitsiUser }
const remoteUsers = new Map();

// Web Audio context and per-user gain nodes
let audioContext = null;
const audioGainNodes = new Map(); // jitsiId -> { gainNode, sourceNode, audioEl }

// Jitsi local tracks
let localAudioTrack = null;
let localVideoTrack = null;
let hasAudio = false;
let hasVideo = false;

// MQTT subscription state
let mqttConnected = false;

// UI element refs (populated in initUI)
const ui = {};

// ============================================================
// Initialization — triggered by auth.js 'onauth' event
// ============================================================

window.addEventListener('onauth', async (e) => {
    authData = e.detail;
    parseSceneFromURL();
    initUI();

    // The initial JWT from auth.js is NOT scene-scoped (since 'lite' is in nonScenePaths).
    // We must refresh to get a scene-scoped token with the Jitsi 'room' claim and MQTT topic
    // permissions for this specific scene. This mirrors how the 3D client gets its token.
    updateConnectionStatus('Requesting scene auth...');

    // Set ARENA scene properties so other ARENA utilities (e.g. persistence fetch) work
    ARENA.nameSpace = nameSpace;
    ARENA.sceneName = sceneName;
    ARENA.namespacedScene = namespacedScene;

    const sceneAuth = await ARENAAUTH.refreshSceneAuth(namespacedScene);
    if (sceneAuth) {
        authData.mqtt_username = sceneAuth.mqtt_username;
        authData.mqtt_token = sceneAuth.mqtt_token;
        // Use the userid from the scene-scoped token (matches 3D client: arena.js L98)
        if (sceneAuth.ids?.userid) {
            idTag = sceneAuth.ids.userid;
        }
        if (sceneAuth.ids?.userclient) {
            userClient = sceneAuth.ids.userclient;
        }
        console.log('[Lite] Scene-scoped auth acquired for', namespacedScene, 'idTag:', idTag, 'userClient:', userClient);
    } else {
        console.error('[Lite] Failed to acquire scene-scoped auth — Jitsi/MQTT may not work');
    }

    await loadSceneOptions();
    computeSlotPosition();
    connectMQTT();
    connectJitsi();
    startDistanceLoop();
    updateFooter();
});

// ============================================================
// URL Parsing
// ============================================================

function parseSceneFromURL() {
    // auth.js setSceneName() already parsed the URL path into ARENA.nameSpace/sceneName.
    // For /lite/ (a nonScenePath), we accept ?scene=ns/sceneName as the query param.
    realm = ARENA.defaults?.realm || 'realm';

    // Prefer ?scene= query param (authoritative for the lite client).
    // auth.js setSceneName() will have incorrectly parsed '/lite/' as sceneName='lite',
    // so we must check the query param first.
    const queryParams = new URLSearchParams(window.location.search);
    const sceneParam = queryParams.get('scene');

    if (sceneParam) {
        // Use ?scene=namespace/sceneName query param
        const parts = sceneParam.split('/').filter(Boolean);
        if (parts.length >= 2) {
            nameSpace = parts[0];
            sceneName = parts[1];
        } else if (parts.length === 1) {
            nameSpace = ARENA.defaults?.namespace || 'public';
            sceneName = parts[0];
        }
    } else {
        nameSpace = ARENA.defaults?.namespace || 'public';
        sceneName = ARENA.defaults?.sceneName || 'lobby';
    }
    namespacedScene = `${nameSpace}/${sceneName}`;

    // Set identity
    idTag = ARENA.idTag || authData.mqtt_username || `lite_${Date.now().toString(36)}`;
    displayName = ARENA.displayName || localStorage.getItem('display_name') || 'Lite User';

    document.getElementById('scene-title').textContent = `ARENA Lite — ${namespacedScene}`;
    document.title = `ARENA Lite — ${namespacedScene}`;
}

// ============================================================
// Scene Options — fetch spatial audio params from persistence API
// ============================================================

async function loadSceneOptions() {
    try {
        const persistHost = ARENA.defaults?.persistHost || window.location.hostname;
        const persistPath = ARENA.defaults?.persistPath || '/persist';
        const url = `//${persistHost}${persistPath}/${nameSpace}/${sceneName}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${authData.mqtt_token}` },
        });
        if (!res.ok) return;
        const objects = await res.json();

        // Find scene-options object for spatial audio params
        const sceneOpts = objects.find((o) => o.type === 'scene-options' || o.object_id === 'scene-options');
        if (sceneOpts?.attributes?.['scene-options']) {
            const opts = sceneOpts.attributes['scene-options'];
            if (opts.maxAVDist !== undefined) maxAVDist = opts.maxAVDist;
            if (opts.refDistance !== undefined) refDistance = opts.refDistance;
            if (opts.rolloffFactor !== undefined) rolloffFactor = opts.rolloffFactor;
        }

        // Find screenshareable/screenshare object position for slot anchor
        // Prefer the oldest screenshareable object; fall back to default
        const screenshareableObjs = objects
            .filter((o) => o.attributes?.screenshareable || o.object_id === 'screenshare')
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        if (screenshareableObjs.length > 0) {
            const pos = screenshareableObjs[0].attributes?.position;
            if (pos) {
                screensharePosition = { x: pos.x || 0, y: pos.y || 3.1, z: pos.z || -3 };
            }
        }
    } catch (err) {
        console.warn('[Lite] Failed to load scene options from persistence:', err);
    }
}

// ============================================================
// Slot Position Calculator
// ============================================================

function computeSlotPosition() {
    // For now, use the screenshare position directly.
    // When multiple lite users join, 3D clients compute a semicircle deterministically.
    // The lite client uses its own index in the sorted confOnly participant list.
    myPosition = {
        x: screensharePosition.x,
        y: screensharePosition.y - 1.5, // slightly below the screenshare (audience level)
        z: screensharePosition.z + 2,   // 2m in front of the screenshare
    };
    updateFooter();
}

/**
 * Recompute our slot position based on current confOnly participants.
 * All clients (3D and lite) must produce the same result for the same inputs.
 * @param {string[]} sortedConfOnlyIds Sorted array of Jitsi participant IDs of confOnly users
 * @param {string} myJitsiId Our own Jitsi participant ID
 */
function recomputeSlotFromParticipants(sortedConfOnlyIds, myJitsiId) {
    const myIndex = sortedConfOnlyIds.indexOf(myJitsiId);
    if (myIndex < 0) return;

    const totalSlots = sortedConfOnlyIds.length;
    const arcAngle = Math.PI * 0.6; // 108 degrees semicircle
    const radius = 3; // 3m radius from screenshare anchor
    const angleStep = totalSlots > 1 ? arcAngle / (totalSlots - 1) : 0;
    const startAngle = -arcAngle / 2;
    const angle = startAngle + angleStep * myIndex;

    myPosition = {
        x: screensharePosition.x + Math.sin(angle) * radius,
        y: screensharePosition.y - 1.5,
        z: screensharePosition.z + Math.cos(angle) * radius,
    };
    updateFooter();
}

// ============================================================
// MQTT Connection — subscribe to camera positions + chat
// ============================================================

function connectMQTT() {
    // Use the Paho MQTT client if available; fall back to basic WebSocket
    // For now, we use a simple WebSocket approach matching the ARENA pattern
    const mqttHost = ARENA.defaults?.mqttHost || window.location.hostname;
    const mqttPath = ARENA.defaults?.mqttPath || '/mqtt';

    const clientId = `lite-${idTag}-${Date.now().toString(36)}`;
    const wsUrl = `wss://${mqttHost}${mqttPath}`;

    // Use native WebSocket MQTT (lightweight, no Paho needed)
    // Topic structure: realm/s/{ns}/{scene}/{msgType}/{userClient}/{uuid}
    // We subscribe to user topics (u) for camera positions and chat topics (c)
    const userTopicSub = `${realm}/s/${nameSpace}/${sceneName}/u/+/+`;
    const chatTopicSub = `${realm}/s/${nameSpace}/${sceneName}/c/+/+`;
    const presenceTopicSub = `${realm}/s/${nameSpace}/${sceneName}/x/+/+`;

    try {
        const ws = new WebSocket(wsUrl, 'mqtt');
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('[Lite MQTT] WebSocket connected');
            // Send MQTT CONNECT packet
            const connectPacket = buildMqttConnectPacket(clientId, authData.mqtt_username, authData.mqtt_token);
            ws.send(connectPacket);
        };

        ws.onmessage = (event) => {
            handleMqttMessage(event.data);
        };

        ws.onerror = (err) => {
            console.error('[Lite MQTT] WebSocket error:', err);
            updateConnectionStatus('MQTT error');
        };

        ws.onclose = () => {
            console.log('[Lite MQTT] WebSocket closed');
            mqttConnected = false;
            updateConnectionStatus('MQTT disconnected');
        };

        // Store WS and topics for subscription after CONNACK
        window._liteMqtt = { ws, topics: [userTopicSub, chatTopicSub, presenceTopicSub] };
    } catch (err) {
        console.error('[Lite MQTT] Connection failed:', err);
    }
}

// Minimal MQTT v3.1.1 packet builders (only what we need for subscribe-only)

function buildMqttConnectPacket(clientId, username, password) {
    const protocolName = encodeUtf8String('MQTT');
    const protocolLevel = 4; // MQTT 3.1.1
    const connectFlags = 0xc2; // username + password + clean session
    const keepAlive = 60;

    const clientIdBytes = encodeUtf8String(clientId);
    const usernameBytes = encodeUtf8String(username);
    const passwordBytes = encodeUtf8String(password);

    const remainingLength =
        protocolName.length + 1 + 1 + 2 + clientIdBytes.length + usernameBytes.length + passwordBytes.length;

    const packet = new Uint8Array(1 + encodedRemainingLength(remainingLength).length + remainingLength);
    let offset = 0;

    packet[offset++] = 0x10; // CONNECT packet type
    const rl = encodedRemainingLength(remainingLength);
    packet.set(rl, offset);
    offset += rl.length;

    packet.set(protocolName, offset);
    offset += protocolName.length;
    packet[offset++] = protocolLevel;
    packet[offset++] = connectFlags;
    packet[offset++] = (keepAlive >> 8) & 0xff;
    packet[offset++] = keepAlive & 0xff;
    packet.set(clientIdBytes, offset);
    offset += clientIdBytes.length;
    packet.set(usernameBytes, offset);
    offset += usernameBytes.length;
    packet.set(passwordBytes, offset);

    return packet.buffer;
}

function buildMqttSubscribePacket(packetId, topics) {
    let payload = new Uint8Array(0);
    topics.forEach((topic) => {
        const topicBytes = encodeUtf8String(topic);
        const old = payload;
        payload = new Uint8Array(old.length + topicBytes.length + 1);
        payload.set(old, 0);
        payload.set(topicBytes, old.length);
        payload[old.length + topicBytes.length] = 0; // QoS 0
    });

    const packetIdBytes = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
    const remainingLength = packetIdBytes.length + payload.length;
    const rl = encodedRemainingLength(remainingLength);

    const packet = new Uint8Array(1 + rl.length + remainingLength);
    let offset = 0;
    packet[offset++] = 0x82; // SUBSCRIBE packet type
    packet.set(rl, offset);
    offset += rl.length;
    packet.set(packetIdBytes, offset);
    offset += packetIdBytes.length;
    packet.set(payload, offset);

    return packet.buffer;
}

function buildMqttPingreqPacket() {
    return new Uint8Array([0xc0, 0x00]).buffer;
}

function encodeUtf8String(str) {
    const encoded = new TextEncoder().encode(str);
    const result = new Uint8Array(2 + encoded.length);
    result[0] = (encoded.length >> 8) & 0xff;
    result[1] = encoded.length & 0xff;
    result.set(encoded, 2);
    return result;
}

function encodedRemainingLength(length) {
    const bytes = [];
    let x = length;
    do {
        let encodedByte = x % 128;
        x = Math.floor(x / 128);
        if (x > 0) encodedByte |= 0x80;
        bytes.push(encodedByte);
    } while (x > 0);
    return new Uint8Array(bytes);
}

let mqttPacketId = 1;
let mqttPingInterval = null;

function handleMqttMessage(data) {
    const bytes = new Uint8Array(data);
    if (bytes.length === 0) return;

    const packetType = (bytes[0] >> 4) & 0x0f;

    switch (packetType) {
        case 2: // CONNACK
            if (bytes[3] === 0) {
                console.log('[Lite MQTT] Connected successfully');
                mqttConnected = true;
                updateConnectionStatus('Connected');
                // Subscribe to topics
                const { ws, topics } = window._liteMqtt;
                ws.send(buildMqttSubscribePacket(mqttPacketId++, topics));
                // Start publishing camera position so 3D clients see us
                startCameraHeartbeat();
                // Start ping keepalive
                mqttPingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(buildMqttPingreqPacket());
                    }
                }, 45000);
            } else {
                console.error('[Lite MQTT] Connection refused:', bytes[3]);
                updateConnectionStatus('Auth failed');
            }
            break;

        case 3: // PUBLISH
            handleMqttPublish(bytes);
            break;

        case 9: // SUBACK
            console.log('[Lite MQTT] Subscribed successfully');
            break;

        case 13: // PINGRESP
            break;

        default:
            break;
    }
}

function handleMqttPublish(bytes) {
    // Parse PUBLISH packet
    let offset = 0;
    const firstByte = bytes[offset++];

    // Remaining length
    let remainingLength = 0;
    let multiplier = 1;
    let encodedByte;
    do {
        encodedByte = bytes[offset++];
        remainingLength += (encodedByte & 0x7f) * multiplier;
        multiplier *= 128;
    } while ((encodedByte & 0x80) !== 0);

    // Topic
    const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    const topic = new TextDecoder().decode(bytes.slice(offset, offset + topicLen));
    offset += topicLen;

    // QoS check (bits 1-2 of first byte)
    const qos = (firstByte >> 1) & 0x03;
    if (qos > 0) {
        offset += 2; // skip packet identifier
    }

    // Payload
    const payloadBytes = bytes.slice(offset);
    const payload = new TextDecoder().decode(payloadBytes);

    try {
        const msg = JSON.parse(payload);
        processMessage(topic, msg);
    } catch {
        // Non-JSON message, ignore
    }
}

function processMessage(topic, msg) {
    const parts = topic.split('/');
    // realm/s/{ns}/{scene}/{msgType}/{userClient}/{uuid}
    if (parts.length < 7) return;
    const msgType = parts[4]; // u = user, c = chat, x = presence

    if (msgType === 'u') {
        // Camera/user position update
        const objectId = parts[6] || msg.object_id;
        if (objectId && objectId.startsWith('camera_')) {
            const arenaIdTag = objectId.replace('camera_', '');
            if (arenaIdTag === idTag) return; // ignore self

            const pos = msg.data?.position;
            if (pos) {
                // Update position in remoteUsers if we have a matching user
                for (const [jid, user] of remoteUsers) {
                    if (user.arenaId === arenaIdTag) {
                        user.position = { x: pos.x || 0, y: pos.y || 0, z: pos.z || 0 };
                        break;
                    }
                }
            }
        }
    } else if (msgType === 'c') {
        // Chat message
        if (msg.text) {
            const sender = msg.from_un || msg.displayName || 'Unknown';
            appendChatMessage(sender, msg.text);
        }
    } else if (msgType === 'x') {
        // Presence — we use Jitsi for presence instead, so just log
    }
}

// ============================================================
// MQTT Chat — send messages
// ============================================================

function sendChatMessage(text) {
    if (!mqttConnected || !window._liteMqtt?.ws) return;

    const chatTopic = `${realm}/s/${nameSpace}/${sceneName}/c/${userClient}/${idTag}`;
    const msg = {
        object_id: idTag,
        type: 'chat',
        from_un: displayName,
        from_uid: idTag,
        to_uid: 'all', // public message
        text: text,
        timestamp: new Date().toISOString(),
    };

    publishMqttMessage(chatTopic, msg);
}

// ============================================================
// MQTT Camera Position — publish so 3D clients create arena-user
// ============================================================

const CAMERA_HEARTBEAT_MS = 1000;
let cameraHeartbeatTimer = null;

function startCameraHeartbeat() {
    // Publish initial create
    publishCameraPosition('create');
    // Then update every CAMERA_HEARTBEAT_MS
    cameraHeartbeatTimer = setInterval(() => {
        publishCameraPosition('update');
    }, CAMERA_HEARTBEAT_MS);
}

/**
 * Publish camera position matching arena-camera.js format.
 * Topic: realm/s/{ns}/{scene}/u/{userClient}/{idTag}
 * The 3D client's arena-user.js listens for these to create/update user entities.
 */
function publishCameraPosition(action = 'update') {
    if (!mqttConnected || !window._liteMqtt?.ws) return;

    const userTopic = `${realm}/s/${nameSpace}/${sceneName}/u/${userClient}/${idTag}`;

    const msg = {
        object_id: idTag,
        action,
        type: 'object',
        ttl: 30,
        data: {
            object_type: 'camera',
            position: {
                x: Math.round(myPosition.x * 1000) / 1000,
                y: Math.round(myPosition.y * 1000) / 1000,
                z: Math.round(myPosition.z * 1000) / 1000,
            },
            rotation: { x: 0, y: 0, z: 0, w: 1 }, // facing forward
            'arena-user': {
                displayName: `${displayName} (Lite)`,
                color: myColor,
                hasAudio: hasAudio,
                hasVideo: hasVideo,
                jitsiId: conference ? conference.myUserId() : '',
            },
        },
    };

    publishMqttMessage(userTopic, msg);
}

/**
 * Generic MQTT PUBLISH helper (QoS 0).
 */
function publishMqttMessage(topic, msg) {
    if (!window._liteMqtt?.ws || window._liteMqtt.ws.readyState !== WebSocket.OPEN) return;

    const payload = JSON.stringify(msg);
    const topicBytes = new TextEncoder().encode(topic);
    const payloadBytes = new TextEncoder().encode(payload);

    const remainingLength = 2 + topicBytes.length + payloadBytes.length;
    const rl = encodedRemainingLength(remainingLength);

    const packet = new Uint8Array(1 + rl.length + remainingLength);
    let offset = 0;
    packet[offset++] = 0x30; // PUBLISH, QoS 0
    packet.set(rl, offset);
    offset += rl.length;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset);
    offset += topicBytes.length;
    packet.set(payloadBytes, offset);

    window._liteMqtt.ws.send(packet.buffer);
}

// ============================================================
// Jitsi Connection
// ============================================================

function connectJitsi() {
    if (!window.JitsiMeetJS) {
        console.error('[Lite] JitsiMeetJS not found');
        return;
    }

    const jitsiHost = ARENA.defaults?.jitsiHost || 'jitsi0.andrew.cmu.edu:8443';

    JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
    JitsiMeetJS.init({ disableAudioLevels: false });

    const connectOptions = {
        hosts: {
            domain: jitsiHost.split(':')[0],
            muc: `conference.${jitsiHost.split(':')[0]}`,
        },
        serviceUrl: `//${jitsiHost}/http-bind`,
        clientNode: 'http://jitsi.org/jitsimeet',
    };

    // Use JWT from arena-account for Jitsi auth
    const token = authData.mqtt_token;

    connection = new JitsiMeetJS.JitsiConnection('arena', token, connectOptions);

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onJitsiConnectionSuccess);
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (errType, msg) => {
        console.error('[Lite Jitsi] Connection failed:', errType, msg);
        updateConnectionStatus('Jitsi connection failed');
    });
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
        console.log('[Lite Jitsi] Disconnected');
        updateConnectionStatus('Jitsi disconnected');
    });

    connection.connect();
}

function onJitsiConnectionSuccess() {
    console.log('[Lite Jitsi] Connected');

    // Conference name must match the full 3D client's sanitization (jitsi.js)
    const conferenceName = namespacedScene.toLowerCase().replace(/[!#$&'()*+,/:;=?@[\\\]]/g, '_');

    const confOptions = {
        openBridgeChannel: true,
        enableLayerSuspension: true,
    };

    conference = connection.initJitsiConference(conferenceName, confOptions);

    conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
    conference.on(JitsiMeetJS.events.conference.USER_JOINED, onUserJoined);
    conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
    conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
    conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
        if (track.isLocal()) return;
        const jid = track.getParticipantId();
        if (track.getType() === 'audio') {
            removeAudioGain(jid);
        }
        updateGalleryTile(jid);
    });
    conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track) => {
        if (track.isLocal()) return;
        const jid = track.getParticipantId();
        updateGalleryTile(jid);
    });
    conference.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
        // Highlight the speaking user's tile
        document.querySelectorAll('.video-tile.speaking').forEach((el) => el.classList.remove('speaking'));
        const tile = document.getElementById(`tile-${id}`);
        if (tile) tile.classList.add('speaking');
    });

    // Listen for participant properties (arenaId, arenaDisplayName, confOnly)
    conference.on(JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED, (user, key, oldVal, newVal) => {
        const jid = user.getId();
        const userData = remoteUsers.get(jid);
        if (!userData) return;

        if (key === 'arenaId') userData.arenaId = newVal;
        if (key === 'arenaDisplayName') userData.displayName = newVal;
        if (key === CONF_ONLY_TAG) userData.confOnly = newVal === 'true' || newVal === true;

        updateGalleryTile(jid);
        updateUserList();
        recomputeConfOnlySlots();
    });

    conference.join();
}

function onConferenceJoined() {
    console.log('[Lite Jitsi] Conference joined');
    const myJitsiId = conference.myUserId();

    // Set our participant properties — Jitsi-only presence model
    conference.setDisplayName(`${displayName} (${ARENA_USER_PREFIX}_${idTag})`);
    conference.setLocalParticipantProperty('arenaId', idTag);
    conference.setLocalParticipantProperty('arenaDisplayName', displayName);
    conference.setLocalParticipantProperty(CONF_ONLY_TAG, 'true');

    updateConnectionStatus('Connected');
    updateGalleryEmpty();

    // Recompute our slot now that we're in the conference
    recomputeConfOnlySlots();

    // Create local A/V tracks using saved ARENA device prefs from localStorage
    createLocalTracks();
}

/**
 * Create local audio/video tracks using saved ARENA device preferences.
 * Borrows prefAudioInput / prefVideoInput from the 3D client's localStorage.
 */
async function createLocalTracks() {
    const prefAudioInput = localStorage.getItem('prefAudioInput');
    const prefVideoInput = localStorage.getItem('prefVideoInput');

    const devices = ['audio'];
    const deviceOpts = {};

    if (prefAudioInput) {
        deviceOpts.micDeviceId = prefAudioInput;
    }

    // Try to get video
    try {
        const vidConstraint = prefVideoInput
            ? { deviceId: { exact: prefVideoInput } }
            : true;
        const stream = await navigator.mediaDevices.getUserMedia({ video: vidConstraint });
        stream.getTracks().forEach((t) => t.stop()); // release probe stream
        devices.push('video');
        if (prefVideoInput) {
            deviceOpts.cameraDeviceId = prefVideoInput;
        }
    } catch (e) {
        console.warn('[Lite] No video device available:', e.message);
        // Fall back: try any video device
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((t) => t.stop());
            devices.push('video');
        } catch {
            console.warn('[Lite] No video device available at all, audio only');
        }
    }

    console.log('[Lite] Creating local tracks:', devices, deviceOpts);

    try {
        const tracks = await JitsiMeetJS.createLocalTracks({ devices, ...deviceOpts });
        for (const track of tracks) {
            if (track.getType() === 'audio') {
                localAudioTrack = track;
                conference.addTrack(track);
                track.mute(); // start muted
                hasAudio = false;
                console.log('[Lite] Local audio track added (muted)');
            } else if (track.getType() === 'video') {
                localVideoTrack = track;
                conference.addTrack(track);
                track.mute(); // start muted
                hasVideo = false;
                console.log('[Lite] Local video track added (muted)');
                // Show self-preview (even muted, so user sees their cam works)
                createSelfPreviewTile(track);
            }
        }
        // Update mute button states
        updateMuteButtons();
    } catch (err) {
        console.error('[Lite] Failed to create local tracks:', err);
    }
}

/**
 * Create a self-preview tile showing our local video feed.
 */
function createSelfPreviewTile(videoTrack) {
    // Remove any existing self tile
    const existing = document.getElementById('tile-self');
    if (existing) existing.remove();

    const tile = document.createElement('div');
    tile.className = 'video-tile self-tile';
    tile.id = 'tile-self';

    const videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true; // self-preview: don't play own audio
    videoEl.style.transform = 'scaleX(-1)'; // mirror
    videoTrack.attach(videoEl);
    tile.appendChild(videoEl);

    const label = document.createElement('div');
    label.className = 'tile-label';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = `${displayName} (You)`;
    label.appendChild(nameSpan);
    tile.appendChild(label);

    // Insert self tile first in gallery
    if (ui.gallery.firstChild) {
        ui.gallery.insertBefore(tile, ui.gallery.firstChild);
    } else {
        ui.gallery.appendChild(tile);
    }
    updateGalleryEmpty();
}

function onUserJoined(jid) {
    const participant = conference.getParticipantById(jid);
    if (!participant) return;

    const dn = participant.getDisplayName() || `User ${jid.substring(0, 6)}`;
    const arenaId = participant.getProperty('arenaId') || jid;
    const arenaDisplayName = participant.getProperty('arenaDisplayName') || dn;
    const isConfOnly = participant.getProperty(CONF_ONLY_TAG) === 'true';

    // Skip screenshare pseudo-participants
    if (dn.includes(SCREENSHARE_PREFIX)) return;

    remoteUsers.set(jid, {
        arenaId,
        displayName: arenaDisplayName,
        position: null, // will be filled by MQTT camera messages
        distance: Infinity,
        confOnly: isConfOnly,
        jitsiUser: participant,
    });

    createGalleryTile(jid);
    updateUserList();
    recomputeConfOnlySlots();
}

function onUserLeft(jid) {
    removeAudioGain(jid);
    remoteUsers.delete(jid);

    const tile = document.getElementById(`tile-${jid}`);
    if (tile) tile.remove();

    updateGalleryEmpty();
    updateUserList();
    recomputeConfOnlySlots();
}

function onRemoteTrack(track) {
    if (track.isLocal()) return;
    const jid = track.getParticipantId();
    if (!remoteUsers.has(jid)) return;

    if (track.getType() === 'audio') {
        // Route audio through Web Audio GainNode for distance-based volume
        setupAudioGain(jid, track);
    } else if (track.getType() === 'video') {
        // Attach video to gallery tile
        const tile = document.getElementById(`tile-${jid}`);
        if (tile) {
            let videoEl = tile.querySelector('video');
            if (!videoEl) {
                // Remove avatar placeholder
                const avatar = tile.querySelector('.tile-avatar');
                if (avatar) avatar.remove();
                videoEl = document.createElement('video');
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.muted = true; // video-only; audio goes through Web Audio
                tile.insertBefore(videoEl, tile.firstChild);
            }
            track.attach(videoEl);
        }
    }
    updateGalleryTile(jid);
}

// ============================================================
// Web Audio — Distance-based gain per user
// ============================================================

function getOrCreateAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function setupAudioGain(jid, audioTrack) {
    removeAudioGain(jid); // clean up any previous

    const ctx = getOrCreateAudioContext();

    // Create an audio element to receive the Jitsi track
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.id = `lite-audio-${jid}`;
    audioTrack.attach(audioEl);

    // Route through Web Audio for gain control
    const sourceNode = ctx.createMediaElementSource(audioEl);
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0; // will be set by distance calc

    sourceNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    audioGainNodes.set(jid, { gainNode, sourceNode, audioEl });
}

function removeAudioGain(jid) {
    const entry = audioGainNodes.get(jid);
    if (entry) {
        try {
            entry.sourceNode.disconnect();
            entry.gainNode.disconnect();
            entry.audioEl.pause();
            entry.audioEl.srcObject = null;
            entry.audioEl.remove();
        } catch (e) {
            // cleanup best-effort
        }
        audioGainNodes.delete(jid);
    }
}

/**
 * Compute gain using the inverse distance model (matching Web Audio spec):
 *   gain = refDistance / (refDistance + rolloffFactor * (distance - refDistance))
 * Clamped to [0, 1]. Beyond maxAVDist, gain = 0.
 */
function computeGain(distance) {
    if (distance > maxAVDist) return 0;
    if (distance <= refDistance) return 1;
    const gain = refDistance / (refDistance + rolloffFactor * (distance - refDistance));
    return Math.max(0, Math.min(1, gain));
}

// ============================================================
// Distance Calculation Loop
// ============================================================

function startDistanceLoop() {
    setInterval(updateDistances, DISTANCE_UPDATE_INTERVAL_MS);
}

function updateDistances() {
    for (const [jid, user] of remoteUsers) {
        if (user.position) {
            const dx = myPosition.x - user.position.x;
            const dy = myPosition.y - user.position.y;
            const dz = myPosition.z - user.position.z;
            user.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        } else if (user.confOnly) {
            // Other lite users — we know their deterministic slot position
            // For now, treat them as nearby (same slot area)
            user.distance = 2;
        } else {
            user.distance = Infinity; // no position data yet
        }

        // Update Web Audio gain
        const gainEntry = audioGainNodes.get(jid);
        if (gainEntry) {
            const gain = computeGain(user.distance);
            // Smooth transition to avoid clicks
            gainEntry.gainNode.gain.setTargetAtTime(gain, audioContext.currentTime, 0.1);
        }

        // Update video constraints
        if (conference) {
            updateVideoConstraints(jid, user.distance);
        }
    }

    // Re-sort gallery tiles by distance
    sortGalleryTiles();

    // Update user list if panel is open
    if (ui.usersPanel && ui.usersPanel.style.display !== 'none') {
        updateUserList();
    }

    // Update badge
    updateBadge();
}

function updateVideoConstraints(jid, distance) {
    // Match arena-user.js behavior: if distance > maxAVDist, request 0 (drop video)
    // Otherwise scale resolution by distance
    let maxHeight = 0;
    if (distance <= maxAVDist) {
        if (distance < 5) {
            maxHeight = 720;
        } else if (distance < 10) {
            maxHeight = 360;
        } else if (distance < maxAVDist) {
            maxHeight = 180;
        }
    }

    try {
        conference.setReceiverConstraints({
            colibriClass: 'ReceiverVideoConstraints',
            constraints: {
                [jid]: { maxHeight },
            },
        });
    } catch (e) {
        // setReceiverConstraints may not be available in all versions
    }
}

// ============================================================
// ConfOnly Slot Recomputation
// ============================================================

function recomputeConfOnlySlots() {
    if (!conference) return;

    // Gather all confOnly participant IDs (including ourselves)
    const confOnlyIds = [];
    const myJitsiId = conference.myUserId();

    // Add self if we're confOnly (we always are in the lite client)
    confOnlyIds.push(myJitsiId);

    // Add remote confOnly users
    for (const [jid, user] of remoteUsers) {
        if (user.confOnly) {
            confOnlyIds.push(jid);
        }
    }

    // Sort deterministically by Jitsi participant ID
    confOnlyIds.sort();

    // Recompute our own position
    recomputeSlotFromParticipants(confOnlyIds, myJitsiId);
}

// ============================================================
// UI — Gallery
// ============================================================

function initUI() {
    ui.gallery = document.getElementById('gallery');
    ui.galleryEmpty = document.getElementById('gallery-empty');
    ui.usersPanel = document.getElementById('users-panel');
    ui.chatPanel = document.getElementById('chat-panel');
    ui.nearbyList = document.getElementById('nearby-list');
    ui.farList = document.getElementById('far-list');
    ui.usersFar = document.getElementById('users-far');
    ui.badge = document.getElementById('user-badge');
    ui.chatMessages = document.getElementById('chat-messages');
    ui.chatInput = document.getElementById('chat-input');
    ui.chatDot = document.getElementById('chat-dot');

    // Button handlers
    document.getElementById('users-btn').addEventListener('click', toggleUsersPanel);
    document.getElementById('chat-btn').addEventListener('click', toggleChatPanel);
    document.getElementById('close-users').addEventListener('click', () => {
        ui.usersPanel.style.display = 'none';
    });
    document.getElementById('close-chat').addEventListener('click', () => {
        ui.chatPanel.style.display = 'none';
    });
    document.getElementById('chat-send').addEventListener('click', () => {
        const text = ui.chatInput.value.trim();
        if (text) {
            sendChatMessage(text);
            appendChatMessage(displayName, text, true);
            ui.chatInput.value = '';
        }
    });
    ui.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-send').click();
        }
    });

    // Mic toggle
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    // Camera toggle
    document.getElementById('cam-btn').addEventListener('click', toggleCam);
}

function createGalleryTile(jid) {
    const user = remoteUsers.get(jid);
    if (!user) return;

    // Remove empty state
    updateGalleryEmpty();

    const tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.id = `tile-${jid}`;

    // Avatar placeholder (will be replaced if video track arrives)
    const avatar = document.createElement('div');
    avatar.className = 'tile-avatar';
    avatar.textContent = (user.displayName || '?').charAt(0).toUpperCase();
    tile.appendChild(avatar);

    // Label bar
    const label = document.createElement('div');
    label.className = 'tile-label';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = decodeURIComponent(user.displayName || jid);
    label.appendChild(nameSpan);

    const distSpan = document.createElement('span');
    distSpan.className = 'distance-tag';
    distSpan.textContent = '';
    label.appendChild(distSpan);

    tile.appendChild(label);
    ui.gallery.appendChild(tile);
}

function updateGalleryTile(jid) {
    const tile = document.getElementById(`tile-${jid}`);
    const user = remoteUsers.get(jid);
    if (!tile || !user) return;

    // Update name
    const nameSpan = tile.querySelector('.user-name');
    if (nameSpan) {
        let label = decodeURIComponent(user.displayName || jid);
        if (user.confOnly) label += ' (2D)';
        nameSpan.textContent = label;
    }

    // Update distance tag
    const distSpan = tile.querySelector('.distance-tag');
    if (distSpan) {
        if (user.distance !== Infinity) {
            distSpan.textContent = `${user.distance.toFixed(1)}m`;
        } else {
            distSpan.textContent = '';
        }
    }

    // Out of range styling
    if (user.distance > maxAVDist) {
        tile.classList.add('out-of-range');
    } else {
        tile.classList.remove('out-of-range');
    }
}

function sortGalleryTiles() {
    const tiles = Array.from(ui.gallery.querySelectorAll('.video-tile'));
    tiles.sort((a, b) => {
        const aJid = a.id.replace('tile-', '');
        const bJid = b.id.replace('tile-', '');
        const aUser = remoteUsers.get(aJid);
        const bUser = remoteUsers.get(bJid);
        const aDist = aUser?.distance ?? Infinity;
        const bDist = bUser?.distance ?? Infinity;
        return aDist - bDist;
    });
    tiles.forEach((tile) => ui.gallery.appendChild(tile));
}

function updateGalleryEmpty() {
    if (ui.galleryEmpty) {
        if (remoteUsers.size === 0) {
            ui.galleryEmpty.style.display = 'flex';
            ui.galleryEmpty.querySelector('p').textContent = mqttConnected
                ? 'No other users in the scene yet.'
                : 'Connecting to scene...';
        } else {
            ui.galleryEmpty.style.display = 'none';
        }
    }
}

// ============================================================
// UI — User List Panel
// ============================================================

function toggleUsersPanel() {
    if (ui.usersPanel.style.display === 'none') {
        ui.usersPanel.style.display = 'flex';
        ui.chatPanel.style.display = 'none';
        updateUserList();
    } else {
        ui.usersPanel.style.display = 'none';
    }
}

function updateUserList() {
    const nearby = [];
    const far = [];

    // Add self to nearby
    nearby.push({ id: idTag, name: displayName, distance: 0, isMe: true, confOnly: true });

    for (const [jid, user] of remoteUsers) {
        const entry = {
            id: user.arenaId || jid,
            name: user.displayName || jid,
            distance: user.distance,
            confOnly: user.confOnly,
            isMe: false,
        };
        if (user.distance <= maxAVDist) {
            nearby.push(entry);
        } else {
            far.push(entry);
        }
    }

    // Sort by distance within each group
    nearby.sort((a, b) => a.distance - b.distance);
    far.sort((a, b) => a.distance - b.distance);

    // Render nearby
    ui.nearbyList.innerHTML = '';
    nearby.forEach((u) => {
        const li = document.createElement('li');
        if (u.isMe) li.classList.add('is-me');
        if (u.confOnly) li.classList.add('is-conf');

        let label = decodeURIComponent(u.name);
        if (u.isMe) label += ' (Me)';
        else if (u.confOnly) label += ' (2D)';

        li.textContent = label;

        if (u.distance !== 0 && u.distance !== Infinity) {
            const distSpan = document.createElement('span');
            distSpan.className = 'user-distance';
            distSpan.textContent = `${u.distance.toFixed(1)}m`;
            li.appendChild(distSpan);
        }
        ui.nearbyList.appendChild(li);
    });

    // Render far (out of range)
    ui.farList.innerHTML = '';
    if (far.length > 0) {
        ui.usersFar.style.display = 'block';
        far.forEach((u) => {
            const li = document.createElement('li');
            li.classList.add('out-of-range');
            let label = decodeURIComponent(u.name);
            if (u.confOnly) label += ' (2D)';
            li.textContent = label;

            const distSpan = document.createElement('span');
            distSpan.className = 'user-distance';
            distSpan.textContent = u.distance !== Infinity ? `${u.distance.toFixed(1)}m` : '?';
            li.appendChild(distSpan);
            ui.farList.appendChild(li);
        });
    } else {
        ui.usersFar.style.display = 'none';
    }
}

function updateBadge() {
    let nearbyCount = 1; // self
    let totalCount = 1; // self

    for (const [, user] of remoteUsers) {
        totalCount++;
        if (user.distance <= maxAVDist) nearbyCount++;
    }

    // Conditional N/M format: only show "N/M" when some users are out of range
    if (nearbyCount < totalCount) {
        ui.badge.textContent = `${nearbyCount}/${totalCount}`;
    } else {
        ui.badge.textContent = `${totalCount}`;
    }
}

// ============================================================
// UI — Chat Panel
// ============================================================

let unreadMessages = 0;

function toggleChatPanel() {
    if (ui.chatPanel.style.display === 'none') {
        ui.chatPanel.style.display = 'flex';
        ui.usersPanel.style.display = 'none';
        unreadMessages = 0;
        ui.chatDot.style.display = 'none';
        ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
        ui.chatInput.focus();
    } else {
        ui.chatPanel.style.display = 'none';
    }
}

function appendChatMessage(sender, text, isSelf = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';

    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.textContent = isSelf ? 'You' : decodeURIComponent(sender);
    msgDiv.appendChild(senderSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-time';
    timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgDiv.appendChild(timeSpan);

    const textNode = document.createTextNode(text);
    msgDiv.appendChild(textNode);

    ui.chatMessages.appendChild(msgDiv);
    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;

    // Update unread dot if chat panel is closed
    if (!isSelf && ui.chatPanel.style.display === 'none') {
        unreadMessages++;
        ui.chatDot.textContent = unreadMessages < 100 ? unreadMessages : '...';
        ui.chatDot.style.display = 'flex';
    }
}

// ============================================================
// UI — Mic / Camera Toggles
// ============================================================

async function toggleMic() {
    const btn = document.getElementById('mic-btn');
    const iconOn = document.getElementById('mic-icon-on');
    const iconOff = document.getElementById('mic-icon-off');

    // Resume audio context on user gesture
    getOrCreateAudioContext();

    if (hasAudio && localAudioTrack) {
        // Mute
        localAudioTrack.mute();
        hasAudio = false;
        btn.classList.add('mic-off');
        btn.classList.remove('mic-on');
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
    } else if (localAudioTrack) {
        // Unmute existing track
        localAudioTrack.unmute();
        hasAudio = true;
        btn.classList.remove('mic-off');
        btn.classList.add('mic-on');
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
    } else {
        // No track yet — create one
        try {
            const tracks = await JitsiMeetJS.createLocalTracks({ devices: ['audio'] });
            localAudioTrack = tracks[0];
            if (conference) conference.addTrack(localAudioTrack);
            hasAudio = true;
            btn.classList.remove('mic-off');
            btn.classList.add('mic-on');
            iconOn.style.display = 'block';
            iconOff.style.display = 'none';
        } catch (e) {
            console.error('[Lite] Failed to create audio track:', e);
        }
    }
}

async function toggleCam() {
    const btn = document.getElementById('cam-btn');
    const iconOn = document.getElementById('cam-icon-on');
    const iconOff = document.getElementById('cam-icon-off');

    if (hasVideo && localVideoTrack) {
        // Mute
        localVideoTrack.mute();
        hasVideo = false;
        btn.classList.add('cam-off');
        btn.classList.remove('cam-on');
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
    } else if (localVideoTrack) {
        // Unmute existing track
        localVideoTrack.unmute();
        hasVideo = true;
        btn.classList.remove('cam-off');
        btn.classList.add('cam-on');
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
        // Re-show self preview
        createSelfPreviewTile(localVideoTrack);
    } else {
        // No track yet — create one
        try {
            const tracks = await JitsiMeetJS.createLocalTracks({ devices: ['video'] });
            localVideoTrack = tracks[0];
            if (conference) conference.addTrack(localVideoTrack);
            hasVideo = true;
            btn.classList.remove('cam-off');
            btn.classList.add('cam-on');
            iconOn.style.display = 'block';
            iconOff.style.display = 'none';
            // Show self preview
            createSelfPreviewTile(localVideoTrack);
        } catch (e) {
            console.error('[Lite] Failed to create video track:', e);
        }
    }
}

/**
 * Sync mic/cam button UI with current hasAudio/hasVideo state.
 * Called after initial local track creation.
 */
function updateMuteButtons() {
    const micBtn = document.getElementById('mic-btn');
    const micOn = document.getElementById('mic-icon-on');
    const micOff = document.getElementById('mic-icon-off');
    if (hasAudio) {
        micBtn.classList.remove('mic-off');
        micBtn.classList.add('mic-on');
        micOn.style.display = 'block';
        micOff.style.display = 'none';
    } else {
        micBtn.classList.add('mic-off');
        micBtn.classList.remove('mic-on');
        micOn.style.display = 'none';
        micOff.style.display = 'block';
    }

    const camBtn = document.getElementById('cam-btn');
    const camOn = document.getElementById('cam-icon-on');
    const camOff = document.getElementById('cam-icon-off');
    if (hasVideo) {
        camBtn.classList.remove('cam-off');
        camBtn.classList.add('cam-on');
        camOn.style.display = 'block';
        camOff.style.display = 'none';
    } else {
        camBtn.classList.add('cam-off');
        camBtn.classList.remove('cam-on');
        camOn.style.display = 'none';
        camOff.style.display = 'block';
    }
}

// ============================================================
// UI — Footer / Status
// ============================================================

function updateFooter() {
    const posInfo = document.getElementById('position-info');
    if (posInfo) {
        posInfo.textContent = `Position: (${myPosition.x.toFixed(1)}, ${myPosition.y.toFixed(1)}, ${myPosition.z.toFixed(1)})`;
    }
}

function updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    if (el) el.textContent = status;
}

// ============================================================
// Cleanup
// ============================================================

window.addEventListener('beforeunload', () => {
    if (localAudioTrack) localAudioTrack.dispose();
    if (localVideoTrack) localVideoTrack.dispose();
    if (conference) {
        try {
            conference.leave();
        } catch (e) {
            // best effort
        }
    }
    if (connection) {
        try {
            connection.disconnect();
        } catch (e) {
            // best effort
        }
    }
    if (window._liteMqtt?.ws) {
        window._liteMqtt.ws.close();
    }
    if (mqttPingInterval) clearInterval(mqttPingInterval);
    if (cameraHeartbeatTimer) clearInterval(cameraHeartbeatTimer);
});
