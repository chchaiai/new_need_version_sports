package edu.bnbu.student.mvp.core.model

/**
 * Published, current-language help content exposed to student features.
 * Administrator-only authoring fields never cross this domain boundary.
 */
data class HelpArticleContent(
    val id: String,
    val categoryCode: String,
    val locale: String,
    val title: String,
    val bodyMarkdown: String,
    val publishedAt: String,
    val version: Long
)
