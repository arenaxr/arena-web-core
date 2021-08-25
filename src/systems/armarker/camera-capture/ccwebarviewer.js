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

 /**
  *
  */
 export class WebARViewerCameraCapture {
     static instance = null;
     /* last captured frame width */
     frameWidth;
     /* last captured frame height */
     frameHeight;
     /* last captured frame grayscale image pixels (Uint8ClampedArray[width x height]); this is the grayscale image we will pass to the detector */
     frameGsPixels;
     /* last captured frame camera properties */
     frameCamera;
     /* cv worker requested another frame */
     frameRequested = true;
     /* worker to send images captured */
     cvWorker;
 
     /**
      * Setup camera frame capture
      */
     constructor(debug = false) {
         // singleton
         if (WebARViewerCameraCapture.instance) {
             return WebARViewerCameraCapture.instance;
         }
         WebARViewerCameraCapture.instance = this;
 
         console.log("**HERE");
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
      * Request next camera frame; we let the CV worker indicate when its ready (ar marker system expects this call to be implemented)
      * @param {object} [grayscalePixels=undefined] - the pixel buffer intance we posted (to return ownership to us)
      * @param {boolean} [requestFrame=undefined] - replace the worker instance to send frames to
      */
     requestCameraFrame(grayscalePixels = undefined, worker = undefined) {
         if (grayscalePixels)
             this.frameGsPixels = grayscalePixels;
         if (worker) this.cvWorker = worker;
         this.frameRequested = true;
     }
 
     /*
      * WebXRViewer/WebARViewer deliver camera frames to this 'processCV' function
      * @param {object} frame - the frame object given by WebXRViewer/WebARViewer
      */
     async processCV(frame) {
         console.log("frame!");
         if (!this.frameRequested) return;
 
         this.getCameraImagePixels(frame);
     }
 
     /*
      * Process received frames to extract grayscale pixels and post them to cv worker
      * @param {object} frame - the frame object given by WebXRViewer/WebARViewer
      */
     getCameraImagePixels(frame) {
 
         // check if camera frame changed size
         if (
             this.frameCamera == undefined ||
             this.frameWidth != frame._buffers[0].size.width ||
             this.frameHeight != frame._buffers[0].size.height
         ) {
             //const viewport = session.renderState.baseLayer.getViewport(view);
 
             this.frameWidth = frame._buffers[0].size.width;
             this.frameHeight = frame._buffers[0].size.height;
             this.frameGsPixels = new Uint8ClampedArray(
                 this.frameWidth * this.frameHeight
             ); // grayscale (1 value per pixel)
 
             // update camera intrinsics
             this.frameCamera = this.getCameraIntrinsics(frame._camera);
         }
 
         // frame is received as base64; convert to a YUV byteArray
         const byteArray = Base64Binary.decodeArrayBuffer(frame._buffers[bufIndex]._buffer);
         // cut U and V values; grayscale image is just the Y values
         this.frameGsPixels.set(byteArray.slice(0, imgWidth * imgHeight));
 
         // construct cam frame data to send to worker
         let camFrameMsg = {
             type: CVWorkerMsgs.type.PROCESS_GSFRAME,
             // timestamp 
             ts: Date.now(),
             // image width
             width: this.frameWidth,
             // image height
             height: this.frameHeight,
             // grayscale image pixels we will pass to the detector (Uint8ClampedArray[width x height])
             grayscalePixels: this.frameGsPixels,
             // camera properties
             camera: this.frameCamera
         };
 
         // post frame data to worker, marking the pixel buffer as transferable
         this.cvWorker.postMessage(camFrameMsg, [camFrameMsg.grayscalePixels.buffer]);
     }
 
     /*
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
             gamma: 0
         };
     }
 
 }
 /*
 window.processCV = async function(frame) {
   console.log("##FRAME");
 }*/