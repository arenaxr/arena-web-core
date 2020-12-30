if ('function' === typeof importScripts) {
    importScripts("./face-tracking/detect_face_wasm.js");
    importScripts("./face-tracking/dist/arena-face-tracker.min.js");

    self.onmessage = function (e) {
        var msg = e.data;
        switch (msg.type) {
            case "init": {
                load(msg);
                return;
            }
            case "process": {
                next = msg.imagedata;
                process();
                return;
            }
            default: {
                break;
            }
        }
    };

    var next = null;

    var faceTracker = null;

    var features = null, pose = null;

    function load(msg) {
        var onLoad = function() {
            postMessage({type: "loaded"});
        }

        var onProgress = function(progress) {
            postMessage({type: "progress", progress: progress});
        }

        faceTracker = new ARENAFaceTracker.FaceTracker(msg.width, msg.height, onLoad, onProgress);
    }

    function process() {
        features = null;
        pose = null;

        if (faceTracker && faceTracker.ready) {
            features = faceTracker.detectFeatures(next);
            if (features) {
                pose = faceTracker.getPose(features.landmarks);
            }
        }

        if (features) {
            postMessage({type: "result", features: features, pose: pose});
        }
        // else {
        //     postMessage({ type: "not found" });
        // }

        next = null;
    }

}
