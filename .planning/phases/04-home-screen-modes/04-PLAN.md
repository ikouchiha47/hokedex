---
phase: 04-home-screen-modes
plan: "01"
type: execute
---

# HomeScreen + Mode Components

Replace CameraScreen with a HomeScreen that renders self-contained mode components in a slot.

## Files

### New
- `src/screens/HomeScreen.tsx`
- `src/components/modes/PhotoMode.tsx`
- `src/components/modes/VoiceMode.tsx`
- `src/components/modes/LocalMode.tsx`
- `src/components/modes/ContactMode.tsx`
- `src/components/ModeBar.tsx`
- `src/types/capture.ts`

### Modified
- `src/navigation/types.ts` — rename `Camera` tab → `Home`
- `src/navigation/TabNavigator.tsx` — point Home tab to HomeScreen
- `src/navigation/RootNavigator.tsx` — update HomeScreen import

### Deleted
- `src/screens/CameraScreen.tsx`

### Kept unchanged
- `src/components/VoiceRecordingView.tsx` — used by VoiceMode
- `src/services/permissions/useFeaturePermissions.ts`
- `src/services/permissions/PermissionRegistry.ts`

---

## Shared types (`src/types/capture.ts`)

```ts
export type CaptureResult =
  | { type: 'photo'; uri: string }
  | { type: 'voice'; uri: string | null }
  | { type: 'local'; uri: string }
  | { type: 'contact' }

export interface ModeProps {
  onCapture: (result: CaptureResult) => void;
  onReady: () => void;
  onBlocked: () => void;
}
```

---

## ModeBar (`src/components/ModeBar.tsx`)

Rename + simplify from CameraBottomBar.

Props:
```ts
interface ModeBarProps {
  activeMode: ModeKey;
  onModeChange: (mode: ModeKey) => void;
  ready: boolean;              // disables switcher when false
  onCapturePressIn: () => void;
  onCapturePressOut: () => void;
  onCaptureStop: () => void;
  showStop: boolean;
  bottomInset: number;
  lastPhotoUri?: string | null;
}
```

Mode labels are non-tappable when `!ready` (opacity 0.3, no onPress).

Reuse GalleryButton animation from CameraBottomBar.

---

## PhotoMode (`src/components/modes/PhotoMode.tsx`)

```
mount
  → useFeaturePermissions(['camera', 'location'], {
      onSuccess: { location: () => setLocationSource('gps') },
      onFailure: { camera: () => onBlocked() },
    })
  → if camera granted → onReady()
  → render: full-screen Camera viewfinder

capture button pressOut
  → capturePhotoToFile
  → onCapture({ type: 'photo', uri })
```

Props: `ModeProps & { locationSource: 'gps' | 'network' }`

---

## VoiceMode (`src/components/modes/VoiceMode.tsx`)

```
mount
  → useFeaturePermissions(['voice'], {
      onFailure: { voice: () => onBlocked() },
    })
  → granted → onReady()
  → render: VoiceRecordingView

on save
  → onCapture({ type: 'voice', uri })
```

Exposes `VoiceRecordingViewHandle` ref to ModeBar via `onCapturePressIn/Out/Stop`.

Props: `ModeProps & { onRecordingStateChange: (v: boolean) => void }`

---

## LocalMode (`src/components/modes/LocalMode.tsx`)

```
mount
  → useFeaturePermissions(['gallery'], {
      onFailure: { gallery: () => onBlocked() },
    })
  → granted → openPicker() → onReady()

openPicker
  → launchImageLibrary
  → result: onCapture({ type: 'local', uri })
  → cancelled: dark bg (button re-opens picker)

capture button pressOut → openPicker()
```

Props: `ModeProps`

---

## ContactMode (`src/components/modes/ContactMode.tsx`)

```
mount → onReady() immediately
render: dark bg placeholder
capture button pressOut → onCapture({ type: 'contact' })
```

Props: `ModeProps`

---

## HomeScreen (`src/screens/HomeScreen.tsx`)

State:
```ts
activeMode: ModeKey = 'photo'
ready: boolean = false
voiceRecording: boolean = false
lastPhotoUri: string | null = null
locationSource: 'gps' | 'network' = 'network'
```

Owns: `MomentCaptureService` (via useRef)

On mode change:
```
setReady(false) → setCaptureMode(newMode)
```

On `onReady`: `setReady(true)`

On `onBlocked`: show "Permission required" in slot

On `onCapture`:
```
photo / local → navigation.navigate('ShareIntake', { imageUri: uri })
voice         → captureService.capture({ source: 'voice', type: 'voice', ...meta }) → toast
contact       → navigation.navigate('NewEntry', {})
```

Slot render:
```
photo   → <PhotoMode onCapture onReady onBlocked locationSource />
voice   → <VoiceMode onCapture onReady onBlocked onRecordingStateChange />
local   → <LocalMode onCapture onReady onBlocked />
contact → <ContactMode onCapture onReady onBlocked />
```

ModeBar capture handlers:
```
photo:   pressOut → photoModeRef.capture()
voice:   pressIn/Out/Stop → voiceModeRef.onPressIn/Out/Stop()
local:   pressOut → localModeRef.openPicker()
contact: pressOut → contactModeRef.trigger()
```

---

## Navigation changes

`types.ts`:
```ts
Camera: undefined  →  Home: undefined
```

`TabNavigator.tsx`: Home tab → HomeScreen

---

## Test checklist

### Permissions
- [ ] Landing on HomeScreen (photo mode) — only camera + location dialogs appear
- [ ] Switching to VOICE — microphone dialog appears (if not granted)
- [ ] Switching to LOCAL — gallery dialog appears (if not granted)
- [ ] Switching to CONTACT — no dialog appears
- [ ] Mode switcher is disabled while permission check is in progress
- [ ] Denied camera — blocked UI shown, can't capture
- [ ] Denied gallery — blocked UI shown in local mode

### Photo mode
- [ ] Viewfinder renders on HomeScreen load
- [ ] Tapping capture takes photo
- [ ] After capture → navigates to ShareIntake
- [ ] isActive=false when not in photo mode (camera sensor off)

### Voice mode
- [ ] Switching to VOICE replaces viewfinder with VoiceRecordingView
- [ ] Tap capture → hands-free recording starts (timer runs)
- [ ] Hold capture → records while held
- [ ] Release hold < 500ms → discarded, no save prompt
- [ ] Release hold > 500ms → ASK_TO_SAVE appears
- [ ] Stop button → ASK_TO_SAVE appears
- [ ] Save → toast "Voice moment saved"
- [ ] Discard → returns to idle

### Local mode
- [ ] Switching to LOCAL → gallery picker opens immediately
- [ ] Pick image → navigates to ShareIntake
- [ ] Cancel picker → dark bg shown
- [ ] Tapping capture button re-opens picker
- [ ] Switching away and back re-opens picker

### Contact mode
- [ ] Switching to CONTACT → dark bg, no crash
- [ ] Tapping capture → navigates to NewEntry

### Mode switcher
- [ ] All 4 modes reachable from switcher
- [ ] Active mode label highlighted
- [ ] Switcher locked while mode loading
- [ ] Switching modes unmounts previous mode component

### PIN (separate fix also in this session)
- [ ] PIN entry caps at 4 digits
- [ ] Cannot type 5th digit
- [ ] Exactly 4 dots shown always
- [ ] Submit only available at 4 digits
