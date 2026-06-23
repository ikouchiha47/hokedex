package com.hokedex.ml

sealed class MLResult

data class BoundingBox(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
)

sealed class DetectionResult : MLResult() {
    object NoSubject : DetectionResult()
    data class MultiSubject(val crops: List<BoundingBox>) : DetectionResult()
    data class LowConfidence(val crop: BoundingBox, val confidence: Float) : DetectionResult()
    data class Success(val crop: BoundingBox) : DetectionResult()
}

data class TextLine(
    val text: String,
    val boundingBox: BoundingBox,
    val confidence: Float,
)

data class TextBlock(
    val text: String,
    val boundingBox: BoundingBox,
    val script: String?,
    val lines: List<TextLine>,
)

data class TextResult(
    val fullText: String,
    val blocks: List<TextBlock>,
) : MLResult()
