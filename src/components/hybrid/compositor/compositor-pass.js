import {Pass} from './effect-composer';
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

        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        /* this.quadCameraL = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadCameraL.layers.enable( 1 );
        this.quadCameraR = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadCameraR.layers.enable( 2 );

        this.quadCameraVR = new THREE.ArrayCamera();
        this.quadCameraVR.layers.enable( 1 );
        this.quadCameraVR.layers.enable( 2 );
        this.quadCameraVR.cameras = [ this.quadCameraL, this.quadCameraR ]; */

        this.fsQuad = new THREE.Mesh(new THREE.PlaneGeometry( 2, 2 ), this.material);
        this.quadScene = new THREE.Scene();
        this.quadScene.add(this.fsQuad);

        /* this.fsQuadL = new THREE.Mesh(new THREE.PlaneGeometry( 2, 2 ), this.material);
        this.fsQuadL.geometry.attributes.uv.array.set([0, 1, 0.5, 1, 0, 0, 0.5, 0]);
        this.quadSceneL = new THREE.Scene();
        this.quadSceneL.add(this.fsQuadL);

        this.fsQuadR = new THREE.Mesh(new THREE.PlaneGeometry( 2, 2 ), this.material);
        this.fsQuadR.geometry.attributes.uv.array.set([0.5, 1, 1, 1, 0.5, 0, 1, 0]);
        this.quadSceneR = new THREE.Scene();
        this.quadSceneR.add(this.fsQuadR); */

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));
    }

    setSize(width, height) {
        this.material.uniforms.windowSize.value = [width, height];
    }

    setHasDualCameras(hasDualCameras) {
        this.material.uniforms.hasDualCameras.value = hasDualCameras;
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

        renderer.setRenderTarget(readBuffer);
        renderer.render(this.scene, this.camera);
        renderer.setRenderTarget(null);
    }
}
