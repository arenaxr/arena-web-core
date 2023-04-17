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
        this.material.uniforms.streamSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        this.material.uniforms.cameraNear.value = camera.near;
        this.material.uniforms.cameraFar.value = camera.far;

        this.needsSwap = false;

        this.fsQuad = new FullScreenQuad(this.material);

        const decoderUniform = THREE.UniformsUtils.clone(DecoderShader.uniforms);
        const decoderMaterial = new THREE.ShaderMaterial({
            defines: Object.assign({}, DecoderShader.defines),
            uniforms: decoderUniform,
            vertexShader: DecoderShader.vertexShader,
            fragmentShader: DecoderShader.fragmentShader,
        });
        decoderMaterial.uniforms.tRemoteFrame.value = this.remoteRenderTarget.texture;
        decoderMaterial.uniforms.streamSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        decoderMaterial.uniforms.frameIDLength.value = FRAME_ID_LENGTH;

        this.decoderFsQuad = new FullScreenQuad(decoderMaterial);
        this.decoderRenderTarget = new THREE.WebGLRenderTarget(FRAME_ID_LENGTH, 1);
        this.pixelBuffer = new Uint8Array( FRAME_ID_LENGTH * 4 );

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));
    }

    setSize(width, height) {
        this.material.uniforms.windowSize.value = [width, height];
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

        const start = performance.now();
        renderer.readRenderTargetPixels(this.decoderRenderTarget, 0, 0, FRAME_ID_LENGTH, 1, this.pixelBuffer);
        const stop = performance.now();
        console.log(stop - start);

        var value = 0;
        for (var i = 0; i < FRAME_ID_LENGTH; i++) {
            if (this.pixelBuffer[4*i+1] / 255 > 0.5) {
                value += 1 << i;
            }
        }
        return value;
    }

    onEnterVR() {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl.is('ar-mode')) {
            this.material.uniforms.arMode.value = true;
        } else {
            this.material.uniforms.vrMode.value = true;
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
