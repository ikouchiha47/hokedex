# hokedex video — Remotion

## How to make a new video

Edit `src/spec.ts`. Add a new scene array. That's it.

```ts
export const scenes: SceneSpec[] = [
  {
    type: 'text',
    duration: 2,
    lines: [
      { text: 'your situationship', enter: 'slide-up' },
      { text: 'has a file now.',    enter: 'slide-up', accent: true },
    ],
  },
  {
    type: 'chips',
    duration: 5,
    items: [
      { label: 'Clingy',     emoji: '💙', color: '#60a5fa' },
      { label: 'Hot Mess',   emoji: '🔥', color: '#fb923c' },
      { label: 'Mind Games', emoji: '🎲', color: '#a78bfa' },
    ],
    layout: 'radiate',
    stamp: { text: 'we all have', accentWord: 'patterns.', at: 1.5 },
  },
  {
    type: 'screenshot',
    src: '../assets/profile.png',
    duration: 4,
    crop: 'top',
    enter: 'slide-up',
    overlay: 'red-flag',
  },
  {
    type: 'lockup',
    duration: 4,
    hook: "gotta hook 'em all",
    name: 'hokédex',
    sub: 'Free · Android · No account',
  },
];
```

## Commands

```bash
# Preview in browser (scrub timeline)
npx remotion preview src/index.ts

# Render to MP4
npx remotion render src/index.ts HokedexShort out/hokedex_short1.mp4
```

## Scene types

| type | what it does |
|------|-------------|
| `text` | Big bold lines, one at a time |
| `screenshot` | App screenshot fills frame, optional overlay |
| `chips` | Type chips radiate from center |
| `lockup` | Final hokédex logo + tagline |

### `text` options
- `lines[].enter`: `slide-up` | `slide-left` | `slide-right` | `slam`
- `lines[].accent`: `true` → whole line in purple `#9d5cff`
- `lines[].parts`: array of `{ text, accent? }` — mixed colors on one line
  ```ts
  { parts: [{ text: 'I ' }, { text: 'date.', accent: true }], enter: 'slide-right' }
  ```

### Assets
Put images in `public/`. Reference by filename only — `'profile.png'`, not `'../assets/profile.png'`.
`staticFile()` is called automatically by `ScreenshotScene`.

### `screenshot` options
- `crop`: `top` | `middle` | `bottom` — which part of screenshot to show
- `enter`: `slide-up` | `zoom-in` | `cut`
- `overlay`: `red-flag` — sonar ping pill over the type row

### `chips` options
- `layout`: `radiate` — chips burst from stage center to their slots
- `stamp.at`: seconds after scene start when the stamp appears

## Rules — never break these

1. **Stage is always 1080×1920.** Remotion renders at this resolution. Browser window size is irrelevant.
2. **All coordinates in stage pixels.** No `%`, no `vh`, no `getBoundingClientRect`.
3. **Images use `object-fit: cover`.** Source image size does not matter. `crop` controls which region shows.
4. **Animations are pure functions of `frame`.** No GSAP, no timeline seek hacks. `useCurrentFrame()` is the only time source.
5. **New scene type = new file in `src/scenes/`.** Never add logic to `Root.tsx` or `spec.ts`.

## Adding a new overlay type

1. Add the type to `SceneSpec` in `src/types.ts`
2. Handle it in `src/scenes/ScreenshotScene.tsx`
3. Document it in this file

## Adding a new scene type

1. Add the type to `SceneSpec` in `src/types.ts`
2. Create `src/scenes/NewScene.tsx`
3. Add the render case in `src/Root.tsx`
4. Document it in this file

## Adding a new layout

1. Add the function to `src/layout.ts` — pure math, no DOM
2. Add the type to `ChipScene`'s `layout` prop
3. Document it in this file
