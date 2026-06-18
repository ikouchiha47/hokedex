# Preset API Reference

Source of truth: `src/platform/presets/types.ts`, `src/platform/core/preset-registry.ts`, `src/platform/presets/index.ts`.

A preset is a **named, reusable bundle** of camera motion + atmosphere overlays applied to a screenshot or slideshow scene. Explicit scene fields always override the preset.

---

## Preset type

```ts
type Preset = {
  id:           string;
  name:         string;
  description?: string;
  thumbnail?:   string;           // path relative to public/ for UI preview
  category?:    string;           // 'cinematic' | 'social' | 'dramatic' | etc.
  duration?:    number;           // suggested duration in seconds
  enter?:       Motion;           // how the clip enters the stage
  motion?:      Motion[];         // camera movements (compose additively)
  overlays?:    SceneOverlaySpec[]; // fullscreen atmosphere effects
};
```

---

## Using a preset in a spec

```ts
// Preset fills motion, enter, overlays, duration
{ type: 'screenshot', src: 'hokedex/photo.png', preset: 'ken-burns' }

// Explicit fields WIN over preset — this overrides ken-burns motion
{ type: 'screenshot', src: 'hokedex/photo.png', preset: 'ken-burns',
  motion: { type: 'pan', direction: 'down', to: 0.9 } }

// Combine preset atmosphere with custom motion
{ type: 'screenshot', src: 'hokedex/photo.png', preset: 'film',
  motion: [{ type: 'zoom', from: 1.0, to: 1.2 }] }
```

Merge order (highest priority last): `preset defaults → scene fields`.

---

## Built-in platform presets

| id | name | category | duration | motion | overlays |
|----|------|----------|----------|--------|---------|
| `ken-burns` | Ken Burns | cinematic | 4s | zoom 1.0→1.12 + pan up 0.3 | vignette 0.4 |
| `dramatic-zoom` | Dramatic Zoom | dramatic | 3s | zoom 1.0→1.3 | vignette 0.6 + grain 0.06 |
| `slow-pan-up` | Slow Pan Up | cinematic | 4s | pan down 0.8 | vignette 0.35 |
| `push-in` | Push In | social | 3s | zoom 1.0→1.18 | — |
| `film` | Film | cinematic | 4s | zoom 1.02→1.1 | grain 0.12 + vignette + light-leak |
| `cold-open` | Cold Open | dramatic | 2.5s | zoom 1.05→1.2 top | dark vignette + color-grade |

---

## Adding a preset

### Platform preset (generic, available to all projects)

Add to `src/platform/presets/index.ts`:

```ts
registerPreset('slow-drift', {
  name:     'Slow Drift',
  category: 'cinematic',
  duration: 5,
  motion: [
    { type: 'pan',  direction: 'right', to: 0.2 },
    { type: 'zoom', from: 1.0, to: 1.08 },
  ],
  overlays: [
    { type: 'core:vignette', intensity: 0.3 },
  ],
});
```

### Project preset (hokedex-specific)

Create `src/projects/hokedex/presets/index.ts`:

```ts
import { registerPreset } from '../../../platform/core/preset-registry';

registerPreset('hokedex:snap-in', {
  name:     'Snap In',
  category: 'social',
  duration: 1.5,
  enter: { type: 'slide', direction: 'up' },
});
```

Then import it in `src/projects/hokedex/registry.ts`:
```ts
import './presets/index';
```

---

## listPresets()

```ts
import { listPresets } from '../../platform/core/preset-registry';
const all = listPresets(); // Preset[]
```

Useful for building a UI picker or generating a thumbnail grid.
