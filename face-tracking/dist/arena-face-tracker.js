(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["ARENAFaceTracker"] = factory();
	else
		root["ARENAFaceTracker"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./face-tracker-lib.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./face-tracker-lib.js":
/*!*****************************!*\
  !*** ./face-tracker-lib.js ***!
  \*****************************/
/*! exports provided: FaceTracker, GrayScaleMedia */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _face_tracker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./face-tracker.js */ "./face-tracker.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "FaceTracker", function() { return _face_tracker_js__WEBPACK_IMPORTED_MODULE_0__["FaceTracker"]; });

/* harmony import */ var _grayscale_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./grayscale.js */ "./grayscale.js");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "GrayScaleMedia", function() { return _grayscale_js__WEBPACK_IMPORTED_MODULE_1__["GrayScaleMedia"]; });





/***/ }),

/***/ "./face-tracker.js":
/*!*************************!*\
  !*** ./face-tracker.js ***!
  \*************************/
/*! exports provided: FaceTracker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FaceTracker", function() { return FaceTracker; });
class FaceTracker {
  constructor(width, height, init_callback, progress_callback) {
    let _this = this;

    this.ready = false;
    this._width = width;
    this._height = height;
    this._init_callback = init_callback;
    this._progress_callback = progress_callback;
    this._bboxLength = 4;
    this._landmarksLength = 2 * 68;
    this._featuresLength = this._landmarksLength + this._bboxLength;
    this._rotLength = 4;
    this._transLength = 3;
    this._poseLength = this._rotLength + this._transLength;
    FaceDetectorWasm().then(function (Module) {
      console.log("Face Detector WASM module loaded.");

      _this.onWasmInit(Module);

      _this.getShapePredictor();
    });
  }

  onWasmInit(Module) {
    this._Module = Module;
    this.initializeShapePredictor = this._Module.cwrap("pose_model_init", null, ["number", "number"]);
    this.detectFaceFeatures = this._Module.cwrap("detect_face_features", "number", ["number", "number", "number"]);
    this.findPose = this._Module.cwrap("get_pose", "number", ["number", "number", "number"]);
    this.imBuf = this._Module._malloc(this._width * this._height);
    this.landmarksPtr = this._Module._malloc(this._landmarksLength * Uint16Array.BYTES_PER_ELEMENT);
  }

  getShapePredictor(callback) {
    const req = new XMLHttpRequest();
    req.addEventListener('progress', e => this.shapePredictorProgress(e));
    req.open('GET', 'https://arena-cdn.conix.io/store/face-tracking/shape_predictor_68_face_landmarks_compressed.dat', true);
    req.responseType = "arraybuffer";

    req.onload = e => {
      const payload = req.response;

      if (payload) {
        this.shapePredictorInit(payload);
      }
    };

    req.send(null);
  }

  shapePredictorProgress(e) {
    if (e.lengthComputable) {
      const downloadProgress = e.loaded / e.total * 100;

      if (downloadProgress < 100) {
        this._progress_callback(downloadProgress);
      }
    } else {
      console.log("Cannot log face model download progress!");
    }
  }

  shapePredictorInit(data) {
    const model = new Uint8Array(data);

    const buf = this._Module._malloc(model.length);

    this._Module.HEAPU8.set(model, buf);

    this.initializeShapePredictor(buf, model.length);

    this._init_callback();

    this.ready = true;
  }

  detectFeatures(im) {
    this._Module.HEAPU8.set(im, this.imBuf); // console.time("features");


    const ptr = this.detectFaceFeatures(this.imBuf, this._width, this._height); // console.timeEnd("features");

    let features = new Uint16Array(this._Module.HEAPU16.buffer, ptr, this._featuresLength);
    const bbox = features.slice(0, this._bboxLength);
    const landmarksRaw = features.slice(this._bboxLength, this._featuresLength);

    this._Module._free(ptr);

    return {
      bbox: bbox,
      landmarks: landmarksRaw
    };
  }

  getPose(landmarks) {
    this._Module.HEAPU16.set(landmarks, this.landmarksPtr / Uint16Array.BYTES_PER_ELEMENT); // console.time("pose");


    const ptr = this.findPose(this.landmarksPtr, this._width, this._height); // console.timeEnd("pose");

    let pose = new Float64Array(this._Module.HEAPF64.buffer, ptr, this._featuresLength);
    const quat = pose.slice(0, this._rotLength);
    const trans = pose.slice(this._rotLength, this._poseLength);

    this._Module._free(ptr);

    return {
      rotation: quat,
      translation: trans
    };
  }

}

/***/ }),

