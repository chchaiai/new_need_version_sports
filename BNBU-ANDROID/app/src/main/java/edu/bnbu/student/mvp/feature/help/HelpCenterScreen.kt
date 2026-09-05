package edu.bnbu.student.mvp.feature.help

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.HelpArticleContent
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.feature.review.LocalReviewUiFixtureProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class HelpArticle(
    val id: String,
    val title: String,
    val categoryCode: String,
    val category: String,
    val bodyMarkdown: String
)

/**
 * Help content is loaded from the administrator-managed backend endpoint.
 * Explicit local-review mode uses matching synthetic published projections.
 */
@Composable
fun HelpCenterScreen(
    onBack: () -> Unit,
    repository: ApiStudentRepository?,
    isLocalReviewMode: Boolean,
    onUnauthorized: () -> Unit
) {
    BackHandler(onBack = onBack)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current.applicationContext
    val articleCache = remember(context) { HelpArticleCache(context) }
    var articles by remember { mutableStateOf<List<HelpArticle>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var isShowingCachedArticles by remember { mutableStateOf(false) }
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var expandedArticleId by rememberSaveable { mutableStateOf<String?>(null) }
    val locale = AppLanguagePreferences.currentLanguage.languageTag

    suspend fun loadArticles() {
        if (isLocalReviewMode) {
            articles = LocalReviewUiFixtureProvider.helpArticles().toHelpArticles()
            isLoading = false
            loadError = null
            isShowingCachedArticles = false
            return
        }
        isLoading = articles.isEmpty()
        loadError = null
        isShowingCachedArticles = false
        val cachedArticles = withContext(Dispatchers.IO) { articleCache.load(locale).toHelpArticles() }
        if (articles.isEmpty() && cachedArticles.isNotEmpty()) {
            articles = cachedArticles
            isLoading = false
        }
        try {
            val fetchedArticles = repository?.fetchHelpArticles()
                ?: throw IllegalStateException("Help article repository is unavailable")
            val validArticles = fetchedArticles.filter {
                it.id.isNotBlank() && it.title.isNotBlank() && it.bodyMarkdown.isNotBlank() &&
                    it.locale == locale
            }
            articles = validArticles.toHelpArticles()
            withContext(Dispatchers.IO) { articleCache.save(locale, validArticles) }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            if (error is ApiHttpException && error.statusCode == 401) onUnauthorized()
            val fallbackArticles = cachedArticles.ifEmpty { articles }
            if (fallbackArticles.isNotEmpty()) {
                articles = fallbackArticles
                isShowingCachedArticles = true
            } else {
                loadError = interfaceText("帮助内容暂时无法加载，请稍后重试。", "Help content could not be loaded. Try again later.")
            }
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(repository, isLocalReviewMode, locale) { loadArticles() }

    val normalizedQuery = searchQuery.trim()
    val filteredArticles = articles.filter { article ->
        normalizedQuery.isEmpty() || article.matches(normalizedQuery)
    }
    val articlesByCategory = filteredArticles.groupBy { it.category.ifBlank { interfaceText("其他", "Other") } }

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
                    .padding(top = 12.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = interfaceText("返回", "Back"))
                Spacer(Modifier.width(8.dp))
                Text(interfaceText("返回", "Back"), color = MaterialTheme.colorScheme.onSurface)
            }
        }
        item {
            Text(
                text = interfaceText("帮助中心", "Help centre"),
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.headlineSmall
            )
        }
        item {
            BNBUFormField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = interfaceText("搜索帮助内容", "Search help content"),
                testTag = "help.search",
                placeholder = interfaceText("搜索帮助内容...", "Search help..."),
                supportingText = interfaceText(
                    "按标题、分类或正文搜索",
                    "Search titles, categories, or content"
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Search
                )
            )
        }
        if (isShowingCachedArticles) {
            item {
                Text(
                    text = interfaceText("当前正在显示最近缓存的帮助内容。", "Showing the most recently cached help content."),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        when {
            isLoading -> item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) { CircularProgressIndicator() }
            }
            loadError != null -> item {
                EmptyPlaceholder(title = interfaceText("帮助内容加载失败", "Help content failed to load"), message = loadError!!)
                Text(
                    text = interfaceText("点击重试", "Try again"),
                    modifier = Modifier.bnbuClickable { scope.launch { loadArticles() } }.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.primary
                )
            }
            filteredArticles.isEmpty() -> item {
                EmptyPlaceholder(
                    title = if (articles.isEmpty()) interfaceText("暂无帮助内容", "No help content") else interfaceText("未找到相关帮助", "No matching help"),
                    message = if (articles.isEmpty()) interfaceText("管理员尚未发布帮助内容。", "No help content has been published yet.") else interfaceText("请尝试其他关键词。", "Try another keyword." )
                )
            }
            else -> articlesByCategory.entries
                .sortedBy { (_, categoryArticles) -> helpCategoryRank(categoryArticles.first().categoryCode) }
                .forEach { (category, categoryArticles) ->
                item(key = category) {
                    Text(
                        text = category,
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleLarge
                    )
                }
                items(
                    count = categoryArticles.size,
                    key = { index -> categoryArticles[index].id }
                ) { index ->
                    val article = categoryArticles[index]
                    HelpArticleCard(
                        article = article,
                        expanded = expandedArticleId == article.id,
                        onClick = {
                            expandedArticleId = if (expandedArticleId == article.id) null else article.id
                        }
                    )
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun HelpArticleCard(article: HelpArticle, expanded: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    SwissPanel(modifier = Modifier.bnbuClickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = article.title,
                color = colors.onSurface,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = if (expanded) interfaceText("收起", "Collapse") else interfaceText("展开", "Expand"),
                tint = colors.onSurfaceVariant,
                modifier = Modifier.size(22.dp)
            )
        }
        if (expanded) {
            Spacer(Modifier.height(12.dp))
            HelpArticleMarkdown(article.bodyMarkdown)
        }
    }
}

private fun HelpArticle.matches(query: String): Boolean =
    title.contains(query, ignoreCase = true) ||
        bodyMarkdown.contains(query, ignoreCase = true) ||
        category.contains(query, ignoreCase = true)

private fun List<HelpArticleContent>.toHelpArticles(): List<HelpArticle> =
    filter { it.id.isNotBlank() && it.title.isNotBlank() && it.bodyMarkdown.isNotBlank() }
        .map { article ->
            HelpArticle(
                id = article.id,
                title = article.title,
                categoryCode = article.categoryCode,
                category = helpCategoryLabel(article.categoryCode),
                bodyMarkdown = article.bodyMarkdown
            )
        }
