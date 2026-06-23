package com.hokedex.ml

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

private const val INPUT_SIZE = 160
private const val FACE_MARGIN = 0.20f
private const val GRAY = 128

class PeoplePipeline(
    context: Context,
    private val strategy: FaceDetectionStrategy = MediaPipeDetector(
        context,
        ModelManager.modelPath(context, "blaze_face_full_range.tflite"),
        fromAssets = false,
    ),
) : EmbeddablePipeline<DetectionResult> {

    private val interpreter: Interpreter

    init {
        val model = FileInputStream(File(ModelManager.modelPath(context, "facenet_512.tflite")))
            .channel.map(FileChannel.MapMode.READ_ONLY, 0, File(ModelManager.modelPath(context, "facenet_512.tflite")).length())
        interpreter = Interpreter(model, Interpreter.Options().apply { setNumThreads(2) })
    }

    private fun openImageStream(context: Context, imageUri: String): InputStream? {
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        return context.contentResolver.openInputStream(Uri.parse(imageUri))
    }

    private fun loadBitmap(context: Context, imageUri: String): Bitmap {
        val stream = openImageStream(context, imageUri)
            ?: throw IllegalArgumentException("Cannot open image: $imageUri")
        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()
        return bitmap
    }

    override fun detect(context: Context, imageUri: String): DetectionResult =
        strategy.detect(context, imageUri)

    override fun embed(context: Context, imageUri: String): FloatArray {
        val bitmap = loadBitmap(context, imageUri)
        val faceCrop = cropBestFace(bitmap) ?: bitmap
        return runFaceNet(faceCrop)
    }

    override fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray {
        val bitmap = loadBitmap(context, imageUri)
        val imgW = bitmap.width.toFloat()
        val imgH = bitmap.height.toFloat()

        val marginX = width * imgW * FACE_MARGIN
        val marginY = height * imgH * FACE_MARGIN

        val left   = (x * imgW - marginX).coerceAtLeast(0f)
        val top    = (y * imgH - marginY).coerceAtLeast(0f)
        val right  = ((x + width)  * imgW + marginX).coerceAtMost(imgW)
        val bottom = ((y + height) * imgH + marginY).coerceAtMost(imgH)

        val crop = Bitmap.createBitmap(bitmap, left.toInt(), top.toInt(), (right - left).toInt(), (bottom - top).toInt())
        return runFaceNet(crop)
    }

    private fun cropBestFace(bitmap: Bitmap): Bitmap? {
        val result = strategy.detectBitmap(bitmap)
        val box = when (result) {
            is DetectionResult.Success -> result.crop
            is DetectionResult.LowConfidence -> result.crop
            else -> return null
        }

        val w = bitmap.width.toFloat()
        val h = bitmap.height.toFloat()
        val marginX = box.width * w * FACE_MARGIN
        val marginY = box.height * h * FACE_MARGIN

        val left   = (box.x * w - marginX).coerceAtLeast(0f)
        val top    = (box.y * h - marginY).coerceAtLeast(0f)
        val right  = ((box.x + box.width)  * w + marginX).coerceAtMost(w)
        val bottom = ((box.y + box.height) * h + marginY).coerceAtMost(h)

        return Bitmap.createBitmap(bitmap, left.toInt(), top.toInt(), (right - left).toInt(), (bottom - top).toInt())
    }

    private fun runFaceNet(src: Bitmap): FloatArray {
        val padded = letterboxPad(src, INPUT_SIZE)
        val input = bitmapToBuffer(padded)
        val output = Array(1) { FloatArray(512) }
        interpreter.run(input, output)
        return l2Normalize(output[0])
    }

    private fun letterboxPad(src: Bitmap, targetSize: Int): Bitmap {
        val scale = targetSize.toFloat() / maxOf(src.width, src.height)
        val scaledW = (src.width  * scale).toInt().coerceAtLeast(1)
        val scaledH = (src.height * scale).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(src, scaledW, scaledH, true)

        val out = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        canvas.drawColor(Color.rgb(GRAY, GRAY, GRAY))
        canvas.drawBitmap(scaled, (targetSize - scaledW) / 2f, (targetSize - scaledH) / 2f, null)
        return out
    }

    private fun bitmapToBuffer(bitmap: Bitmap): ByteBuffer {
        val buf = ByteBuffer.allocateDirect(INPUT_SIZE * INPUT_SIZE * 3 * 4)
        buf.order(ByteOrder.nativeOrder())
        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)
        for (px in pixels) {
            buf.putFloat(((px shr 16 and 0xFF) - 127.5f) / 128f)
            buf.putFloat(((px shr 8  and 0xFF) - 127.5f) / 128f)
            buf.putFloat(((px        and 0xFF) - 127.5f) / 128f)
        }
        buf.rewind()
        return buf
    }

    private fun l2Normalize(v: FloatArray): FloatArray {
        val norm = kotlin.math.sqrt(v.map { it * it }.sum().toDouble()).toFloat()
        return if (norm > 0f) FloatArray(v.size) { v[it] / norm } else v
    }

    override fun close() {
        strategy.close()
        interpreter.close()
    }
}
