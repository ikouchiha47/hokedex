package com.hokedex.ml

data class BoundingBox(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
)

sealed class DetectionResult {
    object NoSubject : DetectionResult()
    data class MultiSubject(val crops: List<BoundingBox>) : DetectionResult()
    data class LowConfidence(val crop: BoundingBox, val confidence: Float) : DetectionResult()
    data class Success(val crop: BoundingBox) : DetectionResult()
}
