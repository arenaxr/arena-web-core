import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

let frames = 0;
let frameSkip = null;
let width = null;
let trackFace = false, debugFace = false, vidOff = false, overlayOff = false, bboxOn = false, flipped = false;
let prevJSON = null;
let vidStream = null;
let loading = null;
let ready = false;

function mobileOrTablet() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

window.trackFaceOn = function() {
    if (!window.faceDetector || !window.faceDetector.ready) return;
    trackFace = true;

    setupVideo(!vidOff, !overlayOff, () => {
        if (!overlayOff && !ready) {
            writeOverlayText("Downloading Face Model: 72MB");
        }
        requestAnimationFrame(processVideo);
    });
}

window.trackFaceOff = function() {
    if (!window.faceDetector || !window.faceDetector.ready) return;
    trackFace = false;

    if (window.overlayCanv && !overlayOff) {
        document.body.removeChild(window.overlayCanv);
        window.overlayCanv = null;
    }

    if (window.videoCanv && !vidOff) {
        document.body.removeChild(window.videoCanv);
        window.videoCanv = null;
    }

    const tracks = vidStream.getTracks();
    tracks.forEach(function(track) {
       track.stop();
    });
    window.videoElem.srcObject = null;
    window.videoElem = undefined;
}

function writeOverlayText(text) {
    if (window.overlayCanv && !overlayOff) {
        const overlayCtx = window.overlayCanv.getContext("2d");
        overlayCtx.clearRect(
            0, 0,
            window.width,
            window.height
        );
        overlayCtx.font = "17px Arial";
        overlayCtx.textAlign = "center";
        overlayCtx.fillStyle = "#ef2d5e";
        overlayCtx.fillText(text, window.overlayCanv.width/2, window.overlayCanv.height/8);
    }
}

function setVideoStyle(elem) {
    elem.style.position = "absolute";
    elem.style.top = "10px";
    elem.style.left = "10px";
    elem.style.borderRadius = "10px";
}

function setupVideo(displayCanv, displayOverlay, setupCallback) {
    window.videoElem = document.createElement("video");
    window.videoElem.setAttribute("autoplay", "");
    window.videoElem.setAttribute("muted", "");
    window.videoElem.setAttribute("playsinline", "");

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    })
    .then(stream => {
        vidStream = stream;
        const videoSettings = stream.getVideoTracks()[0].getSettings();
        window.videoElem.srcObject = stream;
        window.videoElem.play();
    })
    .catch(function(err) {
        console.log("ERROR: " + err);
    });

    window.videoCanv = document.createElement("canvas");
    setVideoStyle(window.videoCanv);
    window.videoCanv.style.zIndex = 9998;
    window.videoCanv.style.opacity = 0.25;
    if (displayCanv) {
        document.body.appendChild(window.videoCanv);
    }

    if (displayOverlay) {
        window.overlayCanv = document.createElement("canvas");
        setVideoStyle(window.overlayCanv);
        window.overlayCanv.style.zIndex = 9999;
        document.body.appendChild(window.overlayCanv);
    }

    window.videoElem.addEventListener("canplay", function(e) {
        window.width = width;
        window.height = window.videoElem.videoHeight / (window.videoElem.videoWidth / window.width);

        window.videoElem.setAttribute("width", window.width);
        window.videoElem.setAttribute("height", window.height);

        window.videoCanv.width = window.width;
        window.videoCanv.height = window.height;
        if (flipped) {
            window.videoCanv.getContext('2d').translate(window.width, 0);
            window.videoCanv.getContext('2d').scale(-1, 1);
        }

        if (displayOverlay) {
            window.overlayCanv.width = window.width;
            window.overlayCanv.height = window.height;
        }

        if (setupCallback != null) {
            setupCallback();
        }
    }, false);
}

function getFrame() {
    const videoCanvCtx = window.videoCanv.getContext("2d");
    videoCanvCtx.drawImage(
        window.videoElem,
        0, 0,
        window.width,
        window.height
    );
    return videoCanvCtx.getImageData(0, 0, window.width, window.height).data;
}

