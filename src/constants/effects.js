import UnrealBloomPass from '../postprocessing/passes/unreal-bloom-pass';
import GlitchPass from '../postprocessing/passes/glitch-pass';
import FXAAPass from '../postprocessing/passes/fxaa-pass';
import SAOPass from '../postprocessing/passes/sao-pass';
import SSAOPass from '../postprocessing/passes/ssao-pass';

const EFFECTS = {
    bloom: UnrealBloomPass,
    glitch: GlitchPass,
    fxaa: FXAAPass,
    sao: SAOPass,
    ssao: SSAOPass,
};

export default EFFECTS;
