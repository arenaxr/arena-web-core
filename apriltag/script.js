'use strict';

/* this is an example of processCV() that calls the wasm apriltag implementation */
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

var bufIndex = 0;
var cvThrottle = 0;
var dtagMatrix = new THREE.Matrix4();
var rigMatrix = new THREE.Matrix4();
var vioMatrixCopy = new THREE.Matrix4();
var vioRot = new THREE.Quaternion();
var vioPos = new THREE.Vector3();

let originMatrix = new THREE.Matrix4();
originMatrix.set(  // row-major
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    1, 0, 0, 1
);
var ORIGINTAG = {
    id: 'ORIGIN',
    uuid: 'ORIGIN',
    pose: originMatrix
};
const FLIPMATRIX = new THREE.Matrix4();
FLIPMATRIX.set(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);

// call processCV; Need to make sure we only do it after the wasm module is loaded
var fx = 0, fy = 0, cx = 0, cy = 0;

window.processCV = async function (frame) {
    let globals = window.globals;
    cvThrottle++;
    if (cvThrottle % 20) {
        return;
    }
    // console.log(frame);

    // Save vio before processing apriltag. Don't touch global though
    let timestamp = new Date();
    let camParent = globals.sceneObjects.myCamera.object3D.parent.matrixWorld;
    let cam = globals.sceneObjects.myCamera.object3D.matrixWorld;
    vioMatrixCopy.getInverse(camParent);
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
        //let detectMsg = JSON.stringify(detections);
        //console.log(detectMsg);

        let jsonMsg = {scene: globals.renderParam, timestamp: timestamp};
        delete detections[0].corners;
        delete detections[0].center;
        let dtagid = detections[0].id;
        let refTag;
        if (globals.aprilTags[dtagid] && globals.aprilTags[dtagid].pose) {
            refTag = globals.aprilTags[dtagid];
        } else if (await updateAprilTags()) { // No known result, try once to query server
            refTag = globals.aprilTags[dtagid];
        }

        if (globals.mqttsolver || globals.builder) {
            jsonMsg.vio = vio;
            jsonMsg.detections = [ detections[0] ];  // Only pass first detection for now, later handle multiple
            if (dtagid !== 0 && refTag) {  // No need to pass origin tag info
                jsonMsg.refTag = refTag.elements; // Pass in col-major format
            }
        } else if (refTag) {  // Solve clientside, MUST have a reference tag though
            let rigPose = getRigPoseFromAprilTag(vioMatrixCopy, detections[0].pose, refTag.pose);
            globals.sceneObjects.cameraSpinner.object3D.quaternion.setFromRotationMatrix(rigPose);
            globals.sceneObjects.cameraRig.object3D.position.setFromMatrixPosition(rigPose);
            rigPose.transpose(); // Flip to column-major, so that rigPose.elements comes out row-major for numpy
            jsonMsg.rigMatrix = rigPose.elements; // Make sure networked solver still has latest rig for reference
        } else { // No reference tag, not networked/builder mode, nothing to do
            return;
        }
        // Never localize tag 0
        if (globals.builder === true && dtagid !== 0) {
            jsonMsg.geolocation = { latitude: globals.clientCoords.latitude, longitude: globals.clientCoords.longitude };
            jsonMsg.localize_tag = true;
        }
        publish('realm/g/a/' + globals.camName, JSON.stringify(jsonMsg));
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
    dtagMatrix.getInverse(dtagMatrix);
    vioMatrixCopy.getInverse(vioMatrixCopy);
    rigMatrix.multiplyMatrices(refTag, dtagMatrix);
    rigMatrix.multiply(vioMatrixCopy);
    return rigMatrix;
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
    let globals = window.globals;
    if (globals.clientCoords === undefined) {
        return false;
    }
    let position = globals.clientCoords;
    // limit to 3s update interval
    if (new Date() - globals.lastAprilTagUpdate < 3 * 1000 !== false) {
        return false;
    }
    fetch(globals.ATLASurl + '/lookup/geo?objectType=apriltag&distance=20&units=km&lat=' + position.latitude + '&long=' + position.longitude)
        .then(response => {
            window.globals.lastAprilTagUpdate = new Date();
            return response.json();
        })
        .then(data => {
            globals.aprilTags = {
                0: ORIGINTAG
            };
            data.forEach(tag => {
                let tagid = tag.name.substring(9);
                if (tagid !== 0) {
                    if (tag.pose && Array.isArray(tag.pose)) {
                        let tagMatrix = new THREE.Matrix4();
                        tagMatrix.fromArray(tag.pose.flat()); // comes in row-major, loads col-major
                        tagMatrix.transpose(); // flip properly to row-major
                        globals.aprilTags[tagid] = {
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
    let globals = window.globals;
    // WebWorkers use `postMessage` and therefore work with Comlink.
    const Apriltag = Comlink.wrap(new Worker("/apriltag/apriltag.js"));
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('builder')) {
        globals.builder = true;
    }
    if (urlParams.get('mqttsolver')) {
        globals.mqttsolver = true;
    }
    await updateAprilTags();
    // must call this to init apriltag detector; argument is a callback for when it is done loading
    window.aprilTag = await new Apriltag(Comlink.proxy(() => {
        //pass
    }));
}

init();
