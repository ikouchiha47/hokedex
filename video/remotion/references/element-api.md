# Element API Reference

Source of truth: `src/platform/core/element-registry.ts`, `src/projects/hokedex/elements/`.

Elements are **positioned renderable components** placed on top of screenshot scenes via `SceneElement`. They are also used as items in `ChipsScene`.

---

## ElementRenderer interface

```ts
interface ElementRenderer<T = unknown> {
  render(data: T, w: number, h: number): React.ReactNode;
}
```

`render` is a pure function — no hooks, no state. Size always comes from the spec.

---

## Built-in elements (hokedex)

| id | data shape | renders |
|----|------------|---------|
| `core:pill` | `{ label: string; emoji: string; color: string }` | Rounded bordered badge |
| `core:circle` | `{ color: string }` | Filled semi-transparent circle |
| `core:ring` | `{ color: string }` | Hollow ring (border only) |
| `core:image-circle` | `{ src: string; borderColor?: string }` | Circular cropped image |
| `core:text` | `{ value: string; fontSize?: number; color?: string; fontWeight?: number }` | Text label |

`src` in `core:image-circle` is relative to `public/` (same convention as scene `src`).

---

## SceneElement (positioned on a screenshot scene)

```ts
type SceneElement = {
  id: string;
  element: string;        // 'core:pill', 'core:circle', etc.
  x: number;             // center-x in stage px (0–1080)
  y: number;             // center-y in stage px (0–1920)
  w: number;             // width px
  h: number;             // height px
  at: number;            // seconds after scene start when element appears
  data: unknown;         // element-specific, typed by ElementRenderer
  effects?: Effect[];    // see effect-api.md
}
```

`x`, `y` are the **center** of the element. The renderer positions with `left: x - w/2, top: y - h/2`.

---

## ElementSpec (positioned by ChipsScene layout)

```ts
type ElementSpec = {
  element: string;
  w: number;
  h: number;
  data: unknown;
}
```

No `x`/`y` — ChipsScene layouts (`RadiateEffect`, `RadialSpokeEffect`) compute positions.

---

## Adding an element

```ts
// src/projects/hokedex/elements/my-badge.tsx
import React from 'react';
import { registerElement } from '../../../platform/core/element-registry';

type MyData = { title: string; color: string };

registerElement('hokedex:my-badge', {
  render(data: MyData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        background: data.color,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: h * 0.4, color: '#fff',
      }}>
        {data.title}
      </div>
    );
  },
});
```

Then:
1. Import in `src/projects/hokedex/elements/index.ts`
2. Add to your project's element union (in `types.ts`) if you want TypeScript to type-check `data`
3. Use in spec: `{ element: 'hokedex:my-badge', w: 200, h: 60, data: { title: 'VIP', color: '#gold' } }`

Duplicate registrations throw at startup. Unknown element names throw at render time.
