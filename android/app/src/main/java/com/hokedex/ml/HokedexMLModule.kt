package com.hokedex.ml

import com.facebook.react.bridge.*
import java.util.concurrent.Executors

class HokedexMLModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HokedexML"

    // Single background thread — all ML inference runs here, never on the calling thread
    private val executor = Executors.newSingleThreadExecutor()

    // Lazy init: models load on first call, not at module registration time
    private val detector by lazy { FaceDetector(reactContext) }
    private val embedder by lazy { FaceEmbedder(reactContext) }

    @ReactMethod
    fun detect(imageUri: String, categoryId: String, promise: Promise) {
        if (categoryId != "people") {
            promise.reject("UNSUPPORTED_CATEGORY", "Category '$categoryId' is not supported")
            return
        }

        executor.execute {
            try {
                val result = detector.detect(reactContext, imageUri)
                promise.resolve(result.toWritableMap())
            } catch (e: Exception) {
                promise.reject("DETECTION_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun embed(cropUri: String, categoryId: String, promise: Promise) {
        if (categoryId != "people") {
            promise.reject("UNSUPPORTED_CATEGORY", "Category '$categoryId' is not supported")
            return
        }

        executor.execute {
            try {
                val embedding = embedder.embed(reactContext, cropUri)
                val arr = Arguments.createArray()
                embedding.forEach { arr.pushDouble(it.toDouble()) }
                promise.resolve(arr)
            } catch (e: Exception) {
                promise.reject("EMBEDDING_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun embedCrop(imageUri: String, x: Double, y: Double, width: Double, height: Double, categoryId: String, promise: Promise) {
        if (categoryId != "people") {
            promise.reject("UNSUPPORTED_CATEGORY", "Category '$categoryId' is not supported")
            return
        }

        executor.execute {
            try {
                val embedding = embedder.embedCrop(reactContext, imageUri, x.toFloat(), y.toFloat(), width.toFloat(), height.toFloat())
                val arr = Arguments.createArray()
                embedding.forEach { arr.pushDouble(it.toDouble()) }
                promise.resolve(arr)
            } catch (e: Exception) {
                promise.reject("EMBEDDING_ERROR", e.message, e)
            }
        }
    }

    private fun DetectionResult.toWritableMap(): WritableMap = when (this) {
        is DetectionResult.NoSubject -> Arguments.createMap().apply {
            putString("type", "NO_SUBJECT")
        }
        is DetectionResult.MultiSubject -> Arguments.createMap().apply {
            putString("type", "MULTI_SUBJECT")
            putArray("crops", Arguments.createArray().also { arr ->
                crops.forEach { arr.pushMap(it.toWritableMap()) }
            })
        }
        is DetectionResult.LowConfidence -> Arguments.createMap().apply {
            putString("type", "LOW_CONFIDENCE")
            putMap("crop", crop.toWritableMap())
            putDouble("confidence", confidence.toDouble())
        }
        is DetectionResult.Success -> Arguments.createMap().apply {
            putString("type", "SUCCESS")
            putMap("crop", crop.toWritableMap())
        }
    }

    private fun BoundingBox.toWritableMap(): WritableMap = Arguments.createMap().apply {
        putDouble("x", x.toDouble())
        putDouble("y", y.toDouble())
        putDouble("width", width.toDouble())
        putDouble("height", height.toDouble())
    }
}
