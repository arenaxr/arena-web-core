import {MQTTSignaling} from './signaling/mqtt-signaling';
import {WebRTCStatsLogger} from './webrtc-stats';
import {ARENAUtils} from '../../utils';

const pcConfig = {
    'sdpSemantics': 'unified-plan',
    'bundlePolicy': 'balanced',
    'offerExtmapAllowMixed': false,
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
    ],
};

const sdpConstraints = {
    offerToReceiveAudio: 0,
    offerToReceiveVideo: 1,
    voiceActivityDetection: false,
};

const invalidCodecs = ['video/red', 'video/ulpfec', 'video/rtx'];
const preferredCodec = 'video/H264';
const preferredSdpFmtpPrefix = 'level-asymmetry-allowed=1;packetization-mode=1;';
const preferredSdpFmtpLine = 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f';

const dataChannelOptions = {
    ordered: true,
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

        this.connectToCloud();

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

    setupTransceivers() {
        if (supportsSetCodecPreferences) {
            const transceiver = this.pc.getTransceivers()[0];
            // const transceiver = this.pc.addTransceiver('video', {direction: 'recvonly'});
            const {codecs} = RTCRtpSender.getCapabilities('video');
            const validCodecs = codecs.filter((codec) => !invalidCodecs.includes(codec.mimeType));
            const preferredCodecs = validCodecs.sort(function(c1, c2) {
                if (c1.mimeType === preferredCodec && c1.sdpFmtpLine.includes(preferredSdpFmtpPrefix)) {
                    return -1;
                } else {
                    return 1;
                }
            });
            const selectedCodecIndex = validCodecs.findIndex((c) => c.mimeType === preferredCodec &&
                                                                    c.sdpFmtpLine === preferredSdpFmtpLine);
            if (selectedCodecIndex !== -1) {
                const selectedCodec = validCodecs[selectedCodecIndex];
                preferredCodecs.splice(selectedCodecIndex, 1);
                preferredCodecs.unshift(selectedCodec);
            }
            console.log('codecs', preferredCodecs);
            transceiver.setCodecPreferences(preferredCodecs);
        }
    },

    gotOffer(offer) {
        // console.log('got offer.');

        this.pc = new RTCPeerConnection(pcConfig);
        this.pc.onicecandidate = this.onIceCandidate.bind(this);
        this.pc.ontrack = this.onRemoteTrack.bind(this);
        this.pc.oniceconnectionstatechange = () => {
            if (this.pc) {
                console.log('[render-client] iceConnectionState changed:', this.pc.iceConnectionState);
            }
        };

        this.dataChannel = this.pc.createDataChannel('client-input', dataChannelOptions);

        this.dataChannel.onopen = () => {
            console.log('[render-client] data channel opened');
        };

        this.dataChannel.onclose = () => {
            console.log('[render-client] data channel closed');
        };

        this.stats = new WebRTCStatsLogger(this.pc, this.signaler);

        this.pc.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.createAnswer();
            })
            .catch((err) => {
                console.error(err);
            });
    },

    createOffer() {
        // console.log('creating offer.');

        this.pc.createOffer(sdpConstraints)
            .then((description) => {
                this.pc.setLocalDescription(description)
                    .then(() => {
                        // console.log('sending offer.');
                        this.signaler.sendOffer(this.pc.localDescription);
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
        // console.log('got answer.');

        this.pc.setRemoteDescription(new RTCSessionDescription(answer))
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
            this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    },

    createAnswer() {
        // console.log('creating answer.');

        this.setupTransceivers();

        this.pc.createAnswer()
            .then((description) => {
                this.pc.setLocalDescription(description)
                    .then(() => {
                        console.log('sending answer');
                        this.signaler.sendAnswer(this.pc.localDescription);
                        this.createOffer();
                    });
            })
            .then(()=> {
                const receivers = this.pc.getReceivers();
                for (const receiver of receivers) {
                    receiver.playoutDelayHint = 0;
                }
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
        // this.pc.close();
        this.dataChannel = null;
        this.pc = null;
        this.connected = false;
        this.signaler.connectionId = null;
        this.healthCounter = 0;
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
            const prevPos = new THREE.Vector3();
            const prevRot = new THREE.Vector3();
            data.position.copy(prevPos);
            data.rotation.copy(prevPos);

            data.position.setFromMatrixPosition(el.object3D.matrixWorld);
            data.rotation.setFromRotationMatrix(el.object3D.matrixWorld);

            if (prevPos.distanceTo(data.position) <= Number.EPSILON &&
                prevRot.distanceTo(data.rotation) <= Number.EPSILON) return;

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
