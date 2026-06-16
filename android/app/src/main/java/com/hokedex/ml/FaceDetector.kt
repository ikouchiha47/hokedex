package com.hokedex.ml

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facedetector.FaceDetector as MediaPipeFaceDetector
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

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

class FaceDetector(context: Context, private val confidenceThreshold: Float = 0.7f) {

    private val detector: MediaPipeFaceDetector

    init {
        val baseOptions = BaseOptions.builder()
            .setModelAssetPath("face_detection_short_range.tflite")
            .build()

        // FaceDetectorOptions is a nested class of FaceDetector in MediaPipe Tasks
        val options = MediaPipeFaceDetector.FaceDetectorOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.IMAGE)
            // Low floor — confidence tiering is applied in code below
            .setMinDetectionConfidence(0.3f)
            .build()

        detector = MediaPipeFaceDetector.createFromOptions(context, options)
    }

    fun detect(context: Context, imageUri: String): DetectionResult {
        val stream: InputStream = openImageStream(context, imageUri)
            ?: return DetectionResult.NoSubject

        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()

        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = detector.detect(mpImage)
        val detections = result.detections()

        if (detections.isEmpty()) return DetectionResult.NoSubject

        if (detections.size > 1) {
            val boxes = detections.map { d ->
                val bb = d.boundingBox()
                BoundingBox(
                    x = bb.left / bitmap.width,
                    y = bb.top / bitmap.height,
                    width = bb.width() / bitmap.width,
                    height = bb.height() / bitmap.height,
                )
            }
            return DetectionResult.MultiSubject(boxes)
        }

        val detection = detections[0]
        val confidence = detection.categories()[0].score()
        val bb = detection.boundingBox()
        val box = BoundingBox(
            x = bb.left / bitmap.width,
            y = bb.top / bitmap.height,
            width = bb.width() / bitmap.width,
            height = bb.height() / bitmap.height,
        )

        return if (confidence >= confidenceThreshold) {
            DetectionResult.Success(box)
        } else {
            DetectionResult.LowConfidence(box, confidence)
        }
    }

    private fun openImageStream(context: Context, imageUri: String): InputStream? {
        // Plain file path (e.g. from share_intake cache)
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        val uri = Uri.parse(imageUri)
        return context.contentResolver.openInputStream(uri)
    }

    fun close() = detector.close()
}
