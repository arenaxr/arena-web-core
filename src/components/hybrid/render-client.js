import {MQTTSignaling} from './signaling/mqtt-signaling';
import {ARENAUtils} from '../../utils';

const peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
    ],
};

const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
    'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

AFRAME.registerComponent('render-client', {
    schema: {
        enabled: {type: 'boolean', default: false},
        position: {type: 'vec3', default: new THREE.Vector3()},
        rotation: {type: 'vec4', default: new THREE.Quaternion()},
        sendConnectRetryInterval: {type: 'number', default: 5000},
    },

    init: function() {
        console.log('[render-client] stopping...');
        this.oldtime = 0;
        this.timer = 0;
        this.counter = 0;
        this.connected = false;
        // this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);

        this.id = ARENAUtils.uuidv4();

        this.signaler = new MQTTSignaling(this.id);
        this.signaler.onOffer = this.gotOffer.bind(this);
        this.signaler.onHealthCheck = this.gotHealthCheck.bind(this);
        this.signaler.onAnswer = this.gotAnswer.bind(this);
        this.signaler.onIceCandidate = this.gotIceCandidate.bind(this);

        window.onbeforeunload = () => {
            this.signaler.closeConnection();
        };

        this.connectToCloud();


        console.log('[render-client]', this.id);

        window.addEventListener('hybrid-onremoterender', this.onRemoteRender.bind(this));
        const isServeralive = this.isServeralive.bind(this);
        console.log('[render-client]', this.id);
        setInterval(isServeralive, 5000);
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

    onRemoteTrack(event) {
        console.log('got remote stream');

        // send remote track to compositor
        const remoteTrack = new CustomEvent('hybrid-onremotetrack', {
            detail: {
                track: event.streams[0],
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

        this.dataChannel = this.peerConnection.createDataChannel('client-input');

        this.dataChannel.onopen = () => {
            console.log('Data Channel is Open');
        };

        this.dataChannel.onclose = () => {
            console.log('Data Channel is Closed');
        };

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
            const transceiver = this.peerConnection.addTransceiver('video', {direction: 'recvonly'});
            const codecs = RTCRtpSender.getCapabilities('video').codecs;
            const invalidCodecs = ['video/red', 'video/ulpfec', 'video/rtx'];
            const validCodecs = codecs.filter(function(value, index, arr) {
                return !(invalidCodecs.includes(value));
            });
            transceiver.setCodecPreferences(validCodecs);
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
                z: -data.position.z.toFixed(3),
                x_: data.rotation._x.toFixed(3),
                y_: data.rotation._y.toFixed(3),
                z_: data.rotation._z.toFixed(3),
                w_: data.rotation._w.toFixed(3),
            }));
        }
    },

    gotHealthCheck() {
        this.timer++;
    },

    isServeralive() {
        console.log(this.connected);
        if (this.timer == this.oldtime && this.connected) {
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
            this.connectToCloud();
        }
        this.oldtime = this.timer;
    },
});
