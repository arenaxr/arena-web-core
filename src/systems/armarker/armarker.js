/* global AFRAME, ARENA, THREE, CVWorkerMsgs, ARENAUtils */

/**
 * @fileoverview ARMarker System. Supports ARMarkers in a scene.
 * Attempts to detect device and setup camera capture accordingly:
 *   AR Headset: capture camera facing forward using getUserMedia
 *   Phone/tablet with WebXR Camera Capture API support: capture passthrough camera frames using the WebXR camera capture API (only in Android Chrome v93+)
 *   iPhone/iPad with custom browser: camera capture for Mozilla's WebXRViewer/WebARViewer
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

 import {WebXRCameraCapture} from "./camera-capture/ccwebxr.js";
 import {ARHeadsetCameraCapture} from "./camera-capture/ccarheadset.js";
 import {WebARViewerCameraCapture} from "./camera-capture/ccwebarviewer.js";
 import {ARMarkerRelocalization} from "./armarker-reloc.js";
 import {CVWorkerMsgs} from './worker-msgs.js';
 /**
  * ARMarker System. Supports ARMarkers in a scene.
  * @module armarker-system
  */
 AFRAME.registerSystem("armarker", {
   schema: {
     /* camera capture debug: creates a plane texture-mapped with the camera frames */
     debugCameraCapture: { default: true },
     /* relocalization debug messages output */
     debugRelocalization: { default: true },
     /* builder mode flag; also looks at builder=true/false URL parameter */
     builder: { default: false },
     /* network tag solver flag; also looks at networkedTagSolver=true/false URL parameter */
     networkedTagSolver: { default: false },
     /* publish ar marker detections; also looks at publishDetections=true/false URL parameter */
     publishDetections: { default: false },
     /* how often we update markers from ATLAS; 0=never */
     ATLASUpdateIntervalSecs: { default:  30 },
     /* how often we tigger a device location update; 0=never */
     devLocUpdateIntervalSecs: { default:  0 }
   },
   // ar markers in the scene
   markers: {},
   // ar markers retrieved from ATLAS
   ATLASMarkers: {},
   // indicate if we started the cv pipeline 
   cvPipelineInitialized: false,
   // initialized once the xr session starts
   webXRSession: null,
   // gl context used for webxr camera access; initialized once the xr session starts
   webXRGlContext: null,
   // cv worker instance
   cvWorker: undefined,
   // detection events are sent here
   detectionEvts: new EventTarget(),
   // init origin matrix for markerid=0 lookups (row-major)
   originMatrix: new THREE.Matrix4().set(
     1,  0, 0, 0,
     0,  0, 1, 0,
     0, -1, 0, 0,
     0,  0, 0, 1,  
   ),
   /*
    * Init system
    * @param {object} marker - The marker component object to register.
    * @alias module:armarker-system
    */
   init: function() {
     // init this.ATLASMarkers with list of markers within range
     this.getARMArkersFromATLAS(true);

     // check URL parameters
     const urlParams = new URLSearchParams(window.location.search);
     if (urlParams.get("builder")) {
       this.data.builder = true;
       //thisc = true;
     } else {
       this.data.networkedTagSolver = !!urlParams.get("networkedTagSolver"); // Force into boolean
     }
     if (!this.data.networkedTagSolver) {
       this.data.publishDetections = !!urlParams.get("publishDetections"); // Force into boolean
     }
 
     // add camera-access to optional webxr features
     let sceneEl = this.el;
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
 
     // make sure gl context is XR compatible
     try {
        await this.gl.makeXRCompatible();
     } catch (err) {
        console.error("Could not make make gl context XR compatible!", err);
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
   async initCVPipeline() {
     if (this.cvPipelineInitialized == true) return;
     if (this.webXRSession == undefined) return;
     if (this.gl == undefined) return;
 
     // try to setup a WebXRViewer/WebARViewer (custom iOS browser) camera capture pipeline
     const isWebARViewer = navigator.userAgent.includes('WebXRViewer') || navigator.userAgent.includes('WebARViewer');
     if (isWebARViewer) {
       try {
         this.cameraCapture = new WebARViewerCameraCapture(this.data.debugCameraCapture);
       } catch (err) {
         console.warn(`Could not create WebXRViewer/WebARViewer camera capture. ${err}`);
         return; // we are done here
       }
     }

     /* if we are on a AR headset, use camera facing forward
        try to detect magic leap and hololens (hololens reliable detection is tbd; other devices to be added) */
     let isARHeadset = window.mlWorld || (navigator.xr && navigator.userAgent.includes("Edge"));
     if (isARHeadset) {
       // try to setup a camera facing forward capture (using getUserMedia)
       console.info("Setting up AR Headset camera capture.");
       try {
         this.cameraCapture = new ARHeadsetCameraCapture(
           this.data.debugCameraCapture
         );
       } catch (err) {
         console.warn(`Could not create AR Headset camera capture. ${err}`);
       }
     }

     // fallback to setup a webxr camera capture (e.g. passthrough AR on a phone)
     if (!this.cameraCapture && window.XRWebGLBinding) {
       console.info("Setting up WebXR-based passthrough AR camera capture.");
       try {
         this.cameraCapture = new WebXRCameraCapture(this.webXRSession, this.gl, this.data.debugCameraCapture);
        } catch (err) {
            console.error(`No valid CV camera capture found. ${err}`);
            return; // no valid cv camera capture; we are done here
        }
     }
    
     // create cv worker for apriltag detection
     this.cvWorker = new Worker("./apriltag-detector/apriltag.js");
     this.cameraCapture.setCVWorker(this.cvWorker); // let camera capture know about the cv worker

     // listen for worker messages
     this.cvWorker.addEventListener("message", this.cvWorkerMessage.bind(this));

     // setup ar marker relocalization that will listen to ar marker detection events
     this.markerReloc = new ARMarkerRelocalization({
       getArMaker: this.get.bind(this),
       detectionsEventTarget: this.detectionEvts,
       networkedTagSolver: this.data.networkedTagSolver,
       publishDetections: this.data.publishDetections,
       builder: this.data.builder,
       debug: this.data.debugRelocalization
     });
 
   },
   /**
    * Handle messages from cvWorker (detector)
    * @param {object} marker - The marker component object to register.
    * @alias module:armarker-system
    */
   cvWorkerMessage(msg) {
     let cvWorkerMsg = msg.data;
    
     switch (cvWorkerMsg.type) {
       case CVWorkerMsgs.type.FRAME_RESULTS:
         // pass detections and original frame timestamp to relocalization
         if (cvWorkerMsg.detections.length) {
           let detectionEvent = new CustomEvent("armarker-detection", { detail: {
             detections: cvWorkerMsg.detections,
             ts: cvWorkerMsg.ts
           }});
           this.detectionEvts.dispatchEvent(detectionEvent);
         }
         // request next camera frame and return image buffer to camera capture
         this.cameraCapture.requestCameraFrame(cvWorkerMsg.grayscalePixels);
         break;
       case CVWorkerMsgs.type.INIT_DONE:
       case CVWorkerMsgs.type.NEXT_FRAME_REQ:
         // request next camera frame
         this.cameraCapture.requestCameraFrame();
         break;
       default:
         console.warn("ARMarker System: unknow message from CV worker.");
     }
   },
   /**
    * Queries ATLAS for ar makers within geolocation (requires ARENA)
    * @return {Promise<boolean>}
    */
   async getARMArkersFromATLAS(init=false) {
     if (!window.ARENA) return false; // requires ARENA
     const ARENA = window.ARENA;
 
     // at init time, make sure we fetch ar markers from ATLAS
     if (init) {
       this.lastATLASUpdate = new Date();
       this.lastdevLocUpdate = new Date();
     }
     
     // check if we should trigger a device location update       
     if (this.data.devLocUpdateIntervalSecs > 0 && ARENAUtils) {
       if (new Date() - this.lastdevLocUpdate < this.data.devLocUpdateIntervalSecs * 1000) {      
         ARENAUtils.getLocation((coords, err) => {
               if (!err) ARENA.clientCoords = coords;
               this.lastdevLocUpdate = new Date();
         });
       }
     }
     if (ARENA.clientCoords === undefined) {
       console.error("No device location! Cannot query ATLAS.");
       return false;
     }
     const position = ARENA.clientCoords; 
     
     // ATLASUpdateIntervalSecs=0: only update tags at init
     if (this.data.ATLASUpdateIntervalSecs == 0 && !init) return; 
   
     // limit to ATLASUpdateIntervalSecs update interval
     if (new Date() - this.lastATLASUpdate < this.data.ATLASUpdateIntervalSecs * 1000) {
       return false;
     }
     fetch(
       ARENA.ATLASurl +
         "/lookup/geo?objectType=apriltag&distance=20&units=km&lat=" +
         position.latitude +
         "&long=" +
         position.longitude
     )
       .then(response => {
         window.this.lastATLASUpdate = new Date();
         return response.json();
       })
       .then(data => {
         data.forEach(tag => {
           const tagid = tag.name.substring(9);
           if (tagid !== 0) {
             if (tag.pose && Array.isArray(tag.pose)) {
               const tagMatrix = new THREE.Matrix4();
               tagMatrix.fromArray(tag.pose.flat()); // comes in row-major, loads col-major
               tagMatrix.transpose(); // flip properly to row-major
               this.ATLASMarkers[tagid] = {
                 id: tagid,
                 uuid: tag.id,
                 pose: tagMatrix
               };
             }
           }
         });
       });
     return true;
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
    * Get a marker given its markerid; first lookup local scene objects, then ATLAS
    * Marker with ID 0 is assumed to be at (x, y, z) 0, 0, 0
    * @param {object} markerid - The marker id to return
    * @return {object} - the marker with the markerid given or undefined
    * @alias module:armarker-system
    */
   get: function(markerid) {
     if (markerid == 0)
       return {
         id: "ORIGIN",
         uuid: "ORIGIN",
         pose: this.originMatrix
       };
     const sysTag = this.markers[markerid];
     if (sysTag !== undefined) {
       return {
         id: sysTag.data.markerid,
         uuid: sysTag.el.id,
         pose: sysTag.el.object3D.matrixWorld,
         dynamic: sysTag.data.dynamic,
         buildable: sysTag.data.buildable
       };
     }
     if (!this.ATLASMarkers[markerid]) {
       // force update from ATLAS if not found
       this.getARMArkersFromATLAS();
     }
     return this.ATLASMarkers[markerid];
   }
 });
 