// Registers all hokedex scene types, elements, effects, and motion handlers.
// Import this once from your spec file.
import '../../platform/registry';           // text, slideshow
import '../../platform/effects/index';      // core:pop-in, bloom, tap-ring, typewriter
import '../../platform/motion/register';    // pan, zoom
import '../../platform/overlays/index';     // core:vignette, film-grain, lens-flare, etc.
import '../../platform/presets/index';      // ken-burns, dramatic-zoom, etc.

import { registerScene }   from '../../platform/core/scene-registry';
import { ScreenshotScene } from './scenes/ScreenshotScene';
import { ChipsScene }      from './scenes/ChipsScene';
import { LockupScene }     from './scenes/LockupScene';
import './elements/index';

// Hokedex ScreenshotScene adds koFinish support on top of the platform version.
registerScene('screenshot', ScreenshotScene);
registerScene('chips',      ChipsScene);
registerScene('lockup',     LockupScene);
