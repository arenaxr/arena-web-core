/* eslint-disable no-throw-literal */
/**
 * @fileoverview Capture camera facing forward using getUserMedia
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2022, The CONIX Research Center. All rights reserved.
 * @date 2022
 */

import {CVWorkerMsgs} from '../worker-msgs.js';
import {GetUserMediaARSource} from './getusermedia-source.js';
import {ARENAUtils} from '../../../utils.js';

/**
 * Grab front facing camera frames using getUserMedia()
 */
export class WebARCameraCapture {
    static instance=null;
    /* worker to send images captured */
    cvWorker;

    video;
    canvas;
    canvasCtx;

    // last captured frame timestamp (Date.now())
    frameTs;
    // last captured frame width
    frameWidth;
    // last captured frame height
    frameHeight;
    // last captured frame grayscale image pixels (Uint8ClampedArray[width x height]);
    // this is the grayscale image we will pass to the detector
    frameGsPixels;
    // last captured frame RGBA pixels (Uint8ClampedArray[width x height x 4])
    framePixels;
    // last captured frame camera properties
    frameCamera;
    /* worker to send images captured */
    cvWorker;

    /**
     * Setup camera frame capture
     * @param {object} [cameraFacingMode='environment'] - as defined by MediaTrackConstraints.facingMode
     * @param {object} [debug=false] - debug messages on/off
     */
    constructor(cameraFacingMode='environment', debug=false) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw 'No getUserMedia support found for camera capture.';
        }

        // singleton
        if (WebARCameraCapture.instance) {
            return WebARCameraCapture.instance;
        }
        WebARCameraCapture.instance = this;

        this.frameWidth = 1280;
        this.frameHeight = 720;
        const options = {
            cameraFacingMode: cameraFacingMode,
            width: this.frameWidth,
            height: this.frameHeight,
        };
        this.arSource = new GetUserMediaARSource(options);
    }

    /**
     * Start camera capture
     */
    initCamera() {
        return new Promise((resolve, reject) => {
            this.arSource.init()
                .then((videoElem) => {
                    this.video = videoElem;
                    document.body.appendChild(videoElem);

                    this.canvas = document.createElement('canvas');
                    this.canvasCtx = this.canvas.getContext('2d');

                    // init frame size to screen size
                    this.onResize();
                    window.addEventListener('resize', this.onResize.bind(this));

                    resolve(this);
                })
                .catch((err) => {
                    console.warn(err);
                    reject(err);
                });
        });
    }

    /**
     * When device's screen changes size/changes orientation, handle screen size changes
     * @private
     */
    onResize() {
        this.arSource.resize(window.innerWidth, window.innerHeight);
        this.arSource.copyDimensionsTo(this.canvas);

        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;

        if (ARENAUtils.isLandscapeMode()) {
            this.frameWidth = Math.max(videoWidth, videoHeight);
            this.frameHeight = Math.min(videoWidth, videoHeight);
        } else {
            this.frameWidth = Math.min(videoWidth, videoHeight);
            this.frameHeight = Math.max(videoWidth, videoHeight);
        }

        this.canvas.width = this.frameWidth;
        this.canvas.height = this.frameHeight;

        const sceneEl = document.querySelector('a-scene');
        sceneEl.setAttribute('arena-webar-session', 'frameWidth', this.frameWidth);
        sceneEl.setAttribute('arena-webar-session', 'frameHeight', this.frameHeight);

        this.frameGsPixels = new Uint8ClampedArray(
            this.frameWidth * this.frameHeight,
        ); // grayscale (1 value per pixel)

        // update camera intrinsics
        this.frameCamera = this.getCameraIntrinsics();
    }

    /**
     * Indicate CV worker to send frames to (ar marker system expects this call to be implemented)
     * @param {object} worker - the worker instance to whom we post frame messages
     * @param {boolean} [frameRequested=true] - set request frame flag
     */
    setCVWorker(worker, frameRequested = true) {
        this.cvWorker = worker;

        if (frameRequested) requestAnimationFrame(this.getCameraImagePixels.bind(this));
    }

    /**
     * Request next camera frame; we let the CV worker indicate when its ready (ar marker system expects this
     * call to be implemented)
     * @param {object} [grayscalePixels=undefined] - the pixel buffer intance we posted (to return ownership to us)
     * @param {boolean} [worker=undefined] - the worker instance to send frames to
     */
    requestCameraFrame(grayscalePixels = undefined, worker = undefined) {
        if (grayscalePixels) {
            this.frameGsPixels = grayscalePixels;
        }
        if (worker) this.cvWorker = worker;
        requestAnimationFrame(this.getCameraImagePixels.bind(this));
    }

    /**
     * Process received frames to extract grayscale pixels and post them to cv worker
     * @param {object} time - DOMHighResTimeStamp of the frame
     * @private
     */
    async getCameraImagePixels(time) {
        let imageData;
        try {
            this.canvasCtx.drawImage(this.video, 0, 0, this.frameWidth, this.frameHeight);
            imageData = this.canvasCtx.getImageData(0, 0, this.frameWidth, this.frameHeight);
        } catch (err) {
            console.warn('Failed to get video frame. Video not started ?', err);
            setTimeout(getCameraImagePixels.bind(this), 1000); // try again..
            return;
        }
        const imageDataPixels = imageData.data;

        for (let i = 0, j = 0; i < imageDataPixels.length; i += 4, j++) {
            const grayscale = Math.round((imageDataPixels[i] + imageDataPixels[i + 1] + imageDataPixels[i + 2]) / 3);
            this.frameGsPixels[j] = grayscale; // single grayscale value
        }
        /*
    if (this.debug) {
        let dbgCanvas = document.getElementById('debug_canvas');
        dbgCanvas.width = this.frameWidth;
        dbgCanvas.height = this.frameHeight;
        let ctx = dbgCanvas.getContext("2d");
        ctx.putImageData(imageData, 0, 0);
    }
    */
        // construct cam frame data to send to worker
        const camFrameMsg = {
            type: CVWorkerMsgs.type.PROCESS_GSFRAME,
            // timestamp
            ts: time,
            // image width
            width: this.frameWidth,
            // image height
            height: this.frameHeight,
            // grayscale image pixels we will pass to the detector (Uint8ClampedArray[width x height])
            grayscalePixels: this.frameGsPixels,
            // camera properties
            camera: this.frameCamera,
        };

        // post frame data, marking the pixel buffer as transferable
        this.cvWorker.postMessage(camFrameMsg, [
            camFrameMsg.grayscalePixels.buffer,
        ]);
    }

    /**
     * Compute camera intrisics from a pre-defined projection matrix
     * @return {object} - camera intrinsics object with camera's focal length (fx, fy),
     *                    principal point (cx, cy) and gamma
     * @private
     */
    getCameraIntrinsics() {
        return {
            // Focal lengths in pixels (these are equal for square pixels)
            cx: (this.frameWidth / 2),
            cy: (this.frameHeight / 2),
            // Principal point in pixels (typically at or near the center of the viewport)
            fx: this.frameWidth,
            fy: this.frameWidth,
            // Skew factor in pixels (nonzero for rhomboid pixels)
            gamma: 0,
        };
    }
}

