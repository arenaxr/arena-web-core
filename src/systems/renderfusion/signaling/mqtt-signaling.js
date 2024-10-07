import { ARENAUtils } from '../../../utils';
import { TOPICS } from '../../../constants';

const Paho = require('paho-mqtt');

export default class MQTTSignaling {
    constructor(id, mqttHost, username, mqttToken) {
        this.id = id;
        this.connectionId = null;
        this.mqttHost = mqttHost;
        this.mqttUsername = username;
        this.mqttToken = mqttToken;

        this.onConnect = null;
        this.onOffer = null;
        this.onAnswer = null;
        this.onIceCandidate = null;
        this.onHealthCheck = null;
    }

    publish(topic, msg) {
        const message = new Paho.Message(msg);
        message.destinationName = topic;
        this.client.send(message);
    }

    openConnection() {
        this.client = new Paho.Client(this.mqttHost, `hybrid-mqtt-client-${this.id}`);

        const _this = this;
        return new Promise((resolve) => {
            this.client.connect({
                cleanSession: true,
                userName: this.mqttUsername,
                password: this.mqttToken,
                onSuccess: () => {
                    _this.mqttOnConnect();
                    resolve();
                },
                onFailure: this.mqttOnConnectionLost,
                reconnect: true,
            });
        });
    }

    mqttOnConnect() {
        this.client.onMessageArrived = this.mqttOnMessageArrived.bind(this);

        this.publicRenderClientTopic = TOPICS.PUBLISH.SCENE_RENDER.formatStr({
            ...ARENA.topicParams,
            ...{ idTag: '-' },
        });
        this.privateRenderClientTopic = `${TOPICS.PUBLISH.SCENE_RENDER_PRIVATE.formatStr(ARENA.topicParams)}`;
        console.log(`hybrid rendering pub ${this.publicRenderClientTopic} pri ${this.privateRenderClientTopic}`);
        this.client.subscribe(`${this.publicRenderClientTopic}`);
        console.log(`hybrid rendering subscribed to ${this.publicRenderClientTopic}`);
    }

    mqttOnConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log('[render-client] Connection Lost:', responseObject.errorMessage);
        }
    }

    mqttOnMessageArrived(message) {
        const signal = JSON.parse(message.payloadString);
        // ignore other clients
        if (signal.source === 'client') return;

        // ignore own messages
        if (signal.id === this.id) return;

        if (this.connectionId != null && signal.id !== this.connectionId) return;

        // console.log('[render-client]', signal);
        if (signal.type === 'connect') {
            if (this.onConnect) this.onConnect();
        } else if (signal.type === 'offer') {
            this.connectionId = signal.id;
            if (this.onOffer) this.onOffer(signal.data);
        } else if (signal.type === 'answer') {
            if (this.onAnswer) this.onAnswer(signal.data);
        } else if (signal.type === 'ice') {
            if (this.onIceCandidate) this.onIceCandidate(signal.data);
        } else if (signal.type === 'health') {
            if (this.onHealthCheck) this.onHealthCheck(signal.data);
        }
    }

    sendMessage(topic, type, data) {
        const msg = {
            type,
            source: 'client',
            id: this.id,
            data,
            ts: new Date().getTime(),
        };

        this.publish(topic, JSON.stringify(msg));
    }

    sendConnectACK() {
        const width = Math.max(window.screen.width, window.screen.height);
        const height = Math.min(window.screen.width, window.screen.height);
        const connectData = {
            id: this.id,
            deviceType: ARENAUtils.getDeviceType(),
            sceneNamespace: ARENA.namespace,
            sceneName: ARENA.scene,
            screenWidth: 1.25 * width,
            screenHeight: height,
        };
        this.sendMessage(`${this.privateRenderClientTopic}`, 'connect-ack', connectData);
    }

    closeConnection() {
        this.sendMessage(`${this.privateRenderClientTopic}`, 'disconnect');

        this.client.disconnect();
    }

    sendOffer(offer) {
        this.sendMessage(`${this.privateRenderClientTopic}`, 'offer', offer);
    }

    sendAnswer(answer) {
        this.sendMessage(`${this.privateRenderClientTopic}`, 'answer', answer);
    }

    sendCandidate(candidate) {
        this.sendMessage(`${this.privateRenderClientTopic}`, 'ice', candidate);
    }

    sendHealthCheckAck() {
        this.sendMessage(`${this.privateRenderClientTopic}`, 'health', '');
    }

    sendStats(stats) {
        this.publish(`${this.privateRenderClientTopic}`, JSON.stringify(stats));
    }
}
