package com.hokedex.ml

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import androidx.work.*
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class HokedexMLModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HokedexML"

    private val executor = Executors.newSingleThreadExecutor()

    init {
        MLRegistry.register("people", PeoplePipeline(reactContext))
    }

    @ReactMethod
    fun checkModelsReady(promise: Promise) {
        promise.resolve(ModelManager.modelsReady(reactContext))
    }

    @ReactMethod
    fun downloadModels(promise: Promise) {
        ModelManager.downloadModels(
            context    = reactContext,
            onProgress = { percent ->
                val params = Arguments.createMap().apply { putInt("percent", percent) }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("hokedex:modelProgress", params)
            },
            onDone = {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("hokedex:modelReady", null)
                promise.resolve(true)
            },
            onError = { msg ->
                val request = OneTimeWorkRequestBuilder<ModelDownloadWorker>()
                    .setConstraints(
                        Constraints.Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build()
                    )
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                    .build()
                WorkManager.getInstance(reactContext).enqueueUniqueWork(
                    "model_download",
                    ExistingWorkPolicy.REPLACE,
                    request,
                )
                promise.reject("DOWNLOAD_ERROR", msg)
            },
        )
    }

    @ReactMethod
    fun downloadModelsForCategory(categoryId: String, promise: Promise) {
        ModelManager.downloadModels(
            context    = reactContext,
            categoryId = categoryId,
            onProgress = { percent ->
                val params = Arguments.createMap().apply { putInt("percent", percent) }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("hokedex:modelProgress", params)
            },
            onDone = {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("hokedex:modelReady", null)
                promise.resolve(true)
            },
            onError = { msg ->
                val request = OneTimeWorkRequestBuilder<ModelDownloadWorker>()
                    .setConstraints(
                        Constraints.Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build()
                    )
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                    .build()
                WorkManager.getInstance(reactContext).enqueueUniqueWork(
                    "model_download_$categoryId",
                    ExistingWorkPolicy.REPLACE,
                    request,
                )
                promise.reject("DOWNLOAD_ERROR", msg)
            },
        )
    }

    @ReactMethod
    fun detect(imageUri: String, categoryId: String, promise: Promise) {
        val pipeline = MLRegistry.get(categoryId)
            ?: run { promise.reject("UNSUPPORTED_CATEGORY", "No pipeline for '$categoryId'"); return }

        executor.execute {
            try {
                val result = pipeline.detect(reactContext, imageUri)
                promise.resolve(result.toWritableMap())
            } catch (e: Exception) {
                promise.reject("DETECTION_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun embed(cropUri: String, categoryId: String, promise: Promise) {
        val pipeline = MLRegistry.get(categoryId)
            ?: run { promise.reject("UNSUPPORTED_CATEGORY", "No pipeline for '$categoryId'"); return }

        executor.execute {
            try {
                val embedding = pipeline.embed(reactContext, cropUri)
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
        val pipeline = MLRegistry.get(categoryId)
            ?: run { promise.reject("UNSUPPORTED_CATEGORY", "No pipeline for '$categoryId'"); return }

        executor.execute {
            try {
                val embedding = pipeline.embedCrop(reactContext, imageUri, x.toFloat(), y.toFloat(), width.toFloat(), height.toFloat())
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

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        MLRegistry.closeAll()
    }
}
