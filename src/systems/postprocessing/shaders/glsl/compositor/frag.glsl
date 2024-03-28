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

uniform mat4 cameraLProjectionMatrixInverse, cameraLMatrixWorldInverse;
uniform mat4 remoteLProjectionMatrixInverse, remoteLMatrixWorldInverse;
uniform mat4 cameraRProjectionMatrixInverse, cameraRMatrixWorldInverse;
uniform mat4 remoteRProjectionMatrixInverse, remoteRMatrixWorldInverse;

const float onePixel = (1.0 / 255.0);

const bool stretchBorders = true;

// #define DO_ASYNC_TIMEWARP

#define DEPTH_SCALAR (50.0)

// adapted from: https://gist.github.com/hecomi/9580605
float linear01Depth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
    return 1.0 / (x * depth + y);
}

float unlinearizeDepth(float depth_linear) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    return (-depth_linear * y + 1.0) / (depth_linear * x);
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
    return linear01Depth(depth);
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

vec3 cameraToWorld(vec2 uv, mat4 projectionMatrixInverse, mat4 matrixWorld) {
    vec2 ndc = 2.0 * uv - 1.0;
    vec4 uv4 = matrixWorld * projectionMatrixInverse * vec4(ndc, 1.0, 1.0);
    vec3 uv3 = vec3(uv4 / uv4.w);
    return uv3;
}

vec2 worldToCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorldInverse) {
    vec4 uv4 = projectionMatrix * matrixWorldInverse * vec4(pt, 1.0);
    vec2 uv2 = vec2(uv4 / uv4.w);
    return (uv2 + 1.0) / 2.0;
}

vec3 getWorldPos(vec3 cameraVector, vec3 cameraForward, vec3 cameraPos, vec2 uv) {
    float d = dot(cameraForward, cameraVector);
    float sceneDistance = linearEyeDepth(unlinearizeDepth(texture2D(tRemoteFrame, uv).r / DEPTH_SCALAR)) / d;
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

    vec2 uvLocal = vUv;

    vec2 coordLocalColor = uvLocal;
    vec2 coordLocalDepth = uvLocal;

    vec4 localColor  = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepthLocal( tLocalDepth, coordLocalDepth );

    vec4 backgroundColor = vec4(0.0);
    
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

    vec3 cameraPos                     = matrixWorldToPosition(cameraLMatrixWorld);
    vec3 remotePos                     = matrixWorldToPosition(remoteLMatrixWorld);
    vec3 remoteForward                 = remoteLForward;
    mat4 cameraProjectionMatrix        = cameraLProjectionMatrix;
    mat4 cameraMatrixWorld             = cameraLMatrixWorld;
    mat4 remoteProjectionMatrix        = remoteLProjectionMatrix;
    mat4 remoteMatrixWorld             = remoteLMatrixWorld;
    mat4 cameraProjectionMatrixInverse = cameraLProjectionMatrixInverse;
    mat4 cameraMatrixWorldInverse      = cameraLMatrixWorldInverse;
    mat4 remoteProjectionMatrixInverse = remoteLProjectionMatrixInverse;
    mat4 remoteMatrixWorldInverse      = remoteLMatrixWorldInverse;

    if (leftEye) {
        uvLocal.x = 2.0 * uvLocal.x;
    }
    if (rightEye) {
        uvLocal.x = 2.0 * (uvLocal.x - 0.5);
        cameraPos                     = matrixWorldToPosition(cameraRMatrixWorld);
        remotePos                     = matrixWorldToPosition(remoteRMatrixWorld);
        cameraProjectionMatrix        = cameraRProjectionMatrix;
        cameraMatrixWorld             = cameraRMatrixWorld;
        remoteForward                 = remoteRForward;
        remoteProjectionMatrix        = remoteRProjectionMatrix;
        remoteMatrixWorld             = remoteRMatrixWorld;
        cameraProjectionMatrixInverse = cameraRProjectionMatrixInverse;
        cameraMatrixWorldInverse      = cameraRMatrixWorldInverse;
        remoteProjectionMatrixInverse = remoteRProjectionMatrixInverse;
        remoteMatrixWorldInverse      = remoteRMatrixWorldInverse;
    }

    vec2 uvRemote = uvLocal;
#if (DO_ASYNC_TIMEWARP == 1)
    vec3 pt = cameraToWorld(uvLocal, cameraProjectionMatrixInverse, cameraMatrixWorld);
    uvRemote = worldToCamera(pt, remoteProjectionMatrix, remoteMatrixWorldInverse);

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
#endif // DO_ASYNC_TIMEWARP

    vec2 uvDepth;
    vec3 cameraVector = normalize(pt - cameraPos);
#if (DO_TRANSLATION_WARPING == 1)
    if (!(arMode || vrMode)) {
        vec3 cameraTopLeft  = normalize(cameraToWorld(vec2(0.0, 1.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
        vec3 cameraTopRight = normalize(cameraToWorld(vec2(1.0, 1.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
        vec3 cameraBotLeft  = normalize(cameraToWorld(vec2(0.0, 0.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
        vec3 cameraBotRight = normalize(cameraToWorld(vec2(1.0, 0.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
        cameraVector = mix( mix(cameraTopLeft, cameraTopRight, uvLocal.x),
                            mix(cameraBotLeft, cameraBotRight, uvLocal.x),
                            1.0 - uvLocal.y );
    }
    vec3 currentPos = cameraPos;
    int steps = 100;
    float stepSize = 30.0 / float(steps);
    float distanceFromWorldToPos;
    for (int i = 0; i < steps; i++) {
        currentPos += (cameraVector * stepSize);
        uvRemote = worldToCamera(currentPos, remoteProjectionMatrix, remoteMatrixWorldInverse);
        
        if (targetWidthGreater) {
            uvRemote = vec2(
                ( (uvRemote.x * localSizeF.x - padding) / float(localSize.x - totalPad) ),
                uvRemote.y
            );
        }
        else {
            uvRemote = vec2(
                ( (uvRemote.x * localSizeF.x + padding) / float(newWidth) ),
                uvRemote.y
            );
        }

        if (oneCamera) {
            uvDepth.x = uvRemote.x / 2.0 + 0.5;
            uvDepth.y = uvRemote.y;
        }
        if (leftEye) {
            uvDepth.x = uvRemote.x / 4.0 + 0.25;
            uvDepth.y = uvRemote.y;
        }
        if (rightEye) {
            uvDepth.x = uvRemote.x / 4.0 + 0.5 + 0.25;
            uvDepth.y = uvRemote.y;
        }
        vec3 tracedPos = getWorldPos(normalize(currentPos - remotePos), remoteForward, remotePos, uvDepth);
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
#endif // DO_TRANSLATION_WARPING

    coordRemoteColor = uvRemote;

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


    //Set remoteColor and remoteDepth
    if (arMode || !stretchBorders) {
        coordRemoteDepth.x = coordRemoteColor.x + depthOffset;
        coordRemoteDepth.y = coordRemoteColor.y;

        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );

        if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
            coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
            remoteColor = backgroundColor;
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

    //Handling the occluded
    if (occluded) {
        if (stretchBorders) {
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
                remoteColor = remoteColorLeft;
            }
            if (remoteDepth == remoteDepthRight) {
                remoteColor = remoteColorRight;
            }
            if (remoteDepth == remoteDepthTop) {
                remoteColor = remoteColorTop;
            }
            if (remoteDepth == remoteDepthDown) {
                remoteColor = remoteColorDown;
            }
        }
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
    
    
    gl_FragColor = color;
}