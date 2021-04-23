import * as Comlink from 'comlink';
const Paho = require('paho-mqtt'); // https://www.npmjs.com/package/paho-mqtt
/**
 * Main ARENA MQTT client
 */

/**
 * Initializes a MQTT Worker
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
        this.mainOnMessageArrived = mainOnMessageArrived;
        this.restartJitsi = restartJitsi;
        this.ARENA = ARENAConfig;
        const mqttClient = new Paho.Client(ARENAConfig.mqttHostURI, 'webClient-' + ARENAConfig.idTag);
        mqttClient.onConnected = this.onConnected;
        mqttClient.onConnectionLost = this.onConnectionLost;
        mqttClient.onMessageArrived = this.onMessageArrived;
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

            mqttClientOptions.willMessage = lwt;
        }
        this.mqttClient.connect(opts);
    }

    /**
     * Direct call to mqtt client send
     * @param {object} msg
     */
    async send(msg) {
        if (!this.mqttClient.isConnected()) return;
        return this.mqttClient.send(msg);
    }
    /**
     * Publish to given dest topic
     * @param {string} dest
     * @param {object} msg
     */
    async publish(dest, msg) {
        if (!this.mqttClient.isConnected()) return;

        if (typeof msg === 'object') {
            // add timestamp to all published messages
            msg['timestamp'] = new Date().toISOString();

            msg = JSON.stringify(msg);
        }
        const message = new Paho.Message(msg);
        message.destinationName = dest;
        return this.mqttClient.send(message);
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

    /**
     * Call internal MessageArrived handler; Isolates message error handling
     * Also called to handle persist objects
     * @param {Object} message
     * @param {String} jsonMessage
     */
    async onMessageArrived(message, jsonMessage) {
        try {
            await this.mainOnMessageArrived(message, jsonMessage);
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
}

Comlink.expose(MQTTWorker);
