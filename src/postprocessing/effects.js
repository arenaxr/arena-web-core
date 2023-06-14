import {EffectComposer} from './effect-composer';
import {UnrealBloomPass} from './passes/unreal-bloom-pass';

AFRAME.registerSystem('effects', {
    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        this.cameras = [];

        this.originalRenderFunc = null;

        this.composer = new EffectComposer(renderer);
        this.compositor = sceneEl.systems['compositor'];

        this.t = 0;
        this.dt = 0;

        this.binded = false;

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

    onResize: function() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;
        const camera = sceneEl.camera;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.composer.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
    },

    tick: function(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind: function() {
        const renderer = this.sceneEl.renderer;
        const render = renderer.render;
        const sceneEl = this.sceneEl;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const cameraEl = camera.el;
        const system = this;

        let isDigest = false;

        if (this.binded === true) return;

        this.binded = true;

        this.originalRenderFunc = render;

        scene.onBeforeRender = function(renderer, scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        }

        let currentXREnabled = renderer.xr.enabled;

        const sizeVector = new THREE.Vector2();
        renderer.render = function() {
            if (isDigest) {
                // render "normally"
                render.apply(this, arguments);
            } else {
                isDigest = true;

                const currentRenderTarget = this.getRenderTarget();
                if (currentRenderTarget != null) {
                    // resize if an existing rendertarget exists (usually in webxr mode)
                    system.composer.setSize(currentRenderTarget.width, currentRenderTarget.height);
                }

                // store "normal" rendering output to this.renderTarget (1)
                this.setRenderTarget(system.composer.readBuffer);
                // this.setRenderTarget(system.renderTarget);
                render.apply(this, arguments);
                this.setRenderTarget(currentRenderTarget);

                // save render state (2)
                currentXREnabled = this.xr.enabled;
                currentShadowMapEnabled = this.shadowMap.enabled;

                // disable xr
                this.xr.enabled = false;

                // update cameras for composition in RenderFusion, if needed
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

    unbind: function() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        if (this.binded === false) return;
        this.binded = false;

        renderer.render = this.originalRenderFunc;
        scene.onBeforeRender = () => {};
    },
});
