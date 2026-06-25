# State Flows — hokédex

Reference document for developer-level understanding of state transitions across App boot,
OnboardingScreen, and CameraScreen. Variable names are exact. Arrow notation: A → B means
"leads to". Table rows show: component · variable · old value → new value.

---

## 1. Permission Layer Foundations

### 1.1 PermissionRegistry (`src/services/permissions/PermissionRegistry.ts`)

`PermissionId` is the union: `'camera' | 'gallery' | 'analysePhotos' | 'voice' | 'location'`

**Android permission mapping:**

| PermissionId     | Android permission                                         |
|------------------|------------------------------------------------------------|
| camera           | CAMERA                                                     |
| gallery          | READ_MEDIA_IMAGES (API 33+) or READ_EXTERNAL_STORAGE       |
| analysePhotos    | Same as gallery — identical underlying permission          |
| voice            | RECORD_AUDIO                                               |
| location         | ACCESS_FINE_LOCATION                                       |

Key implication: `gallery` and `analysePhotos` resolve to the exact same Android permission.
Granting one grants the other at the OS level. The distinction only exists at the UI/UX layer
(analysePhotos has a UI dependency on gallery being granted first).

`checkAllPermissions()` returns `{ camera, gallery, analysePhotos: gallery, voice, location }`
— `analysePhotos` is always mirrored from the gallery check result.

### 1.2 Feature Permission Sets (`src/features.ts`)

```
ALL_PERMISSIONS = ['camera', 'gallery', 'voice', 'location']
  // derived as deduplicated union of all FEATURE_PERMISSIONS values
  // NOTE: 'analysePhotos' is NOT in ALL_PERMISSIONS — it only appears in OnboardingScreen's
  // PERMISSION_META, added to ITEMS by the onboarding UI explicitly

FEATURE_PERMISSIONS.camera = ['camera', 'gallery', 'voice', 'location']
FEATURE_PERMISSIONS.moments = ['gallery']
FEATURE_PERMISSIONS.maps    = ['location']
FEATURE_PERMISSIONS.voice   = ['voice']
```

### 1.3 useFeaturePermissions (`src/services/permissions/useFeaturePermissions.ts`)

Hook signature:
```ts
useFeaturePermissions(permissions: readonly PermissionId[], handlers?: { onSuccess?, onFailure? })
```

Behaviour:
- Runs inside `useFocusEffect` — fires every time the screen comes into focus (including on
  return from a system permission dialog or gallery picker).
- Iterates `permissions` **serially** (one at a time in a for-loop).
- For each permission:
  1. `checkPermission(id)` — if already granted → call `onSuccess[id]?.()`, continue.
  2. If not granted → `requestPermission(id)` — shows OS dialog.
     - Granted → call `onSuccess[id]?.()`.
     - Denied → call `onFailure[id]?.()`.
- Cleanup sets `cancelled = true` — in-flight checks abort on blur.
- **Empty dependency array** — the callback is never recreated. State captured at mount time
  is what the handlers close over. This means `onSuccess`/`onFailure` callbacks must use
  `setState` setters (stable) rather than reading state variables.

---

## 2. App.tsx Boot Flow

### 2.1 State Shape

```ts
type BootState =
  | { status: 'booting' }
  | { status: 'onboarding'; db; collectionRoot; category; needsPinSetup: boolean }
  | { status: 'locked';    db; collectionRoot; category; needsSetup: boolean }
  | { status: 'ready';     db; collectionRoot; category }
  | { status: 'error';     message: string }
```

**Component state variables:**

| Variable           | Type              | Initial value |
|--------------------|-------------------|---------------|
| boot               | BootState         | `{ status: 'booting' }` |
| pendingSharedUri   | string \| null    | `null` |
| updateAvailable    | string \| null    | `null` (unused — vestigial) |

### 2.2 Fresh Install Boot Flow

```
App mounts
  → boot: 'booting'                    [spinner + "initialising…" shown]
  → run() called via useEffect
    → defaultBootstrap() called
      → DB opened, migrations run
      → settings read: onboardingDone = false (fresh install)
      → pinExists = false (no PIN stored)
    → result.onboardingDone === false
  → boot: 'onboarding' { db, collectionRoot, category, needsPinSetup: true }
  → <OnboardingScreen onDone={handleOnboardingDone} /> rendered
```

