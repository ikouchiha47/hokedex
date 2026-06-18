// Built-in platform presets. Import once at entry point alongside overlays.
// Projects add their own presets in projects/<name>/presets/index.ts.
import { registerPreset } from '../core/preset-registry';

registerPreset('ken-burns', {
  name:        'Ken Burns',
  description: 'Classic slow zoom + upward pan. Documentary feel.',
  category:    'cinematic',
  duration:    4,
  motion: [
    { type: 'zoom', from: 1.0, to: 1.12, origin: 'center' },
    { type: 'pan',  direction: 'up', to: 0.3 },
  ],
  overlays: [
    { type: 'core:vignette', intensity: 0.4 },
  ],
});

registerPreset('dramatic-zoom', {
  name:        'Dramatic Zoom',
  description: 'Fast zoom in with vignette push. High impact opener.',
  category:    'dramatic',
  duration:    3,
  enter: { type: 'slide', direction: 'up' },
  motion: [
    { type: 'zoom', from: 1.0, to: 1.3, origin: 'center' },
  ],
  overlays: [
    { type: 'core:vignette',   intensity: 0.6 },
    { type: 'core:film-grain', opacity: 0.06 },
  ],
});

registerPreset('slow-pan-up', {
  name:        'Slow Pan Up',
  description: 'Reveal image from top to bottom at a steady pace.',
  category:    'cinematic',
  duration:    4,
  motion: [
    { type: 'pan', direction: 'down', to: 0.8 },
  ],
  overlays: [
    { type: 'core:vignette', intensity: 0.35 },
  ],
});

registerPreset('push-in', {
  name:        'Push In',
  description: 'Steady zoom in from normal to slightly close. Clean, modern.',
  category:    'social',
  duration:    3,
  motion: [
    { type: 'zoom', from: 1.0, to: 1.18, origin: 'center' },
  ],
});

registerPreset('film', {
  name:        'Film',
  description: 'Gentle zoom with grain and light leak for a vintage feel.',
  category:    'cinematic',
  duration:    4,
  motion: [
    { type: 'zoom', from: 1.02, to: 1.1, origin: 'center' },
  ],
  overlays: [
    { type: 'core:film-grain', opacity: 0.12, animated: true },
    { type: 'core:vignette',   intensity: 0.5, color: '#1a0a00' },
    { type: 'core:light-leak', color: '#ff8833', opacity: 0.18, startAt: 0.5, duration: 1.0 },
  ],
});

registerPreset('cold-open', {
  name:        'Cold Open',
  description: 'Hard cut, immediate zoom with chromatic vignette. No ease-in.',
  category:    'dramatic',
  duration:    2.5,
  motion: [
    { type: 'zoom', from: 1.05, to: 1.2, origin: 'top' },
  ],
  overlays: [
    { type: 'core:vignette',  intensity: 0.7, color: '#000033' },
    { type: 'core:color-grade', tint: '#001133', opacity: 0.2 },
  ],
});
