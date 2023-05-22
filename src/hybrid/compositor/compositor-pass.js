import {FullScreenQuad, Pass} from './pass';
import {CompositorShader} from './compositor-shader';
import {DecoderShader} from './decoder-shader';

const FRAME_ID_LENGTH = 32;

export class CompositorPass extends Pass {
    constructor(camera, remoteRenderTarget) {
        super();

        this.remoteRenderTarget = remoteRenderTarget;

        this.uniforms = THREE.UniformsUtils.clone(CompositorShader.uniforms);
        this.material = new THREE.ShaderMaterial({
            defines: Object.assign({}, CompositorShader.defines),
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader,
        });

        this.material.uniforms.tRemoteFrame.value = this.remoteRenderTarget.texture;
        this.material.uniforms.remoteSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        this.material.uniforms.cameraNear.value = camera.near;
        this.material.uniforms.cameraFar.value = camera.far;

        this.fsQuad = new FullScreenQuad(this.material);

        const decoderUniform = THREE.UniformsUtils.clone(DecoderShader.uniforms);
        const decoderMaterial = new THREE.ShaderMaterial({
            defines: Object.assign({}, DecoderShader.defines),
            uniforms: decoderUniform,
            vertexShader: DecoderShader.vertexShader,
            fragmentShader: DecoderShader.fragmentShader,
        });
        decoderMaterial.uniforms.tRemoteFrame.value = this.remoteRenderTarget.texture;
        decoderMaterial.uniforms.remoteSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        decoderMaterial.uniforms.frameIDLength.value = FRAME_ID_LENGTH;

        this.decoderFsQuad = new FullScreenQuad(decoderMaterial);
        this.decoderRenderTarget = new THREE.WebGLRenderTarget(FRAME_ID_LENGTH, 1);
        this.pixelBuffer = new Uint8Array( FRAME_ID_LENGTH * 4 );

        this.needsSwap = false;

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
        renderer.setRenderTarget(this.decoderRenderTarget);
        this.decoderFsQuad.render(renderer);

        // const start = performance.now();
        renderer.readRenderTargetPixels(this.decoderRenderTarget, 0, 0, FRAME_ID_LENGTH, 1, this.pixelBuffer);
        // const stop = performance.now();
        // console.log(stop - start);

        var value = 0;
        for (var i = 0; i < FRAME_ID_LENGTH; i++) {
            if (this.pixelBuffer[4*i+1] / 255 > 0.5) {
                value += (1 << i);
            }
        }
        return value;
    }

    setCameraMats(cameraL, cameraR) {
        if (cameraL) {
            this.material.uniforms.cameraLProjectionMatrix.value.copy(cameraL.projectionMatrix);
            this.material.uniforms.cameraLMatrixWorld.value.copy(cameraL.matrixWorld);
        }

        if (cameraR) {
            this.material.uniforms.cameraRProjectionMatrix.value.copy(cameraR.projectionMatrix);
            this.material.uniforms.cameraRMatrixWorld.value.copy(cameraR.matrixWorld);
        }
    }

    setCameraMatsRemote(remoteLPose, remoteLProj, remoteRPose, remoteRProj) {
        this.material.uniforms.remoteLProjectionMatrix.value.copy(remoteLProj);
        this.material.uniforms.remoteLMatrixWorld.value.copy(remoteLPose);
        if (remoteRProj) this.material.uniforms.remoteRProjectionMatrix.value.copy(remoteRProj);
        if (remoteRPose) this.material.uniforms.remoteRMatrixWorld.value.copy(remoteRPose);
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

    render(renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */) {
        this.material.uniforms.tLocalColor.value = readBuffer.texture;
        this.material.uniforms.tLocalDepth.value = readBuffer.depthTexture;

        renderer.setRenderTarget(writeBuffer);
        this.fsQuad.render(renderer);
    }
}
