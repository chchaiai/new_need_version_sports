package edu.bnbu.student.mvp.feature.exemption

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.designsystem.ActionButton
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.PrimaryActionButton
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.SegmentedControl
import edu.bnbu.student.mvp.core.designsystem.StatusBadge
import edu.bnbu.student.mvp.core.designsystem.StatusMessagePanel
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.model.Exemption
import edu.bnbu.student.mvp.core.model.ExemptionApplication
import edu.bnbu.student.mvp.core.model.ExemptionType
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.R
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.core.content.FileProvider
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import coil3.compose.SubcomposeAsyncImage

private enum class ExemptionTab {
    MyApplications,
    NewApplication;

    fun label(): String = when (this) {
        MyApplications -> interfaceText("我的申请", "My applications")
        NewApplication -> interfaceText("提交申请", "New application")
    }
}

private const val MaxExemptionReasonLength = 1_000
private const val MaxExemptionMediaItems = 20
private val AllowedExemptionImageMimeTypes = setOf("image/jpeg", "image/png")

@Composable
fun ExemptionScreen(
    appState: StudentAppState,
    repository: ApiStudentRepository?,
    initialApplicationId: String? = null,
    onUnauthorized: () -> Unit,
    onBack: () -> Unit
) {
    var selectedTab by rememberSaveable { mutableStateOf(ExemptionTab.MyApplications) }
    var exemptions by remember { mutableStateOf<List<Exemption>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var userFacingError by remember { mutableStateOf<UserFacingError?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var selectedExemptionId by rememberSaveable { mutableStateOf(initialApplicationId) }
    var resubmittingExemption by remember { mutableStateOf<Exemption?>(null) }
    var isFormSubmitting by remember { mutableStateOf(false) }
    var proofPreviewUrls by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var proofPreviewsLoading by remember { mutableStateOf(false) }
    var proofPreviewsUnavailable by remember { mutableStateOf(false) }
    val loadProofPreviews = remember(repository) {
        repository?.let(::LoadExemptionProofPreviewsUseCase)
    }
    val loadJob = remember { mutableStateOf<Job?>(null) }
    val applicationsListState = rememberLazyListState()
    val formListState = rememberLazyListState()
    val focusManager = LocalFocusManager.current
    val cs = MaterialTheme.colorScheme
    val handleBack = {
        focusManager.clearFocus(force = true)
        if (isFormSubmitting) {
            errorMessage = interfaceText("申请正在提交，请等待完成后再返回", "Your application is being submitted. Please wait.")
        } else if (selectedExemptionId != null) {
            selectedExemptionId = null
        } else {
            onBack()
        }
    }

    BackHandler(onBack = handleBack)

    DisposableEffect(Unit) {
        onDispose { loadJob.value?.cancel() }
    }

    fun loadExemptions() {
        if (isLoading) return
        val remoteRepository = repository
        if (remoteRepository == null) {
            exemptions = appState.workspace.exemptions
            if (selectedExemptionId != null && exemptions.none { it.id == selectedExemptionId }) {
                selectedExemptionId = null
            }
            return
        }
        isLoading = true
        errorMessage = null
        userFacingError = null
        val request = appState.launchAuthenticatedRequest {
            try {
                val response = remoteRepository.listExemptions()
                exemptions = response.map { r ->
                    Exemption(
                        id = r.id,
                        studentId = r.studentId,
                        studentName = r.studentName.orEmpty(),
                        type = r.type,
                        category = r.category,
                        organization = r.organization.orEmpty(),
                        reason = r.reason ?: "",
                        status = r.status.exemptionStatusLabel(),
                        proofFiles = r.proofFiles.map { it.cosKey.ifBlank { it.url } },
                        reviewComment = r.reviewComment ?: "",
                        reviewerId = r.reviewerId ?: "",
                        reviewerName = r.reviewerName ?: "",
                        createdAt = r.createdAt,
                        updatedAt = r.updatedAt ?: ""
                    )
                }
                if (selectedExemptionId != null && exemptions.none { it.id == selectedExemptionId }) {
                    selectedExemptionId = null
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (e is ApiHttpException && e.statusCode == 401) {
                    onUnauthorized()
                    return@launchAuthenticatedRequest
                }
                val mapped = ClientErrorMapper.map(e, ClientErrorContext.EXEMPTION)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.EXEMPTION,
                    httpStatus = (e as? ApiHttpException)?.statusCode
                )
            } finally {
                isLoading = false
            }
        }
        loadJob.value = request
        if (request == null) {
            isLoading = false
            onUnauthorized()
        }
    }

    // Load on first composition — safely managed by LaunchedEffect lifecycle
    LaunchedEffect(Unit) {
        if (exemptions.isEmpty() && !isLoading) {
            loadExemptions()
        }
    }

    val selectedProofIds = selectedExemptionId?.let { selectedId ->
        exemptions.firstOrNull { it.id == selectedId }?.proofFiles
    }.orEmpty()
    LaunchedEffect(selectedExemptionId, selectedProofIds, loadProofPreviews) {
        proofPreviewUrls = emptyMap()
        proofPreviewsUnavailable = false
        val loader = loadProofPreviews
        if (selectedExemptionId == null || selectedProofIds.isEmpty() || loader == null) {
            proofPreviewsLoading = false
            return@LaunchedEffect
        }
        proofPreviewsLoading = true
        try {
            proofPreviewUrls = loader(selectedProofIds)
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (error: Exception) {
            if (error is ApiHttpException && error.statusCode == 401) {
                onUnauthorized()
            } else {
                proofPreviewsUnavailable = true
            }
        } finally {
            proofPreviewsLoading = false
        }
    }

    AnimatedContent(
        targetState = selectedExemptionId,
        modifier = Modifier.fillMaxWidth(),
        transitionSpec = {
            if (targetState != null) {
                (fadeIn(tween(BNBUMotion.Standard)) +
                    slideInHorizontally(tween(BNBUMotion.Standard)) { it / 10 }) togetherWith
                    (fadeOut(tween(BNBUMotion.Quick)) +
                        slideOutHorizontally(tween(BNBUMotion.Quick)) { -it / 14 })
            } else {
                (fadeIn(tween(BNBUMotion.Standard)) +
                    slideInHorizontally(tween(BNBUMotion.Standard)) { -it / 10 }) togetherWith
                    (fadeOut(tween(BNBUMotion.Quick)) +
                        slideOutHorizontally(tween(BNBUMotion.Quick)) { it / 14 })
            }
        },
        label = "exemption-detail-transition"
    ) { targetId ->
        val selectedExemption = targetId?.let { id -> exemptions.firstOrNull { it.id == id } }
        if (selectedExemption != null) {
            ExemptionDetail(
                exemption = selectedExemption,
                proofPreviewUrls = proofPreviewUrls,
                proofPreviewsLoading = proofPreviewsLoading,
                proofPreviewsUnavailable = proofPreviewsUnavailable,
                onBack = { selectedExemptionId = null },
                onSupplement = {
                    resubmittingExemption = selectedExemption
                    selectedExemptionId = null
                    selectedTab = ExemptionTab.NewApplication
                }
            )
        } else {
            AnimatedContent(
                targetState = selectedTab,
                modifier = Modifier.fillMaxWidth(),
                transitionSpec = {
                    val direction = if (targetState.ordinal >= initialState.ordinal) 1 else -1
                    (fadeIn(tween(BNBUMotion.Standard)) +
                        slideInHorizontally(tween(BNBUMotion.Standard)) {
                            direction * (it / 14)
                        }) togetherWith
                        (fadeOut(tween(BNBUMotion.Quick)) +
                            slideOutHorizontally(tween(BNBUMotion.Standard)) {
                                -direction * (it / 16)
                            })
                },
                label = "exemption-tab-transition"
            ) { animatedTab ->
                LazyColumn(
                    state = if (animatedTab == ExemptionTab.MyApplications) {
                        applicationsListState
                    } else {
                        formListState
                    },
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .bnbuClickable(enabled = !isFormSubmitting, onClick = handleBack),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = null,
                    tint = cs.onSurface
                )
                Text(
                    text = interfaceText("返回", "Back"),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        item {
            SectionTitle(
                eyebrow = interfaceText("免测申请", "Exemption"),
                title = interfaceText("体育免测与免打卡申请", "Test and check-in exemptions")
            )
        }

        item {
            ExemptionRulesPanel(isPreview = repository == null)
        }

        item {
            SegmentedControl(
                values = ExemptionTab.entries,
                selected = animatedTab,
                label = { it.label() },
                onSelected = { if (!isFormSubmitting) selectedTab = it }
            )
        }

        successMessage?.let { message ->
            item {
                StatusMessagePanel(
                    message = message,
                    onDismiss = { successMessage = null }
                )
            }
        }
        errorMessage?.let { message ->
            item {
                ValidationPanel(message = message)
            }
        }
        userFacingError?.let { error ->
            item {
                BNBUErrorPanel(
                    error = error,
                    onDismiss = { userFacingError = null }
                )
            }
        }

        if (isLoading && exemptions.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        when (animatedTab) {
            ExemptionTab.MyApplications -> {
                if (exemptions.isEmpty()) {
                    item {
                        EmptyPlaceholder(
                            title = interfaceText("暂无申请", "No applications"),
                            message = interfaceText("你还没有提交过免测或免打卡申请。", "You have not submitted a test- or check-in-exemption application.")
                        )
                    }
                } else {
                    items(items = exemptions, key = { it.id }) { exemption ->
                        ExemptionCard(exemption = exemption, onClick = { selectedExemptionId = exemption.id })
                    }
                }
            }

            ExemptionTab.NewApplication -> {
                val hasPendingExemption = exemptions.any {
                    it.status == "待审核" || it.status == "审核中"
                }
                val pendingExemptionTypes = exemptions
                    .filter { it.status == "待审核" || it.status == "审核中" }
                    .mapTo(mutableSetOf()) { it.type }
                item {
                    NewExemptionForm(
                        appState = appState,
                        repository = repository,
                        initialExemption = resubmittingExemption,
                        hasPendingExemption = hasPendingExemption,
                        pendingExemptionTypes = pendingExemptionTypes,
                        isSubmitting = isFormSubmitting,
                        onSubmittingChanged = { isFormSubmitting = it },
                        onUnauthorized = onUnauthorized,
                        onSuccess = { msg ->
                            successMessage = msg
                            userFacingError = null
                            resubmittingExemption = null
                            selectedTab = ExemptionTab.MyApplications
                            loadExemptions()
                        },
                        onError = {
                            userFacingError = null
                            errorMessage = it
                        },
                        onRemoteError = { throwable ->
                            val mapped = ClientErrorMapper.map(
                                throwable,
                                ClientErrorContext.EXEMPTION
                            )
                            errorMessage = null
                            userFacingError = mapped
                            SafeClientLogger.log(
                                error = mapped,
                                context = ClientErrorContext.EXEMPTION,
                                httpStatus = (throwable as? ApiHttpException)?.statusCode
                            )
                        }
                    )
                }
            }
        }
                }
            }
        }
    }
}

@Composable
private fun ExemptionCard(exemption: Exemption, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val statusColor = when (exemption.status) {
        "已通过" -> cs.primary
        "已驳回" -> cs.error
        else -> cs.secondary
    }

    SwissPanel(modifier = Modifier.bnbuClickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(
                imageVector = Icons.Filled.FitnessCenter,
                contentDescription = null,
                tint = cs.primary,
                modifier = Modifier.size(22.dp)
            )
            Spacer(Modifier.width(10.dp))
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = exemption.localizedTypeLabel(),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f)
                    )
                    StatusBadge(text = exemption.status.localizedExemptionStatus(), filled = exemption.status == "已通过")
                }

                if (exemption.reason.isNotBlank()) {
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(
                            imageVector = Icons.Filled.Description,
                            contentDescription = null,
                            tint = cs.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = exemption.reason,
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                if (exemption.organization.isNotBlank()) {
                    Text(
                        text = interfaceText("所属组织：${exemption.organization}", "Organization: ${exemption.organization}"),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                if (exemption.proofFiles.isNotEmpty()) {
                    Text(
                        text = interfaceText("已上传 ${exemption.proofFiles.size} 张证明图片", "${exemption.proofFiles.size} proof image(s) uploaded"),
                        color = cs.primary,
                        style = MaterialTheme.typography.labelMedium
                    )
                }

                if (exemption.reviewComment.isNotBlank()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cs.surfaceVariant, MaterialTheme.shapes.small)
                            .padding(10.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Warning,
                            contentDescription = null,
                            tint = cs.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Column {
                            Text(
                                text = interfaceText("审核意见", "Review comments"),
                                color = cs.onSurface,
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                text = exemption.reviewComment,
                                color = cs.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

                Text(
                    text = interfaceText("提交时间：${exemption.createdAt} · 点击查看详情", "Submitted: ${exemption.createdAt} · View details"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
            }
        }
    }
}

@Composable
private fun ExemptionDetail(
    exemption: Exemption,
    proofPreviewUrls: Map<String, String>,
    proofPreviewsLoading: Boolean,
    proofPreviewsUnavailable: Boolean,
    onBack: () -> Unit,
    onSupplement: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    BackHandler(onBack = onBack)
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().height(48.dp).bnbuClickable(onClick = onBack),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = cs.onSurface)
                Text(interfaceText("返回我的申请", "Back to my applications"), color = cs.onSurface, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item {
            SwissPanel(contentPadding = 20.dp) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(cs.primaryContainer, MaterialTheme.shapes.medium),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.FitnessCenter,
                            contentDescription = null,
                            tint = cs.primary,
                            modifier = Modifier.size(23.dp)
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = interfaceText("申请详情", "Application details"),
                            color = cs.primary,
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = exemption.localizedTypeLabel(),
                            color = cs.onSurface,
                            style = MaterialTheme.typography.headlineSmall
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    StatusBadge(text = exemption.status.localizedExemptionStatus(), filled = exemption.status == "已通过")
                }
            }
        }
        item {
            SwissPanel {
                ExemptionDetailSectionHeader(
                    icon = Icons.AutoMirrored.Filled.Assignment,
                    title = interfaceText("申请信息", "Application information")
                )
                Spacer(Modifier.height(16.dp))
                ExemptionDetailField(
                    label = interfaceText("申请理由", "Application reason"),
                    value = exemption.reason.ifBlank {
                        interfaceText("未填写申请理由", "No application reason provided")
                    }
                )
                if (exemption.organization.isNotBlank()) {
                    Spacer(Modifier.height(14.dp))
                    ExemptionDetailField(
                        label = interfaceText("所属组织", "Organization"),
                        value = exemption.organization
                    )
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cs.surfaceVariant, MaterialTheme.shapes.medium)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Schedule,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = interfaceText("提交时间", "Submitted"),
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = exemption.createdAt,
                            color = cs.onSurface,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
        item {
            SwissPanel {
                ExemptionDetailSectionHeader(
                    icon = Icons.Filled.Description,
                    title = interfaceText("证明材料", "Supporting documents"),
                    trailingText = interfaceText(
                        "${exemption.proofFiles.size} 张图片",
                        "${exemption.proofFiles.size} image(s)"
                    )
                )
                Spacer(Modifier.height(16.dp))
                if (exemption.proofFiles.isEmpty()) {
                    Text(
                        text = interfaceText("尚未上传证明图片", "No supporting images uploaded"),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    exemption.proofFiles.forEachIndexed { index, proof ->
                        if (index > 0) Spacer(Modifier.height(10.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(cs.surfaceVariant, MaterialTheme.shapes.medium)
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            ExemptionProofThumbnail(
                                proof = proof,
                                index = index,
                                previewUrl = proofPreviewUrls[proof],
                                loading = proofPreviewsLoading
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = proof.exemptionProofDisplayName(index),
                                    color = cs.onSurface,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = interfaceText("证明图片 ${index + 1}", "Supporting image ${index + 1}"),
                                    color = cs.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                    if (proofPreviewsUnavailable) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = interfaceText(
                                "部分证明图片暂时无法加载。",
                                "Some proof images are temporarily unavailable."
                            ),
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
        item {
            SwissPanel {
                ExemptionDetailSectionHeader(
                    icon = Icons.Filled.Info,
                    title = interfaceText("处理意见", "Review comments")
                )
                Spacer(Modifier.height(14.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cs.surfaceVariant, MaterialTheme.shapes.medium)
                        .padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(cs.primaryContainer, MaterialTheme.shapes.extraLarge),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Info,
                            contentDescription = null,
                            tint = cs.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = interfaceText("当前处理意见", "Current review comment"),
                            color = cs.onSurface,
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = exemption.reviewComment.ifBlank {
                                interfaceText("暂无处理意见", "No review comment yet")
                            },
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
        if (exemption.status == "需补材料" || exemption.status == "已驳回") {
            item {
                ActionButton(
                    title = interfaceText("补交证明材料", "Submit additional documents"),
                    icon = Icons.Filled.FileUpload,
                    filled = true,
                    onClick = onSupplement
                )
            }
        }
    }
}

@Composable
private fun ExemptionProofThumbnail(
    proof: String,
    index: Int,
    previewUrl: String?,
    loading: Boolean
) {
    val cs = MaterialTheme.colorScheme
    val shape = MaterialTheme.shapes.small
    Box(
        modifier = Modifier
            .size(width = 96.dp, height = 72.dp)
            .clip(shape)
            .background(cs.surface),
        contentAlignment = Alignment.Center
    ) {
        when {
            proof.startsWith("mock://") -> Image(
                painter = painterResource(R.drawable.exemption_proof_preview),
                contentDescription = interfaceText(
                    "证明图片 ${index + 1} 缩略图",
                    "Proof image ${index + 1} thumbnail"
                ),
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            !previewUrl.isNullOrBlank() -> SubcomposeAsyncImage(
                model = previewUrl,
                contentDescription = interfaceText(
                    "证明图片 ${index + 1} 缩略图",
                    "Proof image ${index + 1} thumbnail"
                ),
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                    }
                },
                error = {
                    Icon(
                        imageVector = Icons.Filled.Photo,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(26.dp)
                    )
                }
            )

            loading -> CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)

            else -> Icon(
                imageVector = Icons.Filled.Photo,
                contentDescription = null,
                tint = cs.primary,
                modifier = Modifier.size(26.dp)
            )
        }
    }
}

private fun String.exemptionProofDisplayName(index: Int): String {
    val candidate = substringAfterLast('/').substringBefore('?')
    val hasImageFileName =
        candidate.endsWith(".jpg", ignoreCase = true) ||
        candidate.endsWith(".jpeg", ignoreCase = true) ||
        candidate.endsWith(".png", ignoreCase = true)
    return if (hasImageFileName) {
        candidate
    } else {
        interfaceText("证明图片 ${index + 1}", "Proof image ${index + 1}")
    }
}

@Composable
private fun ExemptionDetailSectionHeader(
    icon: ImageVector,
    title: String,
    trailingText: String? = null
) {
    val cs = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(cs.primaryContainer, MaterialTheme.shapes.medium),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = cs.primary,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(Modifier.width(10.dp))
        Text(
            text = title,
            color = cs.onSurface,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f)
        )
        if (trailingText != null) {
            Spacer(Modifier.width(8.dp))
            Text(
                text = trailingText,
                modifier = Modifier
                    .background(cs.surfaceVariant, MaterialTheme.shapes.extraLarge)
                    .padding(horizontal = 10.dp, vertical = 5.dp),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun ExemptionDetailField(label: String, value: String) {
    val cs = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = label,
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium
        )
        Text(
            text = value,
            color = cs.onSurface,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun ExemptionTypeSelector(
    selected: ExemptionType,
    enabled: Boolean,
    pendingExemptionTypes: Set<String>,
    gender: String,
    onSelected: (ExemptionType) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val availableTypes = listOf(
        if (gender.equals("male", ignoreCase = true)) ExemptionType.Run1000m else ExemptionType.Run800m,
        ExemptionType.SchoolTeam,
        ExemptionType.StudentClub
    )
    availableTypes.chunked(2).forEachIndexed { rowIndex, options ->
        if (rowIndex > 0) Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            options.forEach { option ->
                val isSelected = selected == option
                val hasPendingSameType = option.apiValue in pendingExemptionTypes
                val backgroundColor by animateColorAsState(
                    targetValue = if (isSelected) cs.primaryContainer else cs.surfaceVariant,
                    animationSpec = BNBUMotion.colorSpec,
                    label = "exemption-type-background"
                )
                val contentColor by animateColorAsState(
                    targetValue = if (isSelected) cs.onPrimaryContainer else cs.onSurfaceVariant,
                    animationSpec = BNBUMotion.colorSpec,
                    label = "exemption-type-content"
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .background(
                            backgroundColor,
                            MaterialTheme.shapes.small
                        )
                        .bnbuClickable(enabled = enabled && !hasPendingSameType) { onSelected(option) }
                        .padding(horizontal = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option.localizedLabel(),
                        color = contentColor,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                    )
                }
            }
        }
    }
}

@Composable
private fun NewExemptionForm(
    appState: StudentAppState,
    repository: ApiStudentRepository?,
    initialExemption: Exemption? = null,
    hasPendingExemption: Boolean,
    pendingExemptionTypes: Set<String>,
    isSubmitting: Boolean,
    onSubmittingChanged: (Boolean) -> Unit,
    onUnauthorized: () -> Unit,
    onSuccess: (String) -> Unit,
    onError: (String) -> Unit,
    onRemoteError: (Throwable) -> Unit
) {
    val writeEnabled = appState.isWriteAllowed
    var selectedType by remember(initialExemption?.id) {
        mutableStateOf(
            initialExemption?.type?.toExemptionType()
                ?: if (appState.workspace.student.gender.equals("female", ignoreCase = true)) {
                    ExemptionType.Run800m
                } else {
                    ExemptionType.Run1000m
                }
        )
    }
    var organization by remember(initialExemption?.id) { mutableStateOf(initialExemption?.organization.orEmpty()) }
    var reason by remember(initialExemption?.id) { mutableStateOf("") }
    var organizationFocusedOnce by remember(initialExemption?.id) { mutableStateOf(false) }
    var organizationTouched by remember(initialExemption?.id) { mutableStateOf(false) }
    var reasonFocusedOnce by remember(initialExemption?.id) { mutableStateOf(false) }
    var reasonTouched by remember(initialExemption?.id) { mutableStateOf(false) }
    var submitAttempted by remember(initialExemption?.id) { mutableStateOf(false) }
    val organizationFocusRequester = remember(initialExemption?.id) { FocusRequester() }
    val reasonFocusRequester = remember(initialExemption?.id) { FocusRequester() }
    var proofAttachments by remember { mutableStateOf<List<ProofAttachment>>(emptyList()) }
    var attachmentNotice by remember { mutableStateOf<String?>(null) }
    var cameraTempUri by remember { mutableStateOf<Uri?>(null) }
    var cameraTempFile by remember { mutableStateOf<File?>(null) }
    var submissionIntentId by rememberSaveable(initialExemption?.id) {
        mutableStateOf(UUID.randomUUID().toString())
    }
    var preparedSubmissionFingerprint by rememberSaveable(initialExemption?.id) {
        mutableStateOf<String?>(null)
    }
    var preparedMediaIds by rememberSaveable(initialExemption?.id) {
        mutableStateOf(arrayListOf<String>())
    }
    val submissionJob = remember { mutableStateOf<Job?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val latestProofAttachments by rememberUpdatedState(proofAttachments)
    val latestCameraTempFile by rememberUpdatedState(cameraTempFile)
    val latestIsSubmitting by rememberUpdatedState(isSubmitting)
    val hasPendingSameType = initialExemption == null &&
        hasPendingExemption &&
        selectedType.apiValue in pendingExemptionTypes
    val organizationError = if (
        selectedType.isCheckInExemption &&
        (organizationTouched || submitAttempted) &&
        organization.isBlank()
    ) {
        interfaceText("请填写相关组织名称", "Enter the organization name.")
    } else {
        null
    }
    val reasonError = if (
        (reasonTouched || submitAttempted) && reason.isBlank()
    ) {
        interfaceText(
            "请填写申请理由或补充说明",
            "Enter an application reason or additional notes."
        )
    } else {
        null
    }

    DisposableEffect(Unit) {
        onDispose {
            submissionJob.value?.cancel()
            latestProofAttachments.forEach {
                it.deleteOwnedCameraFile(context, "exemption_")
                it.releasePersistableReadPermissionIfPossible(context)
            }
            latestCameraTempFile?.delete()
        }
    }

    val maxAttachments = MaxExemptionMediaItems

    // Camera launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        val uri = cameraTempUri
        val file = cameraTempFile
        if (latestIsSubmitting) {
            file?.delete()
        } else if (success && uri != null && file != null) {
            val attachment = file.toProofAttachmentFromCamera(uri)
            if (attachment != null && attachment.isValidForUpload) {
                proofAttachments = proofAttachments + attachment
                attachmentNotice = interfaceText("已拍摄 1 张凭证照片。", "Captured 1 proof photo.")
            } else {
                file.delete()
                attachmentNotice = interfaceText("拍摄失败，请重试或从相册选择。", "Capture failed. Try again or choose from photos.")
            }
        } else {
            file?.delete()
        }
        cameraTempUri = null
        cameraTempFile = null
    }

    // Gallery picker launcher
    val mediaPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        if (isSubmitting) {
            attachmentNotice = interfaceText("正在提交，暂时不能修改证明图片。", "Proof images cannot be changed while submitting.")
            return@rememberLauncherForActivityResult
        }
        val remaining = maxAttachments - proofAttachments.size
        if (remaining <= 0) {
            attachmentNotice = interfaceText("已达到 $maxAttachments 个凭证上限。", "Maximum of $maxAttachments proof items reached.")
            return@rememberLauncherForActivityResult
        }
        val selectedUris = uris.take(remaining)
        val startIndex = proofAttachments.size
        scope.launch {
            val pickedAttachments = try {
                withContext(Dispatchers.IO) {
                    selectedUris.mapIndexedNotNull { offset, uri ->
                        uri.toProofAttachment(context = context, index = startIndex + offset)
                    }
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (_: Exception) {
                attachmentNotice = interfaceText("无法读取所选图片，请重新选择。", "Could not read the selected image. Choose it again.")
                return@launch
            }
            if (latestIsSubmitting) return@launch
            val existingSources = latestProofAttachments.mapTo(mutableSetOf()) { it.source }
            val newAttachments = pickedAttachments
                .distinctBy { it.source }
                .filterNot { it.source in existingSources }
                .filter { attachment ->
                    val uri = runCatching { Uri.parse(attachment.source) }.getOrNull()
                    uri != null && context.takePersistableReadPermissionIfPossible(uri)
                }
            if (newAttachments.isNotEmpty()) {
                proofAttachments = latestProofAttachments + newAttachments
            }
            attachmentNotice = when {
                uris.isEmpty() -> null
                newAttachments.isEmpty() -> interfaceText("未添加图片：仅支持 JPEG、PNG，请避免重复选择并使用可长期授权的相册图片。", "No image added. Use JPEG or PNG photos with persistent access and avoid duplicates.")
                newAttachments.size < uris.size ->
                    interfaceText("已添加 ${newAttachments.size} 张图片；非 JPEG/PNG、重复、超限或无法长期授权的图片已跳过。", "Added ${newAttachments.size} image(s); non-JPEG/PNG, duplicate, excess, or inaccessible images were skipped.")
                else -> interfaceText("已添加 ${newAttachments.size} 张图片。", "Added ${newAttachments.size} image(s).")
            }
        }
    }

    val cs = MaterialTheme.colorScheme

    SwissPanel {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (initialExemption != null) {
                Text(
                    text = interfaceText("正在为 ${initialExemption.localizedTypeLabel()} 补交证明，请上传新的有效材料。", "Submitting additional documents for ${initialExemption.localizedTypeLabel()}. Upload new valid documents."),
                    color = cs.primary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (initialExemption == null) {
                Text(
                    text = interfaceText("选择申请类型", "Select application type"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
                ExemptionTypeSelector(
                    selected = selectedType,
                    enabled = !isSubmitting,
                    pendingExemptionTypes = pendingExemptionTypes,
                    gender = appState.workspace.student.gender,
                    onSelected = {
                        selectedType = it
                        if (!it.isCheckInExemption) organization = ""
                    }
                )
                if (hasPendingSameType) {
                    ValidationPanel(
                        message = interfaceText("你已有一个相同类型的待审核申请，请等待教师处理后再提交新申请。", "You already have a pending application of this type. Wait for the teacher's decision before submitting another.")
                    )
                }
            }

            AnimatedVisibility(
                visible = selectedType.isCheckInExemption,
                enter = expandVertically(tween(BNBUMotion.Standard)) + fadeIn(tween(BNBUMotion.Standard)),
                exit = shrinkVertically(tween(BNBUMotion.Standard)) + fadeOut(tween(BNBUMotion.Quick))
            ) {
                BNBUFormField(
                    value = organization,
                    onValueChange = { organization = it.take(128) },
                    label = interfaceText("组织名称", "Organization name"),
                    testTag = "exemption.organization",
                    enabled = !isSubmitting,
                    loading = isSubmitting,
                    required = true,
                    placeholder = interfaceText("填写相关组织名称", "Enter the organization name"),
                    supportingText = interfaceText("请填写申请对应的组织全称。", "Enter the full organization name."),
                    errorText = organizationError,
                    counter = organization.length to 128,
                    inputModifier = Modifier.focusRequester(organizationFocusRequester),
                    onFocusChanged = { focused ->
                        if (focused) {
                            organizationFocusedOnce = true
                        } else if (organizationFocusedOnce) {
                            organizationTouched = true
                        }
                    }
                )
            }

            BNBUFormField(
                value = reason,
                onValueChange = { reason = it.take(MaxExemptionReasonLength) },
                label = if (initialExemption == null) {
                    interfaceText("申请理由", "Application reason")
                } else {
                    interfaceText("补充说明", "Additional notes")
                },
                testTag = "exemption.reason",
                enabled = !isSubmitting,
                loading = isSubmitting,
                required = true,
                placeholder = if (initialExemption != null) {
                    interfaceText("请说明本次补充材料的内容...", "Describe the additional documents...")
                } else if (selectedType.isCheckInExemption) {
                    interfaceText("请说明组织身份及申请原因...", "Describe your organization identity and reason...")
                } else {
                    interfaceText("请说明申请免测的原因...", "Explain why you are applying for an exemption...")
                },
                supportingText = interfaceText(
                    "请只填写审核所需信息，避免加入无关敏感资料。",
                    "Include only information needed for review and avoid unrelated sensitive data."
                ),
                singleLine = false,
                minLines = 3,
                maxLines = 6,
                errorText = reasonError,
                counter = reason.length to MaxExemptionReasonLength,
                inputModifier = Modifier.focusRequester(reasonFocusRequester),
                onFocusChanged = { focused ->
                    if (focused) {
                        reasonFocusedOnce = true
                    } else if (reasonFocusedOnce) {
                        reasonTouched = true
                    }
                }
            )

            // ── Proof file section with camera/gallery ─────────────
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = interfaceText("证明材料", "Supporting documents"),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = interfaceText("${proofAttachments.size} / $maxAttachments 张图片", "${proofAttachments.size} / $maxAttachments images"),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium
                    )
                }

                // Camera + Gallery buttons
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ActionButton(
                        title = interfaceText("拍照", "Take photo"),
                        icon = Icons.Filled.CameraAlt,
                        filled = proofAttachments.size < maxAttachments,
                        modifier = Modifier.weight(1f),
                        enabled = !isSubmitting && proofAttachments.size < maxAttachments,
                        onClick = {
                            if (isSubmitting) return@ActionButton
                            if (proofAttachments.size >= maxAttachments) {
                                attachmentNotice = interfaceText("已达到 $maxAttachments 个凭证上限。", "Maximum of $maxAttachments proof items reached.")
                                return@ActionButton
                            }
                            var photoFile: File? = null
                            try {
                                val picturesDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
                                    ?: context.cacheDir
                                photoFile = File(
                                    picturesDir,
                                    "exemption_${System.currentTimeMillis()}.jpg"
                                )
                                photoFile.parentFile?.mkdirs()
                                val uri = FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    photoFile
                                )
                                cameraTempUri = uri
                                cameraTempFile = photoFile
                                cameraLauncher.launch(uri)
                            } catch (_: Exception) {
                                photoFile?.delete()
                                cameraTempUri = null
                                cameraTempFile = null
                                attachmentNotice = interfaceText("相机不可用，请从相册选择证明材料。", "Camera is unavailable. Choose supporting documents from photos.")
                            }
                        }
                    )

                    ActionButton(
                        title = interfaceText("选择照片", "Choose photos"),
                        icon = Icons.Filled.UploadFile,
                        filled = proofAttachments.size < maxAttachments,
                        modifier = Modifier.weight(1f),
                        enabled = !isSubmitting && proofAttachments.size < maxAttachments,
                        onClick = {
                            if (proofAttachments.size < maxAttachments) {
                                mediaPicker.launch(arrayOf("image/*"))
                            } else {
                                attachmentNotice = interfaceText("已达到 $maxAttachments 个凭证上限。", "Maximum of $maxAttachments proof items reached.")
                            }
                        }
                    )
                }

                AnimatedVisibility(
                    visible = attachmentNotice != null,
                    enter = expandVertically(tween(BNBUMotion.Standard)) + fadeIn(tween(BNBUMotion.Standard)),
                    exit = shrinkVertically(tween(BNBUMotion.Standard)) + fadeOut(tween(BNBUMotion.Quick))
                ) {
                    attachmentNotice?.let { notice ->
                        Text(
                            text = notice,
                            color = cs.primary,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }

                // Display current attachments
                Column(
                    modifier = Modifier.animateContentSize(tween(BNBUMotion.Standard)),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (proofAttachments.isEmpty()) {
                        Text(
                            text = if (selectedType.isCheckInExemption) {
                                interfaceText("必填：至少上传一张能够证明相关组织身份的 JPEG 或 PNG 图片。", "Required: upload at least one JPEG or PNG image proving organization membership.")
                            } else {
                                interfaceText("必填：至少上传一张耐力跑免测 JPEG 或 PNG 证明图片。", "Required: upload at least one JPEG or PNG image for the endurance-run exemption.")
                            },
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    } else {
                        proofAttachments.forEach { attachment ->
                            ExemptionProofAttachmentRow(
                                attachment = attachment,
                                enabled = !isSubmitting,
                                onRemove = {
                                    val remainingAttachments = proofAttachments.filterNot {
                                        it.id == attachment.id
                                    }
                                    attachment.deleteOwnedCameraFile(context, "exemption_")
                                    if (remainingAttachments.none { it.source == attachment.source }) {
                                        attachment.releasePersistableReadPermissionIfPossible(context)
                                    }
                                    proofAttachments = remainingAttachments
                                }
                            )
                        }
                        }
                    }
                }

            PrimaryActionButton(
                title = if (isSubmitting) interfaceText("提交中...", "Submitting...") else if (initialExemption != null) interfaceText("提交补充材料", "Submit additional documents") else interfaceText("提交申请", "Submit application"),
                icon = Icons.Filled.Add,
                enabled = !isSubmitting &&
                    writeEnabled &&
                    !hasPendingSameType &&
                    submissionJob.value?.isActive != true,
                loading = isSubmitting,
                onClick = {
                    if (!writeEnabled || isSubmitting || submissionJob.value?.isActive == true) return@PrimaryActionButton
                    if (hasPendingSameType) {
                        onError(interfaceText("你已有一个相同类型的待审核申请，请等待教师处理后再提交新申请。", "You already have a pending application of this type. Wait for the teacher's decision before submitting another."))
                        return@PrimaryActionButton
                    }
                    submitAttempted = true
                    if (selectedType.isCheckInExemption && organization.isBlank()) {
                        organizationFocusRequester.requestFocus()
                        return@PrimaryActionButton
                    }
                    val normalizedReason = reason.trim()
                    if (normalizedReason.isEmpty()) {
                        reasonFocusRequester.requestFocus()
                        return@PrimaryActionButton
                    }
                    if (proofAttachments.isEmpty()) {
                        onError(interfaceText("请至少上传一张 JPEG 或 PNG 证明图片", "Upload at least one JPEG or PNG proof image."))
                        return@PrimaryActionButton
                    }
                    val remoteRepository = repository
                    if (remoteRepository == null) {
                        onError(interfaceText("尚未连接服务器，无法提交申请；请重新登录后重试。", "The server is not connected, so the application cannot be submitted. Sign in again and retry."))
                        return@PrimaryActionButton
                    }
                    val selectedTypeSnapshot = selectedType
                    val organizationSnapshot = organization.trim().takeIf {
                        selectedTypeSnapshot.isCheckInExemption && it.isNotBlank()
                    }
                    val proofSnapshot = proofAttachments.toList()
                    val submissionFingerprint = exemptionSubmissionFingerprint(
                        type = selectedTypeSnapshot.apiValue,
                        reason = normalizedReason,
                        organization = organizationSnapshot,
                        attachments = proofSnapshot
                    )
                    onSubmittingChanged(true)
                    val request = appState.launchAuthenticatedRequest {
                        try {
                            // Reuse the same confirmed media IDs when the user
                            // retries an unchanged submission after an ambiguous
                            // create/submit response. This keeps the exemption
                            // request body and its durable idempotency identity stable.
                            var uploadedCosKeys = preparedMediaIds.takeIf {
                                preparedSubmissionFingerprint == submissionFingerprint &&
                                    it.size == proofSnapshot.size
                            }.orEmpty()
                            if (proofSnapshot.isNotEmpty() && uploadedCosKeys.isEmpty()) {
                                val cacheDir = context.cacheDir
                                val uploadResult = remoteRepository.uploadProofFiles(
                                    proofAttachments = proofSnapshot,
                                    cacheDir = cacheDir
                                )
                                uploadedCosKeys = uploadResult.getOrThrow().map { it.cosKey }
                                preparedSubmissionFingerprint = submissionFingerprint
                                preparedMediaIds = ArrayList(uploadedCosKeys)
                            }

                            val application = ExemptionApplication(
                                type = selectedTypeSnapshot.apiValue,
                                reason = normalizedReason,
                                proofFiles = uploadedCosKeys,
                                organization = organizationSnapshot,
                                intentId = submissionIntentId
                            )
                            val response = initialExemption?.let {
                                remoteRepository.supplementExemption(it, application)
                            } ?: remoteRepository.submitExemption(application)
                            proofSnapshot.forEach {
                                it.deleteOwnedCameraFile(context, "exemption_")
                                it.releasePersistableReadPermissionIfPossible(context)
                            }
                            val submittedIds = proofSnapshot.mapTo(mutableSetOf()) { it.id }
                            proofAttachments = proofAttachments.filterNot { it.id in submittedIds }
                            submissionIntentId = UUID.randomUUID().toString()
                            preparedSubmissionFingerprint = null
                            preparedMediaIds = arrayListOf()
                            onSuccess(
                                if (initialExemption != null) interfaceText("补充材料已提交 (${response.id})", "Additional documents submitted (${response.id})")
                                else interfaceText("申请已提交 (${response.id})", "Application submitted (${response.id})")
                            )
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            if (e is ApiHttpException && e.statusCode == 401) {
                                onUnauthorized()
                                return@launchAuthenticatedRequest
                            }
                            onRemoteError(e)
                        } finally {
                            onSubmittingChanged(false)
                        }
                    }
                    submissionJob.value = request
                    if (request == null) {
                        onSubmittingChanged(false)
                        onUnauthorized()
                    }
                }
            )
        }
    }
}

private fun exemptionSubmissionFingerprint(
    type: String,
    reason: String,
    organization: String?,
    attachments: List<ProofAttachment>
): String {
    val fields = buildList {
        add(type)
        add(reason)
        add(organization.orEmpty())
        attachments.forEach { attachment ->
            add(attachment.id)
            add(attachment.source)
            add(attachment.byteCount.toString())
            add(attachment.type.name)
        }
    }
    val canonical = buildString {
        fields.forEach { field -> append(field.length).append(':').append(field) }
    }
    return MessageDigest.getInstance("SHA-256")
        .digest(canonical.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte ->
            (byte.toInt() and 0xff).toString(16).padStart(2, '0')
        }
}

@Composable
private fun ExemptionProofAttachmentRow(
    attachment: ProofAttachment,
    enabled: Boolean,
    onRemove: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cs.surfaceVariant, MaterialTheme.shapes.small)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Filled.Photo,
            contentDescription = null,
            tint = cs.onSurface,
            modifier = Modifier.size(24.dp)
        )
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                text = attachment.fileName,
                color = cs.onSurface,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = buildList {
                    add(attachment.type.label)
                    add(attachment.displaySize)
                    attachment.validationMessage?.let { add(it) }
                }.joinToString(" · "),
                color = if (attachment.isValidForUpload) cs.onSurfaceVariant else cs.primary,
                style = MaterialTheme.typography.labelMedium
            )
        }
        Box(
            modifier = Modifier
                .size(32.dp)
                .bnbuClickable(enabled = enabled, onClick = onRemove),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Delete,
                contentDescription = interfaceText("移除", "Remove"),
                tint = cs.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

// ── URI helper extensions (same pattern as CheckInScreen) ──────────

private fun Uri.toProofAttachment(context: Context, index: Int): ProofAttachment? {
    val mimeType = context.contentResolver.getType(this)
        ?.substringBefore(';')
        ?.trim()
        ?.lowercase()
    val originalName = context.displayNameFor(this, index)
    val hasSupportedExtension = originalName.endsWith(".jpg", ignoreCase = true) ||
        originalName.endsWith(".jpeg", ignoreCase = true) ||
        originalName.endsWith(".png", ignoreCase = true)
    if (mimeType != null && mimeType !in AllowedExemptionImageMimeTypes) return null
    if (mimeType == null && !hasSupportedExtension) return null
    val fileName = if (hasSupportedExtension) {
        originalName
    } else {
        "$originalName.${if (mimeType == "image/png") "png" else "jpg"}"
    }
    return ProofAttachment(
        id = UUID.randomUUID().toString(),
        type = ProofMediaType.Image,
        fileName = fileName,
        byteCount = context.byteCountFor(this),
        source = toString()
    )
}

private fun String.exemptionStatusLabel(): String = when (this) {
    "pending" -> "待审核"
    "reviewing" -> "审核中"
    "supplement_required" -> "需补材料"
    "approved" -> "已通过"
    "rejected" -> "已驳回"
    "expired" -> "已过期"
    else -> this
}

/** Backend/status values stay stable; only their UI label is localized. */
private fun String.localizedExemptionStatus(): String = when (this) {
    "待审核", "审核中" -> interfaceText("审核中", "Under review")
    "需补材料" -> interfaceText("需补材料", "Additional materials required")
    "已通过" -> interfaceText("已通过", "Approved")
    "已驳回" -> interfaceText("已驳回", "Rejected")
    "已过期" -> interfaceText("已过期", "Expired")
    else -> this
}

/** Stable type codes use client-owned labels; an unknown server value stays unchanged. */
private fun Exemption.localizedTypeLabel(): String = when (type) {
    "run_800m" -> interfaceText("800m 免测", "800m test exemption")
    "run_1000m" -> interfaceText("1000m 免测", "1000m test exemption")
    "school_team" -> interfaceText("校队免打卡", "School-team check-in exemption")
    "student_club" -> interfaceText("社团免打卡", "Student-club check-in exemption")
    "physical_test" -> interfaceText("历史体测免测", "Legacy physical-test exemption")
    "exercise_check_in" -> interfaceText("历史运动打卡豁免", "Legacy exercise check-in exemption")
    "special_circumstance" -> interfaceText("特殊情况申请", "Special-circumstance application")
    else -> type
}

private fun ExemptionType.localizedLabel(): String = when (this) {
    ExemptionType.Run800m -> interfaceText("800m 耐力跑免测", "800m endurance-run exemption")
    ExemptionType.Run1000m -> interfaceText("1000m 耐力跑免测", "1000m endurance-run exemption")
    ExemptionType.SchoolTeam -> interfaceText("校队免打卡", "School-team check-in exemption")
    ExemptionType.StudentClub -> interfaceText("社团免打卡", "Student-club check-in exemption")
    ExemptionType.SpecialCircumstance -> interfaceText("特殊情况申请", "Special-circumstance application")
}

private fun String.toExemptionType(): ExemptionType = when (this) {
    "run_800m", "800m" -> ExemptionType.Run800m
    "run_1000m", "1000m", "physical_test" -> ExemptionType.Run1000m
    "school_team", "team", "exercise_check_in" -> ExemptionType.SchoolTeam
    "student_club", "club" -> ExemptionType.StudentClub
    "special_circumstance", "special" -> ExemptionType.SpecialCircumstance
    else -> ExemptionType.SpecialCircumstance
}

@Composable
private fun ExemptionRulesPanel(isPreview: Boolean) {
    val cs = MaterialTheme.colorScheme
    SwissPanel {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = if (isPreview) interfaceText("服务未连接", "Server unavailable") else interfaceText("申请说明", "Application information"),
                color = cs.primary,
                style = MaterialTheme.typography.labelMedium
            )
            Text(
                text = interfaceText("申请会按性别显示 800m 或 1000m，并向所有学生开放校队、社团类型；后端保存结构化类型。", "Applications show 800 m or 1000 m by gender and make school-team and student-club types available to every student; the backend preserves the structured subtype."),
                color = cs.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = interfaceText("耐力跑免测和校队/社团免打卡至少上传一张 JPEG 或 PNG 证明图片；可拍照或从相册选择，不接受 PDF、视频或其他文件。", "Endurance-run and team/club applications require at least one JPEG or PNG proof image, taken with the camera or chosen from photos. PDF, video, and other files are not accepted."),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = if (isPreview) {
                    interfaceText("当前尚未连接服务器，页面不会生成本地申请数据；请重新登录后提交。", "The server is not connected. This page will not create local application data; sign in again to submit.")
                } else {
                    interfaceText("申请被驳回或需要补材料时，可在申请详情中补充材料后再次提交。", "If an application is rejected or needs more documents, add them from its details and submit again.")
                },
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

private fun File.toProofAttachmentFromCamera(sourceUri: Uri): ProofAttachment? {
    if (!exists() || length() <= 0L) return null
    return ProofAttachment(
        id = UUID.randomUUID().toString(),
        type = ProofMediaType.Image,
        fileName = name,
        byteCount = length(),
        source = sourceUri.toString(),
        captureSource = "IN_APP_CAMERA"
    )
}

private fun ProofAttachment.deleteOwnedCameraFile(context: Context, requiredPrefix: String) {
    if (!fileName.startsWith(requiredPrefix) || !fileName.endsWith(".jpg", ignoreCase = true)) return
    val ownedDirectories = listOfNotNull(
        context.getExternalFilesDir(Environment.DIRECTORY_PICTURES),
        context.cacheDir
    )
    ownedDirectories.forEach { directory ->
        runCatching {
            val candidate = File(directory, fileName).canonicalFile
            val parent = directory.canonicalFile
            if (candidate.parentFile == parent && candidate.isFile) candidate.delete()
        }
    }
}

private fun Context.displayNameFor(uri: Uri, index: Int): String {
    return contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
    } ?: uri.lastPathSegment?.substringAfterLast('/') ?: "proof-${index + 1}"
}

private fun Context.byteCountFor(uri: Uri): Long? {
    return contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { cursor ->
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (cursor.moveToFirst() && sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
            cursor.getLong(sizeIndex)
        } else {
            null
        }
    }
}

private fun Context.takePersistableReadPermissionIfPossible(uri: Uri): Boolean {
    return runCatching {
        contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        true
    }.getOrDefault(false)
}

private fun Context.releasePersistableReadPermissionIfPossible(uri: Uri) {
    runCatching {
        contentResolver.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
}

private fun ProofAttachment.releasePersistableReadPermissionIfPossible(context: Context) {
    val uri = runCatching { Uri.parse(source) }.getOrNull() ?: return
    if (uri.scheme == "content") context.releasePersistableReadPermissionIfPossible(uri)
}
