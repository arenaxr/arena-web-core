# Apriltag (tag36h11 family only) detection for localization

**This feature currently requires a custom build of iOS XRViewer (firefox-ios/webxr)**

With the WebXR browser, Apriltag detection is automatically enabled when entering AR mode.

Tag ID 0 is hardcoded as the Origin tag, placed facing upwards on the ground at 0, 0, 0

By default, the client will localize off the origin tag and apriltag ids it pulls from the ATLAS near to its geolocation.

The client will also dynamically update positions of objectID apriltag_N of tag ids it does not have reference poses for from the above.

**Optional URL param flags**:

* cvRate (int) - Throttle rate between 1 and 60 of frame processing. **DEPRECATED** - cvRate will auto adjust based on rolling avg speed of last 10 frames processed
* networkedTagSolver (bool) - Defers all tag solving of client camera to a solver sitting on pubsub
* builder (bool) - Will localize origin tag from a networked solver on pubsub, and all other tags that it finds with will be updated or created in the ATLAS

# Apriltag Detector Details

The apritag detector uses the apriltag library C implementation at [ https://github.com/AprilRobotics/apriltag ](https://github.com/AprilRobotics/apriltag), compiled to WASM using emscripten to be able to run on a browser.

The source and documentation of the detector can be found in the [apriltag-js-standalone](https://github.com/conix-center/apriltag-js-standalone) repo.
