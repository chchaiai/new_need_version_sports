package edu.bnbu.student.mvp.core.designsystem

import android.content.Context
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import java.security.MessageDigest

/**
 * Returns copy for client-owned UI text in the selected application language.
 *
 * Values received from the API (course titles, teacher names, notices, and so on)
 * deliberately do not pass through this function: the server owns both their copy
 * and their language.
 */
fun interfaceText(chinese: String, english: String): String =
    InterfaceTextResources.resolve(chinese, english)

/**
 * Resolves legacy bilingual call sites through Android resources.  Keeping this bridge means
 * existing non-Composable format/status helpers also react to a locale change, while new UI
 * should use [androidx.compose.ui.res.stringResource] directly.
 */
object InterfaceTextResources {
    @Volatile
    private var applicationContext: Context? = null

    fun initialize(context: Context) {
        applicationContext = context.applicationContext
    }

    fun resolve(chinese: String, english: String): String {
        val fallback = if (AppLanguagePreferences.currentLanguage.languageTag == "en") english else chinese
        val context = applicationContext ?: return fallback
        // Never consult the device locale here.  AppLanguagePreferences is
        // initialized before Application/UI creation and is also updated
        // synchronously before the language-change Activity recreation.
        val localizedContext = AppLanguagePreferences.localizedContext(context)
        val resources = localizedContext.resources
        val resourceId = resources.getIdentifier(resourceName(chinese, english), "string", context.packageName)
        return if (resourceId != 0) resources.getString(resourceId) else fallback
    }

    private fun resourceName(chinese: String, english: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$chinese\u0000$english".toByteArray(Charsets.UTF_8))
            .joinToString(separator = "") { byte -> "%02x".format(byte) }
        return "i18n_$digest"
    }
}
