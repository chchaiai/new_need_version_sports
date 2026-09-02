package edu.bnbu.student.mvp.feature.help

import org.junit.Assert.assertEquals
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
        val articles = localReviewHelpArticles()
        assertEquals(listOf("HA-001", "HA-006", "HA-002", "HA-003"), articles.map { it.id })
        assertEquals(listOf("checkin", "enrollment", "login", "exemption"), articles.map { it.categoryCode })
        assertTrue(articles.all { it.title.isNotBlank() && it.bodyMarkdown.isNotBlank() })
    }
}
