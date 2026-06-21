package com.hokedex.ml

import android.content.Context

enum class DetectorBackend { MEDIAPIPE_SHORT, MEDIAPIPE_FULL, MLKIT }

// ── Swap this to test different backends ──────────────────────────────────────
private val ACTIVE_BACKEND = DetectorBackend.MEDIAPIPE_FULL
// ─────────────────────────────────────────────────────────────────────────────

class FaceDetector(context: Context, confidenceThreshold: Float = 0.7f) {

    private val strategy: FaceDetectionStrategy = when (ACTIVE_BACKEND) {
        DetectorBackend.MEDIAPIPE_SHORT ->
            MediaPipeDetector(context, "face_detection_short_range.tflite", confidenceThreshold)
        DetectorBackend.MEDIAPIPE_FULL ->
            MediaPipeDetector(context, "face_detection_full_range.tflite", confidenceThreshold)
        DetectorBackend.MLKIT ->
            MLKitDetector(confidenceThreshold)
    }

    fun detect(context: Context, imageUri: String): DetectionResult =
        strategy.detect(context, imageUri)

    fun close() = strategy.close()
}
