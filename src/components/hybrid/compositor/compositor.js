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

        this.originalRenderFunc = null;

        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.renderTarget.texture.name = 'EffectComposer.rt1';
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.UnsignedShortType;

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

        this.composer = new EffectComposer(renderer, this.renderTarget);
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
        this.renderTarget.setSize(pixelRatio * size.width, pixelRatio * size.height);

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

        this.originalRenderFunc = render;

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
        }

        const cameraLPos = new THREE.Vector3();
        const cameraRPos = new THREE.Vector3();
        const sizeVector = new THREE.Vector2();
        renderer.render = function() {
            const size = renderer.getSize(sizeVector);
            if (isDigest) {
                this.xr.enabled = currentXREnabled;
                // render "normally"
                render.apply(this, arguments);
            } else {
                isDigest = true;

                // this will internally call renderer.render(), which will execute the code within
                // the isDigest conditional above (render normally). this will copy the result of
                // the rendering to the readbuffer in the composer (aka this.renderTarget), which we
                // will use for the "local" frame.
                // the composer will take the "local" frame and merge it with the "remote" frame from
                // the video by calling the compositor pass and executing the shaders.
                // we will call render() (but not renderer.render()) AGAIN below, which will not execute
                // the code above.
                system.composer.render(system.dt);

                if (system.cameras.length > 1) {
                    // we have two cameras here (vr mode or headset ar mode)
                    system.pass.setHasDualCameras(true);

                    const cameraL = system.cameras[0];
                    const cameraR = system.cameras[1];
                    cameraLPos.setFromMatrixPosition( cameraL.matrixWorld );
                    cameraRPos.setFromMatrixPosition( cameraR.matrixWorld );
                    const ipd = cameraLPos.distanceTo( cameraRPos );
                    // console.log(ipd);

                    /* const myCameraVR = system.pass.quadCameraVR;
                    const myCameraL = system.cameras[0];
                    const myCameraR = system.cameras[1];
                    myCameraL.copy( cameraL );
                    myCameraR.copy( cameraR );
                    myCameraL.viewport = cameraL.viewport;
                    myCameraR.viewport = cameraR.viewport; */
                    // render.call(this, system.pass.quadScene, myCameraVR);

                    currentXREnabled = this.xr.enabled;
                    if (this.xr.enabled === true) {
                        this.xr.enabled = false;
                    }
                    render.call(this, system.pass.quadScene, system.pass.quadCamera);
                    this.xr.enabled = currentXREnabled;

                    // render.apply(this, arguments);
                    // setView(0, 0, Math.round(size.width * 0.5), size.height);
                    // render.call(this, system.pass.quadSceneL, system.pass.quadCamera);
                    // setView(Math.round(size.width * 0.5), 0, Math.round(size.width * 0.5), size.height);
                    // render.call(this, system.pass.quadSceneR, system.pass.quadCamera);
                    // setView(0, 0, size.width, size.height);
                } else {
                    // we just have a single camera here
                    system.pass.setHasDualCameras(false);

                    // setView(0, 0, size.width, size.height);
                    currentXREnabled = this.xr.enabled;
                    if (this.xr.enabled === true) {
                        this.xr.enabled = false;
                    }
                    render.call(this, system.pass.quadScene, system.pass.quadCamera);
                    this.xr.enabled = currentXREnabled;
                }

                // call this part of the conditional again on the next call to render()
                isDigest = false;

                system.cameras = [];
            }
        };
    },

    unbind: function() {
        const renderer = this.sceneEl.renderer;
        renderer.render = this.originalRenderFunc;
        this.sceneEl.object3D.onBeforeRender = null;
    },
});
