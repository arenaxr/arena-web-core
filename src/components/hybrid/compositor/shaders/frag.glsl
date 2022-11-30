#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tStream;
uniform sampler2D tDepth;

uniform float cameraNear;
uniform float cameraFar;

uniform bool arMode;
uniform bool vrMode;

uniform ivec2 windowSize;
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

float readDepthDiffuse( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;

    // float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    // return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

    // https://sites.google.com/site/cgwith3js/home/depth-buffer-visualization
    float ndcZ = 2.0 * fragCoordZ - 1.0;
    float linearDepth = (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndcZ * (cameraFar - cameraNear));
    return (linearDepth - cameraNear) / (cameraFar - cameraNear);

    // float _ZBufferParamsX = 1.0 - cameraFar / cameraNear;
    // float _ZBufferParamsY = cameraFar / cameraNear;
    // return 1.0 / (_ZBufferParamsX * fragCoordZ + _ZBufferParamsY);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
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

    vec2 coordDestNormalized = vUv;

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;
    vec2 coordStreamColor = coordStreamNormalized;
    vec2 coordStreamDepth = vec2(coordStreamNormalized.x + 0.5, coordStreamNormalized.y);

    vec4 diffuseColor = texture2D( tDiffuse, coordDiffuseColor );
    vec4 streamColor = texture2D( tStream, coordStreamColor );

    float diffuseDepth = readDepthDiffuse( tDepth, coordDiffuseDepth );
    float streamDepth = readDepth( tStream, coordStreamDepth );
    bool ignore = false; // readMask( tStream, coordStreamDepth );

    vec4 color;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (!ignore) {
            // color = streamColor;
            // color = diffuseDepth * streamColor + streamDepth * diffuseColor;

            // if (arMode && streamDepth >= 0.9)
            //     color = vec4(0.0);
            // else
            if (arMode) {
                color = vec4(streamColor.rgb, 1.0);
            }
            else
            if (streamDepth <= diffuseDepth)
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

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(readDepthDiffuse( tDepth, coordDiffuseDepth ));
    // gl_FragColor.a = 1.0;
}
