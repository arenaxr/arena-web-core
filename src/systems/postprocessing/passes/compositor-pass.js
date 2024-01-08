/* global THREE */

import { FullScreenQuad, Pass } from './pass';
import CompositorShader from '../shaders/compositor-shader';
import DecoderShader from '../shaders/decoder-shader';

const FRAME_ID_LENGTH = 32;

export default class CompositorPass extends Pass {
    constructor(camera, remoteRenderTarget) {
        super();

        this.remoteRenderTarget = remoteRenderTarget;
        this.camera = camera;

        this.uniforms = THREE.UniformsUtils.clone(CompositorShader.uniforms);
        this.material = new THREE.ShaderMaterial({
            defines: { ...CompositorShader.defines },
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader,
        });

        this.material.uniforms.tRemoteFrame.value = this.remoteRenderTarget.texture;
        this.material.uniforms.remoteSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];

        this.fsQuad = new FullScreenQuad(this.material);

        const decoderUniform = THREE.UniformsUtils.clone(DecoderShader.uniforms);
        const decoderMaterial = new THREE.ShaderMaterial({
            defines: { ...DecoderShader.defines },
            uniforms: decoderUniform,
            vertexShader: DecoderShader.vertexShader,
            fragmentShader: DecoderShader.fragmentShader,
        });
        decoderMaterial.uniforms.tRemoteFrame.value = this.remoteRenderTarget.texture;
        decoderMaterial.uniforms.remoteSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        decoderMaterial.uniforms.frameIDLength.value = FRAME_ID_LENGTH;

