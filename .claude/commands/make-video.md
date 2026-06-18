# make-video

You are a video spec author for a Remotion-based short-form video engine.

Your job: given a brief from the user, produce a complete, valid TypeScript spec file at the correct path, preview it, and confirm the output renders.

---

## Engine location

```
video/remotion/src/
  platform/          ← generic engine (never edit unless adding platform features)
  projects/          ← one folder per project
    hokedex/
      specs/         ← video specs live here
        main.ts      ← primary video
        <name>.ts    ← additional videos
      registry.ts    ← imports and registers all hokedex scenes, elements, effects, presets
      types.ts       ← hokedex SceneSpec (extends platform + adds chips, lockup, koFinish)
      elements/      ← pill, circle, ring, image-circle, text
      scenes/        ← ChipsScene, LockupScene, ScreenshotScene (with koFinish)
      presets/       ← hokedex-specific presets (optional)
```

---

## Creating a new video

1. Create `video/remotion/src/projects/hokedex/specs/<name>.ts`
2. Register it in `video/remotion/src/projects/hokedex/index.ts`
3. Assets go in `video/remotion/public/hokedex/` — reference as `'hokedex/filename.ext'`

Spec file boilerplate:

```ts
import '../registry';
import { SceneSpec, VideoConfig } from '../types';
import { VideoPlayer } from '../../../platform/VideoPlayer';
import React from 'react';

export const videoConfig: VideoConfig = {
  bgColor:             '#0a0a0a',
  transitionFillColor: '#0a0a0a',
  accentColor:         '#9d5cff',
  fontFamily:          "'Space Grotesk', sans-serif",
  fonts: [{ type: 'google', family: 'Space Grotesk', weights: [400, 700, 800, 900] }],
};

export const scenes: SceneSpec[] = [
  // scenes here
];

const FPS = 30;
const totalFrames = scenes.reduce((s, sc) => s + Math.round(sc.duration * FPS), 0);

const Video: React.FC = () => React.createElement(VideoPlayer, { scenes, videoConfig });

export const myComposition = {
  id:               'MyCompositionId',
  component:        Video,
  durationInFrames: totalFrames,
  fps:              FPS,
  width:            1080,
  height:           1920,
};
```

Then in `projects/hokedex/index.ts`:

```ts
import { mainComposition }  from './specs/main';
import { myComposition }    from './specs/<name>';

export const compositions = [mainComposition, myComposition];
```

---

## Scene types

All scenes require `duration` (seconds).

### `text`
Big bold lines, one at a time. Each line animates in.

```ts
{
  type: 'text',
  duration: 1.5,
  lines: [
    { text: 'First line',  enter: 'slide-up' },
    { text: 'Second line', enter: 'slide-up', accent: true },
    { parts: [{ text: 'Mixed ' }, { text: 'color', accent: true }], enter: 'slide-left' },
  ],
  transition: 'cut' | 'fade',
}
```

