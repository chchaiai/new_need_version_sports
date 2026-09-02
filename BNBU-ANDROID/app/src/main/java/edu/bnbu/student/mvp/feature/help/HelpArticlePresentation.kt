package edu.bnbu.student.mvp.feature.help

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.HelpArticleContent

internal val HelpCategoryCodes = listOf(
    "login",
    "enrollment",
    "checkin",
    "evidence",
    "course",
    "exemption",
    "organization",
    "notification",
    "maintenance",
    "feedback"
)

internal fun helpCategoryLabel(categoryCode: String): String = when (categoryCode.trim().lowercase()) {
    "login" -> interfaceText("登录与验证码", "Sign-in & verification codes")
    "enrollment" -> interfaceText("加入课程与补正", "Enrollment & corrections")
    "checkin" -> interfaceText("打卡与学时", "Check-ins & credits")
    "evidence" -> interfaceText("凭证上传", "Evidence upload")
    "course" -> interfaceText("课程与成绩", "Classes & grades")
    "exemption" -> interfaceText("免测", "Exemptions")
    "organization" -> interfaceText("组织认证", "Organization verification")
    "notification" -> interfaceText("通知", "Notifications")
    "maintenance" -> interfaceText("维护期间操作", "Maintenance operations")
    "feedback" -> interfaceText("服务反馈", "Service feedback")
    else -> interfaceText("其他", "Other")
}

internal fun helpCategoryRank(categoryCode: String): Int =
    HelpCategoryCodes.indexOf(categoryCode.trim().lowercase()).let { if (it < 0) HelpCategoryCodes.size else it }

internal fun localReviewHelpArticles(): List<HelpArticleContent> = listOf(
    HelpArticleContent(
        id = "HA-001",
        categoryCode = "checkin",
        locale = interfaceText("zh-CN", "en"),
        title = interfaceText("如何提交运动打卡？", "How do I submit an activity check-in?"),
        bodyMarkdown = interfaceText(
            "进入打卡页，确认当前课程与时间窗，完成运动后上传至少一份凭证并提交。",
            "Open Check-in, confirm the class and time window, then upload at least one item of evidence after the activity and submit."
        ),
        publishedAt = "2026-03-02T08:00:00Z",
        version = 1
    ),
    HelpArticleContent(
        id = "HA-006",
        categoryCode = "enrollment",
        locale = interfaceText("zh-CN", "en"),
        title = interfaceText("如何扫码或使用邀请码加入课程？", "How do I join a class with a QR code or invitation code?"),
        bodyMarkdown = interfaceText(
            "扫描授课教师展示的课程二维码后，请先核对课程名称、班级、教师和学期，再填写姓名、学号、性别和年级并确认加入。服务端校验成功后会立即建立有效课程成员关系并进入学生首页，无需等待教师审核。无法扫码时，可在学生端输入邀请码；二维码过期或被撤销时，请向教师获取新的邀请。",
            "After scanning the class QR code shown by your teacher, confirm the course, section, teacher, and semester, then enter your name, student ID, gender, and grade. Successful server validation creates an active membership immediately and opens the student home screen without teacher approval. If scanning is unavailable, enter the invitation code in the student app; ask for a new invitation if the code has expired or been revoked."
        ),
        publishedAt = "2026-08-01T08:00:00Z",
        version = 1
    ),
    HelpArticleContent(
        id = "HA-002",
        categoryCode = "login",
        locale = interfaceText("zh-CN", "en"),
        title = interfaceText("验证码连续输错后怎么办？", "What happens after repeated verification-code failures?"),
        bodyMarkdown = interfaceText(
            "连续输错 5 次后账号锁定 15 分钟。可以等待自动解锁，或联系管理员核验后提前解锁。",
            "After five consecutive failures, the account is locked for 15 minutes. Wait for automatic unlock or contact an administrator for verified early unlock."
        ),
        publishedAt = "2026-03-05T08:00:00Z",
        version = 1
    ),
    HelpArticleContent(
        id = "HA-003",
        categoryCode = "exemption",
        locale = interfaceText("zh-CN", "en"),
        title = interfaceText("如何申请耐力跑免测？", "How do I apply for an endurance-run exemption?"),
        bodyMarkdown = interfaceText(
            "在申请页选择耐力跑免测，按要求提交医学材料并等待授课教师审核。",
            "Choose Endurance-run exemption under Applications, provide the required medical documents, and wait for your teacher's review."
        ),
        publishedAt = "2026-04-12T08:00:00Z",
        version = 1
    )
)

internal sealed interface HelpMarkdownBlock {
    data class Heading(val level: Int, val text: String) : HelpMarkdownBlock
    data class Paragraph(val lines: List<String>) : HelpMarkdownBlock
    data class ListBlock(val ordered: Boolean, val items: List<String>) : HelpMarkdownBlock
    data class Quote(val lines: List<String>) : HelpMarkdownBlock
    data class Code(val text: String) : HelpMarkdownBlock
    data object Rule : HelpMarkdownBlock
}

private val HeadingPattern = Regex("^(#{1,4})\\s+(.+)$")
private val UnorderedPattern = Regex("^\\s*[-*+]\\s+(.+)$")
private val OrderedPattern = Regex("^\\s*\\d+\\.\\s+(.+)$")
private val RulePattern = Regex("^\\s*(?:-{3,}|\\*{3,})\\s*$")

