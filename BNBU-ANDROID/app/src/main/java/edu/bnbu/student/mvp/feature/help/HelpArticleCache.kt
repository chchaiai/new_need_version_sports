package edu.bnbu.student.mvp.feature.help

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import edu.bnbu.student.mvp.core.model.HelpArticleContent

/** Stores the last successfully fetched public help-article payload. */
internal class HelpArticleCache(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(
        PreferencesName,
        Context.MODE_PRIVATE
    )

    fun load(locale: String): List<HelpArticleContent> = try {
        val json = preferences.getString(keyFor(locale), null) ?: return emptyList()
        gson.fromJson<List<HelpArticleContent>>(json, articlesType) ?: emptyList()
    } catch (_: RuntimeException) {
        // A malformed or old cache must never prevent the help centre opening.
        emptyList()
    }

    fun save(locale: String, articles: List<HelpArticleContent>) {
        try {
            preferences.edit().putString(keyFor(locale), gson.toJson(articles)).apply()
        } catch (_: RuntimeException) {
            // The online result remains usable even if its offline copy cannot be saved.
        }
    }

    private companion object {
        const val PreferencesName = "bnbu.student.help_articles.v1"
        val gson = Gson()
        val articlesType = object : TypeToken<List<HelpArticleContent>>() {}.type

        fun keyFor(locale: String): String =
            "articles.${if (locale.trim().lowercase().startsWith("en")) "en" else "zh-CN"}"
    }
}
