export const DecoderShader = {
    uniforms: {
        tRemoteFrame: {
            type: 't', value: new THREE.Texture(),
        },
        streamSize: {
            type: 'i2', value: [0, 0],
        },
        frameIDLength: {
            type: 'int', value: 32,
        },
    },

    vertexShader: require('./shaders/decoder/vert.glsl'),

    fragmentShader: require('./shaders/decoder/frag.glsl'),
};
