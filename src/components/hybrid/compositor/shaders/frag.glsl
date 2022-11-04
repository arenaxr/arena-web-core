#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tStream;
uniform sampler2D tDepth;

uniform float cameraNear;
uniform float cameraFar;

uniform ivec2 diffuseSize;
uniform ivec2 streamSize;

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

float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

// float readDepth(sampler2D depthSampler, vec2 coord) {
//     float depth = texture2D( depthSampler, coord ).x;
//     return depth;
// }

void main() {
    ivec2 frameSize = ivec2(streamSize.x, streamSize.y);
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
            ( (vUv.x * diffuseSizeF.x - padding) / float(diffuseSize.x - totalPad) ),
            vUv.y
        );
    }
    else {
        coordStreamNormalized = vec2(
            ( (vUv.x * diffuseSizeF.x + padding) / float(newWidth) ),
            vUv.y
        );
    }

    vec2 coordDestNormalized = vUv;

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordStreamColor = coordStreamNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;

    vec4 diffuseColor = texture2D( tDiffuse, coordDiffuseColor );
    vec4 streamColor = texture2D( tStream, coordStreamColor );

    float depth = readDepth( tDepth, coordDiffuseDepth );

    vec4 color;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (depth < 0.01) {
            color = diffuseColor;
        }
        else {
            color = streamColor;
        }
    }
    else {
        // color = diffuseColor;
        color = vec4(0.0);
    }

    // color = vec4(depth);
    gl_FragColor = vec4( color.rgb, 1.0 );

    // if (depth >= 0.5) color = streamColor;
    // else color = diffuseColor;

    // gl_FragColor.rgb = vec3(depth);
    // gl_FragColor.a = 1.0;
}
