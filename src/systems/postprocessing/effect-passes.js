import UnrealBloomPass from './passes/unreal-bloom-pass';
import GlitchPass from './passes/glitch-pass';
import FXAAPass from './passes/fxaa-pass';
import SAOPass from './passes/sao-pass';
import SSAOPass from './passes/ssao-pass';
import SMAAPass from './passes/smaa-pass';
import RenderPixelatedPass from './passes/pixel-pass';

const ArenaEffects = {
    bloom: UnrealBloomPass,
    glitch: GlitchPass,
    fxaa: FXAAPass,
    sao: SAOPass,
    ssao: SSAOPass,
    smaa: SMAAPass,
    pixel: RenderPixelatedPass,
};

export default ArenaEffects;
