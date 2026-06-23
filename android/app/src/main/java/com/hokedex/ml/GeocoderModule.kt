package com.hokedex.ml

import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.util.Locale
import java.util.concurrent.Executors

class GeocoderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HokedexGeocoder"

    private val executor = Executors.newSingleThreadExecutor()

    @ReactMethod
    fun getLocation(promise: Promise) {
        executor.execute {
            try {
                val lm = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val providers = listOf(
                    LocationManager.GPS_PROVIDER,
                    LocationManager.NETWORK_PROVIDER,
                    LocationManager.PASSIVE_PROVIDER,
                )
                var best: Location? = null
                for (provider in providers) {
                    if (!lm.isProviderEnabled(provider)) continue
                    @Suppress("MissingPermission")
                    val loc = lm.getLastKnownLocation(provider) ?: continue
                    if (best == null || loc.accuracy < best.accuracy) best = loc
                }
                if (best == null) {
                    promise.reject("NO_LOCATION", "No cached location available")
                    return@execute
                }
                val map = WritableNativeMap()
                map.putDouble("latitude", best.latitude)
                map.putDouble("longitude", best.longitude)
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("LOCATION_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getCityName(lat: Double, lon: Double, promise: Promise) {
        executor.execute {
            try {
                val geocoder = Geocoder(reactContext, Locale.getDefault())
                val addresses = geocoder.getFromLocation(lat, lon, 1)
                val city = addresses
                    ?.firstOrNull()
                    ?.let { it.locality ?: it.subAdminArea ?: it.adminArea }
                    ?: "Unknown"
                promise.resolve(city)
            } catch (e: Exception) {
                promise.reject("GEOCODER_ERROR", e.message, e)
            }
        }
    }
}
