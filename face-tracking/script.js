ARENA.FaceTracker = (function () {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================
    const OVERLAY_COLOR = "#ef2d5e";

    let prevJSON = null;

    let displayBbox = false, flipped = false;

    var grayscale = null;

    var videoCanvas = null;
    var overlayCanvas = null;
    var videoSource = null;

    var worker = null;
    var imageData = null;

    var running = false;

    var width = globals.localVideoWidth;
    var height = Math.ceil((window.screen.height / window.screen.width) * width);

    const targetFps = 30;
    const fpsInterval = 1000 / targetFps; // ms

    var startTime, prevTime;

    var initializingTimer = null;

    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================
    function writeOverlayText(text) {
        const overlayCtx = overlayCanvas.getContext("2d");
        overlayCtx.clearRect(
            0, 0,
            width,
            height
        );
        overlayCtx.font = "17px Arial";
        overlayCtx.textAlign = "center";
        overlayCtx.fillStyle = OVERLAY_COLOR;
        overlayCtx.fillText(text, overlayCanvas.width/2, overlayCanvas.height/8);
    }

    function drawBbox(bbox) {
        const overlayCtx = overlayCanvas.getContext("2d");

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
        const overlayCtx = overlayCanvas.getContext("2d");
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

    function drawFeatures(features) {
        const bbox = features.bbox
        const landmarks = features.landmarks;

        const overlayCtx = overlayCanvas.getContext("2d");
        overlayCtx.clearRect( 0, 0, width, height );

        var landmarksFormatted = [];
        for (var i = 0; i < landmarks.length; i += 2) {
            const l = [landmarks[i], landmarks[i+1]];
            landmarksFormatted.push(l);
        }

        if (displayBbox) drawBbox(bbox);
        drawPolyline(landmarksFormatted, 0,  16, false);   // jaw
        drawPolyline(landmarksFormatted, 17, 21, false);   // left eyebrow
        drawPolyline(landmarksFormatted, 22, 26, false);   // right eyebrow
        drawPolyline(landmarksFormatted, 27, 30, false);   // nose bridge
        drawPolyline(landmarksFormatted, 30, 35, true);    // lower nose
        drawPolyline(landmarksFormatted, 36, 41, true);    // left eye
        drawPolyline(landmarksFormatted, 42, 47, true);    // right Eye
        drawPolyline(landmarksFormatted, 48, 59, true);    // outer lip
        drawPolyline(landmarksFormatted, 60, 67, true);    // inner lip
    }

    function hasFace(landmarks) {
        if (!landmarks || landmarks.length == 0) return false;

        let numZeros = 0;
        for (let i = 0; i < landmarks.length; i++) {
            if (i % 2 == 0 && landmarks[i] > width) return false;
            if (i % 2 == 1 && landmarks[i] > height) return false;
            if (landmarks[i] == 0) numZeros++;
        }
        return numZeros != landmarks.length;
    }

    function round3(num) {
        return parseFloat(num.toFixed(3));
    }

    function createFaceJSON(hasFace, features, pose) {
        const landmarksRaw = features.landmarks;
        const bbox = features.bbox;
        const quat = pose.rotation;
        const trans = pose.translation;

        let faceJSON = {};
        faceJSON["object_id"] = "face_" + globals.idTag;

        faceJSON["hasFace"] = hasFace;

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

    // display frames
    function tick() {
        if (!running) return;

        const now = Date.now();
        const dt = now - prevTime;

        if (dt >= fpsInterval) {
            prevTime = now - (dt % fpsInterval);
            imageData = grayscale.getFrame();
            const videoCanvasCtx = videoCanvas.getContext("2d");
            videoCanvasCtx.drawImage(
                videoSource, 0, 0, width, height
            );
        }

        requestAnimationFrame(tick);
    }

    function onInit(source) {
        videoSource = source;
        running = true;

        const overlayCtx = overlayCanvas.getContext("2d");
        overlayCtx.clearRect( 0, 0, width, height );

        if (!worker) {
            // worker to handle CV in the background
            worker = new Worker("./face-tracking/face-tracker.worker.js");
            worker.postMessage({ type: "init", width: width, height: height });

            worker.onmessage = function (e) {
                var msg = e.data;
                switch (msg.type) {
                    case "loaded": {
                        process(); // start processing after face-tracker is ready
                        break;
                    }
                    case "progress": {
                        const progress = (Math.round(msg.progress * 100) / 100).toFixed(2);
                        // if loading progress is more than 99, start displaying initialization
                        if (progress > 99) {
                            let i = 0;
                            if (!initializingTimer) {
                                initializingTimer = setInterval(() => {
                                    if (running) {
                                        writeOverlayText(`Initializing Face Tracking${".".repeat(i%4)}`);
                                        i++;
                                    }
                                }, 500);
                            }
                        }
                        if (running) {
                            writeOverlayText(`Downloading Face Model: ${progress}%`);
                        }
                        break;
                    }
                    case "result": {
                        if (running) {
                            const valid = hasFace(msg.features.landmarks);
                            if (valid) {
                                drawFeatures(msg.features);
                            } else {
                                const overlayCtx = overlayCanvas.getContext("2d");
                                overlayCtx.clearRect( 0, 0, width, height );
                            }
                            if (msg.features && msg.pose) {
                                const faceJSON = createFaceJSON(valid, msg.features, msg.pose);
                                if (faceJSON != prevJSON) {
                                    publish(globals.outputTopic + globals.camName + "/face", faceJSON);
                                    prevJSON = faceJSON;
                                }
                            }
                        }
                        if (initializingTimer) {
                            clearInterval(initializingTimer);
                        }
                        process(); // process again after we just finished processing
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }

        startTime = Date.now();
        prevTime = startTime;

        tick();
    }

    // tell worker we have an image ready to process
    function process() {
        if (running && imageData) {
            worker.postMessage({ type: 'process', imagedata: imageData });
        }
    }

    function stop() {
        if (!running) return;

        if (videoSource) {
            const overlayCtx = overlayCanvas.getContext("2d");
            overlayCtx.clearRect( 0, 0, width, height );

            const tracks = videoSource.srcObject.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
            videoSource.srcObject = null;

            videoCanvas.style.display = "none";
            running = false;
        }
    }

    function restart() {
        if (running) return;

        videoCanvas.style.display = "block";
        grayscale.requestStream()
            .then(source => {
                onInit(source);
                process();
            })
            .catch(err => {
                console.warn("ERROR: " + err);
            });
    }

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        init: function init(_displayBbox, _flipped) {
            displayBbox = _displayBbox;
            flipped = _flipped;

            function setVideoStyle(elem) {
                elem.style.position = "absolute";
                elem.style.borderRadius = "10px";
                elem.style.top = "15px";
                elem.style.left = "15px";
            }

            var video = document.createElement("video");
            video.setAttribute("autoplay", "");
            video.setAttribute("muted", "");
            video.setAttribute("playsinline", "");
            videoCanvas = document.createElement("canvas");
            setVideoStyle(videoCanvas);
            videoCanvas.id = "face-tracking-video";
            videoCanvas.width = width;
            videoCanvas.height = height;
            videoCanvas.style.zIndex = 9998;
            videoCanvas.style.opacity = 0.3;
            if (flipped) {
                videoCanvas.getContext('2d').translate(width, 0);
                videoCanvas.getContext('2d').scale(-1, 1);
            }
            document.body.appendChild(videoCanvas);

            overlayCanvas = document.createElement("canvas");
            setVideoStyle(overlayCanvas);
            overlayCanvas.id = "face-tracking-overlay";
            overlayCanvas.width = width;
            overlayCanvas.height = height;
            overlayCanvas.style.zIndex = 9999;
            document.body.appendChild(overlayCanvas);

            grayscale = new ARENAFaceTracker.GrayScaleMedia(video, width, height);
        },

        running: function() {
            return running;
        },

        run: function() {
            restart();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        },

        stop: function() {
            stop();
            return new Promise(function(resolve, reject) {
                resolve();
            });
        }
    }
})();

// initialize face tracking code if not on mobile
if (!AFRAME.utils.device.isMobile()) {
    const displayBbox = false;
    const flipped = false;
    ARENA.FaceTracker.init(displayBbox, flipped);
}
