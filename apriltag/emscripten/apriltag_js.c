  
 /** @file apriltag_js.c
 *  @brief Apriltag detection to be compile with emscripten
 * 
 * Uses the apriltaf library; exposes a simple interface for a web app to
 * use apriltags once it is compiled to WASM using emscripten
 *
 *  @author Nuno Pereira; CMU (this file)
 *  @date Nov, 2019
 */

/* Copyright (C) 2013-2016, The Regents of The University of Michigan.
All rights reserved.

This software was developed in the APRIL Robotics Lab under the
direction of Edwin Olson, ebolson@umich.edu. This software may be
available under alternative licensing terms; contact the address above.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
either expressed or implied, of the Regents of The University of Michigan.
*/
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>
#include <ctype.h>
#include <unistd.h>
#include <math.h>
#include "apriltag.h"
#include "apriltag_pose.h"
#include "tag36h11.h"
#include "tag25h9.h"
#include "tag16h5.h"
#include "tagCircle21h7.h"
#include "tagStandard41h12.h"
#include "common/getopt.h"
#include "common/image_u8.h"
#include "common/image_u8x4.h"
#include "common/pjpeg.h"
#include "common/zarray.h"
#include "emscripten.h"

// maximum size of string for each detection
#define STR_DET_LEN 350

// json format string for the 4 points
const char fmt_det_point[] = "{\"id\":%d, \"corners\": [{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f}], \"center\": {\"x\":%.2f,\"y\":%.2f} }";
const char fmt_det_point_pose[] = "{\"id\":%d, \"corners\": [{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f}], \"center\": {\"x\":%.2f,\"y\":%.2f}, \"pose\": { \"R\": [[%f,%f,%f],[%f,%f,%f],[%f,%f,%f]], \"t\": [%f,%f,%f], \"error\": %f } }";

// global pointers to the tag family and detector
apriltag_family_t *g_tf=NULL;
apriltag_detector_t *g_td;

enum tag_family {tag36h11=0, tag25h9, tag16h5, tagCircle21h7, tagStandard41h12}; 

// size oand stride f the image to process
int g_width;
int g_height;
int g_stride;

// pointer to the image grayscale pixes
uint8_t *g_img_buf = NULL;

// if we are returning pose (=0 does not output pose; putput pose otherwise)
int g_bool_return_pose = 0;

// defaults to a 64mm tag and camera intrinsics of a MacBook Pro (13-inch, 2018) 
// apriltag_detection_info_t: {apriltag_detection_t*, tagsize_meters, fx, fy, cx, cy}
apriltag_detection_info_t g_det_pose_info = {NULL, 0.064, 1027.566807, 1027.448541, 650.232144, 358.974551}; 

/**
 * @brief Init the apriltag detector with given family and default options 
 * default options: quad_decimate=2.0; quad_sigma=0.0; nthreads=1; refine_edges=1; return_pose=1
 * @sa set_detector_options for meaning of options
 * 
 * @return 0=success; -1 on failure
 */
EMSCRIPTEN_KEEPALIVE
int init(int tag_family) {
  if (tag_family == tag36h11) {
      g_tf = tag36h11_create();
  } else if (tag_family == tag25h9) {
      g_tf = tag25h9_create();
  } else if (tag_family == tag16h5) {
      g_tf = tag16h5_create();
  } else if (tag_family == tagCircle21h7) {
      g_tf = tagCircle21h7_create();
  } else if (tag_family == tagStandard41h12) {
      g_tf = tagStandard41h12_create();
  } else {
      printf("Unrecognized tag family.\n");
      return -1;
  }
  if (g_tf == NULL) {
      printf("Error initializing tag family.");
      return -1;
  }
  g_td = apriltag_detector_create();
  if (g_td == NULL) {
      printf("Error initializing detector.");
      return -1;
  }  
  apriltag_detector_add_family_bits(g_td, g_tf, 1);
  g_td->quad_decimate = 2.0; 
  g_td->quad_sigma = 0.0; 
  g_td->nthreads = 1; 
  g_td->debug = 0; // Enable debugging output (slow)
  g_td->refine_edges = 1;
  g_bool_return_pose = 1; 
  return 0;
}

