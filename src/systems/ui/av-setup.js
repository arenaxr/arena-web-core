/**
 * @fileoverview HTML audio/video setup modal
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 *
 * Ref : https://github.com/samdutton/simpl/blob/gh-pages/getusermedia/sources/js/main.js
 */

/* global mdb */

import createAudioMeter from './volume-meter';
import { ARENA_EVENTS } from '../../constants';

AFRAME.registerSystem('arena-av-setup', {
    schema: {
        htmlSrc: { type: 'string', default: 'static/html/avsetup.html' },
    },

    init() {
        ARENA.events.addEventListener(ARENA_EVENTS.USER_PARAMS_LOADED, this.ready.bind(this));
    },
    ready() {
        const { el } = this;

        const { sceneEl } = el;
        this.arena = sceneEl.systems['arena-scene'];
        this.jitsi = sceneEl.systems['arena-jitsi'];

        this.show = this.show.bind(this);
        this.getDevices = this.getDevices.bind(this);
        this.gotDevices = this.gotDevices.bind(this);
        this.getStream = this.getStream.bind(this);
        this.gotStream = this.gotStream.bind(this);
        this.micDrawLoop = this.micDrawLoop.bind(this);
        this.detectDevices = this.detectDevices.bind(this);

        try {
            this.loadHTML().then(() => {
                // Manually init MDB form elements with Material design
                document.querySelectorAll('.form-outline').forEach((formOutline) => {
                    new mdb.Input(formOutline).init();
                });

                this.addListeners();
                this.setupAVCallback = () => {}; // noop

                this.mediaStreamSource = null;
                this.meterProcess = null;
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                this.meterProcess = createAudioMeter(this.audioContext);

                window.setupAV = this.show; // legacy alias
                ARENA.events.emit(ARENA_EVENTS.SETUPAV_LOADED);
            });
        } catch (err) {
            console.error('Error loading AV setup HTML: ', err);
        }
    },

    async loadHTML() {
        const htmlRes = await fetch(this.data.htmlSrc);
        const html = await htmlRes.text();
        document.body.insertAdjacentHTML('afterbegin', html);

        this.setupPanel = document.getElementById('avSetup');
        this.videoElement = document.getElementById('vidPreview');
        this.audioInSelect = document.getElementById('audioSourceSelect');
        this.audioOutSelect = document.getElementById('audioOutSelect');
        this.videoSelect = document.getElementById('vidSourceSelect');
        this.testAudioOut = document.getElementById('testAudioOut');
        this.testAudioOutBtn = document.getElementById('playTestAudioOutBtn');
        this.testAudioOutIcon = document.getElementById('playTestAudioOutIcon');
        this.micMeter = document.getElementById('micMeter');
        this.presenceSelect = document.getElementById('presenceSelect');
        this.headModelPathSelect = document.getElementById('headModelPathSelect');

        this.reverseMouseDragCheckbox = document.getElementById('reverseMouseDragCheckbox');
        this.displayName = document.getElementById('displayName-input');
        this.enterSceneBtn = document.getElementById('enterSceneAVBtn');
        this.redetectAVBtn = document.getElementById('redetectAVBtn');

        // style video element
        if (this.presenceSelect.value !== 'Portal') {
            this.videoElement.classList.remove('flip-video-portal');
            this.videoElement.classList.add('flip-video');
        } else {
            this.videoElement.classList.remove('flip-video');
            this.videoElement.classList.add('flip-video-portal');
        }
        this.videoElement.style.borderRadius = '10px';

        if (ARENA.sceneHeadModels) {
            const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
            const sceneHeadModelPath = sceneHist[ARENA.namespacedScene]?.headModelPath;
            if (sceneHeadModelPath !== undefined) {
                this.headModelPathSelect.value = sceneHeadModelPath;
            } else if (this.headModelPathSelect.selectedIndex === 0) {
                // if default ARENA head used, replace with default scene head
                this.headModelPathSelect.value = ARENA.sceneHeadModels[0].url;
            }
        } else if (localStorage.getItem('prefHeadModelPath')) {
            this.headModelPathSelect.value = localStorage.getItem('prefHeadModelPath');
        }
    },

    show(callback) {
        if (callback) {
            this.setupAVCallback = callback;
        }

        this.jitsi.prevVideoUnmuted = this.jitsi.hasVideo;
        this.jitsi.prevAudioUnmuted = this.jitsi.hasAudio;
        const sideMenu = this.el.sceneEl.systems['arena-side-menu-ui'];
        if (this.jitsi.hasVideo) {
            sideMenu.clickButton(sideMenu.buttons.VIDEO);
        }
        if (this.jitsi.hasAudio) {
            sideMenu.clickButton(sideMenu.buttons.AUDIO);
        }

        this.setupPanel.classList.remove('d-none');
        if (localStorage.getItem('display_name')) {
            this.displayName.value = localStorage.getItem('display_name');
            // this.displayName.focus();
        }
        if (localStorage.getItem('prefPresence')) {
            this.presenceSelect.value = localStorage.getItem('prefPresence');
        }
        if (localStorage.getItem('prefReverseMouseDrag')) {
            this.reverseMouseDragCheckbox.checked = localStorage.getItem('prefReverseMouseDrag') === 'true';
        }
        this.detectDevices(undefined, true);
    },

    /**
     * Initialize listeners
     */
    addListeners() {
        this.audioInSelect.onchange = this.getStream;
        this.videoSelect.onchange = this.getStream;
        // This will fail on a lot of browsers :(
        this.audioOutSelect.onchange = () => {
            if (this.testAudioOut.setSinkId) {
                localStorage.setItem('prefAudioOutput', this.audioOutSelect.value);
                this.testAudioOut.setSinkId(this.audioOutSelect.value);
            }
        };
        this.testAudioOutBtn.addEventListener('click', () => {
            if (this.testAudioOut.paused) {
                this.testAudioOutIcon.setAttribute('class', 'fas fa-volume-up');
                this.testAudioOut.play();
            } else {
                this.testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
                this.testAudioOut.pause();
                this.testAudioOut.currentTime = 0;
            }
        });
        this.testAudioOutBtn.addEventListener('ended', () => {
            this.testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
        });

        this.redetectAVBtn.addEventListener('click', this.detectDevices);
        this.enterSceneBtn.addEventListener('click', () => {
            localStorage.setItem('display_name', this.displayName.value);
            localStorage.setItem('prefPresence', this.presenceSelect.value);
            // Stash preferred devices
            localStorage.setItem('prefAudioInput', this.audioInSelect.value);
            localStorage.setItem('prefVideoInput', this.videoSelect.value);
            localStorage.setItem('prefAudioOutput', this.audioOutSelect.value);

            // save preferred head model, globally, or per scene
            if (ARENA.sceneHeadModels) {
                const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
                sceneHist[ARENA.namespacedScene] = {
                    ...sceneHist[ARENA.namespacedScene],
                    headModelPath: this.headModelPathSelect.value,
                };
                localStorage.setItem('sceneHistory', JSON.stringify(sceneHist));
            } else {
                localStorage.setItem('prefHeadModelPath', this.headModelPathSelect.value);
            }

            // default is reverse of aframe's default - we want to "drag world to pan"
            const camera = document.getElementById('my-camera');
            camera.setAttribute('look-controls', 'reverseMouseDrag', !this.reverseMouseDragCheckbox.checked);
            localStorage.setItem('prefReverseMouseDrag', this.reverseMouseDragCheckbox.checked);

            // Stop audio and video preview
            if (this.videoElement.srcObject) {
                this.videoElement.srcObject.getAudioTracks()[0].stop();
                this.videoElement.srcObject.getVideoTracks()[0].stop();
            }
            // Hide AV panel
            this.setupPanel.classList.add('d-none');
            // Change button name
            this.enterSceneBtn.textContent = 'Return to Scene';
            this.setupAVCallback();

            this.el.sceneEl.emit(ARENA_EVENTS.NEW_SETTINGS, { userName: this.displayName.value });
        });
        const readonlyNamespace = document.getElementById('readonlyNamespace');
        const readonlySceneName = document.getElementById('readonlySceneName');
        [readonlyNamespace.value, readonlySceneName.value] = ARENA.namespacedScene.split('/');
    },

    // eslint-disable-next-line default-param-last,no-unused-vars
    getStream(_evt = undefined, { prefAudioInput, prefVideoInput } = {}, silent) {
        if (window.stream) {
            window.stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
        const audioSource = prefAudioInput || this.audioInSelect.value;
        const videoSource = prefVideoInput || this.videoSelect.value;
        const constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { deviceId: videoSource ? { exact: videoSource } : undefined },
        };
        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(this.gotStream)
            .catch((e) => {
                // Prefer failed, don't popup alert, just fallback to detect-all
                if (prefAudioInput || prefAudioInput) {
                    return this.getStream(e, {}, silent);
                }
                return this.handleMediaError(e, silent);
            });
    },

    /**
     * Alias
     * @return {Promise<MediaDeviceInfo[]>}
     */
    getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    },

    /**
     * Populates select dropdowns with detected devices
     * @param {MediaDeviceInfo[]} deviceInfos - List of enumerated devices
     */
    gotDevices(deviceInfos) {
        // Faster than innerHTML. No options have listeners so this is ok
        this.audioInSelect.textContent = '';
        this.audioOutSelect.textContent = '';
        this.videoSelect.textContent = '';
        window.deviceInfos = deviceInfos; // make available to console
        deviceInfos.forEach((deviceInfo) => {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            switch (deviceInfo.kind) {
                case 'audioinput':
                    option.text = deviceInfo.label || `Microphone ${this.audioInSelect.length + 1}`;
                    option.text = deviceInfo.deviceId ? option.text : 'No Microphone Detected';
                    this.audioInSelect.appendChild(option);
                    break;
                case 'audiooutput':
                    option.text = deviceInfo.label || `Speaker ${this.audioOutSelect.length + 1}`;
                    option.text = deviceInfo.deviceId ? option.text : 'Default Speaker';
                    this.audioOutSelect.appendChild(option);
                    break;
                case 'videoinput':
                    option.text = deviceInfo.label || `Camera ${this.videoSelect.length + 1}`;
                    option.text = deviceInfo.deviceId ? option.text : 'No Camera Detected';
                    this.videoSelect.appendChild(option);
                    break;
                default:
                //
            }
        });
        const noElementOption = document.createElement('option');
        noElementOption.setAttribute('selected', 'selected');
        noElementOption.text = 'No Device Detected';
        if (!this.audioInSelect.childElementCount) {
            this.audioInSelect.appendChild(noElementOption.cloneNode(true));
        }
        if (!this.videoSelect.childElementCount) {
            this.videoSelect.appendChild(noElementOption.cloneNode(true));
        }
        if (window.stream) {
            const currentAudioIndex = [...this.audioInSelect.options].findIndex(
                (option) => option.text === window.stream.getAudioTracks()[0].label
            );
            this.audioInSelect.selectedIndex = currentAudioIndex === -1 ? 0 : currentAudioIndex;

            const currentVideoIndex = [...this.videoSelect.options].findIndex(
                (option) => option.text === window.stream.getVideoTracks()[0].label
            );
            this.videoSelect.selectedIndex = currentVideoIndex === -1 ? 0 : currentVideoIndex;
        } else {
            this.audioInSelect.selectedIndex = 0;
            this.videoSelect.selectedIndex = 0;
        }
        if (!this.audioOutSelect.childElementCount) {
            noElementOption.text = 'Default Device';
            this.audioOutSelect.appendChild(noElementOption.cloneNode(true));
        }
        this.audioOutSelect.selectedIndex = 0;
    },

    /**
     * gUM's specified audio/video devices and passes stream to gotStream.
     * @param {?event} _evt - Unused positional
     * @param {?object} preferredDevices - Preferred AV Devices
     * @param {?string} preferredDevices.prefAudioInput - preferred audio deviceId
     * @param {?string} preferredDevices.prefVideoInput - preferred audio deviceId
     * @param {?boolean} silent - Pass on silent warning bool to handleMediaError
     * @return {Promise<MediaStream | void>}
     */

    /**
     * Attempts to updates a/v dropdowns with devices from a stream.
     * Also initializes sound processing to display microphone volume meter
     * @param {MediaStream} stream - Stream created by gUM
     */
    gotStream(stream) {
        window.stream = stream; // make stream available to console
        this.audioInSelect.selectedIndex = [...this.audioInSelect.options].findIndex(
            (option) => option.text === stream.getAudioTracks()[0].label
        );
        this.videoSelect.selectedIndex = [...this.videoSelect.options].findIndex(
            (option) => option.text === stream.getVideoTracks()[0].label
        );
        this.videoElement.srcObject = stream;

        // Mic Test Meter via https://github.com/cwilso/volume-meter/
        this.meterProcess?.shutdown();
        this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
        this.mediaStreamSource.connect(this.meterProcess);
        this.micDrawLoop();
    },

    /**
     * Error handler, typically when gUM fails from nonexistent audio and/or
     * video input device
     * @param {Error} error
     * @param {?Boolean} silent - Do not pop up error dialog
     * @return {Promise<void>}
     */
    async handleMediaError(error, silent) {
        console.error('Error: ', error);
        if (!silent) {
            await Swal.fire({
                title: 'Oops...',
                html: `Could not initialize devices.<br/>
                Please ensure your selected or previous preferred devices
                are plugged in and allow browser audio and video access
                permissions.<br/>
                You can attempt to re-detect devices.`,
                icon: 'error',
            });
        }
    },

    detectDevices(_evt, silent = false) {
        const preferredDevices = {
            prefAudioInput: localStorage.getItem('prefAudioInput'),
            prefVideoInput: localStorage.getItem('prefVideoInput'),
        };
        this.getStream(undefined, preferredDevices, silent)
            .then(this.getDevices)
            .then(this.gotDevices)
            .catch((e) => this.handleMediaError(e, silent));
    },

    /**
     * Animation loop to draw detected microphone audio level
     */
    micDrawLoop() {
        // set bar based on the current volume
        const vol = this.meterProcess.volume * 100 * 3;
        this.micMeter.setAttribute('style', `width: ${vol}%`);
        this.micMeter.setAttribute('aria-valuenow', `${vol}`);
        // set up the next visual callback if setupPanel is not hidden
        if (!this.setupPanel.classList.contains('d-none')) {
            window.requestAnimationFrame(this.micDrawLoop);
        } else {
            this.meterProcess.shutdown();
        }
    },
});
