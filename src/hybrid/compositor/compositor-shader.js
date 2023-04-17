export const CompositorShader = {
    uniforms: {
        tLocalColor: {
            type: 't', value: new THREE.Texture(),
        },
        tRemoteFrame: {
            type: 't', value: new THREE.Texture(),
        },
        tLocalDepth: {
            type: 't', value: new THREE.Texture(),
        },
        windowSize: {
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
        hasDualCameras: {
            type: 'bool', value: false,
        },
        arMode: {
            type: 'bool', value: false,
        },
        vrMode: {
            type: 'bool', value: false,
        },
    },

    vertexShader: require('./shaders/compositor/vert.glsl'),

    fragmentShader: require('./shaders/compositor/frag.glsl'),
};
