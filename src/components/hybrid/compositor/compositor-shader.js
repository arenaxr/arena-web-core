export const CompositorShader = {
    uniforms: {
        tDiffuse: {
            type: 't', value: new THREE.Texture(),
        },
        tStream: {
            type: 't', value: new THREE.Texture(),
        },
        tDepth: {
            type: 't', value: new THREE.Texture(),
        },
        diffuseSize: {
            type: 'i2', value: [0, 0],
        },
        streamSize: {
            type: 'i2', value: [0, 0],
        },
        cameraNear: {
            type: 'f', value: 0.1,
        },
        cameraFar: {
            type: 'f', value: 10000.0,
        },
    },

    vertexShader: require('./shaders/vert.glsl'),

    fragmentShader: require('./shaders/frag.glsl'),
};
