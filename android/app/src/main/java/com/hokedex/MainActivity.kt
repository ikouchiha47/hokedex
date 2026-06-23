package com.hokedex

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.hokedex.share.ShareModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Hokedex"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // react-native-screens requires fragment state NOT be restored — clear it before super()
    super.onCreate(null)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    ShareModule.storeIntent(intent, applicationContext)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ShareModule.handleHotIntent(intent, applicationContext)
  }
}
