/* ARENA global */

'use strict';

/* this is an example of processCV() that calls the wasm apriltag implementation */
import * as Comlink from 'https://unpkg.com/comlink/dist/esm/comlink.mjs';

const bufIndex = 0;
let cvThrottle = 0;
const dtagMatrix = new THREE.Matrix4();
const rigMatrix = new THREE.Matrix4();
// var rigMatrixT = new THREE.Matrix4();
const vioMatrixCopy = new THREE.Matrix4();
const vioMatrixCopyT = new THREE.Matrix4();
const tagPoseMatrix = new THREE.Matrix4();
const identityMatrix = new THREE.Matrix4();
const vioRot = new THREE.Quaternion();
const vioPos = new THREE.Vector3();
const tagPoseRot = new THREE.Quaternion();
const cvPerfTrack = Array(10).fill(16.66, 0, 10);
// Updates CV throttle from rolling avg of last 10 frame processing intervals in ms. min rate 1fps, max 60
const updateAvgCVRate = (lastInterval) => {
    cvPerfTrack.shift();
    cvPerfTrack.push(lastInterval);
    const avg = cvPerfTrack.reduce((a, c) => a + c) / cvPerfTrack.length;
    window.ARENA.cvRate = Math.ceil(60 / Math.max(1, Math.min(60, 1000 / avg)));
};

const originMatrix = new THREE.Matrix4();
originMatrix.set( // row-major
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1,
);
const ORIGINTAG = {
    id: 'ORIGIN',
    uuid: 'ORIGIN',
    pose: originMatrix,
};
const FLIPMATRIX = new THREE.Matrix4();
FLIPMATRIX.set(
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, -1, 0,
    0, 0, 0, 1,
);

// call processCV; Need to make sure we only do it after the wasm module is loaded
let fx = 0; let fy = 0; let cx = 0; let cy = 0;

