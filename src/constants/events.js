/**
 * @fileoverview Event names for ARENA.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

export const ARENA_EVENTS = Object.freeze({
    ON_AUTH:            'onauth',
    USER_PARAMS_LOADED: 'onarenauserparamsloaded',
    MQTT_LOADED:        'onarenamqttloaded',
    JITSI_LOADED:       'onarenajitsiLoaded',
    SCENE_OPT_LOADED:   'onarenasceneoptionsloaded',
    SCENE_OBJ_LOADED:   'onarenasceneobjectsloaded',
    ARENA_LOADED:       'onarenaloaded',
    NEW_SETTINGS:       'onarenanewsettings',
    ON_LOCATION:        'onarenalocation',
});

export const JITSI_EVENTS = Object.freeze({
    CONNECT:                    'onjitsiconnected',
    USER_JOINED:                'onjitsiuserjoined',
    USER_LEFT:                  'onjitsiuserleft',
    SCREENSHARE:                'onjitsiscreenshare',
    DOMINANT_SPEAKER_CHANGED:   'onjitsidominantspeakerchanged',
    TALK_WHILE_MUTED:           'onjitsitalkwhilemuted',
    NOISY_MIC:                  'onjitsinosymic',
    STATS_LOCAL:                'onjitsistatslocal',
    STATS_REMOTE:               'onjitsistatsremote',
    STATUS:                     'onjitsistatus',
    CONFERENCE_ERROR:           'onjitsierror',
});

export const EVENT_SOURCES = Object.freeze({
    ARENA:  'arena',
    JITSI:  'jitsi',
    CHAT:   'chat',
});
