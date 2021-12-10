/* global AFRAME */

/**
 * @fileoverview Camera capture for custom iOS browser (WebXRViewer/WebARViewer)
 * https://apps.apple.com/us/app/webxr-viewer/id1295998056
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */
import {Base64Binary} from './base64-binary.js';
import {CVWorkerMsgs} from '../worker-msgs.js';

/**
  *
  */
export class WebARViewerCameraCapture {
     static instance = null;
     /* buffer we process in the frames received  */
     buffIndex = 0;
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

     /**
      * Setup camera frame capture
      * @param {boolean} [debug=false] - debug messages on/off
      */
     constructor(debug = false) {
         // singleton
         if (WebARViewerCameraCapture.instance) {
             return WebARViewerCameraCapture.instance;
         }
         WebARViewerCameraCapture.instance = this;

         // WebXRViewer/WebARViewer deliver camera frames to 'processCV'
         window.processCV = this.processCV.bind(this);
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
         // we expect the image at _buffers[this.buffIndex]
         if (!frame._buffers[this.buffIndex]) {
             console.warn('No image buffer received.');
             return;
         }
         // check if camera frame changed size
         if ( this.frameGsPixels == undefined ||
             this.frameCamera == undefined ||
             this.frameWidth != frame._buffers[this.buffIndex].size.width ||
             this.frameHeight != frame._buffers[this.buffIndex].size.height
         ) {
             this.frameWidth = frame._buffers[this.buffIndex].size.width;
             this.frameHeight = frame._buffers[this.buffIndex].size.height;
             this.frameGsPixels = new Uint8Array(
                 this.frameWidth * this.frameHeight,
             ); // grayscale (1 value per pixel)

             // update camera intrinsics
             this.frameCamera = this.getCameraIntrinsics(frame._camera);
         }

         // frame is received as a YUV pixel buffer that is base64 encoded;
         // convert to a YUV Uint8Array and get grayscale pixels
         const byteArray = Base64Binary.decodeArrayBuffer(frame._buffers[this.buffIndex]._buffer);
         const byteArrayView = new Uint8Array(byteArray);
         // grayscale image is just the Y values (first this.frameWidth * this.frameHeight values)
         for (let i = 0; i<this.frameWidth * this.frameHeight; i++) {
             this.frameGsPixels[i] = byteArrayView[i];
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
}
