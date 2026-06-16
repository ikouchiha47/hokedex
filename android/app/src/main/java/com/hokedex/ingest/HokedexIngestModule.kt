package com.hokedex.ingest

import com.facebook.react.bridge.*
import java.util.concurrent.Executors

class HokedexIngestModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HokedexIngest"

    private val executor = Executors.newSingleThreadExecutor()
    private val processor = ImageProcessor()

    @ReactMethod
    fun getCollectionRoot(promise: Promise) {
        val root = reactContext.getExternalFilesDir(null)?.absolutePath
            ?: reactContext.filesDir.absolutePath
        promise.resolve(root)
    }

    @ReactMethod
    fun processImage(imageUri: String, collectionRoot: String, entryNameSlug: String, promise: Promise) {
        executor.execute {
            try {
                val result = processor.process(reactContext, imageUri, collectionRoot, entryNameSlug)
                val map = Arguments.createMap().apply {
                    putString("sha256", result.sha256)
                    // pHash is a 64-bit Long. JS Number only has 53-bit integer precision,
                    // so we transmit as decimal string and let SQLite store it as INTEGER.
                    // Hamming distance comparisons happen in SQL (bitwise ops), never in JS.
                    putString("phash", result.phash.toString())
                    putString("thumbnailRelativePath", result.thumbnailRelativePath)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("INGEST_ERROR", e.message, e)
            }
        }
    }
}
