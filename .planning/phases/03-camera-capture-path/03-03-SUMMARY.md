# 03-03: Non-blocking capture path + FaceProcessingWorker

**Status:** Complete

## What was built

- **MomentCaptureService** — `CaptureInput.photoUri` added; `capture()` enqueues a processing_queue job inside the moment transaction when photoUri is present. No drain call inside capture — non-blocking by design.
- **CameraScreen** — slimmed down: removed all face-picker/person-confirm state, handlers, and imports. Capture passes `photoUri` to `captureService.capture()`. Voice branch unchanged. No face modals, no GalleryBottomSheet.
- **Dead gallery components deleted** — `GalleryBottomSheet.tsx` and `GalleryPivot.tsx` removed. No remaining import references.
- **FaceProcessingWorker.kt** — single CoroutineWorker class. Delegates to existing ML pipeline. Retries up to 3 times on failure.
- **MainApplication.kt** — registers unique periodic work for FaceProcessingWorker every 6 hours with charging + idle + network constraints.

## Deviations

- HokedexMLModule already imports `androidx.work.*` — no dependency change needed.

## Files created

- `android/app/src/main/java/com/hokedex/workers/FaceProcessingWorker.kt`

## Files deleted

- `src/components/GalleryBottomSheet.tsx`
- `src/components/GalleryPivot.tsx`

## Files modified

- `src/services/MomentCaptureService.ts` — added photoUri param + enqueueJob call
- `src/screens/CameraScreen.tsx` — removed face modals, gallery sheet, slimmed capture handler
- `android/app/src/main/java/com/hokedex/MainApplication.kt` — added WorkManager periodic request

## Verification

- No remaining FacePickerModal/PersonConfirmModal/GalleryBottomSheet references
- No remaining import references to deleted gallery components
- `tsc --noEmit` passes clean
