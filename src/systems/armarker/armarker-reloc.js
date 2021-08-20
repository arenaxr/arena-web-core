/* global AFRAME, ARENA */

/**
 * @fileoverview
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 * @authors Ivan Liang, Nuno Pereira
 */

/**
 *
 */
 export default class ARMarkerRelocalization {
    /* singleton instance */
    static #instance = null;
    /* ARMarker system instance */
    #ARMarkerSystem;
    /* let relocalization up to a networked solver */
    #networkedTagSolver;
    /* publish detections */
    #publishDetections;
    /* build mode */
    #builder;
    /*  */
    #dtagMatrix = new THREE.Matrix4();
    #rigMatrix = new THREE.Matrix4();
    #vioMatrixPrev = new THREE.Matrix4();
    #vioMatrix = new THREE.Matrix4();
    #vioMatrixInv = new THREE.Matrix4();
    #vioMatrixDiff = new THREE.Matrix4();
    #tagPoseMatrix = new THREE.Matrix4();
    #identityMatrix = new THREE.Matrix4();
    #vioRot = new THREE.Quaternion();
    #vioPos = new THREE.Vector3();
    #vioPosDiff = new THREE.Vector3();
    #tagPoseRot = new THREE.Quaternion();
    #originMatrix = new THREE.Matrix4();
    #flipMatrix = new THREE.Matrix4();
  
    #DTAG_ERROR_THRESH = 5e-6;
    #MOVE_THRESH = 0.05;
    #ROT_THRESH = 0.087;
  
    /**
     * Singleton constructor; init internal options and other data; setup detection event handler
     */
    constructor({
      ARMarkerSystem = undefined,
      networkedTagSolver = false,
      publishDetections = false,
      builder = false,
      debug = false
    }) {
      if (ARMarkerSystem == undefined) throw "Please provide a ARMarkerSystem";
      // singleton
      if (ARMarkerRelocalization.#instance) {
        return ARMarkerRelocalization.#instance;
      }
      ARMarkerRelocalization.#instance = this;
  
      // check/init internal options
      if ((publishDetections || networkedTagSolver || builder) && !ARENA) {
        throw "Publish detections, networked tag solver and builder mode require ARENA functionality.";
      }
      this.#networkedTagSolver = networkedTagSolver;
      this.#publishDetections = publishDetections;
      this.#builder = builder;
      this.#cameraSpinnerObj3D = document.getElementById(
        "cameraSpinner"
      ).object3D;
      this.#cameraRigObj3D = document.getElementById("cameraRig").object3D;
      if (!this.#cameraSpinnerObj3D || !this.#cameraRigObj3D)
        throw "Camera rig and camera spinner are required for relocalization!";
  
      // save ARMarker system instance to query Markers
      this.#ARMarkerSystem = ARMarkerSystem;
  
      // setup detection events listener
      this.#ARMarkerSystem.detectionEvts.addEventListener(
        "armarker-detection",
        this.markerDetection.bind(this)
      );
  
      // init origin matrix
      this.#originMatrix.set( // row-major
            1,  0, 0, 0,
            0,  0, 1, 0,
            0, -1, 0, 0,
            0,  0, 0, 1,
      );
      
      // init flip matrix
      this.#flipMatrix.set(
            1,  0,  0, 0,
            0, -1,  0, 0,
            0,  0, -1, 0,
            0,  0,  0, 1,
      );    
      
      setEventListner;
    }
  
    /**
     * Used to filter out detections while shaking/moving too much
     * @param {number} id - numeric id of tag
     * @return {boolean} - boolean indicating if we should ignore a detecion or not
     */
    vioFilter(vioPrev, vioCur) {
      this.#vioMatrixDiff.multiplyMatrices(vioPrev, vioCur); // posediff = pose2 @ np.linalg.inv(pose1)
      const moveDiff = this.#vioPosDiff.setFromMatrixPosition(this.#vioMatrixDiff).length(); // np.linalg.norm(posediff[0:3, 3])
      if (moveDiff > this.#MOVE_THRESH) {
        // console.log('Move Threshold Exceeded: ' + moveDiff);
        return false;
      }
      const rotDiff = Math.acos(
        (this.#vioMatrixDiff.elements[0] +
          this.#vioMatrixDiff.elements[5] +
          this.#vioMatrixDiff.elements[10] -
          1) /
          2
      ); // math.acos((np.trace(posediff[0:3, 0:3]) - 1) / 2)
      if (rotDiff > this.#ROT_THRESH) {
        // console.log('Move Threshold Exceeded: ' + moveDiff);
        return false;
      }
      return true;
    }
  
    /**
     * Retrieves ar markers, first from local scene objects
     * @param {number} id - numeric id of tag
     * @return {*} - tag or undefined
     */
    getMarker(id) {
      if (id == 0)
        return {
          id: "ORIGIN",
          uuid: "ORIGIN",
          pose: originMatrix
        };
      const sysTag = this.#ARMarkerSystem.get(id);
      if (sysTag !== undefined) {
        return {
          id: sysTag.data.markerid,
          uuid: sysTag.el.id,
          pose: sysTag.el.object3D.matrixWorld,
          dynamic: sysTag.data.dynamic,
          buildable: sysTag.data.buildable
        };
      }
      throw `Tag ID ${id} not found!`;
    }
  
    /**
     * Marker detection handler as setup in class constructor
     * @param {object} e - event data; e.detections contains the detection results.
     */
    markerDetection(e) {
      let detections = e.detections;
  
      /*
          // Save vio before processing apriltag. Don't touch global though
          const timestamp = new Date();
          this.#vioMatrixPrev.copy(this.#vioMatrix);
          const camParent = document.getElementById('my-camera').object3D.parent.matrixWorld;
          const cam = document.getElementById('my-camera').object3D.matrixWorld;
          this.#vioMatrix.copy(camParent).invert(); // this.#vioMatrix.getInverse(camParent);
          this.#vioMatrix.multiply(cam);
          this.#vioMatrixInv.copy(this.#vioMatrix).invert(); // vioMatrixT.getInverse(this.#vioMatrix);
          const vioStable = vioFilter(this.#vioMatrixPrev, this.#vioMatrixInv);
    
          this.#vioRot.setFromRotationMatrix(this.#vioMatrix);
          this.#vioPos.setFromMatrixPosition(this.#vioMatrix);
    
          const vio = {position: this.#vioPos, rotation: this.#vioRot};
          */
  
      if (detections.length) {
        if (this.#networkedTagSolver || this.#publishDetections) {
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
            if (d.pose.e > this.#DTAG_ERROR_THRESH) {
              continue;
            }
            delete d.corners;
            delete d.center;
            // get marker info
            const indexedTag = this.getMarker(d.id);
            if (indexedTag?.pose) {
              d.refTag = indexedTag;
            }
            jsonMsg.detections.push(d);
          }
          if (this.#builder) {
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
        if (!this.#networkedTagSolver) {
          let localizerTag;
          for (const detection of detections) {
            if (detection.pose.e > this.#DTAG_ERROR_THRESH) {
              console.warn(
                `Tag id ${detection.id} detection: error threshold exceeded (error=${detection.pose.e})`
              );
              continue;
            }
            const jsonMsg = {
              scene: ARENA.sceneName,
              namespace: ARENA.nameSpace,
              timestamp: timestamp,
              camera_id: ARENA.camName
            };
            delete detection.corners;
            delete detection.center;
            const dtagid = detection.id;
            let refTag = null;
            // get marker data
            const indexedTag = this.getMarker(dtagid);
            if (indexedTag?.pose) {
              refTag = indexedTag;
              /* ** No known result, try query if local solver **
                          } else if (ARENA.localTagSolver && await updateAprilTags()) {
                              refTag = ARENA.aprilTags[dtagid];
                          }
                          */
            }
            if (refTag) {
              if (!refTag.dynamic && !refTag.buildable) {
                if (vioStable && !localizerTag) {
                  const rigPose = this.#getRigPoseFromAprilTag(
                    detection.pose,
                    refTag.pose
                  );
                  this.#cameraSpinnerObj3D.quaternion.setFromRotationMatrix(
                    rigPose
                  );
                  this.#cameraRigObj3D.position.setFromMatrixPosition(rigPose);
                  localizerTag = true;
                  /* Rig update for networked solver, disable for now **
                                  rigMatrixT.copy(rigPose)
                                   // Flip to column-major, so that rigPose.elements comes out row-major for numpy;
                                  rigMatrixT.transpose();
                                  */
                }
              } else if (
                refTag.dynamic &&
                ARENA &&
                ARENA.chat.settings.isSceneWriter
              ) {
                // Dynamic + writable, push marker update
                if (this.#rigMatrix.equals(this.#identityMatrix)) {
                  console.log(
                    "Client apriltag solver no calculated this.#rigMatrix yet, zero on origin tag first"
                  );
                } else {
                  const tagPose = this.#getTagPoseFromRig(detection.pose);
                  this.#tagPoseRot.setFromRotationMatrix(tagPose);
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
                        x: this.#tagPoseRot.x,
                        y: this.#tagPoseRot.y,
                        z: this.#tagPoseRot.z,
                        w: this.#tagPoseRot.w
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
        //const ids = detections.map((tag) => tag.id);
        //console.log('April Tag IDs Detected: ' + ids.join(', '));
      }
      //updateAvgCVRate(Date.now() - start);
    }
  
    /**
     * Calculates the correct rigPose from detected aprilTag
     * @param {Object} dtag - Detected tag pose from camera
     * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
     * @param {Array.<number>} dtag.t - 1D translation array
     * @param {THREE.Matrix4} refTag - Tag pose from scene origin
     * @return {THREE.Matrix4} this.#rigMatrix
     */
    #getRigPoseFromAprilTag(dtag, refTag) {
      const r = dtag.R;
      const t = dtag.t;
  
      this.#dtagMatrix.set( // Transposed rotation
          r[0][0], r[1][0], r[2][0], t[0],
          r[0][1], r[1][1], r[2][1], t[1],
          r[0][2], r[1][2], r[2][2], t[2],
          0      , 0      , 0      , 1   ,
      );
      this.#dtagMatrix.premultiply(flipMatrix);
      this.#dtagMatrix.multiply(flipMatrix);
  
      // Python rig_pose = ref_tag_pose @ np.linalg.inv(dtag_pose) @ np.linalg.inv(vio_pose)
      this.#dtagMatrix.copy(this.#dtagMatrix).invert(); // this.#dtagMatrix.getInverse(this.#dtagMatrix);
      this.#rigMatrix.identity();
      this.#rigMatrix.multiplyMatrices(refTag, this.#dtagMatrix);
      this.#rigMatrix.multiply(this.#vioMatrixInv);
  
      return this.#rigMatrix;
    }
  
    /**
     * Calculates the pose of a detected AprilTag from scene origin
     * @param {Object} dtag - Detected tag pose from camera
     * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
     * @param {Array.<number>} dtag.t - 1D translation array
     * @return {THREE.Matrix4} this.#rigMatrix
     */
    #getTagPoseFromRig(dtag) {
      const r = dtag.R;
      const t = dtag.t;
      this.#dtagMatrix.set( // Transposed rotation
          r[0][0], r[1][0], r[2][0], t[0],
          r[0][1], r[1][1], r[2][1], t[1],
          r[0][2], r[1][2], r[2][2], t[2],
          0      , 0      , 0      , 1   ,
      );
      this.#dtagMatrix.premultiply(flipMatrix);
      this.#dtagMatrix.multiply(flipMatrix);
  
      // Python ref_tag_pose = rig_pose @ vio_pose @ dtag_pose
      this.#tagPoseMatrix.copy(this.#rigMatrix);
      this.#tagPoseMatrix.multiply(this.#vioMatrix);
      this.#tagPoseMatrix.multiply(this.#dtagMatrix);
  
      return this.#tagPoseMatrix;
    }
  }
  