window.processCV = async function(frame) {
    const ARENA = window.ARENA;
    cvThrottle++;
    if (cvThrottle % ARENA.cvRate) {
        return;
    }
    const start = Date.now();

    // console.log(frame);

    // Save vio before processing apriltag. Don't touch global though
    const timestamp = new Date();
    const camParent = document.getElementById('my-camera').object3D.parent.matrixWorld;
    const cam = document.getElementById('my-camera').object3D.matrixWorld;
    vioMatrixCopy.copy(camParent).invert(); // vioMatrixCopy.getInverse(camParent);
    vioMatrixCopy.multiply(cam);

    vioRot.setFromRotationMatrix(vioMatrixCopy);
    vioPos.setFromMatrixPosition(vioMatrixCopy);

    const vio = {position: vioPos, rotation: vioRot};

    if (frame._camera.cameraIntrinsics[0] != fx || frame._camera.cameraIntrinsics[4] != fy ||
        frame._camera.cameraIntrinsics[6] != cx || frame._camera.cameraIntrinsics[7] != cy) {
        fx = frame._camera.cameraIntrinsics[0];
        fy = frame._camera.cameraIntrinsics[4];
        cx = frame._camera.cameraIntrinsics[6];
        cy = frame._camera.cameraIntrinsics[7];
        aprilTag.set_camera_info(fx, fy, cx, cy); // set camera intrinsics for pose detection
    }

    const imgWidth = frame._buffers[bufIndex].size.width;
    const imgHeight = frame._buffers[bufIndex].size.height;

    const byteArray = Base64Binary.decodeArrayBuffer(frame._buffers[bufIndex]._buffer);
    // cut u and v values; grayscale image is just the y values
    const grayscaleImg = new Uint8Array(byteArray.slice(0, imgWidth * imgHeight));

    const detections = await aprilTag.detect(grayscaleImg, imgWidth, imgHeight);

    if (detections.length) {
        if (ARENA.networkedTagSolver || ARENA.publishDetections) {
            const jsonMsg = {
                scene: ARENA.renderParam,
                type: 'apriltag',
                timestamp: timestamp,
                camera_id: ARENA.camName,
            };
            jsonMsg.vio = vio;
            jsonMsg.detections = [];
            for (const detection of detections) {
                const d = detection;
                delete d.corners;
                delete d.center;
                // Known tag from ATLAS (includes Origin tag)
                if (d.id !== 0 && ARENA.aprilTags[d.id] && ARENA.aprilTags[d.id].pose) {
                    d.refTag = ARENA.aprilTags[d.id];
                }
                jsonMsg.detections.push(d);
            }
            if (ARENA.builder) {
                jsonMsg.geolocation = {
                    latitude: ARENA.clientCoords.latitude,
                    longitude: ARENA.clientCoords.longitude,
                };
                jsonMsg.localize_tag = true;
            }
            ARENA.Mqtt.publish(ARENA.defaults.realm + '/g/a/' + ARENA.camName, JSON.stringify(jsonMsg));
        }
        if (!ARENA.networkedTagSolver) {
            let localizerTag;
            for (const detection of detections) {
                const jsonMsg = {scene: ARENA.renderParam, timestamp: timestamp, camera_id: ARENA.camName};
                delete detection.corners;
                delete detection.center;
                const dtagid = detection.id;
                let refTag = null;
                // Known tag from ATLAS (includes Origin tag)
                if (ARENA.aprilTags[dtagid] && ARENA.aprilTags[dtagid].pose) {
                    refTag = ARENA.aprilTags[dtagid];
                    /* ** No known result, try query if local solver **
                    } else if (ARENA.localTagSolver && await updateAprilTags()) {
                        refTag = ARENA.aprilTags[dtagid];
                    }
                    */
                }
                if (refTag) { // If reference tag pose is known to solve locally, solve for rig offset
                    if (localizerTag) {
                        continue;
                        // Reconcile which localizer tag is better based on error?
                    } else {
                        const rigPose = getRigPoseFromAprilTag(vioMatrixCopy, detection.pose, refTag.pose);
                        document.getElementById('cameraSpinner').object3D.quaternion.setFromRotationMatrix(rigPose);
                        document.getElementById('cameraRig').object3D.position.setFromMatrixPosition(rigPose);
                        localizerTag = true;
                        /* ** Rig update for networked solver, disable for now **
                        rigMatrixT.copy(rigPose)
                         // Flip to column-major, so that rigPose.elements comes out row-major for numpy;
                        rigMatrixT.transpose();
                         */
                    }
                } else { // Unknown tag, dynamic place it
                    if (rigMatrix.equals(identityMatrix)) {
                        console.log('Client apriltag solver no calculated rigMatrix yet, zero on origin tag first');
                    } else {
                        const tagPose = getTagPoseFromRig(vioMatrixCopy, detection.pose, rigMatrix);
                        tagPoseRot.setFromRotationMatrix(tagPose);
                        // Send update directly to scene
                        Object.assign(jsonMsg, {
                            object_id: 'apriltag_' + dtagid,
                            action: 'update',
                            type: 'object',
                            data: {
                                'position': {
                                    'x': tagPose.elements[12],
                                    'y': tagPose.elements[13],
                                    'z': tagPose.elements[14],
                                },
                                'rotation': {
                                    'x': tagPoseRot.x,
                                    'y': tagPoseRot.y,
                                    'z': tagPoseRot.z,
                                    'w': tagPoseRot.w,
                                },
                            },
                        });
                        ARENA.Mqtt.publish(
                            'realm/s/' + ARENA.renderParam + '/apriltag_' +
                            dtagid, JSON.stringify(jsonMsg));
                    }
                }
            }
        }
        const ids = detections.map((tag) => tag.id);
        console.log('April Tag IDs Detected: ' + ids.join(', '));
    }
    updateAvgCVRate(Date.now() - start);
};

/**
 * Calculates the correct rigPose from detected aprilTag
 * @param {THREE.Matrix4} vioMatrix - Current vio of camera
 * @param {Object} dtag - Detected tag pose from camera
 * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
 * @param {Array.<number>} dtag.t - 1D translation array
 * @param {THREE.Matrix4} refTag - Tag pose from scene origin
 * @return {THREE.Matrix4} rigMatrix
 */
function getRigPoseFromAprilTag(vioMatrix, dtag, refTag) {
    const r = dtag.R;
    const t = dtag.t;

    dtagMatrix.set( // Transposed rotation
        r[0][0], r[1][0], r[2][0], t[0],
        r[0][1], r[1][1], r[2][1], t[1],
        r[0][2], r[1][2], r[2][2], t[2],
        0, 0, 0, 1,
    );
    dtagMatrix.premultiply(FLIPMATRIX);
    dtagMatrix.multiply(FLIPMATRIX);

    // Python rig_pose = ref_tag_pose @ np.linalg.inv(dtag_pose) @ np.linalg.inv(vio_pose)
    dtagMatrix.copy(dtagMatrix).invert(); // dtagMatrix.getInverse(dtagMatrix);
    vioMatrixCopyT.copy(vioMatrixCopy).invert(); // vioMatrixCopyT.getInverse(vioMatrixCopy);
    rigMatrix.identity();
    rigMatrix.multiplyMatrices(refTag, dtagMatrix);
    rigMatrix.multiply(vioMatrixCopyT);

    return rigMatrix;
}

