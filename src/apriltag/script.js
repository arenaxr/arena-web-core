/* global ARENA */

'use strict';

/* this is an example of processCV() that calls the wasm apriltag implementation */
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

var bufIndex = 0;
var cvThrottle = 0;
var dtagMatrix = new THREE.Matrix4()
var rigMatrix = new THREE.Matrix4();
// var rigMatrixT = new THREE.Matrix4();
var vioMatrixCopy = new THREE.Matrix4();
var vioMatrixCopyT = new THREE.Matrix4();
var tagPoseMatrix = new THREE.Matrix4();
var identityMatrix = new THREE.Matrix4();
var vioRot = new THREE.Quaternion();
var vioPos = new THREE.Vector3();
var tagPoseRot = new THREE.Quaternion();
var cvPerfTrack = Array(10).fill(16.66, 0, 10);
// Updates CV throttle from rolling avg of last 10 frame processing intervals in ms. min rate 1fps, max 60
let updateAvgCVRate = (lastInterval) => {
    cvPerfTrack.shift();
    cvPerfTrack.push(lastInterval);
    let avg = cvPerfTrack.reduce((a, c) => a + c) / cvPerfTrack.length;
    window.ARENA.cvRate = Math.ceil(60 / Math.max(1, Math.min(60, 1000 / avg)));
};

let originMatrix = new THREE.Matrix4();
originMatrix.set(  // row-major
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1
);
var ORIGINTAG = {
    id: 'ORIGIN',
    uuid: 'ORIGIN',
    pose: originMatrix
};
const FLIPMATRIX = new THREE.Matrix4();
FLIPMATRIX.set(
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, -1, 0,
    0, 0, 0, 1
);

// call processCV; Need to make sure we only do it after the wasm module is loaded
var fx = 0, fy = 0, cx = 0, cy = 0;

window.processCV = async function (frame) {
    let ARENA = window.ARENA;
    cvThrottle++;
    if (cvThrottle % ARENA.cvRate) {
        return;
    }
    let start = Date.now();

    // console.log(frame);

    // Save vio before processing apriltag. Don't touch global though
    let timestamp = new Date();
    let camParent = document.getElementById('my-camera').object3D.parent.matrixWorld;
    let cam = document.getElementById('my-camera').object3D.matrixWorld;
    vioMatrixCopy.copy(camParent).invert(); // vioMatrixCopy.getInverse(camParent);
    vioMatrixCopy.multiply(cam);

    vioRot.setFromRotationMatrix(vioMatrixCopy);
    vioPos.setFromMatrixPosition(vioMatrixCopy);

    let vio = {position: vioPos, rotation: vioRot};

    if (frame._camera.cameraIntrinsics[0] != fx || frame._camera.cameraIntrinsics[4] != fy ||
        frame._camera.cameraIntrinsics[6] != cx || frame._camera.cameraIntrinsics[7] != cy) {
        fx = frame._camera.cameraIntrinsics[0];
        fy = frame._camera.cameraIntrinsics[4];
        cx = frame._camera.cameraIntrinsics[6];
        cy = frame._camera.cameraIntrinsics[7];
        aprilTag.set_camera_info(fx, fy, cx, cy); // set camera intrinsics for pose detection
    }

    let imgWidth = frame._buffers[bufIndex].size.width;
    let imgHeight = frame._buffers[bufIndex].size.height;

    let byteArray = Base64Binary.decodeArrayBuffer(frame._buffers[bufIndex]._buffer);
    let grayscaleImg = new Uint8Array(byteArray.slice(0, imgWidth * imgHeight)); // cut u and v values; grayscale image is just the y values

    let detections = await aprilTag.detect(grayscaleImg, imgWidth, imgHeight);

    if (detections.length) {
        if (ARENA.networkedTagSolver || ARENA.publishDetections) {
            let jsonMsg = {scene: ARENA.renderParam, type: 'apriltag', timestamp: timestamp, camera_id: ARENA.camName};
            jsonMsg.vio = vio;
            jsonMsg.detections = [];
            for (let detection of detections) {
                let d = detection;
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
                    longitude: ARENA.clientCoords.longitude
                };
                jsonMsg.localize_tag = true;
            }
            ARENA.Mqtt.publish(ARENA.defaults.realm + '/g/a/' + ARENA.camName, JSON.stringify(jsonMsg));
        } 
        if (!ARENA.networkedTagSolver) {
            let localizerTag;
            for (let detection of detections) {
                let jsonMsg = {scene: ARENA.renderParam, timestamp: timestamp, camera_id: ARENA.camName};
                delete detection.corners;
                delete detection.center;
                let dtagid = detection.id;
                let refTag = null;
                if (ARENA.aprilTags[dtagid] && ARENA.aprilTags[dtagid].pose) { // Known tag from ATLAS (includes Origin tag)
                    refTag = ARENA.aprilTags[dtagid];
                    /*
                    } else if (ARENA.localTagSolver && await updateAprilTags()) { // No known result, try query if local solver
                        refTag = ARENA.aprilTags[dtagid];
                    }
                    */
                }
                if (refTag) { // If reference tag pose is known to solve locally, solve for rig offset
                    if (localizerTag) {
                        continue;
                        // Reconcile which localizer tag is better based on error?
                    } else {
                        let rigPose = getRigPoseFromAprilTag(vioMatrixCopy, detection.pose, refTag.pose);
                        document.getElementById('cameraSpinner').object3D.quaternion.setFromRotationMatrix(rigPose);
                        document.getElementById('cameraRig').object3D.position.setFromMatrixPosition(rigPose);
                        localizerTag = true;
                        /* ** Rig update for networked solver, disable for now
                        rigMatrixT.copy(rigPose);
                        rigMatrixT.transpose(); // Flip to column-major, so that rigPose.elements comes out row-major for numpy
                         */
                    }
                } else { // Unknown tag, dynamic place it
                    if (rigMatrix.equals(identityMatrix)) {
                        console.log("Client apriltag solver no calculated rigMatrix yet, zero on origin tag first");
                    } else {
                        let tagPose = getTagPoseFromRig(vioMatrixCopy, detection.pose, rigMatrix);
                        tagPoseRot.setFromRotationMatrix(tagPose);
                        // Send update directly to scene
                        Object.assign(jsonMsg, {
                            object_id: "apriltag_" + dtagid,
                            action: "update",
                            type: "object",
                            data: {
                                "position": {
                                    "x": tagPose.elements[12],
                                    "y": tagPose.elements[13],
                                    "z": tagPose.elements[14],
                                },
                                "rotation": {
                                    "x": tagPoseRot.x,
                                    "y": tagPoseRot.y,
                                    "z": tagPoseRot.z,
                                    "w": tagPoseRot.w,
                                },
                            }
                        });
                        ARENA.Mqtt.publish('realm/s/' + ARENA.renderParam + '/apriltag_' + dtagid, JSON.stringify(jsonMsg));
                    }
                }
            }
        }
        let ids = detections.map(tag => tag.id);
        console.log('April Tag IDs Detected: ' + ids.join(', '));
    }
    updateAvgCVRate(Date.now() - start);
};


