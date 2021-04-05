/* global ARENA */

ARENA.FaceTracker = (function() {
    // ==================================================
    // PRIVATE VARIABLES
    // ==================================================
    const OVERLAY_COLOR = '#ef2d5e';

    let prevJSON = null;

    let displayBbox = false;
    let flipped = false;

    let initialized = false;
    let initializingTimer = null;
    let running = false;

    const width = ARENA.localVideoWidth;
    const height = Math.ceil((window.screen.height / window.screen.width) * width);

    let overlayCanvas;
    let faceTrackerSource;
    let faceTracker;

    // ==================================================
    // PRIVATE FUNCTIONS
    // ==================================================

    /**
     * Writes text over the video canvas for face tracking status indications
     * @param {string} text Text to be written
     */
    function writeOverlayText(text) {
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect( 0, 0, width, height );
        overlayCtx.font = '17px Arial';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillStyle = OVERLAY_COLOR;
        overlayCtx.fillText(text, overlayCanvas.width/2, overlayCanvas.height/8);
    }

    /**
     * Draws a bounding box on the overlay canvas
     * @param {[]} bbox array formatted like so: [x1,y1,x2,y2]
     */
    function drawBbox(bbox) {
        const overlayCtx = overlayCanvas.getContext('2d');

        overlayCtx.beginPath();
        overlayCtx.strokeStyle = 'blue';
        overlayCtx.lineWidth = 1.5;

        // [x1,y1,x2,y2]
        overlayCtx.moveTo(bbox.left, bbox.top);
        overlayCtx.lineTo(bbox.left, bbox.bottom);
        overlayCtx.lineTo(bbox.right, bbox.bottom);
        overlayCtx.lineTo(bbox.right, bbox.top);
        overlayCtx.lineTo(bbox.left, bbox.top);

        overlayCtx.stroke();
    }

    /**
     * Draws a polyline on the overlay canvas. Helper function for drawing face landmarks
     * @param {[]} landmarks array formatted like so: [x1,y1,x2,y2,x3,x3,...]
     * @param {number} start start index to draw lines
     * @param {number} end end index to draw lines
     * @param {boolean} closed whether or not to connect the start and end points of polyline
     */
    function drawPolyline(landmarks, start, end, closed) {
        const overlayCtx = overlayCanvas.getContext('2d');
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

    /**
     * Draws face features as connected polylines
     * @param {object} features object returned by face tracker worker
     */
    function drawFeatures(features) {
        if (!running) return;
        const bbox = features.bbox;
        const landmarks = features.landmarks;

        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect( 0, 0, width, height );

        const landmarksFormatted = [];
        for (let i = 0; i < landmarks.length; i += 2) {
            const l = [landmarks[i], landmarks[i+1]];
            landmarksFormatted.push(l);
        }

        if (displayBbox) drawBbox(bbox);
        drawPolyline(landmarksFormatted, 0, 16, false); // jaw
        drawPolyline(landmarksFormatted, 17, 21, false); // left eyebrow
        drawPolyline(landmarksFormatted, 22, 26, false); // right eyebrow
        drawPolyline(landmarksFormatted, 27, 30, false); // nose bridge
        drawPolyline(landmarksFormatted, 30, 35, true); // lower nose
        drawPolyline(landmarksFormatted, 36, 41, true); // left eye
        drawPolyline(landmarksFormatted, 42, 47, true); // right Eye
        drawPolyline(landmarksFormatted, 48, 59, true); // outer lip
        drawPolyline(landmarksFormatted, 60, 67, true); // inner lip
    }

    /**
     * Checks if landmarks are valid
     * @param {[]} landmarks array formatted like so: [x1,y1,x2,y2,x3,x3,...]
     * @return {boolean} whether or not the landmarks has a valid face or not
     */
    function hasFace(landmarks) {
        if (!landmarks || landmarks.length == 0) return false;

        let numZeros = 0;
        for (let i = 0; i < landmarks.length; i++) {
            if (i % 2 == 0 && landmarks[i] > width) return false;
            if (i % 2 == 1 && landmarks[i] > height) return false;
            if (landmarks[i] == 0) numZeros++;
        }
        return numZeros <= landmarks.length / 2;
    }

    /**
     * Rounds number to 3 decimal places
     * @param {number} num number to round
     * @return {number} input rounded to 3 decimal places
     */
    function round3(num) {
        return parseFloat(num.toFixed(3));
    }

    /**
     * Creates JSON representation of face tracker output to be sent through mqtt
     * @param {boolean} hasFace whether or not features are valid
     * @param {object} landmarks landmarks
     * @param {object} bbox bbox
     * @param {object} pose rotation and translation estimation of face
     * @return {object} resulting JSON of normalized values to be sent through mqtt
     */
    function createFaceJSON(hasFace, landmarks, bbox, pose) {
        const landmarksRaw = landmarks;
        const quat = pose.rotation;
        const trans = pose.translation;

        const faceJSON = {};
        faceJSON['object_id'] = ARENA.faceName;
        faceJSON['type'] = 'face-features';
        faceJSON['action'] = 'create';

        faceJSON['data'] = {};

        faceJSON['data']['hasFace'] = hasFace;

        faceJSON['data']['image'] = {};
        faceJSON['data']['image']['flipped'] = flipped;
        faceJSON['data']['image']['width'] = width;
        faceJSON['data']['image']['height'] = height;

        faceJSON['data']['pose'] = {};

        let adjustedQuat;
        const quatAdjusted = [];

        adjustedQuat = hasFace ? round3(quat.x) : 0;
        quatAdjusted.push(adjustedQuat);

        adjustedQuat = hasFace ? round3(quat.y) : 0;
        quatAdjusted.push(adjustedQuat);

        adjustedQuat = hasFace ? round3(quat.z) : 0;
        quatAdjusted.push(adjustedQuat);

        adjustedQuat = hasFace ? round3(quat.w) : 0;
        quatAdjusted.push(adjustedQuat);

        faceJSON['data']['pose']['quaternions'] = quatAdjusted;

        let adjustedTrans;
        const transAdjusted = [];

        adjustedTrans = hasFace ? round3(trans.x) : 0;
        transAdjusted.push(adjustedTrans);

        adjustedTrans = hasFace ? round3(trans.y) : 0;
        transAdjusted.push(adjustedTrans);

        adjustedTrans = hasFace ? round3(trans.z) : 0;
        transAdjusted.push(adjustedTrans);

        faceJSON['data']['pose']['translation'] = transAdjusted;

        const landmarksAdjusted = [];
        for (let i = 0; i < 68*2; i += 2) {
            const adjustedX = hasFace ? round3((landmarksRaw[i]-width/2)/width) : 0;
            const adjustedY = hasFace ? round3((height/2-landmarksRaw[i+1])/height): 0;
            landmarksAdjusted.push(adjustedX);
            landmarksAdjusted.push(adjustedY);
        }
        faceJSON['data']['landmarks'] = landmarksAdjusted;

        let adjustedX;
        let adjustedY;
        const bboxAdjusted = [];

        adjustedX = hasFace ? round3((bbox.left-width/2)/width) : 0;
        adjustedY = hasFace ? round3((height/2-bbox.top)/height): 0;
        bboxAdjusted.push(adjustedX);
        bboxAdjusted.push(adjustedY);

        adjustedX = hasFace ? round3((bbox.right-width/2)/width) : 0;
        adjustedY = hasFace ? round3((height/2-bbox.bottom)/height): 0;
        bboxAdjusted.push(adjustedX);
        bboxAdjusted.push(adjustedY);

        faceJSON['data']['bbox'] = bboxAdjusted;

        // faceJSON['data']['frame'] = frame;

        return faceJSON;
    }
    /**
     * Stop running face tracker and stop videos and overlay
     */
    function stop() {
        running = false;
        faceTracker.stop();
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect( 0, 0, width, height );
    }

    /**
     * Start running face tracker again
     */
    function restart() {
        running = true;
        if (!initialized) {
            const shapePredURL =
                'https://arena-cdn.conix.io/store/face-tracking/shape_predictor_68_face_landmarks_compressed.dat';
            faceTracker.init(shapePredURL);
            initialized = true;
        } else {
            faceTracker.restart();
        }
    }

    return {
        // ==================================================
        // PUBLIC
        // ==================================================
        init: function init(_displayBbox, _flipped) {
            displayBbox = _displayBbox;
            flipped = _flipped;

            faceTrackerSource = new FaceTracker.FaceTrackerSource({
                width: width,
                height: height,
            });
            faceTracker = new FaceTracker.FaceTracker(faceTrackerSource);

            window.addEventListener('onFaceTrackerInit', (e) => {
                const video = e.detail.source;
                video.className = 'flipVideo';
                video.style.borderRadius = '10px';
                video.style.top = '15px';
                video.style.left = '15px';
                video.style.zIndex = '9999';
                const videoWidth = video.style.width;
                const videoHeight = video.videoHeight / (video.videoWidth / videoWidth);
                video.style.height = videoHeight + 'px';
                document.body.appendChild(video);

                overlayCanvas = document.createElement('canvas');
                overlayCanvas.id = 'face-tracking-overlay';
                overlayCanvas.style.zIndex = '9999';
                faceTrackerSource.copyDimensionsTo(overlayCanvas);
                document.body.appendChild(overlayCanvas);
            });

            window.addEventListener('onFaceTrackerProgress', (e) => {
                const progress = e.detail.progress;
                writeOverlayText(`Downloading Face Model: ${progress}%`);
            });

            window.addEventListener('onFaceTrackerLoading', (e) => {
                let i = 0;
                if (!initializingTimer) {
                    initializingTimer = setInterval(() => {
                        if (running) {
                            writeOverlayText(`Initializing Face Tracking${'.'.repeat(i%4)}`);
                            i++;
                        }
                    }, 500);
                }
            });

            window.addEventListener('onFaceTrackerFeatures', (e) => {
                const features = e.detail.features;
                const pose = e.detail.pose;
                const bbox = features.bbox;
                const landmarks = features.landmarks;

                const valid = hasFace(landmarks);
                if (valid) {
                    drawFeatures(features);
                } else {
                    const overlayCtx = overlayCanvas.getContext('2d');
                    overlayCtx.clearRect( 0, 0, width, height );
                }

                const faceJSON = createFaceJSON(valid, landmarks, bbox, pose);
                if (faceJSON !== prevJSON) {
                    ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName + '/face', faceJSON);
                    prevJSON = faceJSON;
                }

                if (initializingTimer) {
                    clearInterval(initializingTimer);
                }
            });
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
        },
    };
})();
