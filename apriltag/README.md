# Apriltag (tag36h11 family only) detection for localization

**This feature currently requires a custom build of iOS XRViewer (firefox-ios/webxr)**

With the WebXR browser, Apriltag detection is automatically enabled when entering AR mode.

Tag ID 0 is hardcoded as the Origin tag, placed facing upwards on the ground at 0, 0, 0

By default, the client will localize off the origin tag and apriltag ids it pulls from the ATLAS near to its geolocation.

The client will also dynamically update positions of objectID apriltag_N of tag ids it does not have reference poses for from the above.

**Optional URL param flags**:

* cvRate (int) - Frequency up to 60 for how often to process the frames.
* networkedTagSolver (bool) - Defers all tag solving of client camera to a solver sitting on pubsub
* builder (bool) - Will localize origin tag from a networked solver on pubsub, and all other tags that it finds with will be updated or created in the ATLAS

# Apriltag Detector Details

Apriltag detector using the C implementation at [ https://github.com/AprilRobotics/apriltag ](https://github.com/AprilRobotics/apriltag), and compiled to WASM using emscripten.

The apriltag detector uses the [tag36h11](http://ptolemy.berkeley.edu/ptolemyII/ptII11.0/ptII/doc/codeDoc/edu/umich/eecs/april/tag/Tag36h11.html) family ([pre-generated tags](https://github.com/conix-center/apriltag-gen)). For tag pose estimation, tag sizes are assumed to be fixed, according to the tag id, as shown in the table.

Tag ID Range | Tag Size (mm) 
------------ | ------------- 
[0,150] | 150 | [tag id 100]
[151,300] | 100 | [tag id 200]
[301,450] | 50 | [tag id 400]
[451,586] | 20 | [tag id 500]

See pre-generated tags with the right size here: https://github.com/conix-center/apriltag-gen

## Javascript Detector API

The detector API is implemented in [apriltag.js](https://github.com/conix-center/ARENA-core/blob/master/apriltag/apriltag.js):
* ```detect(grayscaleImg, imgWidth, imgHeight)``` - Detect tag given a grayscale image of size *imgWidth*, *imgHeight* in pixels

* ```set_camera_info(fx, fy, cx, cy)``` - Set camera intrinsics for tag pose estimation, where
  * *fx*, *fy* is the focal lenght, in pixels 
  * *cx*, *cy* is the principal point offset, in pixels 

Calling ```detect()``` will return an array of JSON objects with information about the tags detected. 

Example detection:
```
[
  {
    "id": 151,
    "size": 0.1,
    "corners": [
      { "x": 777.52, "y": 735.39},
      { "x": 766.05, "y": 546.94},
      { "x": 578.36, "y": 587.88},
      { "x": 598, "y": 793.42}
    ],
    "center": { "x": 684.52, "y": 666.51 },
    "pose": {
      "R": [
        [ 0.91576, -0.385813, 0.111941 ],
        [ -0.335306, -0.887549, -0.315954 ],
        [ -0.221252, -0.251803, 0.942148 ] ],
      "t": [ 0.873393, 0.188183, 0.080928 ],
      "e": 0.000058,
      "s": 2
    }
  }
]
```
Where:
* *id* is the tag id, 
* *size* is the tag size in meters (based on the tag id) 
* *corners* are x and y corners of the tag (in fractional pixel coordinates) 
* *center* is the center of the tag (in fractional pixel coordinates) 
* *pose*:
  * *R* is the rotation matrix (**column major**)
  * *t* is the translation 
  * *e* is the object-space error of the pose estimation
  * *s* is the solution returned (1=homography method; 2=potential second local minima; see: [apriltag_pose.h](https://github.com/AprilRobotics/apriltag/blob/master/apriltag_pose.h))

