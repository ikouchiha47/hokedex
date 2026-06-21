package com.hokedex.ingest

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.security.MessageDigest
import kotlin.math.cos
import kotlin.math.sqrt

data class IngestResult(
    val sha256: String,
    val phash: Long,
    val thumbnailRelativePath: String
)

class ImageProcessor {

    fun process(
        context: Context,
        imageUri: String,
        collectionRoot: String,
        entryNameSlug: String
    ): IngestResult {
        val uri = Uri.parse(imageUri)
        val stream: InputStream = context.contentResolver.openInputStream(uri)!!
        val bytes = stream.readBytes()
        stream.close()

        val sha256 = sha256Hex(bytes)
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        val phash = dctPhash(bitmap)

        val prefix = "${sha256.take(8)}_${entryNameSlug}"

        // Write to staging/ — caller moves to thumbnails/$year/ on confirm
        val stagingDir = File(collectionRoot, "staging").also { it.mkdirs() }
        val thumbFile = File(stagingDir, "${prefix}_thumb.jpg")
        val thumbWidth = 200
        val thumbHeight = (bitmap.height * thumbWidth.toFloat() / bitmap.width).toInt()
        val thumb = Bitmap.createScaledBitmap(bitmap, thumbWidth, thumbHeight, true)
        FileOutputStream(thumbFile).use { thumb.compress(Bitmap.CompressFormat.JPEG, 85, it) }

        val exif = ExifInterface(thumbFile.absolutePath)
        exif.setAttribute(ExifInterface.TAG_USER_COMMENT, "hokedex:original_sha256=$sha256")
        exif.saveAttributes()

        val thumbRelPath = "staging/${prefix}_thumb.jpg"

        return IngestResult(sha256, phash, thumbRelPath)
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { "%02x".format(it) }
    }

    /**
     * 8x8 DCT perceptual hash.
     * 1. Scale image to 32x32 greyscale
     * 2. Apply 2D DCT
     * 3. Take top-left 8x8 of DCT output (low frequencies)
     * 4. Compute median of those 64 values
     * 5. Each bit = 1 if value >= median, else 0
     * Returns a 64-bit Long.
     */
    private fun dctPhash(bitmap: Bitmap): Long {
        val size = 32
        val scaled = Bitmap.createScaledBitmap(bitmap, size, size, true)

        // Greyscale
        val pixels = FloatArray(size * size)
        for (y in 0 until size) for (x in 0 until size) {
            val px = scaled.getPixel(x, y)
            pixels[y * size + x] = (
                0.299f * ((px shr 16) and 0xFF) +
                0.587f * ((px shr 8)  and 0xFF) +
                0.114f * ( px         and 0xFF)
            )
        }

        // 2D DCT (separable: row then column)
        val dct = Array(size) { FloatArray(size) }
        val cosTable = Array(size) { u -> FloatArray(size) { x -> cos((2*x+1)*u*Math.PI/(2*size)).toFloat() } }

        for (u in 0 until size) for (v in 0 until size) {
            var sum = 0f
            for (x in 0 until size) for (y in 0 until size) {
                sum += pixels[y * size + x] * cosTable[u][x] * cosTable[v][y]
            }
            val cu = if (u == 0) 1f / sqrt(2f) else 1f
            val cv = if (v == 0) 1f / sqrt(2f) else 1f
            dct[u][v] = (2f / size) * cu * cv * sum
        }

        // Top-left 8x8, skip DC component at [0][0]
        val lowFreq = FloatArray(64)
        for (u in 0 until 8) for (v in 0 until 8) lowFreq[u * 8 + v] = dct[u][v]
        val median = lowFreq.sorted()[32]

        // Build 64-bit hash
        var hash = 0L
        for (i in 0 until 64) {
            if (lowFreq[i] >= median) hash = hash or (1L shl i)
        }
        return hash
    }
}