### 2.3 Returning User Boot Flow (onboarding already done, PIN exists)

```
App mounts
  → boot: 'booting'
  → defaultBootstrap()
    → onboardingDone = true, pinExists = true
  → boot: 'locked' { needsSetup: false }
  → <LockScreen onUnlocked={handleUnlocked} /> rendered
```

### 2.4 Returning User — PIN Not Yet Set

```
  → boot: 'locked' { needsSetup: true }
  → <PinSetupScreen onPinSet={handlePinSet} /> rendered
```

### 2.5 Boot Error

```
  → defaultBootstrap() throws
  → boot: 'error' { message: string }
  → Error box rendered with message (no retry UI — only a hard restart recovers)
```

### 2.6 handleOnboardingDone — Onboarding → Locked Transition

Triggered by: user taps Skip or Done (or ✕) in OnboardingScreen.

```
handleOnboardingDone()
  → guard: boot.status !== 'onboarding' → return (no-op)
  → setSettingValue(db, SETTINGS.ONBOARDING_COMPLETE, 'true')  [async DB write]
    → success:
        boot: 'onboarding' → 'locked' { needsSetup: needsPinSetup }
        if needsPinSetup: → PinSetupScreen rendered
        else:             → LockScreen rendered
    → failure:
        console.error logged, boot stays 'onboarding'
        OnboardingScreen remains visible — user can retry tapping Done
```

State changes:

| Component | Variable | Old → New |
|-----------|----------|-----------|
| App       | boot.status | 'onboarding' → 'locked' |
| App       | boot.needsSetup | (from needsPinSetup) |

### 2.7 handlePinSet — PinSetup → Ready

```
handlePinSet()
  → boot.status !== 'locked' → return
  → resetTimer()  [AppLockManager — resets inactivity timer]
  → boot: 'locked' → 'ready' { db, collectionRoot, category }
  → <RootNavigator> rendered
```

### 2.8 handleUnlocked — LockScreen → Ready

Same transition as handlePinSet — `boot: 'locked' → 'ready'`.

### 2.9 Background / Foreground Lock

```
AppState change → 'background' or 'inactive':
  → onBackground()  [starts inactivity timer in AppLockManager]

AppState change → 'active':
  → if boot.status !== 'ready': no-op
  → if onForeground() returns true (timer expired):
      boot: 'ready' → 'locked' { needsSetup: false }
      → LockScreen shown
  → if onForeground() returns false:
      no change
```

### 2.10 Complete Boot State Machine

```
booting ──(bootstrap ok, !onboardingDone)──→ onboarding
booting ──(bootstrap ok, onboardingDone, !pinExists)──→ locked [needsSetup: true]
booting ──(bootstrap ok, onboardingDone, pinExists)──→ locked [needsSetup: false]
booting ──(bootstrap throws)──→ error

onboarding ──(Done/Skip, DB write ok)──→ locked
onboarding ──(Done/Skip, DB write fails)──→ onboarding  [stays]

locked [needsSetup: true]  ──(pin set)──→ ready
locked [needsSetup: false] ──(unlocked)──→ ready

ready ──(foreground after timer expired)──→ locked [needsSetup: false]
```

### 2.11 What Renders Per Boot Status

| boot.status | Rendered component |
|-------------|-------------------|
| booting     | Splash: logo + spinner ("initialising…") |
| error       | Splash: logo + error box |
| onboarding  | SafeAreaProvider > OnboardingScreen |
| locked, needsSetup: true | SafeAreaProvider > PinSetupScreen |
| locked, needsSetup: false | SafeAreaProvider > AppProvider > LockScreen |
| ready       | AppProvider > RootNavigator |

---

## 3. OnboardingScreen

File: `src/screens/OnboardingScreen.tsx`

### 3.1 State Variables

