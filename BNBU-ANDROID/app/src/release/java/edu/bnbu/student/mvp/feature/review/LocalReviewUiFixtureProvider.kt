package edu.bnbu.student.mvp.feature.review

import edu.bnbu.student.mvp.core.model.HelpArticleContent
import edu.bnbu.student.mvp.feature.checkin.SupplementTaskUiModel
import edu.bnbu.student.mvp.feature.grades.RawEnduranceResultUiModel

/** Production carries no password-free runtime review data. */
internal object LocalReviewUiFixtureProvider {
    val supplementTask: SupplementTaskUiModel? = null
    val rawEnduranceResult: RawEnduranceResultUiModel? = null
    fun helpArticles(): List<HelpArticleContent> = emptyList()
}
