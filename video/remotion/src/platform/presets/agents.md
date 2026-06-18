# platform/presets — Agent Guide

Named camera + atmosphere bundles. A preset is data, not code — it combines existing motion types and overlay types by name.

## What's here

| File | Purpose |
|------|---------|
| `types.ts` | `Preset` type, `SceneOverlaySpec` re-export |
| `index.ts` | Built-in platform presets registered at startup |

## Preset type

```ts
type Preset = {
  id:           string;
  name:         string;
  description?: string;
  thumbnail?:   string;       // public/ relative path for UI
  category?:    string;
  duration?:    number;       // suggested seconds
  enter?:       Motion;
  motion?:      Motion[];     // all compose additively
  overlays?:    SceneOverlaySpec[];
};
```

## Built-in presets

`ken-burns`, `dramatic-zoom`, `slow-pan-up`, `push-in`, `film`, `cold-open`.

See `references/preset-api.md` for full param table.

## Adding a platform preset

Add to `index.ts`:

```ts
registerPreset('whip-pan', {
  name:     'Whip Pan',
  category: 'social',
  duration: 1.5,
  motion: [{ type: 'pan', direction: 'right', to: 1.0 }],
});
```

## Adding a project preset

Create `projects/<p>/presets/index.ts`, import `registerPreset`, import that file in `projects/<p>/registry.ts`.

## Merge semantics

`VideoPlayer.applyPreset()` merges preset into scene with explicit scene fields winning:

```ts
{ ...presetDefaults, ...scene }
```

This means:
- `scene.motion` always overrides `preset.motion` entirely (not merged).
- `scene.overlays` always overrides `preset.overlays` entirely.
- `scene.duration` overrides `preset.duration`.

If you want to combine preset overlays with scene overlays, merge them in the spec manually:
```ts
overlays: [...resolvePreset('ken-burns').overlays ?? [], { type: 'core:lens-flare' }]
```

## listPresets()

```ts
import { listPresets } from '../core/preset-registry';
const presets = listPresets(); // all registered Preset objects
```

Use this to build a picker UI or generate a preset catalogue.
