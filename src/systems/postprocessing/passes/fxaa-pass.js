import ShaderPass from './shader-pass';
import FXAAShader from '../shaders/FXAAShader';

class FXAAPass extends ShaderPass {
    constructor() {
        super(FXAAShader);
    }
}

export default FXAAPass;
