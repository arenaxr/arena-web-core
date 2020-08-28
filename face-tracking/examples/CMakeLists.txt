cmake_minimum_required( VERSION 3.1 )
project( example )

# Use C++ 11 by default
set( CMAKE_CXX_STANDARD 11 )

# Set Release as default build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif(NOT CMAKE_BUILD_TYPE)

set( CMAKE_CXX_FLAGS_RELEASE "-O3" )

add_subdirectory(../dlib/dlib dlib_build)

find_package(OpenCV QUIET)
if (OpenCV_FOUND)
    include_directories(${OpenCV_INCLUDE_DIRS})

    add_executable(detect_face detect_face.cpp)
    target_link_libraries(detect_face dlib::dlib ${OpenCV_LIBS} )
else()
    message("OpenCV not found, so we won't build the detect_face example.")
endif()