/**
 * Calculates the pose of a detected AprilTag from scene origin
 * @param {THREE.Matrix4} vioMatrix - Current vio of camera
 * @param {Object} dtag - Detected tag pose from camera
 * @param {Array.<Array.<number>>} dtag.R - 2D rotation array
 * @param {Array.<number>} dtag.t - 1D translation array
 * @return {THREE.Matrix4} rigMatrix
 */
function getTagPoseFromRig(vioMatrix, dtag) {
    const r = dtag.R;
    const t = dtag.t;
    dtagMatrix.set( // Transposed rotation
        r[0][0], r[1][0], r[2][0], t[0],
        r[0][1], r[1][1], r[2][1], t[1],
        r[0][2], r[1][2], r[2][2], t[2],
        0, 0, 0, 1,
    );
    dtagMatrix.premultiply(FLIPMATRIX);
    dtagMatrix.multiply(FLIPMATRIX);

    // Python ref_tag_pose = rig_pose @ vio_pose @ dtag_pose
    tagPoseMatrix.copy(rigMatrix);
    tagPoseMatrix.multiply(vioMatrixCopy);
    tagPoseMatrix.multiply(dtagMatrix);

    return tagPoseMatrix;
}

/** show the image on a canvas; just for debug
function showGrayscaleImage(canvasid, pixeldata, imgWidth, imgHeight) {
    const canvas = document.getElementById(canvasid);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(imgWidth, imgHeight);

    // Iterate through every pixel
    for (let i = 0; i < imageData.data.length; i += 4) {
        const yv = pixeldata[i / 4]; // get pixel value

        // Modify pixel data
        imageData.data[i] = yv; // R value
        imageData.data[i + 1] = yv; // G value
        imageData.data[i + 2] = yv; // B value
        imageData.data[i + 3] = 255; // A value
    }

    // Draw image data to the canvas
    ctx.putImageData(imageData, 0, 0);
}
 */

/**
 * Queries ATLAS for all apriltags within geolocation
 * @return {Promise<boolean>}
 */
async function updateAprilTags() {
    const ARENA = window.ARENA;

    ARENA.aprilTags = {
        0: ORIGINTAG,
    };

    if (ARENA.clientCoords === undefined) {
        console.error('No device location! Cannot query ATLAS.');
        return false;
    }
    const position = ARENA.clientCoords;
    // limit to 3s update interval
    if (new Date() - ARENA.lastAprilTagUpdate < 3 * 1000) {
        return false;
    }
    fetch(ARENA.ATLASurl +
        '/lookup/geo?objectType=apriltag&distance=20&units=km&lat=' +
        position.latitude + '&long=' + position.longitude)
        .then((response) => {
            window.ARENA.lastAprilTagUpdate = new Date();
            return response.json();
        })
        .then((data) => {
            data.forEach((tag) => {
                const tagid = tag.name.substring(9);
                if (tagid !== 0) {
                    if (tag.pose && Array.isArray(tag.pose)) {
                        const tagMatrix = new THREE.Matrix4();
                        tagMatrix.fromArray(tag.pose.flat()); // comes in row-major, loads col-major
                        tagMatrix.transpose(); // flip properly to row-major
                        ARENA.aprilTags[tagid] = {
                            id: tagid,
                            uuid: tag.id,
                            pose: tagMatrix,
                        };
                    }
                }
            });
        });
    return true;
}

/**
Initializes aprilTag worker
 */
async function init() {
    const ARENA = window.ARENA;
    // WebWorkers use `postMessage` and therefore work with Comlink.
    const Apriltag = Comlink.wrap(new Worker('./src/apriltag/apriltag.js'));
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('builder')) {
        ARENA.builder = true;
        ARENA.networkedTagSolver = true;
    } else {
        ARENA.networkedTagSolver = !!urlParams.get('networkedTagSolver'); // Force into boolean
    }
    if (!ARENA.networkedTagSolver) {
        ARENA.publishDetections = !!urlParams.get('publishDetections'); // Force into boolean
    }
    ARENA.cvRate = urlParams.get('cvRate') ? Math.round(60 / parseInt(urlParams.get('cvRate'))) : 20;
    await updateAprilTags();
    // must call this to init apriltag detector; argument is a callback for when it is done loading
    window.aprilTag = await new Apriltag(Comlink.proxy(() => {
        // pass
    }));
}

init();
