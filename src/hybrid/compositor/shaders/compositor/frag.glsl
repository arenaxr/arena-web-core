#include <packing>

varying vec2 vUv;

uniform sampler2D tLocalColor;
uniform sampler2D tLocalDepth;
uniform sampler2D tRemoteFrame;

uniform float cameraNear;
uniform float cameraFar;

uniform bool hasDualCameras;
uniform bool arMode;
uniform bool vrMode;

uniform ivec2 windowSize;
uniform ivec2 streamSize;

#define DEPTH_SCALAR    (50.0)

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

float readDepthStream(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth / DEPTH_SCALAR;
}

float readDepthDiffuse(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
    viewZ = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
    return viewZ;
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 windowSizeF = vec2(windowSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = frameSizeF.x / frameSizeF.y;
    int newHeight = windowSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(windowSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / windowSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = windowSize.x > newWidth;

    vec2 coordDestNormalized = vUv;
    vec2 coordStreamNormalized;
    if (targetWidthGreater) {
        coordStreamNormalized = vec2(
            ( (vUv.x * windowSizeF.x - padding) / float(windowSize.x - totalPad) ) / 2.0,
            vUv.y
        );
    }
    else {
        coordStreamNormalized = vec2(
            ( (vUv.x * windowSizeF.x + padding) / float(newWidth) ) / 2.0,
            vUv.y
        );
    }

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;

    vec4 diffuseColor = texture2D( tLocalColor, coordDiffuseColor );
    float diffuseDepth = readDepthDiffuse( tLocalDepth, coordDiffuseDepth );

    vec4 streamColor;
    float streamDepth;

    if (hasDualCameras) {
        vec2 coordStreamColor = coordStreamNormalized;
        vec2 coordStreamDepth = coordStreamNormalized;
        // left eye
        if (vUv.x < 0.5) {
            float xcoord = vUv.x * 2.0;
            coordStreamColor.x = xcoord / 4.0;
            coordStreamDepth.x = xcoord / 4.0 + 0.25;
        }
        // right eye
        else {
            float xcoord = (vUv.x - 0.5) * 2.0;
            coordStreamColor.x = xcoord / 4.0 + 0.5;
            coordStreamDepth.x = xcoord / 4.0 + 0.75;
        }

        streamColor = texture2D( tRemoteFrame, coordStreamColor );
        streamDepth = readDepthStream( tRemoteFrame, coordStreamDepth );
    }
    else {
        vec2 coordStreamColor = coordStreamNormalized;
        vec2 coordStreamDepth = vec2(coordStreamNormalized.x + 0.5, coordStreamNormalized.y);

        streamColor = texture2D( tRemoteFrame, coordStreamColor );
        streamDepth = readDepthStream( tRemoteFrame, coordStreamDepth );
    }

    bool ignore = false; // readMask( tRemoteFrame, coordStreamDepth );

    vec4 color;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (!ignore) {
            // color = streamColor;
            // color = diffuseDepth * streamColor + streamDepth * diffuseColor;

            if (streamDepth <= diffuseDepth) {
                color = vec4(streamColor.rgb, 1.0);
                // handles passthrough
                if (arMode && streamDepth >= 0.9 / DEPTH_SCALAR) {
                    color = diffuseColor;
                }
            }
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

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(diffuseDepth);
    // gl_FragColor.a = 1.0;
}
