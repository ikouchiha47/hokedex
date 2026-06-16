package com.hokedex.share

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

class ShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "HokedexShare"
        const val EVENT_SHARED_IMAGE = "hokedex:sharedImage"
        private var pendingImagePath: String? = null
        // Kept to emit hot-launch events; set when the module instance is created.
        @Volatile private var moduleInstance: ShareModule? = null

        fun storeIntent(intent: Intent?, context: Context) {
            val uri = extractImageUri(intent) ?: return
            pendingImagePath = copyContentUri(uri, context)
        }

        fun handleHotIntent(intent: Intent?, context: Context) {
            val uri = extractImageUri(intent) ?: return
            val path = copyContentUri(uri, context) ?: return
            pendingImagePath = path
            moduleInstance?.emitSharedImage(path)
        }

        private fun extractImageUri(intent: Intent?): Uri? {
            if (intent?.action != Intent.ACTION_SEND) return null
            val mime = intent.type ?: return null
            if (!mime.startsWith("image/")) return null
            @Suppress("DEPRECATION")
            return intent.getParcelableExtra(Intent.EXTRA_STREAM)
        }

        private fun copyContentUri(uri: Uri, context: Context): String? {
            return try {
                val dir = File(context.cacheDir, "share_intake")
                dir.mkdirs()
                val dest = File(dir, "shared_${System.currentTimeMillis()}.jpg")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(dest).use { output -> input.copyTo(output) }
                }
                dest.absolutePath
            } catch (e: Exception) {
                null
            }
        }
    }

    init {
        moduleInstance = this
    }

    override fun getName(): String = NAME

    fun emitSharedImage(path: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(EVENT_SHARED_IMAGE, Arguments.createMap().apply { putString("path", path) })
    }

    @ReactMethod
    fun getInitialSharedImage(promise: Promise) {
        promise.resolve(pendingImagePath)
    }

    @ReactMethod
    fun clearSharedImage(promise: Promise) {
        pendingImagePath = null
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) { /* no-op */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* no-op */ }
}
