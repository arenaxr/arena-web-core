import vertGLSL from './glsl/decoder/vert.glsl';
import fragGLSL from './glsl/decoder/frag.glsl';

const DecoderShader = {
    uniforms: {
        tRemoteFrame: {
            type: 't',
            value: new THREE.Texture(),
        },
        remoteSize: {
            type: 'i2',
            value: [0, 0],
        },
        frameIDLength: {
            type: 'int',
            value: 32,
        },
    },

    vertexShader: vertGLSL,

    fragmentShader: fragGLSL,
};

export default DecoderShader;
