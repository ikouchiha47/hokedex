# scenes/

Scene components — one file per scene type. Each scene is a full-screen
1080×1920 React component that is pure function of `useCurrentFrame()`.

## What this directory is for

Scenes are the top-level visual units of the video. The platform provides
generic scenes (text, screenshot, slideshow). Projects add their own
(lockup, product-specific intros, branded outros) by registering them.

## Platform scenes

| File | Type key | What it does |
|------|----------|-------------|
| `TextScene.tsx` | `text` | Big animated text lines |
| `ScreenshotScene.tsx` | `screenshot` | App screenshot with enter/motion/elements |
| `SlideshowScene.tsx` | `slideshow` | Multiple images with swipe + per-image motion |
| `ChipsScene.tsx` | `chips` | Element chips in radiate/radial-spoke layout |
| `LockupScene.tsx` | `lockup` | Branded outro (hokédex-specific) |

## How to add a new scene type

1. Create `scenes/MyScene.tsx` — props must match your spec type
2. Add the type to `SceneSpec` union in `../types.ts`
3. Call `registerScene('proj:my-scene', MyScene)` — import this file in `spec.ts`

```tsx
// scenes/MyScene.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { registerScene } from '../core/scene-registry';

type Props = { duration: number; title: string };

const MyScene: React.FC<Props> = ({ title }) => {
  const frame = useCurrentFrame(); // 0 = first frame of this scene
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a' }}>
      {title}
    </div>
  );
};

registerScene('proj:my-scene', MyScene);
```

4. Add to spec.ts:
```ts
{ type: 'proj:my-scene', duration: 2, title: 'Hello' }
```

## Rules

- `useCurrentFrame()` returns 0 at the start of this scene — never the global frame
- Stage is always 1080×1920. No `%`, no `vh`
- All animations are pure functions of `frame` — no timers, no GSAP
- Never import from `spec.ts` — scenes don't know the script
- `SceneElementRenderer` handles all overlay elements — don't inline element logic in scenes

## layouts/

Sub-components used by `ChipsScene`. Not standalone scenes.
