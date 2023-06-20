import UnrealBloomPass from '../postprocessing/passes/unreal-bloom-pass';
import GlitchPass from '../postprocessing/passes/glitch-pass';
import FXAAPass from '../postprocessing/passes/fxaa-pass';
import SAOPass from '../postprocessing/passes/sao-pass';
import SSAOPass from '../postprocessing/passes/ssao-pass';
import SMAAPass from '../postprocessing/passes/smaa-pass';
import RenderPixelatedPass from '../postprocessing/passes/pixel-pass';

const EFFECTS = {
    bloom: UnrealBloomPass,
    glitch: GlitchPass,
    fxaa: FXAAPass,
    sao: SAOPass,
    ssao: SSAOPass,
    smaa: SMAAPass,
    pixel: RenderPixelatedPass,
};

export default EFFECTS;
