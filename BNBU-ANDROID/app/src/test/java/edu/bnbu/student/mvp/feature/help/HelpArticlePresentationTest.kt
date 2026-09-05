package edu.bnbu.student.mvp.feature.help

import edu.bnbu.student.mvp.feature.review.LocalReviewUiFixtureProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HelpArticlePresentationTest {
    @Test
    fun categoryCodesMatchAdministratorAndWebStudentOrder() {
        assertEquals(
            listOf(
                "login", "enrollment", "checkin", "evidence", "course", "exemption",
                "organization", "notification", "maintenance", "feedback"
            ),
            HelpCategoryCodes
        )
        assertEquals(2, helpCategoryRank("checkin"))
    }

    @Test
    fun markdownParserPreservesSupportedArticleStructure() {
        val blocks = parseHelpMarkdown(
            "# 提交步骤\n\n1. **核对课程**\n2. 上传 `凭证`\n\n> 提交前检查\n\n```\nraw <html>\n```"
        )

        assertEquals(
            listOf(
                HelpMarkdownBlock.Heading::class,
                HelpMarkdownBlock.ListBlock::class,
                HelpMarkdownBlock.Quote::class,
                HelpMarkdownBlock.Code::class
            ),
            blocks.map { it::class }
        )
        assertEquals(listOf("**核对课程**", "上传 `凭证`"), (blocks[1] as HelpMarkdownBlock.ListBlock).items)
        assertEquals("raw <html>", (blocks[3] as HelpMarkdownBlock.Code).text)
    }

    @Test
    fun localReviewUsesPublishedAdministratorProjectionOnly() {
        val articles = LocalReviewUiFixtureProvider.helpArticles()
        assertEquals(listOf("HA-001", "HA-006", "HA-002", "HA-003"), articles.map { it.id })
        assertEquals(listOf("checkin", "enrollment", "login", "exemption"), articles.map { it.categoryCode })
        assertTrue(articles.all { it.title.isNotBlank() && it.bodyMarkdown.isNotBlank() })
    }

    @Test
    fun localReviewDoesNotInventVerificationCodeLockDurations() {
        val copy = LocalReviewUiFixtureProvider.helpArticles().joinToString("\n") { it.bodyMarkdown }

        assertFalse(copy.contains("连续输错 5 次"))
        assertFalse(copy.contains("账号锁定 15 分钟"))
        assertFalse(copy.contains("five consecutive failures", ignoreCase = true))
        assertFalse(copy.contains("locked for 15 minutes", ignoreCase = true))
        assertTrue(copy.contains("暂时限制继续尝试") || copy.contains("temporarily limit further attempts"))
    }
}
