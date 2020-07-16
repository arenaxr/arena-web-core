Face Detection using dlib

JSON format:

```
{
    "object_id": "face_<camera id>",
    "hasFace": <bool>,                  # if there is a face detected/valid data
    "imFlipped": <bool>,                # if image is flipped or not, set as URL param
    "imWidth": <src image width>,
    "imHeight": <src image height>,
    "landmarks": [x1,y1,x2,y2.....],    # flattened array of face landmarks as normalized points with image center as origin
    "bbox": [x1,y1,x2,y2]               # (x1,y1) is upper left and (x2,y2) is lower right
    "timestamp": <time>
}
```

URL params:

- trackface (bool)      enables face detection. default is 0!
- debugFace (bool)      enables printing of JSON output and execution time for face detection and MQTT pub + JSON creation
- vidOff (bool)         removes live video window
- overlayOff (bool)     removes overlaying the face wire frame from the video window and the "initializing face detection" text
- bboxOn (bool)         show the bbox in the video window
- flipped (bool)        flip source image
- frameSkip (int)       how many frames should be skipped. default is 1 (no frames skipped)
- vidWidth (int)        sets the width of the video window in pixels, height is scaled by aspect ratio. the larger the width, the slower the face detection will take. default is 320

