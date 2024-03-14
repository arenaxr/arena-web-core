/**
 * @fileoverview Event names for ARENA.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

export const ARENA_EVENTS = Object.freeze({
    ON_AUTH: 'onauth',
    USER_PARAMS_LOADED: 'onarenauserparamsloaded',
    MQTT_LOADED: 'onarenamqttloaded',
    JITSI_LOADED: 'onarenajitsiloaded',
    SCENE_OPT_LOADED: 'onarenasceneoptionsloaded',
    SCENE_OBJ_LOADED: 'onarenasceneobjectsloaded',
    ARENA_LOADED: 'onarenaloaded',
    NEW_SETTINGS: 'onarenanewsettings',
    ON_LOCATION: 'onarenalocation',
    SETUPAV_LOADED: 'onsetupavloaded',
    STARTPOS_LOADED: 'onarenastartposloaded',
    RUNTIME_MNGR_LOADED: 'onarenaruntimemanagerloaded',
    CV_INITIALIZED: 'onarenacvinitialized',
});

export const JITSI_EVENTS = Object.freeze({
    CONNECTED: 'onarenajitsiconnected',
    USER_JOINED: 'onarenajitsiuserjoined',
    USER_LEFT: 'onarenajitsiuserleft',
    SCREENSHARE: 'onarenajitsiscreenshare',
    DOMINANT_SPEAKER_CHANGED: 'onarenajitsidominantspeakerchanged',
    TALK_WHILE_MUTED: 'onarenajitsitalkwhilemuted',
    NOISY_MIC: 'onarenajitsinoisymic',
    STATS_LOCAL: 'onarenajitsistatslocal',
    STATS_REMOTE: 'onarenajitsistatsremote',
    STATUS: 'onarenajitsistatus',
    CONFERENCE_ERROR: 'onarenajitsierror',
    TRACK_MUTE_CHANGED: 'onarenajitsitrackmutechanged',
});

export const EVENT_SOURCES = Object.freeze({
    ARENA: 'arena',
    JITSI: 'jitsi',
    CHAT: 'chat',
});
