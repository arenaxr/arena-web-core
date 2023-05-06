/**
 * @fileoverview Perform periodic pings on MQTT to monitor network latency
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

import { ARENADefaults } from '../../conf/defaults.js';
import { EVENTS } from '../constants/events';
const Paho = require('paho-mqtt'); // https://www.npmjs.com/package/paho-mqtt

/**
 * Publish with qos of 2 for network graph to update latency
 * @module network-latency
 * @property {number} UPDATE_INTERVAL_MS=10000 - Interval to send the periodic pings (ms)
 *
 */
AFRAME.registerComponent('network-latency', {
    schema: {
        enabled: {type: 'boolean', default: true},
        updateIntervalMs: {type: 'number', default: 10000}, // updates every 10s
        latencyTopic: {type: 'string', default: ARENADefaults.latencyTopic},
    },

    init: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        if (!data.enabled) return;

        if (!sceneEl.ARENAMqttLoaded) {
            sceneEl.addEventListener(EVENTS.MQTT_LOADED, this.init.bind(this));
            return;
        }

        this.mqtt = sceneEl.systems['arena-mqtt'];

        const pahoMsg = new Paho.Message('{ "type": "latency" }'); // send message type latency
        pahoMsg.destinationName = data.latencyTopic;
        pahoMsg.qos = 2;

        this.pahoMsg = pahoMsg;
        this.message = '{ "type": "latency" }'; // send message type latency
        this.topic = data.latencyTopic;
        this.qos = 2;

        this.tick = AFRAME.utils.throttleTick(this.tick, data.updateIntervalMs, this);
    },

    tick: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        // publish empty message with qos of 2 for network graph to update latency
        if (sceneEl.ARENAMqttLoaded && this.mqtt.isConnected()) {
            this.mqtt.publish(this.topic, this.message, this.qos);
        }
    },
});
