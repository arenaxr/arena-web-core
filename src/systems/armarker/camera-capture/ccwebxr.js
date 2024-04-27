/* eslint-disable no-throw-literal */
/**
 * @fileoverview Capture passthrough camera frames using WebXR Raw Camera Access API
 * WebXR Raw Camera Access API available in Chrome as off June 2021:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1090056)
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

import CVWorkerMsgs from '../worker-msgs';

/**
 * Grab camera frames using WebXR Raw Camera Access API
 */
export default class WebXRCameraCapture {
    /* singleton instance */
    static instance = null;

    /* debug flag */
    debug;

    /* element created for debugging */
    debugEl;

    /* pixel ratio for the debug object */
    dbgPixelRatio;

    /* cv worker requested another frame */
    frameRequested = true;

    /* gl context */
    gl;

    /* XRWebGLBinding used for camera access */
    glBinding;

    /* frame buffer used to write the camera texture */
    fb;

    /* reference space returned on xr session start */
    xrRefSpace;

    /* last captured frame width */
    frameWidth;

    /* last captured frame height */
    frameHeight;

    /* last captured frame grayscale image pixels (Uint8ClampedArray[width x height]);
       this is the grayscale image we will pass to the detector */
    frameGsPixels;

    /* last captured frame RGBA pixels (Uint8ClampedArray[width x height x 4]) */
    framePixels;

    /* last captured frame camera properties */
    frameCamera;

    /* last received detections (debug only) */
    lastDetections;

    /* worker to send images captured */
    cvWorker;

    // This is offscreenCanvas, but we use same name across all pipelines
    canvas;

    offScreenImageData;

    /**
     * Setup camera frame capture
     * @param {object} xrSession -  WebXR Device API's XRSession
     * @param {object} gl - the open gl context
     * @param {boolean} debug - debug messages on/off
     */
    constructor(xrSession, gl, debug = false) {
        // singleton
        if (WebXRCameraCapture.instance) {
            return WebXRCameraCapture.instance;
        }
        WebXRCameraCapture.instance = this;

        if (xrSession === undefined) throw 'WebXRCC: No XRSession!';
        if (gl === undefined) throw 'WebXRCC: No gl handle!';

        if (debug) {
            const cameraEl = document.getElementById('my-camera'); // assume camera is called 'my-camera' (ARENA)
            if (cameraEl) {
                // create object for debug (plane where we texture map the camera pixels)
                this.debugEl = document.createElement('a-entity');
                this.debugEl.setAttribute('geometry', 'primitive: plane; width:.05; height: .05;');
                this.debugEl.setAttribute('material', 'color: white; opacity: .8');
                // this.debugEl.setAttribute("position", "0 0 -.057");
                this.debugEl.setAttribute('position', '.05 .02 -.15');
                cameraEl.appendChild(this.debugEl);
                this.dbgPixelRatio = 25000; // determined by looking at the screen size
                this.debug = true;
            } else {
                console.warn('Could not find `my-camera` element for debug.');
                this.debug = false;
            }
            this.lastDetections = undefined;
        }

        this.gl = gl;

        this.onXRFrame = this.onXRFrame.bind(this);
        this.updateOffscreenCanvas = this.updateOffscreenCanvas.bind(this);

        const WebGlBinding = window.XRWebGLBinding;
        // check if we have webXR camera capture available
        if (WebGlBinding) {
            this.glBinding = new WebGlBinding(xrSession, gl);
            if (this.glBinding && this.glBinding.getCameraImage) {
                this.fb = gl.createFramebuffer();
                const webxrSystem = document.getElementById('ARENAScene').systems.webxr;
                xrSession.requestReferenceSpace(webxrSystem.sessionReferenceSpaceType).then((xrRefSpace) => {
                    this.xrRefSpace = xrRefSpace;
                    xrSession.requestAnimationFrame(this.onXRFrame);
                });
            } else throw 'WebXRCC: WebXR camera access not found!';
        } else throw 'WebXRCC: XRWebGLBinding not found!';
    }

    /**
     * Indicate CV worker to send frames to (ar marker system expects this call to be implemented)
     * @param {object} worker - the worker instance to whom we post frame messages
     * @param {boolean} [frameRequested=true] - set request frame flag
     */
    setCVWorker(worker, frameRequested = true) {
        this.cvWorker = worker;

        if (frameRequested) this.frameRequested = true;

        if (this.debug) {
            // listen for detection messages too so we can draw the corners
            this.cvWorker.addEventListener('message', this.cvWorkerMessage.bind(this));
        }
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

        if (worker) this.setCVWorker(worker);
        else this.frameRequested = true;
    }

    /**
     * Compute camera intrisics from a projection matrix and viewport
     * https://storage.googleapis.com/chromium-webxr-test/r886480/proposals/camera-access-barebones.html
     * @param {object} projectionMatrix - the view's projection matrix
     * @param {object} viewport - the viewport
     * @return {object} - camera's focal length (fx, fy), principal point (cx, cy) and skew (gamma)
     * @private
     */
    getCameraIntrinsics(projectionMatrix, viewport) {
        const p = projectionMatrix;
        return {
            // Focal lengths in pixels (these are equal for square pixels)
            fx: (viewport.width / 2) * p[0],
            fy: (viewport.height / 2) * p[5],
            // Principal point in pixels (typically at or near the center of the viewport)
            cx: ((1 - p[8]) * viewport.width) / 2 + viewport.x,
            cy: ((1 - p[9]) * viewport.height) / 2 + viewport.y,
            // Skew factor in pixels (nonzero for rhomboid pixels)
            gamma: (viewport.width / 2) * p[4],
        };
    }

