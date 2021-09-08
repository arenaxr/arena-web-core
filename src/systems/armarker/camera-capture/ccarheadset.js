/* global AFRAME */

/**
 * @fileoverview Capture camera facing forward using getUserMedia
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

 import {CVWorkerMsgs} from '../worker-msgs.js';

/**
 * Grab front facing camera frames using getUserMedia()
 */
 export class ARHeadsetCameraCapture {
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
    // last captured frame grayscale image pixels (Uint8ClampedArray[width x height]); this is the grayscale image we will pass to the detector
    frameGsPixels;
    // last captured frame RGBA pixels (Uint8ClampedArray[width x height x 4])
    framePixels;
    // last captured frame camera properties
    frameCamera;
    /* worker to send images captured */
    cvWorker;  
  
    /* projection matrices for supported headsets [TODO: get real values] */
    headsetPM = { ml: [ 2.842104,  0,         0,         0,
                        0,         3.897521,  0,         0,
                        -0.000893, -0.004491, -1.171066, -1,
                        0,         0,         -0.839120, 0 ],
                  hl: [ 2.842104,  0,         0,         0,
                        0,         3.897521,  0,         0,
                        -0.000893, -0.004491, -1.171066, -1,
                        0,         0,         -0.839120, 0 ],                                                 
                };
    /* selected projection matrix for device */
    projectionMatrix;

    /**
     * Setup camera frame capture
     */
    constructor(arHeadset, cameraFacingMode="environment", debug=false) { 
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        throw 'No getUserMedia support found for camera capture.';
      
      // singleton
      if (ARHeadsetCameraCapture.instance) {
        return ARHeadsetCameraCapture.instance;
      }
      ARHeadsetCameraCapture.instance = this;
         
      this.arHeadset = arHeadset;
      if (!this.headsetPM[arHeadset]) throw `ARHeadsetCC: The headset key "${arHeadset}" is not supported (could not find in headset projection matrix list).`;
      this.projectionMatrix = this.headsetPM[arHeadset];
      this.video = document.createElement('video');
      this.canvas = document.createElement('canvas');
      this.canvasCtx = this.canvas.getContext("2d");
  
      // init frame size to screen size
      this.handleOrientation();
      window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
  
      navigator.mediaDevices
            .getUserMedia({ 
              audio: false,
              video: { facingMode: cameraFacingMode },
              width: this.frameWidth ,
              height: this.frameHeight,      
              }) 
            .then(ms => {
              this.video.srcObject = ms;      
              this.video.onloadedmetadata = (e) => {
              this.video.play();
              };      
            })
            .catch(err => { throw `ARHeadsetCC: getUserMedia camera access not found failed! ${err}`;} );
    }
  
    /*
     * When device changes orientation, handle screen size changes
     * @private
     */    
    handleOrientation() {
      this.frameWidth = screen.width;
      this.frameHeight = screen.height;
      this.video.style.width = this.frameWidth  + 'px';
      this.video.style.height = this.frameHeight + 'px';
      this.canvas.width = this.frameWidth;
      this.canvas.height = this.frameHeight;
      
      this.frameGsPixels = new Uint8ClampedArray(
          this.frameWidth * this.frameHeight
      ); // grayscale (1 value per pixel)  
      
      // update camera intrinsics
      this.frameCamera = this.getCameraIntrinsics();
    }
    
    /**
     * Indicate CV worker to send frames to (ar marker system expects this call to be implemented)
     * @param {object} worker - the worker instance to whom we post frame messages
     * @param {boolean} [requestFrame=true] - set request frame flag
     */     
    setCVWorker(worker, frameRequested = true) {
      this.cvWorker = worker;
  
      if (frameRequested) requestAnimationFrame(this.getCameraImagePixels.bind(this));
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
      requestAnimationFrame(this.getCameraImagePixels.bind(this));
    }
  
    /*
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
          console.warn("Failed to get video frame. Video not started ?", err);
          setTimeout(getCameraImagePixels.bind(this), 1000); // try again..
          return;
        }
        let imageDataPixels = imageData.data;
  
        for (var i = 0, j = 0; i < imageDataPixels.length; i += 4, j++) {
          let grayscale = Math.round((imageDataPixels[i] + imageDataPixels[i + 1] + imageDataPixels[i + 2]) / 3);
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
      let camFrameMsg = {
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
        camera: this.frameCamera
      };
  
      // post frame data, marking the pixel buffer as transferable
      this.cvWorker.postMessage(camFrameMsg, [
        camFrameMsg.grayscalePixels.buffer
      ]);
          
    }
  
    /*
     * Compute camera intrisics from a pre-defined projection matrix
     * @private
     */     
    getCameraIntrinsics() {
      return {
        // Focal lengths in pixels (these are equal for square pixels)
        fx: (this.frameWidth / 2) * this.projectionMatrix[0],
        fy: (this.frameHeight / 2) * this.projectionMatrix[5],
        // Principal point in pixels (typically at or near the center of the viewport)
        cx: ((1 - this.projectionMatrix[8]) * this.frameWidth) / 2,
        cy: ((1 - this.projectionMatrix[9]) * this.frameHeight) / 2,
        // Skew factor in pixels (nonzero for rhomboid pixels)
        gamma: (this.frameWidth / 2) * this.projectionMatrix[4]
      };    
    }
  }
  