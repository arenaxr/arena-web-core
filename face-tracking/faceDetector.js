importScripts('./detect_face_wasm.js');
importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');

class FaceDetector {
    constructor(callback) {
        const _this = this;

        this.ready = false;

        this._bboxLength = 4;
        this._landmarksLength = 2 * 68;
        this._featuresLength = this._landmarksLength + this._bboxLength;
        this._rotLength = 4;
        this._transLength = 3;
        this._poseLength = this._rotLength + this._transLength;

        FaceDetectorWasm().then(function(Module) {
            console.log('Face Detector WASM module loaded.');
            _this.onWasmInit(Module);
            _this.getPoseModel(callback);
        });
    }

    onWasmInit(Module) {
        this._Module = Module;

        this.initializeShapePredictor = this._Module.cwrap("pose_model_init", null, ["number", "number"]);
        this.detectFaceFeatures = this._Module.cwrap("detect_face_features", "number", ["number", "number", "number"]);
        this.findPose = this._Module.cwrap("get_pose", "number", ["number", "number", "number"]);
    }

    getPoseModel(req_callback) {
        const req = new XMLHttpRequest();
        req.open(
                'GET',
                'https://arena-cdn.conix.io/store/face-tracking/shape_predictor_68_face_landmarks_compressed.dat',
                true
            );
        req.responseType = 'arraybuffer';
        req.onload = e => {
            const payload = req.response;
            if (payload) {
                req_callback();
                this.poseModelInit(payload);
                this.ready = true;
            }
            else {
                console.log("shape_predictor_68_face_landmarks model not found!")
            }
        };
        req.send(null);
    }

    poseModelInit(data) {
        const model = new Uint8Array(data);
        const buf = this._Module._malloc(model.length);
        this._Module.HEAPU8.set(model, buf);
        this.initializeShapePredictor(buf, model.length);
    }

    detectFeatures(imArr, width, height) {
        if (!this.ready) return undefined;

        const imPtr = this._Module._malloc(imArr.length);
        this._Module.HEAPU8.set(imArr, imPtr);

        // console.time("features");
        const ptr = this.detectFaceFeatures(imPtr, width, height);
        // console.timeEnd("features");
        let features = new Uint16Array(this._Module.HEAPU16.buffer, ptr, this._featuresLength);

        const bbox = features.slice(0, this._bboxLength);
        const landmarksRaw = features.slice(this._bboxLength, this._featuresLength);

        this._Module._free(ptr);
        this._Module._free(imPtr);

        return {
            bbox: bbox,
            landmarks: landmarksRaw
        };
    }

    getPose(partsArr, width, height) {
        if (!this.ready) return undefined;

        const partsPtr = this._Module._malloc(partsArr.length * Uint16Array.BYTES_PER_ELEMENT);
        this._Module.HEAPU16.set(partsArr, partsPtr / Uint16Array.BYTES_PER_ELEMENT);

        const ptr = this.findPose(partsPtr, width, height);
        let pose = new Float64Array(this._Module.HEAPF64.buffer, ptr, this._featuresLength);

        const quat = pose.slice(0, this._rotLength);
        const trans = pose.slice(this._rotLength, this._poseLength);

        this._Module._free(ptr);
        this._Module._free(partsPtr);

        return {
            rotation: quat,
            translation: trans
        };
    }
}

Comlink.expose(FaceDetector);
