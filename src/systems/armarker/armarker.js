/* global AFRAME, ARENA, THREE, ARENAUtils */

/**
 * @fileoverview ARMarker System. Supports ARMarkers in a scene.
 * Attempts to detect device and setup camera capture accordingly:
 *   AR Headset: capture camera facing forward using getUserMedia
 *   Phone/tablet with WebXR Camera Capture API support: capture passthrough camera
 *   frames using the WebXR camera capture API (only in Android Chrome v93+)
 *   iPhone/iPad with custom browser: camera capture for Mozilla's WebXRViewer/WebARViewer
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import {WebXRCameraCapture} from './camera-capture/ccwebxr.js';
import {WebARCameraCapture} from './camera-capture/ccwebar.js';
import {ARHeadsetCameraCapture} from './camera-capture/ccarheadset.js';
import {WebARViewerCameraCapture} from './camera-capture/ccwebarviewer.js';
import {ARMarkerRelocalization} from './armarker-reloc.js';
import {CVWorkerMsgs} from './worker-msgs.js';
import {ARENAEventEmitter} from '../../event-emitter.js';

/**
  * ARMarker System. Supports ARMarkers in a scene.
  * @module armarker-system
  */
AFRAME.registerSystem('armarker', {
    schema: {
        /* camera capture debug: creates a plane texture-mapped with the camera frames */
        debugCameraCapture: {default: false},
        /* relocalization debug messages output */
        debugRelocalization: {default: false},
        /* networked marker solver flag; let relocalization up to a networked solver;
           NOTE: at armarker init time, we look up scene options to set this flag */
        networkedLocationSolver: {default: false},
        /* how often we update markers from ATLAS; 0=never */
        ATLASUpdateIntervalSecs: {default: 30},
        /* how often we tigger a device location update; 0=never */
        devLocUpdateIntervalSecs: {default: 0},
    },
    // ar markers in the scene
    markers: {},
    // ar markers retrieved from ATLAS
    ATLASMarkers: {},
    // indicate if we started the cv pipeline
    cvPipelineInitializing: false,
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
        1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        0, 0, 0, 1,
    ),
    // if we detected WebXRViewer/WebARViewer
    isWebARViewer: false,
    initialLocalized: false,
    /*
    * Init system
    * @param {object} marker - The marker component object to register.
    * @alias module:armarker-system
    */
    init: function() {
        // init this.ATLASMarkers with list of markers within range
        this.getARMArkersFromATLAS(true);

        // check if this is WebXRViewer/WebARViewer
        this.isWebARViewer = navigator.userAgent.includes('WebXRViewer') || navigator.userAgent.includes('WebARViewer');

        // init networkedLocationSolver flag from ARENA scene options, if available
        if (ARENA) {
            ARENA.events.on(ARENAEventEmitter.events.SCENE_OPT_LOADED, () => {
                this.data.networkedLocationSolver = ARENA['networkedLocationSolver'];
            });
        }

        // request camera acess features
        const sceneEl = this.el;
        const optionalFeatures = sceneEl.systems.webxr.data.optionalFeatures;
        if (this.isWebARViewer) {
            // eslint-disable-next-line max-len
            optionalFeatures.push('computerVision'); // request custom 'computerVision' feature in WebXRViewer/WebARViewer
        } else optionalFeatures.push('camera-access'); // request WebXR 'camera-access' otherwise
        sceneEl.systems.webxr.sceneEl.setAttribute(
            'optionalFeatures',
            optionalFeatures,
        );

        // listner for xr session start
        if (sceneEl.hasWebXR && navigator.xr && navigator.xr.addEventListener) {
            sceneEl.addEventListener('enter-vr', () => {
                this.webXRSessionStarted(sceneEl.xrSession);
            });
        }
    },
    /*
    * System attribute update
    * @param {object} oldData - previous attribute values.
    * @alias module:armarker-system
    */
    update: function(oldData) {
    // TODO: Do stuff with `this.data`...
    },
    /**
    * WebXR session started callback
    * @param {object} xrSession - Handle to the WebXR session
    */
    async webXRSessionStarted(xrSession) {
        if (xrSession !== undefined) {
            this.webXRSession = xrSession;
            this.gl = this.el.renderer.getContext();

            // make sure gl context is XR compatible
            try {
                await this.gl.makeXRCompatible();
            } catch (err) {
                console.error('Could not make make gl context XR compatible!', err);
            }
        }

        // init cv pipeline
        this.initCVPipeline();
    },
    /**
    * Setup cv pipeline (camera capture and cv worker)
    * Attempts to detect device and setup camera capture accordingly:
    *   ARHeadsetCameraCapture: capture camera facing forward using getUserMedia
    *   WebXRCameraCapture: capture passthrough camera frames using the WebXR camera capture
    *                       API (only in Android Chrome v93+)
    *   WebARViewerCameraCapture: camera capture for custom iOS browser (WebXRViewer/WebARViewer)
    *
    */
    async initCVPipeline() {
        if (this.cvPipelineInitializing || this.cvPipelineInitialized) return;
        this.cvPipelineInitializing = true;
        // try to set up a WebXRViewer/WebARViewer (custom iOS browser) camera capture pipeline
        if (this.isWebARViewer) {
            try {
                this.cameraCapture = new WebARViewerCameraCapture(this.data.debugCameraCapture);
            } catch (err) {
                this.cvPipelineInitializing = false;
                console.warn(`Could not create WebXRViewer/WebARViewer camera capture. ${err}`);
                return; // we are done here
            }
        }

        // if we are on an AR headset, use camera facing forward
        const arHeadset = this.detectARHeadset();
        if (arHeadset !== 'unknown') {
            // try to set up a camera facing forward capture (using getUserMedia)
            console.info('Setting up AR Headset camera capture.');
            try {
                this.cameraCapture = new ARHeadsetCameraCapture(arHeadset, this, this.data.debugCameraCapture);
            } catch (err) {
                console.warn(`Could not create AR Headset camera capture. ${err}`);
            }
        }


        if (!this.cameraCapture) { // Not WebXRViewer/WebARViewer, not AR headset
            if (window.XRWebGLBinding) { // Set up a webxr camera capture (e.g. passthrough AR on a phone)
                console.info('Setting up WebXR-based passthrough AR camera capture.');
                try {
                    this.cameraCapture = new WebXRCameraCapture(this.webXRSession, this.gl,
                        this.data.debugCameraCapture);
                } catch (err) {
                    this.cvPipelineInitializing = false;
                    console.error(`No valid CV camera capture found. ${err}`);
                    return; // no valid cv camera capture; we are done here
                }
            } else { // Final fallthrough to Spot AR, no real WebXR support
                try {
                    this.cameraCapture = new WebARCameraCapture();
                    await this.cameraCapture.initCamera();
                } catch (err) {
                    this.cvPipelineInitializing = false;
                    console.error(`No valid CV camera capture found. ${err}`);
                    return; // no valid cv camera capture; we are done here
                }
            }
        }

        // create cv worker for apriltag detection
        this.cvWorker = new Worker(new URL('dist/apriltag.js', import.meta.url), {type: 'module'});
        this.cameraCapture.setCVWorker(this.cvWorker); // let camera capture know about the cv worker

        // listen for worker messages
        this.cvWorker.addEventListener('message', this.cvWorkerMessage.bind(this));

        // setup ar marker relocalization that will listen to ar marker detection events
        this.markerReloc = new ARMarkerRelocalization({
            arMakerSys: this,
            detectionsEventTarget: this.detectionEvts,
            networkedLocationSolver: this.data.networkedLocationSolver,
            debug: this.data.debugRelocalization,
        });

        this.cvPipelineInitializing = false;
        this.cvPipelineInitialized = true;

        // send size of known markers to cvWorker (so it can compute pose)
        for (const [mid, marker] of Object.entries(this.markers)) {
            const newMarker = {
                type: CVWorkerMsgs.type.KNOWN_MARKER_ADD,
                // marker id
                markerid: mid,
                // marker size in meters (marker component size is mm)
                size: marker.data.size/1000,
            };
            this.cvWorker.postMessage(newMarker);
        }
    },
    /**
    * Handle messages from cvWorker (detector)
    * @param {object} msg - The worker message received.
    * @alias module:armarker-system
    */
    cvWorkerMessage(msg) {
        const cvWorkerMsg = msg.data;

        switch (cvWorkerMsg.type) {
        case CVWorkerMsgs.type.FRAME_RESULTS:
            // pass detections and original frame timestamp to relocalization
            if (cvWorkerMsg.detections.length) {
                const detectionEvent = new CustomEvent('armarker-detection', {detail: {
                    detections: cvWorkerMsg.detections,
                    ts: cvWorkerMsg.ts,
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
            console.warn('ARMarker System: unknow message from CV worker.');
        }
    },
    /**
    * Queries ATLAS for ar makers within geolocation (requires ARENA)
    * @param {boolean} init - weather it is init time (first time we get the markers) or not
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
            console.error('No device location! Cannot query ATLAS.');
            return false;
        }
        const position = ARENA.clientCoords;

        // ATLASUpdateIntervalSecs=0: only update tags at init
        if (this.data.ATLASUpdateIntervalSecs === 0 && !init) return;

        // limit to ATLASUpdateIntervalSecs update interval
        if (new Date() - this.lastATLASUpdate < this.data.ATLASUpdateIntervalSecs * 1000) {
            return false;
        }
        fetch(
            ARENA.ATLASurl +
         '/lookup/geo?objectType=apriltag&distance=20&units=km&lat=' +
         position.latitude +
         '&long=' +
         position.longitude,
        )
            .then((response) => {
                window.this.lastATLASUpdate = new Date();
                return response.json();
            })
            .catch(() => {
                console.log('Error retrieving ATLAS markers');
                return false;
            })
            .then((data) => {
                data.forEach((tag) => {
                    const tagid = tag.name.substring(9);
                    if (tagid !== 0) {
                        if (tag.pose && Array.isArray(tag.pose)) {
                            const tagMatrix = new THREE.Matrix4();
                            tagMatrix.fromArray(tag.pose.flat()); // comes in row-major, loads col-major
                            tagMatrix.transpose(); // flip properly to row-major
                            this.ATLASMarkers[tagid] = {
                                id: tagid,
                                uuid: tag.id,
                                pose: tagMatrix,
                            };
                        }
                    }
                });
            });
        return true;
    },
    /**
    * Try to detect AR headset (currently: magic leap and hololens only;  other devices to be added later)
    * Hololens reliable detection is tbd
    *
    * ARHeadeset camera capture uses returned value as a key to projection matrix array
    *
    * @return {string} "ml", "hl", "unknown".
    * @alias module:armarker-system
    */
    detectARHeadset() {
        if (window.mlWorld) return 'ml';
        if (navigator.xr && navigator.userAgent.includes('Edg')) return 'hl';
        return 'unknown';
    },
    /**
    * Register an ARMarker component with the system
    * @param {object} marker - The marker component object to register.
    * @alias module:armarker-system
    */
    registerComponent: async function(marker) {
        this.markers[marker.data.markerid] = marker;
        if (this.cvPipelineInitialized) {
        // indicate cv worker that a marker was added
            const newMarker = {
                type: CVWorkerMsgs.type.KNOWN_MARKER_ADD,
                // marker id
                markerid: marker.data.markerid,
                // marker size in meters (marker component size is mm)
                size: marker.data.size/1000,
            };
            this.cvWorker.postMessage(newMarker);
        } else {
        // nothing to do; upon cv pipeline init the marker will be indicated to cv worker (see initCVPipeline())
        }
    },
    /**
    * Unregister an ARMarker component
    * @param {object} marker - The marker component object to unregister.
    * @alias module:armarker-system
    */
    unregisterComponent: function(marker) {
        if (this.cvPipelineInitialized) {
            // indicate marker was removed to cv worker
            const delMarker = {
                type: CVWorkerMsgs.type.KNOWN_MARKER_DEL,
                // marker id
                markerid: marker.data.markerid,
            };
            this.cvWorker.postMessage(delMarker);
        }
        delete this.markers[marker.data.markerid];
    },
    /**
    * Get all markers registered with the system
    * @param {object} mtype - The marker type 'apriltag_36h11', 'lightanchor', 'uwb' to filter for;
    *                         No argument or undefined will return all
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
        if (mtype === undefined) return this.markers;
        return Object.assign(
            {},
            ...Object.entries(this.markers)
                .filter(([, v]) => v.data.markertype === mtype)
                .map(([k, v]) => ({[k]: v})),
        );
    },
    /**
    * Get a marker given its markerid; first lookup local scene objects, then ATLAS
    * Marker with ID 0 is assumed to be at (x, y, z) 0, 0, 0
    * @param {string} markerid - The marker id to return (converts to string, if a string is not given)
    * @return {object} - the marker with the markerid given or undefined
    * @alias module:armarker-system
    */
    getMarker: function(markerid) {
        if (!(typeof markerid === 'string' || markerid instanceof String)) {
            markerid = String(markerid); // convert markerid to string
        }
        const sceneTag = this.markers[markerid];
        if (sceneTag !== undefined) {
            const markerPose = sceneTag.el.object3D.matrixWorld; // get object world matrix
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            markerPose.decompose( pos, quat, scale );
            const markerPoseNoScale = new THREE.Matrix4(); // create a world matrix with only position and rotation
            markerPoseNoScale.makeRotationFromQuaternion( quat );
            markerPoseNoScale.setPosition( pos );
            return Object.assign({}, sceneTag.data, {
                obj_id: sceneTag.el.id,
                pose: markerPoseNoScale,
            });
        }
        // default pose for tag 0
        if (markerid === '0') {
            return {
                id: String(markerid),
                uuid: 'ORIGIN',
                pose: this.originMatrix,
                dynamic: false,
                buildable: false,
            };
        }
        if (!this.ATLASMarkers[markerid]) {
            // force update from ATLAS if not found
            this.getARMArkersFromATLAS();
        }
        return this.ATLASMarkers[String(markerid)];
    },
});
