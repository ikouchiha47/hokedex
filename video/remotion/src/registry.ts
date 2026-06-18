import { TextScene } from './scenes/TextScene';
import { ScreenshotScene } from './scenes/ScreenshotScene';
import { ChipsScene } from './scenes/ChipsScene';
import { SlideshowScene } from './scenes/SlideshowScene';
import { LockupScene } from './scenes/LockupScene';
import { SceneSpec } from './types';

// Add new scene types here only. Root.tsx never changes.
export const SceneRegistry: Record<SceneSpec['type'], React.FC<any>> = {
  'text':       TextScene,
  'screenshot': ScreenshotScene,
  'chips':      ChipsScene,
  'slideshow':  SlideshowScene,
  'lockup':     LockupScene,
};
