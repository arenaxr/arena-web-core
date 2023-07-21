varying vec2 vUv;

varying vec3 vCameraLTopLeft, vCameraLTopRight, vCameraLBotLeft, vCameraLBotRight;
varying vec3 vCameraRTopLeft, vCameraRTopRight, vCameraRBotLeft, vCameraRBotRight;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;

vec3 cameraToWorld(vec2 uv, mat4 projectionMatrix, mat4 matrixWorld) {
    vec2 ndc = 2.0 * uv - 1.0;
    vec4 uv4 = matrixWorld * inverse(projectionMatrix) * vec4(ndc, 1.0, 1.0);
    vec3 uv3 = vec3(uv4 / uv4.w);
    return uv3;
}

void main() {
    vUv = uv;

    vCameraLTopLeft      = cameraToWorld(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    vCameraLTopRight     = cameraToWorld(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    vCameraLBotLeft      = cameraToWorld(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
    vCameraLBotRight     = cameraToWorld(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

    vCameraRTopLeft      = cameraToWorld(vec2(0.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    vCameraRTopRight     = cameraToWorld(vec2(1.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    vCameraRBotLeft      = cameraToWorld(vec2(0.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);
    vCameraRBotRight     = cameraToWorld(vec2(1.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    // gl_Position = vec4( position, 1.0 );
}
