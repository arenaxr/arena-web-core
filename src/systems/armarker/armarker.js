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

import WebXRCameraCapture from './camera-capture/ccwebxr';
import WebARCameraCapture from './camera-capture/ccwebar';
import ARHeadsetCameraCapture from './camera-capture/ccarheadset';
import WebARViewerCameraCapture from './camera-capture/ccwebarviewer';
import ARMarkerRelocalization from './armarker-reloc';
import CVWorkerMsgs from './worker-msgs';
import { ARENA_EVENTS } from '../../constants';
import { ARENAUtils } from '../../utils';

const MAX_PERSISTENT_ANCHORS = 7;

/**
 * ARMarker System. Supports ARMarkers in a scene.
 * @module armarker-system
 */
AFRAME.registerSystem('armarker', {
    schema: {
        /* camera capture debug: creates a plane texture-mapped with the camera frames */
        debugCameraCapture: { default: false },
        /* relocalization debug messages output */
        debugRelocalization: { default: false },
        /* networked marker solver flag; let relocalization up to a networked solver;
           NOTE: at armarker init time, we look up scene options to set this flag */
        networkedLocationSolver: { default: false },
        /* how often we update markers from ATLAS; 0=never */
        ATLASUpdateIntervalSecs: { default: 30 },
        /* how often we tigger a device location update; 0=never */
        devLocUpdateIntervalSecs: { default: 0 },
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
    originMatrix: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1),
    // if we detected WebXRViewer/WebARViewer
    isWebXRViewer: ARENAUtils.isWebXRViewer(),
    initialLocalized: false,

    originAnchor: undefined,
    pendingOriginAnchor: undefined,
    /*
     * Init system
     * @param {object} marker - The marker component object to register.
     * @alias module:armarker-system
     */
    init() {
        ARENA.events.addMultiEventListener(
            [ARENA_EVENTS.ARENA_LOADED, ARENA_EVENTS.SCENE_OPT_LOADED],
            this.ready.bind(this)
        );
    },

    ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];

        // init this.ATLASMarkers with list of markers within range
        // this.getARMArkersFromATLAS(true);

        // init networkedLocationSolver flag from ARENA scene options
        this.data.networkedLocationSolver = !!this.arena.networkedLocationSolver;

        // request camera access features
        if (!ARENA.params.camFollow) {
            const { optionalFeatures } = sceneEl.systems.webxr.data;
            if (this.isWebXRViewer) {
                optionalFeatures.push('computerVision'); // request custom 'computerVision' feature in XRBrowser
            } else optionalFeatures.push('camera-access'); // request WebXR 'camera-access' otherwise
            sceneEl.systems.webxr.sceneEl.setAttribute('optionalFeatures', optionalFeatures);
        }

        // listener for AR session start
        if (sceneEl.hasWebXR && navigator.xr && navigator.xr.addEventListener) {
            // This is delayed from `enter-vr` to a referenceSpace is acquired.
            // Will not fire for WebXR browser (see webxr-device-manager)
            sceneEl.renderer.xr.addEventListener('sessionstart', () => {
                if (sceneEl.is('ar-mode')) {
                    const { xrSession } = sceneEl;
                    this.webXRSessionStarted(xrSession).then(() => {});
                }
            });
        }
    },
    /*
     * System attribute update
     * @param {object} oldData - previous attribute values.
     * @alias module:armarker-system
     */
    update() {
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

            this.xrRefSpace = AFRAME.scenes[0].renderer.xr.getReferenceSpace();

            const persistedOriginAnchor = window.localStorage.getItem('originAnchor');
            if (xrSession.persistentAnchors && persistedOriginAnchor) {
                xrSession
                    .restorePersistentAnchor(persistedOriginAnchor)
                    .then((anchor) => {
                        this.originAnchor = anchor;
                        xrSession.requestAnimationFrame((time, frame) => {
                            const originPose = frame.getPose(anchor.anchorSpace, this.xrRefSpace);
                            if (originPose) {
                                const {
                                    transform: { position, orientation },
                                } = originPose;
                                const orientationQuat = new THREE.Quaternion(
                                    orientation.x,
                                    orientation.y,
                                    orientation.z,
                                    orientation.w
                                );
                                const rig = document.getElementById('cameraRig');
                                const spinner = document.getElementById('cameraSpinner');
                                rig.object3D.position.copy(position);
                                spinner.object3D.rotation.setFromQuaternion(orientationQuat);
                            }
                        });
                    })
                    .catch(() => {
                        console.warn('Could not restore persisted origin anchor');
                        xrSession.persistentAnchors.forEach(async (anchor) => {
                            try {
                                await xrSession.restorePersistentAnchor(anchor);
                            } catch (err) {
                                console.warn('Could not delete persisted anchor');
                            }
                        });
                        window.localStorage.removeItem('originAnchor');
                    });
            } else {
                window.localStorage.removeItem('originAnchor');
            }
        }

        // init cv pipeline, if we are not using an external localizer
        if (!ARENA.params.camFollow) {
            this.initCVPipeline();
        }
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
        if (AFRAME.utils.device.isOculusBrowser()) return;
        this.cvPipelineInitializing = true;
        // try to set up a WebXRViewer/WebARViewer (custom iOS browser) camera capture pipeline
        if (this.isWebXRViewer) {
            try {
                this.cameraCapture = new WebARViewerCameraCapture(this.data.debugCameraCapture);
            } catch (err) {
                this.cvPipelineInitializing = false;
                console.warn(`Could not create WebXRViewer/WebARViewer camera capture. ${err}`);
                return; // we are done here
            }
        }

        // if we are on an AR headset, use camera facing forward
        const arHeadset = ARENAUtils.detectARHeadset();
        if (arHeadset !== 'unknown') {
            // try to set up a camera facing forward capture (using getUserMedia)
            console.info('Setting up AR Headset camera capture.');
            try {
                this.cameraCapture = new ARHeadsetCameraCapture(ARENA.arHeadset, this, this.data.debugCameraCapture);
            } catch (err) {
                console.warn(`Could not create AR Headset camera capture. ${err}`);
            }
        }

        if (!this.cameraCapture) {
            // Not WebXRViewer/WebARViewer, not AR headset
            // ignore camera capture when in VR Mode
            const sceneEl = document.querySelector('a-scene');
            if (!sceneEl.is('ar-mode')) {
                console.info('Attempted to initialize camera capture, but found VR Mode.');
                return;
            }

            if (window.XRWebGLBinding) {
                // Set up a webxr camera capture (e.g. passthrough AR on a phone)
                console.info('Setting up WebXR-based passthrough AR camera capture.');
                try {
                    this.cameraCapture = new WebXRCameraCapture(
                        this.webXRSession,
                        this.gl,
                        this.data.debugCameraCapture
                    );
                } catch (err) {
                    this.cvPipelineInitializing = false;
                    console.error(`No valid CV camera capture found. ${err}`);
                    return; // no valid cv camera capture; we are done here
                }
            } else {
                // Final fallthrough to Spot AR, no real WebXR support
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
        this.cvWorker = new Worker(new URL('dist/apriltag.js', import.meta.url), { type: 'module' });
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

        ARENA.events.emit(ARENA_EVENTS.CV_INITIALIZED);

        // send size of known markers to cvWorker (so it can compute pose)
        Object.entries(this.markers).forEach(([mid, marker]) => {
            const newMarker = {
                type: CVWorkerMsgs.type.KNOWN_MARKER_ADD,
                // marker id
                markerid: mid,
                // marker size in meters (marker component size is mm)
                size: marker.data.size / 1000,
            };
            this.cvWorker.postMessage(newMarker);
        });
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
                    const detectionEvent = new CustomEvent('armarker-detection', {
                        detail: {
                            detections: cvWorkerMsg.detections,
                            ts: cvWorkerMsg.ts,
                        },
                    });
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
    async getARMArkersFromATLAS(init = false) {
        if (!window.ARENA) return false; // requires ARENA
        const { ARENA } = window;

        // at init time, make sure we fetch ar markers from ATLAS
        if (init) {
            this.lastATLASUpdate = new Date();
            this.lastdevLocUpdate = new Date();
        }

        // check if we should trigger a device location update
        if (this.data.devLocUpdateIntervalSecs > 0) {
            if (new Date() - this.lastdevLocUpdate < this.data.devLocUpdateIntervalSecs * 1000) {
                ARENAUtils.getLocation((coords, err) => {
                    if (!err) ARENA.clientCoords = coords;
                    this.lastdevLocUpdate = new Date();
                });
            }
        }
        if (ARENA.clientCoords === undefined) {
            console.warn('No device location! Cannot query ATLAS.');
            return false;
        }
        const position = ARENA.clientCoords;

        // ATLASUpdateIntervalSecs=0: only update tags at init
        if (this.data.ATLASUpdateIntervalSecs === 0 && !init) return false;

        // limit to ATLASUpdateIntervalSecs update interval
        if (new Date() - this.lastATLASUpdate < this.data.ATLASUpdateIntervalSecs * 1000) {
            return false;
        }
        fetch(
            `${ARENA.ATLASurl}/lookup/geo?objectType=apriltag&distance=20&units=km&lat=${position.latitude}&long=${position.longitude}`
        )
            .then((response) => {
                window.this.lastATLASUpdate = new Date();
                return response.json();
            })
            .catch(() => {
                console.warn('Error retrieving ATLAS markers');
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
     * Register an ARMarker component with the system
     * @param {object} marker - The marker component object to register.
     * @alias module:armarker-system
     */
    async registerComponent(marker) {
        this.markers[marker.data.markerid] = marker;
        if (this.cvPipelineInitialized) {
            // indicate cv worker that a marker was added
            const newMarker = {
                type: CVWorkerMsgs.type.KNOWN_MARKER_ADD,
                // marker id
                markerid: marker.data.markerid,
                // marker size in meters (marker component size is mm)
                size: marker.data.size / 1000,
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
    unregisterComponent(marker) {
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
     * @param {object} mtype - The marker type 'apriltag_36h11', 'lightanchor', 'uwb', 'vive', 'optitrack' to filter for;
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
    getAll(mtype = undefined) {
        if (mtype === undefined) return this.markers;
        return Object.assign(
            {},
            ...Object.entries(this.markers)
                .filter(([, v]) => v.data.markertype === mtype)
                .map(([k, v]) => ({ [k]: v }))
        );
    },
    /**
     * Get a marker given its markerid; first lookup local scene objects, then ATLAS
     * Marker with ID 0 is assumed to be at (x, y, z) 0, 0, 0
     * @param {string} markerid - The marker id to return (converts to string, if a string is not given)
     * @return {object} - the marker with the markerid given or undefined
     * @alias module:armarker-system
     */
    getMarker(markerid) {
        if (!(typeof markerid === 'string' || markerid instanceof String)) {
            // eslint-disable-next-line no-param-reassign
            markerid = String(markerid); // convert markerid to string
        }
        const sceneTag = this.markers[markerid];
        if (sceneTag !== undefined) {
            const markerPose = sceneTag.el.object3D.matrixWorld; // get object world matrix
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            markerPose.decompose(pos, quat, scale);
            const markerPoseNoScale = new THREE.Matrix4(); // create a world matrix with only position and rotation
            markerPoseNoScale.makeRotationFromQuaternion(quat);
            markerPoseNoScale.setPosition(pos);
            return { ...sceneTag.data, obj_id: sceneTag.el.id, pose: markerPoseNoScale };
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
            // if (ARENA.clientCoords === undefined) {
            //     ARENAUtils.getLocation((coords, err) => {
            //         if (!err) ARENA.clientCoords = coords;
            //     });
            // }
            // force update from ATLAS if not found
            // this.getARMArkersFromATLAS();
        }
        return this.ATLASMarkers[String(markerid)];
    },

    /**
     * Add an anchor to the origin of the XR reference space, persisting if possible. This is NOT pose synced
     * to the originating frame, but since this likely triggered off a marker detection requiring low motion
     * and good visual acquisition of target area, or outside-in localizer like Optitrack, good enough.
     * @param {{position: {x, y, z}, rotation: {x,y,z,w}}} originAnchor - The anchor object to create
     * @param {XRFrame} xrFrame - must be passed directly from requestAnimationFrame callback
     */
    setOriginAnchor({ position, rotation }, xrFrame) {
        if (!this.webXRSession || !this.xrRefSpace) {
            // This may be a webar session. Don't try to anchor
            return;
        }
        if (!xrFrame) {
            console.error("No XRFrame available, can't set origin anchor");
            return;
        }
        const anchorPose = new XRRigidTransform(position, rotation);
        xrFrame.createAnchor(anchorPose, this.xrRefSpace).then(async (anchor) => {
            // Persist, currently Quest browser only
            if (anchor.requestPersistentHandle) {
                const oldPersistAnchor = window.localStorage.getItem('originAnchor');
                if (oldPersistAnchor) {
                    // Delete the old anchor
                    await this.webXRSession.deletePersistentAnchor(oldPersistAnchor);
                }
                // Check how many anchors there are, Quest has a low limit currently
                if (this.webXRSession.persistentAnchors.length >= MAX_PERSISTENT_ANCHORS) {
                    // Delete the oldest anchor
                    const oldestAnchor = this.webXRSession.persistentAnchors.values().next().value;
                    await this.webXRSession.deletePersistentAnchor(oldestAnchor);
                }
                anchor
                    .requestPersistentHandle()
                    .then((handle) => {
                        // Save the new one
                        window.localStorage.setItem('originAnchor', handle);
                    })
                    .catch((err) => {
                        console.error('Could not persist anchor', err);
                    });
            } else if (this.originAnchor) {
                this.originAnchor.delete();
            }
            this.originAnchor = anchor;
            this.pendingOriginAnchor = false;
        });
    },
});
