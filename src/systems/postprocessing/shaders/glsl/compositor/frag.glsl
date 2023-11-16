#include <packing>

varying vec2 vUv;

uniform sampler2D tLocalColor, tLocalDepth;
uniform sampler2D tRemoteFrame;

uniform float cameraNear, cameraFar;

uniform bool hasDualCameras;
uniform bool arMode, vrMode;

uniform ivec2 localSize, remoteSize;

uniform vec3 remoteLForward, remoteRForward;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

const float onePixel = (1.0 / 255.0);

const bool stretchBorders = true;

// #define DO_ASYNC_TIMEWARP

#define DEPTH_SCALAR    (50.0)

// adapted from: https://gist.github.com/hecomi/9580605
float linear01Depth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
    return 1.0 / (x * depth + y);
}

// adapted from: https://gist.github.com/hecomi/9580605
float linearEyeDepth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
    return 1.0 / (z * depth + w);
}

float readDepthRemote(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).r;
    return depth / DEPTH_SCALAR;
}

float readDepthLocal(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).r;
    depth = linear01Depth(depth);
    return depth;
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

vec3 cameraToWorld(vec2 uv, mat4 projectionMatrix, mat4 matrixWorld) {
    vec2 ndc = 2.0 * uv - 1.0;
    vec4 uv4 = matrixWorld * inverse(projectionMatrix) * vec4(ndc, 1.0, 1.0);
    vec3 uv3 = vec3(uv4 / uv4.w);
    return uv3;
}

vec2 worldToCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = vec2(uv4 / uv4.w);
    return (uv2 + 1.0) / 2.0;
}

void main() {
    ivec2 frameSize = ivec2(remoteSize.x / 2, remoteSize.y);
    vec2 remoteSizeF = vec2(frameSize);
    vec2 localSizeF = vec2(localSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = remoteSizeF.x / remoteSizeF.y;
    int newHeight = localSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(localSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / localSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = localSize.x > newWidth;

    vec2 uvLocal = vUv;

    vec2 coordLocalColor = uvLocal;
    vec2 coordLocalDepth = uvLocal;

    vec4 localColor  = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepthLocal( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteColor = uvLocal;
    vec2 coordRemoteDepth = uvLocal;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteColor );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye   = (hasDualCameras && vUv.x < 0.5);
    bool rightEye  = (hasDualCameras && vUv.x >= 0.5);

    bool occluded = false;

    float x;

    float xMin, xMax;
    float depthOffset;

    vec3 cameraPos              = matrixWorldToPosition(cameraLMatrixWorld);
    vec3 remotePos              = matrixWorldToPosition(remoteLMatrixWorld);
    vec3 remoteForward          = remoteLForward;
    mat4 cameraProjectionMatrix = cameraLProjectionMatrix;
    mat4 cameraMatrixWorld      = cameraLMatrixWorld;
    mat4 remoteProjectionMatrix = remoteLProjectionMatrix;
    mat4 remoteMatrixWorld      = remoteLMatrixWorld;

    if (leftEye) {
        uvLocal.x = 2.0 * uvLocal.x;
    }
    if (rightEye) {
        uvLocal.x = 2.0 * (uvLocal.x - 0.5);
        cameraPos              = matrixWorldToPosition(cameraRMatrixWorld);
        remotePos              = matrixWorldToPosition(remoteRMatrixWorld);
        cameraProjectionMatrix = cameraRProjectionMatrix;
        cameraMatrixWorld      = cameraRMatrixWorld;
        remoteForward          = remoteRForward;
        remoteProjectionMatrix = remoteRProjectionMatrix;
        remoteMatrixWorld      = remoteRMatrixWorld;
    }

    vec2 uvRemote = uvLocal;
#if (DO_ASYNC_TIMEWARP == 1)
    vec3 pt = cameraToWorld(uvLocal, cameraProjectionMatrix, cameraMatrixWorld);
    uvRemote = worldToCamera(pt, remoteProjectionMatrix, remoteMatrixWorld);
#endif // DO_ASYNC_TIMEWARP

    if (targetWidthGreater) {
        coordRemoteColor = vec2(
            ( (uvRemote.x * localSizeF.x - padding) / float(localSize.x - totalPad) ),
            uvRemote.y
        );
    }
    else {
        coordRemoteColor = vec2(
            ( (uvRemote.x * localSizeF.x + padding) / float(newWidth) ),
            uvRemote.y
        );
    }

    if (oneCamera) {
        xMin = 0.0; xMax = 0.5;
        depthOffset = 0.5;

        coordRemoteColor.x = coordRemoteColor.x / 2.0;
    }
    if (leftEye) {
        xMin = 0.0; xMax = 0.25;
        depthOffset = 0.25;

        coordRemoteColor.x = coordRemoteColor.x / 4.0;
    }
    if (rightEye) {
        xMin = 0.5; xMax = 0.75;
        depthOffset = 0.25;

        coordRemoteColor.x = coordRemoteColor.x / 4.0 + 0.5;
    }

    if (arMode || !stretchBorders) {
        coordRemoteDepth.x = coordRemoteColor.x + depthOffset;
        coordRemoteDepth.y = coordRemoteColor.y;

        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );

        if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
            coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
            remoteColor = vec4(0.0);
        }
    }
    else {
        xMin = xMin + onePixel;
        xMax = xMax - onePixel;

        coordRemoteColor.x = min(max(coordRemoteColor.x, xMin), xMax);
        coordRemoteColor.y = min(max(coordRemoteColor.y, 0.0), 1.0);
        coordRemoteDepth.x = coordRemoteColor.x + depthOffset;
        coordRemoteDepth.y = coordRemoteColor.y;
        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );
    }

    // force srgb
#ifdef IS_SRGB
    localColor = LinearTosRGB(localColor);
#endif // IS_SRGB

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        // color = remoteColor;
        // color = localDepth * remoteColor + remoteDepth * localColor;

        if (remoteDepth < localDepth) {
            color = remoteColor;
            // handle passthrough
            if (arMode && remoteDepth >= (1.0-(5.0*onePixel))/DEPTH_SCALAR) {
                color = localColor;
            }
        }
    // }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth);
    // gl_FragColor.a = 1.0;
}