function hasFace(landmarks) {
    if (!landmarks || landmarks.length == 0) return false;

    let zeros = 0;
    for (let i = 0; i < landmarks.length; i++) {
        if (i % 2 == 0 && landmarks[i] > window.width) return false;
        if (i % 2 == 1 && landmarks[i] > window.height) return false;
        if (landmarks[i] == 0) {
            zeros++;
        }
    }
    // if many are 0's then there is no face
    return zeros <= landmarks.length / 3;
}

function drawBbox(bbox) {
    const overlayCtx = window.overlayCanv.getContext("2d");

    overlayCtx.beginPath();
    overlayCtx.strokeStyle = "red";
    overlayCtx.lineWidth = 1.5;

    // [x1,y1,x2,y2]
    overlayCtx.moveTo(bbox[0], bbox[1]);
    overlayCtx.lineTo(bbox[0], bbox[3]);
    overlayCtx.lineTo(bbox[2], bbox[3]);
    overlayCtx.lineTo(bbox[2], bbox[1]);
    overlayCtx.lineTo(bbox[0], bbox[1]);

    overlayCtx.stroke();
}

function drawPolyline(landmarks, start, end, closed) {
    const overlayCtx = window.overlayCanv.getContext("2d");

    overlayCtx.beginPath();
    overlayCtx.strokeStyle = "#ef2d5e";
    overlayCtx.lineWidth = 1.5;

    overlayCtx.moveTo(landmarks[start][0], landmarks[start][1]);
    for (let i = start + 1; i <= end; i++) {
        overlayCtx.lineTo(landmarks[i][0], landmarks[i][1]);
    }
    if (closed) {
        overlayCtx.lineTo(landmarks[start][0], landmarks[start][1]);
    }

    overlayCtx.stroke();
}

function drawOverlay(landmarksRaw, bbox) {
    if (!window.overlayCanv) return;
    if (!landmarksRaw || landmarksRaw.length == 0) return;
    if (loading) clearInterval(loading);

    const overlayCtx = window.overlayCanv.getContext("2d");

    let landmarks = [];
    let face = hasFace(landmarksRaw);
    for (let i = 0; i < landmarksRaw.length; i += 2) {
        if (face) {
            const l = [landmarksRaw[i], landmarksRaw[i+1]];
            landmarks.push(l);
        }
        else {
            landmarks.push([0,0]);
        }
    }

    if (!vidOff) {
        overlayCtx.clearRect(
            0, 0,
            window.width,
            window.height
        );
    }
    else {
        overlayCtx.fillRect(
            0, 0,
            window.width,
            window.height
        );
    }

    if (bboxOn) {
        drawBbox(bbox);
    }

    drawPolyline(landmarks, 0,  16, false);   // Jaw line
    drawPolyline(landmarks, 17, 21, false);   // Left eyebrow
    drawPolyline(landmarks, 22, 26, false);   // Right eyebrow
    drawPolyline(landmarks, 27, 30, false);   // Nose bridge
    drawPolyline(landmarks, 30, 35, true);    // Lower nose
    drawPolyline(landmarks, 36, 41, true);    // Left eye
    drawPolyline(landmarks, 42, 47, true);    // Right Eye
    drawPolyline(landmarks, 48, 59, true);    // Outer lip
    drawPolyline(landmarks, 60, 67, true);    // Inner lip
}

function round3(num) {
    return parseFloat(num.toFixed(3));
}

