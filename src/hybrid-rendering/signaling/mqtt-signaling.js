/* global ARENA */

import { ARENAUtils } from '../../utils';

const Paho = require('paho-mqtt');

const SERVER_OFFER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/offer';
const SERVER_ANSWER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/answer';
const SERVER_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/candidate';
const SERVER_HEALTH_CHECK = 'realm/g/a/hybrid_rendering/server/health';
const SERVER_CONNECT_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/connect';

const CLIENT_CONNECT_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/connect';
const CLIENT_DISCONNECT_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/disconnect';
const CLIENT_OFFER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/offer';
const CLIENT_ANSWER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/answer';
const CLIENT_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/candidate';
const CLIENT_HEALTH_CHECK = 'realm/g/a/hybrid_rendering/client/health';
const CLIENT_STATS_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/stats_browser';

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

        this.client.subscribe(`${SERVER_HEALTH_CHECK}/${ARENA.namespacedScene}/#`);
        this.client.subscribe(`${SERVER_OFFER_TOPIC_PREFIX}/${ARENA.namespacedScene}/#`);
        this.client.subscribe(`${SERVER_ANSWER_TOPIC_PREFIX}/${ARENA.namespacedScene}/#`);
        this.client.subscribe(`${SERVER_CANDIDATE_TOPIC_PREFIX}/${ARENA.namespacedScene}/#`);
        this.client.subscribe(`${SERVER_CONNECT_TOPIC_PREFIX}/${ARENA.namespacedScene}/#`);
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
        this.sendMessage(
            `${CLIENT_CONNECT_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`,
            'connect-ack',
            connectData
        );
    }

    closeConnection() {
        this.sendMessage(`${CLIENT_DISCONNECT_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`, 'disconnect');

        this.client.disconnect();
    }

    sendOffer(offer) {
        this.sendMessage(`${CLIENT_OFFER_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`, 'offer', offer);
    }

    sendAnswer(answer) {
        this.sendMessage(`${CLIENT_ANSWER_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`, 'answer', answer);
    }

    sendCandidate(candidate) {
        this.sendMessage(`${CLIENT_CANDIDATE_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`, 'ice', candidate);
    }

    sendHealthCheckAck() {
        this.sendMessage(`${CLIENT_HEALTH_CHECK}/${ARENA.namespacedScene}/${this.id}`, 'health', '');
    }

    sendStats(stats) {
        this.publish(`${CLIENT_STATS_TOPIC_PREFIX}/${ARENA.namespacedScene}/${this.id}`, JSON.stringify(stats));
    }
}
