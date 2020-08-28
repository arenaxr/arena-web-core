#include <dlib/opencv.h>
#include <opencv2/opencv.hpp>
#include <opencv2/core/core.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <dlib/image_processing.h>
#include <dlib/image_processing/frontal_face_detector.h>
#include <dlib/image_processing/render_face_detections.h>

#define FACE_DOWNSAMPLE_RATIO 3

using namespace std;
using namespace cv;
using namespace dlib;

void draw_polyline(Mat &img, const full_object_detection &d,
                   const int start, const int end, bool isClosed = false) {
    std::vector<Point> points;
    for (size_t i = start; i <= end; ++i) {
        points.push_back(Point(d.part(i).x(), d.part(i).y()));
    }
    polylines(img, points, isClosed, Scalar(255,0,0), 2, 16);
}

void render_face(Mat &img, const full_object_detection &d) {
    DLIB_CASSERT (
        d.num_parts() == 68,
        "\n\t Invalid inputs were given to this function. "
        << "\n\t d.num_parts():  " << d.num_parts()
    );

    draw_polyline(img, d, 0, 16);           // Jaw line
    draw_polyline(img, d, 17, 21);          // Left eyebrow
    draw_polyline(img, d, 22, 26);          // Right eyebrow
    draw_polyline(img, d, 27, 30);          // Nose bridge
    draw_polyline(img, d, 30, 35, true);    // Lower nose
    draw_polyline(img, d, 36, 41, true);    // Left eye
    draw_polyline(img, d, 42, 47, true);    // Right Eye
    draw_polyline(img, d, 48, 59, true);    // Outer lip
    draw_polyline(img, d, 60, 67, true);    // Inner lip
}

int main(void) {
    VideoCapture cam(0);
    Mat frame, frame_small;

    frontal_face_detector detector = get_frontal_face_detector();
    shape_predictor pose_model;
    deserialize("../../shape_predictor_68_face_landmarks.dat") >> pose_model;

    std::vector<dlib::rectangle> faces;

    // Grab a frame
    while(cam.read(frame)) {
        // Resize image for face detection
        resize(frame, frame_small, Size(), 1.0/FACE_DOWNSAMPLE_RATIO, 1.0/FACE_DOWNSAMPLE_RATIO);

        // Change to dlib's image format. No memory is copied.
        cv_image<bgr_pixel> cimg_small(frame_small);
        cv_image<bgr_pixel> cimg(frame);

        faces = detector(cimg_small);

        // Find the pose of each face.
        std::vector<full_object_detection> shapes;
        for (size_t i = 0; i < faces.size(); ++i) {
            // Resize obtained rectangle for full resolution image.
            dlib::rectangle rect(
                (long)(faces[i].left() * FACE_DOWNSAMPLE_RATIO),
                (long)(faces[i].top() * FACE_DOWNSAMPLE_RATIO),
                (long)(faces[i].right() * FACE_DOWNSAMPLE_RATIO),
                (long)(faces[i].bottom() * FACE_DOWNSAMPLE_RATIO)
            );

            // Landmark detection on full sized image
            full_object_detection shape = pose_model(cimg, rect);
            shapes.push_back(shape);

            // Custom Face Render
            render_face(frame, shape);
        }

        imshow("Facial Landmark Detection", frame);

        // Exit loop if ESC is pressed
        if (waitKey(1) == 27) break;
    }

    return 0;
}
