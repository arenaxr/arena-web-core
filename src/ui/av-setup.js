import Swal from 'sweetalert2'; // Alerts

// Ref : https://github.com/samdutton/simpl/blob/gh-pages/getusermedia/sources/js/main.js
window.setupAV = (callback) => {
    const setupPanel = document.getElementById('avSetup');
    const videoElement = document.getElementById('vidPreview');
    const audioInSelect = document.getElementById('audioSourceSelect');
    const audioOutSelect = document.getElementById('audioOutSelect');
    const videoSelect = document.getElementById('vidSourceSelect');
    const testAudioOut = document.getElementById('testAudioOut');
    const testAudioOutBtn = document.getElementById('playTestAudioOutBtn');
    const testAudioOutIcon = document.getElementById('playTestAudioOutIcon');
    const micMeter = document.getElementById('micMeter');
    const displayName = document.getElementById('displayName-input');

    let mediaStreamSource = null;
    let meterProcess = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    audioInSelect.onchange = getStream;
    videoSelect.onchange = getStream;
    // This will fail on a lot of browsers :(
    audioOutSelect.onchange = () => {
        if (testAudioOut.setSinkId) {
            localStorage.setItem('prefAudioOutput', audioOutSelect.value);
            testAudioOut.setSinkId(audioOutSelect.value);
        }
    };

    /**
     * Alias
     * @return {Promise<MediaDeviceInfo[]>}
     */
    function getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    }

    /**
     * Populates select dropdowns with detected devuces
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
                audioInSelect.appendChild(option);
                break;
            case 'audiooutput':
                option.text = deviceInfo.label || `Speaker ${audioOutSelect.length + 1}`;
                audioOutSelect.appendChild(option);
                break;
            case 'videoinput':
                option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
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
     * @param {?event} _evt - Unused positional arg
     * @param {?string} prefAudioInput - preferred audio deviceId
     * @param {?string} prefVideoInput - preferred audio deviceId
     * @return {Promise<MediaStream | void>}
     */
    function getStream(_evt= undefined, {prefAudioInput, prefVideoInput} = {}) {
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
                    return getStream();
                }
                return handleMediaError(e);
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
     * @return {Promise<void>}
     */
    async function handleMediaError(error) {
        console.log('Error: ', error);
        await Swal.fire({
            title: 'Oops...',
            html: `Could not initialize devices.<br/>
                Please ensure your selected or previous preferred devices
                are plugged in and allow browser audio and video access
                permissions.<br/>
                You can attempt to re-detect devices.`,
            icon: 'error'});
    }

    const detectDevices = () => {
        const preferredDevices = {
            prefAudioInput: localStorage.getItem('prefAudioInput'),
            prefVideoInput: localStorage.getItem('prefVideoInput'),
        };
        getStream(undefined, preferredDevices).then(getDevices).then(gotDevices).catch(handleMediaError);
    };

    /**
     * Animation loop to draw detected microphone audio level
     */
    function micDrawLoop() {
        // set bar based on the current volume
        const vol = meterProcess.volume * 100 * 3;
        micMeter.setAttribute('style', `width: ${vol}%`);
        micMeter.setAttribute('aria-valuenow', '' + vol);
        // set up the next visual callback
        window.requestAnimationFrame( micDrawLoop );
    }

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
    document.getElementById('enterSceneAVBtn').addEventListener('click', () => {
        // Stash preferred devices
        localStorage.setItem('display_name', displayName.value);
        localStorage.setItem('prefAudioInput', audioInSelect.value);
        localStorage.setItem('prefVideoInput', videoSelect.value);
        localStorage.setItem('prefAudioOutput', audioOutSelect.value);
        // Stop audio and video preview
        if (videoElement.srcObject) {
            videoElement.srcObject.getAudioTracks()[0].stop();
            videoElement.srcObject.getVideoTracks()[0].stop();
        }
        // Hide AV panel
        setupPanel.classList.add('d-none');
        if (callback) callback();
    });
    document.getElementById('readonlyNamespace').value = ARENA.namespacedScene.split('/')[0];
    document.getElementById('readonlySceneName').value = ARENA.namespacedScene.split('/')[1];

    // Init
    setupPanel.classList.remove('d-none');
    if (localStorage.getItem('display_name')) {
        displayName.value = localStorage.getItem('display_name');
        displayName.focus();
    }
    detectDevices();
};
