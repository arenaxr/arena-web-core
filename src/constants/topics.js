/**
 * @fileoverview Topic names for ARENA pubsub messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2024 ARENAXR. All rights reserved.
 * @date 2024
 */

/* global ARENA */

/** *
 outputTopic
 defaults.realm

 FACE_TOPIC


 CLIENT_DISCONNECT_TOPIC_PREFIX

 # chat

 dstTopic


 _dbgTopic


const toUid = ''; // TODO: src/systems/ui/chat.js:133
const handName = ''; // TODO: src/components/camera/arena-hand.js:73
const objectId = ''; // Template in object
const { nameSpace, idTag, camName, sceneName, userName } = ARENA;

 ** */

// prettier-ignore
const TOPICS = Object.freeze({
    SUBSCRIBE: {
        NETWORK:               '$NETWORK',
        CHAT_PUBLIC:           'realm/c/{nameSpace}/o/#',
        CHAT_PRIVATE:          'realm/c/{nameSpace}/p/{idTag}/#',
        DEVICE:                'realm/d/{userName}/#', // All client placeholder
        PROC:                  'realm/proc/#',
        SCENE_PUBLIC:          'realm/s/{nameSpace}/{sceneName}/+/+',
        SCENE_PRIVATE:         'realm/s/{nameSpace}/{sceneName}/+/+/{camName}/#',
    },
    PUBLISH: {
        NETWORK_LATENCY:       '$NETWORK/latency',
        CHAT_PUBLIC:           'realm/c/{nameSpace}/o/{idTag}',
        CHAT_PRIVATE:          'realm/c/{nameSpace}/p/{toUid}/{idTag}',
        DEVICE:                'realm/d/{nameSpace}/{sceneName}/{idTag}',
        SCENE_PRESENCE:        'realm/s/{nameSpace}/{sceneName}/x/{idTag}',
        SCENE_USER:            'realm/s/{nameSpace}/{sceneName}/u/{userObj}',
        SCENE_USER_PRIVATE:    'realm/s/{nameSpace}/{sceneName}/u/{toUid}/{userObj}',
        SCENE_OBJECTS:         'realm/s/{nameSpace}/{sceneName}/o/{objectId}', // All client placeholder
        SCENE_OBJECTS_PRIVATE: 'realm/s/{nameSpace}/{sceneName}/o/{toUid}/{camName}',
        SCENE_RENDER:          'realm/s/{nameSpace}/{sceneName}/r/{camName}',
        SCENE_RENDER_PRIVATE:  'realm/s/{nameSpace}/{sceneName}/r/{toUid}/{camName}',
        SCENE_ENV:             'realm/s/{nameSpace}/{sceneName}/e/{camName}',
        SCENE_ENV_PRIVATE:     'realm/s/{nameSpace}/{sceneName}/e/{toUid}/{camName}',
        SCENE_PROGRAM:         'realm/s/{nameSpace}/{sceneName}/p/{camName}',
        SCENE_PROGRAM_PRIVATE: 'realm/s/{nameSpace}/{sceneName}/p/{toUid}/{camName}',
    },
});

export default TOPICS;
