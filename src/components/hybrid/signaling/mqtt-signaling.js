const Paho = require('paho-mqtt');

const SERVER_OFFER_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/server/offer';
const SERVER_ANSWER_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/server/answer';
const SERVER_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/server/candidate';
const SERVER_HEALTH_CHECK = 'realm/g/a/cloud_rendering_test/server/health';

const CLIENT_CONNECT_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/connect';
const CLIENT_DISCONNECT_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/disconnect';
const CLIENT_OFFER_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/offer';
const CLIENT_ANSWER_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/answer';
const CLIENT_CANDIDATE_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/candidate';

const UPDATE_REMOTE_STATUS_TOPIC_PREFIX = 'realm/g/a/cloud_rendering_test/client/remote';

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
                // reconnect : true,
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

    closeConnection() {
        this.publish(
            `${CLIENT_DISCONNECT_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'disconnect', 'source': 'client', 'id': this.id})
        );

        this.client.disconnect();
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

        console.log('[render-client]', signal);

        if (signal.type == 'offer') {
            this.connectionId = signal.id;
            if (this.onOffer) this.onOffer(signal.data);
        }
        else if (signal.type == 'answer') {
            if (this.onAnswer) this.onAnswer(signal.data);
        }
        else if (signal.type == 'ice') {
            if (this.onIceCandidate) this.onIceCandidate(signal.data);
        }
        else if (signal.type == 'health') {
            if (this.onHealthCheck) this.onHealthCheck(signal.data)
        }
	}

    sendConnect() {
        this.publish(
            `${CLIENT_CONNECT_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'connect', 'source': 'client', 'id': this.id})
        );
    }

    sendOffer(offer) {
        this.publish(
            `${CLIENT_OFFER_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'offer', 'source': 'client', 'id': this.id, 'data': offer})
        );
    }

    sendAnswer(answer) {
        this.publish(
            `${CLIENT_ANSWER_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'answer', 'source': 'client', 'id': this.id, 'data': answer})
        );
    }

    sendCandidate(candidate) {
        this.publish(
            `${CLIENT_CANDIDATE_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'ice', 'source': 'client', 'id': this.id, 'data': candidate})
        );
    }
    sendRemoteStatusUpdate(update) {
        this.publish(
            `${UPDATE_REMOTE_STATUS_TOPIC_PREFIX}/${this.id}`,
            JSON.stringify({'type': 'remote-update', 'source': 'client', 'id': this.id, 'data': update})
        );
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
