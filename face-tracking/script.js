import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

ARENA.FaceTracker = (function () {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================
    const OVERLAY_COLOR = "#ef2d5e";

    let prevJSON = null;

    let frames = 0, framesToSkip = 15;
    let displayBbox = false, flipped = false;
    let vidStream = null;
    let loadingTimer = null;
    let ready = false;

    let videoHeight = 0;
    let videoElem = null, videoCanv = null, overlayCanv = null;

    let faceDetector = null;
    let hasAvatar = false;

    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================
    function writeOverlayText(text) {
        if (!overlayCanv) return;
        const overlayCtx = overlayCanv.getContext("2d");
        overlayCtx.clearRect(
            0, 0,
            globals.localVideoWidth,
            videoHeight
        );
        overlayCtx.font = "17px Arial";
        overlayCtx.textAlign = "center";
        overlayCtx.fillStyle = OVERLAY_COLOR;
        overlayCtx.fillText(text, overlayCanv.width/2, overlayCanv.height/8);
    }

    function setupVideo(setupCallback) {
        videoElem = document.createElement("video");
        videoElem.setAttribute("autoplay", "");
        videoElem.setAttribute("muted", "");
        videoElem.setAttribute("playsinline", "");

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        })
        .then(stream => {
            vidStream = stream;
            videoElem.srcObject = stream;
            videoElem.play();
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

        videoCanv = document.createElement("canvas");
        setVideoStyle(videoCanv);
        videoCanv.style.zIndex = 9998;
        videoCanv.style.opacity = 0.25;
        document.body.appendChild(videoCanv);

        overlayCanv = document.createElement("canvas");
        setVideoStyle(overlayCanv);
        overlayCanv.style.zIndex = 9999;
        document.body.appendChild(overlayCanv);

        videoElem.addEventListener("canplay", function(e) {
            videoHeight = videoElem.videoHeight / (videoElem.videoWidth / globals.localVideoWidth);

            videoElem.setAttribute("width", globals.localVideoWidth);
            videoElem.setAttribute("height", videoHeight);

            videoCanv.width = globals.localVideoWidth;
            videoCanv.height = videoHeight;
            if (flipped) {
                videoCanv.getContext('2d').translate(globals.localVideoWidth, 0);
                videoCanv.getContext('2d').scale(-1, 1);
            }

            overlayCanv.width = globals.localVideoWidth;
            overlayCanv.height = videoHeight;

            if (setupCallback) setupCallback();
        }, false);
    }

    function getFrame() {
        const videoCanvCtx = videoCanv.getContext("2d");
        videoCanvCtx.drawImage(
            videoElem,
            0, 0,
            globals.localVideoWidth,
            videoHeight
        );
        return videoCanvCtx.getImageData(0, 0, globals.localVideoWidth, videoHeight).data;
    }

    function hasFace(landmarks) {
        if (!landmarks || landmarks.length == 0) return false;

        let zeros = 0;
        for (let i = 0; i < landmarks.length; i++) {
            if (i % 2 == 0 && landmarks[i] > globals.localVideoWidth) return false;
            if (i % 2 == 1 && landmarks[i] > videoHeight) return false;
            if (landmarks[i] == 0) zeros++;
        }
        // if there are many 0's (>2/3) then assume there is no face
        return zeros <= landmarks.length / 3;
    }

    function drawBbox(bbox) {
        const overlayCtx = overlayCanv.getContext("2d");

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
        const overlayCtx = overlayCanv.getContext("2d");
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
        if (!overlayCanv) return;
        if (!landmarksRaw || landmarksRaw.length == 0) return;
        if (loadingTimer) clearInterval(loadingTimer);

        const overlayCtx = overlayCanv.getContext("2d");
        overlayCtx.clearRect(0, 0, globals.localVideoWidth, videoHeight);

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

        if (displayBbox) drawBbox(bbox);
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
        if (faceDetector && ready) {
            [landmarksRaw, bbox] = await faceDetector.detect(frame, width, height);
            [quat, trans] = await faceDetector.getPose(landmarksRaw, globals.localVideoWidth, videoHeight);
        }
        return [landmarksRaw, bbox, quat, trans];
    }

    async function processVideo() {
        if (hasAvatar) {
            if (frames % framesToSkip == 0) {
                const [landmarksRaw, bbox, quat, trans] = await detectFace(getFrame(), globals.localVideoWidth, videoHeight);
                drawLandmarks(landmarksRaw, bbox);

                const faceJSON = createFaceJSON(landmarksRaw, bbox, quat, trans, globals.localVideoWidth, videoHeight);
                if (faceJSON != prevJSON) {
                    publish(globals.outputTopic + globals.camName + "/face", faceJSON);
                    prevJSON = faceJSON;
                }
            }
            frames++;
            requestAnimationFrame(processVideo);
        }
    }

    function displayInitialization() {
        let i = 0;
        loadingTimer = setInterval(() => {
            writeOverlayText("Initializing Face Tracking" + ".".repeat(i%4)); i++;
        }, 500);
        ready = true;
    }

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        init: async function init(_displayBbox, _flipped) {
            displayBbox = _displayBbox;
            flipped = _flipped;
            const FaceDetector = Comlink.wrap(new Worker("./face-tracking/faceDetector.js"));
            faceDetector = await new FaceDetector(
                Comlink.proxy(displayInitialization) // input is a callback
            );
        },

        hasAvatar: function() {
            return hasAvatar;
        },

        trackFaceOn: function() {
            if (!faceDetector || !faceDetector.ready) return;

            setupVideo(() => {
                if (!ready) {
                    writeOverlayText("Downloading Face Model: 72MB");
                }
                requestAnimationFrame(processVideo);
            });

            hasAvatar = true;
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        trackFaceOff: function() {
            if (!faceDetector || !faceDetector.ready ||
                !overlayCanv || !videoCanv || !videoElem) return;

            if (overlayCanv) {
                document.body.removeChild(overlayCanv);
                overlayCanv = null;
            }

            if (videoCanv) {
                document.body.removeChild(videoCanv);
                videoCanv = null;
            }

            const tracks = vidStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
            videoElem.srcObject = null;
            videoElem = undefined;

            hasAvatar = false;
            return new Promise(function(resolve, reject) {
                resolve();
            });
        }
    }
})();
