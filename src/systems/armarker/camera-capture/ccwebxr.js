/* global AFRAME */

/**
 * @fileoverview Capture passthrough camera frames using WebXR Raw Camera Access API
 * WebXR Raw Camera Access API available in Chrome as off June 2021:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1090056)
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

//import CVWorkerMsgs from "./worker-msgs.js";

/**
 *
 */
 export class WebXRCameraCapture {
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
  
    /**
     */
    constructor(xrSession, gl, debug = false) {
      // singleton
      if (WebXRCameraCapture.instance) {
        return WebXRCameraCapture.instance;
      }
      WebXRCameraCapture.instance = this;
  
      this.gl = gl;
  
      if (debug) {
        let cameraEl = document.getElementById("my-camera"); // assume camera is called 'my-camera' (ARENA)
        if (cameraEl) {
          // create object for debug (plane where we texture map the camera pixels)
          this.debugEl = document.createElement("a-entity");
          this.debugEl.setAttribute(
            "geometry",
            "primitive: plane; width:.05; height: .05;"
          );
          this.debugEl.setAttribute("material", "color: white; opacity: .9");
          this.debugEl.setAttribute("position", "0 0 -.1");
          cameraEl.appendChild(this.debugEl);
          this.dbgPixelRatio = 25000; // determined by looking at the screen size
          this.debug = true;
        } else {
          console.warn("Could not find `my-camera` element for debug.");
          this.debug = false;
        }
      }
  
      this.debug = debug;
      if (debug) this.debugEl = undefined;
  
      let webGlBinding = window.XRWebGLBinding;
      // check if we have webXR camera capture available
      if (webGlBinding) {
        this.glBinding = new webGlBinding(xrSession, gl);
        if (this.glBinding && this.glBinding.getCameraImage) {
          this.fb = gl.createFramebuffer();
          xrSession.requestReferenceSpace("local").then(xrRefSpace => {
            this.xrRefSpace = xrRefSpace;
            xrSession.requestAnimationFrame(this.onXRFrame.bind(this));
          });
        } else throw "WebXR camera access not found!";
      } else throw "XRWebGLBinding not found!";
    }
  
    setCVWorker(worker, frameRequested = true) {
      this.cvWorker = worker;
  
      if (frameRequested) this.frameRequested = true;
    }
  
    requestCameraFrame(grayscalePixels = undefined, worker = undefined) {
      if (grayscalePixels)
        this.frameGsPixels = grayscalePixels;
      if (worker) this.cvWorker = worker;
      this.frameRequested = true;
    }
  
    getCameraIntrinsics(projectionMatrix, viewport) {
      //Calculates the camera intrinsics matrix from a projection matrix and viewport
      //https://storage.googleapis.com/chromium-webxr-test/r886480/proposals/camera-access-barebones.html
      const p = projectionMatrix;
      return {
        // Focal lengths in pixels (these are equal for square pixels)
        fx: (viewport.width / 2) * p[0],
        fy: (viewport.height / 2) * p[5],
        // Principal point in pixels (typically at or near the center of the viewport)
        cx: ((1 - p[8]) * viewport.width) / 2 + viewport.x,
        cy: ((1 - p[9]) * viewport.height) / 2 + viewport.y,
        // Skew factor in pixels (nonzero for rhomboid pixels)
        gamma: (viewport.width / 2) * p[4]
      };
    }
  
    getCameraFramePixels(session, view) {
      // check if camera frame changed size
      if (
        this.frameCamera == undefined ||
        this.frameWidth  != view.camera.width ||
        this.frameHeight != view.camera.height
      ) {
        //const viewport = session.renderState.baseLayer.getViewport(view);
  
        this.frameWidth = view.camera.width;
        this.frameHeight = view.camera.height;
        this.framePixels = new Uint8ClampedArray(
          this.frameWidth * this.frameHeight * 4
        ); // RGBA image (4 values per pixel)
        this.frameGsPixels = new Uint8ClampedArray(
          this.frameWidth * this.frameHeight
        ); // grayscale (1 value per pixel)
  
        const cameraViewport = {
          width: this.frameWidth,
          height: this.frameHeight,
          x: 0,
          y: 0
        };
        // update camera intrinsics
        this.frameCamera = this.getCameraIntrinsics(
          view.projectionMatrix,
          cameraViewport
        );
      }
  
      // get camera image as texture
      let texture = this.glBinding.getCameraImage(view.camera);
  
      // bind the framebuffer, attach texture and read pixels
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb);
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        texture,
        0
      );
      this.gl.readPixels(
        0,
        0,
        this.frameWidth,
        this.frameHeight,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        this.framePixels
      );
      this.frameTs = Date.now(); // save timestamp
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // unbind framebuffer
  
      if (this.debug) {
        const tTexture = new THREE.DataTexture(
          this.framePixels,
          this.frameWidth,
          this.frameHeight,
          THREE.RGBAFormat
        );
        this.debugEl.setAttribute(
          "geometry",
          "width",
          this.frameWidth / this.dbgPixelRatio
        );
        this.debugEl.setAttribute(
          "geometry",
          "height",
          this.frameHeight / this.dbgPixelRatio
        );
        let mesh = this.debugEl.getObject3D("mesh");
        mesh.material.map = tTexture;
        mesh.material.needsUpdate = true;
      }
  
      // grayscale and mirror image
      console.log(this.frameWidth, this.frameHeight);
      for (
        let r = this.frameWidth * (this.frameHeight - 1), j = 0;
        r >= 0;
        r -= this.frameWidth
      ) {
        for (let i = r * 4; i < (r + this.frameWidth) * 4; i += 4) {
          let grayscale = Math.round(
            (this.framePixels[i] +
              this.framePixels[i + 1] +
              this.framePixels[i + 2]) /
              3
          );
          this.frameGsPixels[j++] = grayscale;
        }
      }
  
      //log.info(this.frameGsPixels.toString());
  
      // construct cam frame data to send to worker
      let camFrameMsg = {
        type: CVWorkerMsgs.type.PROCESS_GSFRAME,
        // timestamp
        ts: this.frameTs,
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
  
    onXRFrame(t, frame) {
      let session = frame.session;
      session.requestAnimationFrame(this.onXRFrame.bind(this));
      if (!this.frameRequested) return;
  
      let pose = frame.getViewerPose(this.xrRefSpace);
      if (!pose) return;
      for (const view of pose.views) {
        if (view.camera) {
          // only capture next frame on request
          this.frameRequested = false;
  
          this.getCameraFramePixels(session, view);
        }
      }
    }
  }
  