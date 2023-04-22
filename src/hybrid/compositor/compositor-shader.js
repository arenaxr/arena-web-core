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
        cameraLMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        cameraLProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteLMatrixWorld: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
        remoteLProjectionMatrix: {
            type: 'mat4', value: new THREE.Matrix4(),
        },
    },

    vertexShader: require('./shaders/compositor/vert.glsl'),

    fragmentShader: require('./shaders/compositor/frag.glsl'),
};
