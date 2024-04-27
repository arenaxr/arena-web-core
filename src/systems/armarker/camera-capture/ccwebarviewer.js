/**
 * @fileoverview Camera capture for custom iOS browser (WebXRViewer/WebARViewer)
 * https://apps.apple.com/us/app/webxr-viewer/id1295998056
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */
import { Base64Binary } from './base64-binary';
import CVWorkerMsgs from '../worker-msgs';

/**
 *
 */
export default class WebARViewerCameraCapture {
    static instance = null;

    /* y buffer we process in the frames received  */
    yBuffIndex = 0;

    /* uv buffer we process in the frames received  */
    uvBuffIndex = 1;

    /* last captured frame width */
    frameWidth;

    /* last captured frame height */
    frameHeight;

    /* last captured frame grayscale image pixels (Uint8ClampedArray[width x height]);
        this is the grayscale image we will pass to the detector */
    frameGsPixels = undefined;

    /* last captured frame camera properties */
    frameCamera = undefined;

    /* cv worker requested another frame */
    frameRequested = true;

    /* worker to send images captured */
    cvWorker;

    canvas;

    offScreenImageData;

    yByteArray;

    uvByteArray;

    /**
     * Setup camera frame capture
     */
    constructor() {
        // singleton
        if (WebARViewerCameraCapture.instance) {
            return WebARViewerCameraCapture.instance;
        }
        WebARViewerCameraCapture.instance = this;

        // WebXRViewer/WebARViewer deliver camera frames to 'processCV'
        window.processCV = this.processCV.bind(this);
        this.updateOffscreenCanvas = this.updateOffscreenCanvas.bind(this);

        // For no obvious reason, parcel is optimizing away the import of Base64Binary, so we force include here...
        try {
            console.debug(Base64Binary, Base64Binary.decodeArrayBuffer());
        } catch {
            //
        }
    }

    /**
     * Indicate CV worker to send frames to (ar marker system expects this call to be implemented)
     * @param {object} worker - the worker instance to whom we post frame messages
     * @param {boolean} [requestFrame=true] - set request frame flag
     */
    setCVWorker(worker, requestFrame = true) {
        this.cvWorker = worker;

        if (requestFrame) this.frameRequested = true;
    }

    /**
     * Request next camera frame; we let the CV worker indicate when its ready
     * (ar marker system expects this call to be implemented)
     * @param {object} [grayscalePixels=undefined] - the pixel buffer intance we posted (to return ownership to us)
     * @param {boolean} [worker=undefined] - replace the worker instance to send frames to
     */
    requestCameraFrame(grayscalePixels = undefined, worker = undefined) {
        if (grayscalePixels) {
            this.frameGsPixels = grayscalePixels;
        }
        if (worker) this.cvWorker = worker;
        this.frameRequested = true;
    }

    /**
     * WebXRViewer/WebARViewer deliver camera frames to this 'processCV' function
     * @param {object} frame - the frame object given by WebXRViewer/WebARViewer
     * @example <caption>Frame object example:</caption>
     * {
     * "_buffers": [{
     * "size": {
     *     "bytesPerRow": 320,
     *     "width": 320,
     *     "height": 180,
     *     "bytesPerPixel": 1
     * },
     * "buffer": null,
     * "_buffer": ""  // base64-encoded image buffer
     * }, {
     * "size": {
     *     "bytesPerRow": 320,
     *     "width": 160,
     *     "bytesPerPixel": 2,
     *     "height": 90
     * },
     * "buffer": null,
     * "_buffer": "..." // base64-encoded image buffer
     * }],
     * "_pixelFormat": "YUV420P",
     * "_timestamp": 56838.57325050002,
     * "_camera": {
     * "cameraIntrinsics": [246.94888305664062, 0, 0, 0, 246.94888305664062,
     *                      0, 154.91513061523438, 89.52093505859375, 1],
     * "interfaceOrientation": 1,
     * "cameraImageResolution": {
     *     "height": 720,
     *     "width": 1280
     * },
     * "viewMatrix": [ ... ], // 4x4 matrix as an 16-element array
     * "inverse_viewMatrix": [ ... ], // 4x4 matrix as an 16-element array
     * "projectionMatrix": [ ... ], // 4x4 matrix as an 16-element array
     * "arCamera": true,
     * "cameraOrientation": -90
     * }
     * };
     */
    async processCV(frame) {
        if (!this.frameRequested) return;

        // only capture next frame on request
        this.frameRequested = false;

        this.getCameraImagePixels(frame);
    }

