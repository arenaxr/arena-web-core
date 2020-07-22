importScripts('apriltag_wasm.js');
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

/* 
This is a wrapper class that calls apriltag_wasm to load the WASM module and wraps the c implementation calls. 

The apriltag dectector uses the tag36h11 family. For tag pose estimation, tag sizes are assumed according to the tag id:

[0,150]     -> size=150mm;
]150,300]   -> size==100mm;
]300,450]   -> size==50mm;
]450,587]   -> size==20mm;

*/

class Apriltag {

    constructor(onWasmLoadedCallback) {
        this.onWasmLoadedCallback = onWasmLoadedCallback;
        let _this = this;
        AprilTagWasm().then(function (Module) {
            console.log("Apriltag WASM module loaded.");
            _this.onWasmInit(Module);
        });
    }

    onWasmInit(Module) {
        // save a reference to the module here
        this._Module = Module;
        //int init(); Init the apriltag detector with default options
        this._init = Module.cwrap('init', 'number', []);
        //int destroy(); Releases resources allocated by the wasm module
        this._destroy = Module.cwrap('destroy', 'number', []);
        //int set_detector_options(float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose); Sets the given detector options
        this._set_detector_options = Module.cwrap('set_detector_options', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);
        //int set_pose_info(double fx, double fy, double cx, double cy); Sets the tag size (meters) and camera intrinsics (in pixels) for tag pose estimation
        this._set_pose_info = Module.cwrap('set_pose_info', 'number', ['number', 'number', 'number', 'number']);
        //uint8_t* set_img_buffer(int width, int height, int stride); Creates/changes size of the image buffer where we receive the images to process
        this._set_img_buffer = Module.cwrap('set_img_buffer', 'number', ['number', 'number', 'number']);
        //uint8_t* detect(int bool_return_pose); Detect tags in image previously stored in the buffer.
        //returns pointer to buffer starting with an int32 indicating the size of the remaining buffer (a string of chars with the json describing the detections)
        this._detect = Module.cwrap('detect', 'number', []);

        // convenience function
        this._destroy_buffer = function (buf_ptr) {
            this._Module._free(buf_ptr);
        };

        // inits detector with given family and default options: quad_decimate=2.0; quad_sigma=0.0; nthreads=1; refine_edges=1; return_pose=1
        this._init(); // NOTE: no need to set_detector_options() if javascript options are *not* different from default..

        // set max_detections = 0, meaning no max; will return all detections
        //options: float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose
        this._set_detector_options(2.0, 0.0, 1, 1, 0, 1);

        this.onWasmLoadedCallback();
    }

    // **public** detect method
    detect(grayscaleImg, imgWidth, imgHeight) {
        let imgBuffer = this._set_img_buffer(imgWidth, imgHeight, imgWidth); // set_img_buffer allocates the buffer for image and returns it; just returns the previously allocated buffer if size has not changed
        this._Module.HEAPU8.set(grayscaleImg, imgBuffer); // copy grayscale image data
        let detectionsBuffer = this._detect();
        if (detectionsBuffer == 0) { // returned NULL
            this._destroy_buffer(detectionsBuffer);
            return [];
        }
        let detectionsBufferSize = this._Module.getValue(detectionsBuffer, "i32");
        if (detectionsBufferSize == 0) { // returned zero detections
            this._destroy_buffer(detectionsBuffer);
            return [];
        }
        const resultView = new Uint8Array(this._Module.HEAP8.buffer, detectionsBuffer + 4, detectionsBufferSize);
        let detectionsJson = '';
        for (let i = 0; i < detectionsBufferSize; i++) {
            detectionsJson += String.fromCharCode(resultView[i]);
        }
        this._destroy_buffer(detectionsBuffer);
        let detections = JSON.parse(detectionsJson);

        return detections;
    }

    // **public** set camera intrinsics
    set_camera_info(fx, fy, cx, cy) {
        this._set_pose_info(fx, fy, cx, cy);
    }

}

Comlink.expose(Apriltag);
