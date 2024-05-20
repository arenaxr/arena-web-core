/* eslint-disable no-param-reassign */

/* global THREE */

// import CopyShader from './shaders/CopyShader';
// import ShaderPass from './passes/shader-pass';

// https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/EffectComposer.js
export default class EffectComposer {
    constructor(renderer, renderTarget) {
        this.renderer = renderer;

        if (renderTarget === undefined) {
            const size = renderer.getSize(new THREE.Vector2());
            this._width = size.width;
            this._height = size.height;

            renderTarget = new THREE.WebGLRenderTarget(1, 1);
            renderTarget.texture.name = 'EffectComposer.rt1';
            renderTarget.depthTexture = new THREE.DepthTexture();
            renderTarget.depthTexture.format = THREE.DepthFormat;
            renderTarget.depthTexture.type = THREE.UnsignedShortType;
        } else {
            this._width = renderTarget.width;
            this._height = renderTarget.height;
        }

        this.renderTarget1 = renderTarget;
        this.renderTarget2 = renderTarget.clone();
        this.renderTarget2.texture.name = 'EffectComposer.rt2';
        this.renderTarget2.depthTexture = new THREE.DepthTexture();
        this.renderTarget2.depthTexture.format = THREE.DepthFormat;
        this.renderTarget2.depthTexture.type = THREE.UnsignedShortType;

        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;

        this.renderToScreen = true;

        this.passes = [];

        // this.copyPass = new ShaderPass( CopyShader );

        this.clock = new THREE.Clock();
    }

    swapBuffers() {
        const tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;
    }

    addPass(pass) {
        this.passes.push(pass);
        pass.setSize(this._width, this._height);
    }

    insertPass(pass, index) {
        if (this.passes.indexOf(pass) !== -1) {
            return; // Pass already exists, remove it first before inserting it again.
        }
        this.passes.splice(index, 0, pass);
        pass.setSize(this._width, this._height);
    }

    removePass(pass) {
        const index = this.passes.indexOf(pass);

        if (index !== -1) {
            this.passes.splice(index, 1);
        }
    }

    isLastEnabledPass(passIndex) {
        for (let i = passIndex + 1; i < this.passes.length; i++) {
            if (this.passes[i].enabled) {
                return false;
            }
        }

        return true;
    }

    render(deltaTime) {
        // deltaTime value is in seconds

        if (deltaTime === undefined) {
            deltaTime = this.clock.getDelta();
        }

        const currentRenderTarget = this.renderer.getRenderTarget();

        const maskActive = false;

        for (let i = 0, il = this.passes.length; i < il; i++) {
            const pass = this.passes[i];

            if (pass.enabled) {
                pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
                pass.render(
                    this.renderer,
                    this.writeBuffer,
                    this.readBuffer,
                    currentRenderTarget,
                    deltaTime,
                    maskActive
                );

                if (pass.needsSwap) {
                    this.swapBuffers();
                }

                // if ( MaskPass !== undefined ) {

                // 	if ( pass instanceof MaskPass ) {

                // 		maskActive = true;

                // 	} else if ( pass instanceof ClearMaskPass ) {

                // 		maskActive = false;

                // 	}

                // }
            }
        }

        this.renderer.setRenderTarget(currentRenderTarget);
    }

    reset(renderTarget) {
        if (renderTarget === undefined) {
            const rendererSize = new THREE.Vector2();
            const size = this.renderer.getSize(rendererSize);

            const pixelRatio = this.renderer.getPixelRatio();
            this._width = size.width;
            this._height = size.height;

            renderTarget = this.renderTarget1.clone();
            renderTarget.setSize(pixelRatio * this._width, pixelRatio * this._height);
        }

        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        this.renderTarget1 = renderTarget;
        this.renderTarget2 = renderTarget.clone();

        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;
    }

    setSize(width, height) {
        this._width = width;
        this._height = height;

        const effectiveWidth = this._width;
        const effectiveHeight = this._height;

        this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
        this.renderTarget2.setSize(effectiveWidth, effectiveHeight);

        for (let i = 0; i < this.passes.length; i++) {
            this.passes[i].setSize(effectiveWidth, effectiveHeight);
        }
    }

    dispose() {
        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
    }
}