| Variable  | Type                              | Initial value |
|-----------|-----------------------------------|---------------|
| granted   | `Record<PermissionId, boolean>`   | All `false` via `Object.fromEntries(ALL_PERMISSIONS.map(id => [id, false]))` |
| pending   | `PermissionId \| null`            | `null` |

Note: `ALL_PERMISSIONS` does not include `analysePhotos`. However `ITEMS` (the rendered list)
is built from `ALL_PERMISSIONS.map(id => ({ id, ...PERMISSION_META[id] }))`. Since
`PERMISSION_META` includes `analysePhotos` but `ALL_PERMISSIONS` does not, `analysePhotos`
does **not** appear in the rendered permission list.

Actually re-reading: `ITEMS = ALL_PERMISSIONS.map(id => ({ id, ...PERMISSION_META[id] }))`.
`ALL_PERMISSIONS` = `['camera', 'gallery', 'voice', 'location']`. So `analysePhotos` row is
**not rendered**. The `dependsOn` logic for analysePhotos exists in PERMISSION_META but is
never exercised because analysePhotos is not in ITEMS. The `granted` state object also does
not have an `analysePhotos` key (only keys from `ALL_PERMISSIONS`).

### 3.2 Mount: Initial Permission Sync

```
OnboardingScreen mounts
  → granted: all false (initial state)
  → useEffect fires: syncGranted()
    → checkPermission() called for each of ['camera', 'gallery', 'voice', 'location']
    → setGranted() with real OS values
    → if user previously granted permissions (e.g. app reinstall), toggles show true
```

State changes on mount sync:

| Variable | Old → New |
|----------|-----------|
| granted.camera    | false → true/false (OS check) |
| granted.gallery   | false → true/false |
| granted.voice     | false → true/false |
| granted.location  | false → true/false |

User sees: switches may flip to ON if already granted at OS level.

### 3.3 User Grants a Permission (happy path)

Trigger: user taps a Switch for a permission not yet granted (e.g. camera).

```
handleToggle('camera', undefined)
  → dependsOn check: undefined → skip
  → granted['camera'] === false → proceed to request
  → setPending('camera')           [switch disabled, spinner implicit]
  → requestPermission('camera')    [OS dialog shown]
    → user taps "Allow"
    → result = true
  → setGranted: { ...prev, camera: true }
  → setPending(null)
```

State changes:

| Component          | Variable            | Old → New |
|--------------------|---------------------|-----------|
| OnboardingScreen   | pending             | null → 'camera' |
| OnboardingScreen   | granted.camera      | false → true |
| OnboardingScreen   | pending             | 'camera' → null |

User sees: switch is disabled during `pending === id`, then flips to ON (purple track) once granted.

### 3.4 User Denies a Permission

```
handleToggle('camera', undefined)
  → setPending('camera')
  → requestPermission('camera')    [OS dialog shown]
    → user taps "Deny"
    → result = false
  → setGranted: { ...prev, camera: false }   [no change]
  → setPending(null)
```

State changes:

| Component          | Variable            | Old → New |
|--------------------|---------------------|-----------|
| OnboardingScreen   | pending             | null → 'camera' → null |
| OnboardingScreen   | granted.camera      | false → false (no change) |

User sees: switch bounces back to OFF. If OS shows "Don't ask again" and user selected it,
re-tapping the switch still calls `requestPermission` but Android returns `DENIED` without
showing a dialog. User must go to system Settings to grant — the app cannot prompt again.

### 3.5 Already-Granted Permission Toggle (trying to revoke)

```
handleToggle('camera', undefined)
  → granted['camera'] === true → revoke path
  → checkPermission('camera')    [re-checks OS state]
  → setGranted: { ...prev, camera: current }   [reflects real OS state]
  → return  (no requestPermission called)
```

User sees: switch stays ON. There is no in-app revocation — user must go to system Settings.

### 3.6 analysePhotos Dependency (UI only — not currently rendered)

The dependency guard exists in code:
```ts
if (dependsOn && !granted[dependsOn]) return;
```

For `analysePhotos`, `dependsOn = 'gallery'`. If `gallery` is not granted, tapping the
`analysePhotos` switch exits immediately — `pending` never changes, no OS dialog fires.

