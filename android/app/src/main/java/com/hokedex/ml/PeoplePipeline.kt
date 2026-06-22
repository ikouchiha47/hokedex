package com.hokedex.ml

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facedetector.FaceDetector as MediaPipeFaceDetector
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

private const val INPUT_SIZE = 160
private const val FACE_MARGIN = 0.20f
private const val GRAY = 128
private const val TAG = "PeoplePipeline"

class PeoplePipeline(context: Context) : MLPipeline {

    private val detector: MediaPipeFaceDetector
    private val interpreter: Interpreter

    init {
        val detectorModel = loadModelFromFile(File(ModelManager.modelPath(context, "blaze_face_full_range.tflite")))
        val detectorOptions = MediaPipeFaceDetector.FaceDetectorOptions.builder()
            .setBaseOptions(
                BaseOptions.builder()
                    .setModelAssetBuffer(detectorModel)
                    .build()
            )
            .setRunningMode(RunningMode.IMAGE)
            .setMinDetectionConfidence(0.3f)
            .build()
        detector = MediaPipeFaceDetector.createFromOptions(context, detectorOptions)

        val faceNetModel = loadModelFromFile(File(ModelManager.modelPath(context, "facenet_512.tflite")))
        interpreter = Interpreter(faceNetModel, Interpreter.Options().apply { setNumThreads(2) })
    }

    private fun loadModelFromFile(file: File): MappedByteBuffer =
        FileInputStream(file).channel.map(FileChannel.MapMode.READ_ONLY, 0, file.length())

    private fun openImageStream(context: Context, imageUri: String): InputStream? {
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        val uri = Uri.parse(imageUri)
        return context.contentResolver.openInputStream(uri)
    }

    private fun loadBitmap(context: Context, imageUri: String): Bitmap {
        val stream = openImageStream(context, imageUri)
            ?: throw IllegalArgumentException("Cannot open image: $imageUri")
        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()
        return bitmap
    }

    override fun detect(context: Context, imageUri: String): DetectionResult {
        val bitmap = loadBitmap(context, imageUri)
        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = detector.detect(mpImage)
        val detections = result.detections()

        if (detections.isEmpty()) {
            Log.d(TAG, "no detections")
            return DetectionResult.NoSubject
        }

        val confidenceThreshold = 0.7f

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

    override fun embed(context: Context, imageUri: String): FloatArray {
        val bitmap = loadBitmap(context, imageUri)
        val faceCrop = detectAndCrop(bitmap) ?: bitmap
        val padded = letterboxPad(faceCrop, INPUT_SIZE)
        val input = bitmapToBuffer(padded)

        val output = Array(1) { FloatArray(512) }
        interpreter.run(input, output)
        return l2Normalize(output[0])
    }

    override fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray {
        val bitmap = loadBitmap(context, imageUri)
        val imgW = bitmap.width.toFloat()
        val imgH = bitmap.height.toFloat()

        val marginX = width * imgW * FACE_MARGIN
        val marginY = height * imgH * FACE_MARGIN

        val left = (x * imgW - marginX).coerceAtLeast(0f)
        val top = (y * imgH - marginY).coerceAtLeast(0f)
        val right = ((x + width) * imgW + marginX).coerceAtMost(imgW)
        val bottom = ((y + height) * imgH + marginY).coerceAtMost(imgH)

        val crop = Bitmap.createBitmap(bitmap, left.toInt(), top.toInt(), (right - left).toInt(), (bottom - top).toInt())
        val padded = letterboxPad(crop, INPUT_SIZE)
        val input = bitmapToBuffer(padded)

        val output = Array(1) { FloatArray(512) }
        interpreter.run(input, output)
        return l2Normalize(output[0])
    }

    private fun detectAndCrop(bitmap: Bitmap): Bitmap? {
        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = detector.detect(mpImage)
        val detections = result.detections()
        if (detections.isEmpty()) return null

        val best = detections.maxByOrNull { it.categories()[0].score() } ?: return null
        val bb = best.boundingBox()

        val w = bitmap.width.toFloat()
        val h = bitmap.height.toFloat()

        val marginX = bb.width() * FACE_MARGIN
        val marginY = bb.height() * FACE_MARGIN

        val left = (bb.left - marginX).coerceAtLeast(0f)
        val top = (bb.top - marginY).coerceAtLeast(0f)
        val right = (bb.right + marginX).coerceAtMost(w)
        val bottom = (bb.bottom + marginY).coerceAtMost(h)

        return Bitmap.createBitmap(
            bitmap,
            left.toInt(), top.toInt(),
            (right - left).toInt(), (bottom - top).toInt(),
        )
    }

    private fun letterboxPad(src: Bitmap, targetSize: Int): Bitmap {
        val scale = targetSize.toFloat() / maxOf(src.width, src.height)
        val scaledW = (src.width * scale).toInt().coerceAtLeast(1)
        val scaledH = (src.height * scale).toInt().coerceAtLeast(1)

        val scaled = Bitmap.createScaledBitmap(src, scaledW, scaledH, true)

        val canvasBmp = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(canvasBmp)
        canvas.drawColor(Color.rgb(GRAY, GRAY, GRAY))

        val left = (targetSize - scaledW) / 2f
        val top = (targetSize - scaledH) / 2f
        canvas.drawBitmap(scaled, left, top, null)

        return canvasBmp
    }

    private fun bitmapToBuffer(bitmap: Bitmap): ByteBuffer {
        val buf = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * 4)
        buf.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

        for (px in pixels) {
            buf.putFloat(((px shr 16 and 0xFF) - 127.5f) / 128f)
            buf.putFloat(((px shr 8 and 0xFF) - 127.5f) / 128f)
            buf.putFloat(((px and 0xFF) - 127.5f) / 128f)
        }

        buf.rewind()
        return buf
    }

    private fun l2Normalize(v: FloatArray): FloatArray {
        val norm = kotlin.math.sqrt(v.map { it * it }.sum().toDouble()).toFloat()
        return if (norm > 0f) FloatArray(v.size) { v[it] / norm } else v
    }

    override fun close() {
        detector.close()
        interpreter.close()
    }
}
