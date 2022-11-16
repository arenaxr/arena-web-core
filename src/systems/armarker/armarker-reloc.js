/* eslint-disable no-throw-literal */
/* global ARENA */

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
    /* reference to ARMarker system (we ask the ARMarker system data about known markers) */
    arMarkerSystem;
    /* let relocalization up to a networked solver */
    networkedLocationSolver;
    /* debug; output debug messages */
    debug;
    /* cameraSpinner and cameraRig scene object3D instances */
    cameraSpinnerObj3D;
    cameraRigObj3D;
    /* base/default detection msg attributes; initialized in constructor */
    DFT_DETECTION_MSG;
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
        1, 0, 0, 0,
        0, -1, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 1);

    /* error and movement thresholds */
    DTAG_ERROR_THRESH = 1e-3;
    MOVE_THRESH = 0.05;
    ROT_THRESH = 0.087;

    // MOVE_THRESH = 0.0125;
    // ROT_THRESH = 0.02175;

    /**
     * Singleton constructor; init internal options and other data; setup detection event handler
     * @param {function} arMakerSys - ARMarker system; to lookup markers
     * @param {object} detectionsEventTarget - Detections event target
     * @param {boolean} [networkedLocationSolver=false] - If true, send detection messages to pubsub
     * @param {boolean} [debug=false] - If true, output debug messages
     */
    constructor({
        arMakerSys,
        detectionsEventTarget,
        networkedLocationSolver = false,
        debug = false,
    }) {
        if (detectionsEventTarget === undefined) throw 'Please provide a detection event target';
        // singleton
        if (ARMarkerRelocalization.instance) {
            return ARMarkerRelocalization.instance;
        }
        ARMarkerRelocalization.instance = this;

        // check/init internal options
        if (networkedLocationSolver==true) {
            if (!ARENA) throw 'Networked tag solver requires ARENA functionality.';
            console.info('networkedLocationSolver = true; letting relocalization up to a networked solver.');
        }
        this.arMakerSystem = arMakerSys;
        this.networkedLocationSolver = networkedLocationSolver;
        this.debug = debug;
        this.cameraObject3D = document.getElementById('my-camera').object3D;
        this.cameraSpinnerObj3D = document.getElementById('cameraSpinner').object3D;
        this.cameraRigObj3D = document.getElementById('cameraRig').object3D;
        // init base/default detection msg attributes and freeze it; we create copies of it object
        this.DFT_DETECTION_MSG = {
            scene: ARENA.sceneName,
            namespace: ARENA.nameSpace,
            camera_id: ARENA.camName,
            type: 'armarker',
        };
        Object.freeze(this.DFT_DETECTION_MSG); // no more changes
        if (!this.cameraObject3D || !this.cameraSpinnerObj3D || !this.cameraRigObj3D) {
        // wait for scene to load and try again
            document.querySelector('a-scene').addEventListener('loaded', () => {
                this.cameraObject3D = document.getElementById('my-camera').object3D;
                this.cameraSpinnerObj3D = document.getElementById('cameraSpinner').object3D;
                this.cameraRigObj3D = document.getElementById('cameraRig').object3D;
                // eslint-disable-next-line max-len
                if (!this.cameraObject3D || !this.cameraSpinnerObj3D || !this.cameraRigObj3D) throw 'Camera rig and camera spinner are required for relocalization!';
            });
        }

        // setup marker detection event listener
        detectionsEventTarget.addEventListener(
            'armarker-detection',
            this.markerDetection.bind(this),
        );
    }

    /**
     * Used to filter out detections while shaking/moving too much
     * @param {number} vioPrev - previous VIO Matrix
     * @param {number} vioCur - current VIO Matrix
     * @return {boolean} - boolean indicating if we should ignore a detecion or not
     */
    vioFilter(vioPrev, vioCur) {
        this.vioMatrixDiff.multiplyMatrices(vioPrev, vioCur); // posediff = pose2 @ np.linalg.inv(pose1)
        // eslint-disable-next-line max-len
        const moveDiff = this.vioPosDiff.setFromMatrixPosition(this.vioMatrixDiff).length(); // np.linalg.norm(posediff[0:3, 3])
        if (moveDiff > this.MOVE_THRESH) {
            return false;
        }
        const rotDiff = Math.acos(
            (this.vioMatrixDiff.elements[0] +
          this.vioMatrixDiff.elements[5] +
          this.vioMatrixDiff.elements[10] -
          1) /
          2,
        ); // math.acos((np.trace(posediff[0:3, 0:3]) - 1) / 2)
        if (rotDiff > this.ROT_THRESH) {
            return false;
        }
        return true;
    }

    /**
     * Marker detection handler as setup in class constructor
     * @param {object} e - event data in the format below
     * @example <caption>event.detail contains a detections array and a
     *          timestamp (of when frame was captured) as follows:</caption>
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
        if (this.debug) console.log('Tag detected:', e.detail);
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

        if (this.networkedLocationSolver) {
            // create message
            const jsonMsg = Object.assign({}, this.DFT_DETECTION_MSG, {
                timestamp: timestamp,
                vio: vio,
                detections: [],
            });
            for (const detection of detections) {
                const d = detection;
                if (d.pose.e > this.DTAG_ERROR_THRESH) {
                    continue;
                }
                delete d.corners;
                delete d.center;
                // get marker info
                const indexedTag = this.arMakerSystem.getMarker(d.id);
                if (indexedTag?.pose) {
                    d.refTag = indexedTag;
                }
                jsonMsg.detections.push(d);
            }
            ARENA.Mqtt.publish(
                `${ARENA.defaults.realm}/g/a/${ARENA.camName}`,
                JSON.stringify(jsonMsg),
            );
        }
        // this the one
        if (!this.networkedLocationSolver) {
            let localizerTag = false;
            const pubDetList = [];
            for (const detection of detections) {
                if (detection.pose.e > this.DTAG_ERROR_THRESH) {
                    // eslint-disable-next-line max-len
                    if (this.debug) console.warn(`Tag id ${detection.id} detection: error threshold exceeded (error=${detection.pose.e})`);
                    continue;
                }
                delete detection.corners;
                delete detection.center;
                let refTag = null;
                // get marker data
                const indexedTag = this.arMakerSystem.getMarker(detection.id);
                if (indexedTag?.pose) refTag = indexedTag;
                if (!refTag) {
                    if (this.debug) console.log('ARMarker system has no data about tag id:', detection.id);
                    continue;
                } else if (this.debug) console.log('ARMarker system found tag:', refTag);

                // publish this detection ?
                if (refTag.publish == true) {
                    detection.refTag = refTag;
                    pubDetList.push(detection);
                };

                // tag is static ?
                if (!refTag.dynamic) {
                    if (vioStable && !localizerTag) {
                        const rigPose = this.getRigPoseFromAprilTag(detection.pose, refTag.pose);
                        if (this.debug) console.log('Applying transform:', rigPose);
                        this.cameraSpinnerObj3D.quaternion.setFromRotationMatrix(rigPose);
                        this.cameraRigObj3D.position.setFromMatrixPosition(rigPose);
                        localizerTag = true;
                        /* Rig update for networked solver, disable for now **
                          this.rigMatrixT.copy(rigPose)
                          // Flip to column-major, so that rigPose.elements comes out row-major for numpy;
                          this.rigMatrixT.transpose();
                        */
                        this.arMakerSystem.initialLocalized = true;
                    }
                } else if (refTag.dynamic && refTag.publish==false) { // tag is dynamic? push update if publish=false
                    if (ARENA && ARENA.isUserSceneWriter()) {
                        // Dynamic + writable, push marker update
                        if (this.rigMatrix.equals(this.identityMatrix)) {
                            // eslint-disable-next-line max-len
                            if (this.debug) console.warn('Client apriltag solver no calculated this.rigMatrix yet, zero on origin tag first');
                        } else {
                            if (this.debug) console.log(`Pushing update for tag ${detection.id}`);
                            const tagPose = this.getTagPoseFromRig(detection.pose);
                            this.tagPoseRot.setFromRotationMatrix(tagPose);
                            // Send update directly to scene (arguments order such that we overwrite 'type')
                            const jsonMsg = Object.assign({}, this.DFT_DETECTION_MSG, {
                                object_id: refTag.obj_id,
                                action: 'update',
                                type: 'object',
                                persist: true,
                                data: {
                                    position: {
                                        x: tagPose.elements[12],
                                        y: tagPose.elements[13],
                                        z: tagPose.elements[14],
                                    },
                                    rotation: {
                                        x: this.tagPoseRot.x,
                                        y: this.tagPoseRot.y,
                                        z: this.tagPoseRot.z,
                                        w: this.tagPoseRot.w,
                                    },
                                },
                            });
                            // eslint-disable-next-line max-len
                            if (this.debug) console.info('Publish', JSON.stringify(jsonMsg), 'to', `${ARENA.defaults.realm}/s/${ARENA.namespacedScene}/${refTag.obj_id}`);
                            ARENA.Mqtt.publish(
                                `${ARENA.defaults.realm}/s/${ARENA.namespacedScene}/${refTag.obj_id}`,
                                JSON.stringify(jsonMsg),
                            );
                        }
                    } else console.error('Object update not sent; User does not have write permissions!');
                }

                // do we have detected markers to publish ?
                if (pubDetList.length > 0 && ARENA) {
                    const jsonMsg = Object.assign({}, this.DFT_DETECTION_MSG, {
                        timestamp: timestamp,
                        vio: vio,
                        detections: pubDetList,
                        geolocation: {
                            latitude: ARENA.clientCoords.latitude,
                            longitude: ARENA.clientCoords.longitude,
                        },
                        localize_tag: true,
                    });
                    // eslint-disable-next-line max-len
                    if (this.debug) console.info('Publish', JSON.stringify(jsonMsg), 'to', `${ARENA.defaults.realm}/g/a/${ARENA.camName}`);
                    ARENA.Mqtt.publish(
                        `${ARENA.defaults.realm}/g/a/${ARENA.camName}`,
                        JSON.stringify(jsonMsg),
                    );
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
            0, 0, 0, 1,
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
            0, 0, 0, 1,
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

