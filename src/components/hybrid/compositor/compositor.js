import {EffectComposer} from './effect-composer';
import {CompositorPass} from './compositor-pass';

AFRAME.registerSystem('compositor', {
    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.renderFunc = null;

        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.target.texture.name = 'EffectComposer.rt1';
        this.target.texture.minFilter = THREE.NearestFilter;
        this.target.texture.magFilter = THREE.NearestFilter;
        this.target.stencilBuffer = false;
        this.target.depthTexture = new THREE.DepthTexture();
        this.target.depthTexture.format = THREE.DepthFormat;
        this.target.depthTexture.type = THREE.UnsignedShortType;

        window.addEventListener('hybrid-onremotetrack', this.onRemoteTrack.bind(this));
    },

    onRemoteTrack(e) {
        this.remoteVideo = document.getElementById('remoteVideo');
        if (!this.remoteVideo) {
            this.remoteVideo = document.createElement('video');
            this.remoteVideo.id = 'remoteVideo';
            this.remoteVideo.setAttribute('muted', 'false');
            this.remoteVideo.setAttribute('autoplay', 'true');
            this.remoteVideo.setAttribute('playsinline', 'true');
            this.remoteVideo.addEventListener('loadedmetadata', this.onRemoteVideoLoaded.bind(this), true);

            this.remoteVideo.style.position = 'absolute';
            this.remoteVideo.style.zIndex = '9999';
            this.remoteVideo.style.top = '15px';
            this.remoteVideo.style.left = '15px';
            this.remoteVideo.style.width = '640px';
            this.remoteVideo.style.height = '180px';
            if (!AFRAME.utils.device.isMobile()) {
                document.body.appendChild(this.remoteVideo);
            }
        }
        this.remoteVideo.srcObject = e.detail.stream;
    },

    onRemoteVideoLoaded() {
        // console.log('[render-client], remote video loaded!');
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.composer = new EffectComposer(renderer, this.target);
        this.pass = new CompositorPass(scene, camera, this.remoteVideo);
        this.composer.addPass(this.pass);

        this.t = 0;
        this.dt = 0;

        this.onWindowResize();
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.remoteVideo.play();

        const sizeVector = new THREE.Vector2();
        const size = renderer.getSize(sizeVector);
        this.composer.setSize(2*size.width, 2*size.height);
        this.target.setSize(2*size.width, 2*size.height);

        this.bind();
    },

    onWindowResize() {
        // const sceneEl = this.sceneEl;
        // const renderer = sceneEl.renderer;

        this.pass.setSize(window.innerWidth, window.innerHeight);
    },

    tick: function(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind: function() {
        const renderer = this.sceneEl.renderer;
        const render = renderer.render;
        const system = this;
        let isDigest = false;

        this.renderFunc = render;

        renderer.render = function() {
            if (isDigest) {
                // render normally
                render.apply(this, arguments);
            } else {
                // render to target (writeBuffer)
                renderer.setRenderTarget(system.target);
                render.apply(this, arguments);
                renderer.setRenderTarget(null);

                // render with composer
                isDigest = true;
                system.composer.render(system.dt);
                isDigest = false;
            }
        };
    },

    unbind: function() {
        const renderer = this.sceneEl.renderer;
        renderer.render = this.renderFunc;
    },
});
