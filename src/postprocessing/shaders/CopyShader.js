/**
 * Full-screen textured quad shader
 */

const CopyShader = {
    uniforms: {
        tDiffuse: { value: null },
        opacity: { value: 1.0 },
        convertSRGB: { value: false },
    },

    vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

    fragmentShader: /* glsl */ `
    uniform float opacity;
    uniform sampler2D tDiffuse;
    uniform bool convertSRGB;
    varying vec2 vUv;
    void main() {
        gl_FragColor = texture2D( tDiffuse, vUv );
        gl_FragColor.a *= opacity;
        if (convertSRGB) {
            gl_FragColor = LinearTosRGB(gl_FragColor);
        }
    }`,
};

export default CopyShader;