Additionally, in `setGranted` after a gallery toggle:
```ts
if (id === 'gallery' && !result) {
  next.analysePhotos = false;  // cascade: gallery denied → analysePhotos cleared
}
```

Since analysePhotos is not in `ALL_PERMISSIONS` and not in `granted`'s initial keys, this
cascade sets a key that doesn't otherwise exist. It is defensive code for future use.

### 3.7 Skip vs Done

Both buttons call `onDone()` (the same handler: `handleOnboardingDone` from App.tsx).
There is no functional difference. Neither button checks permission state before calling onDone.
A user can Skip without granting any permissions — the app proceeds to locked/ready state.

```
Skip pressed → onDone() → handleOnboardingDone() → [see §2.6]
Done pressed → onDone() → handleOnboardingDone() → [see §2.6]
✕ pressed   → onDone() → handleOnboardingDone() → [see §2.6]
```

### 3.8 Full OnboardingScreen Permission Toggle Flow (all permissions)

```
Mount
  → granted: { camera:F, gallery:F, voice:F, location:F }
  → syncGranted() → reflects OS state

User taps Camera switch (not granted):
  → pending: null → 'camera'
  → OS dialog
  → granted.camera: false → true (or stays false)
  → pending: 'camera' → null

User taps Gallery / Files switch (not granted):
  → pending: null → 'gallery'
  → OS dialog (READ_MEDIA_IMAGES or READ_EXTERNAL_STORAGE)
  → granted.gallery: false → true (or stays false)
  → pending: 'gallery' → null

User taps Voice switch (not granted):
  → pending: null → 'voice'
  → OS dialog (RECORD_AUDIO)
  → granted.voice: false → true (or stays false)
  → pending: 'voice' → null

User taps Location switch (not granted):
  → pending: null → 'location'
  → OS dialog (ACCESS_FINE_LOCATION)
  → granted.location: false → true (or stays false)
  → pending: 'location' → null

User taps Done:
  → onDone() → handleOnboardingDone()
  → setSettingValue(db, ONBOARDING_COMPLETE, 'true')
  → boot: 'onboarding' → 'locked'
```

---

## 4. CameraScreen

File: `src/screens/CameraScreen.tsx`

### 4.1 State Variables

| Variable       | Type                   | Initial value |
|----------------|------------------------|---------------|
| captureMode    | CaptureMode            | `'photo'` |
| lastPhotoUri   | string \| null         | `null` |
| cameraBlocked  | boolean                | `false` |
| locationSource | `'gps' \| 'network'`  | `'network'` |
| isProcessing   | boolean                | `false` |

Derived / hook values (not useState but affect render):
- `isFocused` — from `useIsFocused()` — true when screen is active tab
- `device` — from `useCameraDevice('back')` — null if no back camera

### 4.2 Screen Mount: Permission Check via useFeaturePermissions

CameraScreen calls:
```ts
useFeaturePermissions(FEATURE_PERMISSIONS.camera, {
  onSuccess: { location: () => setLocationSource('gps') },
  onFailure: {
    camera:   () => setCameraBlocked(true),
    location: () => setLocationSource('network'),
  },
})
```

`FEATURE_PERMISSIONS.camera = ['camera', 'gallery', 'voice', 'location']`

**Sequence on first focus (permissions not yet granted):**

```
Screen focuses → useFocusEffect fires → check() starts

1. checkPermission('camera')
   → not granted → requestPermission('camera') → OS dialog
   → granted:   no handler called (onSuccess.camera not defined)
   → denied:    onFailure.camera() → setCameraBlocked(true)

2. checkPermission('gallery')
   → not granted → requestPermission('gallery') → OS dialog
   → granted/denied: no handlers defined → no state change

3. checkPermission('voice')
   → not granted → requestPermission('voice') → OS dialog
   → granted/denied: no handlers defined → no state change

4. checkPermission('location')
   → not granted → requestPermission('location') → OS dialog
   → granted:   onSuccess.location() → setLocationSource('gps')
   → denied:    onFailure.location() → setLocationSource('network')
```

**On subsequent focus (permissions already granted):**

