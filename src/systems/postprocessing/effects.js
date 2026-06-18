import EffectComposer from './effect-composer';

AFRAME.registerSystem('effects', {
    init() {
        const {
            sceneEl,
            sceneEl: { renderer },
        } = this;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.availableEffects = {};
        this.arenaEffects = {};
        this.effectsLoaded = false;

        this.cameras = [];

        this.originalRenderFunc = null;

        this.composer = new EffectComposer(renderer);
        this.compositor = sceneEl.systems.compositor;

        this.t = 0;
        this.dt = 0;

        this.binded = false;

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionstart', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionend', this.onResize.bind(this));
    },

    async loadEffects() {
        if (this.effectsLoaded) return;
        const { default: effects } = await import('./effect-passes');
        this.availableEffects = effects;
        this.arenaEffects = Object.fromEntries(Object.keys(effects).map((key) => [key, null]));
        this.effectsLoaded = true;
    },

    addPass(passName, opts) {
        const { arenaEffects, availableEffects, composer } = this;
        if (!(passName in availableEffects)) {
            console.error(`Pass ${passName} does not exist`);
            return;
        }
        if (arenaEffects[passName] === null) {
            arenaEffects[passName] = new availableEffects[passName](opts);
            composer.addPass(arenaEffects[passName]);
        } else {
            console.warn(`Pass ${passName} already enabled`);
        }
        this.bindRenderer();
    },

    /**
     * Remove a pass from the composer.
     * @param passName name of pass to remove
     */
    removePass(passName) {
        if (this.arenaEffects[passName] !== null) {
            this.composer.removePass(this.arenaEffects[passName]);
            this.arenaEffects[passName] = null;
        } else {
            console.warn(`Pass ${passName} already disabled`);
        }
    },

    /**
     * Insert an already-instantiated pass into the composer. If the pass is already present in the
     * effect system's internal mapping, no action is taken.
     * @param {Pass} pass to insert
     * @param {Number} index array index to insert at
     */
    insertPass(pass, index) {
        if (Object.values(this.arenaEffects).includes(pass)) {
            console.warn(`Pass already exists`);
            return;
        }
        this.composer.insertPass(pass, index);
        this.bindRenderer();
    },

    onResize() {
        const {
            sceneEl: { renderer },
        } = this;

        const rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.composer.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
    },

    tick(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bindRenderer() {
        if (this.binded === true) return;

        const {
            sceneEl: {
                object3D: scene,
                renderer,
                renderer: { render },
            },
        } = this;

        const system = this;

        let isDigest = false;

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

    unbindRenderer() {
        const {
            sceneEl: { renderer, object3D: scene },
        } = this;

        if (this.binded === false) return;
        this.binded = false;

        renderer.render = this.originalRenderFunc;
        scene.onBeforeRender = () => {};
    },
});
