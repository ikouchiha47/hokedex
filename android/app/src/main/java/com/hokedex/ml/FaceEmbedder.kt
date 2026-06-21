package com.hokedex.ml

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.net.Uri
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
private const val FACE_MARGIN = 0.20f   // 20% padding around the detected box
private const val GRAY = 128            // letterbox fill colour

class FaceEmbedder(context: Context) {

    private val interpreter: Interpreter
    private val detector: MediaPipeFaceDetector

    init {
        val model = loadModelFile(context, "facenet_512.tflite")
        val options = Interpreter.Options().apply { setNumThreads(2) }
        interpreter = Interpreter(model, options)

        val detectorOptions = MediaPipeFaceDetector.FaceDetectorOptions.builder()
            .setBaseOptions(
                BaseOptions.builder()
                    .setModelAssetPath("face_detection_short_range.tflite")
                    .build()
            )
            .setRunningMode(RunningMode.IMAGE)
            .setMinDetectionConfidence(0.3f)
            .build()
        detector = MediaPipeFaceDetector.createFromOptions(context, detectorOptions)
    }

    private fun loadModelFile(context: Context, name: String): MappedByteBuffer {
        val fd = context.assets.openFd(name)
        val stream = FileInputStream(fd.fileDescriptor)
        return stream.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
    }

    /**
     * Full pipeline:
     *   1. Load image from URI
     *   2. Detect face — if found, crop with FACE_MARGIN padding
     *   3. Letterbox-pad crop to INPUT_SIZExINPUT_SIZE on a gray canvas
     *   4. Normalise pixels to [-1, 1] and run FaceNet inference
     *   5. L2-normalise the embedding
     *
     * If no face is detected, the whole image is letterbox-padded (fallback).
     */
    private fun openImageStream(context: Context, imageUri: String): InputStream? {
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        val uri = Uri.parse(imageUri)
        return context.contentResolver.openInputStream(uri)
    }

    /**
     * Embed a specific face crop provided by the caller (normalized 0–1 coordinates).
     * Skips internal detection — used when the user has already selected which face to use.
     */
    fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray {
        val stream: InputStream = openImageStream(context, imageUri)
            ?: throw IllegalArgumentException("Cannot open image: $imageUri")
        val full = BitmapFactory.decodeStream(stream)
        stream.close()

        val imgW = full.width.toFloat()
        val imgH = full.height.toFloat()

        val marginX = width  * imgW * FACE_MARGIN
        val marginY = height * imgH * FACE_MARGIN

        val left   = (x * imgW - marginX).coerceAtLeast(0f)
        val top    = (y * imgH - marginY).coerceAtLeast(0f)
        val right  = ((x + width)  * imgW + marginX).coerceAtMost(imgW)
        val bottom = ((y + height) * imgH + marginY).coerceAtMost(imgH)

        val crop = Bitmap.createBitmap(full, left.toInt(), top.toInt(), (right - left).toInt(), (bottom - top).toInt())
        val padded = letterboxPad(crop, INPUT_SIZE)
        val input = bitmapToBuffer(padded)

        val output = Array(1) { FloatArray(512) }
        interpreter.run(input, output)
        return l2Normalize(output[0])
    }

    fun embed(context: Context, imageUri: String): FloatArray {
        val stream: InputStream = openImageStream(context, imageUri)
            ?: throw IllegalArgumentException("Cannot open image: $imageUri")
        val full = BitmapFactory.decodeStream(stream)
        stream.close()

        val faceCrop = detectAndCrop(full) ?: full
        val padded = letterboxPad(faceCrop, INPUT_SIZE)
        val input = bitmapToBuffer(padded)

        val output = Array(1) { FloatArray(512) }
        interpreter.run(input, output)

        return l2Normalize(output[0])
    }

    /**
     * Runs MediaPipe detection on the bitmap, picks the highest-confidence face,
     * expands the box by FACE_MARGIN on each side (clamped to image bounds),
     * and returns the cropped bitmap. Returns null if no face detected.
     */
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

        val left   = (bb.left   - marginX).coerceAtLeast(0f)
        val top    = (bb.top    - marginY).coerceAtLeast(0f)
        val right  = (bb.right  + marginX).coerceAtMost(w)
        val bottom = (bb.bottom + marginY).coerceAtMost(h)

        return Bitmap.createBitmap(
            bitmap,
            left.toInt(), top.toInt(),
            (right - left).toInt(), (bottom - top).toInt()
        )
    }

    /**
     * Scales the bitmap to fit within targetSize×targetSize preserving aspect ratio,
     * then centres it on a gray (128, 128, 128) canvas.
     */
    private fun letterboxPad(src: Bitmap, targetSize: Int): Bitmap {
        val scale = targetSize.toFloat() / maxOf(src.width, src.height)
        val scaledW = (src.width  * scale).toInt().coerceAtLeast(1)
        val scaledH = (src.height * scale).toInt().coerceAtLeast(1)

        val scaled = Bitmap.createScaledBitmap(src, scaledW, scaledH, true)

        val canvas_bmp = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(canvas_bmp)
        canvas.drawColor(Color.rgb(GRAY, GRAY, GRAY))

        val left = (targetSize - scaledW) / 2f
        val top  = (targetSize - scaledH) / 2f
        canvas.drawBitmap(scaled, left, top, null)

        return canvas_bmp
    }

    // Normalise pixel values to [-1, 1] as expected by FaceNet
    private fun bitmapToBuffer(bitmap: Bitmap): ByteBuffer {
        val buf = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * 4)
        buf.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

        for (px in pixels) {
            buf.putFloat(((px shr 16 and 0xFF) - 127.5f) / 128f) // R
            buf.putFloat(((px shr 8  and 0xFF) - 127.5f) / 128f) // G
            buf.putFloat(((px        and 0xFF) - 127.5f) / 128f) // B
        }

        buf.rewind()
        return buf
    }

    private fun l2Normalize(v: FloatArray): FloatArray {
        val norm = Math.sqrt(v.map { it * it }.sum().toDouble()).toFloat()
        return if (norm > 0f) FloatArray(v.size) { v[it] / norm } else v
    }

    fun close() {
        interpreter.close()
        detector.close()
    }
}
