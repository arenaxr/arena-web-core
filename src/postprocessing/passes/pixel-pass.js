/* global AFRAME, THREE */

import { Pass, FullScreenQuad } from './pass';

class RenderPixelatedPass extends Pass {
    constructor({ pixelSize = 6, normalEdgeStrength = 0.3, depthEdgeStrength = 0.4 } = {}) {
        super();

        this.pixelSize = pixelSize;
        this.resolution = new THREE.Vector2();
        this.renderResolution = new THREE.Vector2();

        this.pixelatedMaterial = this.createPixelatedMaterial();
        this.normalMaterial = new THREE.MeshNormalMaterial();

        this.fsQuad = new FullScreenQuad(this.pixelatedMaterial);

        const {
            camera,
            object3D: scene,
            renderer: { outputColorSpace },
        } = AFRAME.scenes[0];
        this.scene = scene;
        this.camera = camera;

        this.isSRGB = outputColorSpace === THREE.SRGBColorSpace;
        this.fsQuad.material.uniforms.isSRGB.value = this.isSRGB;

        this.normalEdgeStrength = normalEdgeStrength;
        this.depthEdgeStrength = depthEdgeStrength;

        this.beautyRenderTarget = new THREE.WebGLRenderTarget();
        this.beautyRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.beautyRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.beautyRenderTarget.texture.type = THREE.HalfFloatType;
        this.beautyRenderTarget.depthTexture = new THREE.DepthTexture();

        this.normalRenderTarget = new THREE.WebGLRenderTarget();
        this.normalRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.normalRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.normalRenderTarget.texture.type = THREE.HalfFloatType;
    }

    dispose() {
        this.beautyRenderTarget.dispose();
        this.normalRenderTarget.dispose();

        this.pixelatedMaterial.dispose();
        this.normalMaterial.dispose();

        this.fsQuad.dispose();
    }

    setSize(width, height) {
        this.resolution.set(width, height);
        this.renderResolution.set((width / this.pixelSize) | 0, (height / this.pixelSize) | 0);
        const { x, y } = this.renderResolution;
        this.beautyRenderTarget.setSize(x, y);
        this.normalRenderTarget.setSize(x, y);
        this.fsQuad.material.uniforms.resolution.value.set(x, y, 1 / x, 1 / y);
    }

    setPixelSize(pixelSize) {
        this.pixelSize = pixelSize;
        this.setSize(this.resolution.x, this.resolution.y);
    }

    render(renderer, writeBuffer, readBuffer, currentRenderTarget /* , deltaTime, maskActive */) {
        const { uniforms } = this.fsQuad.material;
        uniforms.normalEdgeStrength.value = this.normalEdgeStrength;
        uniforms.depthEdgeStrength.value = this.depthEdgeStrength;

        renderer.setRenderTarget(this.beautyRenderTarget);
        renderer.render(this.scene, this.camera);

        const overrideMaterialOld = this.scene.overrideMaterial;
        renderer.setRenderTarget(this.normalRenderTarget);
        this.scene.overrideMaterial = this.normalMaterial;
        renderer.render(this.scene, this.camera);
        this.scene.overrideMaterial = overrideMaterialOld;

        uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
        uniforms.tDepth.value = this.beautyRenderTarget.depthTexture;
        uniforms.tNormal.value = this.normalRenderTarget.texture;

        if (this.renderToScreen) {
            renderer.setRenderTarget(currentRenderTarget);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear();
            this.fsQuad.render(renderer);
        }
    }

    createPixelatedMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                tNormal: { value: null },
                resolution: {
                    value: new THREE.Vector4(
                        this.renderResolution.x,
                        this.renderResolution.y,
                        1 / this.renderResolution.x,
                        1 / this.renderResolution.y
                    ),
                },
                normalEdgeStrength: { value: 0 },
                depthEdgeStrength: { value: 0 },
                isSRGB: { value: true },
            },
            vertexShader: /* glsl */ `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,
            fragmentShader: /* glsl */ `
			uniform sampler2D tDiffuse;
			uniform sampler2D tDepth;
			uniform sampler2D tNormal;
			uniform vec4 resolution;
			uniform float normalEdgeStrength;
			uniform float depthEdgeStrength;
			uniform bool isSRGB;
			varying vec2 vUv;
			float getDepth(int x, int y) {
				return texture2D( tDepth, vUv + vec2(x, y) * resolution.zw ).r;
			}
			vec3 getNormal(int x, int y) {
				return texture2D( tNormal, vUv + vec2(x, y) * resolution.zw ).rgb * 2.0 - 1.0;
			}
			float depthEdgeIndicator(float depth, vec3 normal) {
				float diff = 0.0;
				diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);
				diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);
				diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);
				diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);
				return floor(smoothstep(0.01, 0.02, diff) * 2.) / 2.;
			}
			float neighborNormalEdgeIndicator(int x, int y, float depth, vec3 normal) {
				float depthDiff = getDepth(x, y) - depth;
				vec3 neighborNormal = getNormal(x, y);
				// Edge pixels should yield to faces who's normals are closer to the bias normal.
				vec3 normalEdgeBias = vec3(1., 1., 1.); // This should probably be a parameter.
				float normalDiff = dot(normal - neighborNormal, normalEdgeBias);
				float normalIndicator = clamp(smoothstep(-.01, .01, normalDiff), 0.0, 1.0);
				// Only the shallower pixel should detect the normal edge.
				float depthIndicator = clamp(sign(depthDiff * .25 + .0025), 0.0, 1.0);
				return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
			}
			float normalEdgeIndicator(float depth, vec3 normal) {
				float indicator = 0.0;
				indicator += neighborNormalEdgeIndicator(0, -1, depth, normal);
				indicator += neighborNormalEdgeIndicator(0, 1, depth, normal);
				indicator += neighborNormalEdgeIndicator(-1, 0, depth, normal);
				indicator += neighborNormalEdgeIndicator(1, 0, depth, normal);
				return step(0.1, indicator);
			}
			void main() {
				vec4 texel = texture2D( tDiffuse, vUv );
				float depth = 0.0;
				vec3 normal = vec3(0.0);
				if (depthEdgeStrength > 0.0 || normalEdgeStrength > 0.0) {
					depth = getDepth(0, 0);
					normal = getNormal(0, 0);
				}
				float dei = 0.0;
				if (depthEdgeStrength > 0.0)
					dei = depthEdgeIndicator(depth, normal);
				float nei = 0.0;
				if (normalEdgeStrength > 0.0)
					nei = normalEdgeIndicator(depth, normal);
				float Strength = dei > 0.0 ? (1.0 - depthEdgeStrength * dei) : (1.0 + normalEdgeStrength * nei);
				gl_FragColor = texel * Strength;
				if (isSRGB) {
				    gl_FragColor = LinearTosRGB(gl_FragColor);
	            }		    
			}`,
        });
    }
}

export default RenderPixelatedPass;
