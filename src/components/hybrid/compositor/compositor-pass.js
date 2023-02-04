import {FullScreenQuad, Pass} from './pass';
import {CompositorShader} from './compositor-shader';

export class CompositorPass extends Pass {
    constructor(scene, camera, videoSource) {
        super();

        this.scene = scene;
        this.camera = camera;
        this.videoSource = videoSource;

        this.uniforms = THREE.UniformsUtils.clone(CompositorShader.uniforms);
        this.material = new THREE.ShaderMaterial({
            defines: Object.assign({}, CompositorShader.defines),
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader,
        });

        const videoTexture = new THREE.VideoTexture(this.videoSource);
        // LinearFilter looks better?
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.encoding = THREE.sRGBEncoding;

        this.material.uniforms.tStream.value = videoTexture;
        this.material.uniforms.streamSize.value = [this.videoSource.videoWidth, this.videoSource.videoHeight];
        this.material.uniforms.cameraNear.value = this.camera.near;
        this.material.uniforms.cameraFar.value = this.camera.far;

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
        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.tDepth.value = readBuffer.depthTexture;

        renderer.setRenderTarget( writeBuffer );
        this.fsQuad.render( renderer );
    }
}
