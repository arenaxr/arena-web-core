/**
 * @fileoverview Topic names for ARENA pubsub messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2024 ARENAXR. All rights reserved.
 * @date 2024
 */

/* global globalThis */

/**
 * ARENA pubsub topic variables
 * - nameSpace - namespace of the scene
 * - sceneName - name of the scene
 * - userName - name of the user per arena-auth (e.g. jdoe)
 * - idTag - username prefixed with a uuid (e.g. 1448081341_jdoe)
 */

// TODO: handle this scriptImport somehow (which can't be done in parcel with a worker...)
let REALM;
if (globalThis.ARENA === undefined) {
    REALM = 'realm';
} else {
    REALM = ARENA.defaults.realm;
}

// prettier-ignore
const TOPICS = Object.freeze({
    TOKENS: {
        REALM: 0,
        TYPE: 1,
        NAMESPACE: 2,
        SCENENAME: 3,
        SCENE_MSGTYPE: 4,
        USER_CLIENT: 5,
        UUID: 6,
        TO_UID: 7,
    },
    SCENE_MSGTYPES: {
        PRESENCE: 'x',
        CHAT: 'c',
        USER: 'u',
        OBJECTS: 'o',
        RENDER: 'r',
        ENV: 'e',
        PROGRAM: 'p',
        DEBUG: 'd',
    },
    SUBSCRIBE: {
        NETWORK:               '$NETWORK',
        DEVICE:                `${REALM}/d/{deviceName}/#`, // All client placeholder
        RT_RUNTIME:            `${REALM}/g/{nameSpace}/p/{rtUuid}`,
        RT_MODULES:            `${REALM}/s/{nameSpace}/{sceneName}/p/+/+`,
        SCENE_PUBLIC:          `${REALM}/s/{nameSpace}/{sceneName}/+/+/+`,
        SCENE_PRIVATE:         `${REALM}/s/{nameSpace}/{sceneName}/+/+/+/{idTag}/#`,
        SCENE_RENDER_PUBLIC:   `${REALM}/s/{nameSpace}/{sceneName}/r/+/-`, // TODO: consolidate
        SCENE_RENDER_PRIVATE:  `${REALM}/s/{nameSpace}/{sceneName}/r/+/-/{idTag}/#`, // TODO: consolidate
    },
    PUBLISH: {
        NETWORK_LATENCY:       '$NETWORK/latency',
        DEVICE:                `${REALM}/d/{deviceName}/{idTag}`,
        RT_RUNTIME:            `${REALM}/g/{nameSpace}/p/{rtUuid}`,
        RT_MODULES:            `${REALM}/s/{nameSpace}/{sceneName}/p/{userClient}/{idTag}`,
        PROC_DBG:              `${REALM}/proc/debug/{uuid}`,
        SCENE_PRESENCE:        `${REALM}/s/{nameSpace}/{sceneName}/x/{userClient}/{idTag}`,
        SCENE_PRESENCE_PRIVATE:`${REALM}/s/{nameSpace}/{sceneName}/x/{userClient}/{idTag}/{toUid}`,
        SCENE_CHAT:            `${REALM}/s/{nameSpace}/{sceneName}/c/{userClient}/{idTag}`,
        SCENE_CHAT_PRIVATE:    `${REALM}/s/{nameSpace}/{sceneName}/c/{userClient}/{idTag}/{toUid}`,
        SCENE_USER:            `${REALM}/s/{nameSpace}/{sceneName}/u/{userClient}/{userObj}`,
        SCENE_USER_PRIVATE:    `${REALM}/s/{nameSpace}/{sceneName}/u/{userClient}/{userObj}/{toUid}`, // Need to add face_ privs
        SCENE_OBJECTS:         `${REALM}/s/{nameSpace}/{sceneName}/o/{userClient}/{objectId}`, // All client placeholder
        SCENE_OBJECTS_PRIVATE: `${REALM}/s/{nameSpace}/{sceneName}/o/{userClient}/{objectId}/{toUid}`,
        SCENE_RENDER:          `${REALM}/s/{nameSpace}/{sceneName}/r/{userClient}/{idTag}`,
        SCENE_RENDER_PRIVATE:  `${REALM}/s/{nameSpace}/{sceneName}/r/{userClient}/{idTag}/-`, // To avoid unpriv sub
        SCENE_ENV:             `${REALM}/s/{nameSpace}/{sceneName}/e/{userClient}/{idTag}`,
        SCENE_ENV_PRIVATE:     `${REALM}/s/{nameSpace}/{sceneName}/e/{userClient}/{idTag}/-`, // To avoid unpriv sub
        SCENE_PROGRAM:         `${REALM}/s/{nameSpace}/{sceneName}/p/{userClient}/{idTag}`,
        SCENE_PROGRAM_PRIVATE: `${REALM}/s/{nameSpace}/{sceneName}/p/{userClient}/{idTag}/{toUid}`,
        SCENE_DEBUG:           `${REALM}/s/{nameSpace}/{sceneName}/d/{userClient}/{idTag}/-`, // To avoid unpriv sub
    },
});

export default TOPICS;
