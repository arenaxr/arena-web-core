/* global AFRAME, ARENA */

/**
 * @fileoverview Relocalization from AR Marker detection events
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 * @authors Ivan Liang, Nuno Pereira
 */

/**
 *
 */
 export class ARMarkerRelocalization {
    /* singleton instance */
    static instance = null;
    /* ARMarker system function that takes a marker id and returns its details */
    getArMaker;
    /* let relocalization up to a networked solver */
    networkedTagSolver;
    /* publish detections */
    publishDetections;
    /* build mode */
    builder;
    /* debug; output debug messages */
    debug;
    /* cameraSpinner and cameraRig scene object3D instances */
    cameraSpinnerObj3D;
    cameraRigObj3D;
    /* matrices used for relocalization */
    dtagMatrix = new THREE.Matrix4();
    rigMatrix = new THREE.Matrix4();
    vioMatrixPrev = new THREE.Matrix4();
    vioMatrix = new THREE.Matrix4();
    vioMatrixInv = new THREE.Matrix4();
    vioMatrixDiff = new THREE.Matrix4();
    tagPoseMatrix = new THREE.Matrix4();
    identityMatrix = new THREE.Matrix4();
    vioRot = new THREE.Quaternion();
    vioPos = new THREE.Vector3();
    vioPosDiff = new THREE.Vector3();
    tagPoseRot = new THREE.Quaternion();
    flipMatrix = new THREE.Matrix4().set(
            1,  0,  0, 0,
            0, -1,  0, 0,
            0,  0, -1, 0,
            0,  0,  0, 1);
    
    /* error and movement thresholds */
    DTAG_ERROR_THRESH = 7e-6;
    MOVE_THRESH = 0.05;
    ROT_THRESH = 0.087;
  
    /**
     * Singleton constructor; init internal options and other data; setup detection event handler
     * @param {function} getArMaker - ARMarker system function that takes a marker id and returns its details     
     * @param {object} detectionsEventTarget - Detections event target
     * @param {boolean} [networkedTagSolver=false] - If true, send detection messages to pubsub and do not perform relocalization
     * @param {boolean} [publishDetections=false] - If true, send detection messages to pubsub
     * @param {boolean} [builder=false]- If true, persist detected tags (build mode)
     * @param {boolean} [debug=false]- If true, output debug messages
     */
    constructor({
      getArMaker,
      detectionsEventTarget,
      networkedTagSolver = false,
      publishDetections = false,
      builder = false,
      debug = false
    }) {
      if (getArMaker === undefined) throw "Please provide a marker lookup function";
      if (detectionsEventTarget === undefined) throw "Please provide a detection event target";
      // singleton
      if (ARMarkerRelocalization.instance) {
        return ARMarkerRelocalization.instance;
      }
      ARMarkerRelocalization.instance = this;
  
      // check/init internal options
      if ((publishDetections || networkedTagSolver || builder) && !window.ARENA) {
        throw "Publish detections, networked tag solver and builder mode require ARENA functionality.";
      }
      this.networkedTagSolver = networkedTagSolver;
      this.publishDetections = publishDetections;
      this.builder = builder;
      this.debug = debug;
      this.cameraObject3D = document.getElementById('my-camera').object3D;
      this.cameraSpinnerObj3D = document.getElementById("cameraSpinner").object3D;
      this.cameraRigObj3D = document.getElementById("cameraRig").object3D;
      if (!this.cameraObject3D || !this.cameraSpinnerObj3D || !this.cameraRigObj3D) {
        // wait for scene to load and try again
        document.querySelector('a-scene').addEventListener('loaded', () => {
            this.cameraObject3D = document.getElementById('my-camera').object3D;
            this.cameraSpinnerObj3D = document.getElementById("cameraSpinner").object3D;
            this.cameraRigObj3D = document.getElementById("cameraRig").object3D;
            if (!this.cameraObject3D || !this.cameraSpinnerObj3D || !this.cameraRigObj3D) throw "Camera rig and camera spinner are required for relocalization!";            
        })  
      }
        
      // save ARMarker system function to lookup markers
      this.getArMaker = getArMaker;
  
      // setup marker detection event listener
      detectionsEventTarget.addEventListener(
        "armarker-detection",
        this.markerDetection.bind(this)
      );

    }
  
    /**
     * Used to filter out detections while shaking/moving too much
     * @param {number} id - numeric id of tag
     * @return {boolean} - boolean indicating if we should ignore a detecion or not
     */
    vioFilter(vioPrev, vioCur) {
      this.vioMatrixDiff.multiplyMatrices(vioPrev, vioCur); // posediff = pose2 @ np.linalg.inv(pose1)
      const moveDiff = this.vioPosDiff.setFromMatrixPosition(this.vioMatrixDiff).length(); // np.linalg.norm(posediff[0:3, 3])
      if (moveDiff > this.MOVE_THRESH) {
        return false;
      }
      const rotDiff = Math.acos(
        (this.vioMatrixDiff.elements[0] +
          this.vioMatrixDiff.elements[5] +
          this.vioMatrixDiff.elements[10] -
          1) /
          2
      ); // math.acos((np.trace(posediff[0:3, 0:3]) - 1) / 2)
      if (rotDiff > this.ROT_THRESH) {
        return false;
      }
      return true;
    }
  
    /**
     * Marker detection handler as setup in class constructor
     * @param {object} e - event data in the format below
     * @example <caption>event.detail contains a detections array and a timestamp (of when frame was captured) as follows:</caption>
     *   detections: [
     *     {
     *       id: 0,
     *       size: 0.1,
     *       corners: [
     *         { x: 777.52, y: 735.39 },
     *         { x: 766.05, y: 546.94 },
     *         { x: 578.36, y: 587.88 },
     *         { x: 598, y: 793.42 }
     *       ],
     *       center: { x: 684.52, y: 666.51 },
     *       pose: {
     *         R: [
     *           [0.91576, -0.385813, 0.111941],
     *           [-0.335306, -0.887549, -0.315954],
     *           [-0.221252, -0.251803, 0.942148]
     *         ],
     *         t: [0.873393, 0.188183, 0.080928],
     *         e: 0.00000058,
     *         asol: {
     *           R: [
     *             [0.892863, -0.092986, -0.440623],
     *             [0.077304, 0.995574, -0.053454],
     *             [0.443644, 0.013666, 0.896099]
     *           ],
     *           t: [0.040853, -0.032423, 1.790318],
     *           e: 0.00000078
     *         }
     *       }
     *
     *   }],
     *   ts: Mon Aug 23 2021 15:49:00 GMT-0400 (Eastern Daylight Time)
     */
    markerDetection(e) {
        const ARENA = window.ARENA;
        if (this.debug) console.log("Tag detected:", e.detail);
        const detections = e.detail.detections; 
        const timestamp = e.detail.ts; // detection timestamp = when frame was captured
      
        // Save vio before processing apriltag
        this.vioMatrixPrev.copy(this.vioMatrix);
        const camParent = this.cameraObject3D.parent.matrixWorld;
        const cam = this.cameraObject3D.matrixWorld;
        this.vioMatrix.copy(camParent).invert(); // this.vioMatrix.getInverse(camParent);
        this.vioMatrix.multiply(cam);
        this.vioMatrixInv.copy(this.vioMatrix).invert(); // vioMatrixT.getInverse(this.vioMatrix);
        const vioStable = this.vioFilter(this.vioMatrixPrev, this.vioMatrixInv);

        this.vioRot.setFromRotationMatrix(this.vioMatrix);
        this.vioPos.setFromMatrixPosition(this.vioMatrix);

        const vio = {position: this.vioPos, rotation: this.vioRot};
        
        if (this.networkedTagSolver || this.publishDetections) {
            // TODO: change message to 'armarker' ?
            const jsonMsg = {
                scene: ARENA.sceneName,
                namespace: ARENA.nameSpace,
                type: "apriltag",
                timestamp: timestamp,
                camera_id: ARENA.camName
            };
            jsonMsg.vio = vio;
            jsonMsg.detections = [];
            for (const detection of detections) {
                const d = detection;
                if (d.pose.e > this.DTAG_ERROR_THRESH) {
                    continue;
                }
                delete d.corners;
                delete d.center;
                // get marker info
                const indexedTag = this.getArMaker(d.id);
                if (indexedTag?.pose) {
                    d.refTag = indexedTag;
                }
                jsonMsg.detections.push(d);
            }
            if (this.builder) {
                jsonMsg.geolocation = {
                    latitude: ARENA.clientCoords.latitude,
                    longitude: ARENA.clientCoords.longitude
                };
                jsonMsg.localize_tag = true;
            }
            ARENA.Mqtt.publish(
                ARENA.defaults.realm + "/g/a/" + ARENA.camName,
                JSON.stringify(jsonMsg)
            );
        }
        if (!this.networkedTagSolver) {
            let localizerTag = false;
            for (const detection of detections) {
                if (detection.pose.e > this.DTAG_ERROR_THRESH) {
                    if (this.debug) console.warn(`Tag id ${detection.id} detection: error threshold exceeded (error=${detection.pose.e})`);
                    continue;
                }
              /*
                delete detection.corners;
                delete detection.center;
              */
                let refTag = null;
                // get marker data
                const indexedTag = this.getArMaker(detection.id);
                if (indexedTag?.pose) refTag = indexedTag;
                if (this.debug) console.log("ARMarker system found tag:", refTag);
                if (refTag) {
                    if (!refTag.dynamic && !refTag.buildable) {
                        if (vioStable && !localizerTag) {
                            const rigPose = this.getRigPoseFromAprilTag(detection.pose,refTag.pose);
                            if (this.debug) console.log("Applying transform:", rigPose);
                            this.cameraSpinnerObj3D.quaternion.setFromRotationMatrix(rigPose);
                            this.cameraRigObj3D.position.setFromMatrixPosition(rigPose);
                            localizerTag = true;
                            /* Rig update for networked solver, disable for now **
                              this.rigMatrixT.copy(rigPose)
                              // Flip to column-major, so that rigPose.elements comes out row-major for numpy;
                              this.rigMatrixT.transpose();
                            */
                        }
                    } else if (refTag.dynamic && ARENA && ARENA.chat.settings.isSceneWriter) {
                        // Dynamic + writable, push marker update
                        if (this.rigMatrix.equals(this.identityMatrix)) {
                            if (this.debug) console.warn("Client apriltag solver no calculated this.rigMatrix yet, zero on origin tag first");
                        } else {
                            if (this.debug) console.log(`Build mode; Pushing update for tag ${detection.id}`)
                            const jsonMsg = {
                                scene: ARENA.sceneName,
                                namespace: ARENA.nameSpace,
                                timestamp: timestamp,
                                camera_id: ARENA.camName
                            };                          
                            const tagPose = this.getArMaker(detection.pose);
                            this.tagPoseRot.setFromRotationMatrix(tagPose);
                            // Send update directly to scene
                            Object.assign(jsonMsg, {
                                object_id: refTag.uuid,
                                action: "update",
                                type: "object",
                                persist: true,
                                data: {
                                    position: {
                                        x: tagPose.elements[12],
                                        y: tagPose.elements[13],
                                        z: tagPose.elements[14]
                                    },
                                    rotation: {
                                        x: this.tagPoseRot.x,
                                        y: this.tagPoseRot.y,
                                        z: this.tagPoseRot.z,
                                        w: this.tagPoseRot.w
                                    }
                                }
                            });
                            ARENA.Mqtt.publish(
                                `realm/s/${ARENA.nameSpace}/${ARENA.sceneName}/${refTag.uuid}`,
                                JSON.stringify(jsonMsg)
                            );
                        }
                    }
                }
            }
        }
    }
  
    /**
     * Calculates the correct rigPose from detected aprilTag
     * @param {Object} dtag - Detected tag pose from camera
     * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
     * @param {Array.<number>} dtag.t - 1D translation array
     * @param {THREE.Matrix4} refTag - Tag pose from scene origin
     * @return {THREE.Matrix4} this.rigMatrix
     */
    getRigPoseFromAprilTag(dtag, refTag) {
      const r = dtag.R;
      const t = dtag.t;
  
      this.dtagMatrix.set( // Transposed rotation
          r[0][0], r[1][0], r[2][0], t[0],
          r[0][1], r[1][1], r[2][1], t[1],
          r[0][2], r[1][2], r[2][2], t[2],
          0      , 0      , 0      , 1   ,
      );
      this.dtagMatrix.premultiply(this.flipMatrix);
      this.dtagMatrix.multiply(this.flipMatrix);
  
      // Python rig_pose = ref_tag_pose @ np.linalg.inv(dtag_pose) @ np.linalg.inv(vio_pose)
      this.dtagMatrix.copy(this.dtagMatrix).invert(); // this.dtagMatrix.getInverse(this.dtagMatrix);
      this.rigMatrix.identity();
      this.rigMatrix.multiplyMatrices(refTag, this.dtagMatrix);
      this.rigMatrix.multiply(this.vioMatrixInv);
  
      return this.rigMatrix;
    }
  
    /**
     * Calculates the pose of a detected AprilTag from scene origin
     * @param {Object} dtag - Detected tag pose from camera
     * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
     * @param {Array.<number>} dtag.t - 1D translation array
     * @return {THREE.Matrix4} this.rigMatrix
     */
    getTagPoseFromRig(dtag) {
      const r = dtag.R;
      const t = dtag.t;
      this.dtagMatrix.set( // Transposed rotation
          r[0][0], r[1][0], r[2][0], t[0],
          r[0][1], r[1][1], r[2][1], t[1],
          r[0][2], r[1][2], r[2][2], t[2],
          0      , 0      , 0      , 1   ,
      );
      this.dtagMatrix.premultiply(this.flipMatrix);
      this.dtagMatrix.multiply(this.flipMatrix);
  
      // Python ref_tag_pose = rig_pose @ vio_pose @ dtag_pose
      this.tagPoseMatrix.copy(this.rigMatrix);
      this.tagPoseMatrix.multiply(this.vioMatrix);
      this.tagPoseMatrix.multiply(this.dtagMatrix);
  
      return this.tagPoseMatrix;
    }
  }
  