# ARENA Face Detection and Tracking

**Note:** The facial landmark annotations used by ARENA (found here: https://arena-cdn.conix.io/store/face-tracking/shape_predictor_68_face_landmarks_compressed.dat) are for **research purposes ONLY** and commercial use is **PROHIBITED**!

## JSON Format

To get face data, subscribe to topic ```realm/s/<scene>/camera_<id>/face```

```
{
    "object_id": "face_<camera id>",
    "hasFace": <bool>,                  # if there is a face detected/valid data.
    "image": {
        "flipped": <bool>,              # if image is flipped or not.
        "width": <src image width>,
        "height": <src image height>,
    },
    "pose": {
        "quaternions": [x, y, z, w],    # rotation in quaternions.
        "translation": [x, y, z]        # may need to be scaled and adjusted. z = 0 is when your face is at the screen.
    },
    "landmarks": [x1, y1, x2, y2, ...], # flattened array of face landmarks as normalized points with image center as origin.
    "bbox": [x1, y1, x2, y2]            # (x1,y1) is upper left and (x2,y2) is lower right.
    "timestamp": <time>
}
```

## Building

Download and install [emsdk](https://emscripten.org/docs/getting_started/downloads.html) (version 1.39.16 works best), [opencv](https://github.com/opencv/opencv), and [dlib](https://github.com/davisking/dlib). Build WASM for [opencv_js](https://docs.opencv.org/3.4/d4/da1/tutorial_js_setup.html).

Run ```build.sh``` to build. Optional flag ```--force```.

See [here](https://github.com/EdwardLu2018/wasm-face-tracking).

## Landmark Locations for Reference
![landmarks](./img/face_landmarks.jpg)

## Citations

C. Sagonas, E. Antonakos, G, Tzimiropoulos, S. Zafeiriou, M. Pantic. 300 faces In-the-wild challenge: Database and results. Image and Vision Computing (IMAVIS), Special Issue on Facial Landmark Localisation "In-The-Wild". 2016.

C. Sagonas, G. Tzimiropoulos, S. Zafeiriou, M. Pantic. A semi-automatic methodology for facial landmark annotation. Proceedings of IEEE Int’l Conf. Computer Vision and Pattern Recognition (CVPR-W), 5th Workshop on Analysis and Modeling of Faces and Gestures (AMFG 2013). Oregon, USA, June 2013.

C. Sagonas, G. Tzimiropoulos, S. Zafeiriou, M. Pantic. 300 Faces in-the-Wild Challenge: The first facial landmark localization Challenge. Proceedings of IEEE Int’l Conf. on Computer Vision (ICCV-W), 300 Faces in-the-Wild Challenge (300-W). Sydney, Australia, December 2013.

More info here: [https://ibug.doc.ic.ac.uk/resources/facial-point-annotations/](https://ibug.doc.ic.ac.uk/resources/facial-point-annotations/)
