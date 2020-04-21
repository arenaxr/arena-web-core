/* this is an example of processCV() that calls the wasm apriltag implementation */
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

var bufIndex = 0;
var cvThrottle = 0;
var dtagMatrix = new THREE.Matrix4();
var rigMatrix = new THREE.Matrix4();
var vioMatrixCopy = new THREE.Matrix4();

// call processCV; Need to make sure we only do it after the wasm module is loaded
var fx = 0, fy = 0, cx = 0, cy = 0;

window.processCV = async function (frame) {
    cvThrottle++;
    if (cvThrottle % 20) {
        return;
    }
//    console.log(frame);
    vioMatrixCopy.copy(globals.vioMatrix);
    let vio = JSON.stringify({position: globals.vioPosition, rotation: globals.vioRotation}); // Save this first before it updates async

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


        delete detections[0].corners;
        delete detections[0].center;
        let jsonMsg = {scene: globals.renderParam};
        /*
        if (globals.aprilTags[detections[0].id] && globals.aprilTags[detections[0].id].pose) {
            jsonMsg.refTag = globals.aprilTags[detections[0].id].pose;
        } else {
            //make one attempt to update it?
                // jsonMsg.coords = { lat: globals.clientCoords.latitude, long: globals.clientCoords.longitude } ;

        }
        */
        let dtagid = detections[0].id;
        if (globals.aprilTags[dtagid]) {
            let rigPose = getRigPoseFromAprilTag(vioMatrixCopy, detections[0].pose, globals.aprilTags[dtagid]);
            globals.sceneObjects.cameraSpinner.object3D.quaternion.setFromRotationMatrix(rigPose);
            globals.sceneObjects.cameraRig.object3D.position.setFromMatrixPosition(rigPose);
            jsonMsg.rigMatrix = rigPose.elements;
        }
        if (globals.builder === true && detections[0] != 0) {
            jsonMsg.localize_tag = true;
        }


        publish('realm/g/a/' + globals.camName, JSON.stringify(jsonMsg));
    } // this is the resulting json with the detections
    let ids = detections.map(tag => tag.id);
    debugRaw('April Tag IDs Detected: ' + ids.join(', '));
};


const FLIPMATRIX = new THREE.Matrix4();
FLIPMATRIX.set(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);

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
        imageData.data[i + 0] = yv; // R value
        imageData.data[i + 1] = yv; // G value
        imageData.data[i + 2] = yv; // B value
        imageData.data[i + 3] = 255; // A value
    }

    // Draw image data to the canvas
    ctx.putImageData(imageData, 0, 0);
}


function debugRaw2(debugMsg) {
    const textEl = document.getElementById('conix-text2');
    if (textEl) {
        textEl.setAttribute('value', debugMsg);
    }
}


AFRAME.registerComponent('a-fps', {
    init: function () {
        var self = this;
    },
    tick: (function (t, dt) {
        window.globals.frameCount++;
    }),
});

async function init() {
    // WebWorkers use `postMessage` and therefore work with Comlink.
    const Apriltag = Comlink.wrap(new Worker("/apriltag/apriltag.js"));
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('builder')) {
        globals.builder = true;
    }
    // must call this to init apriltag detector; argument is a callback for when it is done loading
    window.aprilTag = await new Apriltag(Comlink.proxy(() => {
        //pass
    }));
    var lastFrameCount = 0;
    window.globals.frameCount = 0;
    window.setInterval(() => {
        debugRaw2("FPS: " + (window.globals.frameCount - lastFrameCount));
        lastFrameCount = window.globals.frameCount;
    }, 1000);
}

init();



