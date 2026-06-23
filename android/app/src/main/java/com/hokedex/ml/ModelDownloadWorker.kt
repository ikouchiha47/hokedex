package com.hokedex.ml

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.util.Log

private const val TAG = "ModelDownloadWorker"

class ModelDownloadWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        if (ModelManager.modelsReady(applicationContext)) return Result.success()

        Log.d(TAG, "Starting background model download")
        var downloadError: String? = null
        val latch = java.util.concurrent.CountDownLatch(1)

        ModelManager.downloadModels(
            context     = applicationContext,
            onProgress  = { /* background — no UI to update */ },
            onDone      = { latch.countDown() },
            onError     = { msg -> downloadError = msg; latch.countDown() },
        )

        latch.await()

        return if (downloadError == null) {
            Log.d(TAG, "Background model download complete")
            Result.success()
        } else {
            Log.w(TAG, "Background model download failed: $downloadError")
            Result.retry()
        }
    }
}
