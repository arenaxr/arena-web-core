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

uniform ivec2 localSize;
uniform ivec2 remoteSize;

uniform mat4 cameraLMatrixWorld;
uniform mat4 cameraLProjectionMatrix;

uniform mat4 remoteLMatrixWorld;
uniform mat4 remoteLProjectionMatrix;

#define DEPTH_SCALAR    (50.0)

bool stretchBorders = false;

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

vec3 viewportPointToRay(vec2 point, mat4 projectionMatrix, mat4 viewMatrix) {
    vec2 ndc = (2.0 * point) - 1.0;
    vec4 clip = vec4(ndc, -1.0, 1.0);
    vec4 eye = inverse(projectionMatrix) * clip;
    eye = vec4(eye.xy, -1.0, 0.0);
    vec3 world = (viewMatrix * eye).xyz;
    return normalize(world);
}

vec2 worldToScreenPos(vec3 pos, mat4 cameraProjection, mat4 worldToCamera, vec3 cameraPosition) {
    float nearPlane = cameraNear;
    float farPlane = cameraFar;
    float textureWidth = float(localSize.x);
    float textureHeight = float(localSize.y);

    vec3 samplePos = normalize(pos - cameraPosition) * (nearPlane + (farPlane - nearPlane)) + cameraPosition;
    vec3 toCam = vec3(worldToCamera * vec4(samplePos, 1.0));
    float camPosZ = toCam.z;
    float height = 2.0 * camPosZ / cameraProjection[1][1];
    float width = textureWidth / textureHeight * height;

    vec2 uv;
    uv.x = (toCam.x + width / 2.0) / width;
    uv.y = (toCam.y + height / 2.0) / height;
    return 1.0 - uv;
}

void main() {
    ivec2 frameSize = ivec2(remoteSize.x / 2, remoteSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 localSizeF = vec2(localSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = frameSizeF.x / frameSizeF.y;
    int newHeight = localSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(localSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / localSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = localSize.x > newWidth;

    vec2 coordLocalNormalized = vUv;
    vec2 coordLocalColor = coordLocalNormalized;
    vec2 coordLocalDepth = coordLocalNormalized;

    vec4 localColor = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepthLocal( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteNormalized = vUv;
    vec2 coordRemoteColor = coordRemoteNormalized;
    vec2 coordRemoteDepth = coordRemoteNormalized;

    vec4 remoteColor;
    float remoteDepth;

    vec3 cameraTopLeft, cameraTopRight, cameraBotLeft, cameraBotRight;
    vec3 remoteTopLeft, remoteTopRight, remoteBotLeft, remoteBotRight;

    float x;
    float xMin = 0.0;
    float xMax = 0.5;

    if (!hasDualCameras) {
        x = vUv.x;
        vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
        vec3 remotePos = matrixWorldToPosition(remoteLMatrixWorld);

        cameraTopLeft  = viewportPointToRay(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraTopRight = viewportPointToRay(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraBotLeft  = viewportPointToRay(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraBotRight = viewportPointToRay(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

        vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                 mix(cameraBotLeft, cameraBotRight, x),
                                 1.0 - vUv.y );

        vec2 uv3 = worldToScreenPos(remotePos + cameraVector, remoteLProjectionMatrix, inverse(remoteLMatrixWorld), remotePos);

        coordRemoteNormalized = uv3;

        if (targetWidthGreater) {
            coordRemoteColor = vec2(
                ( (coordRemoteNormalized.x * localSizeF.x - padding) / float(localSize.x - totalPad) ) / 2.0,
                coordRemoteNormalized.y
            );
        }
        else {
            coordRemoteColor = vec2(
                ( (coordRemoteNormalized.x * localSizeF.x + padding) / float(newWidth) ) / 2.0,
                coordRemoteNormalized.y
            );
        }

        coordRemoteDepth.x = coordRemoteColor.x + 0.5;
        coordRemoteDepth.y = coordRemoteColor.y;
    }
    else {
        // left eye
        if (vUv.x < 0.5) {
            xMax = 0.25;

            x = vUv.x * 2.0;
            coordRemoteColor.x = x / 4.0;
            coordRemoteDepth.x = x / 4.0 + 0.25;
        }
        // right eye
        else {
            xMin = 0.5;
            xMax = 0.75;

            x = (vUv.x - 0.5) * 2.0;
            coordRemoteColor.x = x / 4.0 + 0.5;
            coordRemoteDepth.x = x / 4.0 + 0.75;
        }
    }

    remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
    remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );

    if (!stretchBorders) {
        if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
            coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
            remoteColor = vec4(0.0);
        }
    }

    vec4 color = localColor;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        // color = remoteColor;
        // color = localDepth * remoteColor + remoteDepth * localColor;

        if (remoteDepth <= localDepth) {
            color = vec4(remoteColor.rgb, 1.0);
            // handle passthrough
            if (arMode && remoteDepth >= 0.9 / DEPTH_SCALAR) {
                color = localColor;
            }
        }
    }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth * 50.0);
    // gl_FragColor.a = 1.0;
}
