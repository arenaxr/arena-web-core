/* global AFRAME */

/**
 * @fileoverview Camera capture for custom iOS browser (WebXRViewer/WebARViewer)
 * https://apps.apple.com/us/app/webxr-viewer/id1295998056
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/**
 *
 */
export default class WebARViewerCameraCapture {
  static #instance=null;
  /* ARMarker system instance */
  #arMarkerSystem;
  /* last captured frame width */
  #frameWidth;
  /* last captured frame height */
  #frameHeight;
  /* last captured frame grayscale image pixels (Uint8ClampedArray[width x height]); this is the grayscale image we will pass to the detector */
  #frameGsPixels;
  /* last captured frame RGBA pixels (Uint8ClampedArray[width x height x 4]) */
  #framePixels;
  /* last captured frame camera properties:
      {
        // Focal lengths in pixels (these are equal for square pixels)
        fx, fy;
        // Principal point in pixels (typically at or near the center of the viewport)
        cx, cy;
        // Skew factor in pixels (nonzero for rhomboid pixels)
        gamma: (viewport.width / 2) * p[4]
      }  
  */
  #frameCamera;
  /* cv worker requested another frame */
  #frameRequested = true;
  /* worker to send images captured */
  #cvWorker;

  /**
   */
  constructor(debug=false) { 
    // singleton
    if (WebARViewerCameraCapture.#instance) {
      return WebARViewerCameraCapture.#instance;
    }
    WebARViewerCameraCapture.#instance = this;
    
    throw 'Not implemented yet.';
  }

  setCVWorker(worker, requestFrame=true) {
    this.#cvWorker = worker;
    
    if (requestFrame) this.#frameRequested = true;
  }

  requestCameraFrame(worker=undefined) {
    if (worker) this.#cvWorker = worker;
    this.#frameRequested = true;
  }

  #getCameraImagePixels() {
    if (!this.#frameRequested) return;
    
    //...
    
    // construct cam frame data to send to worker
    let camFrameMsg = {
      type: CVWorkerMsgs.type.PROCESS_GSFRAME,
      // timestamp 
      ts: Date.now(), 
      // image width
      width: this.#frameWidth,
      // image height
      height: this.#frameHeight,
      // grayscale image pixels we will pass to the detector (Uint8ClampedArray[width x height])
      grayscalePixels: this.#frameGsPixels,
      // camera properties
      camera: this.#frameCamera
    };    
    
    // post frame data to worker, marking the pixel buffer as transferable
    this.#cvWorker.postMessage( camFrameMsg, [camFrameMsg.grayscalePixels.buffer] );    
  }

  #getCameraIntrinsics(projectionMatrix, viewport) {
  }
}
