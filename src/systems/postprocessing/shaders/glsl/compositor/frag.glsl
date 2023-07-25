#include <packing>

varying vec2 vUv;

varying vec3 vCameraLTopLeft, vCameraLTopRight, vCameraLBotLeft, vCameraLBotRight;
varying vec3 vCameraRTopLeft, vCameraRTopRight, vCameraRBotLeft, vCameraRBotRight;

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

#define DO_ASYNC_TIMEWARP
// #define REPROJECT_MOVEMENT // (WIP)

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

vec2 worldToViewport(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = vec2(uv4 / uv4.w);
    return (uv2 + 1.0) / 2.0;
}

vec3 getWorldPos(vec3 cameraVector, vec3 cameraForward, vec3 cameraPos, vec2 uv) {
    float d = dot(cameraForward, cameraVector);
    float sceneDistance = linearEyeDepth(readDepthRemote(tRemoteFrame, uv)) / d;
    vec3 worldPos = cameraPos + cameraVector * sceneDistance;
    return worldPos;
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

    vec2 coordLocalColor = vUv;
    vec2 coordLocalDepth = vUv;

    vec4 localColor = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepthLocal( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteColor = vUv;
    vec2 coordRemoteDepth = vUv;

    vec4 remoteColor;  // = texture2D( tRemoteFrame, coordRemoteColor );
    float remoteDepth; // = readDepthRemote( tRemoteFrame, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye   = (hasDualCameras && vUv.x < 0.5);
    bool rightEye  = (hasDualCameras && vUv.x >= 0.5);

#ifdef DO_ASYNC_TIMEWARP
    bool occluded = false;

    float x;

    float xMin, xMax;
    float depthOffset;

    vec3 cameraPos              = matrixWorldToPosition(cameraLMatrixWorld);
    vec3 remotePos              = matrixWorldToPosition(remoteLMatrixWorld);
    vec3 remoteForward          = remoteLForward;
    vec3 cameraTopLeft          = vCameraLTopLeft;
    vec3 cameraTopRight         = vCameraLTopRight;
    vec3 cameraBotLeft          = vCameraLBotLeft;
    vec3 cameraBotRight         = vCameraLBotRight;
    mat4 remoteProjectionMatrix = remoteLProjectionMatrix;
    mat4 remoteMatrixWorld      = remoteLMatrixWorld;

    if (oneCamera) {
        x = vUv.x;
    }
    if (leftEye) {
        x = 2.0 * vUv.x;
    }
    if (rightEye) {
        x = 2.0 * (vUv.x - 0.5);
        cameraPos              = matrixWorldToPosition(cameraRMatrixWorld);
        remotePos              = matrixWorldToPosition(remoteRMatrixWorld);
        remoteForward          = remoteRForward;
        cameraTopLeft          = vCameraRTopLeft;
        cameraTopRight         = vCameraRTopRight;
        cameraBotLeft          = vCameraRBotLeft;
        cameraBotRight         = vCameraRBotRight;
        remoteProjectionMatrix = remoteRProjectionMatrix;
        remoteMatrixWorld      = remoteRMatrixWorld;
    }

    vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                             mix(cameraBotLeft, cameraBotRight, x),
                             1.0 - vUv.y );

    vec2 uv3 = worldToViewport(remotePos + cameraVector, remoteProjectionMatrix, remoteMatrixWorld);

#ifdef REPROJECT_MOVEMENT
    if (!(arMode || vrMode)) {
        cameraVector = mix( mix(normalize(cameraTopLeft), normalize(cameraTopRight), x),
                            mix(normalize(cameraBotLeft), normalize(cameraBotRight), x),
                            1.0 - vUv.y );
    }
    else {
        cameraVector = normalize(cameraVector);
    }

    vec3 currentPos = cameraPos;

    int steps = 100;
    float stepSize = 30.0 / float(steps);

    float distanceFromWorldToPos;
    for (int i = 0; i < steps; i++) {
        currentPos += (cameraVector * stepSize);

        uv3 = worldToViewport(currentPos, remoteProjectionMatrix, remoteMatrixWorld);
        vec2 uv4 = vec2(uv3.x / 2.0 + 0.5, uv3.y);
        vec3 tracedPos = getWorldPos(normalize(currentPos - remotePos), remoteForward, remotePos, uv4);

        float distanceToCurrentPos = distance(remotePos, currentPos);
        float distanceToWorld = distance(remotePos, tracedPos);

        distanceFromWorldToPos = distanceToCurrentPos - distanceToWorld;
        if (distanceFromWorldToPos > stepSize) {
            occluded = true;
        }
        if (distanceFromWorldToPos > 0.0) {
            break;
        }
    }
#endif

    if (targetWidthGreater) {
        coordRemoteColor = vec2(
            ( (uv3.x * localSizeF.x - padding) / float(localSize.x - totalPad) ),
            uv3.y
        );
    }
    else {
        coordRemoteColor = vec2(
            ( (uv3.x * localSizeF.x + padding) / float(newWidth) ),
            uv3.y
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

#ifdef REPROJECT_MOVEMENT
    if (occluded) {
        vec2 offsetUVLeft      = coordRemoteColor + vec2(1.0, 0.0)  * 0.01;
        vec2 offsetUVRight     = coordRemoteColor + vec2(0.0, 1.0)  * 0.01;
        vec2 offsetUVTop       = coordRemoteColor + vec2(-1.0, 0.0) * 0.01;
        vec2 offsetUVDown      = coordRemoteColor + vec2(0.0, -1.0) * 0.01;

        vec4 remoteColorLeft   = texture2D(tRemoteFrame, offsetUVLeft );
        vec4 remoteColorRight  = texture2D(tRemoteFrame, offsetUVRight);
        vec4 remoteColorTop    = texture2D(tRemoteFrame, offsetUVTop  );
        vec4 remoteColorDown   = texture2D(tRemoteFrame, offsetUVDown );

        float remoteDepth0     = linearEyeDepth(texture2D(tRemoteFrame, coordRemoteColor).r);
        float remoteDepthLeft  = linearEyeDepth(texture2D(tRemoteFrame, offsetUVLeft    ).r);
        float remoteDepthRight = linearEyeDepth(texture2D(tRemoteFrame, offsetUVRight   ).r);
        float remoteDepthTop   = linearEyeDepth(texture2D(tRemoteFrame, offsetUVTop     ).r);
        float remoteDepthDown  = linearEyeDepth(texture2D(tRemoteFrame, offsetUVDown    ).r);

        // find the furthest away one of these five samples
        float remoteDepth = max(max(max(max(remoteDepth0, remoteDepthLeft), remoteDepthRight), remoteDepthTop), remoteDepthDown);
        if (remoteDepth == remoteDepthLeft) {
            remoteColor = localColor;
        }
        if (remoteDepth == remoteDepthRight) {
            remoteColor = localColor;
        }
        if (remoteDepth == remoteDepthTop) {
            remoteColor = localColor;
        }
        if (remoteDepth == remoteDepthDown) {
            remoteColor = localColor;
        }
    }
#endif
#else
    remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
    remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );
#endif

    // force srgb
#ifdef IS_SRGB
    localColor = LinearTosRGB(localColor);
#endif

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        // color = remoteColor;
        // color = localDepth * remoteColor + remoteDepth * localColor;

        if (remoteDepth < localDepth) {
            color = vec4(remoteColor.rgb, 1.0);
            // handle passthrough
            if (arMode && remoteDepth >= (1.0-(5.0*onePixel))/DEPTH_SCALAR) {
                color = localColor;
            }
        }
    // }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    /* gl_FragColor.rgb = vec3(remoteDepth);
     * gl_FragColor.a = 1.0; */
}
