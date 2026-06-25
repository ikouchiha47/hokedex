package com.hokedex.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.hokedex.MainApplication

class FaceProcessingWorker(
  context: Context,
  params: WorkerParameters,
) : CoroutineWorker(context, params) {

  override suspend fun doWork(): Result {
    return try {
      if (emitDrainEvent()) Result.success() else Result.retry()
    } catch (e: Exception) {
      if (runAttemptCount < 3) Result.retry() else Result.failure()
    }
  }

  private fun emitDrainEvent(): Boolean {
    val app = applicationContext as? MainApplication ?: return false
    val reactContext = app.reactHost.currentReactContext ?: return false
    if (!reactContext.hasActiveReactInstance()) return false
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("HokedexDrainQueue", null)
    return true
  }
}
