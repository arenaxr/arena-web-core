//import Apriltag from "./apriltag/apriltag.js";
//import CVWorkerMsgs from "../worker-msgs.js";
/* global Apriltag, CVWorkerMsgs */

importScripts('./apriltag.js');

class CVWorkerMsgs {
  static type = {
    /* sent from worker */
    INIT_DONE: 0,         // worker is ready
    FRAME_RESULTS: 1,     // worker finished processing frame
    NEXT_FRAME_REQ: 2,    // worker requests a new frame
    /* sent to worker */
    PROCESS_GSFRAME: 3    // process grayscale image
  }
}

//importScripts('../worker-msgs.js');
//import Apriltag from './apriltag.js';
//import CVWorkerMsgs from '../worker-msgs.js';

var initDone = false;
var pendingCvWorkerMsg = undefined;

// init apriltag detector; argument is a callback for when it is done loading
var aprilTag = new Apriltag(() => {
  this.postMessage({type: CVWorkerMsgs.type.INIT_DONE});
  initDone = true;
  if (pendingCvWorkerMsg) {
    processGsFrame(processGsFrame);
    pendingCvWorkerMsg = undefined;
  }
  console.log("CV Worker ready!");  
});

// process worker messages
onmessage = async function (e) {
  let cvWorkerMsg = e.data;
  
  switch(cvWorkerMsg.type ) {
    // process a new image frame
    case CVWorkerMsgs.type.PROCESS_GSFRAME:
      if (!initDone) {
        pendingCvWorkerMsg = cvWorkerMsg;
        return;
      }
      processGsFrame(cvWorkerMsg);
      break;
    default:
      console.warn("CVWorker: unknow message received.")
  }
}

async function processGsFrame(frame) {
    let c = frame.camera
    
    console.log("Worker: processing frame");
    // camera info to determine pose
    aprilTag.set_camera_info(c.fx, c.fy, c.cx, c.cy);  
      
    // detect aprilTag in the grayscale image given by grayscalePixels
    let detections = await aprilTag.detect(frame.grayscalePixels, frame.width, frame.height);
  
    let resMsg = {type: CVWorkerMsgs.type.FRAME_RESULTS, c: detections, grayscalePixels: frame.grayscalePixels};
  
    // post detection results, returning ownership of the pixel buffer
    this.postMessage(resMsg, [resMsg.grayscalePixels.buffer]);
}