/**
 * @brief Releases resources
 *
 * @return 0=success
 */
EMSCRIPTEN_KEEPALIVE
int destroy() {
  apriltag_detector_destroy(g_td);
  tag36h11_destroy(g_tf);
  if (g_img_buf != NULL) free(g_img_buf);
  return 0;
}

/**
 * @brief Sets the given detector options
 * 
 * @param decimate Decimate input image by this factor
 * @param sigma Apply low-pass blur to input; negative sharpens
 * @param nthreads Use this many CPU threads
 * @param refine_edges Spend more time trying to align edges of tags
 * @param return_pose Detect returns pose of detected tags (0=does no return pose; returns pose otherwise)
 * 
 * @return 0=success
 */
EMSCRIPTEN_KEEPALIVE
int set_detector_options(float decimate, float sigma, int nthreads, int refine_edges, int return_pose) {
  g_td->quad_decimate = decimate; 
  g_td->quad_sigma = sigma; 
  g_td->nthreads = nthreads; 
  g_td->refine_edges = refine_edges; 
  g_bool_return_pose = return_pose; 
  return 0;
}

/**
 * @brief Sets the tag size (meters) and camera intrinsics (in pixels) for tag pose estimation
 *
 * @param tagsize tagsize in meters
 * @param fx x focal lenght in pixels
 * @param fy y focal lenght in pixels
 * @param cx x principal point in pixels
 * @param cy y principal point in pixels
 * 
 * @return 0=success
 */
EMSCRIPTEN_KEEPALIVE
int set_pose_info(double tagsize, double fx, double fy, double cx, double cy) {
  g_det_pose_info.tagsize = tagsize;
  g_det_pose_info.fx = fx;
  g_det_pose_info.fy = fy;
  g_det_pose_info.cx = cx;
  g_det_pose_info.cy = cy;
  return 0;
}

/**
 * @brief Creates/changes size of the image buffer where we receive the images to process
 *
 * @param width Width of the image
 * @param height Height of the image
 * @param stride How many pixels per row (=width typically)
 * 
 * @return the pointer to the image buffer 
 *
 * @warning caller of detect is responsible for putting *grayscale* image pixels in this buffer
 */
EMSCRIPTEN_KEEPALIVE
uint8_t * set_img_buffer(int width, int height, int stride) {
  if (g_img_buf != NULL) {
    if (g_width == width && g_height == height) return g_img_buf;
    free(g_img_buf);
    g_width = width;
    g_height = height;
    g_stride = stride;
    g_img_buf = (uint8_t *) malloc(width * height);
  } else {
    g_width = width;
    g_height = height;
    g_stride = stride;
    g_img_buf = (uint8_t *) malloc(width * height);
  }
  return g_img_buf;
}

/**
 * @brief Detect tags in image stored in the buffer (g_img_buf)
 *
 * @return buffer starting with an int32 indication the size of the following json string with id, corners, center, and pose of each detected tag; must be release by caller
 *
 * @warning caller is responsible for putting *grayscale* image pixels in the input buffer (g_img_buf)
 * @warning caller must release the returned buffer (json string) by calling destroy_buffer()
 */
