package com.hokedex.share

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

/**
 * ShareModule — bridges Android Share Sheet intents to JavaScript.
 *
 * Cold launch: JS calls getInitialSharedImage() once after boot to retrieve
 * the URI from the launching intent (if any), then calls clearSharedImage().
 *
 * Hot launch: onNewIntent in MainActivity calls handleIntent(), which copies
 * the content URI to a temp file and emits "hokedex:sharedImage" to JS.
 */
class ShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "HokedexShare"
        const val EVENT_SHARED_IMAGE = "hokedex:sharedImage"
        private var pendingImagePath: String? = null

        /** Called from MainActivity.onCreate / onNewIntent on the UI thread. */
        fun storeIntent(intent: Intent?, context: ReactApplicationContext?) {
            val uri = extractImageUri(intent) ?: return
            val path = copyContentUri(uri, context ?: return) ?: return
            pendingImagePath = path
        }

        /** Same as storeIntent but also fires the JS event for hot launches. */
        fun handleHotIntent(intent: Intent?, context: ReactApplicationContext?) {
            val uri = extractImageUri(intent) ?: return
            val path = copyContentUri(uri, context ?: return) ?: return
            pendingImagePath = path
            // Emit to JS
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_SHARED_IMAGE, Arguments.createMap().apply { putString("path", path) })
        }

        private fun extractImageUri(intent: Intent?): Uri? {
            if (intent?.action != Intent.ACTION_SEND) return null
            val mime = intent.type ?: return null
            if (!mime.startsWith("image/")) return null
            return intent.getParcelableExtra(Intent.EXTRA_STREAM)
        }

        private fun copyContentUri(uri: Uri, context: ReactApplicationContext): String? {
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

    override fun getName(): String = NAME

    @ReactMethod
    fun getInitialSharedImage(promise: Promise) {
        promise.resolve(pendingImagePath)
    }

    @ReactMethod
    fun clearSharedImage(promise: Promise) {
        pendingImagePath = null
        promise.resolve(null)
    }

    /** Required for RN New Architecture addListener/removeListeners support. */
    @ReactMethod
    fun addListener(eventName: String) { /* no-op */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* no-op */ }
}
