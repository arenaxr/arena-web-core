/* global AFRAME */

/**
 * @fileoverview Capture camera facing forward using getUserMedia
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/**
 *
 */
 export class ARHeadsetCameraCapture {
    static instance=null;
    /* ARMarker system instance */
    arMarkerSystem;
    /* cv worker requested another frame */
    frameRequested = true;
    /* worker to send images captured */
    cvWorker;
  
    video;
    mediaStream;
    track;
    imageCapture;
  
  
    /**
     */
    constructor(cameraFacingMode="environment", debug=false) { 
      // singleton
      if (ARHeadsetCameraCapture.instance) {
        return ARHeadsetCameraCapture.instance;
      }
      ARHeadsetCameraCapture.instance = this;
      
      this.video = document.createElement('video');
      
      navigator.mediaDevices
            .getUserMedia({ video: { facingMode: cameraFacingMode }}) 
            .then(ms => {
              this.mediaStream = ms;
              this.video.srcObject = ms;
              this.track = ms.getVideoTracks()[0];
              this.imageCapture = new ImageCapture(this.track);
            })
            .catch(err => { throw `getUserMedia camera access not found failed! ${err}`;} );
      
      throw 'Not implemented yet.';
    }
  
    setCVWorker(worker, requestFrame=true) {
      this.cvWorker = worker;
      
      // listen for worker messages
      myWorker.addEventListener("message", this.handleMessageFromWorker);
      
      if (requestFrame) this.frameRequested = true;
    }
  
    handleMessageFromWorker(msg) {
      let cvWorkerMsg = msg.data;
  
      switch(cvWorkerMsg.type) {
        case CVWorkerMsgs.type.INIT_DONE:
          //...
          break;
        case CVWorkerMsgs.type.FRAME_RESULTS:
          //...
          break;
        case CVWorkerMsgs.type.NEXT_FRAME_REQ:
          this.getCameraImagePixels();
          //...
          break;
        default:
          console.warn("CameraCapture: unknow message from worker.");
      }    
    }
  
    getCameraImagePixels() {
          if (!this.imageCapture) return;
  
          this.imageCapture
                .grabFrame()
                .then(function(imageBitmap) {
                  console.log("Grabbed frame: ", count++, imageBitmap);
                })
                .catch(err => console.error("grabFrame() failed: ", err));
          //...    
    }
  
    getCameraIntrinsics(projectionMatrix, viewport) {
    }
  }
  