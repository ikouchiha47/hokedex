// Platform scene registrations — generic scenes only.
// Projects must register their own 'screenshot' variant (with any project-specific props).
// The platform ScreenshotScene is importable but not auto-registered here.
import { registerScene }  from './core/scene-registry';
import { TextScene }      from './scenes/TextScene';
import { SlideshowScene } from './scenes/SlideshowScene';

registerScene('text',      TextScene);
registerScene('slideshow', SlideshowScene);
