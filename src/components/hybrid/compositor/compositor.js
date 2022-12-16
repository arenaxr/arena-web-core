import {EffectComposer} from './effect-composer';
import {CompositorPass} from './compositor-pass';

AFRAME.registerSystem('compositor', {
    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.cameras = [];

        this.renderFunc = null;

        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.target.texture.name = 'EffectComposer.rt1';
        this.target.texture.minFilter = THREE.NearestFilter;
        this.target.texture.magFilter = THREE.NearestFilter;
        this.target.stencilBuffer = false;
        this.target.format = THREE.RGBAFormat;
        this.target.depthTexture = new THREE.DepthTexture();
        // this.target.depthTexture.format = THREE.RGBAFormat;
        this.target.depthTexture.type = THREE.FloatType;

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
        const pixelRatio = renderer.getPixelRatio();
        this.composer.setSize(pixelRatio * size.width, pixelRatio * size.height);
        this.target.setSize(pixelRatio * size.width, pixelRatio * size.height);

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

        let currentXREnabled = renderer.xr.enabled;

        function setView(x, y, w, h) {
            renderer.setViewport(x, y, w, h);
            renderer.setScissor(x, y, w, h);
        }

        this.sceneEl.object3D.onBeforeRender = function(renderer, scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        };

        const sizeVector = new THREE.Vector2();
        renderer.render = function() {
            const size = renderer.getSize(sizeVector);
            if (isDigest) {
                // render normally
                this.xr.enabled = currentXREnabled;
                render.apply(this, arguments);
            } else {
                // render with composer
                isDigest = true;

                system.composer.render(system.dt);

                currentXREnabled = this.xr.enabled;
                if (this.xr.enabled === true) {
                    this.xr.enabled = false;
                }

                if (system.cameras.length > 1) {
                    render.call(this, system.pass.quadScene, system.pass.quadCamera);
                    // setView(0, 0, Math.round(size.width * 0.5), size.height);
                    // render.call(this, system.pass.quadSceneL, system.pass.quadCamera);
                    // setView(Math.round(size.width * 0.5), 0, Math.round(size.width * 0.5), size.height);
                    // render.call(this, system.pass.quadSceneR, system.pass.quadCamera);
                    setView(0, 0, size.width, size.height);
                } else {
                    setView(0, 0, size.width, size.height);
                    render.call(this, system.pass.quadScene, system.pass.quadCamera);
                }

                this.xr.enabled = currentXREnabled;

                isDigest = false;

                system.cameras = [];
            }
        };
    },

    unbind: function() {
        const renderer = this.sceneEl.renderer;
        renderer.render = this.renderFunc;
    },
});
