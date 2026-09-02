package edu.bnbu.student.mvp.core.local

import android.content.Context
import android.content.res.Configuration
import android.os.LocaleList
import edu.bnbu.student.mvp.core.model.AppLanguage
import java.util.Locale

/**
 * The single owner of the application's interface language.
 *
 * It is deliberately synchronous: [initialize] is called from
 * `Application.attachBaseContext`, before Android creates any UI or component
 * context. All non-Compose text and date formatting must read [currentLocale]
 * instead of the device-wide default locale.
 */
object AppLanguagePreferences {
    private val lock = Any()

    @Volatile
    private var activeLanguage: AppLanguage = AppLanguage.Chinese

    @Volatile
    private var initialized = false

    val currentLanguage: AppLanguage
        get() = activeLanguage

    val currentLocale: Locale
        get() = Locale.forLanguageTag(activeLanguage.languageTag)

    /**
     * Reads the durable setting and installs it as the process locale. This is
     * safe to call repeatedly; Application uses it once at process start and
     * Activity/component contexts use [localizedContext] afterwards.
     */
    fun initialize(context: Context): AppLanguage = synchronized(lock) {
        val language = read(context)
        activate(language)
        initialized = true
        language
    }

    fun localizedContext(base: Context): Context {
        val language = ensureInitialized(base)
        val locale = Locale.forLanguageTag(language.languageTag)
        val configuration = Configuration(base.resources.configuration).apply {
            setLocale(locale)
            setLocales(LocaleList(locale))
        }
        return base.createConfigurationContext(configuration)
    }

    /** Returns the process language once initialized, otherwise the stored value. */
    fun load(context: Context): AppLanguage = if (initialized) activeLanguage else read(context)

    /**
     * Persists first, then updates the in-process locale.  Returning false
     * leaves the active locale unchanged, so the settings selection can never
     * drift away from the value that the next cold start will read.
     */
    fun save(context: Context, language: AppLanguage): Boolean = synchronized(lock) {
        val stored = context.getSharedPreferences(
            AndroidAppLocalStore.StoreName,
            Context.MODE_PRIVATE
        ).edit().putString(AndroidAppLocalStore.LanguageKey, language.storageValue).commit()
        if (stored) {
            activate(language)
            initialized = true
        }
        stored
    }

    private fun ensureInitialized(context: Context): AppLanguage =
        if (initialized) activeLanguage else initialize(context)

    private fun read(context: Context): AppLanguage = AppLanguage.fromStorage(
        context.getSharedPreferences(
            AndroidAppLocalStore.StoreName,
            Context.MODE_PRIVATE
        ).getString(AndroidAppLocalStore.LanguageKey, null)
    )

    private fun activate(language: AppLanguage) {
        activeLanguage = language
        val locale = Locale.forLanguageTag(language.languageTag)
        // LocaleList is the framework source used by resource/configuration
        // resolution on supported Android versions.  Locale.setDefault keeps
        // Java/Kotlin formatters in the same language as Android resources.
        LocaleList.setDefault(LocaleList(locale))
        Locale.setDefault(locale)
    }
}
