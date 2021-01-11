/* global AFRAME, ARENA, THREE */

/**
 * Workaround for AEC when using Web Audio API (https://bugs.chromium.org/p/chromium/issues/detail?id=687574)
 * https://github.com/mozilla/hubs/blob/master/src/systems/audio-system.js
 * @param {Object} gainNode
 */
async function enableChromeAEC(gainNode) {
    /**
     *  workaround for: https://bugs.chromium.org/p/chromium/issues/detail?id=687574
     *  1. grab the GainNode from the scene's THREE.AudioListener
     *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out),
     *     this prevents hearing the audio twice.
     *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
     *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
     *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
     *  6. connect the other RTCPeerConnection's stream to a new audio element.
     *  All audio is now routed through Chrome's audio mixer, thus enabling AEC,
     *  while preserving all the audio processing that was performed via the WebAudio API.
     */

    const audioEl = new Audio();
    audioEl.setAttribute('autoplay', 'autoplay');
    audioEl.setAttribute('playsinline', 'playsinline');

    const context = THREE.AudioContext.getContext();
    const loopbackDestination = context.createMediaStreamDestination();
    const outboundPeerConnection = new RTCPeerConnection();
    const inboundPeerConnection = new RTCPeerConnection();

    const onError = (e) => {
        console.error('RTCPeerConnection loopback initialization error', e);
    };

    outboundPeerConnection.addEventListener('icecandidate', (e) => {
        inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener('icecandidate', (e) => {
        outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener('track', (e) => {
        audioEl.srcObject = e.streams[0];
    });

    try {
        /* The following should never fail, but just in case, we won't disconnect/reconnect
           the gainNode unless all of this succeeds */
        loopbackDestination.stream.getTracks().forEach((track) => {
            outboundPeerConnection.addTrack(track, loopbackDestination.stream);
        });

        const offer = await outboundPeerConnection.createOffer();
        outboundPeerConnection.setLocalDescription(offer);
        await inboundPeerConnection.setRemoteDescription(offer);

        const answer = await inboundPeerConnection.createAnswer();
        inboundPeerConnection.setLocalDescription(answer);
        outboundPeerConnection.setRemoteDescription(answer);

        gainNode.disconnect();
        if (ARENA.JitsiAPI.chromeSpatialAudioOn()) {
            gainNode.connect(context.destination);
        } else {
            gainNode.connect(loopbackDestination);
        }
    } catch (e) {
        onError(e);
    }
}

/**
 * Another user's camera in the ARENA. Handles Jitsi and display name updates.
 *
 */
AFRAME.registerComponent('arena-user', {
    schema: {
        color: {type: 'color', default: 'white'},
        jitsiId: {type: 'string', default: ''},
        displayName: {type: 'string', default: ''},
        hasAudio: {type: 'boolean', default: false},
        hasVideo: {type: 'boolean', default: false},
    },

    init: function() {
        const data = this.data;
        const el = this.el;
        const name = el.id;

        el.setAttribute('rotation.order', 'YXZ');
        el.object3D.position.set(0, 0, 0);
        el.object3D.rotation.set(0, 0, 0);

        const decodeName = decodeURI(name.split('_')[2]);
        const personName = decodeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        this.headText = document.createElement('a-text');
        this.headText.setAttribute('id', 'headtext_' + name);
        this.headText.setAttribute('value', personName);
        this.headText.setAttribute('position', '0 0.45 0.05');
        this.headText.setAttribute('side', 'double');
        this.headText.setAttribute('align', 'center');
        this.headText.setAttribute('anchor', 'center');
        this.headText.setAttribute('scale', '0.4 0.4 0.4');
        this.headText.setAttribute('rotation', '0 180 0');
        this.headText.setAttribute('color', data.color);
        this.headText.setAttribute('width', 5); // try setting last

        this.headModel = document.createElement('a-entity');
        this.headModel.setAttribute('id', 'head-model_' + name);
        this.headModel.setAttribute('rotation', '0 180 0');
        this.headModel.object3D.scale.set(1, 1, 1);
        this.headModel.setAttribute('dynamic-body', 'type', 'static');
        this.headModel.setAttribute('gltf-model', 'url(models/Head.gltf)'); // actually a face mesh

        el.appendChild(this.headText);
        el.appendChild(this.headModel);

        this.videoTrack = null;
        this.videoID = null;
        this.videoCubeDrawn = false;
        this.audioTrack = null;
        this.audioSource = null;

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },

    drawMicrophone() {
        const el = this.el;

        const name = 'muted_' + el.id;
        let micIconEl = document.querySelector('#' + name);
        if (!micIconEl) {
            micIconEl = document.createElement('a-image');
            micIconEl.setAttribute('id', name);
            micIconEl.setAttribute('scale', '0.2 0.2 0.2');
            micIconEl.setAttribute('position', '0 0.3 0.045');
            micIconEl.setAttribute('src', 'url(src/icons/images/audio-off.png)');
            el.appendChild(micIconEl);
        }
    },

    removeMicrophone() {
        const el = this.el;

        const name = 'muted_' + el.id;
        const micIconEl = document.querySelector('#' + name);
        if (micIconEl) {
            el.removeChild(micIconEl);
        }
    },

    drawVideoCube() {
        const el = this.el;

        // attach video to head
        const videoCube = document.createElement('a-box');
        videoCube.setAttribute('id', this.videoID + 'cube');
        videoCube.setAttribute('position', '0 0 0');
        videoCube.setAttribute('scale', '0.6 0.4 0.6');
        videoCube.setAttribute('material', 'shader', 'flat');
        videoCube.setAttribute('src', `#${this.videoID}`); // video only (!audio)
        videoCube.setAttribute('material-extras', 'encoding', 'sRGBEncoding');

        const videoCubeDark = document.createElement('a-box');
        videoCubeDark.setAttribute('id', this.videoID + 'cubeDark');
        videoCubeDark.setAttribute('position', '0 0 0.01');
        videoCubeDark.setAttribute('scale', '0.61 0.41 0.6');
        videoCubeDark.setAttribute('material', 'shader', 'flat');
        videoCubeDark.setAttribute('transparent', 'true');
        videoCubeDark.setAttribute('color', 'black');
        videoCubeDark.setAttribute('opacity', '0.8');

        el.appendChild(videoCube);
        el.appendChild(videoCubeDark);

        this.videoCubeDrawn = true;
    },

    removeVideoCube() {
        const el = this.el;

        // remove video cubes
        const vidCube = document.getElementById(this.videoID + 'cube');
        if (el.contains(vidCube)) {
            el.removeChild(vidCube);
        }
        const vidCubeDark = document.getElementById(this.videoID + 'cubeDark');
        if (el.contains(vidCubeDark)) {
            el.removeChild(vidCubeDark);
        }
        this.videoCubeDrawn = false;
    },

    aec(listener) {
        // sorta fixes chrome echo bug
        const audioCtx = THREE.AudioContext.getContext();
        const resume = () => {
            audioCtx.resume();
            setTimeout(function() {
                if (audioCtx.state === 'running') {
                    if (!AFRAME.utils.device.isMobile() && /chrome/i.test(navigator.userAgent)) {
                        enableChromeAEC(listener.gain);
                    }
                    document.body.removeEventListener('touchmove', resume, false);
                    document.body.removeEventListener('mousemove', resume, false);
                }
            }, 0);
        };
        document.body.addEventListener('touchmove', resume, false);
        document.body.addEventListener('mousemove', resume, false);
    },

    updateVideo() {
        const data = this.data;
        if (!data) return;

        /* Handle Jitsi Video */
        this.videoID = `video${data.jitsiId}`;
        if (data.hasVideo) {
            this.videoTrack = ARENA.JitsiAPI.getVideoTrack(data.jitsiId);
            // draw video cube, but only if it didnt exist before
            videoElem = document.getElementById(this.videoID);
            if (videoElem && !this.videoCubeDrawn) {
                this.drawVideoCube();
            }
        } else {
            // pause WebRTC video stream
            if (this.videoTrack) {
                this.videoTrack.enabled = false;
            }
            this.removeVideoCube();
        }
    },

    updateAudio() {
        const data = this.data;
        const el = this.el;
        if (!data) return;

        /* Handle Jitsi Audio */
        if (data.hasAudio) {
            // set up positional audio, but only once per camera
            const jistiAudioTrack = ARENA.JitsiAPI.getAudioTrack(data.jitsiId);
            if (!jistiAudioTrack) return;

            const oldAudioTrack = this.audioTrack;
            this.audioTrack = jistiAudioTrack.track;
            if (this.audioTrack) {
                this.removeMicrophone();
            }

            if (this.audioTrack !== oldAudioTrack) {
                // set up and attach positional audio
                const audioStream = new MediaStream();
                audioStream.addTrack(this.audioTrack);

                const sceneEl = document.querySelector('a-scene');
                let listener = null;
                if (sceneEl.audioListener) {
                    listener = sceneEl.audioListener;
                } else {
                    listener = new THREE.AudioListener();
                    const camEl = ARENA.sceneObjects.myCamera.object3D;
                    camEl.add(listener);
                    sceneEl.audioListener = listener;
                }

                // create positional audio, but only if didn't exist before
                if (!this.audioSource) {
                    this.audioSource = new THREE.PositionalAudio(listener);
                    this.audioSource.setMediaStreamSource(audioStream);
                    el.object3D.add(this.audioSource);

                    // set positional audio scene params
                    if (ARENA.volume) {
                        this.audioSource.setVolume(ARENA.volume);
                    }
                    if (ARENA.refDist) { // L-R panning
                        this.audioSource.setRefDistance(ARENA.refDist);
                    }
                    if (ARENA.rolloffFact) {
                        this.audioSource.setRolloffFactor(ARENA.rolloffFact);
                    }
                    if (ARENA.distModel) {
                        this.audioSource.setDistanceModel(ARENA.distModel);
                    }
                } else {
                    this.audioSource.setMediaStreamSource(audioStream);
                }
                this.aec(listener);
            }
        } else {
            this.drawMicrophone();
            // pause WebRTC audio stream
            if (this.audioTrack) {
                this.audioTrack.enabled = false;
            }
        }
    },

    update: function(oldData) {
        const data = this.data;

        if (data.displayName !== oldData.displayName) {
            const name = data.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            this.headText.setAttribute('value', name);
        }

        if (ARENA.JitsiAPI.ready() && data.jitsiId) {
            this.updateVideo();
            this.updateAudio();
        }
    },

    tick: function() {
        const el = this.el;

        const camPos = ARENA.sceneObjects.myCamera.object3D.position;
        const entityPos = el.object3D.position;
        const distance = camPos.distanceTo(entityPos);

        if (this.videoTrack && this.videoID) {
            // frustrum culling for WebRTC streams
            const cam = ARENA.sceneObjects.myCamera.sceneEl.camera;
            const frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,
                cam.matrixWorldInverse));
            const inFieldOfView = frustum.containsPoint(entityPos);

            const videoElem = document.getElementById(this.videoID);
            // check if A/V cut off distance has been reached
            if (!inFieldOfView || distance > ARENA.maxAVDist) {
                // pause WebRTC video stream
                if (this.videoTrack) {
                    this.videoTrack.enabled = false;
                }
                if (videoElem && !videoElem.paused) videoElem.pause();
            } else {
                // unpause WebRTC video stream
                if (this.videoTrack) {
                    this.videoTrack.enabled = true;
                }
                if (videoElem && videoElem.paused) videoElem.play();
            }
        }

        if (this.audioTrack) {
            // check if A/V cut off distance has been reached
            if (distance > ARENA.maxAVDist) {
                // pause WebRTC audio stream
                if (this.audioTrack) {
                    this.audioTrack.enabled = false;
                }
            } else {
                // unpause WebRTC audio stream
                if (this.audioTrack) {
                    this.audioTrack.enabled = true;
                }
            }
        }
    },
});
