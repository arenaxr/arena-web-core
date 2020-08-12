importScripts("/x/face/detect_face_wasm.js");
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

class FaceDetector {
    constructor(callbacks) {
        let _this = this;
        this.ready = false;
        FaceDetectorWasm().then(function (Module) {
            console.log("Face Detector WASM module loaded.");
            _this.onWasmInit(Module);
            _this.getPoseModel(callbacks[1]);
            if (callbacks[0]) {
                callbacks[0]();
            }
        });
    }

    onWasmInit(Module) {
        this._Module = Module;
    }

    getPoseModel(req_callback) {
        const req = new XMLHttpRequest();
        req.open("GET", "/x/face/face_landmarks_68_compressed.dat", true);
        req.responseType = "arraybuffer";
        req.onload = (e) => {
            const payload = req.response;
            if (payload) {
                req_callback();
                this.poseModelInit(payload);
                this.ready = true;
            }
        }
        req.send(null);
    }

    poseModelInit(data) {
        const model = new Uint8Array(data);
        const buf = this._Module._malloc(model.length);
        this._Module.HEAPU8.set(model, buf);
        this._Module.ccall(
            "pose_model_init",
            null,
            ["number", "number"],
            [buf, model.length]
        );
    }

    detect(im_arr, width, height) {
        if (!this.ready) return [[], []];

        const im_ptr = this._Module._malloc(im_arr.length);
        this._Module.HEAPU8.set(im_arr, im_ptr);

        const ptr = this._Module.ccall(
            "detect_face_features",
            "number",
            ["number", "number", "number"],
            [im_ptr, width, height]
        );
        const ptrU16 = ptr / Uint16Array.BYTES_PER_ELEMENT

        const len = this._Module.HEAPU16[ptrU16];

        let i = 1;

        let bbox = [];
        for (; i < 5; i++) {
            bbox.push(this._Module.HEAPU16[ptrU16+i]);
        }

        let landmarksRaw = [];
        for (; i < len; i++) {
            landmarksRaw.push(this._Module.HEAPU16[ptrU16+i]);
        }

        this._Module._free(ptr);
        this._Module._free(im_ptr);

        return [landmarksRaw, bbox];
    }

    getPose(parts_arr, width, height) {
        if (!this.ready) return [null, null];

        const parts_ptr = this._Module._malloc(parts_arr.length * Uint16Array.BYTES_PER_ELEMENT);
        this._Module.HEAPU16.set(parts_arr, parts_ptr / Uint16Array.BYTES_PER_ELEMENT);

        const ptr = this._Module.ccall(
            "get_pose",
            "number",
            ["number", "number", "number"],
            [parts_ptr, width, height]
        );
        const ptrF64 = ptr / Float64Array.BYTES_PER_ELEMENT;

        const len = this._Module.HEAPF64[ptrF64];

        let i = 1;

        let quat = [];
        for (; i < 5; i++) {
            quat.push(this._Module.HEAPF64[ptrF64+i]);
        }
        quat[1] = -quat[1];
        quat[2] = -quat[2];

        let trans = [];
        for (; i < len; i++) {
            trans.push(this._Module.HEAPF64[ptrF64+i]);
        }
        trans[0] = -trans[0];

        this._Module._free(ptr);
        this._Module._free(parts_ptr);

        return [quat, trans];
    }
}

Comlink.expose(FaceDetector);
