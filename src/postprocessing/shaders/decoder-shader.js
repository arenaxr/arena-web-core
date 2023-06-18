/* global THREE */

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

    vertexShader: require('./glsl/decoder/vert.glsl'),

    fragmentShader: require('./glsl/decoder/frag.glsl'),
};

export default DecoderShader;
