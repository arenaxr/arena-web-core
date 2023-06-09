/**
 * @fileoverview Paho MQTT client wrapper;
 * The runtime manager has its own mqtt client
 * TODO: reconcile with other mqtt clients (main arena client, chat ?)
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2022
 */

import * as Paho from 'paho-mqtt'; // https://www.npmjs.com/package/paho-mqtt

export default class MQTTClient {
    constructor(st) {
        // handle default this.settings
        st = st || {};
        this.settings = {
            mqtt_host:
                st.mqtt_host !== undefined ?
                    st.mqtt_host :
                    'wss://' +
                    location.hostname +
                    (location.port ? ':' + location.port : '') +
                    '/mqtt/',
            useSSL: st.useSSL !== undefined ? st.useSSL : true,
            mqtt_username:
                st.mqtt_username !== undefined ? st.mqtt_username : 'non_auth',
            mqtt_token: st.mqtt_token !== undefined ? st.mqtt_token : null,
            reconnect: st.reconnect !== undefined ? st.reconnect : true,
            onMessageCallback: st.onMessageCallback,
            willMessage: st.willMessage !== undefined ? st.willMessage : 'left',
            willMessageTopic:
                st.willMessageTopic !== undefined ? st.willMessageTopic : 'lastwill',
            dbg: st.dbg !== undefined ? st.dbg : false,
            userid: st.userid !== undefined ? st.userid : (Math.random() + 1).toString(36).substring(2),
        };

        if (this.settings.willMessage !== undefined) {
            const lw = new Paho.Message(this.settings.willMessage);
            lw.destinationName =
                st.willMessageTopic !== undefined ? st.willMessageTopic : 'lwtopic';
            lw.qos = 2;
            lw.retained = false;

            this.settings.willMessage = lw;
        }
    }

    async connect(force = false) {
        if (this.connected == true && force == false) return;
        this.mqttc = new Paho.Client(
            this.settings.mqtt_host,
            this.settings.userid,
        );

        this.mqttc.onConnectionLost = this.onConnectionLost.bind(this);
        this.mqttc.onMessageArrived = this.onMessageArrived.bind(this);

        const _this = this;
        return new Promise(function(resolve, reject) {
            _this.mqttc.connect({
                onSuccess: () => {
                    console.info('MQTT Connected.');
                    _this.connected = true;
                    resolve();
                },
                onFailure: () => {
                    console.error('MQTT failed to connect.');
                    _this.connected = false;
                    throw 'MQTT: Error connecting.';
                },
                willMessage: _this.settings.willMessage,
                reconnect: _this.settings.reconnect,
                useSSL: _this.settings.useSSL,
                userName: _this.settings.mqtt_username,
                password: _this.settings.mqtt_token,
            });
        });
    }

    onConnectionLost(message) {
        console.error('MQTT Client Disconnect.');
        this.connected = false;
    }

    subscribe(topic, qos = 0) {
        this.mqttc.subscribe(topic, qos);
    }

    unsubscribe(topic, qos = 0) {
        this.mqttc.unsubscribe(topic);
    }

    async publish(topic, payload, qos = 0, retained = false) {
        if (this.settings.dbg) {
            console.debug(`publish ${topic}: ${payload}`);
        }
        this.mqttc.send(topic, payload, qos, retained);
    }

    /**
     * Callback; Called when a message arrives
     */
    onMessageArrived(message) {
        if (this.settings.dbg) {
            console.debug(`Mqtt Msg [${message.destinationName}]: ${message.payloadString}`);
        }

        if (this.settings.onMessageCallback !== undefined) {
            this.settings.onMessageCallback(message);
        }
    }
}
