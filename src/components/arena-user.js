/* global AFRAME, ARENA, THREE */

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
        this.headModel.setAttribute('gltf-model', 'url(/models/Head.gltf)'); // actually a face mesh

        el.appendChild(this.headText);
        el.appendChild(this.headModel);
        this.drawMicrophone();

        this.videoTrack = null;
        this.videoID = null;
        this.audioTrack = null;
        this.audioID = null;
        this.maxDistReached = false;

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
            micIconEl.setAttribute('src', 'url(/src/icons/images/audio-off.png)');
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
        videoCube.setAttribute('src', `#${this.videoID}`); // video only! (no audio)
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
    },

    updateVideo() {
        const data = this.data;
        if (!data) return;

        /* Handle Jitsi Video */
        this.videoID = `video${data.jitsiId}`;
        if (data.hasVideo) {
            this.videoTrack = ARENA.Jitsi.getVideoTrack(data.jitsiId);
            const jistiVideo = document.getElementById(this.videoID);
            if (jistiVideo) {
                const vidCube = document.getElementById(this.videoID + 'cube');
                if (!vidCube) {
                    this.drawVideoCube();
                }
            }
        } else {
            this.removeVideoCube();
        }
    },

    createAudio() {
        const el = this.el;
        // add sound component, but only once
        const sound = el.components.sound;
        if (!sound) {
            el.setAttribute('sound', `src: #${this.audioID}`);

            if (ARENA.volume) {
                el.setAttribute('sound', `volume: ${ARENA.volume}`);
            }
            if (ARENA.refDistance) {
                el.setAttribute('sound', `refDistance: ${ARENA.refDistance}`);
            }
            if (ARENA.rolloffFactor) {
                el.setAttribute('sound', `rolloffFactor: ${ARENA.rolloffFactor}`);
            }
            if (ARENA.distanceModel) {
                el.setAttribute('sound', `distanceModel: ${ARENA.distanceModel}`);
            }
        }
    },

    updateAudio() {
        const data = this.data;
        if (!data) return;

        /* Handle Jitsi Audio */
        this.audioID = `audio${data.jitsiId}`;
        if (data.hasAudio) {
            // set up positional audio, but only once per camera
            this.audioTrack = ARENA.Jitsi.getAudioTrack(data.jitsiId);
            if (!this.audioTrack) return;

            const jitsiAudio = document.getElementById(this.audioID);
            if (jitsiAudio) {
                this.createAudio();
                this.removeMicrophone();
            }
        } else {
            this.drawMicrophone();
        }
    },

    update: function(oldData) {
        const data = this.data;

        if (data.displayName !== oldData.displayName) {
            const name = data.displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            this.headText.setAttribute('value', name);
        }
    },

    tick: function() {
        const data = this.data;
        const el = this.el;

        // do period a/v updates
        if (ARENA.Jitsi && ARENA.Jitsi.ready && data.jitsiId) {
            this.updateVideo();
            this.updateAudio();
        }

        const camPos = document.getElementById('my-camera').object3D.position;
        const entityPos = el.object3D.position;
        const distance = camPos.distanceTo(entityPos);

        if (this.videoTrack && this.videoID) {
            // frustrum culling for WebRTC streams
            const cam = document.getElementById('my-camera').sceneEl.camera;
            const frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(
                new THREE.Matrix4().multiplyMatrices(
                    cam.projectionMatrix, cam.matrixWorldInverse));
            const inFieldOfView = frustum.containsPoint(entityPos);

            const jistiVideo = document.getElementById(this.videoID);
            // check if A/V cut off distance has been reached
            if (!inFieldOfView || distance > ARENA.maxAVDist) {
                // pause WebRTC video stream
                this.videoTrack.enabled = false;
                if (jistiVideo && !jistiVideo.paused) jistiVideo.pause();
            } else {
                // unpause WebRTC video stream
                this.videoTrack.enabled = true;
                if (jistiVideo && jistiVideo.paused) jistiVideo.play();
            }
        }

        if (this.audioTrack && this.audioID) {
            // check if A/V cut off distance has been reached
            if (distance > ARENA.maxAVDist) {
                // pause WebRTC audio stream
                this.audioTrack.enabled = false;
            } else {
                // unpause WebRTC audio stream
                this.audioTrack.enabled = true;
            }
        }
    },
});
