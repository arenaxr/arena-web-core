/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

// 'use strict';
import { proxy, wrap } from 'comlink';
import { ClientEvent, CreateUpdate, Delete } from './message-actions/index';
import { ARENA_EVENTS, ACTIONS, TOPICS } from '../../constants';

const warn = AFRAME.utils.debug('ARENA:MQTT:warn');
// const error = AFRAME.utils.debug('ARENA:MQTT:error');

AFRAME.registerSystem('arena-mqtt', {
    schema: {
        mqttHost: { type: 'string', default: ARENA.defaults.mqttHost },
        mqttPath: { type: 'array', default: ARENA.defaults.mqttPath },
    },

    init() {
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, this.ready.bind(this));
        this.onSceneMessageArrived = this.onSceneMessageArrived.bind(this);
    },
    async ready() {
        const { data } = this;
        const { el } = this;

        const { sceneEl } = el;

        this.health = sceneEl.systems['arena-health-ui'];

        // set up MQTT params for worker
        this.userName = ARENA.mqttToken.mqtt_username;
        this.mqttHost = ARENA.params.mqttHost ?? data.mqttHost;
        this.mqttHostURI = `wss://${this.mqttHost}${data.mqttPath[Math.floor(Math.random() * data.mqttPath.length)]}`;

        this.MQTTWorker = await this.initWorker();

        const mqttToken = ARENA.mqttToken.mqtt_token;
        const { nameSpace, sceneName, idTag } = ARENA;
        // Do not pass functions in mqttClientOptions
        ARENA.Mqtt = this; // Restore old alias
        this.connect(
            {
                reconnect: true,
                userName: this.userName,
                password: mqttToken,
            },
            proxy(() => {
                console.info('ARENA MQTT scene connection success!');
                ARENA.events.emit(ARENA_EVENTS.MQTT_LOADED, true);
            }),
            // last will message
            JSON.stringify({ object_id: idTag, action: 'leave' }),
            // last will topic
            // TODO: handle /x/ presence messages for user camera/hands objs and chat
            TOPICS.PUBLISH.SCENE_PRESENCE.formatStr({
                nameSpace,
                sceneName,
                idTag,
            })
        );
    },

    async initWorker() {
        const { nameSpace, sceneName, idTag } = ARENA;

        const MQTTWorker = wrap(new Worker(new URL('./workers/mqtt-worker.js', import.meta.url), { type: 'module' }));
        const worker = await new MQTTWorker(
            {
                subscriptions: [
                    TOPICS.SUBSCRIBE.SCENE_PUBLIC.formatStr({ nameSpace, sceneName }),
                    TOPICS.SUBSCRIBE.SCENE_PRIVATE.formatStr({ nameSpace, sceneName, idTag }),
                ],
                mqttHostURI: this.mqttHostURI,
                idTag,
            },
            proxy(this.mqttHealthCheck.bind(this))
            // proxy(() => {
            //     if (ARENA.jitsi && !ARENA.jitsi.initialized) {
            //         // eslint-disable-next-line new-cap
            //         ARENA.jitsi = ARENA.jitsi(ARENA.jitsiServer);
            //         warn(`ARENA Jitsi restarting...`);
            //     }
            // }),
        );
        worker.registerMessageHandler(
            's',
            proxy((messages) => {
                messages.forEach(this.onSceneMessageArrived);
            }),
            true,
            'object_id'
        );
        worker.registerMessageQueue('s', true, 'object_id');
        return worker;
    },

    /**
     * @param {object} mqttClientOptions
     * @param {function} [onSuccessCallBack]
     * @param {string} [lwMsg]
     * @param {string} [lwTopic]
     */
    connect(mqttClientOptions, onSuccessCallBack = undefined, lwMsg = undefined, lwTopic = undefined) {
        this.MQTTWorker.connect(mqttClientOptions, onSuccessCallBack, lwMsg, lwTopic);
    },

    /**
     * Internal callback to pass MQTT connection health to ARENAHealth.
     * @param {object} msg Message object like: {addError: 'mqttScene.connection'}
     */
    mqttHealthCheck(msg) {
        if (msg.removeError) this.health.removeError(msg.removeError);
        else if (msg.addError) this.health.addError(msg.addError);
    },

    /**
     * Publishes message to mqtt
     * @param {string} topic
     * @param {string|object} payload
     * @param {number} qos
     * @param {boolean} retained
     */
    async publish(topic, payload, qos = 0, retained = false, raw = false) {
        await this.MQTTWorker.publish(topic, payload, qos, retained, raw);
    },

    /**
     * Send a message to internal receive handler
     * @param {object} jsonMessage
     */
    processMessage(jsonMessage) {
        this.onSceneMessageArrived({ payloadObj: jsonMessage });
    },

    /**
     * Returns mqttClient connection state
     * @return {boolean}
     */
    async isConnected() {
        const client = this.MQTTWorker.mqttClient;
        const isConnected = await client.isConnected();
        return isConnected;
    },

    /**
     * MessageArrived handler for scene messages; handles object create/delete/event... messages
     * This message is expected to be JSON
     * @param {object} message
     */
    onSceneMessageArrived(message) {
        delete message.workerTimestamp;
        const theMessage = message.payloadObj; // This will be given as json
        const topicSplit = message.destinationName.split('/');

        if (!theMessage) {
            warn('Received empty message');
            return;
        }

        if (theMessage.object_id === undefined) {
            warn('Malformed message (no object_id):', JSON.stringify(message));
            return;
        }

        // Categorically ignore own messages
        if (theMessage.object_id === ARENA.idTag) return;

        // Dispatch on scene message type (chat, object, presence, etc.)
        const sceneMsgType = topicSplit[TOPICS.TOKENS.SCENE_MSGTYPE];
        const topicToUid = topicSplit[TOPICS.TOKENS.TO_UID];
        const chatSystem = this.sceneEl.systems['arena-chat-ui'];
        switch (sceneMsgType) {
            case TOPICS.SCENE_MSGTYPES.PRESENCE:
                chatSystem?.onPresenceMessageArrived(theMessage, topicToUid);
                break;
            case TOPICS.SCENE_MSGTYPES.CHAT:
                chatSystem?.onChatMessageArrived(theMessage, topicToUid);
                break;
            case TOPICS.SCENE_MSGTYPES.USER:
                this.handleSceneUserMessage(theMessage, topicToUid, topicSplit);
                break;
            case TOPICS.SCENE_MSGTYPES.OBJECTS:
                this.handleSceneObjectMessage(theMessage, topicToUid, topicSplit);
                break;
            case TOPICS.SCENE_MSGTYPES.RENDER:
                // TODO: render message refactor
                break;
            case TOPICS.SCENE_MSGTYPES.PROGRAM:
                // program message, probably never as recipient?
                break;
            default:
                // ????
                console.log(`Invalid scene message type: '${sceneMsgType}'`);
        }
    },

    /**
     * Handle scene object messages
     * @param {object} message - the message object
     * @param {?object} topicToUid - the topic uuid the message was addressed to
     * @param {?string[]} topicSplit - the full topic split string array
     */
    handleSceneObjectMessage(message, topicToUid, topicSplit) {
        if (message.action === undefined) {
            warn('Malformed message (no action field):', JSON.stringify(message));
            return;
        }

        // rename object_id to match internal handlers (and aframe)
        message.id = message.object_id;
        delete message.object_id;

        // create, delete, update
        switch (message.action) {
            case ACTIONS.CREATE:
            case ACTIONS.UPDATE:
                if (message.data === undefined) {
                    warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                // TODO: deal with topicUuid and private flag for object messages
                CreateUpdate.handle(message.action, message);
                break;
            case ACTIONS.DELETE:
                // check topic
                Delete.handle(message);
                break;
            default:
                warn('Malformed message (invalid action field):', JSON.stringify(message));
                break;
        }
    },

    /**
     * Handle scene user messages, consisting of camera, hand object updates and actions
     * @param message
     * @param topicToUid
     * @param topicSplit
     */
    handleSceneUserMessage(message, topicToUid, topicSplit) {
        if (message.action === undefined) {
            warn('Malformed message (no action field):', JSON.stringify(message));
            return;
        }

        // rename object_id to match internal handlers (and aframe)
        message.id = message.object_id;
        delete message.object_id;

        switch (message.action) {
            case ACTIONS.CLIENT_EVENT:
                if (message.data === undefined) {
                    warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                // check topic
                // TODO: Refactor clientEvents to use user/hand objects as object_id, and target vs source
                if (message.destinationName) {
                    if (topicUuid !== message.data.source) {
                        warn(
                            'Malformed message (topic does not pass check):',
                            JSON.stringify(message),
                            message.destinationName
                        );
                        return;
                    }
                }
                ClientEvent.handle(message);
                break;
            case ACTIONS.CREATE:
            case ACTIONS.UPDATE:
                if (message.data === undefined) {
                    warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                CreateUpdate.handle(message.action, message);
                break;
            case ACTIONS.DELETE:
                // check topic
                Delete.handle(message);
                break;
            default:
                warn('Malformed message (invalid action field):', JSON.stringify(message));
                break;
        }
    },

    tock() {
        this.MQTTWorker?.tock('s').then((messages) => {
            messages.forEach(this.onSceneMessageArrived);
        });
    },
});
