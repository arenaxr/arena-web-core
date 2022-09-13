import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/EffectComposer';
import { CompositorShader } from './CompositorShader';

export class CompositorPass extends Pass {
    constructor( videoSource, depthTarget, cameraNear, cameraFar ) {
        super();

        this.videoSource = videoSource;

        this.uniforms = THREE.UniformsUtils.clone( CompositorShader.uniforms );
        this.material = new THREE.ShaderMaterial( {
            defines: Object.assign( {}, CompositorShader.defines ),
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader
        } );

        this.material.uniforms.tStream.value = new THREE.VideoTexture( this.videoSource );
        this.material.uniforms.tDepth.value = depthTarget.depthTexture;
        this.material.uniforms.streamSize.value = [this.videoSource.videoWidth, this.videoSource.videoHeight];
        this.material.uniforms.cameraNear.value = cameraNear;
        this.material.uniforms.cameraFar.value = cameraFar;

		this.needsSwap = false;

        this.fsQuad = new FullScreenQuad( this.material );
    }

    setSize( width, height ) {
        this.material.uniforms.diffuseSize.value = [width, height];
    }

    render( renderer, writeBuffer, readBuffer
        /*, deltaTime, maskActive */
    ) {
        this.material.uniforms.tDiffuse.value = readBuffer.texture;

        if ( this.renderToScreen ) {

            renderer.setRenderTarget( null );
            this.fsQuad.render( renderer );

        } else {

            renderer.setRenderTarget( writeBuffer ); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

            if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
            this.fsQuad.render( renderer );

        }
    }
}