function createFaceJSON(landmarksRaw, bbox, quat, trans, width, height) {
    let faceJSON = {};
    faceJSON["object_id"] = "face_" + globals.idTag;

    faceJSON["hasFace"] = hasFace(landmarksRaw);

    faceJSON["image"] = {};
    faceJSON["image"]["flipped"] = flipped;
    faceJSON["image"]["width"] = width;
    faceJSON["image"]["height"] = height;

    faceJSON["pose"] = {};
    let quatAdjusted = []
    for (let i = 0; i < 4; i++) {
        const adjustedQuat = faceJSON["hasFace"] ? round3(quat[i]) : 0;
        quatAdjusted.push(adjustedQuat);
    }
    faceJSON["pose"]["quaternions"] = quatAdjusted;

    let transAdjusted = []
    for (let i = 0; i < 3; i++) {
        const adjustedTrans = faceJSON["hasFace"] ? round3(trans[i]) : 0;
        transAdjusted.push(adjustedTrans);
    }
    faceJSON["pose"]["translation"] = transAdjusted;

    // faceJSON["frame"] = frame;

    let landmarksAdjusted = [];
    let maxX = 0, minX = window.width, maxY = 0, minY = window.height;
    for (let i = 0; i < 68*2; i += 2) {
        const adjustedX = faceJSON["hasFace"] ? round3((landmarksRaw[i]-width/2)/width) : 0;
        const adjustedY = faceJSON["hasFace"] ? round3((height/2-landmarksRaw[i+1])/height): 0 ;
        landmarksAdjusted.push(adjustedX);
        landmarksAdjusted.push(adjustedY);
    }
    faceJSON["landmarks"] = landmarksAdjusted;

    let bboxAdjusted = [];
    for (let i = 0; i < 4; i += 2) {
        const adjustedX = faceJSON["hasFace"] ? round3((bbox[i]-width/2)/width) : 0;
        const adjustedY = faceJSON["hasFace"] ? round3((height/2-bbox[i+1])/height): 0 ;
        bboxAdjusted.push(adjustedX);
        bboxAdjusted.push(adjustedY);
    }
    faceJSON["bbox"] = bboxAdjusted;

    return faceJSON;
}

window.detectFace = async function(frame, width, height) {
    let landmarksRaw = [], bbox = [], quat = [], trans = [];

    if (window.faceDetector !== undefined && ready) {
        if (debugFace) console.time("detect_face_features");
        [landmarksRaw, bbox] = await window.faceDetector.detect(frame, width, height);
        // console.log(JSON.stringify(landmarksRaw))
        if (debugFace) console.timeEnd("detect_face_features");

        if (debugFace) console.time("get_pose");
        [quat, trans] = await window.faceDetector.getPose(landmarksRaw, window.width, window.height);
        if (debugFace) console.time("get_pose");

        if (debugFace) console.time("pub_to_broker");
        const globals = window.globals;
        const faceJSON = createFaceJSON(landmarksRaw, bbox, quat, trans, width, height);
        if (faceJSON != prevJSON) {
            publish("realm/s/" + globals.scenenameParam + "/camera_" + globals.idTag + "/face", faceJSON);
            prevJSON = faceJSON
        }
        // console.log(JSON.stringify(faceJSON))
        if (debugFace) console.timeEnd("pub_to_broker");
    }

    return [landmarksRaw, bbox];
}

async function processVideo() {
    if (trackFace) {
        if (frames % frameSkip == 0) {
            const [landmarksRaw, bbox] = await window.detectFace(getFrame(), window.width, window.height);
            if (!overlayOff) {
                if (debugFace && landmarksRaw && landmarksRaw.length > 0) console.log(landmarksRaw);
                drawOverlay(landmarksRaw, bbox);
            }
        }
        frames++;

        requestAnimationFrame(processVideo);
    }
}

async function init() {
    const globals = window.globals;
    const urlParams = new URLSearchParams(window.location.search);

    trackFace = !!urlParams.get("trackFace");
    if (!mobileOrTablet() && (trackFace || globals.vidconf)) {
        const FaceDetector = Comlink.wrap(new Worker("/x/face/faceDetector.js"));

        flipped = !!urlParams.get("flipped");
        debugFace = !!urlParams.get("debugFace");
        vidOff = !!urlParams.get("vidOff");
        overlayOff = !!urlParams.get("overlayOff");
        bboxOn = !!urlParams.get("bboxOn");

        frameSkip = urlParams.get("frameSkip") ? parseInt(urlParams.get("frameSkip")) : 1;

        width = urlParams.get("vidWidth") ? parseInt(urlParams.get("vidWidth")) : 320;

        window.faceDetector = await new FaceDetector(
            Comlink.proxy([() => {
                if (!globals.vidconf) {
                    trackFaceOn();
                }
            },
            () => {
                if (!overlayOff) {
                    let i = 0;
                    loading = setInterval(() => {
                        writeOverlayText("Initializing Face Tracking" + ".".repeat(i%4));
                        i++;
                    }, 500);
                }
                ready = true;
            }])
        );
    }
}

init();
