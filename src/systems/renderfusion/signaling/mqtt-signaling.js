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
                    // TODO (elu2): fixme, this is called once per second after first server connection
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

        this.pubRenderClientPrivateTopic = TOPICS.PUBLISH.SCENE_RENDER_PRIVATE.formatStr(ARENA.topicParams);
        this.subRenderClientPublicTopic = TOPICS.SUBSCRIBE.SCENE_RENDER_PUBLIC.formatStr(ARENA.topicParams);
        this.subRenderClientPrivateTopic = TOPICS.SUBSCRIBE.SCENE_RENDER_PRIVATE.formatStr(ARENA.topicParams);
        this.client.subscribe(this.subRenderClientPublicTopic);
        this.client.subscribe(this.subRenderClientPrivateTopic);
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
        this.sendMessage(this.pubRenderClientPrivateTopic, 'connect-ack', connectData);
    }

    closeConnection() {
        this.sendMessage(this.pubRenderClientPrivateTopic, 'disconnect');

        this.client.disconnect();
    }

    sendOffer(offer) {
        this.sendMessage(this.pubRenderClientPrivateTopic, 'offer', offer);
    }

    sendAnswer(answer) {
        this.sendMessage(this.pubRenderClientPrivateTopic, 'answer', answer);
    }

    sendCandidate(candidate) {
        this.sendMessage(this.pubRenderClientPrivateTopic, 'ice', candidate);
    }

    sendHealthCheckAck() {
        this.sendMessage(this.pubRenderClientPrivateTopic, 'health', '');
    }

    sendStats(stats) {
        this.publish(this.pubRenderClientPrivateTopic, JSON.stringify(stats));
    }
}