/***/ "./grayscale.js":
/*!**********************!*\
  !*** ./grayscale.js ***!
  \**********************/
/*! exports provided: GrayScaleMedia */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "GrayScaleMedia", function() { return GrayScaleMedia; });
class GrayScaleMedia {
  constructor(source, width, height, canvas) {
    this._source = source;
    this._sourceType = typeof this._source;
    this._width = width;
    this._height = height;
    this._canvas = canvas ? canvas : document.createElement("canvas");
    this._canvas.width = width;
    this._canvas.height = height;
    this._flipImageProg = __webpack_require__(/*! ./shaders/flip-image.glsl */ "./shaders/flip-image.glsl");
    this._grayscaleProg = __webpack_require__(/*! ./shaders/grayscale.glsl */ "./shaders/grayscale.glsl");
    this.glReady = false;
    this.initGL(this._flipImageProg, this._grayscaleProg);
  }

  initGL(vertShaderSource, fragShaderSource) {
    this.gl = this._canvas.getContext("webgl");
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(vertShader, vertShaderSource);
    this.gl.shaderSource(fragShader, fragShaderSource);
    this.gl.compileShader(vertShader);
    this.gl.compileShader(fragShader);
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertShader);
    this.gl.attachShader(program, fragShader);
    this.gl.linkProgram(program);
    this.gl.useProgram(program);
    const vertices = new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    const positionLocation = this.gl.getAttribLocation(program, "position");
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionLocation);
    const texture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture); // if either dimension of image is not a power of 2

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.glReady = true;
    this.pixelBuf = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
    this.grayBuf = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight);
  }

  getFrame() {
    if (!this.glReady) return undefined;
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this._source);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixelBuf); // webgl returns flipped image, so we will need to flip image buffer to return the correct orientation

    let j = this.grayBuf.length - this.gl.drawingBufferWidth,
        k = 0;

    for (let i = 0; i < this.pixelBuf.length; i += 4) {
      this.grayBuf[j + k] = this.pixelBuf[i];
      k++;

      if (k == this.gl.drawingBufferWidth) {
        j -= this.gl.drawingBufferWidth;
        k = 0;
      }
    }

    return this.grayBuf;
  }

  requestStream() {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return reject();
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: {
            ideal: this._width
          },
          height: {
            ideal: this._height
          },
          aspectRatio: {
            ideal: this._width / this._height
          },
          facingMode: "environment"
        }
      }).then(stream => {
        this._source.srcObject = stream;

        this._source.onloadedmetadata = e => {
          this._source.play();

          resolve(this._source);
        };
      }).catch(err => {
        reject(err);
      });
    });
  }

}

/***/ }),

/***/ "./shaders/flip-image.glsl":
/*!*********************************!*\
  !*** ./shaders/flip-image.glsl ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "attribute vec2 position;\nvarying vec2 tex_coords;\nvoid main(void) {\ntex_coords = (position + 1.0) / 2.0;\ntex_coords.y = 1.0 - tex_coords.y;\ngl_Position = vec4(position, 0.0, 1.0);\n}"

/***/ }),

/***/ "./shaders/grayscale.glsl":
/*!********************************!*\
  !*** ./shaders/grayscale.glsl ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "precision highp float;\nuniform sampler2D u_image;\nvarying vec2 tex_coords;\nconst vec3 g = vec3(0.299, 0.587, 0.114);\nvoid main(void) {\nvec4 color = texture2D(u_image, tex_coords);\nfloat gray = dot(color.rgb, g);\ngl_FragColor = vec4(vec3(gray), 1.0);\n}"

/***/ })

/******/ });
});
//# sourceMappingURL=arena-face-tracker.js.map