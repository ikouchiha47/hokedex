// Side-effect imports register core effects/overlays/presets into global singletons.
// These are safe as globals because they use 'core:' namespacing — no project collision.
import './effects/index';
import './motion/register';
import './overlays/index';
import './presets/index';

// Scene registry is per-composition — export a factory, not a side effect.
import { RegistryBundle, createRegistryBundle } from './core/registry-bundle';
import { TextScene }      from './scenes/TextScene';
import { SlideshowScene } from './scenes/SlideshowScene';

export function createPlatformBundle(): RegistryBundle {
  const bundle = createRegistryBundle();
  bundle.scenes.register('text',      TextScene);
  bundle.scenes.register('slideshow', SlideshowScene);
  return bundle;
}