    /**
     * Gets or creates a new offscreenCanvas
     */
    getOffscreenCanvas() {
        if (!this.canvas) {
            this.canvas = new OffscreenCanvas(this.frameWidth, this.frameHeight);
            this.offScreenImageData = this.canvas.getContext('2d').createImageData(this.frameWidth, this.frameHeight);
        }
        return this.canvas;
    }

    updateOffscreenCanvas() {
        const canvas = this.getOffscreenCanvas();
        canvas.width = this.frameWidth;
        canvas.height = this.frameHeight;
        if (this.offScreenImageData.width !== this.frameWidth || this.offScreenImageData.height !== this.frameHeight) {
            this.offScreenImageData = this.canvas.getContext('2d').createImageData(this.frameWidth, this.frameHeight);
        }
        this.offScreenImageData.data.set(this.framePixels);
        canvas.getContext('2d').putImageData(this.offScreenImageData, 0, 0);
        return true;
    }

    /**
     * Process received frames to extract grayscale pixels and post them to cv worker
     * @param {object} time - DOMHighResTimeStamp of the frame
     * @param {object} session -  XRSession for the frame
     * @param {object} view - WebXR view for the frame
     * @private
     */
    getCameraFramePixels(time, session, view) {
        const glLayer = session.renderState.baseLayer;
        // check if camera frame changed size
        if (
            this.frameCamera === undefined ||
            this.frameWidth !== view.camera.width ||
            this.frameHeight !== view.camera.height
        ) {
            // const viewport = glLayer.getViewport(view);

            this.frameWidth = view.camera.width;
            this.frameHeight = view.camera.height;
            this.framePixels = new Uint8ClampedArray(this.frameWidth * this.frameHeight * 4); // RGBA image (4 values per pixel)
            this.frameGsPixels = new Uint8ClampedArray(this.frameWidth * this.frameHeight); // grayscale (1 value per pixel)

            const cameraViewport = {
                width: this.frameWidth,
                height: this.frameHeight,
                x: 0,
                y: 0,
            };
            // update camera intrinsics
            this.frameCamera = this.getCameraIntrinsics(view.projectionMatrix, cameraViewport);
        }

        // get camera image as texture
        const texture = this.glBinding.getCameraImage(view.camera);

        // bind the framebuffer, attach texture and read pixels
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb);
        // this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
        this.gl.readPixels(
            0,
            0,
            this.frameWidth,
            this.frameHeight,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.framePixels
        );
        // bind back to xr session's framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, glLayer.framebuffer);

        // grayscale and mirror image
        for (let r = this.frameWidth * (this.frameHeight - 1), j = 0; r >= 0; r -= this.frameWidth) {
            for (let i = r * 4; i < (r + this.frameWidth) * 4; i += 4) {
                this.frameGsPixels[j++] = this.framePixels[i + 1];
            }
        }

        if (this.debug) {
            // draw last detection corners
            if (this.lastDetections && this.lastDetections[0]) {
                for (let j = 0; j < this.lastDetections.length; j++) {
                    for (let c = 0; c < 4; c++) {
                        const x = Math.floor(this.lastDetections[j].corners[c].x);
                        const y = Math.floor(this.frameHeight - this.lastDetections[j].corners[c].y);
                        for (let dx = x - 20; dx <= x + 20; dx++) {
                            for (let dy = y - 20; dy <= y + 20; dy++) {
                                const i = (dy * this.frameWidth + dx) * 4;
                                this.framePixels[i] = 255;
                                this.framePixels[i + 1] = 0;
                                this.framePixels[i + 2] = 0;
                                this.framePixels[i + 3] = 255;
                            }
                        }
                    }
                }
            }

            const tTexture = new THREE.DataTexture(
                this.framePixels,
                this.frameWidth,
                this.frameHeight,
                THREE.RGBAFormat
            );
            this.debugEl.setAttribute('geometry', 'width', this.frameWidth / this.dbgPixelRatio);
            this.debugEl.setAttribute('geometry', 'height', this.frameHeight / this.dbgPixelRatio);
            const mesh = this.debugEl.getObject3D('mesh');
            mesh.material.map = tTexture;
            mesh.material.needsUpdate = true;
        }

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

        // if (this.debug) console.log(`Post frame to worker: ${this.frameWidth}x${this.frameHeight}`);
        // post frame data, marking the pixel buffer as transferable
        this.cvWorker.postMessage(camFrameMsg, [camFrameMsg.grayscalePixels.buffer]);
    }

    /**
     * animationFrameCallback on a new frame
     * @param {object} time - the time at which the updated viewer state was received from the device
     * @param {object} frame - XRFrame object describing the state of the objects being tracked by the session
     * @private
     */
    onXRFrame(time, frame) {
        const { session } = frame;
        session.requestAnimationFrame(this.onXRFrame);
        if (!this.frameRequested) return;

        const pose = frame.getViewerPose(this.xrRefSpace);
        if (!pose) return;
        pose.views.forEach((view) => {
            if (view.camera) {
                // only capture next frame on request
                this.frameRequested = false;

                this.getCameraFramePixels(time, session, view);
            }
        });
    }

    /**
     * CV Worker message callback; save last detections (debug only)
     * @param {object} msg - msg.data contains a cv worker msg with the detections
     * @private
     */
    cvWorkerMessage(msg) {
        const cvWorkerMsg = msg.data;
        if (cvWorkerMsg.detections) this.lastDetections = cvWorkerMsg.detections;
    }
}
