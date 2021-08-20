/* global AFRAME */

/**
 * @fileoverview ARMarker System. Supports ARMarkers in a scene.
 * Attempts to detect device and setup camera capture accordingly:
 *   AR Headset: capture camera facing forward using getUserMedia
 *   Phone/tablet with WebXR Camera Capture API support: capture passthrough camera frames using the WebXR camera capture API (only in Android Chrome v93+)
 *   iPhone/iPad with custom browser: camera capture for WebXRViewer/WebARViewer
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import WebXRCameraCapture from "./ccwebxr.js";
import ARHeadsetCameraCapture from "./ccarheadset.js";
import WebARViewerCameraCapture from "./ccwebarviewer.js";

/**
 * ARMarker System. Supports ARMarkers in a scene.
 * @module armarker-system
 */
AFRAME.registerSystem("armarker", {
  schema: {
    /* creates a plane texture-mapped with the camera frames */
    debugCameraCapture: { default: true },
    /* builder mode flag; also looks at builder=true/false URL parameter */
    builder: { default: false },
    /* network tag solver flag; also looks at networkedTagSolver=true/false URL parameter */
    networkedTagSolver: { default: false },
    /* publish ar marker detections; also looks at publishDetections=true/false URL parameter */
    publishDetections: { default: false }
  },
  /**
   * Init system
   * @param {object} marker - The marker component object to register.
   * @alias module:armarker-system
   */
  init: function() {
    this.markers = {};
    this.cvPipelineInitialized = false; // indicate if we started the cv pipeline already
    this.webXRCameraAccess = false; // set to true if we detect a capable xr device
    this.webXRSession = null; // initialized once the xr session starts
    this.webXRGlContext = null; // gl context used for webxr camera access; initialized once the xr session starts
    this.isWebXRViewer = navigator.userAgent.includes("WebXRViewer");
    // for now, try to detect magic leap and hololens (hololens reliable detection is tbd)
    this.isARHeadset =
      window.mlWorld || (navigator.xr && navigator.userAgent.includes("Edge"));
    this.cvWorker = undefined; // cv worker instance
    this.detectionEvts = new EventTarget(); // detection events are sent here
    
    // check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("builder")) {
      this.data.builder = true;
      thisc = true;
    } else {
      this.data.networkedTagSolver = !!urlParams.get("networkedTagSolver"); // Force into boolean
    }
    if (!this.data.networkedTagSolver) {
      this.data.publishDetections = !!urlParams.get("publishDetections"); // Force into boolean
    }

    var sceneEl = this.el;

    // add camera-access to optional webxr features
    let optionalFeatures = sceneEl.systems.webxr.data.optionalFeatures;
    optionalFeatures.push("camera-access");
    sceneEl.systems.webxr.sceneEl.setAttribute(
      "optionalFeatures",
      optionalFeatures
    );

    // listner for xr session start
    if (sceneEl.hasWebXR && navigator.xr && navigator.xr.addEventListener) {
      sceneEl.addEventListener("enter-vr", () => {
        this.webXRSessionStarted(sceneEl.xrSession);
      });
    }
  },
  /**
   * WebXR session started callback
   * @param {object} xrSession - Handle to the WebXR session
   */
  async webXRSessionStarted(xrSession) {
    this.webXRSession = xrSession;

    this.gl = this.el.renderer.getContext();
    try {
      await this.gl.makeXRCompatible();
    } catch (err) {
      console.error("Could not make make gl context xr compatible!", err);
    }

    // init cv pipeline only if we have ar markers in scene (?)
    //if (this.markers.length)
    this.initCVPipeline();
  },
  /**
   * Setup cv pipeline (camera capture and cv worker)
   * Attempts to detect device and setup camera capture accordingly:
   *   ARHeadsetCameraCapture: capture camera facing forward using getUserMedia
   *   WebXRCameraCapture: capture passthrough camera frames using the WebXR camera capture API (only in Android Chrome v93+)
   *   WebARViewerCameraCapture: camera capture for custom iOS browser (WebXRViewer/WebARViewer)
   *
   */
  initCVPipeline() {
    if (this.cvPipelineInitialized == true) return;
    if (this.webXRSession == undefined) return;
    if (this.gl == undefined) return;

    // if we are on a AR headset, use camera facing forward
    if (this.isARHeadset) {
      // try to setup a camera facing forward capture (using getUserMedia)
      console.info("Setting up AR Headset camera capture.");
      try {
        this.cameraCapture = new ARHeadsetCameraCapture(
          this.data.debugCameraCapture
        );
      } catch (err) {
        console.warn(`Could not create WebXR camera capture. ${err}`);
      }
    }

    // try to setup a webxr camera capture (default; e.g. passthrough AR on a phone)
    if (!this.cameraCapture) {
      console.info("Setting up WebXR-based passthrough AR camera capture.");
      try {
        this.cameraCapture = new WebXRCameraCapture(
          this.webXRSession,
          this.gl,
          this.data.debugCameraCapture
        );
      } catch (err) {
        console.warn(`Could not create WebXR camera capture. ${err}`);
      }
    }

    // as a fallback, try to setup a WebARViewer (custom iOS browser) camera capture pipeline
    if (!this.cameraCapture) {
      console.info("Falling back to WebARViewer camera capture.");
      try {
        this.cameraCapture = new WebARViewerCameraCapture(
          this.data.debugCameraCapture
        );
      } catch (err) {
        console.error(`No valid CV camera capture found. ${err}`);

        return; // no valid cv camera capture; we are done here
      }
    }

    // create cv worker for apriltag detection
    this.cvWorker = new Worker("./apriltag/apriltag_worker.js");
    console.log("aprilTagWorker", this.cvWorker );
    this.cameraCapture.setCVWorker(this.cvWorker); // let camera capture know about the cv worker
    
    // listen for worker messages
    this.cvWorker.addEventListener("message", this.cvWorkerMessage.bind(this));
  },
  /**
   * Handle messages from cvWorker (detector)
   * @param {object} marker - The marker component object to register.
   * @alias module:armarker-system
   */  
  cvWorkerMessage(msg) { 
    let cvWorkerMsg = msg.data;

    switch(cvWorkerMsg.type) {
      case CVWorkerMsgs.type.FRAME_RESULTS:
        let detectionEvent = new CustomEvent("armarker-detection", { detections: cvWorkerMsg.detections });
        this.detectionEvts.dispatchEvent(detectionEvent);
        // request next camera frame and return image buffer to camera capture 
        this.cameraCapture.requestFrame(cvWorkerMsg);
        break;
      case CVWorkerMsgs.type.INIT_DONE:
      case CVWorkerMsgs.type.NEXT_FRAME_REQ:
        // request next camera frame
        this.cameraCapture.requestFrame();
        break;
      default:
        console.warn("ARMarker System: unknow message from CV worker.");
    }    
  },  
  /**
   * Register an ARMarker component with the system
   * @param {object} marker - The marker component object to register.
   * @alias module:armarker-system
   */
  registerComponent: function(marker) {
    this.markers[marker.data.markerid] = marker;
    this.initCVPipeline();
  },
  /**
   * Unregister an ARMarker component
   * @param {object} marker - The marker component object to unregister.
   * @alias module:armarker-system
   */
  unregisterComponent: function(marker) {
    delete this.markers[marker.data.markerid];
  },
  /**
   * Get all markers registered with the system
   * @param {object} mtype - The marker type 'apriltag_36h11', 'lightanchor', 'uwb' to filter for; No argument or undefined will return all
   * @return {object} - a dictionary of markers
   * @alias module:armarker-system
   * @example <caption>Query the system a list of all markers in a scene</caption>
   *     let markers = document.querySelector("a-scene").systems["armarker"].getAll();
   *     Object.keys(markers).forEach(function(key) {
   *       console.log(`tag id: ${markers[key].data.markerid}`, markers[key].el.object3D.matrixWorld); //matrixWorld: https://threejs.org/docs/#api/en/math/Matrix4
   *     });
   * @example <caption>getAll() also accepts a marker type argument to filter by a given type</caption>
   *     let markers = document.querySelector("a-scene").systems["armarker"].getAll('apriltag_36h11');
   *
   */
  getAll: function(mtype = undefined) {
    if (mtype == undefined) return this.markers;
    const filtered = Object.assign(
      {},
      ...Object.entries(this.markers)
        .filter(([k, v]) => v.data.markertype == mtype)
        .map(([k, v]) => ({ [k]: v }))
    );
    return filtered;
  },
  /**
   * Get a marker given is markerid
   * @param {object} markerid - The marker id to return
   * @return {object} - the marker with the markerid given
   * @alias module:armarker-system
   */
  get: function(markerid) {
    return this.markers[markerid];
  }
});
