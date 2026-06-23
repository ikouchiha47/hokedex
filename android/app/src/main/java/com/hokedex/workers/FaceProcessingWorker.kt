package com.hokedex.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.hokedex.ml.HokedexMLModule
import com.hokedex.ml.MLRegistry

class FaceProcessingWorker(
  context: Context,
  params: WorkerParameters,
) : CoroutineWorker(context, params) {

  override suspend fun doWork(): Result {
    return try {
      MLRegistry.get("people")?.let { pipeline ->
        pipeline.detect(applicationContext, "")
      }
      Result.success()
    } catch (e: Exception) {
      if (runAttemptCount < 3) Result.retry() else Result.failure()
    }
  }
}
