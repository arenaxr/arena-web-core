#include <packing>

varying vec2 vUv;

varying vec3 vCameraLTopLeft, vCameraLTopRight, vCameraLBotLeft, vCameraLBotRight;
varying vec3 vCameraRTopLeft, vCameraRTopRight, vCameraRBotLeft, vCameraRBotRight;
varying vec3 vRemoteLTopLeft, vRemoteRTopLeft;
varying vec3 vRemoteLPlaneNormal, vRemoteRPlaneNormal;

uniform sampler2D tLocalColor, tLocalDepth;
uniform sampler2D tRemoteFrame;

uniform float cameraNear, cameraFar;

uniform bool hasDualCameras;
uniform bool arMode, vrMode;

uniform ivec2 localSize, remoteSize;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

#define DEPTH_SCALAR    (50.0)

const float onePixel = (1.0 / 255.0);

const bool doAsyncTimeWarp = true;
const bool stretchBorders = true;

float readDepthRemote(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth / DEPTH_SCALAR;
}

float readDepthLocal(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
    viewZ = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
    return viewZ;
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

float intersectPlane(vec3 p0, vec3 n, vec3 l0, vec3 l) {
    n = normalize(n);
    l = normalize(l);
    float t = -1.0;
    float denom = dot(n, l);
    if (denom > 1e-6) {
        vec3 p0l0 = p0 - l0;
        t = dot(p0l0, n) / denom;
        return t;
    }
    return t;
}

vec2 worldToCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    vec2 uv2 = uv3.xy / uv3.z;
    return (uv2 + 1.0) / 2.0;
}

void main() {
    ivec2 frameSize = ivec2(remoteSize.x, remoteSize.y);
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
    bool leftEye = (hasDualCameras && vUv.x < 0.5);
    bool rightEye = (hasDualCameras && vUv.x >= 0.5);

    if (doAsyncTimeWarp) {
        float x;
        float xMin, xMax;
        float depthOffset;

        vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
        vec3 cameraTopLeft = vCameraLTopLeft;
        vec3 cameraTopRight = vCameraLTopRight;
        vec3 cameraBotLeft = vCameraLBotLeft;
        vec3 cameraBotRight = vCameraLBotRight;
        vec3 remoteTopLeft = vRemoteLTopLeft;
        vec3 remotePlaneNormal = vRemoteLPlaneNormal;
        mat4 remoteProjectionMatrix = remoteLProjectionMatrix;
        mat4 remoteMatrixWorld = remoteLMatrixWorld;

        if (oneCamera) {
            x = vUv.x;
        }
        else if (leftEye) {
            x = 2.0 * vUv.x;
        }
        else if (rightEye) {
            x = 2.0 * (vUv.x - 0.5);

            cameraPos = matrixWorldToPosition(cameraRMatrixWorld);
            cameraTopLeft = vCameraRTopLeft;
            cameraTopRight = vCameraRTopRight;
            cameraBotLeft = vCameraRBotLeft;
            cameraBotRight = vCameraRBotRight;
            remoteTopLeft = vRemoteRTopLeft;
            remotePlaneNormal = vRemoteRPlaneNormal;
            remoteProjectionMatrix = remoteRProjectionMatrix;
            remoteMatrixWorld = remoteRMatrixWorld;
        }

        vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                 mix(cameraBotLeft, cameraBotRight, x),
                                 1.0 - vUv.y );

        float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraPos, cameraVector);
        vec3 hitPt = cameraPos + cameraVector * t;
        vec2 uv3 = worldToCamera(hitPt, remoteProjectionMatrix, remoteMatrixWorld);

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
            xMin = 0.0; xMax = 1.0;
        }
        else if (leftEye) {
            xMin = 0.0; xMax = 0.5;

            coordRemoteColor.x = coordRemoteColor.x / 2.0;
        }
        else if (rightEye) {
            xMin = 0.5; xMax = 1.0;

            coordRemoteColor.x = coordRemoteColor.x / 2.0 + 0.5;
        }

        if (!stretchBorders) {
            /* coordRemoteDepth.x = coordRemoteColor.x + depthOffset;
             * coordRemoteDepth.y = coordRemoteColor.y; */

            remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
            remoteDepth = 1.0; // readDepthRemote( tRemoteFrame, coordRemoteDepth );

            if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
                coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
                remoteColor = vec4(0.0);
            }
        }
        else {
            xMin = xMin + onePixel;
            xMax = xMax - onePixel;

            coordRemoteColor.y = min(max(coordRemoteColor.y, 0.0), 1.0);
            if (coordRemoteColor.y == 1.0) {
                xMax = xMax - 33.0 * onePixel;
            }
            coordRemoteColor.x = min(max(coordRemoteColor.x, xMin), xMax);
            /* coordRemoteDepth.x = coordRemoteColor.x + depthOffset;
             * coordRemoteDepth.y = coordRemoteColor.y; */
            remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
            remoteDepth = 1.0; // readDepthRemote( tRemoteFrame, coordRemoteDepth );
        }
    }
    else {
        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );
    }

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        // color = remoteColor;
        // color = localDepth * remoteColor + remoteDepth * localColor;

        if (remoteDepth <= localDepth) {
            color = vec4(remoteColor.rgb, 1.0);
            // handle passthrough
            if (arMode && remoteDepth >= 0.9 / DEPTH_SCALAR) {
                color = localColor;
            }
        }
    // }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth * 50.0);
    // gl_FragColor.a = 1.0;
}
