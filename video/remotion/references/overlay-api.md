# Scene Overlay API Reference

Source of truth: `src/platform/core/scene-overlay-registry.ts`, `src/platform/overlays/`.

Scene overlays are **fullscreen effects** rendered on top of an entire scene — vignette, film grain, lens flare, color grade, light leak. Unlike element effects, they have no concept of position or size — they always fill 1080×1920.

---

## SceneOverlaySpec

```ts
type SceneOverlaySpec = {
  type: string;              // namespaced: 'core:vignette', 'myproject:glitch'
  [param: string]: unknown;  // overlay-specific params
}
```

Added to a scene via the `overlays` array, or pulled in through a preset.

---

## SceneOverlayFn signature

```ts
type SceneOverlayFn = (
  frame: number,
  fps: number,
  params: Record<string, unknown>,
) => React.ReactNode;
```

Return `null` to render nothing (useful for time-gated overlays).

---

## Built-in overlays (all currently noop — visuals pending)

### `core:vignette`
Darkens edges, draws attention to center.

```ts
{ type: 'core:vignette',
  intensity: 0.5,       // 0–1, how dark the outer edge gets
  color:     '#000000', // edge color
  shape:     'ellipse', // 'ellipse' | 'rect'
}
```

### `core:film-grain`
Animated noise over the scene.

```ts
{ type: 'core:film-grain',
  opacity:  0.08,   // 0–1 grain visibility
  size:     1.5,    // grain particle size px
  animated: true,   // grain changes each frame
}
```

### `core:lens-flare`
Camera lens flare streak.

```ts
{ type: 'core:lens-flare',
  x:         540,       // horizontal origin (0–1080)
  y:         200,       // vertical origin (0–1920)
  color:     '#ffffff',
  intensity: 0.6,       // 0–1 peak opacity
  startAt:   0,         // seconds when flare begins
  duration:  0.4,       // seconds for appear+fade
}
```

### `core:color-grade`
Color tint via CSS blend mode.

```ts
{ type: 'core:color-grade',
  tint:       '#001133',  // CSS color to blend
  opacity:    0.2,         // 0–1 blend strength
  mode:       'color',     // CSS mix-blend-mode
  saturation: 1,           // CSS filter saturate() 0–2
  contrast:   1,           // CSS filter contrast() 0–2
}
```

### `core:light-leak`
Colored blob sweeping across the frame.

```ts
{ type: 'core:light-leak',
  color:     '#ff9933',
  opacity:   0.25,
  direction: 'right',   // 'left' | 'right' | 'top' | 'bottom'
  startAt:   0,         // seconds
  duration:  1.2,       // seconds
}
```

---

## Adding a custom overlay

```ts
// src/platform/overlays/chromatic.ts  (or projects/<p>/overlays/chromatic.ts)
import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

registerSceneOverlay('myproject:chromatic', (frame, fps, params): React.ReactNode => {
  const shift = (params.shift as number) ?? 4;
  return React.createElement('div', {
    style: {
      position: 'absolute', inset: 0,
      mixBlendMode: 'screen',
      filter: `drop-shadow(${shift}px 0 0 rgba(255,0,0,0.4))
               drop-shadow(-${shift}px 0 0 rgba(0,0,255,0.4))`,
      pointerEvents: 'none',
    } as React.CSSProperties,
  });
});
```

Then:
1. Import in `platform/overlays/index.ts` (or `projects/<p>/registry.ts`)
2. Use in spec: `overlays: [{ type: 'myproject:chromatic', shift: 6 }]`

Unknown overlay types are silently skipped.

---

## Implementing a noop

All five built-in overlays currently return `null`. To implement one:

1. Open `src/platform/overlays/<name>.ts`
2. Replace `return null` with the React node
3. Read the param spec in the file header — all params are documented there
4. Run `npx tsc --noEmit` to verify, then `npx remotion preview src/index.ts` to test visually
