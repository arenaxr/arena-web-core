import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { CompositorPass } from './CompositorPass';

AFRAME.registerSystem('compositor', {
    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.target.texture.minFilter = THREE.NearestFilter;
        this.target.texture.magFilter = THREE.NearestFilter;
        this.target.stencilBuffer = false;
        this.target.depthTexture = new THREE.DepthTexture();
        this.target.depthTexture.format = THREE.DepthFormat;
        this.target.depthTexture.type = THREE.UnsignedShortType;

        window.addEventListener('onremotetrack', this.onRemoteTrack.bind(this));
    },

    onRemoteTrack(e) {
        this.remoteVideo = document.createElement('video');
        this.remoteVideo.id = 'remoteVideo';
        this.remoteVideo.setAttribute('muted', 'false');
        this.remoteVideo.setAttribute('autoplay', 'true');
        this.remoteVideo.setAttribute('playsinline', 'true');
        this.remoteVideo.srcObject = e.detail.track;
        this.remoteVideo.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this), true);

        this.remoteVideo.style.position = 'absolute';
        this.remoteVideo.style.zIndex = '9999';
        this.remoteVideo.style.top = '15px';
        this.remoteVideo.style.left = '15px';
        this.remoteVideo.style.width = '640px';
        this.remoteVideo.style.height = '180px';
        document.body.appendChild(this.remoteVideo);
    },

    onVideoLoaded() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.composer = new EffectComposer(renderer);
        this.pass1 = new RenderPass(scene, camera);
        this.pass2 = new CompositorPass(this.remoteVideo, this.target, camera.near, camera.far);

        this.pass2.renderToScreen = true;

        this.composer.addPass(this.pass1);
        this.composer.addPass(this.pass2);

        this.t = 0;
        this.dt = 0;

        this.onWindowResize();
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.remoteVideo.play();

        this.bind();
    },

    onWindowResize() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        // const dpr = renderer.getPixelRatio();
        renderer.setSize(window.innerWidth, window.innerHeight);
		this.target.setSize(window.innerWidth, window.innerHeight);
        this.pass2.setSize(window.innerWidth, window.innerHeight);
    },

    tick: function (t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind: function () {
        const renderer = this.sceneEl.renderer;
        const render = renderer.render;
        const system = this;
        let isDigest = false;

        renderer.render = function () {
            if (isDigest) {
                // render normally
                render.apply(this, arguments);
            } else {
                // render to target to get depth
                renderer.setRenderTarget(system.target);
                render.apply(this, arguments);
                renderer.setRenderTarget(null);

                // render with composer
                isDigest = true;
                system.composer.render(system.dt);
                isDigest = false;
            }
        };
    }
});
