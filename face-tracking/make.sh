#!/usr/bin/env bash

if [ ! -d "./build" ]
then
    ./build.sh
fi

cd build
make

cp detect_face_wasm.* ..
