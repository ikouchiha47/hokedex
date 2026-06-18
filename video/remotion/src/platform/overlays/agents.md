# platform/overlays — Agent Guide

Fullscreen scene atmosphere effects. Each file registers one overlay into the scene-overlay registry.

## What's here

| File | Overlay | Status | What it does |
|------|---------|--------|-------------|
| `vignette.ts` | `core:vignette` | noop | Darken edges, draw focus to center |
| `film-grain.ts` | `core:film-grain` | noop | Animated noise texture |
| `lens-flare.ts` | `core:lens-flare` | noop | Streak of light across the frame |
| `color-grade.ts` | `core:color-grade` | noop | CSS blend-mode color tint |
| `light-leak.ts` | `core:light-leak` | noop | Colored blob sweeping across frame |
| `index.ts` | — | — | Import all five; import this once at entry point |

All five are currently **noop** (`return null`). The interfaces and param specs are documented at the top of each file. To implement one, replace `return null` with the React node.

## SceneOverlayFn contract

```ts
type SceneOverlayFn = (
  frame: number,
  fps: number,
  params: Record<string, unknown>,
) => React.ReactNode;
```

Return `null` to skip rendering (useful for time-gated overlays like `lens-flare` with `startAt`).

## Overlays vs effects

| | Effects | Overlays |
|-|---------|---------|
| Scope | One element | Full 1080×1920 stage |
| Position | Relative to element | Always absolute-fill |
| Registry | `effect-registry.ts` | `scene-overlay-registry.ts` |
| Output type | `EffectOutput` | `React.ReactNode` |
| Where used | `SceneElement.effects[]` | `scene.overlays[]` or preset |

## Adding a new overlay

```ts
// platform/overlays/scanlines.ts
import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Retro CRT scanlines over the full frame.
// params:
//   opacity: 0–1, default 0.1
//   spacing: px between lines, default 4
registerSceneOverlay('core:scanlines', (_frame, _fps, params): React.ReactNode => {
  const opacity = (params.opacity as number) ?? 0.1;
  const spacing = (params.spacing as number) ?? 4;
  return React.createElement('div', {
    style: {
      position: 'absolute', inset: 0,
      backgroundImage: `repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent ${spacing - 1}px,
        rgba(0,0,0,${opacity}) ${spacing - 1}px,
        rgba(0,0,0,${opacity}) ${spacing}px
      )`,
      pointerEvents: 'none',
    } as React.CSSProperties,
  });
});
```

1. Import in `index.ts`
2. Document all params at the top of the file (see existing files for format)
3. Unknown overlay types are silently skipped by VideoPlayer — safe to add incrementally
