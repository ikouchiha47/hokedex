package com.hokedex.ml

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

private const val TAG = "ModelManager"

data class ModelSpec(
    val filename: String,
    val url: String,
    val fallbackUrl: String? = null,
)

val MODELS = listOf(
    ModelSpec(
        filename = "blaze_face_full_range.tflite",
        url = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite",
    ),
    ModelSpec(
        filename = "facenet_512.tflite",
        url = "https://github.com/parodevstudios/hokedex/releases/download/v1.5.0/facenet_512.tflite",
    ),
)

val MODEL_SPECS: Map<String, List<ModelSpec>> = mapOf(
    "people" to listOf(
        ModelSpec(
            filename = "blaze_face_full_range.tflite",
            url = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite",
        ),
        ModelSpec(
            filename = "facenet_512.tflite",
            url = "https://github.com/parodevstudios/hokedex/releases/download/v1.5.0/facenet_512.tflite",
        ),
    ),
)

object ModelManager {

    fun modelsDir(context: Context): File =
        File(context.filesDir, "models").also { it.mkdirs() }

    fun modelPath(context: Context, filename: String): String =
        File(modelsDir(context), filename).absolutePath

    fun modelsReady(context: Context): Boolean =
        MODELS.all { File(modelsDir(context), it.filename).exists() }

    fun modelsReady(context: Context, categoryId: String): Boolean =
        MODEL_SPECS[categoryId]?.all { File(modelsDir(context), it.filename).exists() } ?: false

    /**
     * Downloads all missing models sequentially.
     * Progress is reported as 0–100 across the total bytes of all models.
     * Calls onProgress on a background thread — callers must marshal to main if needed.
     */
    fun downloadModels(
        context: Context,
        onProgress: (percent: Int) -> Unit,
        onDone: () -> Unit,
        onError: (msg: String) -> Unit,
    ) {
        val missing = MODELS.filter { !File(modelsDir(context), it.filename).exists() }
        if (missing.isEmpty()) { onDone(); return }

        Thread {
            try {
                // Two-pass: first get total size across all missing models
                val sizes = missing.map { spec ->
                    val conn = URL(spec.url).openConnection() as HttpURLConnection
                    conn.requestMethod = "HEAD"
                    conn.connect()
                    val len = conn.contentLengthLong
                    conn.disconnect()
                    len.coerceAtLeast(1L)
                }
                val totalBytes = sizes.sum().toFloat()
                var downloadedBytes = 0L

                missing.forEachIndexed { i, spec ->
                    val dest = File(modelsDir(context), spec.filename)
                    val tmp  = File(modelsDir(context), "${spec.filename}.tmp")

                    try {
                        downloadFile(spec.url, tmp, sizes[i]) { chunkBytes ->
                            downloadedBytes += chunkBytes
                            onProgress(((downloadedBytes / totalBytes) * 100).toInt().coerceIn(0, 100))
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Primary URL failed for ${spec.filename}, trying fallback", e)
                        val fallback = spec.fallbackUrl
                        if (fallback != null) {
                            downloadFile(fallback, tmp, sizes[i]) { chunkBytes ->
                                downloadedBytes += chunkBytes
                                onProgress(((downloadedBytes / totalBytes) * 100).toInt().coerceIn(0, 100))
                            }
                        } else {
                            tmp.delete()
                            throw e
                        }
                    }

                    tmp.renameTo(dest)
                    Log.d(TAG, "Model ready: ${dest.absolutePath}")
                }

                onDone()
            } catch (e: Exception) {
                Log.e(TAG, "Model download failed", e)
                onError(e.message ?: "Download failed")
            }
        }.start()
    }

    fun downloadModels(
        context: Context,
        categoryId: String,
        onProgress: (percent: Int) -> Unit,
        onDone: () -> Unit,
        onError: (msg: String) -> Unit,
    ) {
        val specs = MODEL_SPECS[categoryId]
        if (specs == null) { onError("Unknown category '$categoryId'"); return }
        val missing = specs.filter { !File(modelsDir(context), it.filename).exists() }
        if (missing.isEmpty()) { onDone(); return }

        Thread {
            try {
                val sizes = missing.map { spec ->
                    val conn = URL(spec.url).openConnection() as HttpURLConnection
                    conn.requestMethod = "HEAD"
                    conn.connect()
                    val len = conn.contentLengthLong
                    conn.disconnect()
                    len.coerceAtLeast(1L)
                }
                val totalBytes = sizes.sum().toFloat()
                var downloadedBytes = 0L

                missing.forEachIndexed { i, spec ->
                    val dest = File(modelsDir(context), spec.filename)
                    val tmp  = File(modelsDir(context), "${spec.filename}.tmp")

                    try {
                        downloadFile(spec.url, tmp, sizes[i]) { chunkBytes ->
                            downloadedBytes += chunkBytes
                            onProgress(((downloadedBytes / totalBytes) * 100).toInt().coerceIn(0, 100))
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Primary URL failed for ${spec.filename}, trying fallback", e)
                        val fallback = spec.fallbackUrl
                        if (fallback != null) {
                            downloadFile(fallback, tmp, sizes[i]) { chunkBytes ->
                                downloadedBytes += chunkBytes
                                onProgress(((downloadedBytes / totalBytes) * 100).toInt().coerceIn(0, 100))
                            }
                        } else {
                            tmp.delete()
                            throw e
                        }
                    }

                    tmp.renameTo(dest)
                    Log.d(TAG, "Model ready: ${dest.absolutePath}")
                }

                onDone()
            } catch (e: Exception) {
                Log.e(TAG, "Model download failed for category '$categoryId'", e)
                onError(e.message ?: "Download failed")
            }
        }.start()
    }

    private fun downloadFile(
        urlStr: String,
        dest: File,
        expectedBytes: Long,
        onChunk: (Long) -> Unit,
    ) {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout    = 30_000
        conn.instanceFollowRedirects = true
        conn.connect()

        if (conn.responseCode !in 200..299) {
            conn.disconnect()
            throw Exception("HTTP ${conn.responseCode} for $urlStr")
        }

        val buf = ByteArray(8 * 1024)
        conn.inputStream.use { input ->
            FileOutputStream(dest).use { output ->
                var read: Int
                while (input.read(buf).also { read = it } != -1) {
                    output.write(buf, 0, read)
                    onChunk(read.toLong())
                }
            }
        }
        conn.disconnect()
    }
}
