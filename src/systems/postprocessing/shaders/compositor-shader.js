/* global THREE */

import vertGLSL from './glsl/compositor/vert.glsl';
import fragGLSL from './glsl/compositor/frag.glsl';

const CompositorShader = {
    defines: {
        IS_SRGB: true,
        DO_ASYNC_TIMEWARP: (ARENA.params.atw === undefined ? 1 : ARENA.params.atw),
    },
    uniforms: {
        tLocalColor: {
            type: 't',
            value: new THREE.Texture(),
        },
        tRemoteFrame: {
            type: 't',
            value: new THREE.Texture(),
        },
        tLocalDepth: {
            type: 't',
            value: new THREE.Texture(),
        },
        localSize: {
            type: 'i2',
            value: [0, 0],
        },
        remoteSize: {
            type: 'i2',
            value: [0, 0],
        },
        cameraNear: {
            type: 'f',
            value: 0.1,
        },
        cameraFar: {
            type: 'f',
            value: 10000.0,
        },
        hasDualCameras: {
            type: 'bool',
            value: false,
        },
        arMode: {
            type: 'bool',
            value: false,
        },
        vrMode: {
            type: 'bool',
            value: false,
        },
        cameraLProjectionMatrix: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        cameraLMatrixWorld: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        cameraRProjectionMatrix: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        cameraRMatrixWorld: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        remoteLProjectionMatrix: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        remoteLMatrixWorld: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        remoteRProjectionMatrix: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        remoteRMatrixWorld: {
            type: 'mat4',
            value: new THREE.Matrix4(),
        },
        remoteLForward: {
            type: 'vec3',
            value: new THREE.Vector3(),
        },
        remoteRForward: {
            type: 'vec3',
            value: new THREE.Vector3(),
        },
    },

    vertexShader: vertGLSL,

    fragmentShader: fragGLSL,
};

export default CompositorShader;
