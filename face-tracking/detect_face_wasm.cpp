#include <iostream>
#include <math.h>

#include <emscripten/emscripten.h>

#include <dlib/opencv.h>
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/calib3d/calib3d.hpp>
#include <opencv2/imgproc/imgproc.hpp>

#include <dlib/image_processing.h>
#include <dlib/image_processing/frontal_face_detector.h>
#include <dlib/image_transforms.h>

#define PI  3.14159265

#ifdef __cplusplus
extern "C" {
#endif

using namespace std;
using namespace dlib;
using namespace cv;

frontal_face_detector detector;
shape_predictor pose_model;

std::vector<Point3d> model_points;

EMSCRIPTEN_KEEPALIVE
void pose_model_init(char buf[], size_t buf_len) {
    detector = get_frontal_face_detector();

    std::string model(buf, buf_len);
    std::istringstream model_istringstream(model);
    deserialize(pose_model, model_istringstream);

    delete [] buf;

    model_points.push_back( Point3d(6.825897, 6.760612, 4.402142) );
    model_points.push_back( Point3d(1.330353, 7.122144, 6.903745) );
    model_points.push_back( Point3d(-1.330353, 7.122144, 6.903745) );
    model_points.push_back( Point3d(-6.825897, 6.760612, 4.402142) );
    model_points.push_back( Point3d(5.311432, 5.485328, 3.987654) );
    model_points.push_back( Point3d(1.789930, 5.393625, 4.413414) );
    model_points.push_back( Point3d(-1.789930, 5.393625, 4.413414) );
    model_points.push_back( Point3d(-5.311432, 5.485328, 3.987654) );
    model_points.push_back( Point3d(2.005628, 1.409845, 6.165652) );
    model_points.push_back( Point3d(-2.005628, 1.409845, 6.165652) );
    model_points.push_back( Point3d(2.774015, -2.080775, 5.048531) );
    model_points.push_back( Point3d(-2.774015, -2.080775, 5.048531) );
    model_points.push_back( Point3d(0.000000, -3.116408, 6.097667) );
    model_points.push_back( Point3d(0.000000, -7.415691, 4.070434) );

    cout << "Ready to detect!\n";
}

EMSCRIPTEN_KEEPALIVE
uint16_t *detect_face_features(uchar srcData[], size_t srcCols, size_t srcRows) {
    static correlation_tracker tracker;
    static bool track = false;
    static uint32_t frames = 0;

    const uint8_t parts_len = 5 + 2 * 68;
    uint16_t *parts = new uint16_t[parts_len];
    uint16_t left, top, right, bottom;

    array2d<uint8_t> gray;
    gray.set_size(srcRows, srcCols);

    uint32_t idx;
    for (int i = 0; i < srcRows; ++i) {
        for (int j = 0; j < srcCols; ++j) {
            idx = (i * srcCols * 4) + j * 4;

            // rgba to rgb
            uchar r = srcData[idx];
            uchar g = srcData[idx + 1];
            uchar b = srcData[idx + 2];
            // uchar a = srcData[idx + 3];

            // turn src image to gray scale
            gray[i][j] = (0.30 * r) + (0.59 * g) + (0.11 * b);
        }
    }

    dlib::rectangle face_rect;
    if (!track) {
        std::vector<dlib::rectangle> face_rects;
        face_rects = detector(gray);
        face_rect = face_rects[0];
    }
    else {
        const double psr = tracker.update(gray); // "Peak-to-Sidelobe Ratio"
        if (0 < psr && psr < 30) {
            face_rect = tracker.get_position();
        }
        else {
            track = false;
        }
    }

    left = face_rect.left();
    top = face_rect.top();
    right = face_rect.right();
    bottom = face_rect.bottom();

    if (left >= 0 && top < srcRows && right < srcCols && bottom >= 0) {
        dlib::rectangle face_rect(
            (long)(left),
            (long)(top),
            (long)(right),
            (long)(bottom)
        );

        full_object_detection shape = pose_model(gray, face_rect);

        if (!track) {
            track = true;
            tracker.start_track(gray, face_rect);
        }

        parts[1] = left;
        parts[2] = top;
        parts[3] = right;
        parts[4] = bottom;
        for (uint8_t i = 0, j = 5; i < shape.num_parts(); i += 1, j += 2) {
            parts[j]   = shape.part(i).x();
            parts[j+1] = shape.part(i).y();
        }
    }
    else {
        track = false; // detect again if bbox is out of bounds
    }

    parts[0] = parts_len; // set first idx to len when passed to js

    if (++frames % 30 == 0) {
        track = false;
    }

    return parts;
}

EMSCRIPTEN_KEEPALIVE
double *get_pose(uint16_t landmarks[], size_t srcCols, size_t srcRows) {
    static bool first_iter = true;

    static Mat camera_matrix, distortion;
    static Mat rot_vec, trans_vec, rot_mat;
    static Mat out_intrinsics = Mat(3, 3, CV_64FC1);
    static Mat out_rot = Mat(3, 3, CV_64FC1);
    static Mat out_trans = Mat(3, 1, CV_64FC1);
    static Mat pose_mat = Mat(3, 4, CV_64FC1);
    static Mat euler_angle = Mat(3, 1, CV_64FC1);

    static std::vector<Point2d> image_pts;

    uint8_t result_len;
    double *result;
    double x, y, z;

    if (first_iter) {
        double focal_length = srcCols;
        Point2d center = Point2d(srcCols/2, srcRows/2);
        camera_matrix = (Mat_<double>(3,3) << focal_length, 0, center.x, 0 , focal_length, center.y, 0, 0, 1);
        distortion = Mat::zeros(4, 1, CV_64FC1);
        first_iter = false;
    }

    image_pts.push_back(Point2d(landmarks[2*17], landmarks[2*17+1])); // left brow left corner
    image_pts.push_back(Point2d(landmarks[2*21], landmarks[2*21+1])); // left brow right corner
    image_pts.push_back(Point2d(landmarks[2*22], landmarks[2*22+1])); // right brow left corner
    image_pts.push_back(Point2d(landmarks[2*26], landmarks[2*26+1])); // right brow right corner
    image_pts.push_back(Point2d(landmarks[2*36], landmarks[2*36+1])); // left eye left corner
    image_pts.push_back(Point2d(landmarks[2*39], landmarks[2*39+1])); // left eye right corner
    image_pts.push_back(Point2d(landmarks[2*42], landmarks[2*42+1])); // right eye left corner
    image_pts.push_back(Point2d(landmarks[2*45], landmarks[2*45+1])); // right eye right corner
    image_pts.push_back(Point2d(landmarks[2*31], landmarks[2*31+1])); // nose left corner
    image_pts.push_back(Point2d(landmarks[2*35], landmarks[2*35+1])); // nose right corner
    image_pts.push_back(Point2d(landmarks[2*48], landmarks[2*48+1])); // mouth left corner
    image_pts.push_back(Point2d(landmarks[2*54], landmarks[2*54+1])); // mouth right corner
    image_pts.push_back(Point2d(landmarks[2*57], landmarks[2*57+1])); // mouth central bottom corner
    image_pts.push_back(Point2d(landmarks[2*8],  landmarks[2*8+1]));  // chin corner

    solvePnP(model_points, image_pts, camera_matrix, distortion, rot_vec, trans_vec);

    image_pts.clear();

    Rodrigues(rot_vec, rot_mat);
    hconcat(rot_mat, trans_vec, pose_mat);
    decomposeProjectionMatrix(pose_mat, out_intrinsics, out_rot, out_trans, noArray(), noArray(), noArray(), euler_angle);

    result_len = 8;
    result = new double[result_len];
    result[0] = result_len;

    x = euler_angle.at<double>(0) * PI / 180.0;
    y = euler_angle.at<double>(1) * PI / 180.0;
    z = euler_angle.at<double>(2) * PI / 180.0;

    result[1] = sin(x/2)*cos(y/2)*cos(z/2) - cos(x/2)*sin(y/2)*sin(z/2);
    result[2] = cos(x/2)*sin(y/2)*cos(z/2) + sin(x/2)*cos(y/2)*sin(z/2);
    result[3] = cos(x/2)*cos(y/2)*sin(z/2) - sin(x/2)*sin(y/2)*cos(z/2);
    result[4] = cos(x/2)*cos(y/2)*cos(z/2) + sin(x/2)*sin(y/2)*sin(z/2);

    result[5] = trans_vec.at<double>(0);
    result[6] = trans_vec.at<double>(1);
    result[7] = trans_vec.at<double>(2);

    return result;
}

#ifdef __cplusplus
}
#endif
