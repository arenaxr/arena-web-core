cmake_minimum_required( VERSION 3.1 )
project( DetectFace )

set( CMAKE_CXX_STANDARD 11 )

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif(NOT CMAKE_BUILD_TYPE)

set( CMAKE_CXX_FLAGS_RELEASE "-O3" )

add_subdirectory( dlib/dlib )

set( DLIB_NO_GUI_SUPPORT ON )

include_directories( opencv/include )
include_directories( opencv/build_wasm )

file( GLOB opencv_include_modules "opencv/modules/*/include" )
include_directories( ${opencv_include_modules} )

file( GLOB opencv_js "opencv/build_wasm/lib/*.a" )

add_executable( detect_face_wasm detect_face_wasm.cpp )
target_link_libraries( detect_face_wasm dlib::dlib ${opencv_js} )

set_target_properties( detect_face_wasm PROPERTIES LINK_FLAGS "-s MODULARIZE=1 -s EXPORT_NAME='FaceDetectorWasm' -s DEMANGLE_SUPPORT=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS='['_malloc', '_free']' -s EXTRA_EXPORTED_RUNTIME_METHODS='['ccall', 'cwrap']' -s WASM=1" )
