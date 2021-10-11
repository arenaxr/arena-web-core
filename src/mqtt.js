/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENA */

// 'use strict';
import {proxy, wrap} from 'comlink';
import {ClientEvent, CreateUpdate, Delete} from './message-actions/';

/**
 * Interface for MQTT webworker
 */
export class ARENAMqtt {
    // eslint-disable-next-line require-jsdoc
    static async init() {
        const mqtt = new ARENAMqtt();
        await mqtt._initWorker();
        return mqtt;
    }

    /**
     * Initializes webworker for ARENAMQtt factory
     * @private
     */
    async _initWorker() {
        const MQTTWorker = wrap(new Worker('../workers/mqtt-worker.js'));
        const worker = await new MQTTWorker(
            {
                renderTopic: ARENA.renderTopic,
                mqttHostURI: ARENA.mqttHostURI,
                idTag: ARENA.idTag,
            },
            proxy(ARENA.initScene),
            proxy(this._onMessageArrived),
            proxy(() => {
                if (!ARENA.Jitsi?.ready) {
                    // eslint-disable-next-line new-cap
                    ARENA.Jitsi = ARENA.Jitsi(ARENA.jitsiServer);
                    console.warn(`ARENA Jitsi restarting...`);
                }
            }),
            proxy((e) => {
                if (e[0] == 'addErrorHealth') {
                    ARENA.health.addError(e[1]);
                } else if (e[0] == 'removeErrorHealth') {
                    ARENA.health.removeError(e[1]);
                }
            }),
        );
        console.log('MQTT Worker initialized');
        this.MQTTWorker = worker;
        this.mqttClient = worker.mqttClient;
    }

    /**
     * Internal MessageArrived handler; handles object create/delete/event/... messages
     * @param {string} message
     * @param {object} jsonMessage
     */
    _onMessageArrived(message, jsonMessage) {
        let theMessage = {};

        if (message) {
            try {
                theMessage = JSON.parse(message.payloadString);
            } catch {}
        } else if (jsonMessage) {
            theMessage = jsonMessage;
        }

        if (!theMessage) {
            console.warn('Received empty message');
            return;
        }

        if (theMessage.object_id === undefined) {
            console.warn('Malformed message (no object_id):', JSON.stringify(message));
            return;
        }

        if (theMessage.action === undefined) {
            console.warn('Malformed message (no action field):', JSON.stringify(message));
            return;
        }

        // rename object_id to match internal handlers (and aframe)
        theMessage.id = theMessage.object_id;
        delete theMessage.object_id;

        switch (theMessage.action) { // clientEvent, create, delete, update
        case 'clientEvent':
            if (theMessage.data === undefined) {
                console.warn('Malformed message (no data field):', JSON.stringify(message));
                return;
            }
            // check topic
            if (message) {
                if (!message.destinationName.endsWith(`/${theMessage.data.source}`)) {
                    console.warn('Malformed message (topic does not pass check):', JSON.stringify(message), message.destinationName);
                    return;
                }
            }
            ClientEvent.handle(theMessage);
            break;
        case 'create':
        case 'update':
            if (theMessage.data === undefined) {
                console.warn('Malformed message (no data field):', JSON.stringify(message));
                return;
            }
            // check topic
            if (message) {
                if (!message.destinationName.endsWith(`/${theMessage.id}`)) {
                    console.warn('Malformed message (topic does not pass check):', JSON.stringify(message), message.destinationName);
                    return;
                }
            }
            CreateUpdate.handle(theMessage.action, theMessage);
            break;
        case 'delete':
            // check topic
            if (message) {
                if (!message.destinationName.endsWith(`/${theMessage.id}`)) {
                    console.warn('Malformed message (topic does not pass check):', JSON.stringify(message), message.destinationName);
                    return;
                }
            }
            Delete.handle(theMessage);
            break;
        case 'getPersist':
        case 'returnPersist':
            break;
        default:
            console.warn('Malformed message (invalid action field):', JSON.stringify(message));
            break;
        }
    }

    /**
     * @param {object} mqttClientOptions
     * @param {string} lwMsg
     * @param {string} lwTopic
     */
    async connect(mqttClientOptions, lwMsg = undefined, lwTopic = undefined) {
        await this.MQTTWorker.connect(mqttClientOptions, lwMsg, lwTopic);
    }

    /**
     * Publishes message to mqtt
     * @param {string} topic
     * @param {string|object} payload
     * @param {number} qos
     * @param {boolean} retained
     */
    async publish(topic, payload, qos, retained) {
        await this.MQTTWorker.publish(topic, payload, qos, retained);
    }

    /**
     * Send a message to internal receive handler
     * @param {object} jsonMessage
     */
    processMessage(jsonMessage) {
        this._onMessageArrived(undefined, jsonMessage);
    }

    /**
     * Returns mqttClient connection state
     * @return {boolean}
     */
    async isConnected() {
        return await this.mqttClient.isConnected();
    }
}
