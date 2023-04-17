#include <packing>

varying vec2 vUv;

uniform sampler2D tRemoteFrame;

uniform ivec2 streamSize;

uniform int frameIDLength;

void main() {
    vec2 frameSizeF = vec2(streamSize);
    float width = frameSizeF.x;
    float frameIDLengthF = float(frameIDLength);

    float x = (width - frameIDLengthF + vUv.x * frameIDLengthF) / width;

    vec2 lookupPt = vec2(x, 1.0);

    vec4 color = texture2D( tRemoteFrame, lookupPt );

    gl_FragColor = color;
}
