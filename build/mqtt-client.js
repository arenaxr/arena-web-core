/**
 * @fileoverview Paho mqtt client wrapper
 *
 */

/* global Paho */

const nretries = 2;

/**
 * Mqtt client wrapper class
 */
export default class MqttClient {
    /**
     * Create an mqtt client instance
     * @param st an object with the client setting
     */
    constructor(st) {
        // handle default this.settings
        st = st || {};
        this.settings = {
            uri: st.uri !== undefined ? st.uri : 'wss://arena.andrew.cmu.edu/mqtt/',
            host: st.host !== undefined ? st.host : 'arena.andrew.cmu.edu',
            port: st.port !== undefined ? st.port : 8083,
            path: st.path !== undefined ? st.path : '/mqtt/',
            clientid: st.clientid !== undefined ? st.clientid : `build-client-${Math.round(Math.random() * 10000)}`,
            subscribeTopics: st.subscribeTopics,
            onConnectCallback: st.onConnectCallback,
            onConnectCallbackContext: st.onConnectCallbackContext,
            onMessageCallback: st.onMessageCallback,
            useSSL: st.useSSL !== undefined ? st.useSSL : true,
            dbg: st.dbg !== undefined ? st.dbg : false,
            mqtt_username: st.mqtt_username,
            mqtt_token: st.mqtt_token,
        };

        // console.log(st.mqtt_username);

        if (this.settings.dbg === true) console.log(this.settings);
    }

    async connect() {
        if (this.settings.uri) {
            if (this.settings.dbg === true) console.log('Connecting [uri]: ', this.settings.uri);
            // init Paho client connection
            this.mqttc = new Paho.Client(this.settings.uri, this.settings.clientid);
        } else {
            const wss = this.settings.useSSL === true ? 'wss://' : 'ws://';
            console.log(
                `Connecting [host,port,path]: ${wss}${this.settings.host}:${this.settings.port}${this.settings.path}`
            );
            // init Paho client connection
            this.mqttc = new Paho.Client(
                this.settings.host,
                Number(this.settings.port),
                this.settings.path,
                this.settings.clientid
            );
        }
        // callback handlers
        this.mqttc.onConnectionLost = this.onConnectionLost.bind(this);
        this.mqttc.onMessageArrived = this.onMessageArrived.bind(this);

        this.retries = 0;

        const _this = this;
        return new Promise((resolve, reject) => {
            // connect the client, if successful, call onConnect function
            _this.mqttc.connect({
                onSuccess: () => {
                    if (_this.settings.subscribeTopics !== undefined) {
                        // Subscribe to the requested topic
                        if (_this.settings.subscribeTopics.length > 0) {
                            _this.mqttc.subscribe(_this.settings.subscribeTopics);
                        }
                    }
                    if (_this.settings.onConnectCallback !== undefined)
                        _this.settings.onConnectCallback(_this.settings.onConnectCallbackContext);
                    resolve();
                },
                onFailure: () => {
                    throw new Error('Could not connect!');
                },
                useSSL: _this.settings.useSSL,
                userName: _this.settings.mqtt_username,
                password: _this.settings.mqtt_token,
            });
        });
    }

    // simulate message publication for testing purposes
    simulatePublish(topic, payload) {
        if (typeof payload !== 'string') payload = JSON.stringify(payload);
        const msg = new Paho.Message(payload);
        msg.destinationName = topic;
        this.settings.onMessageCallback(msg);
    }

    disconnect() {
        try {
            this.mqttc.disconnect();
        } catch (err) {
            if (this.settings.dbg === true) console.error('MQTT Disconnected.');
        }
    }

    /**
     * Callback; Called when the client loses its connection
     */
    onConnectionLost(responseObject) {
        if (this.settings.dbg === true) console.log('Mqtt client disconnected...');

        if (responseObject.errorCode !== 0) {
            if (this.settings.dbg === true) console.error(`Mqtt ERROR: ${responseObject.errorMessage}\n`);
        }
    }

    /**
     * Callback; Called when a message arrives
     */
    onMessageArrived(message) {
        if (this.settings.dbg === true)
            console.log(`Mqtt Msg [${message.destinationName}]: ${message.payloadString}\n`);

        if (this.settings.onMessageCallback !== undefined) this.settings.onMessageCallback(message);
    }

    publish(topic, payload) {
        if (typeof payload !== 'string') payload = JSON.stringify(payload);
        if (this.settings.dbg === true) console.log(`Publishing (${topic}):${payload}`);
        this.mqttc.send(topic, payload, 0, false);
    }

    subscribe(topic) {
        const logOptions = {
            onSuccess: () => {
                if (this.settings.dbg === true) console.log(`Subscribe success to: ${topic}`);
            },
            onFailure: () => {
                throw new Error(`Subscribe FAILED to: ${topic}`);
            },
        };
        this.mqttc.subscribe(topic, logOptions);
    }

    unsubscribe(topic) {
        console.log(`Unsubscribing :${topic}`);
        this.mqttc.unsubscribe(topic);
    }
}
