/**
 * @fileoverview Another user's camera in the ARENA. Handles Jitsi and display name updates.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { ARENA_EVENTS } from '../../constants';

/**
 * Workaround for AEC when using Web Audio API (https://bugs.chromium.org/p/chromium/issues/detail?id=687574)
 * https://github.com/mozilla/hubs/blob/master/src/systems/audio-system.js
 * @param {Object} gainNode
 * @param {boolean} spatialAudioOn
 * @private
 */
async function enableChromeAEC(gainNode, spatialAudioOn) {
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
        [audioEl.srcObject] = e.streams;
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
        if (spatialAudioOn) {
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
 * @module arena-user
 * @property {color} [color=white] - The color for the user's name text.
 * @property {string} [headModelPath=/static/models/avatars/robobit.glb] - Path to user head model
 * @property {string} [presence] - type of presence for user
 * @property {string} [jitsiId] - User jitsi id.
 * @property {string} [displayName] - User display name.
 * @property {boolean} [hasAudio=false] - Whether the user has audio on.
 * @property {boolean} [hasVideo=false] - Whether the user has video on.
 * @property {boolean} [hasAvatar=false] - Whether the user has face tracking on.
 *
 */
AFRAME.registerComponent('arena-user', {
    schema: {
        color: { type: 'color', default: 'white' },
        headModelPath: { type: 'string', default: ARENA.defaults.headModelPath },
        presence: { type: 'string', default: 'Standard' },
        jitsiId: { type: 'string', default: '' },
        displayName: { type: 'string', default: '' },
        hasAudio: { type: 'boolean', default: false },
        hasVideo: { type: 'boolean', default: false },
        hasAvatar: { type: 'boolean', default: false },
        jitsiQuality: { type: 'number', default: 100.0 },
        resolution: { type: 'number', default: 180 },
        pano: { type: 'boolean', default: false },
        panoId: { type: 'string', default: '' },
    },

    init() {
        this.jitsiReady = false;
        const { data, el } = this;

        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];
        this.jitsi = sceneEl.systems['arena-jitsi'];
        this.chat = sceneEl.systems['arena-chat-ui'];

        this.idTag = el.id.replace('camera_', '');
        el.setAttribute('rotation.order', 'YXZ');

        const name = el.id;

        el.setAttribute('blip', { blipin: false, geometry: 'disk', applyDescendants: true });

        const decodeName = decodeURI(name.split('_')[2]);
        const personName = decodeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        this.headText = document.createElement('a-text');
        this.headText.setAttribute('id', `head-text-${name}`);
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
        this.headModel.setAttribute('blip', { geometry: 'disk', blipout: false });
        this.headModel.setAttribute('id', `head-model-${name}`);
        this.headModel.setAttribute('rotation', '0 180 0');
        this.headModel.setAttribute('scale', '1 1 1');
        this.headModel.setAttribute('gltf-model', data.headModelPath);
        this.headModel.setAttribute('attribution', 'extractAssetExtras', true);
        this.headModel.setAttribute('physx-body', 'type', 'kinematic');

        el.appendChild(this.headText);
        el.appendChild(this.headModel);
        this.drawMicrophone();

        this.videoID = null;
        this.audioID = null;
        this.distReached = null;

        // used in tick()
        this.entityPos = this.el.object3D.position;
        this.panoEl = null;
        this.panoRadius = 0;
        this.distance = 0;

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);

        ARENA.events.addEventListener(ARENA_EVENTS.JITSI_LOADED, () => {
            this.jitsiReady = true;
        });
    },

    aec(listener) {
        // sorta fixes chrome echo bug
        const audioCtx = THREE.AudioContext.getContext();
        const resume = () => {
            audioCtx.resume();
            if (audioCtx.state === 'running') {
                if (!ARENA.utils.isMobile() && /chrome/i.test(navigator.userAgent)) {
                    // We now always try to enable w/ spatial audio, tbd if we need to undo this
                    enableChromeAEC(listener.gain, true);
                }
            }
        };
        document.body.addEventListener('touchmove', resume, { once: true });
        document.body.addEventListener('mousemove', resume, { once: true });
    },

    drawMicrophone() {
        const { el } = this;
        const { data } = this;

        const name = `muted_${el.id}`;
        let micIconEl = document.querySelector(`#${name}`);
        if (!micIconEl) {
            micIconEl = document.createElement('a-image');
            micIconEl.setAttribute('id', name);
            el.appendChild(micIconEl);
        }
        micIconEl.setAttribute('material', 'alphaTest', '0.001'); // fix alpha against transparent
        micIconEl.setAttribute('material', 'shader', 'flat');
        micIconEl.setAttribute('scale', '0.2 0.2 0.2');
        if (data.presence !== 'Portal') {
            micIconEl.setAttribute('position', '0 0.3 0.045');
        } else {
            micIconEl.setAttribute('position', '-0.75 1.25 -0.035');
        }
        micIconEl.setAttribute('src', 'url(src/systems/ui/images/audio-off.png)');
        this.micIconEl = micIconEl;
    },

    removeMicrophone() {
        const { el } = this;

        if (el.contains(this.micIconEl)) {
            el.removeChild(this.micIconEl);
        }
        this.micIconEl = null;
    },

    drawQuality() {
        const { el } = this;
        const { data } = this;

        const name = `quality_${el.id}`;
        let qualIconEl = document.querySelector(`#${name}`);
        if (!qualIconEl) {
            qualIconEl = document.createElement('a-image');
            qualIconEl.setAttribute('id', name);
            el.appendChild(qualIconEl);
        }
        qualIconEl.setAttribute('material', 'shader', 'flat');
        qualIconEl.setAttribute('material', 'alphaTest', '0.001'); // fix alpha against transparent
        qualIconEl.setAttribute('scale', '0.15 0.15 0.15');
        if (data.presence !== 'Portal') {
            qualIconEl.setAttribute('position', `${0 - 0.2} 0.3 0.045`);
        } else {
            qualIconEl.setAttribute('position', `${-0.75 - 0.2}-0.75 1.25 -0.035`);
        }
        qualIconEl.setAttribute('src', this.getQualityIcon(data.jitsiQuality)); // update signal
        this.qualIconEl = qualIconEl;
    },

    removeQuality() {
        const { el } = this;

        if (el.contains(this.qualIconEl)) {
            el.removeChild(this.qualIconEl);
        }
        this.qualIconEl = null;
    },

    getQualityIcon(quality) {
        if (quality > 66.7) {
            return 'url(src/systems/ui/images/signal-good.png)';
        }
        if (quality > 33.3) {
            return 'url(src/systems/ui/images/signal-poor.png)';
        }
        if (quality > 0) {
            return 'url(src/systems/ui/images/signal-weak.png)';
        }
        return 'url(src/systems/ui/images/signal-bad.png)';
    },

    drawVideoCube() {
        const { el } = this;
        const { data } = this;

        // attach video to head
        const videoCube = document.createElement('a-box');
        videoCube.setAttribute('id', `video-cube-${this.videoID}`);
        videoCube.setAttribute('position', '0 0 0');
        videoCube.setAttribute('material', 'shader', 'flat');
        videoCube.setAttribute('src', `#${this.videoID}`); // video only! (no audio)
        videoCube.setAttribute('material-extras', 'colorSpace', 'SRGBColorSpace');

        if (data.presence !== 'Portal') {
            videoCube.setAttribute('position', '0 0 0');
            videoCube.setAttribute('scale', '0.6 0.4 0.6');

            const videoCubeDark = document.createElement('a-box');
            videoCubeDark.setAttribute('id', `video-cube-dark-${this.videoID}`);
            videoCubeDark.setAttribute('position', '0 0 0.01');
            videoCubeDark.setAttribute('scale', '0.61 0.41 0.6');
            videoCubeDark.setAttribute('material', 'shader', 'flat');
            videoCubeDark.setAttribute('transparent', 'true');
            videoCubeDark.setAttribute('color', 'black');
            videoCubeDark.setAttribute('opacity', '0.8');

            el.appendChild(videoCubeDark);
            this.videoCubeDark = videoCubeDark;
        } else {
            videoCube.setAttribute('scale', '1.5 0.9 0.02');
            videoCube.setAttribute('rotation', '0 0 -90');
        }

        el.appendChild(videoCube);
        this.videoCube = videoCube;

        this.headModel.setAttribute('visible', false);
    },

    removeVideoCube() {
        const { el } = this;

        // remove video cubes
        if (el.contains(this.videoCube)) {
            el.removeChild(this.videoCube);
        }

        if (el.contains(this.videoCubeDark)) {
            el.removeChild(this.videoCubeDark);
        }
        this.videoCube = null;
        this.videoCubeDark = null;

        this.headModel.setAttribute('visible', true);
    },

    updateVideo() {
        const { data } = this;
        if (!data) return;

        /* Handle Jitsi Video */
        this.videoID = `video${data.jitsiId}`;
        if (data.hasVideo) {
            if (!this.jitsi.getVideoTrack(data.jitsiId)) {
                return;
            }

            const jistiVideo = document.getElementById(this.videoID);
            if (jistiVideo) {
                if (!this.videoCube) {
                    this.drawVideoCube();
                }
            }
        } else if (this.videoCube) {
            this.removeVideoCube();
        }
    },

    createAudio() {
        const { el } = this;
        el.setAttribute('sound', `src: #${this.audioID}`);

        this.aec(el.sceneEl.audioListener);

        // TODO: handle audio scene options
        el.setAttribute('sound', 'positional', true);
        if (ARENA.refDistance) {
            el.setAttribute('sound', 'refDistance', ARENA.refDistance);
        }
        if (ARENA.rolloffFactor) {
            el.setAttribute('sound', 'rolloffFactor', ARENA.rolloffFactor);
        }
        if (ARENA.distanceModel) {
            el.setAttribute('sound', 'distanceModel', ARENA.distanceModel);
        }
        if (ARENA.volume) {
            el.setAttribute('sound', 'volume', ARENA.volume);
        }
    },

    updateAudio() {
        const { data } = this;
        if (!data) return;
        const { el } = this;

        /* Handle Jitsi Audio */
        this.audioID = `audio${data.jitsiId}`;
        if (data.hasAudio) {
            // set up positional audio, but only once per camera
            if (!this.jitsi.getAudioTrack(data.jitsiId)) {
                return;
            }

            const jitsiAudio = document.getElementById(this.audioID);
            if (jitsiAudio) {
                const { sound } = el.components;
                if (!this.distReached && !sound) {
                    this.createAudio();
                }
                this.removeMicrophone();
            }
        } else {
            this.drawMicrophone();
        }
    },

    /* eslint-disable  no-param-reassign */
    muteAudio() {
        const { el } = this;
        const jistiAudio = document.getElementById(this.audioID);
        if (jistiAudio) {
            jistiAudio.srcObject?.getTracks().forEach((t) => {
                t.enabled = false;
            });
        }
        el.removeAttribute('sound');
    },

    unmuteAudio() {
        const jistiAudio = document.getElementById(this.audioID);
        if (jistiAudio) {
            jistiAudio.srcObject?.getTracks().forEach((t) => {
                t.enabled = true;
            });
        }
    },

    muteVideo() {
        const jistiVideo = document.getElementById(this.videoID);
        if (jistiVideo) {
            if (!jistiVideo.paused) jistiVideo.pause();
            jistiVideo.srcObject?.getTracks().forEach((t) => {
                t.enabled = false;
            });
        }
    },

    unmuteVideo() {
        const jistiVideo = document.getElementById(this.videoID);
        if (jistiVideo) {
            if (jistiVideo.paused) jistiVideo.play();
            jistiVideo.srcObject?.getTracks().forEach((t) => {
                t.enabled = true;
            });
        }
    },
    /* eslint-disable  no-param-reassign */

    evaluateRemoteResolution(resolution) {
        if (resolution !== this.data.resolution) {
            this.data.resolution = resolution;
            const panoIds = [];
            const constraints = {};
            const users = document.querySelectorAll('[arena-user]');
            users.forEach((user) => {
                const { data } = user.components['arena-user'];
                const jitsiSourceName = `${data.jitsiId}-v0`;
                if (data.pano) {
                    if (this.distance < this.panoRadius) {
                        // inside videosphere, allow 'on-stage' resolution
                        panoIds.push(jitsiSourceName);
                    }
                }
                constraints[jitsiSourceName] = {
                    maxHeight: data.resolution,
                };
            });
            this.jitsi.setResolutionRemotes(panoIds, constraints);
        }
    },

    getActualResolution(distance, winHeight) {
        // Option 1: video cube W x H x D is 0.6m x 0.4m x 0.6m
        // Option 2: portal W x H x D is 0.9m x 1.5m x 0.02m
        const fov = 80;
        const videoHeightMeters = this.data.presence !== 'Portal' ? 0.4 : 0.9;
        const videoDepthMeters = this.data.presence !== 'Portal' ? 0.6 : 0.02;
        const actualDist = distance - (this.data.pano ? 0 : videoDepthMeters / 2);
        const frustumHeightAtVideo = 2 * actualDist * Math.tan((fov * 0.5 * Math.PI) / 180);
        const videoRatio2Window = videoHeightMeters / frustumHeightAtVideo;
        const actualCubeRes = winHeight * videoRatio2Window;
        // return actual height, since video constraints will use it
        return actualCubeRes;
    },

    update(oldData) {
        const { data } = this;

        if (data.color !== oldData.color) {
            this.headText.setAttribute('color', data.color);
        }

        if (data.headModelPath !== oldData.headModelPath) {
            this.headModel.setAttribute('gltf-model', data.headModelPath); // TODO: maybe check this exists?
        }

        if (data.displayName !== oldData.displayName) {
            const name = data.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            this.headText.setAttribute('value', name);
        }

        if (data.presence !== oldData.presence) {
            switch (data.presence) {
                case 'Standard':
                    this.headText.setAttribute('visible', true);
                    this.headModel.setAttribute('visible', true);
                    this.headText.setAttribute('position', `0 ${0.4 + 0.05} ${0.1 / 2}`);
                    // redraw mic
                    this.removeMicrophone();
                    this.drawMicrophone();
                    break;
                case 'Portal':
                    this.headText.setAttribute('position', `0 ${0.9 + 0.05} ${0.02 / 2}`);
                    // redraw mic
                    this.removeMicrophone();
                    this.drawMicrophone();
                    break;
                default:
                    break;
            }
        }

        if (data.jitsiQuality !== oldData.jitsiQuality && this.data.jitsiId) {
            if (data.jitsiQuality < 66.7) {
                this.drawQuality();
            } else {
                this.removeQuality();
            }
        }
    },

    remove() {
        // camera special case, look for hands to delete
        const elHandL = document.getElementById(`handLeft_${this.idTag}`);
        if (elHandL) elHandL.remove();
        const elHandR = document.getElementById(`handRight_${this.idTag}`);
        if (elHandR) elHandR.remove();
        // try to remove chat user
        delete this.chat?.liveUsers[this.idTag];
        this.chat?.populateUserList();
    },

    tick() {
        if (!this.jitsiReady) return;
        const { data } = this;

        // do periodic a/v updates
        if (data.jitsiId) {
            this.updateVideo();
            this.updateAudio();
        }

        const myCam = document.getElementById('my-camera');
        const myCamPos = myCam.object3D.position;
        const arenaCameraComponent = myCam.components['arena-camera'];

        // use videosphere distance/size when mapped from jitsi-video
        if (data.panoEl == null && data.panoId !== '') {
            this.panoEl = document.querySelector(`#${data.panoId}`);
            this.panoRadius = this.panoEl.getAttribute('geometry').radius;
        }
        // distance calc
        if (this.panoEl != null) {
            const panoPos = this.panoEl.object3D.position;
            this.distance = myCamPos.distanceTo(panoPos);
        } else {
            this.distance = myCamPos.distanceTo(this.entityPos);
        }

        // frustum culling for WebRTC video streams;
        if (this.videoID && this.videoCube && ARENA.jitsi?.conference) {
            let inFieldOfView = true;
            if (arenaCameraComponent && arenaCameraComponent.isVideoFrustumCullingEnabled()) {
                if (this.el.contains(this.videoCube)) {
                    inFieldOfView = arenaCameraComponent.viewIntersectsObject3D(this.videoCube.object3D);
                }
            }
            if (data.pano) {
                this.evaluateRemoteResolution(1920);
            } else if (inFieldOfView === false) {
                this.muteVideo();
                this.evaluateRemoteResolution(0);
            } else if (arenaCameraComponent && arenaCameraComponent.isVideoDistanceConstraintsEnabled()) {
                // check if A/V cut off distance has been reached
                if (this.distance > ARENA.maxAVDist) {
                    this.muteVideo();
                    this.evaluateRemoteResolution(0);
                } else {
                    this.unmuteVideo();
                    const resolution = this.getActualResolution(this.distance, window.innerHeight);
                    this.evaluateRemoteResolution(resolution);
                }
            } else {
                this.unmuteVideo();
                this.evaluateRemoteResolution(ARENA.videoDefaultResolutionConstraint); // default
            }
        }

        if (this.audioID) {
            // check if A/V cut off distance has been reached
            if (this.distance > ARENA.maxAVDist) {
                this.muteAudio();
                this.distReached = true;
            } else {
                this.unmuteAudio();
                this.distReached = false;
            }
        }
    },
});
