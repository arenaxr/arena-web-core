importScripts('./apriltag_wasm.js');
importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');
// importScripts("https://unpkg.com/comlink@alpha/dist/umd/comlink.js");
/*
This is a wrapper class that calls apriltag_wasm to load the WASM module and wraps the c implementation calls.

The apriltag dectector uses the tag36h11 family. For tag pose estimation, tag sizes are assumed according to the tag id:

[0,150]     -> size=150mm;
]150,300]   -> size==100mm;
]300,450]   -> size==50mm;
]450,587]   -> size==20mm;

*/


class Apriltag {
    constructor(onDetectorReadyCallback) {
        // detectorOptions = detectorOptions || {};

        this.onDetectorReadyCallback = onDetectorReadyCallback;

        // detector options
        this._opt = {
            // Decimate input image by this factor
            quad_decimate: 2.0,
            // What Gaussian blur should be applied to the segmented image; standard deviation in pixels
            quad_sigma: 0.0,
            // Use this many CPU threads (no effect)
            nthreads: 1,
            // Spend more time trying to align edges of tags
            refine_edges: 1,
            // Maximum detections to return (0=return all)
            max_detections: 0,
            // Return pose (requires camera parameters)
            return_pose: 1,
            // Return pose solutions details
            return_solutions: 1,
        };

        const _this = this;
        AprilTagWasm().then(function(Module) {
            console.log('Apriltag WASM module loaded.');
            _this.onWasmInit(Module);
        });
    }

    onWasmInit(Module) {
        // save a reference to the module here
        this._Module = Module;
        // int atagjs_init(); Init the apriltag detector with default options
        this._init = Module.cwrap('atagjs_init', 'number', []);
        // int atagjs_destroy(); Releases resources allocated by the wasm module
        this._destroy = Module.cwrap('atagjs_destroy', 'number', []);
        // int atagjs_set_detector_options(float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose, int return_solutions); Sets the given detector options
        this._set_detector_options = Module.cwrap('atagjs_set_detector_options', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
        // int atagjs_set_pose_info(double fx, double fy, double cx, double cy); Sets the tag size (meters) and camera intrinsics (in pixels) for tag pose estimation
        this._set_pose_info = Module.cwrap('atagjs_set_pose_info', 'number', ['number', 'number', 'number', 'number']);
        // uint8_t* atagjs_set_img_buffer(int width, int height, int stride); Creates/changes size of the image buffer where we receive the images to process
        this._set_img_buffer = Module.cwrap('atagjs_set_img_buffer', 'number', ['number', 'number', 'number']);
        // t_str_json* atagjs_detect(); Detect tags in image previously stored in the buffer.
        // returns pointer to buffer starting with an int32 indicating the size of the remaining buffer (a string of chars with the json describing the detections)
        this._detect = Module.cwrap('atagjs_detect', 'number', []);

        // inits detector
        this._init();


        // set max_detections = 0, meaning no max; will return all detections
        // options: float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose, int return_solutions
        this._set_detector_options(
            this._opt.quad_decimate,
            this._opt.quad_sigma,
            this._opt.nthreads,
            this._opt.refine_edges,
            this._opt.max_detections,
            this._opt.return_pose,
            this._opt.return_solutions);

        this.onDetectorReadyCallback();
    }

    // **public** detect method
    detect(grayscaleImg, imgWidth, imgHeight) {
        // set_img_buffer allocates the buffer for image and returns it; just returns the previously allocated buffer if size has not changed
        const imgBuffer = this._set_img_buffer(imgWidth, imgHeight, imgWidth);
        if (imgWidth * imgHeight < grayscaleImg.length) return {result: 'Image data too large.'};
        this._Module.HEAPU8.set(grayscaleImg, imgBuffer); // copy grayscale image data
        const strJsonPtr = this._detect();
        /* detect returns a pointer to a t_str_json c struct as follows
            size_t len; // string length
            char *str;
            size_t alloc_size; // allocated size */
        const strJsonLen = this._Module.getValue(strJsonPtr, 'i32'); // get len from struct
        if (strJsonLen == 0) { // returned empty string
            return [];
        }
        const strJsonStrPtr = this._Module.getValue(strJsonPtr + 4, 'i32'); // get *str from struct
        const strJsonView = new Uint8Array(this._Module.HEAP8.buffer, strJsonStrPtr, strJsonLen);
        let detectionsJson = ''; // build this javascript string from returned characters
        for (let i = 0; i < strJsonLen; i++) {
            detectionsJson += String.fromCharCode(strJsonView[i]);
        }
        // console.log(detectionsJson);
        const detections = JSON.parse(detectionsJson);

        return detections;
    }

    // **public** set camera parameters
    set_camera_info(fx, fy, cx, cy) {
        this._set_pose_info(fx, fy, cx, cy);
    }

    // **public** set maximum detections to return (0=return all)
    set_max_detections(maxDetections) {
        this._opt.max_detections = maxDetections;
        this._set_detector_options(
            this._opt.quad_decimate,
            this._opt.quad_sigma,
            this._opt.nthreads,
            this._opt.refine_edges,
            this._opt.max_detections,
            this._opt.return_pose,
            this._opt.return_solutions);
    }

    // **public** set return pose estimate (0=do not return; 1=return)
    set_return_pose(returnPose) {
        this._opt.return_pose = returnPose;
        this._set_detector_options(
            this._opt.quad_decimate,
            this._opt.quad_sigma,
            this._opt.nthreads,
            this._opt.refine_edges,
            this._opt.max_detections,
            this._opt.return_pose,
            this._opt.return_solutions);
    }

    // **public** set return pose estimate alternative solution details (0=do not return; 1=return)
    set_return_solutions(returnSolutions) {
        this._opt.return_solutions = returnSolutions;
        this._set_detector_options(
            this._opt.quad_decimate,
            this._opt.quad_sigma,
            this._opt.nthreads,
            this._opt.refine_edges,
            this._opt.max_detections,
            this._opt.return_pose,
            this._opt.return_solutions);
    }
}

Comlink.expose(Apriltag);
