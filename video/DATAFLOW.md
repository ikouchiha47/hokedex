# Video Engine — Data Flow

## 1. Authoring flow (agent or developer writes a video)

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent / Developer                                              │
│                                                                 │
│  1. Reads project (screenshots, brand colors, copy)             │
│  2. Writes spec.ts:                                             │
│       videoConfig  →  bg, accent, fonts, transitionFillColor    │
│       scenes[]     →  array of SceneSpec                        │
│  3. Optionally adds custom scenes/elements/effects              │
│     by registering them and importing in spec.ts                │
└────────────────────────┬────────────────────────────────────────┘
                         │ npx remotion preview / render
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  spec.ts (entry point)                                          │
│    import './registry'         → registers platform scenes      │
│    import './core-elements'    → registers core:pill etc        │
│    import './effects/index'    → registers core:pop-in etc      │
│    export videoConfig          → global aesthetic config        │
│    export scenes[]             → the script                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Root.tsx                                                       │
│    useFonts(videoConfig.fonts)  → delayRender until loaded      │
│    scenes.map → Series.Sequence → resolveScene(scene.type)      │
│    FadeOverlay if transition === 'fade'                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ per scene
```

---

## 2. Scene render flow

```
Series.Sequence (frame resets to 0 at scene start)
  │
  ▼
resolveScene('screenshot') → ScreenshotScene
  │
  ├─ useCurrentFrame()          → 0..durationInFrames-1
  ├─ useImageSize(src)          → delayRender → natural w/h
  ├─ Motion (enter/motion)      → translateY / translateX
  │
  ├─ elements[].map
  │     └─ SceneElementRenderer → (see Element flow below)
  │
  └─ koFinish → <KOSlam at={2.8} />   (scene-effect overlay)
```

---

## 3. Element + effect flow

```
SceneElement spec:
  { id, element: 'core:pill', x, y, w, h, at, data, effects[] }
         │                                              │
         ▼                                              ▼
  resolveElement('core:pill')              for each effect:
  .render(data, w, h)                        resolveEffect(effect.type)
  → JSX (static, no frame)                  (localFrame, fps, params, size)
                                             → EffectOutput

EffectOutput merging:
  ┌──────────────────────────────────────────┐
  │  underlays[]   (bloom glow — behind)     │
  │  ┌────────────────────────────────────┐  │
  │  │  content div                       │  │
  │  │    contentStyle (scale, opacity,   │  │
  │  │                  clipPath)         │  │
  │  │    element.render(data, w, h)      │  │
  │  └────────────────────────────────────┘  │
  │  overlays[]    (tap-rings — in front)    │
  └──────────────────────────────────────────┘

All positioned absolutely at (x - w/2, y - h/2) on the stage.
overflow: visible so rings/bloom can bleed outside element bounds.
```

---

## 4. Registry discovery (how named things are found)

```
Registration (at import time, before first render):

  registerScene('screenshot', ScreenshotScene)     ← registry.ts
  registerElement('core:pill', pillRenderer)        ← core-elements/pill.tsx
  registerEffect('core:bloom', bloomFn)             ← effects/bloom.ts

  All three use the same pattern:
    Map<string, T>
    throw on duplicate (catches typos, double-imports)
    throw on unknown  (catches missing imports)


Lookup (at render time):

  resolveScene('screenshot')    → ScreenshotScene component
  resolveElement('core:pill')   → { render(data, w, h): ReactNode }
  resolveEffect('core:bloom')   → (localFrame, fps, params, size): EffectOutput
```

---

## 5. Motion flow (pan example)

```
spec.ts:
  motion: { type: 'pan', direction: 'down', to: 0.85 }
              │
              ▼
  ScreenshotScene:
    useImageSize(src) → { w: 1084, h: 2328 }
    overflow = 2328 * (1080/1084) - 1920  = ~401px
    toPx     = 0.85 * 401                 = ~341px
    panY     = interpolate(frame, [0, durationInFrames-1], [0, -341])
    img style: transform: translateY(-341px) at last frame
```

---

## 6. Font loading flow

```
spec.ts videoConfig.fonts:
  [{ type: 'google', family: 'Space Grotesk', weights: [400,700,800,900] }]
       │
       ▼
  Root.tsx → useFonts(fonts)
       │
       ├─ delayRender('loading fonts')   ← Remotion waits, no frames render
       ├─ injects <link> to Google Fonts
       ├─ awaits document.fonts.ready
       └─ continueRender()               ← rendering resumes
```

---

## 7. Adding a custom effect (agent workflow)

```
1. Agent adds type to types.ts Effect union:
     | { type: 'proj:confetti'; count?: number; colors?: string[] }

2. Creates effects/confetti.ts:
     registerEffect('proj:confetti', (localFrame, fps, params, size) => {
       // returns EffectOutput
     })

3. Imports in spec.ts:
     import './effects/confetti'

4. Uses in spec:
     effects: [{ type: 'proj:confetti', count: 80, colors: ['#ff0', '#f0f'] }]

No platform files touched. Resolves at runtime via registry.
```

---

## 8. VideoConfig propagation

```
spec.ts videoConfig
  │
  ├─ Root.tsx
  │     bgColor           → AbsoluteFill background on each scene
  │     transitionFillColor → FadeOverlay background color
  │     fonts             → useFonts() → delayRender
  │
  └─ (future) scenes can read videoConfig.accentColor / fontFamily
       via a React context provider wrapping all sequences
```
