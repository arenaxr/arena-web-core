#!/usr/bin/env bash

if [ -d "./build" ]
then
    rm -rf build
fi
mkdir build
cd build

emcmake cmake -DLIB_NO_GUI_SUPPORT=ON ..
emmake make

cp detect_face_wasm* ..
