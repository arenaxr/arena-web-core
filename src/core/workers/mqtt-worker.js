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
    /**
     * @param {object} ARENAConfig
     * @param {function} mainOnMessageArrived
     * @param {function} restartJitsi
     * @param {function} healthCheck
     */
    constructor(ARENAConfig, mainOnMessageArrived, /*restartJitsi,*/ healthCheck) {
        // this.restartJitsi = restartJitsi;
        this.config = ARENAConfig;
        this.healthCheck = healthCheck;

        const mqttClient = new Paho.Client(ARENAConfig.mqttHostURI, `webClient-${ARENAConfig.idTag}`);
        mqttClient.onConnected = async (reconnected, uri) => await this.onConnected(reconnected, uri);
        mqttClient.onConnectionLost = async (response) => await this.onConnectionLost(response);
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
                console.info('ARENA MQTT scene connection success!');
            },
            onFailure: function(res) {
                this.healthCheck({
                    addError: 'mqttScene.connection',
                });
                console.error(`ARENA MQTT scene connection failed, ${res.errorCode}, ${res.errorMessage}`);
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
        await this.healthCheck({
            removeError: 'mqttScene.connection',
        });

        if (reconnect) {
            // For reconnect, do not reinitialize user state, that will warp user back and lose
            // current state. Instead, reconnection should naturally allow messages to continue.
            // need to resubscribe however, to keep receiving messages
            // await this.restartJitsi();
            this.mqttClient.subscribe(this.config.renderTopic);
            console.warn(`ARENA MQTT scene reconnected to ${uri}`);
            return; // do not continue!
        }

        // first connection for this client
        console.log(`ARENA MQTT scene init user state, connected to ${uri}`);

        // start listening for MQTT messages
        this.mqttClient.subscribe(this.config.renderTopic);
    }

    /**
     * MQTT onConnectionLost callback
     * @param {Object} responseObject paho response object
     */
    async onConnectionLost(responseObject) {
        await this.healthCheck({
            addError: 'mqttScene.connection',
        });
        if (responseObject.errorCode !== 0) {
            console.error(
                `ARENA MQTT scene connection lost, code: ${responseObject.errorCode}, reason: ${responseObject.errorMessage}`,
            );
        }
        console.warn('ARENA MQTT scene automatically reconnecting...');
        // no need to connect manually here, "reconnect: true" already set
    }
}

expose(MQTTWorker);
