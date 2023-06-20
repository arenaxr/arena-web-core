/* eslint-disable no-param-reassign */

/* global AFRAME, THREE */

import { FullScreenQuad, Pass } from './pass';
import SimplexNoise from '../math/SimplexNoise';
import { SSAOBlurShader, SSAODepthShader, SSAOShader } from '../shaders/SSAOShader';
import CopyShader from '../shaders/CopyShader';

class SSAOPass extends Pass {
    constructor({ resolution = 512, kernelRadius = 8, minDistance = 0.005, maxDistance = 0.1 } = {}) {
        super();

        this.width = resolution;
        this.height = resolution;

        this.clear = true;

        const { camera, object3D: scene } = AFRAME.scenes[0];

        this.camera = camera;
        this.scene = scene;

        this.kernelRadius = kernelRadius;
        this.kernelSize = 32;
        this.kernel = [];
        this.noiseTexture = null;
        this.output = 0;

        this.minDistance = minDistance;
        this.maxDistance = maxDistance;

        this._visibilityCache = new Map();

        //

        this.generateSampleKernel();
        this.generateRandomKernelRotations();

        // beauty render target

        const depthTexture = new THREE.DepthTexture();
        depthTexture.format = THREE.DepthStencilFormat;
        depthTexture.type = THREE.UnsignedInt248Type;

        this.beautyRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.HalfFloatType });

        // normal render target with depth buffer

        this.normalRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType,
            depthTexture,
        });

        // ssao render target

        this.ssaoRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.HalfFloatType });

        this.blurRenderTarget = this.ssaoRenderTarget.clone();

        // ssao material

        this.ssaoMaterial = new THREE.ShaderMaterial({
            defines: { ...SSAOShader.defines },
            uniforms: THREE.UniformsUtils.clone(SSAOShader.uniforms),
            vertexShader: SSAOShader.vertexShader,
            fragmentShader: SSAOShader.fragmentShader,
            blending: THREE.NoBlending,
        });

        this.ssaoMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
        this.ssaoMaterial.uniforms.tNormal.value = this.normalRenderTarget.texture;
        this.ssaoMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture;
        this.ssaoMaterial.uniforms.tNoise.value = this.noiseTexture;
        this.ssaoMaterial.uniforms.kernel.value = this.kernel;
        this.ssaoMaterial.uniforms.cameraNear.value = this.camera.near;
        this.ssaoMaterial.uniforms.cameraFar.value = this.camera.far;
        this.ssaoMaterial.uniforms.resolution.value.set(this.width, this.height);
        this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
        this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);

        // normal material

        this.normalMaterial = new THREE.MeshNormalMaterial();
        this.normalMaterial.blending = THREE.NoBlending;

        // blur material

        this.blurMaterial = new THREE.ShaderMaterial({
            defines: { ...SSAOBlurShader.defines },
            uniforms: THREE.UniformsUtils.clone(SSAOBlurShader.uniforms),
            vertexShader: SSAOBlurShader.vertexShader,
            fragmentShader: SSAOBlurShader.fragmentShader,
        });
        this.blurMaterial.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture;
        this.blurMaterial.uniforms.resolution.value.set(this.width, this.height);

        // material for rendering the depth

        this.depthRenderMaterial = new THREE.ShaderMaterial({
            defines: { ...SSAODepthShader.defines },
            uniforms: THREE.UniformsUtils.clone(SSAODepthShader.uniforms),
            vertexShader: SSAODepthShader.vertexShader,
            fragmentShader: SSAODepthShader.fragmentShader,
            blending: THREE.NoBlending,
        });
        this.depthRenderMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture;
        this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
        this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far;

        // material for rendering the content of a render target

        this.copyMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
            vertexShader: CopyShader.vertexShader,
            fragmentShader: CopyShader.fragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blendSrc: THREE.DstColorFactor,
            blendDst: THREE.ZeroFactor,
            blendEquation: THREE.AddEquation,
            blendSrcAlpha: THREE.DstAlphaFactor,
            blendDstAlpha: THREE.ZeroFactor,
            blendEquationAlpha: THREE.AddEquation,
        });

        this.fsQuad = new FullScreenQuad(null);

        this.originalClearColor = new THREE.Color();
    }

    dispose() {
        // dispose render targets

        this.beautyRenderTarget.dispose();
        this.normalRenderTarget.dispose();
        this.ssaoRenderTarget.dispose();
        this.blurRenderTarget.dispose();

        // dispose materials

        this.normalMaterial.dispose();
        this.blurMaterial.dispose();
        this.copyMaterial.dispose();
        this.depthRenderMaterial.dispose();

        // dipsose full screen quad

        this.fsQuad.dispose();
    }

    render(renderer, writeBuffer /* , readBuffer, deltaTime, maskActive */) {
        if (renderer.capabilities.isWebGL2 === false) this.noiseTexture.format = THREE.LuminanceFormat;

        // render beauty

        renderer.setRenderTarget(this.beautyRenderTarget);
        renderer.clear();
        renderer.render(this.scene, this.camera);

        // render normals and depth (honor only meshes, points and lines do not contribute to SSAO)

        this.overrideVisibility();
        this.renderOverride(renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0);
        this.restoreVisibility();

        // render SSAO

        this.ssaoMaterial.uniforms.kernelRadius.value = this.kernelRadius;
        this.ssaoMaterial.uniforms.minDistance.value = this.minDistance;
        this.ssaoMaterial.uniforms.maxDistance.value = this.maxDistance;
        this.renderPass(renderer, this.ssaoMaterial, this.ssaoRenderTarget);

        // render blur

        this.renderPass(renderer, this.blurMaterial, this.blurRenderTarget);

        // output result to screen

        switch (this.output) {
            case SSAOPass.OUTPUT.SSAO:
                this.copyMaterial.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture;
                this.copyMaterial.blending = THREE.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case SSAOPass.OUTPUT.Blur:
                this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture;
                this.copyMaterial.blending = THREE.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case SSAOPass.OUTPUT.Beauty:
                this.copyMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
                this.copyMaterial.blending = THREE.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case SSAOPass.OUTPUT.Depth:
                this.renderPass(renderer, this.depthRenderMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case SSAOPass.OUTPUT.Normal:
                this.copyMaterial.uniforms.tDiffuse.value = this.normalRenderTarget.texture;
                this.copyMaterial.blending = THREE.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case SSAOPass.OUTPUT.Default:
                this.copyMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
                this.copyMaterial.blending = THREE.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture;
                this.copyMaterial.blending = THREE.CustomBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            default:
                console.warn('SSAOPass: Unknown output type.');
        }
    }

    renderPass(renderer, passMaterial, renderTarget, clearColor, clearAlpha) {
        // save original state
        renderer.getClearColor(this.originalClearColor);
        const originalClearAlpha = renderer.getClearAlpha();
        const originalAutoClear = renderer.autoClear;

        renderer.setRenderTarget(renderTarget);

        // setup pass state
        renderer.autoClear = false;
        if (clearColor !== undefined && clearColor !== null) {
            renderer.setClearColor(clearColor);
            renderer.setClearAlpha(clearAlpha || 0.0);
            renderer.clear();
        }

        this.fsQuad.material = passMaterial;
        this.fsQuad.render(renderer);

        // restore original state
        renderer.autoClear = originalAutoClear;
        renderer.setClearColor(this.originalClearColor);
        renderer.setClearAlpha(originalClearAlpha);
    }

    renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {
        renderer.getClearColor(this.originalClearColor);
        const originalClearAlpha = renderer.getClearAlpha();
        const originalAutoClear = renderer.autoClear;

        renderer.setRenderTarget(renderTarget);
        renderer.autoClear = false;

        clearColor = overrideMaterial.clearColor || clearColor;
        clearAlpha = overrideMaterial.clearAlpha || clearAlpha;

        if (clearColor !== undefined && clearColor !== null) {
            renderer.setClearColor(clearColor);
            renderer.setClearAlpha(clearAlpha || 0.0);
            renderer.clear();
        }

        this.scene.overrideMaterial = overrideMaterial;
        renderer.render(this.scene, this.camera);
        this.scene.overrideMaterial = null;

        // restore original state

        renderer.autoClear = originalAutoClear;
        renderer.setClearColor(this.originalClearColor);
        renderer.setClearAlpha(originalClearAlpha);
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;

        this.beautyRenderTarget.setSize(width, height);
        this.ssaoRenderTarget.setSize(width, height);
        this.normalRenderTarget.setSize(width, height);
        this.blurRenderTarget.setSize(width, height);

        this.ssaoMaterial.uniforms.resolution.value.set(width, height);
        this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
        this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);

        this.blurMaterial.uniforms.resolution.value.set(width, height);
    }

    generateSampleKernel() {
        const { kernelSize } = this;
        const { kernel } = this;

        for (let i = 0; i < kernelSize; i++) {
            const sample = new THREE.Vector3();
            sample.x = Math.random() * 2 - 1;
            sample.y = Math.random() * 2 - 1;
            sample.z = Math.random();

            sample.normalize();

            let scale = i / kernelSize;
            scale = THREE.MathUtils.lerp(0.1, 1, scale * scale);
            sample.multiplyScalar(scale);

            kernel.push(sample);
        }
    }

    generateRandomKernelRotations() {
        const width = 4;
        const height = 4;

        const simplex = new SimplexNoise();

        const size = width * height;
        const data = new Float32Array(size);

        for (let i = 0; i < size; i++) {
            const x = Math.random() * 2 - 1;
            const y = Math.random() * 2 - 1;
            const z = 0;

            data[i] = simplex.noise3d(x, y, z);
        }

        this.noiseTexture = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.FloatType);
        this.noiseTexture.wrapS = THREE.RepeatWrapping;
        this.noiseTexture.wrapT = THREE.RepeatWrapping;
        this.noiseTexture.needsUpdate = true;
    }

    overrideVisibility() {
        const { scene } = this;
        const cache = this._visibilityCache;

        scene.traverse((object) => {
            cache.set(object, object.visible);

            if (object.isPoints || object.isLine) object.visible = false;
        });
    }

    restoreVisibility() {
        const { scene } = this;
        const cache = this._visibilityCache;

        scene.traverse((object) => {
            object.visible = cache.get(object);
        });

        cache.clear();
    }
}

SSAOPass.OUTPUT = {
    Default: 0,
    SSAO: 1,
    Blur: 2,
    Beauty: 3,
    Depth: 4,
    Normal: 5,
};

export default SSAOPass;
