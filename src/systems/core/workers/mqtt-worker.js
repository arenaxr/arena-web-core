/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

import { expose } from 'comlink';
import * as Paho from 'paho-mqtt'; // https://www.npmjs.com/package/paho-mqtt

/**
 * Main ARENA MQTT webworker client
 */
class MQTTWorker {
    messageHandlers = {};

    subscriptions = [];

    connectionLostHandlers = [];

    messageQueues = {};

    /**
     * @param {object} ARENAConfig
     * @param {function} healthCheck
     */
    constructor(ARENAConfig, healthCheck) {
        // this.restartJitsi = restartJitsi;
        this.config = ARENAConfig;
        this.healthCheck = healthCheck;

        this.subscriptions = [this.config.renderTopic]; // Add main scene renderTopic by default to subs
        this.connectionLostHandlers = [
            (responseObject) => {
                if (responseObject.errorCode !== 0) {
                    console.error(
                        `ARENA MQTT scene connection lost, code: ${responseObject.errorCode},
                        reason: ${responseObject.errorMessage}`
                    );
                }
                console.warn('ARENA MQTT scene automatically reconnecting...');
            },
        ];

        const mqttClient = new Paho.Client(ARENAConfig.mqttHostURI, `webClient-${ARENAConfig.idTag}`);
        mqttClient.onConnected = async (reconnected, uri) => this.onConnected(reconnected, uri);
        mqttClient.onConnectionLost = async (response) => this.onConnectionLost(response);
        mqttClient.onMessageArrived = this.onMessageArrivedDispatcher.bind(this);
        this.mqttClient = mqttClient;
    }

    /**
     * Connect mqtt client; If given, setup a last will message given as argument
     * @param {object} mqttClientOptions paho mqtt options
     * @param {function} onSuccessCallBack callback function on successful connection
     * @param {string} [lwMsg] last will message
     * @param {string} [lwTopic] last will destination topic message
     */
    connect(mqttClientOptions, onSuccessCallBack, lwMsg = undefined, lwTopic = undefined) {
        const opts = {
            onFailure(res) {
                this.healthCheck({
                    addError: 'mqttScene.connection',
                });
                console.error(`ARENA MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
            },
            ...mqttClientOptions,
        };
        if (onSuccessCallBack) {
            opts.onSuccess = onSuccessCallBack;
        } else {
            opts.onSuccess = () => {
                console.info('ARENA MQTT scene connection success!');
            };
        }

        if (lwMsg && lwTopic && !mqttClientOptions.willMessage) {
            // Last Will and Testament message sent to subscribers if this client loses connection
            const lwt = new Paho.Message(lwMsg);
            lwt.destinationName = lwTopic;
            lwt.qos = 2;
            lwt.retained = false;

            opts.willMessage = lwt;
        }

        this.mqttClient.connect(opts);
    }

    /**
     * Subscribe to a topic and add it to list of subscriptions
     * @param {string} topic
     */
    subscribe(topic) {
        if (!this.subscriptions.includes(topic)) {
            this.subscriptions.push(topic);
            this.mqttClient.subscribe(topic);
        }
    }

    /**
     * Add a handler for when the connection is lost
     * @param {function} handler
     */
    addConnectionLostHandler(handler) {
        if (!this.connectionLostHandlers.includes(handler)) {
            this.connectionLostHandlers.push(handler);
        }
    }

    /**
     * onMessageArrived callback. Dispatches message to registered handlers based on topic category.
     * The category is the string between the first and second slash in the topic.
     * If no handler exists for a given topic category, the message is ignored.
     * @param {Paho.Message} message
     */
    onMessageArrivedDispatcher(message) {
        const topic = message.destinationName;
        const topicCategory = topic.split('/')[1];
        // const handler = this.messageHandlers[topicCategory];
        message.workerTimestamp = new Date().getTime();
        try {
            message.payloadObj = JSON.parse(message.payloadString);
            this.messageQueues[topicCategory].push(message);
        } catch (e) {
            // Ignore
        }
        // if (handler) {
        //     handler(message);
        // }
    }

    tock(topicCategory) {
        const batch = this.messageQueues[topicCategory];
        this.messageQueues[topicCategory] = [];
        return batch;
    }

    /**
     * Register a message handler for a given topic category beneath realm (second level).
     * @param {string} topicCategory - the topic category to register a handler for
     * @param {function} mainHandler - main thread handler, pass in whatever expected format
     * @param {boolean} isJson - whether the payload is expected to be well-formed json
     */
    registerMessageHandler(topicCategory, mainHandler, isJson) {
        if (isJson) {
            // Parse json in worker
            this.messageHandlers[topicCategory] = (message) => {
                try {
                    const jsonPayload = JSON.parse(message.payloadString);
                    mainHandler({ ...message, payloadObj: jsonPayload });
                } catch (e) {
                    // Ignore
                }
            };
        } else {
            this.messageHandlers[topicCategory] = mainHandler;
        }
    }

    /**
     * Register a message handler for a given topic category beneath realm (second level).
     * @param {string} topicCategory - the topic category to register a handler for

     */
    registerMessageQueue(topicCategory) {
        this.messageQueues[topicCategory] = [];
    }

    /**
     * Publish to given dest topic
     * @param {string} topic
     * @param {string|object} payload
     * @param {number} qos
     * @param {boolean} retained
     */
    async publish(topic, payload, qos = 0, retained = false, raw = false) {
        if (!this.mqttClient.isConnected()) return;

        /* eslint-disable no-param-reassign */
        if (typeof payload === 'object' && raw === false) {
            // add timestamp to all published messages
            payload.timestamp = new Date().toISOString();

            payload = JSON.stringify(payload);
        }
        /* eslint-disable no-param-reassign */
        this.mqttClient.publish(topic, payload, qos, retained);
    }

    /**
     * MQTT onConnected callback
     * @param {Boolean} reconnect is a reconnect
     * @param {Object} uri uri used
     */
    async onConnected(reconnect, uri) {
        await this.healthCheck({
            removeError: 'mqttScene.connection',
        });

        this.subscriptions.forEach((topic) => {
            this.mqttClient.subscribe(topic);
        });

        if (reconnect) {
            console.warn(`ARENA MQTT scene reconnected to ${uri}`);
        } else {
            console.info(`ARENA MQTT scene connected to ${uri}`);
        }
    }

    /**
     * MQTT onConnectionLost callback
     * @param {Object} responseObject paho response object
     */
    async onConnectionLost(responseObject) {
        await this.healthCheck({
            addError: 'mqttScene.connection',
        });
        this.connectionLostHandlers.forEach((handler) => handler(responseObject));
    }
}

expose(MQTTWorker);
