# Scene Types Reference

Stage is always **1080×1920 px**. Every scene requires `duration` (seconds).

Source of truth: `src/platform/types.ts` and `src/projects/hokedex/types.ts`.

---

## `text`

Big bold lines, each animating in independently.

```ts
{
  type: 'text',
  duration: 1.5,            // seconds
  lines: [
    { text: 'First line',   enter: 'slide-up' },
    { text: 'Accented',     enter: 'slide-up', accent: true },
    {
      parts: [
        { text: 'Mixed ' },
        { text: 'color', accent: true },
      ],
      enter: 'slide-right',
    },
  ],
  transition: 'cut',        // 'cut' | 'fade' — how THIS scene exits
}
```

**`enter` options:** `'slide-up'` `'slide-left'` `'slide-right'` `'slam'`

`accent: true` uses `videoConfig.accentColor` (default `#9d5cff`).

`parts[]` mixes accent and normal on one line. Mutually exclusive with `text`.

---

## `screenshot`

Single image, fills frame. Camera motion, element overlays, optional KO finish.

```ts
{
  type: 'screenshot',
  duration: 3,
  src: 'hokedex/screen.png',        // relative to public/
  preset: 'ken-burns',              // optional — see preset-api.md
  enter: { type: 'slide', direction: 'up' },
  motion: { type: 'pan', direction: 'down', to: 0.85 },
  elements: [
    {
      id: 'badge',                  // unique within the scene
      element: 'core:pill',         // see element-api.md
      x: 540, y: 900,              // center-x, center-y in stage px
      w: 400, h: 80,
      at: 1.2,                     // seconds after scene start
      data: { label: 'Red Flag', emoji: '🚩', color: '#ef4444' },
      effects: [
        { type: 'core:pop-in' },
        { type: 'core:bloom', color: '#ef4444', delay: 0.3 },
      ],
    },
  ],
  overlays: [                       // fullscreen atmosphere — see overlay-api.md
    { type: 'core:vignette', intensity: 0.5 },
  ],
  koFinish: {                       // hokedex only — fullscreen word slam
    text: 'DEXED.',
    sub: 'optional subtitle',
    at: 2.5,                        // seconds after scene start
  },
  transition: 'cut',
}
```

**Image sizing:**
- Without pan: `object-fit: cover`, fills 1080×1920.
- With pan: `width: 1080`, `height: auto` — image overflows stage vertically, pan scrolls it. Overflow = `naturalH * (1080 / naturalW) - 1920`.

---

## `slideshow`

Multiple images with horizontal swipe between them. Camera motion per slot.

```ts
{
  type: 'slideshow',
  duration: 5,
  images: ['hokedex/a.png', 'hokedex/b.png', 'hokedex/c.png'],
  preset: 'slow-pan-up',
  enter: { type: 'slide', direction: 'right' },
  motion: { type: 'pan', direction: 'down', to: 0.9 },
  overlays: [{ type: 'core:vignette', intensity: 0.3 }],
}
```

Each image gets `duration / images.length` seconds. Swipe transition is 0.35s.

Pan starts after enter animation settles (18 frames = 0.6s at 30fps).

---

## `chips` (hokedex)

Elements radiate or spoke from center. Used for tag/pill showcases.

```ts
{
  type: 'chips',
  duration: 4.2,
  layout: 'radial-spoke',           // 'radiate' | 'radial-spoke'
  items: [
    { element: 'core:pill', w: 260, h: 80, data: { label: 'Ghost Type', emoji: '👻', color: '#a78bfa' } },
  ],
  stamp: {
    text: 'everyone has a',
    accentWord: 'type.',
    at: 3.0,                        // seconds before stamp appears
  },
  transition: 'cut',
}
```

`radiate` — chips burst outward from center, rows packed by width.
`radial-spoke` — chips placed at spoke tips radiating from stage center. Each spoke draws first.

---

## `lockup` (hokedex)

Branding end card. Words slam in, logo scales up, subtitle slides.

```ts
{
  type: 'lockup',
  duration: 2.5,
  hook: "gotta hook 'em all",      // space-separated; each word slams independently
  name: 'hokédex',                  // 'é' auto-accented in purple
  sub: 'Free · Android · No account',
}
```

---

## `enter` motion

Controls how a scene slides onto the stage. Applies to `screenshot` and `slideshow`.

```ts
enter: { type: 'slide', direction: 'up' | 'down' | 'left' | 'right' }
enter: { type: 'zoom' }            // fade-in from invisible
// omit = cut (no enter animation)
```

---

## Timing rules

- `duration` is the full clip duration including enter animation.
- `at` on elements is seconds from scene start (not from enter end).
- `stamp.at` is seconds from scene start.
- `koFinish.at` is seconds from scene start.
- Keep `at` values at least 0.5s before `duration` to avoid cutoff.
