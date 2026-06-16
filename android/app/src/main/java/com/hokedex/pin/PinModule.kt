package com.hokedex.pin

import android.content.Context
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class PinModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val PREFS_FILE = "hokedex_pin_prefs"
        private const val KEY_PIN_HASH = "pin_hash"
        private const val KEY_PIN_SALT = "pin_salt"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val PBKDF2_ITERATIONS = 100_000
        private const val KEY_LENGTH_BITS = 256
        private const val ALGORITHM = "PBKDF2WithHmacSHA256"
    }

    override fun getName(): String = "PinModule"

    private fun getPrefs() = EncryptedSharedPreferences.create(
        reactContext,
        PREFS_FILE,
        MasterKey.Builder(reactContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    private fun pbkdf2(pin: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS)
        val factory = SecretKeyFactory.getInstance(ALGORITHM)
        val hash = factory.generateSecret(spec).encoded
        spec.clearPassword()
        return hash
    }

    @ReactMethod
    fun hasPin(promise: Promise) {
        try {
            val prefs = getPrefs()
            promise.resolve(prefs.contains(KEY_PIN_HASH))
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setPin(pin: String, promise: Promise) {
        try {
            val salt = ByteArray(32)
            SecureRandom().nextBytes(salt)
            val hash = pbkdf2(pin, salt)
            val prefs = getPrefs()
            prefs.edit()
                .putString(KEY_PIN_HASH, Base64.encodeToString(hash, Base64.NO_WRAP))
                .putString(KEY_PIN_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun verifyPin(pin: String, promise: Promise) {
        try {
            val prefs = getPrefs()
            val storedHash = prefs.getString(KEY_PIN_HASH, null)
            val storedSalt = prefs.getString(KEY_PIN_SALT, null)
            if (storedHash == null || storedSalt == null) {
                promise.resolve(false)
                return
            }
            val salt = Base64.decode(storedSalt, Base64.NO_WRAP)
            val candidate = pbkdf2(pin, salt)
            val expected = Base64.decode(storedHash, Base64.NO_WRAP)
            // constant-time comparison
            var diff = candidate.size xor expected.size
            val minLen = minOf(candidate.size, expected.size)
            for (i in 0 until minLen) {
                diff = diff or (candidate[i].toInt() xor expected[i].toInt())
            }
            promise.resolve(diff == 0)
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearPin(promise: Promise) {
        try {
            val prefs = getPrefs()
            prefs.edit()
                .remove(KEY_PIN_HASH)
                .remove(KEY_PIN_SALT)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getBiometricEnabled(promise: Promise) {
        try {
            val prefs = getPrefs()
            promise.resolve(prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setBiometricEnabled(enabled: Boolean, promise: Promise) {
        try {
            getPrefs().edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isBiometricAvailable(promise: Promise) {
        try {
            val manager = BiometricManager.from(reactContext)
            val result = manager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            )
            promise.resolve(result == BiometricManager.BIOMETRIC_SUCCESS)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
