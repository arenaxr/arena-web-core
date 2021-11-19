/**
 * @fileoverview Init WASM detector; send frames to detector worker.
 *
 * See https://github.com/conix-center/apriltag-js-standalone
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2021
 * @authors Nuno Pereira
 */

importScripts('./apriltag.js');
importScripts('../worker-msgs.js');

let initDone = false;
let pendingCvWorkerMsg = undefined;

// init apriltag detector; argument is a callback for when it is done loading
const aprilTag = new Apriltag(() => {
    this.postMessage({type: CVWorkerMsgs.type.INIT_DONE});
    initDone = true;
    if (pendingCvWorkerMsg) {
        processGsFrame(processGsFrame);
        pendingCvWorkerMsg = undefined;
    }
    console.log('CV Worker ready!');
});

// process worker messages
onmessage = async function(e) {
    const cvWorkerMsg = e.data;

    switch (cvWorkerMsg.type ) {
    // process a new image frame
    case CVWorkerMsgs.type.PROCESS_GSFRAME:
        if (!initDone) {
            pendingCvWorkerMsg = cvWorkerMsg;
            return;
        }
        processGsFrame(cvWorkerMsg);
        break;
    default:
        console.warn('CVWorker: unknow message received.');
    }
};

/**
 * Process grayscale camera frame
 * @param {object} frame - The received camera frame
 * @param {CVWorkerMsgs} frame.type message type
 * @param {DOMHighResTimeStamp} frame.ts timestamp
 * @param {Number} frame.width image width
 * @param {Number} frame.height image height
 * @param {Uint8ClampedArray} frame.grayscalePixels grayscale image pixels (Uint8ClampedArray[width x height])
 * @param {object} frame.camera camera properties: camera's focal length (fx, fy) and principal point (cx, cy)
 */
async function processGsFrame(frame) {
    const c = frame.camera;

    console.log('Worker: processing frame');
    // camera info to determine pose
    aprilTag.set_camera_info(c.fx, c.fy, c.cx, c.cy);

    // detect aprilTag in the grayscale image given by grayscalePixels
    const detections = await aprilTag.detect(frame.grayscalePixels, frame.width, frame.height);

    const resMsg = {type: CVWorkerMsgs.type.FRAME_RESULTS, c: detections, grayscalePixels: frame.grayscalePixels};

    // post detection results, returning ownership of the pixel buffer
    this.postMessage(resMsg, [resMsg.grayscalePixels.buffer]);
}