        this.decoderFsQuad = new FullScreenQuad(decoderMaterial);
        this.decoderRenderTarget = new THREE.WebGLRenderTarget(FRAME_ID_LENGTH, 1);
        this.pixelBuffer = new Uint8Array(FRAME_ID_LENGTH * 4);

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));
    }

    setSize(width, height) {
        this.material.uniforms.localSize.value = [width, height];
    }

    setHasDualCameras(hasDualCameras) {
        this.material.uniforms.hasDualCameras.value = hasDualCameras;
    }

    getHasDualCameras() {
        return this.material.uniforms.hasDualCameras.value;
    }

    getFrameID(renderer) {
        const currentRenderTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.decoderRenderTarget);
        this.decoderFsQuad.render(renderer);

        // const start = performance.now();
        renderer.readRenderTargetPixels(this.decoderRenderTarget, 0, 0, FRAME_ID_LENGTH, 1, this.pixelBuffer);
        // const end = performance.now();
        // console.log(end - start);

        renderer.setRenderTarget(currentRenderTarget);

        let value = 0;
        let value1 = 0;
        for (let i = 0; i < FRAME_ID_LENGTH; i++) {
            if (this.pixelBuffer[4 * i + 1] / 255 > 0.5) {
                value += 1 << i;
            }
            if (this.pixelBuffer[4 * i + 2] / 255 > 0.5) {
                value1 += 1 << i;
            }
        }

        if (value !== value1) {
            if (value % 100 < 10) return value;
            if (value1 % 100 < 10) return value1;
            return undefined;
        }
        if (value % 100 < 10) return value;
        return undefined;
    }

    setCameraMats(cameraL, cameraR) {
        if (cameraL) {
            // only update if changed
            if (!this.material.uniforms.cameraLProjectionMatrix.value.equals(cameraL.projectionMatrix)) {
                this.material.uniforms.cameraLProjectionMatrix.value.copy(cameraL.projectionMatrix);

                this.material.uniforms.cameraLProjectionMatrixInverse.value.copy(cameraL.projectionMatrix);
                this.material.uniforms.cameraLProjectionMatrixInverse.value.invert();
            }

            // only update if changed
            if (!this.material.uniforms.cameraLMatrixWorld.value.equals(cameraL.matrixWorld)) {
                this.material.uniforms.cameraLMatrixWorld.value.copy(cameraL.matrixWorld);

                this.material.uniforms.cameraLMatrixWorldInverse.value.copy(cameraL.matrixWorld);
                this.material.uniforms.cameraLMatrixWorldInverse.value.invert();
            }
        }

        if (cameraR) {
            // only update if changed
            if (!this.material.uniforms.cameraRProjectionMatrix.value.equals(cameraR.projectionMatrix)) {
                this.material.uniforms.cameraRProjectionMatrix.value.copy(cameraR.projectionMatrix);

                this.material.uniforms.cameraRProjectionMatrixInverse.value.copy(cameraR.projectionMatrix);
                this.material.uniforms.cameraRProjectionMatrixInverse.value.invert();
            }

            // only update if changed
            if (!this.material.uniforms.cameraRMatrixWorld.value.equals(cameraR.matrixWorld)) {
                this.material.uniforms.cameraRMatrixWorld.value.copy(cameraR.matrixWorld);

                this.material.uniforms.cameraRMatrixWorldInverse.value.copy(cameraR.matrixWorld);
                this.material.uniforms.cameraRMatrixWorldInverse.value.invert();
            }
        }
    }

    setCameraMatsRemote(remoteLProj, remoteLPose, remoteRProj, remoteRPose) {
        if (remoteLProj) {
            // only update if changed
            if (!this.material.uniforms.remoteLProjectionMatrix.value.equals(remoteLProj)) {
                this.material.uniforms.remoteLProjectionMatrix.value.copy(remoteLProj);

                this.material.uniforms.remoteLProjectionMatrixInverse.value.copy(remoteLProj);
                this.material.uniforms.remoteLProjectionMatrixInverse.value.invert();
            }
        }

        if (remoteLPose) {
            // only update if changed
            if (!this.material.uniforms.remoteLMatrixWorld.value.equals(remoteLPose)) {
                this.material.uniforms.remoteLMatrixWorld.value.copy(remoteLPose);

                this.material.uniforms.remoteLMatrixWorldInverse.value.copy(remoteLPose);
                this.material.uniforms.remoteLMatrixWorldInverse.value.invert();
            }

            this.getWorldDirection(remoteLPose, this.material.uniforms.remoteLForward.value);
        }

        if (remoteRProj) {
            // only update if changed
            if (!this.material.uniforms.remoteRProjectionMatrix.value.equals(remoteRProj)) {
                this.material.uniforms.remoteRProjectionMatrix.value.copy(remoteRProj);

                this.material.uniforms.remoteRProjectionMatrixInverse.value.copy(remoteRProj);
                this.material.uniforms.remoteRProjectionMatrixInverse.value.invert();
            }
        }

        if (remoteRPose) {
            // only update if changed
            if (!this.material.uniforms.remoteRMatrixWorld.value.equals(remoteRPose)) {
                this.material.uniforms.remoteRMatrixWorld.value.copy(remoteRPose);

                this.material.uniforms.remoteRMatrixWorldInverse.value.copy(remoteRPose);
                this.material.uniforms.remoteRMatrixWorldInverse.value.invert();
            }

            this.getWorldDirection(remoteRPose, this.material.uniforms.remoteRForward.value);
        }
    }

    getWorldDirection(matrixWorld, target) {
        const e = matrixWorld.elements;
        return target.set(-e[8], -e[9], -e[10]).normalize();
    }

    onEnterVR() {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl.is('ar-mode')) {
            this.material.uniforms.vrMode.value = false;
            this.material.uniforms.arMode.value = true;
        } else {
            this.material.uniforms.vrMode.value = true;
            this.material.uniforms.arMode.value = false;
        }
    }

    onExitVR() {
        this.material.uniforms.arMode.value = false;
        this.material.uniforms.vrMode.value = false;
    }

    render(renderer, writeBuffer, readBuffer, currentRenderTarget /* , deltaTime, maskActive */) {
        this.material.uniforms.tLocalColor.value = readBuffer.texture;
        this.material.uniforms.tLocalDepth.value = readBuffer.depthTexture;

        this.material.defines.IS_SRGB = renderer.outputColorSpace === THREE.SRGBColorSpace;

        this.material.uniforms.cameraNear.value = this.camera.near;
        this.material.uniforms.cameraFar.value = this.camera.far;

        if (this.renderToScreen) {
            renderer.setRenderTarget(currentRenderTarget);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
            this.fsQuad.render(renderer);
        }
    }

    dispose() {
        this.material.dispose();
        this.decoderMaterial.dispose();
        this.fsQuad.dispose();
    }
}
