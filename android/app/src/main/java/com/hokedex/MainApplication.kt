package com.hokedex

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.hokedex.ingest.HokedexIngestPackage
import com.hokedex.media.HokedexMediaPackage
import com.hokedex.ml.HokedexMLPackage
import com.hokedex.pin.PinPackage
import com.hokedex.share.SharePackage
import com.hokedex.workers.FaceProcessingWorker
import com.swmansion.reanimated.ReanimatedPackage
import com.swmansion.worklets.WorkletsPackage
import java.util.concurrent.TimeUnit

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(WorkletsPackage())
          add(ReanimatedPackage())
          add(HokedexMLPackage())
          add(HokedexIngestPackage())
          add(HokedexMediaPackage())
          add(PinPackage())
          add(SharePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .setRequiresCharging(true)
      .setRequiresDeviceIdle(true)
      .build()

    val request = PeriodicWorkRequestBuilder<FaceProcessingWorker>(6, TimeUnit.HOURS)
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
      "face_processing",
      ExistingPeriodicWorkPolicy.KEEP,
      request,
    )
  }
}
