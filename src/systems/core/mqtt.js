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
import { ARENA_EVENTS, ACTIONS } from '../../constants';

const warn = AFRAME.utils.debug('ARENA:MQTT:warn');
// const error = AFRAME.utils.debug('ARENA:MQTT:error');

let lastMetricTick = new Date().getTime();

AFRAME.registerSystem('arena-mqtt', {
    schema: {
        mqttHost: { type: 'string', default: ARENA.defaults.mqttHost },
        mqttPath: { type: 'array', default: ARENA.defaults.mqttPath },
    },

    init() {
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, this.ready.bind(this));
    },
    async ready() {
        const { data } = this;
        const { el } = this;

        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];
        this.health = sceneEl.systems['arena-health-ui'];

        // set up MQTT params for worker
        this.userName = this.arena.mqttToken.mqtt_username;
        this.mqttHost = ARENA.params.mqttHost ?? data.mqttHost;
        this.mqttHostURI = `wss://${this.mqttHost}${data.mqttPath[Math.floor(Math.random() * data.mqttPath.length)]}`;

        this.MQTTWorker = await this.initWorker();

        const mqttToken = this.arena.mqttToken.mqtt_token;
        const { camName } = this.arena;
        const { outputTopic } = this.arena;
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
            JSON.stringify({ object_id: camName, action: 'delete' }),
            // last will topic
            outputTopic + camName
        );
    },

    async initWorker() {
        const { renderTopic } = this.arena;
        const { idTag } = this.arena;

        const MQTTWorker = wrap(new Worker(new URL('./workers/mqtt-worker.js', import.meta.url), { type: 'module' }));
        const worker = await new MQTTWorker(
            {
                renderTopic,
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
        this.onSceneMessageArrived = this.onSceneMessageArrived.bind(this);
        worker.registerMessageHandler('s', proxy(this.onSceneMessageArrived.bind(this)), true);
        worker.registerMessageQueue('s', true);
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
        const now = new Date().getTime();
        if (now - lastMetricTick > 1000) {
            console.log(`Worker message delay: ${now - message.workerTimestamp}ms`);
            lastMetricTick = now;
        }
        delete message.workerTimestamp;
        const theMessage = message.payloadObj; // This will be given as json

        if (!theMessage) {
            warn('Received empty message');
            return;
        }

        if (theMessage.object_id === undefined) {
            warn('Malformed message (no object_id):', JSON.stringify(message));
            return;
        }

        if (theMessage.action === undefined) {
            warn('Malformed message (no action field):', JSON.stringify(message));
            return;
        }

        // rename object_id to match internal handlers (and aframe)
        theMessage.id = theMessage.object_id;
        delete theMessage.object_id;

        let topicUser;
        if (message.destinationName) {
            // This is a Paho.MQTT.Message
            // [realm, category, namespace, scene, user]
            [, , , , topicUser] = message.destinationName.split('/');
        }

        switch (
            theMessage.action // clientEvent, create, delete, update
        ) {
            case ACTIONS.CLIENT_EVENT:
                if (theMessage.data === undefined) {
                    warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                // check topic
                if (message.destinationName) {
                    if (topicUser !== theMessage.data.source) {
                        warn(
                            'Malformed message (topic does not pass check):',
                            JSON.stringify(message),
                            message.destinationName
                        );
                        return;
                    }
                }
                ClientEvent.handle(theMessage);
                break;
            case ACTIONS.CREATE:
            case ACTIONS.UPDATE:
                if (theMessage.data === undefined) {
                    warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                // check topic
                if (message.destinationName) {
                    if (!message.destinationName.endsWith(`/${theMessage.id}`)) {
                        warn(
                            'Malformed message (topic does not pass check):',
                            JSON.stringify(message),
                            message.destinationName
                        );
                        return;
                    }
                }
                CreateUpdate.handle(theMessage.action, theMessage);
                break;
            case ACTIONS.DELETE:
                // check topic
                if (message.destinationName) {
                    if (!message.destinationName.endsWith(`/${theMessage.id}`)) {
                        warn(
                            'Malformed message (topic does not pass check):',
                            JSON.stringify(message),
                            message.destinationName
                        );
                        return;
                    }
                }
                Delete.handle(theMessage);
                break;
            case ACTIONS.GET_PERSIST:
            case ACTIONS.RETURN_PERSIST:
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