private fun isBlockStart(line: String): Boolean =
    line.isBlank() || line.startsWith("```") || HeadingPattern.matches(line) ||
        UnorderedPattern.matches(line) || OrderedPattern.matches(line) ||
        line.trimStart().startsWith(">") || RulePattern.matches(line)

internal fun parseHelpMarkdown(markdown: String): List<HelpMarkdownBlock> {
    val lines = markdown.replace("\r\n", "\n").split("\n")
    val blocks = mutableListOf<HelpMarkdownBlock>()
    var index = 0
    while (index < lines.size) {
        val line = lines[index]
        if (line.isBlank()) {
            index += 1
            continue
        }
        if (line.startsWith("```")) {
            val code = mutableListOf<String>()
            index += 1
            while (index < lines.size && !lines[index].startsWith("```")) code += lines[index++]
            if (index < lines.size) index += 1
            blocks += HelpMarkdownBlock.Code(code.joinToString("\n"))
            continue
        }
        val heading = HeadingPattern.matchEntire(line)
        if (heading != null) {
            blocks += HelpMarkdownBlock.Heading(heading.groupValues[1].length, heading.groupValues[2])
            index += 1
            continue
        }
        if (RulePattern.matches(line)) {
            blocks += HelpMarkdownBlock.Rule
            index += 1
            continue
        }
        if (line.trimStart().startsWith(">")) {
            val quote = mutableListOf<String>()
            while (index < lines.size && lines[index].trimStart().startsWith(">")) {
                quote += lines[index++].trimStart().removePrefix(">").trimStart()
            }
            blocks += HelpMarkdownBlock.Quote(quote)
            continue
        }
        val unordered = UnorderedPattern.matchEntire(line)
        val ordered = OrderedPattern.matchEntire(line)
        if (unordered != null || ordered != null) {
            val pattern = if (ordered != null) OrderedPattern else UnorderedPattern
            val items = mutableListOf<String>()
            while (index < lines.size) {
                val item = pattern.matchEntire(lines[index]) ?: break
                items += item.groupValues[1]
                index += 1
            }
            blocks += HelpMarkdownBlock.ListBlock(ordered != null, items)
            continue
        }
        val paragraph = mutableListOf(line.trim())
        index += 1
        while (index < lines.size && !isBlockStart(lines[index])) paragraph += lines[index++].trim()
        blocks += HelpMarkdownBlock.Paragraph(paragraph)
    }
    return blocks
}

private val InlinePattern = Regex(
    "(`[^`\\n]+`|\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__|\\[[^]\\n]+]\\((?:https?://|mailto:)[^\\s)]+\\)|\\*[^*\\n]+\\*|_[^_\\n]+_)"
)

private fun inlineMarkdown(source: String, linkColor: Color, codeBackground: Color): AnnotatedString =
    buildAnnotatedString {
        var offset = 0
        InlinePattern.findAll(source).forEach { match ->
            append(source.substring(offset, match.range.first))
            val token = match.value
            when {
                token.startsWith("`") -> withStyle(
                    SpanStyle(fontFamily = FontFamily.Monospace, background = codeBackground)
                ) { append(token.substring(1, token.length - 1)) }
                token.startsWith("**") || token.startsWith("__") -> withStyle(
                    SpanStyle(fontWeight = FontWeight.Bold)
                ) { append(token.substring(2, token.length - 2)) }
                token.startsWith("[") -> {
                    val label = token.substringAfter("[").substringBefore("](")
                    withStyle(SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline)) {
                        append(label)
                    }
                }
                else -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                    append(token.substring(1, token.length - 1))
                }
            }
            offset = match.range.last + 1
        }
        append(source.substring(offset))
    }

@Composable
internal fun HelpArticleMarkdown(markdown: String, modifier: Modifier = Modifier) {
    val colors = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        parseHelpMarkdown(markdown).forEach { block ->
            when (block) {
                is HelpMarkdownBlock.Heading -> Text(
                    text = inlineMarkdown(block.text, colors.primary, colors.surfaceContainerHigh),
                    color = colors.onSurface,
                    style = when (block.level) {
                        1 -> typography.titleLarge
                        2 -> typography.titleMedium
                        else -> typography.titleSmall
                    }
                )
                is HelpMarkdownBlock.Paragraph -> Text(
                    text = inlineMarkdown(block.lines.joinToString("\n"), colors.primary, colors.surfaceContainerHigh),
                    color = colors.onSurfaceVariant,
                    style = typography.bodyMedium
                )
                is HelpMarkdownBlock.Quote -> Text(
                    text = inlineMarkdown(block.lines.joinToString("\n"), colors.primary, colors.surfaceContainerHigh),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.surfaceContainerLow)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    color = colors.onSurfaceVariant,
                    style = typography.bodyMedium
                )
                is HelpMarkdownBlock.Code -> Text(
                    text = block.text,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.surfaceContainerLow)
                        .padding(12.dp),
                    color = colors.onSurfaceVariant,
                    fontFamily = FontFamily.Monospace,
                    style = typography.bodySmall
                )
                is HelpMarkdownBlock.ListBlock -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    block.items.forEachIndexed { index, item ->
                        Row {
                            Text(if (block.ordered) "${index + 1}." else "•", color = colors.onSurfaceVariant)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = inlineMarkdown(item, colors.primary, colors.surfaceContainerHigh),
                                modifier = Modifier.weight(1f),
                                color = colors.onSurfaceVariant,
                                style = typography.bodyMedium
                            )
                        }
                    }
                }
                HelpMarkdownBlock.Rule -> HorizontalDivider(color = colors.outlineVariant)
            }
        }
    }
}
