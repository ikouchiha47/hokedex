# scene-effects/

Scene-level visual overlays — fullscreen effects that render on top of a scene.
Not element effects. Not animations on individual elements.

## What this directory is for

Scene effects are fullscreen overlays triggered at a specific moment within a
scene — things like a word slam with vignette (KO Slam), a flash frame, a
letterbox reveal. They are referenced directly in the scene spec and rendered
by the scene component.

## Platform scene effects

| File | What it does |
|------|-------------|
| `KOSlam.tsx` | Fullscreen vignette + word slam at a given `at` time |
| `ko-slam.ts` | `KOSlamParams` type definition |

## Data flow

```
spec.ts scene.koFinish: KOSlamParams
  → ScreenshotScene renders <KOSlam {...koFinish} />
  → KOSlam uses useCurrentFrame() directly (scene-local frame)
  → Renders vignette + text as AbsoluteFill overlay
```

## How to add a new scene effect

1. Create `scene-effects/my-effect.ts` — param type definition
2. Create `scene-effects/MyEffect.tsx` — React component
3. Add the param type to the relevant scene spec type in `../types.ts`
4. Render it inside the scene component

```tsx
// scene-effects/MyEffect.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export type MyEffectParams = {
  at: number;          // seconds after scene start
  color?: string;      // default '#fff'
};

export const MyEffect: React.FC<MyEffectParams> = ({ at, color = '#fff' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < Math.round(at * fps)) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.5 }} />
  );
};
```

## Difference from element effects

| | Element effect | Scene effect |
|--|---------------|--------------|
| Scope | One element | Fullscreen |
| Registered? | Yes, via effect-registry | No, imported directly |
| Driven by | `localFrame` (relative to element.at) | `useCurrentFrame()` |
| Examples | bloom, pop-in, tap-ring | KO slam, flash, letterbox |

## Rules

- Scene effects use `useCurrentFrame()` directly — they are scene-local components
- All visual params must be in the param type — no hardcoded values in the component
- Scene effects must return `null` before their `at` time
