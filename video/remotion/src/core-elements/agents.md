# core-elements/

Element renderers — pure visual components with no animation logic.
Each file registers one element via `registerElement`.

## What this directory is for

Elements are the renderable atoms used inside scenes — pills, circles, rings,
images, text labels. They receive a size (`w`, `h`) and a `data` object and
return JSX. They know nothing about frame, time, or effects.

## Platform elements

| File | Name | data shape |
|------|------|------------|
| `pill.tsx` | `core:pill` | `{ label, emoji?, color }` |
| `circle.tsx` | `core:circle` | `{ color }` |
| `ring.tsx` | `core:ring` | `{ color, thickness? }` |
| `image-circle.tsx` | `core:image-circle` | `{ src, borderColor? }` |
| `text.tsx` | `core:text` | `{ value, fontSize?, color?, fontWeight? }` |

## How to add a new element

1. Create `core-elements/my-element.tsx`
2. Call `registerElement('proj:my-element', { render(data, w, h) { ... } })`
3. Import it in `core-elements/index.ts` (or in your project's spec.ts)

```tsx
// core-elements/my-element.tsx
import React from 'react';
import { registerElement } from '../core/element-registry';

type MyData = { label: string; color: string };

registerElement('proj:my-element', {
  render(data: MyData, w: number, h: number) {
    return (
      <div style={{ width: w, height: h, background: data.color }}>
        {data.label}
      </div>
    );
  },
});
```

4. Use in spec.ts:
```ts
{ element: 'proj:my-element', w: 200, h: 60, data: { label: 'Hi', color: '#ff0' } }
```

## Rules

- Elements are **stateless and timeless** — no `useCurrentFrame()`, no hooks
- Size always comes from the spec (`w`, `h` args) — never hardcoded
- All data params must be typed — no `any` in `data`
- Name elements `ns:name` — `core:` for platform, project namespace for custom