EMSCRIPTEN_KEEPALIVE
uint8_t * detect() {

  if (g_tf == NULL || g_td == NULL) {
    printf("Detector not initizalized. (did you call init?)");
    return (uint8_t *)0;
  }

  image_u8_t im = {
    .width = g_width,
    .height = g_height,
    .stride = g_stride,
    .buf = g_img_buf
  };

  zarray_t * detections = apriltag_detector_detect(g_td, & im);

  if (zarray_size(detections) == 0) {
    return (uint8_t *)0;
  }

  int str_det_len = zarray_size(detections) * STR_DET_LEN;
  int *buffer = malloc(str_det_len + sizeof(int32_t));
  char *str_det = ((char * ) buffer) + sizeof(int32_t);
  char *str_tmp_det = malloc(STR_DET_LEN);
  int llen = str_det_len - 1;
  strcpy(str_det, "[ ");
  llen -= 2; //"[ "
  for (int i = 0; i < zarray_size(detections); i++) {
    apriltag_detection_t * det;
    zarray_get(detections, i, & det);
    int c;
    if (g_bool_return_pose == 0) {
      c = snprintf(str_tmp_det, STR_DET_LEN, fmt_det_point, det->id, det->p[0][0], det->p[0][1], det->p[1][0], det->p[1][1], det->p[2][0], det->p[2][1], det->p[3][0], det->p[3][1], det->c[0], det->c[0]);
    } else {
      // return pose ..
      apriltag_pose_t pose;
      double pose_err;
      g_det_pose_info.det = det;
      pose_err = estimate_tag_pose(&g_det_pose_info, &pose);
      //c = snprintf(str_tmp_det, STR_DET_LEN, fmt_det_point_pose, det->id, det->p[0][0], det->p[0][1], det->p[1][0], det->p[1][1], det->p[2][0], det->p[2][1], det->p[3][0], det->p[3][1], det->c[0], det->c[1], matd_get(pose.R, 0, 0),matd_get(pose.R, 0,1),matd_get(pose.R, 0, 2),matd_get(pose.R, 1, 0),matd_get(pose.R, 1, 1),matd_get(pose.R, 1, 2),matd_get(pose.R, 2, 0),matd_get(pose.R, 2, 1),matd_get(pose.R, 2, 2),matd_get(pose.t, 0, 0),matd_get(pose.t, 1, 0),matd_get(pose.t, 2, 0), pose_err);
      c = snprintf(str_tmp_det, STR_DET_LEN, fmt_det_point_pose, det->id, det->p[0][0], det->p[0][1], det->p[1][0], det->p[1][1], det->p[2][0], det->p[2][1], det->p[3][0], det->p[3][1], det->c[0], det->c[1], matd_get(pose.R, 0, 0),matd_get(pose.R, 1,0),matd_get(pose.R, 2, 0),matd_get(pose.R, 0, 1),matd_get(pose.R, 1, 1),matd_get(pose.R, 2, 1),matd_get(pose.R, 0, 2),matd_get(pose.R, 1, 2),matd_get(pose.R, 2, 2),matd_get(pose.t, 0, 0),matd_get(pose.t, 1, 0),matd_get(pose.t, 2, 0), pose_err);
      matd_destroy(pose.R);
      matd_destroy(pose.t);               
    }
    if (i > 0) {
      strncat(str_det, ", ", llen);
      llen -= 2;
      strncat(str_det, str_tmp_det, llen);
      llen -= c;
    } else {
      strncat(str_det, str_tmp_det, llen);
      llen -= c;
    }
  }
  free(str_tmp_det);
  strncat(str_det, " ]", llen);
  str_det[str_det_len - 1] = '\0'; // make sure it is null-terminated

  apriltag_detections_destroy(detections);

  buffer[0] = strlen(str_det);
  return (uint8_t *)buffer;
}

/**
 * @brief Allocates memory for 'bytes_size' bytes
 *
 * @param bytes_size How many bytes to allocate
 * 
 * @return pointer allocated
 */
EMSCRIPTEN_KEEPALIVE
uint8_t * create_buffer(int byte_size) {
  return malloc(byte_size);
}

/**
 * @brief Releases memory previously allocated
 *
 * @param p pointer to buffer
 */
EMSCRIPTEN_KEEPALIVE
void destroy_buffer(uint8_t * p) {
  free(p);
}
