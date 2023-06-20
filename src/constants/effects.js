import UnrealBloomPass from '../postprocessing/passes/unreal-bloom-pass';
import GlitchPass from '../postprocessing/passes/glitch-pass';
import FXAAPass from '../postprocessing/passes/fxaa-pass';
import SAOPass from '../postprocessing/passes/sao-pass';

const EFFECTS = {
    bloom: UnrealBloomPass,
    glitch: GlitchPass,
    fxaa: FXAAPass,
    sao: SAOPass,
};

export default EFFECTS;
