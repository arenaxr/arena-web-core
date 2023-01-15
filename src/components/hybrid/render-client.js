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
let preferredCodec = 'video/H264';
let preferredSdpFmtpPrefix = 'level-asymmetry-allowed=1;packetization-mode=1;';
let preferredSdpFmtpLine = 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f';

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
        getStatsInterval: {type: 'number', default: 2000},
        ipd: {type: 'number', default: 0.064},
        hasDualCameras: {type: 'boolean', default: false},
    },

    init: async function() {
        const el = this.el;

        console.log('[render-client] Starting...');
        this.connected = false;

        this.compositor = el.sceneEl.systems['compositor'];
        // this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);

        this.id = ARENA.idTag; // ARENAUtils.uuidv4();

        this.signaler = new MQTTSignaling(this.id);
        this.signaler.onOffer = this.gotOffer.bind(this);
        this.signaler.onHealthCheck = this.gotHealthCheck.bind(this);
        this.signaler.onAnswer = this.gotAnswer.bind(this);
        this.signaler.onIceCandidate = this.gotIceCandidate.bind(this);
        window.onbeforeunload = () => {
            this.signaler.closeConnection();
        };

        await this.signaler.openConnection();
        this.connectToCloud();

        window.addEventListener('hybrid-onremoterender', this.onRemoteRender.bind(this));

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));

        // window.addEventListener('keyup', this.tick1.bind(this));
    },

    async connectToCloud() {
        const data = this.data;
        this.signaler.connectionId = null;

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
        this.compositor.handleRemoteTrack(stream);
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

    setupTransceivers(isMac) {
        if (supportsSetCodecPreferences) {
            // Mac's H264 encoder produced colors that are a bit off, so prefer VP9
            if (isMac) {
                preferredCodec = 'video/VP9';
                preferredSdpFmtpPrefix = '';
                preferredSdpFmtpLine = 'profile-id=0';
            }

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

        const _this = this;
        this.pc = new RTCPeerConnection(pcConfig);
        this.pc.onicecandidate = this.onIceCandidate.bind(this);
        this.pc.ontrack = this.onRemoteTrack.bind(this);
        this.pc.oniceconnectionstatechange = () => {
            if (_this.pc) {
                console.log('[render-client] iceConnectionState changed:', this.pc.iceConnectionState);
                if (_this.pc.iceConnectionState === 'disconnected') {
                    _this.handleCloudDisconnect();
                }
            }
        };

        this.inputDataChannel = this.pc.createDataChannel('client-input', dataChannelOptions);
        this.inputDataChannel.onopen = () => {
            console.log('[render-client] input data channel opened');
        };
        this.inputDataChannel.onclose = () => {
            console.log('[render-client] input data channel closed');
            _this.handleCloudDisconnect();
        };

        this.statusDataChannel = this.pc.createDataChannel('client-status', dataChannelOptions);
        this.statusDataChannel.onopen = () => {
            console.log('[render-client] status data channel opened');
        };
        this.statusDataChannel.onclose = () => {
            console.log('[render-client] status data channel closed');
            _this.handleCloudDisconnect();
        };

        this.stats = new WebRTCStatsLogger(this.pc, this.signaler);

        this.pc.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.createAnswer(offer.isMac);
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
                const groundPlane = document.getElementById('groundPlane');
                groundPlane.setAttribute('visible', false);

                // this.listenForHealthCheck();
                this.checkStats();
            })
            .catch((err) => {
                console.error(err);
            });
    },

    createAnswer(isMac) {
        // console.log('creating answer.');

        this.setupTransceivers(isMac);

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
            .catch((err) => {
                console.error(err);
            });
    },

    gotIceCandidate(candidate) {
        // console.log('got ice.');
        if (this.connected) {
            this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    },

    gotHealthCheck() {
        this.signaler.sendHealthCheckAck();
    },

    handleCloudDisconnect() {
        if (!this.connected) return;

        const env = document.getElementById('env');
        env.setAttribute('visible', true);
        const groundPlane = document.getElementById('groundPlane');
        groundPlane.setAttribute('visible', true);

        this.compositor.unbind();

        this.connected = false;
        this.inputDataChannel = null;
        this.statusDataChannel = null;
        this.pc = null;
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

    sendStatus() {
        const el = this.el;
        const data = this.data;

        const isVRMode = el.sceneEl.is('vr-mode');
        const isARMode = el.sceneEl.is('ar-mode');
        const hasDualCameras = (isVRMode && !isARMode) || (data.hasDualCameras);
        this.statusDataChannel.send(JSON.stringify({
            isVRMode: true,
            isARMode: isARMode,
            hasDualCameras: hasDualCameras,
            ipd: data.ipd,
            ts: new Date().getTime(),
        }));
    },

    onEnterVR() {
        this.sendStatus();
    },

    onExitVR() {
        this.statusDataChannel.send(JSON.stringify({
            isVRMode: false,
            ts: new Date().getTime(),
        }));
    },

    update: function(oldData) {
        const el = this.el;
        const data = this.data;

        if (oldData.ipd !== undefined && data.ipd != oldData.ipd) {
            this.sendStatus();
        }

        if (oldData.hasDualCameras !== undefined && data.hasDualCameras != oldData.hasDualCameras) {
            this.sendStatus();
        }
    },

    tick: function(time, timeDelta) {
        const data = this.data;
        const el = this.el;

        if (this.connected && this.inputDataChannel.readyState == 'open') {
            const prevPos = new THREE.Vector3();
            const prevRot = new THREE.Vector3();
            data.position.copy(prevPos);
            data.rotation.copy(prevPos);

            data.position.setFromMatrixPosition(el.object3D.matrixWorld);
            data.rotation.setFromRotationMatrix(el.object3D.matrixWorld);

            if (prevPos.distanceTo(data.position) <= Number.EPSILON &&
                prevRot.distanceTo(data.rotation) <= Number.EPSILON) return;

            this.inputDataChannel.send(JSON.stringify({
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
