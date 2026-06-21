package com.hokedex.ml

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicReference

class MLKitDetector(
    private val confidenceThreshold: Float = 0.7f,
) : FaceDetectionStrategy {

    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .setMinFaceSize(0.05f)
            .build()
    )

    override fun detect(context: Context, imageUri: String): DetectionResult {
        val stream: InputStream = openImageStream(context, imageUri)
            ?: return DetectionResult.NoSubject

        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()

        val image = InputImage.fromBitmap(bitmap, 0)

        val resultRef = AtomicReference<DetectionResult>(DetectionResult.NoSubject)
        val latch = CountDownLatch(1)

        detector.process(image)
            .addOnSuccessListener { faces ->
                Log.d("MLKitDetector", "${faces.size} face(s) detected")
                faces.forEachIndexed { i, face ->
                    val bb = face.boundingBox
                    Log.d("MLKitDetector", "  [$i] trackingId=${face.trackingId} x=${bb.left} y=${bb.top} w=${bb.width()} h=${bb.height()}")
                }

                if (faces.isEmpty()) {
                    resultRef.set(DetectionResult.NoSubject)
                    latch.countDown()
                    return@addOnSuccessListener
                }

                val boxes = faces.map { face ->
                    val bb = face.boundingBox
                    BoundingBox(
                        x = bb.left.toFloat() / bitmap.width,
                        y = bb.top.toFloat() / bitmap.height,
                        width = bb.width().toFloat() / bitmap.width,
                        height = bb.height().toFloat() / bitmap.height,
                    )
                }

                resultRef.set(
                    when (boxes.size) {
                        1 -> DetectionResult.Success(boxes[0])
                        else -> DetectionResult.MultiSubject(boxes)
                    }
                )
                latch.countDown()
            }
            .addOnFailureListener { e ->
                Log.e("MLKitDetector", "detection failed", e)
                resultRef.set(DetectionResult.NoSubject)
                latch.countDown()
            }

        latch.await()
        return resultRef.get()
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
