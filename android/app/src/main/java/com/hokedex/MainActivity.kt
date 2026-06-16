package com.hokedex

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.hokedex.share.ShareModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Hokedex"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Cold launch — stash any shared image so JS can pick it up after boot via
   * ShareModule.getInitialSharedImage(). reactApplicationContext is available
   * at this point because RN New Architecture initialises the host eagerly.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ShareModule.storeIntent(
      intent,
      reactApplicationContext as? ReactApplicationContext
    )
  }

  /**
   * Hot launch — app is already in the background and receives a new Share intent.
   * Copies the content URI to a temp path and emits "hokedex:sharedImage" to JS.
   */
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    ShareModule.handleHotIntent(
      intent,
      reactApplicationContext as? ReactApplicationContext
    )
  }
}
