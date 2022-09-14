import {MQTTSignaling} from './signaling/mqtt-signaling';

const peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
    ],
};

/**
 * Generate a UUID.
 * @return {string} The generated UUID string.
 */
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
}

const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

AFRAME.registerComponent('render-client', {
	schema: {
		enabled: {type: 'boolean', default: false},
	},

	init: function() {
		console.log('[render-client] Starting...');

		this.counter = 0;
		this.connected = false;
		// this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);

		this.id = uuidv4();

		this.signaler = new MQTTSignaling(this.id);
		this.signaler.onOffer = this.gotOffer.bind(this);
		this.signaler.onAnswer = this.gotAnswer.bind(this);
		this.signaler.onIceCandidate = this.gotIceCandidate.bind(this);

		window.onbeforeunload = () => {
			this.signaler.closeConnection();
		}

		this.connectToCloud();

		console.log('[render-client]', this.id);
	},

	async connectToCloud() {
		await this.signaler.openConnection();

		while (!this.connected) {
			console.log('[render-client] connecting...');
			this.signaler.sendConnect();
			await this.sleep(5000);
		}
	},

	onRemoteTrack(event) {
		console.log('got remote stream');

		// var remoteVideo = document.getElementById('remoteVideo');
		// remoteVideo.srcObject = event.streams[0];
		const remoteTrack = new CustomEvent('onremotetrack', {
			detail: {
				track: event.streams[0],
			}
		});
		window.dispatchEvent(remoteTrack);
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
			});
	},

	startNegotiation() {
		console.log('creating offer.');

		if (supportsSetCodecPreferences) {
			const transceiver = this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
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
				// const env = document.getElementById('env');
				// env.setAttribute('visible', false);
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
		if (this.connected && this.dataChannel.readyState == 'open') {
			var currentPosition = this.el.object3D.position;
			var currentRotation = this.el.object3D.quaternion;
			this.dataChannel.send(JSON.stringify({
				x: currentPosition.x.toFixed(3),
				y: currentPosition.y.toFixed(3),
				z: -currentPosition.z.toFixed(3),
				x_: currentRotation.x.toFixed(3),
				y_: currentRotation.y.toFixed(3),
				z_: currentRotation.z.toFixed(3),
				w_: currentRotation.w.toFixed(3),
			}));
		}
	}
});
