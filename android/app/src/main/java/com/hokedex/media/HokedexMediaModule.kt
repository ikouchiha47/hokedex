package com.hokedex.media

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class HokedexMediaModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val RC_PICK   = 7842
        private const val RC_CAMERA = 7843
    }

    private var pendingPromise: Promise? = null
    private var pendingCameraFile: File? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = "HokedexMedia"

    // ---------------------------------------------------------------------------
    // Gallery pick — system photo picker, no permission dialog
    // ---------------------------------------------------------------------------

    @ReactMethod
    fun pickImageFromGallery(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        pendingPromise = promise

        val intent = ActivityResultContracts.PickVisualMedia()
            .createIntent(activity, PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        activity.startActivityForResult(intent, RC_PICK)
    }

    // ---------------------------------------------------------------------------
    // Camera capture
    // We write to a FileProvider URI (our cache dir) so the camera app gets
    // explicit write permission. After capture we copy into MediaStore to get
    // a stable public content:// URI as original_path.
    // ---------------------------------------------------------------------------

    @ReactMethod
    fun capturePhoto(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        val tempFile = File(reactContext.cacheDir, "hkdx_cam_${System.currentTimeMillis()}.jpg")
        val fileProviderUri: Uri = FileProvider.getUriForFile(
            reactContext,
            "${reactContext.packageName}.fileprovider",
            tempFile
        )

        pendingPromise = promise
        pendingCameraFile = tempFile

        val intent = ActivityResultContracts.TakePicture()
            .createIntent(reactContext, fileProviderUri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        activity.startActivityForResult(intent, RC_CAMERA)
    }

    // ---------------------------------------------------------------------------
    // Result handler
    // ---------------------------------------------------------------------------

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            RC_PICK   -> handlePickResult(resultCode, data)
            RC_CAMERA -> handleCameraResult(resultCode)
        }
    }

    private fun handlePickResult(resultCode: Int, data: Intent?) {
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.reject("PICKER_CANCELLED", "User cancelled")
            return
        }

        val contentUri: Uri = data.data!!

        try {
            reactContext.contentResolver.takePersistableUriPermission(
                contentUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
        } catch (_: Exception) {}

        resolveWithCopy(promise, contentUri, "hkdx_pick")
    }

    private fun handleCameraResult(resultCode: Int) {
        val promise = pendingPromise ?: return
        val tempFile = pendingCameraFile ?: return
        pendingPromise = null
        pendingCameraFile = null

        if (resultCode != Activity.RESULT_OK) {
            tempFile.delete()
            promise.reject("CAMERA_CANCELLED", "User cancelled")
            return
        }

        if (!tempFile.exists() || tempFile.length() == 0L) {
            promise.reject("CAMERA_ERROR", "Camera did not write the photo")
            return
        }

        // Insert into MediaStore so the photo appears in DCIM/Camera and we get a stable URI
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, tempFile.name)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "DCIM/Camera")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val mediaUri = reactContext.contentResolver
            .insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
        if (mediaUri == null) {
            // MediaStore insert failed — fall back to serving from cache
            promise.reject("MEDIA_ERROR", "Could not insert photo into MediaStore")
            return
        }

        try {
            reactContext.contentResolver.openOutputStream(mediaUri)!!.use { out ->
                tempFile.inputStream().use { it.copyTo(out) }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                reactContext.contentResolver.update(
                    mediaUri,
                    ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) },
                    null, null
                )
            }
        } catch (e: Exception) {
            reactContext.contentResolver.delete(mediaUri, null, null)
            promise.reject("WRITE_ERROR", "Could not write photo to MediaStore: ${e.message}")
            return
        }

        val map = Arguments.createMap().apply {
            putString("contentUri", mediaUri.toString())
            putString("tempPath", "file://${tempFile.absolutePath}")
        }
        promise.resolve(map)
    }

    private fun resolveWithCopy(promise: Promise, contentUri: Uri, prefix: String) {
        val tempFile = File(reactContext.cacheDir, "${prefix}_${System.currentTimeMillis()}.jpg")
        try {
            reactContext.contentResolver.openInputStream(contentUri)!!.use { input ->
                tempFile.outputStream().use { output -> input.copyTo(output) }
            }
        } catch (e: Exception) {
            promise.reject("READ_ERROR", "Could not read image: ${e.message}")
            return
        }

        val map = Arguments.createMap().apply {
            putString("contentUri", contentUri.toString())
            putString("tempPath", "file://${tempFile.absolutePath}")
        }
        promise.resolve(map)
    }

    override fun onNewIntent(intent: Intent) {}
}
