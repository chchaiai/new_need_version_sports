package edu.bnbu.student.mvp.feature.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences

/**
 * Renders the complete policy bundled in the APK. Keeping the legal copy in an
 * asset makes it reviewable by compliance teams without duplicating it in UI code.
 */
@Composable
fun PrivacyPolicyScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val policyAsset = if (AppLanguagePreferences.currentLanguage.languageTag == "en") {
        PrivacyPolicyEnglishAsset
    } else {
        PrivacyPolicyChineseAsset
    }
    val policy = remember(context, policyAsset) {
        context.assets.open(policyAsset).bufferedReader(Charsets.UTF_8).use { it.readText() }
    }
    val sections = remember(policy) { parsePrivacyPolicy(policy) }

    BackHandler(onBack = onBack)
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .bnbuClickable(onClick = onBack)
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = interfaceText("返回", "Back"),
                    tint = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = interfaceText("返回", "Back"),
                    color = MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        item {
            Text(
                text = sections.firstOrNull()?.title ?: interfaceText("BNBU Sports 用户隐私政策", "BNBU Sports Privacy Policy"),
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.headlineSmall
            )
        }

        sections.firstOrNull()?.paragraphs?.takeIf { it.isNotEmpty() }?.let { metadata ->
            item {
                PrivacySection(interfaceText("版本与适用说明", "Version and scope"), metadata)
            }
        }

        items(
            count = (sections.size - 1).coerceAtLeast(0),
            key = { index -> sections[index + 1].title }
        ) { index ->
            val section = sections[index + 1]
            PrivacySection(section.title, section.paragraphs)
        }

        item { Spacer(Modifier.height(40.dp)) }
    }
}

private data class PolicySection(
    val title: String,
    val paragraphs: List<String>
)

private fun parsePrivacyPolicy(markdown: String): List<PolicySection> {
    val sections = mutableListOf<PolicySection>()
    var title = interfaceText("BNBU Sports 用户隐私政策", "BNBU Sports Privacy Policy")
    var paragraphs = mutableListOf<String>()

    fun commit() {
        if (paragraphs.isNotEmpty() || sections.isEmpty()) {
            sections += PolicySection(title, paragraphs.toList())
        }
        paragraphs = mutableListOf()
    }

    markdown.lineSequence().forEach { sourceLine ->
        val line = sourceLine.trim()
        when {
            line.isEmpty() -> Unit
            line.startsWith("# ") && sections.isEmpty() && paragraphs.isEmpty() ->
                title = line.removePrefix("# ").trim()
            line.startsWith("## ") -> {
                commit()
                title = line.removePrefix("## ").trim()
            }
            line.startsWith("### ") ->
                paragraphs += line.removePrefix("### ").trim()
            else -> paragraphs += line
        }
    }
    commit()
    return sections
}

@Composable
private fun PrivacySection(title: String, paragraphs: List<String>) {
    val cs = MaterialTheme.colorScheme
    SwissPanel {
        Text(
            text = title,
            color = cs.onSurface,
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(Modifier.height(12.dp))
        paragraphs.forEach { paragraph ->
            Text(
                text = paragraph,
                color = cs.onSurfaceVariant,
                style = if (SubheadingPattern.matches(paragraph)) {
                    MaterialTheme.typography.titleSmall
                } else {
                    MaterialTheme.typography.bodyMedium
                }
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}

private const val PrivacyPolicyChineseAsset = "privacy_policy_zh_cn.md"
private const val PrivacyPolicyEnglishAsset = "privacy_policy_en.md"
private val SubheadingPattern = Regex("""^\d{1,2}\.\d{1,2}\s.+""")