```
checkPermission('camera') → true → no handler → continue
checkPermission('gallery') → true → no handler → continue
checkPermission('voice') → true → no handler → continue
checkPermission('location') → true → setLocationSource('gps')
```

**Permission state changes on mount:**

| Variable        | Condition                    | Old → New |
|-----------------|------------------------------|-----------|
| cameraBlocked   | camera denied                | false → true |
| locationSource  | location granted             | 'network' → 'gps' |
| locationSource  | location denied              | stays 'network' |

### 4.3 cameraBlocked: What Renders

```ts
if (cameraBlocked || !device) {
  return null;  // renders nothing — blank screen
}
```

If `cameraBlocked === true` or `device === null` (no back camera), the entire screen returns
null. No error UI, no fallback message — just a blank screen. This is the only conditional
render path in CameraScreen.

### 4.4 Camera isActive Logic

```ts
<Camera isActive={isFocused && captureMode !== 'local'} />
```

| isFocused | captureMode | isActive |
|-----------|-------------|----------|
| true      | 'photo'     | true     |
| true      | 'voice'     | true     |
| true      | 'contact'   | true     |
| true      | 'local'     | false    |
| false     | any         | false    |

When `captureMode` switches to `'local'`, the camera hardware is deactivated even though the
screen is still focused. This prevents the camera from running while the gallery picker is
open.

### 4.5 captureMode State Transitions

Triggered by: user tapping a mode label in `CameraBottomBar` → `onModeChange(key)` → `setCaptureMode(key)`.

Available modes: `'photo' | 'voice' | 'contact' | 'local'`

```
Any mode → 'photo':   captureMode: X → 'photo',   Camera isActive: true
Any mode → 'voice':   captureMode: X → 'voice',   Camera isActive: true
Any mode → 'contact': captureMode: X → 'contact', Camera isActive: true
Any mode → 'local':   captureMode: X → 'local',   Camera isActive: false
```

No side effects beyond re-render. `handleCapture` reads `captureMode` at call time via closure.

### 4.6 isProcessing Guard

```ts
const handleCapture = useCallback(async () => {
  if (isProcessing) return;  // guard at top
  ...
  setIsProcessing(true);
  try { ... } finally { setIsProcessing(false); }
}, [captureMode, isProcessing, photoOutput, captureService]);
```

`isProcessing` blocks re-entrant capture taps. While `true`, the capture button shows an
`ActivityIndicator` (spinner) instead of the white circle.

**isProcessing is NOT set for voice mode** — the voice branch does not call `setIsProcessing`.
This means concurrent voice captures are not guarded.

---

## 5. CameraScreen Capture Flows

### 5.1 Photo Capture (`captureMode === 'photo'`)

Trigger: capture button tapped while `captureMode === 'photo'` and `!isProcessing`.

```
handleCapture()
  → isProcessing check: false → continue
  → captureMode === 'local': no → skip
  → captureMode === 'voice': no → skip
  → falls through to photo path
  → setIsProcessing(true)
  → photoOutput.capturePhotoToFile({}, {})
    → success: photoFile.filePath exists
        → uri = 'file://' + photoFile.filePath
        → setLastPhotoUri(uri)          [triggers thumbnail animation in CameraBottomBar]
        → resolveCaptureMetadata()      [async: GPS, weather, place]
        → captureService.capture({ source: 'camera', photoUri: uri, ...meta })
          → success (result.ok):
              ToastAndroid.show('Moment saved', SHORT)
          → failure (!result.ok):
              ToastAndroid.show('Failed to save moment', SHORT)
    → filePath missing:
        ToastAndroid.show('Capture failed', SHORT)
        setIsProcessing(false)
        return
    → throws:
        console.warn('[CameraScreen] capture failed:', e)
        ToastAndroid.show('Capture failed', SHORT)
  → finally: setIsProcessing(false)
```

State changes:

| Variable       | Old → New |
|----------------|-----------|
| isProcessing   | false → true → false |
| lastPhotoUri   | null/prev → 'file://...' |

User sees: capture button shows spinner → toast appears → thumbnail flashes in gallery button
(fades after 1.5s) → button returns to idle state.

