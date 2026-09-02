package edu.bnbu.student.mvp.core.model

/** The two interface languages supported by the student app. */
enum class AppLanguage(val storageValue: String, val languageTag: String) {
    Chinese("zh", "zh-CN"),
    English("en", "en");

    companion object {
        /**
         * A saved choice wins; a new installation always starts in Chinese.
         *
         * Older builds and the server have both used BCP-47 tags (for example
         * `zh-CN`) while the local preference stores the compact values (`zh`,
         * `en`).  Accept both representations so migration never silently
         * falls back to a different language than the user chose.
         */
        fun fromStorage(value: String?): AppLanguage {
            val normalized = value
                ?.trim()
                ?.replace('_', '-')
                ?.lowercase()
                .orEmpty()
            return when {
                normalized == English.storageValue || normalized == English.languageTag.lowercase() ||
                    normalized.startsWith("en-") -> English
                normalized == Chinese.storageValue || normalized == Chinese.languageTag.lowercase() ||
                    normalized.startsWith("zh-") -> Chinese
                else -> Chinese
            }
        }
    }
}
