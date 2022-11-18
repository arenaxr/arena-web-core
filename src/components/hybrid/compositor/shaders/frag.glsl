#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tStream;
uniform sampler2D tDepth;

uniform float cameraNear;
uniform float cameraFar;

uniform bool arMode;

uniform ivec2 diffuseSize;
uniform ivec2 streamSize;

// h264 video streams have a white color offset of 17 when frames are decoded (experimentally found)
#define H264_OFFSET     (17.0 / 255.0)

// float rgb2hue(vec3 c) {
//     vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
//     vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
//     vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

//     float d = q.x - min(q.w, q.y);
//     float e = 1.0e-10;
//     return abs(q.z + (q.w - q.y) / (6.0 * d + e));
// }

// bool readMask(sampler2D depthSampler, vec2 coord) {
//     bool mask = texture2D( depthSampler, coord ).g > 0.5;
//     return mask;
// }

// float readDepth( sampler2D depthSampler, vec2 coord ) {
//     float fragCoordZ = texture2D( depthSampler, coord ).x;
//     float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
//     return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
// }

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 diffuseSizeF = vec2(diffuseSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = frameSizeF.x / frameSizeF.y;
    int newHeight = diffuseSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(diffuseSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / diffuseSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = diffuseSize.x > newWidth;

    vec2 coordStreamNormalized;
    if (targetWidthGreater) {
        coordStreamNormalized = vec2(
            ( (vUv.x * diffuseSizeF.x - padding) / float(diffuseSize.x - totalPad) ) / 2.0,
            vUv.y
        );
    }
    else {
        coordStreamNormalized = vec2(
            ( (vUv.x * diffuseSizeF.x + padding) / float(newWidth) ) / 2.0,
            vUv.y
        );
    }

    vec2 coordDestNormalized = vUv;

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;
    vec2 coordStreamColor = coordStreamNormalized;
    vec2 coordStreamDepth = vec2(coordStreamNormalized.x + 0.5, coordStreamNormalized.y);

    vec4 diffuseColor = texture2D( tDiffuse, coordDiffuseColor );
    vec4 streamColor = texture2D( tStream, coordStreamColor );

    float depth = readDepth( tDepth, coordDiffuseDepth );
    float streamDepth = readDepth( tStream, coordStreamDepth ) + H264_OFFSET;
    bool ignore = false; // readMask( tStream, coordStreamDepth );

    vec4 color;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (!ignore) {
            // color = streamColor;
            // color = depth * streamColor + streamDepth * diffuseColor;

            if (depth >= 0.9999)
                color = vec4(streamColor.rgb, 1.0);
            else if (depth <= 0.0001)
                color = diffuseColor;
            else if (streamDepth <= depth)
                color = vec4(streamColor.rgb, 1.0);
            else
                color = diffuseColor;
        }
        else {
            color = diffuseColor;
        }
    }
    else {
        color = diffuseColor;
    }

    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(streamDepth);
    // gl_FragColor.a = 1.0;
}