const camMatrix0 = [528.84234161914062, 0, 0, 0, 528.8423461914062, 0, 318.3243017578125, 178.80670166015625, 1];

window.processCV2 = async function (frame) {
    let ARENA = window.ARENA;
    cvThrottle++;
    if (cvThrottle % 20) {
        return;
    }
    // console.log(frame);

    // Save vio before processing apriltag. Don't touch global though
    let timestamp = new Date();
    let camParent = document.getElementById('my-camera').object3D.parent.matrixWorld;
    let cam = document.getElementById('my-camera').object3D.matrixWorld;
    vioMatrixCopy.copy(camParent).invert(); // vioMatrixCopy.getInverse(camParent);
    vioMatrixCopy.multiply(cam);

    vioRot.setFromRotationMatrix(vioMatrixCopy);
    vioPos.setFromMatrixPosition(vioMatrixCopy);

    let vio = {position: vioPos, rotation: vioRot};

    frame._camera.cameraIntrinsics = camMatrix0;

    if (frame._camera.cameraIntrinsics[0] != fx || frame._camera.cameraIntrinsics[4] != fy ||
        frame._camera.cameraIntrinsics[6] != cx || frame._camera.cameraIntrinsics[7] != cy) {
        fx = frame._camera.cameraIntrinsics[0];
        fy = frame._camera.cameraIntrinsics[4];
        cx = frame._camera.cameraIntrinsics[6];
        cy = frame._camera.cameraIntrinsics[7];
        aprilTag.set_camera_info(fx, fy, cx, cy); // set camera intrinsics for pose detection
    }

    let imgWidth = frame._buffers[bufIndex].size.width;
    let imgHeight = frame._buffers[bufIndex].size.height;

    let pixelData = frame._buffers[bufIndex]._buffer;
    let grayscaleImg = new Uint8Array(imgWidth * imgHeight);
    for (var i = 0; i < pixelData.length; i += 4) {
        var r = pixelData[i];
        var g = pixelData[i + 1];
        var b = pixelData[i + 2];
        var averageColour = (r + g + b) / 3;
        grayscaleImg[i / 4] = averageColour;
    }

    let detections = await aprilTag.detect(grayscaleImg, imgWidth, imgHeight);

    if (detections.length) {
        //let detectMsg = JSON.stringify(detections);
        //console.log(detectMsg);

        let jsonMsg = {scene: ARENA.renderParam, timestamp: timestamp};
        delete detections[0].corners;
        delete detections[0].center;
        let dtagid = detections[0].id;
        let refTag;
        if (ARENA.aprilTags[dtagid] && ARENA.aprilTags[dtagid].pose) {
            refTag = ARENA.aprilTags[dtagid];
        } else if (await updateAprilTags()) { // No known result, try once to query server
            refTag = ARENA.aprilTags[dtagid];
        }

        if (ARENA.mqttsolver || ARENA.builder) {
            jsonMsg.vio = vio;
            jsonMsg.detections = [detections[0]];  // Only pass first detection for now, later handle multiple
            if (dtagid !== 0 && refTag) {  // No need to pass origin tag info
                jsonMsg.refTag = refTag;
            }
        } else if (refTag) {  // Solve clientside, MUST have a reference tag though
            let rigPose = getRigPoseFromAprilTag(vioMatrixCopy, detections[0].pose, refTag.pose);
            document.getElementById('cameraSpinner').object3D.quaternion.setFromRotationMatrix(rigPose);
            document.getElementById('cameraRig').object3D.position.setFromMatrixPosition(rigPose);
            rigPose.transpose(); // Flip to column-major, so that rigPose.elements comes out row-major for numpy
            jsonMsg.rigMatrix = rigPose.elements; // Make sure networked solver still has latest rig for reference
        } else { // No reference tag, not networked/builder mode, nothing to do
            return;
        }
        // Never localize tag 0
        if (ARENA.builder === true && dtagid !== 0) {
            jsonMsg.geolocation = {latitude: ARENA.clientCoords.latitude, longitude: ARENA.clientCoords.longitude};
            jsonMsg.localize_tag = true;
        }
        ARENA.Mqtt.publish(ARENA.defaults.realm + '/g/a/' + ARENA.camName, JSON.stringify(jsonMsg));
        let ids = detections.map(tag => tag.id);
        console.log('April Tag IDs Detected: ' + ids.join(', '));
    } // this is the resulting json with the detections
};


