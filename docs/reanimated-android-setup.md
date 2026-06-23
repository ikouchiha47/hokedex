# react-native-reanimated v4 — Android New Architecture Setup

## Why it's non-trivial

Reanimated v4 runs animation worklets on the **UI thread** via a C++ JSI layer (`NativeWorklets`). This requires two native `.so` files (`libreanimated.so`, `libworklets.so`) compiled into the APK. Neither package uses the `android/src/main/jni/` folder that RN's autolinking tool scans, so they are **invisible to autolinking** unless explicitly declared in `package.json`.

`react-native-worklets` is Reanimated's C++ execution layer. It ships as a separate package and must be wired up alongside Reanimated.

## What was needed

### 1. `package.json` — explicit dependencies

```json
"react-native-reanimated": "^4.4.1",
"react-native-worklets": "^0.9.2"
```

Both packages existed in `node_modules` as transitive dependencies but were not in `package.json`. RN autolinking only processes packages listed in `package.json`, so neither was discovered.

Adding them here caused autolinking to regenerate `autolinking.cpp` and `Android-autolinking.cmake` with `rnreanimated` and `rnworklets` entries — this wires them into the New Architecture TurboModule system.

### 2. `android/settings.gradle` — include as gradle subprojects

```groovy
include ':react-native-worklets'
project(':react-native-worklets').projectDir = new File('../node_modules/react-native-worklets/android')
include ':react-native-reanimated'
project(':react-native-reanimated').projectDir = new File('../node_modules/react-native-reanimated/android')
```

Required so gradle can build `libworklets.so` and `libreanimated.so` via each package's own `externalNativeBuild`. Reanimated's gradle build detects the worklets subproject and sets up the prefab dependency chain automatically.

### 3. `android/app/build.gradle` — implementation dependencies

```groovy
implementation(project(':react-native-worklets'))
implementation(project(':react-native-reanimated'))
```

Tells the app's gradle to include the compiled `.so` files from both subprojects in the final APK. Without this, the subprojects build but their output is never packaged.

### 4. `MainApplication.kt` — manual package registration

```kotlin
import com.swmansion.reanimated.ReanimatedPackage
import com.swmansion.worklets.WorkletsPackage

// in reactHost packageList:
add(WorkletsPackage())   // must come before ReanimatedPackage
add(ReanimatedPackage())
```

Reanimated's `ReanimatedPackage` triggers `SoLoader.loadLibrary("reanimated")` which loads `libreanimated.so` and runs `JNI_OnLoad` → `NativeProxy::registerNatives()`. Without this, the `.so` is in the APK but never loaded and `NativeWorklets` is `undefined` in JS.

### 5. `babel.config.js` — Babel plugin

```js
plugins: ['react-native-reanimated/plugin']
```

Transforms functions marked as `worklet` (and those inside `useAnimatedStyle`, `useAnimatedProps`) into serializable objects that can be cloned into the UI-thread JS runtime. Without this the Babel transform step is skipped and worklets fail silently.

## Build order matters

Worklets must be registered before Reanimated. Reanimated's `assertWorkletsVersionTask` gradle task verifies the worklets version. If worklets is missing, the build fails with a clear error message.

## Symptoms when missing

| Missing piece | Crash message |
|---|---|
| `package.json` entry | No crash — autolinking just ignores it; `NativeWorklets` is `undefined` |
| `settings.gradle` entry | Build fails — `libreanimated.so` / `libworklets.so` not compiled |
| `build.gradle` implementation | `.so` files not in APK — `NativeWorklets` is `undefined` at runtime |
| `MainApplication` registration | `libreanimated.so` not loaded — `NativeWorklets` is `undefined` |
| Babel plugin | Worklets not transformed — animations silently broken or crash in release |

The root crash was: `TypeError: Cannot read property 'loadUnpackers' of undefined at NativeWorklets`.