`enter` options: `'slide-up'` | `'slide-left'` | `'slide-right'` | `'slam'`
`accent: true` → uses `videoConfig.accentColor` (#9d5cff default)

### `screenshot`
Single image, fills frame. Supports camera motion, element overlays, KO finish.

```ts
{
  type: 'screenshot',
  duration: 3,
  src: 'hokedex/my-screenshot.png',    // relative to public/
  preset: 'ken-burns',                  // optional — fills motion/enter/overlays from preset
  enter: { type: 'slide', direction: 'up' | 'down' | 'left' | 'right' },
  motion: { type: 'pan', direction: 'down', to: 0.85 },   // or array
  elements: [                           // overlaid elements with effects
    {
      id: 'unique-id',
      element: 'core:pill',             // see Elements section
      x: 540, y: 900,                   // center-x, center-y in stage px (1080×1920)
      w: 400, h: 80,
      at: 1.2,                          // seconds after scene start when element appears
      data: { label: 'Red Flag', emoji: '🚩', color: '#ef4444' },
      effects: [
        { type: 'core:pop-in' },
        { type: 'core:bloom', color: '#ef4444', delay: 0.3, duration: 0.8 },
      ],
    },
  ],
  koFinish: { text: 'DEXED.', sub: 'optional subtitle', at: 2.5 },
  transition: 'cut' | 'fade',
}
```

### `slideshow`
Multiple images shown sequentially with swipe transitions between them. Pan/zoom applies per image.

```ts
{
  type: 'slideshow',
  duration: 5,
  images: ['hokedex/img1.png', 'hokedex/img2.png'],
  preset: 'slow-pan-up',
  enter: { type: 'slide', direction: 'right' },
  motion: { type: 'pan', direction: 'down', to: 0.9 },
}
```

### `chips` (hokedex-specific)
Elements radiate or spoke out from center. Used for tag/pill displays.

```ts
{
  type: 'chips',
  duration: 4,
  layout: 'radial-spoke' | 'radiate',
  items: [
    { element: 'core:pill', w: 260, h: 80, data: { label: 'Ghost Type', emoji: '👻', color: '#a78bfa' } },
    // more items...
  ],
  stamp: { text: 'everyone has a', accentWord: 'type.', at: 3.0 },
  transition: 'cut',
}
```

### `lockup` (hokedex-specific)
Branding end card — logo + hook words + subtitle.

```ts
{
  type: 'lockup',
  duration: 2.5,
  hook: "gotta hook 'em all",
  name: 'hokédex',
  sub: 'Free · Android · No account',
}
```

---

## Motion

Camera movement applied to `screenshot` and `slideshow` scenes.

```ts
// Single motion
motion: { type: 'pan', direction: 'up' | 'down' | 'left' | 'right', to: 0.85 }
motion: { type: 'zoom', from: 1.0, to: 1.2, origin: 'center' | 'top' | 'bottom' }

// Array = concurrent (both active full scene) or sequential (use startAt/endAt)
motion: [
  { type: 'zoom', from: 1.0, to: 1.15 },                           // full scene
  { type: 'pan', direction: 'up', to: 0.4, startAt: 0.3 },         // starts at 30% of scene
]
```

`pan.to` is a fraction of overflow pixels (0 = no scroll, 1 = full overflow). Use 0.7–0.9 for most cases.
`zoom.from/to` are scale multipliers. 1.0 = natural. 1.05–1.3 is the practical range.
`startAt` / `endAt` are fractions of scene duration (0–1). Both optional.

---

## Effects (per-element)

Applied to elements in `SceneElement.effects[]`. Multiple effects compose.

```ts
{ type: 'core:pop-in',    overshoot: 2.2 }
{ type: 'core:bloom',     color: '#ef4444', delay: 0.3, duration: 0.8, maxScale: 3.8 }
{ type: 'core:tap-ring',  color: '#9d5cff', count: 5, stagger: 0.4 }
{ type: 'core:typewriter', speed: 12, cursor: true, cursorColor: '#9d5cff' }
```

---

## Presets

Named bundles of motion + overlays. `preset` field on screenshot/slideshow. Explicit fields override preset.

Available built-in presets:
- `'ken-burns'`     — slow zoom + pan up, vignette. 4s. Classic documentary.
- `'dramatic-zoom'` — fast zoom in, heavy vignette, grain. 3s. High impact.
- `'slow-pan-up'`   — pan down (reveals top to bottom), vignette. 4s.
- `'push-in'`       — gentle zoom in, clean. 3s. Social media standard.
- `'film'`          — zoom + grain + vignette + light leak. 4s. Vintage feel.
- `'cold-open'`     — fast zoom top-anchored, dark vignette, color grade. 2.5s.

---

## Elements

Elements are the visual components placed on screenshot scenes.

| id | data shape | description |
|----|------------|-------------|
| `core:pill` | `{ label, emoji, color }` | Rounded pill badge |
| `core:circle` | `{ color }` | Filled circle (use as tap target) |
| `core:ring` | `{ color }` | Hollow ring |
| `core:image-circle` | `{ src, borderColor? }` | Circular cropped image |
| `core:text` | `{ value, fontSize?, color?, fontWeight? }` | Plain text label |

Element `x`, `y` are center coordinates in stage pixels (stage = 1080×1920).
`at` is seconds after scene start when the element appears (and effects begin).

---

## Scene overlays

Fullscreen atmosphere effects. Added via `overlays` array on a scene or via preset.

```ts
overlays: [
  { type: 'core:vignette',    intensity: 0.5 },
  { type: 'core:film-grain',  opacity: 0.08 },
  { type: 'core:lens-flare',  x: 800, y: 200, startAt: 0.5 },
  { type: 'core:color-grade', tint: '#001133', opacity: 0.2 },
  { type: 'core:light-leak',  color: '#ff8833', opacity: 0.18, direction: 'right' },
]
```

Note: overlay visuals are not yet implemented (noop). Use presets to declare intent now; visuals will render once implemented.

---

## Asset convention

- All images go in `video/remotion/public/hokedex/`
- Reference in specs as `'hokedex/filename.png'` — no leading slash, no `public/`
- `staticFile()` is called automatically by scene renderers

---

## Preview and render

```bash
cd video/remotion

# Preview in browser (scrub timeline, live reload)
npx remotion preview src/index.ts

# Render one composition to MP4
npx remotion render src/index.ts <CompositionId> out/<name>.mp4
```

---

## Extending the engine

**New preset (hokedex-specific):**
Create `projects/hokedex/presets/index.ts`, import `registerPreset` from platform, add to registry.ts imports.

**New platform preset:**
Add to `platform/presets/index.ts`.

**New element:**
Add file in `projects/hokedex/elements/`, import in `elements/index.ts`.

**New scene type (project-specific):**
Create component in `projects/hokedex/scenes/`, add to `types.ts` union, register in `registry.ts`.

**New effect:**
Create file in `platform/effects/` (if generic) or `projects/hokedex/effects/`, call `registerEffect('namespace:name', fn)`.

**New motion type:**
Create file, call `registerMotion('namespace:name', fn)` from `platform/core/motion-registry`.

**New overlay (implement a noop):**
Edit the relevant file in `platform/overlays/` — replace `return null` with the React node.

---

## Constraints — never break these

1. Stage is always **1080×1920**. All coordinates in stage pixels.
2. Animations are pure functions of `useCurrentFrame()`. No timers, no GSAP.
3. All image paths go through `staticFile()` — never raw URLs.
4. No business logic in scene components — only in pure service functions.
5. New scene types always get their own file. Never add cases to existing scenes.
6. `platform/` is generic — never import project-specific code into it.
