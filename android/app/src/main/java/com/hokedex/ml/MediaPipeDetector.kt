package com.hokedex.ml

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facedetector.FaceDetector as MediaPipeFaceDetector
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

class MediaPipeDetector(
    context: Context,
    modelPath: String,
    private val confidenceThreshold: Float = 0.7f,
) : FaceDetectionStrategy {

    private val detector: MediaPipeFaceDetector

    init {
        val baseOptions = BaseOptions.builder()
            .setModelAssetPath(modelPath)
            .build()

        val options = MediaPipeFaceDetector.FaceDetectorOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.IMAGE)
            .setMinDetectionConfidence(0.3f)
            .build()

        detector = MediaPipeFaceDetector.createFromOptions(context, options)
    }

    override fun detect(context: Context, imageUri: String): DetectionResult {
        val stream: InputStream = openImageStream(context, imageUri)
            ?: return DetectionResult.NoSubject

        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()

        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = detector.detect(mpImage)
        val detections = result.detections()

        if (detections.isEmpty()) {
            Log.d("MediaPipeDetector", "no detections")
            return DetectionResult.NoSubject
        }

        Log.d("MediaPipeDetector", "${detections.size} detection(s):")
        detections.forEachIndexed { i, d ->
            val score = d.categories()[0].score()
            val bb = d.boundingBox()
            Log.d("MediaPipeDetector", "  [$i] score=${"%.3f".format(score)} x=${bb.left} y=${bb.top} w=${bb.width()} h=${bb.height()}")
        }

        if (detections.size > 1) {
            val boxes = detections
                .filter { it.categories()[0].score() >= confidenceThreshold }
                .map { d ->
                    val bb = d.boundingBox()
                    BoundingBox(
                        x = bb.left / bitmap.width,
                        y = bb.top / bitmap.height,
                        width = bb.width() / bitmap.width,
                        height = bb.height() / bitmap.height,
                    )
                }
            return when (boxes.size) {
                0 -> DetectionResult.NoSubject
                1 -> DetectionResult.Success(boxes[0])
                else -> DetectionResult.MultiSubject(boxes)
            }
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
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        val uri = Uri.parse(imageUri)
        return context.contentResolver.openInputStream(uri)
    }

    override fun close() = detector.close()
}
