// utils.js
//
// useful misc utility functions

// usage:
//   importScript('./path/to/script.js').then((allExports) => { .... }));
function importScript(path) {
    let entry = window.importScript.__db[path];
    if (entry === undefined) {
        const escape = path.replace(`'`, `\\'`);
        const script = Object.assign(document.createElement('script'), {
            type: 'module',
            textContent: `import * as x from '${escape}'; importScript.__db['${escape}'].resolve(x);`,
        });
        entry = importScript.__db[path] = {};
        entry.promise = new Promise((resolve, reject) => {
            entry.resolve = resolve;
            script.onerror = reject;
        });
        document.head.appendChild(script);
        script.remove();
    }
    return entry.promise;
}
importScript.__db = {};
window['importScript'] = importScript; // needed if we ourselves are in a module

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

function getUrlVars() {
    const vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function getUrlParam(parameter, defaultValue) {
    let urlParameter = defaultValue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlParameter = getUrlVars()[parameter];
    }
    if (urlParameter === '') {
        return defaultValue;
    }
    return urlParameter;
}

function getQueryParams(name, defaultValue) {
    const qs = location.search;

    const params = [];
    let tokens;
    const re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        if (decodeURIComponent(tokens[1]) == name) {
            params.push(decodeURIComponent(tokens[2]));
        }
    }

    if (params === []) return defaultValue;
    else return params;
}

function getUrlParams(parameter, defaultValue) {
    const urlParameter = defaultValue;
    const indexes = [];
    parameter = parameter + '=';
    if (window.location.href.indexOf(parameter) > -1) {
        const vars = getUrlVars();
        for (let i = 0; i < vars.length; i++) {
            if (vars[parameter] == parameter) {
                indexes.push(vars[i]);
            }
        }
    } else {
        indexes.push(defaultValue);
    }

    return indexes;
}

function debug(msg) {
    publish(globals.outputTopic, '{"object_id":"debug","message":"' + msg + '"}');
}

function debugRaw(debugMsg) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', debugMsg);
    // console.log('debug: ', debugMsg);
}

function setCoordsData(evt) {
    return {
        x: parseFloat(evt.currentTarget.object3D.position.x).toFixed(3),
        y: parseFloat(evt.currentTarget.object3D.position.y).toFixed(3),
        z: parseFloat(evt.currentTarget.object3D.position.z).toFixed(3),
    };
}

function setClickData(evt) {
    if (evt.detail.intersection) {
        return {
            x: parseFloat(evt.detail.intersection.point.x.toFixed(3)),
            y: parseFloat(evt.detail.intersection.point.y.toFixed(3)),
            z: parseFloat(evt.detail.intersection.point.z.toFixed(3)),
        };
    } else {
        console.log('WARN: empty coords data');
        return {
            x: 0,
            y: 0,
            z: 0,
        };
    }
}

function vec3ToObject(vec) {
    return {
        x: parseFloat(vec.x.toFixed(3)),
        y: parseFloat(vec.y.toFixed(3)),
        z: parseFloat(vec.z.toFixed(3)),
    };
}

function quatToObject(q) {
    return {
        x: parseFloat(q.x.toFixed(3)),
        y: parseFloat(q.y.toFixed(3)),
        z: parseFloat(q.z.toFixed(3)),
        w: parseFloat(q.w.toFixed(3)),
    };
}

function coordsToText(c) {
    return `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`;
}

function rotToText(c) {
    return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)} ${c.w.toFixed(3)}`;
}

/**
 * Utility function to check incoming messages
 * @param {String} str string with message to check
 * @return {Bolean}
 */
function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(str);
        console.log(e.message);
        return false;
    }
    return true;
}
