import {FullScreenQuad, Pass} from './pass';
import {CompositorShader} from './compositor-shader';

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

        this.material.uniforms.tRemoteColor.value = this.remoteRenderTarget.texture;
        this.material.uniforms.streamSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        this.material.uniforms.cameraNear.value = camera.near;
        this.material.uniforms.cameraFar.value = camera.far;

        this.needsSwap = false;

        this.fsQuad = new FullScreenQuad(this.material);

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
