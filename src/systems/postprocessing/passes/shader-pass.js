import { Pass, FullScreenQuad } from './pass';

class ShaderPass extends Pass {
    constructor(shader, textureID) {
        super();

        this.textureID = textureID !== undefined ? textureID : 'tDiffuse';

        if (shader instanceof THREE.ShaderMaterial) {
            this.uniforms = shader.uniforms;

            this.material = shader;
        } else if (shader) {
            this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

            this.material = new THREE.ShaderMaterial({
                name: shader.name !== undefined ? shader.name : 'unspecified',
                defines: { ...shader.defines },
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader,
            });
        }

        this.fsQuad = new FullScreenQuad(this.material);
    }

    render(renderer, writeBuffer, readBuffer, currentRenderTarget /* , deltaTime, maskActive */) {
        if (this.uniforms[this.textureID]) {
            this.uniforms[this.textureID].value = readBuffer.texture;
        }

        this.fsQuad.material = this.material;

        if (this.renderToScreen) {
            renderer.setRenderTarget(currentRenderTarget);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
            if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
            this.fsQuad.render(renderer);
        }
    }

    dispose() {
        this.material.dispose();

        this.fsQuad.dispose();
    }
}

export default ShaderPass;
