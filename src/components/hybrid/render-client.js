import {MQTTSignaling} from './signaling/mqtt-signaling';
import {ARENAUtils} from '../../utils';

const peerConnectionConfig = {
    'sdpSemantics': 'unified-plan',
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
    ],
};

const invalidCodecs = ['video/red', 'video/ulpfec', 'video/rtx'];
const preferredCodec = 'video/VP9';

const dataChannelOptions = {
    // ordered: false, // do not guarantee order
    // maxPacketLifeTime: 17, // in milliseconds
    // maxRetransmits: null,
};

const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
    'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

AFRAME.registerComponent('render-client', {
    schema: {
        enabled: {type: 'boolean', default: false},
        position: {type: 'vec3', default: new THREE.Vector3()},
        rotation: {type: 'vec4', default: new THREE.Quaternion()},
        sendConnectRetryInterval: {type: 'number', default: 5000},
        checkHealthInterval: {type: 'number', default: 1000},
        getStatsInterval: {type: 'number', default: 2000},
    },

    init: function() {
        console.log('[render-client] Starting...');
        this.healthCounter = 0;
        this.connected = false;
        // this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);

        this.id = ARENAUtils.uuidv4();

        this.signaler = new MQTTSignaling(this.id);
        this.signaler.onOffer = this.gotOffer.bind(this);
        this.signaler.onHealthCheck = this.gotHealthCheck.bind(this);
        this.signaler.onAnswer = this.gotAnswer.bind(this);
        this.signaler.onIceCandidate = this.gotIceCandidate.bind(this);
        // this.recivedAckknowledge = False;
        window.onbeforeunload = () => {
            this.signaler.closeConnection();
        };
        // this.connecttoDispatcher()
        this.connectToCloud();

        console.log('[render-client]', this.id);

        window.addEventListener('hybrid-onremoterender', this.onRemoteRender.bind(this));
        console.log('[render-client]', this.id);

        // window.addEventListener('keyup', this.tick1.bind(this));
    },

    async connectToCloud() {
        const data = this.data;
        await this.signaler.openConnection();

        while (!this.connected) {
            console.log('[render-client] connecting...');
            this.signaler.sendConnect();
            await this.sleep(data.sendConnectRetryInterval);
        }
    },
    /*
    async connecttoDispatcher() {
        const data = this.data;
        await this.signaler.recivedAcknoeldge();

        while (!this.RecievedAckknowldge) {
            console.log('[render-client] connecting...');
            this.signaler.DispatcherConnect();
            await this.sleep(data.sendConnectRetryInterval);
        }
    },
    */

    onRemoteTrack(e) {
        console.log('got remote stream');

        const stream = new MediaStream();
        stream.addTrack(e.track);

        // send remote track to compositor
        const remoteTrack = new CustomEvent('hybrid-onremotetrack', {
            detail: {
                stream: stream,
            },
        });
        window.dispatchEvent(remoteTrack);
    },

    onRemoteRender(event) {
        console.log('[render-client]', event.detail.object_id, event.detail.remoteRendered);
        const update = event.detail;
        this.signaler.sendRemoteStatusUpdate(update);
    },

    onIceCandidate(event) {
        // console.log('pc ICE candidate: \n ' + event.candidate);
        if (event.candidate != null) {
            this.signaler.sendCandidate(event.candidate);
        }
    },

    gotOffer(offer) {
        console.log('got offer.');

        this.peerConnection = new RTCPeerConnection(peerConnectionConfig);
        this.peerConnection.onicecandidate = this.onIceCandidate.bind(this);
        this.peerConnection.ontrack = this.onRemoteTrack.bind(this);
        this.peerConnection.oniceconnectionstatechange = () => {
            if (this.peerConnection) {
                console.log('[render-client] iceConnectionState changed:,', this.peerConnection.iceConnectionState);
            }
        };

        this.dataChannel = this.peerConnection.createDataChannel('client-input', dataChannelOptions);

        this.dataChannel.onopen = () => {
            console.log('Data Channel is Open');
        };

        this.dataChannel.onclose = () => {
            console.log('Data Channel is Closed');
        };

        this.stats = new WebRTCStatsLogger(this.peerConnection, this.signaler);

        this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.createAnswer();
            })
            .catch((err) => {
                console.error(err);
            });
    },

    startNegotiation() {
        console.log('creating offer.');

        if (supportsSetCodecPreferences) {
            const transceiver = this.peerConnection.getTransceivers()[0];
            // const transceiver = this.peerConnection.addTransceiver('video', {direction: 'recvonly'});
            const {codecs} = RTCRtpSender.getCapabilities('video');
            const validCodecs = codecs.filter((codec) => !invalidCodecs.includes(codec.mimeType));
            const selectedCodecIndex = validCodecs.findIndex((c) => c.mimeType === preferredCodec);
            const selectedCodec = validCodecs[selectedCodecIndex];
            validCodecs.splice(selectedCodecIndex, 1);
            validCodecs.unshift(selectedCodec);
            console.log('codecs', validCodecs);
            transceiver.setCodecPreferences(validCodecs);
            console.log('Preferred video codec', selectedCodec);
        }

        this.peerConnection.createOffer()
            .then((description) => {
                this.peerConnection.setLocalDescription(description)
                    .then(() => {
                        console.log('sending offer.');
                        this.signaler.sendOffer(this.peerConnection.localDescription);
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            })
            .catch((err) =>{
                console.error(err);
            });
    },

    gotAnswer(answer) {
        console.log('got answer.');
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                this.connected = true;

                const env = document.getElementById('env');
                env.setAttribute('visible', false);
                // document.getElementById('sceneRoot');
                // sceneRoot.removeChild(env);

                const groundPlane = document.getElementById('groundPlane');
                groundPlane.setAttribute('visible', false);

                this.listenForHealthCheck();
                this.checkStats();
            })
            .catch((err) =>{
                console.error(err);
            });
    },

    gotIceCandidate(candidate) {
        // console.log('got ice.');
        if (this.connected) {
            this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    },

    createAnswer() {
        console.log('creating answer.');

        this.peerConnection.createAnswer()
            .then((description) => {
                this.peerConnection.setLocalDescription(description).then(() => {
                    console.log('sending answer');
                    this.signaler.sendAnswer(this.peerConnection.localDescription);
                    this.startNegotiation();
                });
            })
            .catch((err) =>{
                console.error(err);
            });
    },

    gotHealthCheck() {
        this.healthCounter = 0;
    },
    /*
    gotAckknowldge()
    {
        this.recivedAckknowledge = True;
    }
    */

    async listenForHealthCheck() {
        const data = this.data;

        while (this.connected && this.healthCounter < 2) {
            this.healthCounter++;
            await this.sleep(data.checkHealthInterval);
        }

        const env = document.getElementById('env');
        env.setAttribute('visible', true);
        const groundPlane = document.getElementById('groundPlane');
        groundPlane.setAttribute('visible', true);

        document.querySelector('a-scene').systems['compositor'].unbind();

        // this.dataChannel.close();
        // this.peerConnection.close();
        this.dataChannel = null;
        this.peerConnection = null;
        this.connected = false;
        this.signaler.connectionId = null;
        this.healthCounter = 0;
        //this.connecttoDispatcher
        this.connectToCloud();
    },

    async checkStats() {
        const data = this.data;
        while (this.connected) {
            this.stats.getStats();
            await this.sleep(data.getStatsInterval);
        }
    },

    sleep: function(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    tick: function(time, timeDelta) {
        const data = this.data;
        const el = this.el;

        if (this.connected && this.dataChannel.readyState == 'open') {
            data.rotation.setFromRotationMatrix(el.object3D.matrixWorld);
            data.position.setFromMatrixPosition(el.object3D.matrixWorld);

            this.dataChannel.send(JSON.stringify({
                x: data.position.x.toFixed(3),
                y: data.position.y.toFixed(3),
                z: data.position.z.toFixed(3),
                x_: data.rotation._x.toFixed(3),
                y_: data.rotation._y.toFixed(3),
                z_: data.rotation._z.toFixed(3),
                w_: data.rotation._w.toFixed(3),
                ts: new Date().getTime(),
            }));
        }
    },
});