    /**
     * Process received frames to extract grayscale pixels and post them to cv worker
     * @param {object} frame - the frame object given by WebXRViewer/WebARViewer
     */
    getCameraImagePixels(frame) {
        // we expect the image at _buffers[this.yBuffIndex]
        if (!frame._buffers[this.yBuffIndex]) {
            console.warn('No image buffer received.');
            return;
        }
        // check if camera frame changed size
        if (
            this.frameGsPixels === undefined ||
            this.frameCamera === undefined ||
            this.frameWidth !== frame._buffers[this.yBuffIndex].size.width ||
            this.frameHeight !== frame._buffers[this.yBuffIndex].size.height
        ) {
            this.frameWidth = frame._buffers[this.yBuffIndex].size.width;
            this.frameHeight = frame._buffers[this.yBuffIndex].size.height;
            this.frameGsPixels = new Uint8Array(this.frameWidth * this.frameHeight); // grayscale (1 value per pixel)

            // update camera intrinsics
            this.frameCamera = this.getCameraIntrinsics(frame._camera);
        }

        // frame is received as a YUV pixel buffer that is base64 encoded;
        // convert to a YUV Uint8Array and get grayscale pixels
        const yArrayBuffer = Base64Binary.decodeArrayBuffer(frame._buffers[this.yBuffIndex]._buffer);
        this.yByteArray = new Uint8Array(yArrayBuffer);
        const uvArrayBuffer = Base64Binary.decodeArrayBuffer(frame._buffers[this.uvBuffIndex]._buffer);
        this.uvByteArray = new Uint8Array(uvArrayBuffer);
        // grayscale image is just the Y values
        for (let i = 0; i < this.frameWidth * this.frameHeight; i++) {
            this.frameGsPixels[i] = this.yByteArray[i];
        }

        // construct cam frame data to send to worker
        const camFrameMsg = {
            type: CVWorkerMsgs.type.PROCESS_GSFRAME,
            // timestamp
            ts: frame._timestamp,
            // image width
            width: this.frameWidth,
            // image height
            height: this.frameHeight,
            // grayscale image pixels we will pass to the detector (Uint8ClampedArray[width x height])
            grayscalePixels: this.frameGsPixels,
            // camera properties
            camera: this.frameCamera,
        };

        // if (this.debug) console.log(`Post frame to worker: ${this.frameWidth}x${this.frameHeight}`);
        // post frame data to worker, marking the pixel buffer as transferable
        this.cvWorker.postMessage(camFrameMsg, [camFrameMsg.grayscalePixels.buffer]);
    }

    /**
     * Extract camera intrinsics from matrix provided by WebXRViewer/WebARViewer
     * @param {object} camera - the frame's camera object given by WebXRViewer/WebARViewer
     * @return {object} - camera's focal length (fx, fy) and principal point (cx, cy)
     */
    getCameraIntrinsics(camera) {
        return {
            // Focal lengths in pixels (these are equal for square pixels)
            fx: camera.cameraIntrinsics[0],
            fy: camera.cameraIntrinsics[4],
            // Principal point in pixels (typically at or near the center of the viewport)
            cx: camera.cameraIntrinsics[6],
            cy: camera.cameraIntrinsics[7],
            // Skew factor in pixels
            gamma: 0,
        };
    }

    getOffscreenCanvas() {
        if (!this.canvas) {
            this.canvas = new OffscreenCanvas(this.frameWidth, this.frameHeight);
            this.offScreenImageData = this.canvas.getContext('2d').createImageData(this.frameWidth, this.frameHeight);
        }
        return this.canvas;
    }

    updateOffscreenCanvas() {
        const { yByteArray, uvByteArray, frameWidth, frameHeight } = this;
        if (!yByteArray) return false;
        const canvas = this.getOffscreenCanvas();
        canvas.width = frameWidth;
        canvas.height = frameHeight;

        const ySize = frameWidth * frameHeight;
        const uvWidth = frameWidth >> 1;
        const rgbData = new Uint8ClampedArray(ySize * 4);

        // Convert yByteArray from YUV to RGB and set it to the canvas.
        // Assuming we're working with YUV420p (?)

        for (let y = 0; y < frameHeight; y++) {
            for (let x = 0; x < frameWidth; x++) {
                const xyIndex = y * frameWidth + x;

                // (y // 2) * (width // 2) + (x // 2);
                const uvIndex = ((y >> 1) * uvWidth + (x >> 1)) << 1; // Subsampled 4:2:0, but each UV is 2 bytes

                const yVal = yByteArray[xyIndex];
                const uVal = uvByteArray[uvIndex] - 128; // First byte is U
                const vVal = uvByteArray[uvIndex + 1] - 128; // Second byte is V

                // Ref: https://developer.apple.com/documentation/arkit/arkit_in_ios/displaying_an_ar_experience_with_metal#2891878
                /* (tranposed matrix)
                const float4x4 ycbcrToRGBTransform = float4x4(
                    float4(+1.0000f, +1.0000f, +1.0000f, +0.0000f),
                    float4(+0.0000f, -0.3441f, +1.7720f, +0.0000f),
                    float4(+1.4020f, -0.7141f, +0.0000f, +0.0000f),
                    float4(-0.7010f, +0.5291f, -0.8860f, +1.0000f)  // For some reason, this row is ignored
                );
                 */
                const R = yVal + 1.402 * vVal;
                const G = yVal - 0.3441 * uVal - 0.7141 * vVal;
                const B = yVal + 1.772 * uVal;

                const rgbaIndex = xyIndex * 4;
                rgbData[rgbaIndex] = R;
                rgbData[rgbaIndex + 1] = G;
                rgbData[rgbaIndex + 2] = B;
                rgbData[rgbaIndex + 3] = 255; // Alpha always full
            }
        }
        if (this.offScreenImageData.width !== this.frameWidth || this.offScreenImageData.height !== this.frameHeight) {
            this.offScreenImageData = this.canvas.getContext('2d').createImageData(this.frameWidth, this.frameHeight);
        }
        this.offScreenImageData.data.set(rgbData);
        canvas.getContext('2d').putImageData(this.offScreenImageData, 0, 0);
        return true;
    }
}
