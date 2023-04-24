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

uniform mat4 cameraLMatrixWorld;
uniform mat4 cameraLProjectionMatrix;

uniform mat4 remoteLMatrixWorld;
uniform mat4 remoteLProjectionMatrix;

#define DEPTH_SCALAR    (50.0)

vec3 homogenize(vec2 coord) {
    return vec3(coord, 1.0);
}

vec2 unhomogenize(vec3 coord) {
    return coord.xy / coord.z;
}

vec2 image2NDC(vec2 imageCoords) {
    return 2.0 * imageCoords - 1.0;
}

vec2 NDC2image(vec2 ndcCoords) {
    return (ndcCoords + 1.0) / 2.0;
}

float intersectPlane(vec3 p0, vec3 n, vec3 l0, vec3 l) {
    n = normalize(n);
    l = normalize(l);
    float t = 0.0;
    float denom = dot(n, l);
    if (denom > 1e-6) {
        vec3 p0l0 = p0 - l0;
        t = dot(p0l0, n) / denom;
        return t;
    }
    return t;
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 unprojectCamera(vec2 uv, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = matrixWorld * inverse(projectionMatrix) * vec4(image2NDC(uv), 1.0, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    return uv3;
}

vec2 projectCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = unhomogenize(uv4.xyz / uv4.w);
    return NDC2image(uv2);
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[0][3], matrixWorld[1][3], matrixWorld[2][3]);
}

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

    vec2 coordLocalNormalized = vUv;
    vec2 coordRemoteNormalized;
    if (targetWidthGreater) {
        coordRemoteNormalized = vec2(
            ( (vUv.x * windowSizeF.x - padding) / float(windowSize.x - totalPad) ) / 2.0,
            vUv.y
        );
    }
    else {
        coordRemoteNormalized = vec2(
            ( (vUv.x * windowSizeF.x + padding) / float(newWidth) ) / 2.0,
            vUv.y
        );
    }

    vec2 coordDiffuseColor = coordLocalNormalized;
    vec2 coordDiffuseDepth = coordLocalNormalized;

    vec4 diffuseColor = texture2D( tLocalColor, coordDiffuseColor );
    float diffuseDepth = readDepthLocal( tLocalDepth, coordDiffuseDepth );

    vec4 remoteColor;
    float remoteDepth;

    vec2 coordRemoteColor = coordRemoteNormalized;
    vec2 coordRemoteDepth = coordRemoteNormalized;

    vec3 cameraTopLeft, cameraTopRight, cameraBotLeft, cameraBotRight;
    vec3 remoteTopLeft, remoteTopRight, remoteBotLeft, remoteBotRight;

    if (!hasDualCameras) {
        float x = 2.0 * coordRemoteNormalized.x;

        cameraTopLeft  = unprojectCamera(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraTopRight = unprojectCamera(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraBotLeft  = unprojectCamera(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
        cameraBotRight = unprojectCamera(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

        remoteTopLeft  = unprojectCamera(vec2(0.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
        remoteTopRight = unprojectCamera(vec2(1.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
        remoteBotLeft  = unprojectCamera(vec2(0.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);

        vec3 cameraLVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                  mix(cameraBotLeft, cameraBotRight, x),
                                  1.0 - vUv.y );
        vec3 cameraLPos = matrixWorldToPosition(cameraLMatrixWorld);

        vec3 remotePlaneNormal = cross(remoteTopRight - remoteTopLeft, remoteBotLeft - remoteTopLeft);
        float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraLPos, cameraLVector);
        vec3 hitPt = cameraLPos + cameraLVector * t;
        vec2 uv3 = projectCamera(hitPt, remoteLProjectionMatrix, remoteLMatrixWorld);

        coordRemoteNormalized = uv3;
        coordRemoteNormalized.x = coordRemoteNormalized.x / 2.0;

        coordRemoteColor = coordRemoteNormalized;
        coordRemoteDepth = vec2(coordRemoteNormalized.x + 0.5, coordRemoteNormalized.y);
    }
    else {
        // left eye
        if (vUv.x < 0.5) {
            float xcoord = vUv.x * 2.0;
            coordRemoteColor.x = xcoord / 4.0;
            coordRemoteDepth.x = xcoord / 4.0 + 0.25;
        }
        // right eye
        else {
            float xcoord = (vUv.x - 0.5) * 2.0;
            coordRemoteColor.x = xcoord / 4.0 + 0.5;
            coordRemoteDepth.x = xcoord / 4.0 + 0.75;
        }
    }

    bool stretchBorders = false;

    float xMin = 0.0;
    float xMax = 0.5;
    if (!stretchBorders) {
        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );
        if (coordRemoteColor.x < xMin ||
            coordRemoteColor.x > xMax ||
            coordRemoteColor.y < 0.0 ||
            coordRemoteColor.y > 1.0) {
            remoteColor = vec4(0.0);
        }

        coordRemoteDepth = vec2(coordRemoteColor.x + 0.5, coordRemoteColor.y);
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );
    }
    else {
        coordRemoteColor.x = max(coordRemoteColor.x, xMin);
        coordRemoteColor.x = min(coordRemoteColor.x, xMax);
        coordRemoteColor.y = max(coordRemoteColor.y, 0.0);
        coordRemoteColor.y = min(coordRemoteColor.y, 1.0);
        remoteColor = texture2D( tRemoteFrame, coordRemoteColor );

        coordRemoteDepth = vec2(coordRemoteColor.x + 0.5, coordRemoteColor.y);
        remoteDepth = readDepthRemote( tRemoteFrame, coordRemoteDepth );
    }

    bool ignore = false; // readMask( tRemoteFrame, coordRemoteDepth );

    vec4 color;
    if (!targetWidthGreater ||
        (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (!ignore) {
            // color = remoteColor;
            // color = diffuseDepth * remoteColor + remoteDepth * diffuseColor;

            if (remoteDepth <= diffuseDepth) {
                color = vec4(remoteColor.rgb, 1.0);
                // handles passthrough
                if (arMode && remoteDepth >= 0.9 / DEPTH_SCALAR) {
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

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(diffuseDepth);
    // gl_FragColor.a = 1.0;
}
