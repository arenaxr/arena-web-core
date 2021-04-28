/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import {expose} from 'comlink';
const Paho = require('paho-mqtt'); // https://www.npmjs.com/package/paho-mqtt

/**
 * Main ARENA MQTT webworker client
 */
class MQTTWorker {
    /**
     * @param {object} ARENAConfig
     * @param {function} initScene
     * @param {function} mainOnMessageArrived
     * @param {function} restartJitsi
     */
    constructor(ARENAConfig, initScene, mainOnMessageArrived, restartJitsi) {
        this.initScene = initScene;
        this.restartJitsi = restartJitsi;
        this.ARENA = ARENAConfig;
        const mqttClient = new Paho.Client(ARENAConfig.mqttHostURI, 'webClient-' + ARENAConfig.idTag);
        mqttClient.onConnected = async (reconnected, uri) => await this.onConnected(reconnected, uri);
        mqttClient.onConnectionLost = this.onConnectionLost;
        mqttClient.onMessageArrived = async (msg) => await mainOnMessageArrived(msg);
        this.mqttClient = mqttClient;
    }
    /**
     * Connect mqtt client; If given, setup a last will message given as argument
     * @param {object} mqttClientOptions paho mqtt options
     * @param {string} lwMsg last will message
     * @param {string} lwTopic last will destination topic message
     */
    async connect(mqttClientOptions, lwMsg=undefined, lwTopic=undefined) {
        const opts = {
            ...mqttClientOptions,
            onSuccess: function() {
                console.info('MQTT scene connection success.');
            },
            onFailure: function(res) {
                console.error(`MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
            },
        };
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
     * Publish to given dest topic
     * @param {string} topic
     * @param {string|object} payload
     * @param {number} qos
     * @param {boolean} retained
     */
    async publish(topic, payload, qos=0, retained=false) {
        if (!this.mqttClient.isConnected()) return;

        if (typeof payload === 'object') {
            // add timestamp to all published messages
            payload['timestamp'] = new Date().toISOString();

            payload = JSON.stringify(payload);
        }
        this.mqttClient.publish(topic, payload, qos, retained);
    }

    /**
     * MQTT onConnected callback
     * @param {Boolean} reconnect is a reconnect
     * @param {Object} uri uri used
     */
    async onConnected(reconnect, uri) {
        if (reconnect) {
            // For reconnect, do not reinitialize user state, that will warp user back and lose
            // current state. Instead, reconnection should naturally allow messages to continue.
            // need to resubscribe however, to keep receiving messages
            await this.restartJitsi();
            this.mqttClient.subscribe(this.ARENA.renderTopic);
            console.warn(`MQTT scene reconnected to ${uri}`);
            return; // do not continue!
        }

        // first connection for this client
        console.log(`MQTT scene init user state, connected to ${uri}`);

        // do scene init before starting to receive messages
        await this.initScene();

        // start listening for MQTT messages
        this.mqttClient.subscribe(this.ARENA.renderTopic);
    }

    /**
     * MQTT onConnectionLost callback
     * @param {Object} responseObject paho response object
     */
    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.error(
                `MQTT scene connection lost, code: ${responseObject.errorCode}, reason: ${responseObject.errorMessage}`,
            );
        }
        console.warn('MQTT scene automatically reconnecting...');
        // no need to connect manually here, "reconnect: true" already set
    }
}

expose(MQTTWorker);
