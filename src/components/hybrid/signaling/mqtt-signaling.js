const Paho = require('paho-mqtt');

const SERVER_OFFER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/offer';
const SERVER_ANSWER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/answer';
const SERVER_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/server/candidate';
const SERVER_HEALTH_CHECK = 'realm/g/a/hybrid_rendering/server/health';

const CLIENT_CONNECT_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/connect';
const CLIENT_DISCONNECT_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/disconnect';
const CLIENT_OFFER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/offer';
const CLIENT_ANSWER_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/answer';
const CLIENT_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/candidate';
const CLIENT_STATS_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/stats';

const UPDATE_REMOTE_STATUS_TOPIC_PREFIX = 'realm/g/a/hybrid_rendering/client/remote';

export class MQTTSignaling {
    constructor(id) {
        this.id = id;
        this.connectionId = null;
        this.mqttHost = ARENA.mqttHostURI;
        this.mqttUsername = ARENA.username;
        this.mqttToken = ARENA.mqttToken;

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
        this.client = new Paho.Client(this.mqttHost, `hybrid-client-${this.id}`);

        var _this = this;
        return new Promise((resolve, reject) => {
            this.client.connect({
                cleanSession : true,
                userName: this.mqttUsername,
                password: this.mqttToken,
                onSuccess : () => {
                    _this.mqttOnConnect();
                    resolve();
                },
                onFailure : this.mqttOnConnectionLost,
                reconnect : true,
            });
        });
    }

    mqttOnConnect() {
        this.client.onMessageArrived = this.mqttOnMessageArrived.bind(this);

        this.client.subscribe(`${SERVER_HEALTH_CHECK}/#`);
        this.client.subscribe(`${SERVER_OFFER_TOPIC_PREFIX}/#`);
        this.client.subscribe(`${SERVER_ANSWER_TOPIC_PREFIX}/#`);
        this.client.subscribe(`${SERVER_CANDIDATE_TOPIC_PREFIX}/#`);
    }

    mqttOnConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log('[render-client] Connection Lost:', responseObject.errorMessage);
        }
    }

    mqttOnMessageArrived(message) {
        var signal = JSON.parse(message.payloadString);
        // ignore other clients
        if (signal.source == 'client') return;

        // ignore own messages
        if (signal.id == this.id) return;

        if ((this.connectionId != null) && (signal.id != this.connectionId)) return;

        // console.log('[render-client]', signal);

        if (signal.type == 'offer') {
            this.connectionId = signal.id;
            if (this.onOffer) this.onOffer(signal.data);
        } else if (signal.type == 'answer') {
            if (this.onAnswer) this.onAnswer(signal.data);
        } else if (signal.type == 'ice') {
            if (this.onIceCandidate) this.onIceCandidate(signal.data);
        } else if (signal.type == 'health') {
            if (this.onHealthCheck) this.onHealthCheck(signal.data)
        }
	}

    sendMessage(topic, type, data) {
        const msg = {'type': type, 'source': 'client', 'id': this.id, 'ts': new Date().getTime()};
        if (data !== undefined) {
            msg['data'] = data;
        }

        this.publish(topic,
            JSON.stringify(msg)
        );
    }

    sendConnect() {
        this.sendMessage(`${CLIENT_CONNECT_TOPIC_PREFIX}/${this.id}`, 'connect');
    }

    closeConnection() {
        this.sendMessage(`${CLIENT_DISCONNECT_TOPIC_PREFIX}/${this.id}`, 'disconnect');

        this.client.disconnect();
    }

    sendOffer(offer) {
        this.sendMessage(`${CLIENT_OFFER_TOPIC_PREFIX}/${this.id}`, 'offer', offer);
    }

    sendAnswer(answer) {
        this.sendMessage(`${CLIENT_ANSWER_TOPIC_PREFIX}/${this.id}`, 'answer', answer);
    }

    sendCandidate(candidate) {
        this.sendMessage(`${CLIENT_CANDIDATE_TOPIC_PREFIX}/${this.id}`, 'ice', candidate);
    }

    sendRemoteStatusUpdate(update) {
        this.sendMessage(`${UPDATE_REMOTE_STATUS_TOPIC_PREFIX}/${this.id}`, 'remote-update', update);
    }

    sendStats(stats) {
        this.sendMessage(`${CLIENT_STATS_TOPIC_PREFIX}/${this.id}`, 'stats', stats);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
