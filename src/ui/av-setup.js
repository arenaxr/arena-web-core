/* global ARENA */

import Swal from 'sweetalert2';

// Ref : https://github.com/samdutton/simpl/blob/gh-pages/getusermedia/sources/js/main.js
window.setupAV = (callback) => {
    window.setupAVCallback = callback;
    const setupPanel = document.getElementById('avSetup');
    const videoElement = document.getElementById('vidPreview');
    const audioInSelect = document.getElementById('audioSourceSelect');
    const audioOutSelect = document.getElementById('audioOutSelect');
    const videoSelect = document.getElementById('vidSourceSelect');
    const testAudioOut = document.getElementById('testAudioOut');
    const testAudioOutBtn = document.getElementById('playTestAudioOutBtn');
    const testAudioOutIcon = document.getElementById('playTestAudioOutIcon');
    const micMeter = document.getElementById('micMeter');
    const headModelPathSelect = document.getElementById('headModelPathSelect');

    const reverseMouseDragCheckbox = document.getElementById('reverseMouseDragCheckbox');
    const displayName = document.getElementById('displayName-input');
    const enterSceneBtn = document.getElementById('enterSceneAVBtn');

    let mediaStreamSource = null;
    let meterProcess = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    // style video element
    videoElement.classList.add('flipVideo');
    videoElement.style.borderRadius = '10px';

    /**
     * Initialize listeners
     */
    function addListeners() {
        audioInSelect.onchange = getStream;
        videoSelect.onchange = getStream;
        // This will fail on a lot of browsers :(
        audioOutSelect.onchange = () => {
            if (testAudioOut.setSinkId) {
                localStorage.setItem('prefAudioOutput', audioOutSelect.value);
                testAudioOut.setSinkId(audioOutSelect.value);
            }
        };
        testAudioOutBtn.addEventListener('click', () => {
            if (testAudioOut.paused) {
                testAudioOutIcon.setAttribute('class', 'fas fa-volume-up');
                testAudioOut.play();
            } else {
                testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
                testAudioOut.pause();
                testAudioOut.currentTime = 0;
            }
        });
        testAudioOutBtn.addEventListener('ended', () => {
            testAudioOutIcon.setAttribute('class', 'fas fa-volume-off');
        });

        document.getElementById('redetectAVBtn').addEventListener('click', detectDevices);
        enterSceneBtn.addEventListener('click', () => {
            // Stash preferred devices
            localStorage.setItem('display_name', displayName.value);
            localStorage.setItem('prefAudioInput', audioInSelect.value);
            localStorage.setItem('prefVideoInput', videoSelect.value);
            localStorage.setItem('prefAudioOutput', audioOutSelect.value);

            // save preferred head model, globally, or per scene
            if (ARENA.sceneHeadModels) {
                const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
                sceneHist[ARENA.namespacedScene] = {
                    ...sceneHist[ARENA.namespacedScene],
                    headModelPathIdx: headModelPathSelect.selectedIndex,
                };
                localStorage.setItem('sceneHistory', JSON.stringify(sceneHist));
            } else {
                localStorage.setItem('headModelPathIdx', headModelPathSelect.selectedIndex);
            }

            // default is reverse of aframe's default - we want to "drag world to pan"
            const camera = document.getElementById('my-camera');
            camera.setAttribute('look-controls', 'reverseMouseDrag', !reverseMouseDragCheckbox.checked);

            // Stop audio and video preview
            if (videoElement.srcObject) {
                videoElement.srcObject.getAudioTracks()[0].stop();
                videoElement.srcObject.getVideoTracks()[0].stop();
            }
            // Hide AV panel
            setupPanel.classList.add('d-none');
            // Change button name
            enterSceneBtn.textContent = 'Return to Scene';
            if (window.setupAVCallback) window.setupAVCallback();
        });
        document.getElementById('readonlyNamespace').value = ARENA.namespacedScene.split('/')[0];
        document.getElementById('readonlySceneName').value = ARENA.namespacedScene.split('/')[1];
    }

    /**
     * Alias
     * @return {Promise<MediaDeviceInfo[]>}
     */
    function getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    }

    /**
     * Populates select dropdowns with detected devices
     * @param {MediaDeviceInfo[]} deviceInfos - List of enumerated devices
     */
    function gotDevices(deviceInfos) {
        // Faster than innerHTML. No options have listeners so this is ok
        audioInSelect.textContent = '';
        audioOutSelect.textContent = '';
        videoSelect.textContent = '';
        window.deviceInfos = deviceInfos; // make available to console
        for (const deviceInfo of deviceInfos) {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            switch (deviceInfo.kind) {
            case 'audioinput':
                option.text = deviceInfo.label || `Microphone ${audioInSelect.length + 1}`;
                option.text = deviceInfo.deviceId ? option.text : 'No Microphone Detected';
                audioInSelect.appendChild(option);
                break;
            case 'audiooutput':
                option.text = deviceInfo.label || `Speaker ${audioOutSelect.length + 1}`;
                option.text = deviceInfo.deviceId ? option.text : 'Default Speaker';
                audioOutSelect.appendChild(option);
                break;
            case 'videoinput':
                option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
                option.text = deviceInfo.deviceId ? option.text : 'No Camera Detected';
                videoSelect.appendChild(option);
                break;
            default:
                //
            }
        }
        const noElementOption = document.createElement('option');
        noElementOption.setAttribute('selected', 'selected');
        noElementOption.text = 'No Device Detected';
        if (!audioInSelect.childElementCount) {
            audioInSelect.appendChild(noElementOption.cloneNode(true));
        }
        if (!videoSelect.childElementCount) {
            videoSelect.appendChild(noElementOption.cloneNode(true));
        }
        if (window.stream) {
            const currentAudioIndex = [...audioInSelect.options].
                findIndex((option) => option.text ===
                    window.stream.getAudioTracks()[0].label);
            audioInSelect.selectedIndex = (currentAudioIndex === -1) ?
                0 :
                currentAudioIndex;

            const currentVideoIndex = [...videoSelect.options].
                findIndex((option) => option.text ===
                    window.stream.getVideoTracks()[0].label);
            videoSelect.selectedIndex = (currentVideoIndex === -1) ?
                0 :
                currentVideoIndex;
        } else {
            audioInSelect.selectedIndex = 0;
            videoSelect.selectedIndex = 0;
        }
        if (!audioOutSelect.childElementCount) {
            noElementOption.text = 'Default Device';
            audioOutSelect.appendChild(noElementOption.cloneNode(true));
        }
        audioOutSelect.selectedIndex = 0;
    }

    /**
     * gUM's specified audio/video devices and passes stream to gotStream.
     * @param {?event} _evt - Unused positional
     * @param {?object} preferredDevices - Preferred AV Devices
     * @param {?string} preferredDevices.prefAudioInput - preferred audio deviceId
     * @param {?string} preferredDevices.prefVideoInput - preferred audio deviceId
     * @param {?boolean} silent - Pass on silent warning bool to handleMediaError
     * @return {Promise<MediaStream | void>}
     */
    function getStream(_evt= undefined, {prefAudioInput, prefVideoInput} = {}, silent) {
        if (window.stream) {
            window.stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
        const audioSource = prefAudioInput || audioInSelect.value;
        const videoSource = prefVideoInput || videoSelect.value;
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined},
        };
        return navigator.mediaDevices.getUserMedia(constraints).
            then(gotStream).catch((e) => {
                // Prefer failed, don't popup alert, just fallback to detect-all
                if (prefAudioInput || prefAudioInput) {
                    return getStream(e, {}, silent);
                }
                return handleMediaError(e, silent);
            });
    }

    /**
     * Attempts to updates a/v dropdowns with devices from a stream.
     * Also initializes sound processing to display microphone volume meter
     * @param {MediaStream} stream - Stream created by gUM
     */
    function gotStream(stream) {
        window.stream = stream; // make stream available to console
        audioInSelect.selectedIndex = [...audioInSelect.options].
            findIndex((option) => option.text === stream.getAudioTracks()[0].label);
        videoSelect.selectedIndex = [...videoSelect.options].
            findIndex((option) => option.text === stream.getVideoTracks()[0].label);
        videoElement.srcObject = stream;

        // Mic Test Meter via https://github.com/cwilso/volume-meter/
        meterProcess && meterProcess.shutdown();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        meterProcess = createAudioMeter(audioContext);
        mediaStreamSource.connect(meterProcess);
        micDrawLoop();
    }

    /**
     * Error handler, typically when gUM fails from nonexistent audio and/or
     * video input device
     * @param {Error} error
     * @param {?Boolean} silent - Do not pop up error dialog
     * @return {Promise<void>}
     */
    async function handleMediaError(error, silent) {
        console.log('Error: ', error);
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
    }

    const detectDevices = (_evt, silent = false) => {
        const preferredDevices = {
            prefAudioInput: localStorage.getItem('prefAudioInput'),
            prefVideoInput: localStorage.getItem('prefVideoInput'),
        };
        getStream(undefined, preferredDevices, silent).
            then(getDevices).
            then(gotDevices).
            catch((e) => handleMediaError(e, silent));
    };

    /**
     * Animation loop to draw detected microphone audio level
     */
    function micDrawLoop() {
        // set bar based on the current volume
        const vol = meterProcess.volume * 100 * 3;
        micMeter.setAttribute('style', `width: ${vol}%`);
        micMeter.setAttribute('aria-valuenow', '' + vol);
        // set up the next visual callback if setupPanel is not hidden
        if (!setupPanel.classList.contains('d-none')) {
            window.requestAnimationFrame(micDrawLoop);
        } else {
            meterProcess.shutdown();
        }
    }

    // Add listeners if not yet attached
    if (!document.getElementById('audioSourceSelect').onchange) addListeners();

    // Init
    if (ARENA.Jitsi) {
        ARENA.Jitsi.prevVideoUnmuted = ARENA.Jitsi.hasVideo;
        ARENA.Jitsi.prevAudioUnmuted = ARENA.Jitsi.hasAudio;
        const sceneEl = document.querySelector('a-scene');
        const sideMenu = sceneEl.components['arena-side-menu'];
        if (ARENA.Jitsi?.hasVideo) {
            sideMenu.clickButton(sideMenu.buttons.VIDEO);
        }
        if (ARENA.Jitsi?.hasAudio) {
            sideMenu.clickButton(sideMenu.buttons.AUDIO);
        }
    }
    setupPanel.classList.remove('d-none');
    let headModelPathIdx = 0;
    if (ARENA.sceneHeadModels) {
        const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
        const sceneHeadModelPathIdx = sceneHist[ARENA.namespacedScene]?.headModelPathIdx;
        if (sceneHeadModelPathIdx != undefined) {
            headModelPathIdx = sceneHeadModelPathIdx;
        } else if (headModelPathSelect.selectedIndex == 0) {
            // if default ARENA head used, replace with default scene head
            headModelPathIdx = defaultHeadsLen;
        }
    } else if (localStorage.getItem('headModelPathIdx')) {
        headModelPathIdx = localStorage.getItem('headModelPathIdx');
    }
    headModelPathSelect.selectedIndex = headModelPathIdx < headModelPathSelect.length ? headModelPathIdx : 0;
    if (localStorage.getItem('display_name')) {
        displayName.value = localStorage.getItem('display_name');
        displayName.focus();
    }
    detectDevices(undefined, true);
};