function getRigPoseFromAprilTag(vioMatrix, dtag, refTag) {
    let r = dtag.R;
    let t = dtag.t;

    dtagMatrix.set(    // Transposed rotation
        r[0][0], r[1][0], r[2][0], t[0],
        r[0][1], r[1][1], r[2][1], t[1],
        r[0][2], r[1][2], r[2][2], t[2],
        0, 0, 0, 1
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

function getTagPoseFromRig(vioMatrix, dtag) {
    let r = dtag.R;
    let t = dtag.t;
    dtagMatrix.set(    // Transposed rotation
        r[0][0], r[1][0], r[2][0], t[0],
        r[0][1], r[1][1], r[2][1], t[1],
        r[0][2], r[1][2], r[2][2], t[2],
        0, 0, 0, 1
    );
    dtagMatrix.premultiply(FLIPMATRIX);
    dtagMatrix.multiply(FLIPMATRIX);

    // Python ref_tag_pose = rig_pose @ vio_pose @ dtag_pose
    tagPoseMatrix.copy(rigMatrix);
    tagPoseMatrix.multiply(vioMatrixCopy);
    tagPoseMatrix.multiply(dtagMatrix);

    return tagPoseMatrix;
}

// show the image on a canvas; just for debug
function showGrayscaleImage(canvasid, pixeldata, imgWidth, imgHeight) {
    const canvas = document.getElementById(canvasid);
    const ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(imgWidth, imgHeight);

    // Iterate through every pixel
    for (let i = 0; i < imageData.data.length; i += 4) {
        let yv = pixeldata[i / 4]; // get pixel value

        // Modify pixel data
        imageData.data[i] = yv; // R value
        imageData.data[i + 1] = yv; // G value
        imageData.data[i + 2] = yv; // B value
        imageData.data[i + 3] = 255; // A value
    }

    // Draw image data to the canvas
    ctx.putImageData(imageData, 0, 0);
}


async function updateAprilTags() {
    let ARENA = window.ARENA;

    ARENA.aprilTags = {
        0: ORIGINTAG
    };

    if (ARENA.clientCoords === undefined) {
        console.error('No device location! Cannot query ATLAS.');
        return false;
    }
    let position = ARENA.clientCoords;
    // limit to 3s update interval
    if (new Date() - ARENA.lastAprilTagUpdate < 3 * 1000 !== false) {
        return false;
    }
    fetch(ARENA.ATLASurl + '/lookup/geo?objectType=apriltag&distance=20&units=km&lat=' + position.latitude + '&long=' + position.longitude)
        .then(response => {
            window.ARENA.lastAprilTagUpdate = new Date();
            return response.json();
        })
        .then(data => {
            data.forEach(tag => {
                let tagid = tag.name.substring(9);
                if (tagid !== 0) {
                    if (tag.pose && Array.isArray(tag.pose)) {
                        let tagMatrix = new THREE.Matrix4();
                        tagMatrix.fromArray(tag.pose.flat()); // comes in row-major, loads col-major
                        tagMatrix.transpose(); // flip properly to row-major
                        ARENA.aprilTags[tagid] = {
                            id: tagid,
                            uuid: tag.id,
                            pose: tagMatrix
                        };
                    }
                }
            });
        });
    return true;
}

async function init() {
    let ARENA = window.ARENA;
    // WebWorkers use `postMessage` and therefore work with Comlink.
    const Apriltag = Comlink.wrap(new Worker("./src/apriltag/apriltag.js"));
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
        //pass
    }));
}

init();
