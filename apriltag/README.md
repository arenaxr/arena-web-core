# Apriltag detection for localization
**This feature currently requires a custom build of iOS XRViewer (firefox-ios/webxr)**

With the WebXR browser, Apriltag detection is automatically enabled when entering AR mode.

Tag ID 0 is hardcoded as the Origin tag, placed facing upwards on the ground at `0, 0, 0`

By default, the client will localize off the origin tag and apriltag ids it pulls from the ATLAS near to its geolocation.

The client will also dynamically update positions of objectID `apriltag_N` of tag ids it does not have reference poses 
for from the above.

Optional URL param flags:
- `cvRate` (int) - Frequency up to 60 for how often to process the frames.
- `networkedTagSolver` (bool) - Defers all tag solving of client camera to a solver sitting on pubsub
- `builder` (bool) - Will localize origin tag from a networked solver on pubsub, and all other tags that it finds with 
  will be updated or created in the ATLAS
  
