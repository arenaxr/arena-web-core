import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

const OVERLAY_COLOR = "#ef2d5e";
let frames = 0, framesToSkip = 1;
let bboxOn = false, flipped = false;
let prevJSON = null;
let vidStream = null;
let loading = null;
let ready = false;

window.trackFaceOn = function() {
    if (!globals.faceDetector || !globals.faceDetector.ready) return;

    setupVideo(() => {
        if (!ready) {
            writeOverlayText("Downloading Face Model: 72MB");
        }
        requestAnimationFrame(processVideo);
    });
}

window.trackFaceOff = function() {
    if (!globals.faceDetector || !globals.faceDetector.ready ||
        !window.overlayCanv || !window.videoCanv || !window.videoElem) return;

    if (window.overlayCanv) {
        document.body.removeChild(window.overlayCanv);
        window.overlayCanv = null;
    }

    if (window.videoCanv) {
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
    if (!window.overlayCanv) return;
    const overlayCtx = window.overlayCanv.getContext("2d");
    overlayCtx.clearRect(
        0, 0,
        globals.localVideoWidth,
        globals.localVideoHeight
    );
    overlayCtx.font = "17px Arial";
    overlayCtx.textAlign = "center";
    overlayCtx.fillStyle = OVERLAY_COLOR;
    overlayCtx.fillText(text, window.overlayCanv.width/2, window.overlayCanv.height/8);
}

function setupVideo(setupCallback) {
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
        window.videoElem.srcObject = stream;
        window.videoElem.play();
    })
    .catch(function(err) {
        console.log("ERROR: " + err);
    });

    function setVideoStyle(elem) {
        elem.style.position = "absolute";
        elem.style.top = "15px";
        elem.style.left = "15px";
        elem.style.borderRadius = "10px";
    }

    window.videoCanv = document.createElement("canvas");
    setVideoStyle(window.videoCanv);
    window.videoCanv.style.zIndex = 9998;
    window.videoCanv.style.opacity = 0.25;
    document.body.appendChild(window.videoCanv);

    window.overlayCanv = document.createElement("canvas");
    setVideoStyle(window.overlayCanv);
    window.overlayCanv.style.zIndex = 9999;
    document.body.appendChild(window.overlayCanv);

    window.videoElem.addEventListener("canplay", function(e) {
        globals.localVideoHeight = window.videoElem.videoHeight / (window.videoElem.videoWidth / globals.localVideoWidth);

        window.videoElem.setAttribute("width", globals.localVideoWidth);
        window.videoElem.setAttribute("height", globals.localVideoHeight);

        window.videoCanv.width = globals.localVideoWidth;
        window.videoCanv.height = globals.localVideoHeight;
        if (flipped) {
            window.videoCanv.getContext('2d').translate(globals.localVideoWidth, 0);
            window.videoCanv.getContext('2d').scale(-1, 1);
        }

        window.overlayCanv.width = globals.localVideoWidth;
        window.overlayCanv.height = globals.localVideoHeight;

        if (setupCallback) setupCallback();
    }, false);
}

function getFrame() {
    const videoCanvCtx = window.videoCanv.getContext("2d");
    videoCanvCtx.drawImage(
        window.videoElem,
        0, 0,
        globals.localVideoWidth,
        globals.localVideoHeight
    );
    return videoCanvCtx.getImageData(0, 0, globals.localVideoWidth, globals.localVideoHeight).data;
}

function hasFace(landmarks) {
    if (!landmarks || landmarks.length == 0) return false;

    let zeros = 0;
    for (let i = 0; i < landmarks.length; i++) {
        if (i % 2 == 0 && landmarks[i] > globals.localVideoWidth) return false;
        if (i % 2 == 1 && landmarks[i] > globals.localVideoHeight) return false;
        if (landmarks[i] == 0) zeros++;
    }
    // if there are many 0's (>2/3) then assume there is no face
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
    overlayCtx.strokeStyle = OVERLAY_COLOR;
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

function drawLandmarks(landmarksRaw, bbox) {
    if (!window.overlayCanv) return;
    if (!landmarksRaw || landmarksRaw.length == 0) return;
    if (loading) clearInterval(loading);

    const overlayCtx = window.overlayCanv.getContext("2d");
    overlayCtx.clearRect(0, 0, globals.localVideoWidth, globals.localVideoHeight);

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

    if (bboxOn) drawBbox(bbox);
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

async function detectFace(frame, width, height) {
    let landmarksRaw = [], bbox = [], quat = [], trans = [];
    if (globals.faceDetector && ready) {
        [landmarksRaw, bbox] = await globals.faceDetector.detect(frame, width, height);
        [quat, trans] = await globals.faceDetector.getPose(landmarksRaw, globals.localVideoWidth, globals.localVideoHeight);
        const faceJSON = createFaceJSON(landmarksRaw, bbox, quat, trans, width, height);
        if (faceJSON != prevJSON) {
            publish(globals.outputTopic + globals.camName + "/face", faceJSON);
            prevJSON = faceJSON;
        }
    }
    return [landmarksRaw, bbox, quat, trans];
}

async function processVideo() {
    if (globals.hasAvatar) {
        if (frames % framesToSkip == 0) {
            const [landmarksRaw, bbox, quat, trans] = await detectFace(getFrame(), globals.localVideoWidth, globals.localVideoHeight);
            drawLandmarks(landmarksRaw, bbox);
        }
        frames++;
        requestAnimationFrame(processVideo);
    }
}

function displayInitialization() {
    let i = 0;
    loading = setInterval(() => {
        writeOverlayText("Initializing Face Tracking" + ".".repeat(i%4)); i++;
    }, 500);
    ready = true;
}

window.faceTrackerInit = async function () {
    const FaceDetector = Comlink.wrap(new Worker("./face-tracking/faceDetector.js"));
    globals.faceDetector = await new FaceDetector(
        Comlink.proxy(displayInitialization) // input is a callback
    );
}
