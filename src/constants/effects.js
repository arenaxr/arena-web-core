import UnrealBloomPass from '../systems/postprocessing/passes/unreal-bloom-pass';
import GlitchPass from '../systems/postprocessing/passes/glitch-pass';
import FXAAPass from '../systems/postprocessing/passes/fxaa-pass';
import SAOPass from '../systems/postprocessing/passes/sao-pass';
import SSAOPass from '../systems/postprocessing/passes/ssao-pass';
import SMAAPass from '../systems/postprocessing/passes/smaa-pass';
import RenderPixelatedPass from '../systems/postprocessing/passes/pixel-pass';

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
