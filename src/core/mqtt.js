/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global ARENA */

// 'use strict';
import { proxy , wrap} from 'comlink';
import { ARENADefaults } from '../../conf/defaults.js';
import { ClientEvent, CreateUpdate, Delete} from '../message-actions/index.js';
import { EVENTS } from '../constants/events.js';

AFRAME.registerSystem('arena-mqtt', {
    schema: {
        mqttHost: {type: 'string', default: ARENADefaults.mqttHost},
        mqttPath: {type: 'array', default: ARENADefaults.mqttPath},
    },

    init: async function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        if (!sceneEl.ARENAUserParamsLoaded) {
            sceneEl.addEventListener(EVENTS.USER_PARAMS_LOADED, this.init.bind(this));
            return;
        }

        this.arena = sceneEl.systems['arena-scene'];

        this.setMqttHost();

        await this.initWorker();

        const mqttToken = this.arena.mqttToken.mqtt_token;
        const camName = this.arena.camName;
        const outputTopic = this.arena.outputTopic;
        // Do not pass functions in mqttClientOptions
        await this.connect({
                reconnect: true,
                userName: this.userName,
                password: mqttToken,
            },
            // last will message
            JSON.stringify({object_id: camName, action: 'delete'}),
            // last will topic
            outputTopic + camName,
        );

        ARENA.Mqtt = this; // Restore old alias

        sceneEl.ARENAMqttLoaded = true;
        sceneEl.emit(EVENTS.MQTT_LOADED, true);
    },

    setMqttHost: function() {
        const data = this.data;

        this.userName = this.arena.mqttToken.mqtt_username;
        this.mqttHost = ARENA.params.mqttHost ?? data.mqttHost;
        this.mqttHostURI = 'wss://' + this.mqttHost + data.mqttPath[Math.floor(Math.random() * data.mqttPath.length)];
    },

    initWorker: async function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        const renderTopic = this.arena.renderTopic;
        const idTag = this.arena.idTag;

        const MQTTWorker = wrap(new Worker(new URL('./workers/mqtt-worker.js', import.meta.url), {type: 'module'}));
        const worker = await new MQTTWorker({
                renderTopic: renderTopic,
                mqttHostURI: this.mqttHostURI,
                idTag: idTag,
            },
            proxy(this.onMessageArrived.bind(this)),
            proxy(this.mqttHealthCheck.bind(this)),
            // proxy(() => {
            //     if (ARENA.Jitsi && !ARENA.Jitsi.ready) {
            //         // eslint-disable-next-line new-cap
            //         ARENA.Jitsi = ARENA.Jitsi(ARENA.jitsiServer);
            //         console.warn(`ARENA Jitsi restarting...`);
            //     }
            // }),
        );
        this.MQTTWorker = worker;
        this.mqttClient = worker.mqttClient;
    },

    /**
     * @param {object} mqttClientOptions
     * @param {string} lwMsg
     * @param {string} lwTopic
     */
    connect: async function(mqttClientOptions, lwMsg = undefined, lwTopic = undefined) {
        await this.MQTTWorker.connect(mqttClientOptions, lwMsg, lwTopic);
    },

    /**
     * Internal callback to pass MQTT connection health to ARENAHealth.
     * @param {object} msg Message object like: {addError: 'mqttScene.connection'}
     */
    mqttHealthCheck: function(msg) {
        // if (msg.removeError) ARENA.health.removeError(msg.removeError);
        // else if (msg.addError) ARENA.health.addError(msg.addError);
    },

    /**
     * Internal MessageArrived handler; handles object create/delete/event/... messages
     * @param {string} message
     * @param {object} jsonMessage
     */
    onMessageArrived: function(message, jsonMessage) {
        let theMessage = {};

        if (message) {
            try {
                theMessage = JSON.parse(message.payloadString);
            } catch {}
        } else if (jsonMessage) {
            theMessage = jsonMessage;
        }
        else {
            return;
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

        let topicUser;
        if (message) {
            topicUser = message.destinationName.split('/')[4];
        }

        switch (theMessage.action) { // clientEvent, create, delete, update
        case 'clientEvent':
            if (theMessage.data === undefined) {
                console.warn('Malformed message (no data field):', JSON.stringify(message));
                return;
            }
            // check topic
            if (message) {
                if (topicUser !== theMessage.data.source) {
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
    },

    /**
     * Publishes message to mqtt
     * @param {string} topic
     * @param {string|object} payload
     * @param {number} qos
     * @param {boolean} retained
     */
    publish: async function(topic, payload, qos=0, retained=false) {
        await this.MQTTWorker.publish(topic, payload, qos, retained);
    },

    /**
     * Send a message to internal receive handler
     * @param {object} jsonMessage
     */
    processMessage: function(jsonMessage) {
        this.onMessageArrived(undefined, jsonMessage);
    },

    /**
     * Returns mqttClient connection state
     * @return {boolean}
     */
    isConnected: async function() {
        return await this.mqttClient.isConnected();
    },
});
