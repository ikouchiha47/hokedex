package com.hokedex

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.hokedex.ingest.HokedexIngestPackage
import com.hokedex.ml.HokedexMLPackage
import com.hokedex.pin.PinPackage
import com.hokedex.share.SharePackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(HokedexMLPackage())
          add(HokedexIngestPackage())
          add(PinPackage())
          add(SharePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
