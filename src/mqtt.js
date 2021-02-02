/**
 * @fileoverview Handle messaging from MQTT
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global THREE, ARENA */

// 'use strict';
const Paho = require('paho-mqtt'); // https://www.npmjs.com/package/paho-mqtt
import {ARENAUtils} from './utils.js';
import {ClientEvent, CreateUpdate, Delete} from './message-actions/';

/**
 * Main ARENA MQTT client
 */
export class ARENAMqtt {
    static mqtt = undefined;

    static init() {
        if (!this.mqtt) this.mqtt = new ARENAMqtt();
        return this.mqtt;
    }

    /**
     * Constructor
     */
    constructor() {
        this.mqttClient = new Paho.Client(ARENA.mqttHostURI, 'webClient-' + ARENA.idTag);
        this.mqttClient.onConnected = this.onConnected.bind(this);
        this.mqttClient.onConnectionLost = this.onConnectionLost.bind(this);
        this.mqttClient.onMessageArrived = this.onMessageArrived.bind(this);
    }

    /**
     * MQTT onConnected callback
     * @param {Boolean} reconnect is a reconnect
     * @param {Object} uri uri used
     */
    onConnected(reconnect, uri) {
        if (reconnect) {
            // For reconnect, do not reinitialize user state, that will warp user back and lose
            // current state. Instead, reconnection should naturally allow messages to continue.
            // need to resubscribe however, to keep receiving messages
            if (ARENA.Jitsi) {
                if (!ARENA.Jitsi.ready) {
                    ARENA.Jitsi = ARENA.Jitsi(ARENA.jitsiServer);
                    console.warn(`ARENA Jitsi restarting...`);
                }
            }
            this.mqttClient.subscribe(ARENA.renderTopic);
            console.warn(`MQTT scene reconnected to ${uri}`);
            return; // do not continue!
        }

        // first connection for this client
        console.log(`MQTT scene init user state, connected to ${uri}`);

        let color = Math.floor(Math.random() * 16777215).toString(16);
        if (color.length < 6) color = "0" + color;
        color = '#' + color

        const camera = document.getElementById('my-camera');
        camera.setAttribute('arena-camera', 'enabled', true);
        camera.setAttribute('arena-camera', 'color', color);
        camera.setAttribute('arena-camera', 'displayName', ARENA.getDisplayName());
        camera.setAttribute('position', ARENA.startCoords);
        // enable vio if fixedCamera is given
        if (ARENA.fixedCamera !== '') {
            camera.setAttribute('arena-camera', 'vioEnabled', true);
        }

        // const viveLeft = document.getElementById('vive-leftHand');
        // viveLeft.setAttribute('arena-vive', 'enabled', true);
        // viveLeft.setAttribute('arena-vive', 'name', ARENA.viveLName);
        // viveLeft.setAttribute('arena-vive', 'hand', 'left');
        // viveLeft.setAttribute('arena-vive', 'color', color);

        // const viveRight = document.getElementById('vive-rightHand');
        // viveRight.setAttribute('arena-vive', 'enabled', true);
        // viveRight.setAttribute('arena-vive', 'name', ARENA.viveRName);
        // viveRight.setAttribute('arena-vive', 'hand', 'right');
        // viveRight.setAttribute('arena-vive', 'color', color);

        ARENA.loadSceneOptions();
        ARENA.loadArenaScene();

        // start listening for MQTT messages
        this.mqttClient.subscribe(ARENA.renderTopic);
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

    /**
     * Call internal MessageArrived handler; Isolates message error handling
     * Also called to handle persist objects
     * @param {Object} message
     * @param {String} jsonMessage
     */
    onMessageArrived(message, jsonMessage) {
        try {
            this._onMessageArrived(message, jsonMessage);
        } catch (err) {
            if (message) {
                if (message.payloadString) {
                    console.error('onMessageArrived Error!', err, message.payloadString);
                } else {
                    console.error('onMessageArrived Error!', err,
                        new TextDecoder('utf-8').decode(message.payloadBytes), message.payloadBytes);
                }
            } else if (jsonMessage) {
                console.error('onMessageArrived Error!', err, JSON.stringify(jsonMessage));
            }
        }
    }

    /**
     * Internal MessageArrived handler; handles object create/delete/event/... messages
     * @param {Object} message
     * @param {String} jsonMessage
     */
    _onMessageArrived(message, jsonMessage) {
        let theMessage = {};

        if (message) {
            if (!ARENAUtils.isJson(message.payloadString)) {
                return;
            }
            theMessage = JSON.parse(message.payloadString);
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
                ClientEvent.handle(theMessage);
                break;
            case 'create':
            case 'update':
                if (theMessage.data === undefined) {
                    console.warn('Malformed message (no data field):', JSON.stringify(message));
                    return;
                }
                CreateUpdate.handle(theMessage.action, theMessage);
                break;
            case 'delete':
                Delete.handle(theMessage);
                break;
            default:
                console.warn('Malformed message (invalid action field):', JSON.stringify(message));
                break;
        }
    }

    /**
     * Connect mqtt client; If given, setup a last will message given as argument
     * @param {object} mqttClientOptions paho mqtt options
     * @param {string} lwMsg last will message
     * @param {string} lwTopic last will destination topic message
     */
    connect(mqttClientOptions, lwMsg=undefined, lwTopic=undefined) {
        if (lwMsg && lwTopic && !mqttClientOptions.willMessage) {
            // Last Will and Testament message sent to subscribers if this client loses connection
            let lwt = new Paho.Message(lwMsg);
            lwt.destinationName = lwTopic;
            lwt.qos = 2;
            lwt.retained = false;

            mqttClientOptions.willMessage = lwt;
        }

        this.mqttClient.connect(mqttClientOptions);
    }

    /**
     * Direct call to mqtt client send
     * @param {object} msg
     */
    send(msg) {
        if (!this.mqttClient.isConnected()) return;
        return this.mqttClient.send(msg);
    }
    /**
     * Publish to given dest topic
     * @param {string} dest
     * @param {object} msg
     */
    publish(dest, msg) {
        if (!this.mqttClient.isConnected()) return;

        if (typeof msg === 'object') {
            // add timestamp to all published messages
            const d = new Date();
            const n = d.toISOString();
            msg['timestamp'] = n;

            msg = JSON.stringify(msg);
        }
        const message = new Paho.Message(msg);
        message.destinationName = dest;
        return this.mqttClient.send(message);
    }

    /**
     * Send a message to internal receive handler
     * @param {string} jsonMessage
     */
    processMessage = (jsonMessage) => {
        return this.onMessageArrived(undefined, jsonMessage);
    }

    /**
     * Check if client is connected
     * @param {string} jsonMessage
     */
    isConnected(jsonMessage) {
        return this.mqttClient.isConnected();
    }
};