### 5.2 Gallery / Local Capture (`captureMode === 'local'`)

Trigger: capture button tapped while `captureMode === 'local'` and `!isProcessing`.

```
handleCapture()
  → isProcessing: false → continue
  → captureMode === 'local': yes
  → launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 })
    [Camera isActive already false due to captureMode === 'local']
    → result.didCancel OR !result.assets?.[0]?.uri:
        return  [no state change, isProcessing never set]
    → uri = result.assets[0].uri
    → setLastPhotoUri(uri)
    → setIsProcessing(true)
    → resolveCaptureMetadata()
    → captureService.capture({ source: 'gallery', photoUri: uri, ...meta })
      → success: ToastAndroid.show('Moment saved', SHORT)
      → failure: ToastAndroid.show('Failed to save moment', SHORT)
    → throws: console.warn + ToastAndroid.show('Failed to process photo', SHORT)
    → finally: setIsProcessing(false)
    → return  [explicit return, skips rest of handleCapture]
```

State changes:

| Variable       | Old → New |
|----------------|-----------|
| lastPhotoUri   | null/prev → gallery URI |
| isProcessing   | false → true → false (only if user picks a photo, not on cancel) |

Note: `isProcessing` guard fires AFTER `launchImageLibrary` returns. A double-tap on the
capture button while the picker is open will launch two pickers because `isProcessing` is
still false when the second tap lands (picker is async and isProcessing isn't set until after
the picker resolves). This is a latent bug.

### 5.3 Voice Capture (`captureMode === 'voice'`)

Trigger: capture button tapped while `captureMode === 'voice'`.

```
handleCapture()
  → isProcessing: false → continue  [but isProcessing NOT set for voice path]
  → captureMode === 'voice': yes
  → resolveCaptureMetadata()
  → captureService.capture({ source: 'voice', type: 'voice', ...meta })
    → success: ToastAndroid.show('Voice moment saved', SHORT)
    → failure: ToastAndroid.show('Failed to save voice moment', SHORT)
  → throws: console.warn + ToastAndroid.show('Voice capture failed', SHORT)
  → return  [explicit return]
```

State changes: **none** — `isProcessing` is never set, `lastPhotoUri` is never set.

User sees: no visual feedback during processing (no spinner on button). Toast appears when done.

### 5.4 Contact Capture (`captureMode === 'contact'`)

