/* global THREE */

import { FullScreenQuad, Pass } from './pass';
import DigitalGlitch from '../shaders/DigitalGlitch';

class GlitchPass extends Pass {
    constructor(dtSize = 64) {
        super();

        const shader = DigitalGlitch;

        this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        this.heightMap = this.generateHeightmap(dtSize);

        this.uniforms.tDisp.value = this.heightMap;

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
        });

        this.fsQuad = new FullScreenQuad(this.material);

        this.goWild = false;
        this.curF = 0;
        this.generateTrigger();
    }

    render(renderer, writeBuffer, readBuffer, currentRenderTarget /* , deltaTime, maskActive */) {
        if (renderer.capabilities.isWebGL2 === false) this.uniforms.tDisp.value.format = THREE.LuminanceFormat;

        this.uniforms.tDiffuse.value = readBuffer.texture;
        this.uniforms.seed.value = Math.random(); // default seeding
        this.uniforms.byp.value = 0;

        if (this.curF % this.randX === 0 || this.goWild === true) {
            this.uniforms.amount.value = Math.random() / 30;
            this.uniforms.angle.value = THREE.MathUtils.randFloat(-Math.PI, Math.PI);
            this.uniforms.seed_x.value = THREE.MathUtils.randFloat(-1, 1);
            this.uniforms.seed_y.value = THREE.MathUtils.randFloat(-1, 1);
            this.uniforms.distortion_x.value = THREE.MathUtils.randFloat(0, 1);
            this.uniforms.distortion_y.value = THREE.MathUtils.randFloat(0, 1);
            this.curF = 0;
            this.generateTrigger();
        } else if (this.curF % this.randX < this.randX / 5) {
            this.uniforms.amount.value = Math.random() / 90;
            this.uniforms.angle.value = THREE.MathUtils.randFloat(-Math.PI, Math.PI);
            this.uniforms.distortion_x.value = THREE.MathUtils.randFloat(0, 1);
            this.uniforms.distortion_y.value = THREE.MathUtils.randFloat(0, 1);
            this.uniforms.seed_x.value = THREE.MathUtils.randFloat(-0.3, 0.3);
            this.uniforms.seed_y.value = THREE.MathUtils.randFloat(-0.3, 0.3);
        } else if (this.goWild === false) {
            this.uniforms.byp.value = 1;
        }

        this.curF++;

        if (this.renderToScreen) {
            renderer.setRenderTarget(currentRenderTarget);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear();
            this.fsQuad.render(renderer);
        }
    }

    generateTrigger() {
        this.randX = THREE.MathUtils.randInt(120, 240);
    }

    generateHeightmap(dtSize) {
        const dataArr = new Float32Array(dtSize * dtSize);
        const length = dtSize * dtSize;

        for (let i = 0; i < length; i++) {
            dataArr[i] = THREE.MathUtils.randFloat(0, 1);
        }

        const texture = new THREE.DataTexture(dataArr, dtSize, dtSize, THREE.RedFormat, THREE.FloatType);
        texture.needsUpdate = true;
        return texture;
    }

    dispose() {
        this.material.dispose();

        this.heightMap.dispose();

        this.fsQuad.dispose();
    }
}

export default GlitchPass;
