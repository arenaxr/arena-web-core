/* global AFRAME, THREE */

import EffectComposer from './effect-composer';
import UnrealBloomPass from './passes/unreal-bloom-pass';

AFRAME.registerSystem('effects', {
    init() {
        const { sceneEl } = this;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const { renderer } = sceneEl;

        this.cameras = [];

        this.originalRenderFunc = null;

        this.composer = new EffectComposer(renderer);
        this.compositor = sceneEl.systems.compositor;

        this.t = 0;
        this.dt = 0;

        this.binded = false;

        // this.addPass(new UnrealBloomPass());

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionstart', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionend', this.onResize.bind(this));
    },

    addPass(pass) {
        this.composer.addPass(pass);
        this.bind();
    },

    insertPass(pass, index) {
        this.composer.insertPass(pass, index);
        this.bind();
    },

    onResize() {
        const { sceneEl } = this;
        const { renderer } = sceneEl;

        const rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.composer.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
    },

    tick(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind() {
        const { renderer } = this.sceneEl;
        const { render } = renderer;
        const { sceneEl } = this;

        const scene = sceneEl.object3D;

        const system = this;

        let isDigest = false;

        if (this.binded === true) return;

        this.binded = true;

        this.originalRenderFunc = render;

        scene.onBeforeRender = function onBeforeRender(_renderer, _scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        };

        let currentXREnabled = renderer.xr.enabled;

        renderer.render = function renderFunc(...args) {
            if (isDigest) {
                // render "normally"
                render.apply(this, args);
            } else {
                isDigest = true;

                const currentRenderTarget = this.getRenderTarget();
                if (currentRenderTarget != null) {
                    // resize if an existing rendertarget exists (usually in webxr mode)
                    system.composer.setSize(currentRenderTarget.width, currentRenderTarget.height);
                }

                // store "normal" rendering output to this.renderTarget (1)
                this.setRenderTarget(system.composer.readBuffer);
                render.apply(this, args);
                this.setRenderTarget(currentRenderTarget);

                // save render state (2)
                currentXREnabled = this.xr.enabled;
                // const currentShadowMapEnabled = this.shadowMap.enabled;

                // disable xr
                this.xr.enabled = false;

                // update cameras for composition, if needed
                system.compositor.updateRenderingState();

                // (3) render with custom post-processing shaders:
                // this will internally call renderer.render(), which will execute the code within
                // the isDigest conditional above (render normally). this will copy the result of
                // the rendering to the readBuffer in the compositor
                system.composer.render(system.dt);

                // (4) restore render state
                this.setRenderTarget(currentRenderTarget);
                this.xr.enabled = currentXREnabled;

                // call this part of the conditional again on the next call to render()
                isDigest = false;

                system.cameras = [];
            }
        };
    },

    unbind() {
        const { sceneEl } = this;
        const { renderer } = sceneEl;

        const scene = sceneEl.object3D;

        if (this.binded === false) return;
        this.binded = false;

        renderer.render = this.originalRenderFunc;
        scene.onBeforeRender = () => {};
    },
});
