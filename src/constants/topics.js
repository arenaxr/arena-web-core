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
        UUID: 5,
        TO_UID: 6,
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
        PROC_REG:              `${REALM}/proc/reg`,
        PROC_CTL:              `${REALM}/proc/control/{uuid}/#`,
        PROC_DBG:              `${REALM}/proc/debug/{uuid}`,
        SCENE_PUBLIC:          `${REALM}/s/{nameSpace}/{sceneName}/+/+`,
        SCENE_PRIVATE:         `${REALM}/s/{nameSpace}/{sceneName}/+/+/{idTag}/#`,
        SCENE_RENDER_PRIVATE:  `${REALM}/s/{nameSpace}/{sceneName}/r/+/{idTag}`,
    },
    PUBLISH: {
        NETWORK_LATENCY:       '$NETWORK/latency',
        DEVICE:                `${REALM}/d/{deviceName}/{idTag}`,
        PROC_REG:              `${REALM}/proc/reg`,
        PROC_CTL:              `${REALM}/proc/control`,
        PROC_DBG:              `${REALM}/proc/debug/{uuid}`,
        SCENE_PRESENCE:        `${REALM}/s/{nameSpace}/{sceneName}/x/{idTag}`,
        SCENE_PRESENCE_PRIVATE:`${REALM}/s/{nameSpace}/{sceneName}/x/{idTag}/{toUid}`,
        SCENE_CHAT:            `${REALM}/s/{nameSpace}/{sceneName}/c/{idTag}`,
        SCENE_CHAT_PRIVATE:    `${REALM}/s/{nameSpace}/{sceneName}/c/{idTag}/{toUid}`,
        SCENE_USER:            `${REALM}/s/{nameSpace}/{sceneName}/u/{userObj}`,
        SCENE_USER_PRIVATE:    `${REALM}/s/{nameSpace}/{sceneName}/u/{userObj}/{toUid}`, // Need to add face_ privs
        SCENE_OBJECTS:         `${REALM}/s/{nameSpace}/{sceneName}/o/{objectId}`, // All client placeholder
        SCENE_OBJECTS_PRIVATE: `${REALM}/s/{nameSpace}/{sceneName}/o/{objectId}/{toUid}`,
        SCENE_RENDER:          `${REALM}/s/{nameSpace}/{sceneName}/r/{idTag}`,
        SCENE_RENDER_PRIVATE:  `${REALM}/s/{nameSpace}/{sceneName}/r/{idTag}/-`, // To avoid unpriv sub
        SCENE_ENV:             `${REALM}/s/{nameSpace}/{sceneName}/e/{idTag}`,
        SCENE_ENV_PRIVATE:     `${REALM}/s/{nameSpace}/{sceneName}/e/{idTag}/-`, // To avoid unpriv sub
        SCENE_PROGRAM:         `${REALM}/s/{nameSpace}/{sceneName}/p/{idTag}`,
        SCENE_PROGRAM_PRIVATE: `${REALM}/s/{nameSpace}/{sceneName}/p/{idTag}/{toUid}`,
        SCENE_DEBUG:           `${REALM}/s/{nameSpace}/{sceneName}/d/{idTag}/-`, // To avoid unpriv sub
    },
});

export default TOPICS;
