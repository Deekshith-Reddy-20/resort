package com.vfarms.resort.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "vfarms_secure",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveBookingRef(reference: String) {
        prefs.edit().putString("last_booking", reference).apply()
    }

    fun lastBooking(): String? = prefs.getString("last_booking", null)

    fun setOnboarded() {
        prefs.edit().putBoolean("onboarded", true).apply()
    }

    fun onboarded(): Boolean = prefs.getBoolean("onboarded", false)
}
