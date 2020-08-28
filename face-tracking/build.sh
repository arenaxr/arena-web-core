#!/usr/bin/env bash

if [ ! -d "./build" ]
then
    mkdir build
    cd build

    emcmake cmake -DLIB_NO_GUI_SUPPORT=ON ..
    emmake make
elif [ "$1" == "--force" ]
then
    rm -rf build
    mkdir build
    cd build

    emcmake cmake -DLIB_NO_GUI_SUPPORT=ON ..
    emmake make
else
    cd build
    make
fi

cp detect_face_wasm.* ..