`handleCapture` has no branch for `'contact'`. After the `local` and `voice` early-returns,
execution falls through to the photo capture path. Contact mode behaves identically to photo
mode — it fires `photoOutput.capturePhotoToFile`. This appears to be a placeholder for future
face-scan / contact-detection logic (the face scan button's `onFaceScanPress` is a no-op `() => {}`).

### 5.5 locationSource Effect on Capture

`locationSource` is a local state variable set by permission callbacks. It is **not consumed**
anywhere in CameraScreen's render or capture logic. `resolveCaptureMetadata()` is called
without being passed `locationSource`. The variable appears to be wired for future use —
perhaps to pass a hint to the metadata resolver about which provider to use.

---

## 6. useFocusEffect Re-fire: Return from Gallery Picker

This is the known "permission freeze" issue documented in project memory.

### Sequence

```
CameraScreen focused
  → useFocusEffect fires → check() runs serially for 4 permissions
  → user taps capture button in 'local' mode
  → launchImageLibrary() opens system gallery picker
    [screen loses focus → isFocused = false, Camera isActive = false]
  → check() cleanup: cancelled = true  [in-flight permission checks abort]
  → user selects image (or cancels) → returns to CameraScreen
  → screen regains focus → isFocusEffect fires AGAIN
  → check() restarts from the top: ['camera', 'gallery', 'voice', 'location']
    → all already granted → checkPermission returns true quickly
    → onSuccess.location() → setLocationSource('gps')  [redundant but harmless]
  → launchImageLibrary's promise resolves in handleCapture
  → both paths (capture + re-permission-check) now run concurrently
```

The re-fire is harmless when all permissions are already granted (fast path: 4 check calls,
no OS dialogs). It becomes problematic if:
- A permission is not yet granted and the OS dialog fires on return from picker
- Multiple screens simultaneously hold `useFeaturePermissions` for the same permission

The `cancelled` flag prevents old check loops from calling handlers after blur, but a new
check loop starts immediately on re-focus before the picker's promise resolves.

---

## 7. CameraBottomBar State (Internal)

File: `src/components/CameraBottomBar.tsx`

CameraBottomBar is stateless — it receives all data as props and calls parent callbacks.
The `GalleryButton` sub-component holds Reanimated shared values (not React state):

| Shared value   | Initial value | Purpose |
|----------------|---------------|---------|
| thumbOpacity   | 0             | Controls thumbnail visibility |
| thumbScale     | 0.8           | Controls thumbnail scale |
| iconOpacity    | 1             | Controls gallery icon visibility |

### Thumbnail Animation Flow

Triggered when `lastPhotoUri` prop changes to a new non-null value:

```
lastPhotoUri changes (new URI)
  → thumbOpacity: 0 → 1  (instant snap)
  → thumbScale: 0.8 → 1  (150ms ease-out)
  → iconOpacity: 1 → 0   (100ms)

After 1500ms delay:
  → thumbOpacity: 1 → 0  (300ms fade)
  → thumbScale: 1 → 1.05 → 0.8  (pop-out: 150ms + 200ms)

After 1700ms delay:
  → iconOpacity: 0 → 1   (200ms)
```

`prevUri` ref prevents re-triggering the animation if the same URI is passed again.

---

## 8. Edge Cases and Error Branches

### 8.1 No Back Camera (`device === null`)

```
useCameraDevice('back') returns null
→ CameraScreen returns null (blank screen)
```

No recovery path — user sees a blank screen if no back camera is available or permission
causes device to return null.

### 8.2 Boot Bootstrap Failure

```
defaultBootstrap() throws
→ boot: 'error' { message }
→ Error box displayed
→ No retry button — user must kill and reopen app
→ handleReset() exists but is only called via RootNavigator's onReset prop (not wired to error UI)
```

### 8.3 Onboarding DB Write Failure

```
setSettingValue(db, ONBOARDING_COMPLETE, 'true') throws
→ console.error('[Onboarding] failed to persist...')
→ boot stays 'onboarding'
→ OnboardingScreen remains visible
→ User can tap Done again to retry
```

### 8.4 Capture While Processing (isProcessing guard)

```
isProcessing === true → handleCapture() returns immediately
→ No state changes
→ User sees: capture button shows spinner — taps do nothing
```

Exception: voice mode never sets isProcessing, so concurrent voice taps are not blocked.

### 8.5 Photo Capture With No filePath

```
photoOutput.capturePhotoToFile() returns file with no filePath
→ ToastAndroid.show('Capture failed', SHORT)
→ setIsProcessing(false)
→ return (explicit early exit)
→ lastPhotoUri NOT updated
```

### 8.6 AppState Lock Race

```
App in ready state
→ user backgrounds app → onBackground() starts timer
→ user foregrounds before timer expires → onForeground() returns false → stays ready
→ user backgrounds again → onBackground() resets timer
→ user foregrounds after timer expires → onForeground() returns true
→ boot: 'ready' → 'locked' { needsSetup: false }
→ LockScreen shown
```

Race condition: if the app is in the middle of a photo capture when it backgrounds and
re-foregrounds to a lock screen, `isProcessing` is still true in the camera's stale state.
The CameraScreen itself is unmounted (LockScreen takes over), so `finally { setIsProcessing(false) }`
may call setState on an unmounted component — harmless in React Native (no crash, warning may appear).

### 8.7 Share Intent on Boot

```
defaultBootstrap() detects sharedUri in launch intent
→ pendingSharedUri set in App state
→ boot proceeds to locked → ready normally
→ when boot reaches 'ready': onSharedImage listener wires up
→ navigationRef.current?.navigate('ShareIntake', { imageUri: pendingSharedUri })
  [this is the cold-launch path — uses pendingSharedUri from state]

Hot-launch path (app already ready):
→ onSharedImage() listener fires directly
→ navigate('ShareIntake', { imageUri: path })
```
