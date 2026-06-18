// Register all platform scene types.
// Project-specific scenes: call registerScene() in your own file and import it in spec.ts.
import { registerScene } from './core/scene-registry';
import { TextScene }       from './scenes/TextScene';
import { ScreenshotScene } from './scenes/ScreenshotScene';
import { ChipsScene }      from './scenes/ChipsScene';
import { SlideshowScene }  from './scenes/SlideshowScene';
import { LockupScene }     from './scenes/LockupScene';

registerScene('text',       TextScene);
registerScene('screenshot', ScreenshotScene);
registerScene('chips',      ChipsScene);
registerScene('slideshow',  SlideshowScene);
registerScene('lockup',     LockupScene);
