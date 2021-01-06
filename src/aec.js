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
