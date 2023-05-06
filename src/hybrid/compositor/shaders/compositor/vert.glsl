varying vec2 vUv;

varying vec3 cameraLTopLeft, cameraLTopRight, cameraLBotLeft, cameraLBotRight;
varying vec3 cameraRTopLeft, cameraRTopRight, cameraRBotLeft, cameraRBotRight;
varying vec3 remoteLTopLeft, remoteRTopLeft;
varying vec3 remoteLPlaneNormal, remoteRPlaneNormal;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

vec3 cameraToWorld(vec2 uv, mat4 projectionMatrix, mat4 matrixWorld) {
    vec2 ndc = 2.0 * uv - 1.0;
    vec4 uv4 = matrixWorld * inverse(projectionMatrix) * vec4(ndc, 1.0, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    return uv3;
}

void main() {
    vUv = uv;

    cameraLTopLeft       = cameraToWorld(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    cameraLTopRight      = cameraToWorld(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    cameraLBotLeft       = cameraToWorld(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    cameraLBotRight      = cameraToWorld(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

    remoteLTopLeft       = cameraToWorld(vec2(0.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
    vec3 remoteLTopRight = cameraToWorld(vec2(1.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
    vec3 remoteLBotLeft  = cameraToWorld(vec2(0.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);
    remoteLPlaneNormal   = cross(remoteLTopRight - remoteLTopLeft, remoteLBotLeft - remoteLTopLeft);

    cameraRTopLeft       = cameraToWorld(vec2(0.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    cameraRTopRight      = cameraToWorld(vec2(1.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    cameraRBotLeft       = cameraToWorld(vec2(0.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    cameraRBotRight      = cameraToWorld(vec2(1.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);

    remoteRTopLeft       = cameraToWorld(vec2(0.0, 1.0), remoteRProjectionMatrix, remoteRMatrixWorld);
    vec3 remoteRTopRight = cameraToWorld(vec2(1.0, 1.0), remoteRProjectionMatrix, remoteRMatrixWorld);
    vec3 remoteRBotLeft  = cameraToWorld(vec2(0.0, 0.0), remoteRProjectionMatrix, remoteRMatrixWorld);
    remoteRPlaneNormal   = cross(remoteRTopRight - remoteRTopLeft, remoteRBotLeft - remoteRTopLeft);

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    // gl_Position = vec4( position, 1.0 );
}
