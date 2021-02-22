if ('function' === typeof importScripts) {
    importScripts('./face_tracker_wasm.js');
    importScripts('../dist/face-tracker.min.js');

    self.onmessage = function(e) {
        const msg = e.data;
        switch (msg.type) {
        case 'init': {
            load(msg);
            return;
        }
        case 'process': {
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

    let faceTracker = null;

    let features = null; let pose = null;

    function load(msg) {
        const onLoad = function() {
            postMessage({type: 'loaded'});
        };

        const onProgress = function(progress) {
            postMessage({type: 'progress', progress: progress});
        };

        faceTracker = new FaceTracker.FaceTracker(msg.width, msg.height, onLoad, onProgress);
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
            postMessage({type: 'result', features: features, pose: pose});
        }
        // else {
        //     postMessage({ type: "not found" });
        // }

        next = null;
    }
}
