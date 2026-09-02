package edu.bnbu.student.mvp.feature.checkin

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.ImageLoader
import coil3.compose.SubcomposeAsyncImage
import coil3.request.ImageRequest
import coil3.video.VideoFrameDecoder
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUPrimaryButton
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.contributesToCreditedHours
import edu.bnbu.student.mvp.core.model.hourText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordAttemptContext
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.core.time.studentLocalRecordDateText
import edu.bnbu.student.mvp.core.time.studentLocalRecordDateTimeText
import kotlinx.coroutines.CancellationException

@Composable
internal fun RecordListIntro(records: List<CheckInRecord>) {
    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionTitle(
                eyebrow = interfaceText("记录", "Records"),
                title = interfaceText("打卡记录", "Check-in records")
            )
            Text(
                text = interfaceText("查看每次运动的学时与记录详情", "View the hours and details of every exercise."),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        if (records.isNotEmpty()) {
            RecordOverview(
                totalCount = records.size,
                recordedHours = records
                    .filter { it.contributesToCreditedHours }
                    .sumOf { it.hours }
            )
        }
    }
}

@Composable
private fun RecordOverview(
    totalCount: Int,
    recordedHours: Double
) {
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = cs.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Text(
                    text = interfaceText("计入学时", "Credited hours"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
                Text(
                    text = recordedHours.hourText(),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = interfaceText("共 $totalCount 条记录", "$totalCount records"),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = interfaceText("运动记录汇总", "Exercise record summary"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
internal fun RecordListSectionTitle(count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = interfaceText("全部记录", "All records"),
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            text = interfaceText("$count 条", "$count records"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
internal fun RecordCard(
    record: CheckInRecord,
    courseDisplayName: String,
    onOpenDetail: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .bnbuClickable(
                onClickLabel = interfaceText("查看${record.sportDisplayName()}打卡详情", "View ${record.sportDisplayName()} check-in details"),
                onClick = onOpenDetail
            ),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = cs.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 17.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = record.sportDisplayName(),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = record.submittedDate(),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = record.hours.hourText(),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = record.creditHoursLabel(),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.weight(1f))
                if (record.reviewStatus.equals("INVALID", ignoreCase = true)) {
                    InvalidRecordBadge()
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    text = record.creditType.recordDisplayLabel(),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
            }
            Spacer(Modifier.height(14.dp))
            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.55f))
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(7.dp)
                ) {
                    CompactMetadata(
                        icon = Icons.Filled.School,
                        text = courseDisplayName
                    )
                    CompactMetadata(
                        icon = Icons.Filled.AttachFile,
                        text = record.proofSummaryText()
                    )
                }
                Spacer(Modifier.width(12.dp))
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = cs.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun InvalidRecordBadge() {
    val cs = MaterialTheme.colorScheme
    Surface(
        color = cs.errorContainer,
        contentColor = cs.onErrorContainer,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = interfaceText("无效", "Invalid"),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun CompactMetadata(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(17.dp)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = text,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun CheckInRecord.submittedDate(): String =
    submittedAt.studentLocalRecordDateText(AppLanguagePreferences.currentLocale)
        ?: interfaceText("未提供", "Not available")

private fun CheckInRecord.courseDisplayName(appState: StudentAppState): String {
    val matchedCourse = courseId?.let { id ->
        appState.workspace.courses.firstOrNull { it.id == id }
    }
    return matchedCourse?.name?.takeIf { it.isNotBlank() } ?: interfaceText("自主运动", "Independent exercise")
}

private fun CheckInRecord.sportDisplayName(): String =
    sportType?.takeIf { it.isNotBlank() }?.recordSportDisplayName()
        ?: taskTitle.localizedCheckInTaskTitle()

private fun CheckInRecord.creditHoursLabel(): String = when {
    contributesToCreditedHours -> interfaceText("计入学时", "Credited hours")
    else -> interfaceText("未计入学时", "Not credited")
}

private fun String.localizedCheckInTaskTitle(): String = when (trim()) {
    "", "运动打卡", "Exercise check-in" -> interfaceText("运动打卡", "Exercise check-in")
    else -> this
}

private fun String.recordSportDisplayName(): String = when (lowercase()) {
    "running", "跑步" -> interfaceText("跑步", "Running")
    "basketball", "篮球" -> interfaceText("篮球", "Basketball")
    "football", "足球" -> interfaceText("足球", "Football")
    "badminton", "羽毛球" -> interfaceText("羽毛球", "Badminton")
    "table_tennis", "乒乓球" -> interfaceText("乒乓球", "Table tennis")
    "swimming", "游泳" -> interfaceText("游泳", "Swimming")
    "fitness", "健身" -> interfaceText("健身", "Fitness")
    "cycling", "骑行" -> interfaceText("骑行", "Cycling")
    "yoga", "瑜伽" -> interfaceText("瑜伽", "Yoga")
    else -> this
}

private fun CheckInRecord.proofSummaryText(): String {
    val images = proofPhotoCount
    val videos = proofVideoCount
    if (images == 0 && videos == 0) return proofSummary
    return buildList {
        if (images > 0) add(interfaceText("$images 张图片", "$images ${if (images == 1) "photo" else "photos"}"))
        if (videos > 0) add(interfaceText("$videos 个短视频", "$videos ${if (videos == 1) "video" else "videos"}"))
    }.joinToString(interfaceText("，", ", "))
}

@Composable
private fun RecordMediaGrid(
    proofs: List<ProofAttachment>,
    imageLoader: ImageLoader,
    onClick: () -> Unit
) {
    when {
        proofs.isEmpty() -> {
            MediaPlaceholder(
                mediaType = ProofMediaType.Image,
                message = interfaceText("暂无打卡照片或视频", "No check-in photos or videos"),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .bnbuClickable(onClick = onClick)
            )
        }
        proofs.size == 1 -> {
            ProofThumbnail(
                proof = proofs[0],
                imageLoader = imageLoader,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f),
                onClick = onClick
            )
        }
        proofs.size == 2 -> {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                proofs.forEach { proof ->
                    ProofThumbnail(
                        proof = proof,
                        imageLoader = imageLoader,
                        modifier = Modifier.weight(1f).aspectRatio(1f),
                        onClick = onClick
                    )
                }
            }
        }
        else -> {
            Row(
                modifier = Modifier.fillMaxWidth().height(190.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ProofThumbnail(
                    proof = proofs[0],
                    imageLoader = imageLoader,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = onClick
                )
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ProofThumbnail(
                        proof = proofs[1],
                        imageLoader = imageLoader,
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        onClick = onClick
                    )
                    Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                        ProofThumbnail(
                            proof = proofs[2],
                            imageLoader = imageLoader,
                            modifier = Modifier.fillMaxSize(),
                            onClick = onClick
                        )
                        val remaining = proofs.size - 3
                        if (remaining > 0) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.48f))
                                    .bnbuClickable(onClick = onClick),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "+$remaining",
                                    color = Color.White,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold
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
private fun ProofThumbnail(
    proof: ProofAttachment,
    imageLoader: ImageLoader,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme
    val sourceAvailable = proof.source.isDisplayableMediaSource()
    val imageRequest = remember(proof.source, proof.type) {
        ImageRequest.Builder(context)
            .data(proof.source)
            .apply {
                if (proof.type == ProofMediaType.Video) {
                    decoderFactory(VideoFrameDecoder.Factory())
                }
            }
            .build()
    }
    Box(
        modifier = modifier
            .clip(MaterialTheme.shapes.medium)
            .background(cs.surfaceVariant)
            .bnbuClickable(onClick = onClick)
    ) {
        if (sourceAvailable) {
            SubcomposeAsyncImage(
                model = imageRequest,
                imageLoader = imageLoader,
                contentDescription = "${proof.type.recordDisplayLabel()}: ${proof.fileName}",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    }
                },
                error = {
                    MediaPlaceholder(
                        mediaType = proof.type,
                        message = interfaceText("暂时无法加载", "Unable to load"),
                        modifier = Modifier.fillMaxSize()
                    )
                }
            )
        } else {
            MediaPlaceholder(
                mediaType = proof.type,
                message = proof.fileName.ifBlank { interfaceText("媒体文件", "Media file") },
                modifier = Modifier.fillMaxSize()
            )
        }

        if (proof.type == ProofMediaType.Video) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(Color.Black.copy(alpha = 0.45f), MaterialTheme.shapes.large)
                    .padding(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.PlayCircle,
                    contentDescription = interfaceText("视频", "Video"),
                    tint = Color.White,
                    modifier = Modifier.size(30.dp)
                )
            }
            Text(
                text = interfaceText("视频", "Video"),
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(8.dp)
                    .background(Color.Black.copy(alpha = 0.62f), MaterialTheme.shapes.small)
                    .padding(horizontal = 6.dp, vertical = 3.dp)
            )
        }
    }
}

@Composable
private fun MediaPlaceholder(
    mediaType: ProofMediaType,
    message: String,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .background(cs.surfaceVariant)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = if (mediaType == ProofMediaType.Video) Icons.Filled.Videocam else Icons.Filled.Photo,
            contentDescription = null,
            tint = cs.onSurfaceVariant,
            modifier = Modifier.size(28.dp)
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = message,
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 2
        )
    }
}

@Composable
internal fun CheckInRecordDetail(
    appState: StudentAppState,
    record: CheckInRecord,
    imageLoader: ImageLoader,
    onBack: () -> Unit,
    onStartResubmission: () -> Unit
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme
    var openError by remember { mutableStateOf<String?>(null) }
    var attemptContext by remember(record.id) {
        mutableStateOf<ExerciseRecordAttemptContext?>(null)
    }
    var attemptContextError by remember(record.id) {
        mutableStateOf<UserFacingError?>(null)
    }
    var isAttemptContextLoading by remember(record.id) { mutableStateOf(false) }

    LaunchedEffect(record.id, appState.isLocalReviewMode, appState.isV1ContractBacked) {
        isAttemptContextLoading = true
        attemptContext = null
        attemptContextError = null
        try {
            attemptContext = appState.fetchExerciseRecordAttemptContext(record.id)
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (failure: Throwable) {
            val mapped = ClientErrorMapper.map(failure, ClientErrorContext.RECORD)
            SafeClientLogger.log(mapped, ClientErrorContext.RECORD)
            attemptContextError = mapped
        } finally {
            isAttemptContextLoading = false
        }
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .bnbuClickable(
                        onClickLabel = interfaceText("返回打卡记录", "Back to check-in records"),
                        onClick = onBack
                    ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = interfaceText("返回打卡记录", "Back to check-in records"),
                    tint = cs.primary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = interfaceText("打卡详情", "Check-in details"),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        item {
            RecordResultCard(record = record)
        }
        item {
            DetailSectionHeader(title = interfaceText("记录信息", "Record information"))
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = cs.surface,
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp)) {
                    DetailInfoRow(
                        icon = Icons.Filled.History,
                        label = interfaceText("提交次数", "Attempt"),
                        value = attemptContext.attemptDisplayText(isAttemptContextLoading)
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Info,
                        label = interfaceText("审核状态", "Review status"),
                        value = record.reviewStatus.recordReviewStatusText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Timer,
                        label = interfaceText("提交时间", "Submitted"),
                        value = record.submittedAt.recordDetailTimeText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Timer,
                        label = interfaceText("开始时间", "Started"),
                        value = record.startTime.recordDetailTimeText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Timer,
                        label = interfaceText("结束时间", "Ended"),
                        value = record.endTime.recordDetailTimeText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Timer,
                        label = interfaceText("实际运动时长", "Active duration"),
                        value = record.actualDurationDetailText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.School,
                        label = interfaceText("关联课程", "Course"),
                        value = record.courseDisplayName(appState)
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Info,
                        label = interfaceText("打卡类别", "Check-in category"),
                        value = record.creditType.recordDisplayLabel()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.AttachFile,
                        label = interfaceText("凭证", "Proof"),
                        value = record.proofSummaryText()
                    )
                }
            }
        }
        item {
            SubmissionChainPanel(
                recordId = record.id,
                attemptContext = attemptContext,
                loading = isAttemptContextLoading
            )
        }
        if (record.reviewStatus.equals("INVALID", ignoreCase = true)) {
            item {
                RejectedAttemptPanel(
                    record = record,
                    attemptContext = attemptContext,
                    loading = isAttemptContextLoading,
                    writeAllowed = appState.isWriteAllowed,
                    onStartResubmission = onStartResubmission
                )
            }
            attemptContextError?.let { error ->
                item {
                    BNBUErrorPanel(
                        error = error,
                        onDismiss = { attemptContextError = null }
                    )
                }
            }
        }
        if (!record.teacherPublicFeedback.isNullOrBlank() &&
            !record.reviewStatus.equals("INVALID", ignoreCase = true)
        ) {
            item {
                DetailSectionHeader(title = interfaceText("审核结果", "Review result"))
            }
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = cs.surface,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = record.teacherPublicFeedback,
                        modifier = Modifier.padding(18.dp),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
        if (record.note.isNotBlank()) {
            item {
                DetailSectionHeader(title = interfaceText("运动说明", "Exercise notes"))
            }
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = cs.surface,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = record.note,
                        modifier = Modifier.padding(18.dp),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
        openError?.let { message ->
            item { ValidationPanel(message = message) }
        }
        item {
            DetailSectionHeader(
                title = interfaceText("照片与视频", "Photos & videos"),
                trailing = interfaceText("${record.proofFiles.size} 个", "${record.proofFiles.size} items")
            )
        }
        if (record.proofFiles.isEmpty()) {
            item {
                EmptyPlaceholder(
                    title = interfaceText("暂无照片或视频", "No photos or videos"),
                    message = interfaceText("这条记录没有可展示的媒体文件。", "This record has no media files to display.")
                )
            }
        } else {
            items(record.proofFiles, key = { it.id }) { proof ->
                ProofCard(
                    proof = proof,
                    imageLoader = imageLoader,
                    onClick = {
                        openError = context.openProofInSystemApp(proof)
                    }
                )
            }
        }
        item { Spacer(Modifier.height(28.dp)) }
    }
}

@Composable
private fun SubmissionChainPanel(
    recordId: String,
    attemptContext: ExerciseRecordAttemptContext?,
    loading: Boolean
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.surface,
        shape = MaterialTheme.shapes.large
    ) {
        if (attemptContext == null) {
            Row(
                modifier = Modifier.padding(18.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(10.dp))
                }
                Text(
                    text = if (loading) {
                        interfaceText("正在读取提交链…", "Loading submission history…")
                    } else {
                        interfaceText(
                            "提交链尚未通过后端验证，当前不能发起补交。",
                            "The submission chain has not been verified by the backend, so resubmission is unavailable."
                        )
                    },
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = attemptContext.attemptDisplayText(loading = false),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = if (attemptContext.previousAttemptId == null) {
                        interfaceText(
                            "上一条：无，这是首次正式提交。",
                            "Previous: None; this is the first formal submission."
                        )
                    } else {
                        interfaceText(
                            "上一条：上一条正式提交仍独立保留。",
                            "Previous: The previous formal submission remains independently preserved."
                        )
                    },
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = if (attemptContext.rootAttemptId == recordId) {
                        interfaceText(
                            "首次提交：本条就是首次正式提交。",
                            "Root attempt: This record is the initial formal submission."
                        )
                    } else {
                        interfaceText(
                            "首次提交：最初的正式提交仍作为审核历史保留。",
                            "Root attempt: The initial formal submission remains in the review history."
                        )
                    },
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun RejectedAttemptPanel(
    record: CheckInRecord,
    attemptContext: ExerciseRecordAttemptContext?,
    loading: Boolean,
    writeAllowed: Boolean,
    onStartResubmission: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.errorContainer.copy(alpha = 0.42f),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = interfaceText("上一次提交已被拒绝", "The previous submission was rejected"),
                color = colors.onErrorContainer,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText("拒绝原因", "Reason for rejection"),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = record.teacherPublicFeedback?.takeIf(String::isNotBlank)
                    ?: interfaceText("教师未提供公开拒绝原因。", "The teacher did not provide a public reason."),
                color = colors.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = interfaceText("可重新补交", "You can submit a new attempt"),
                color = colors.onSurface,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    "补交会创建新的正式尝试。原记录、审核结果和凭证会继续保留，不会被补交覆盖。",
                    "A resubmission creates a new formal attempt. The original record, review result, and proof stay in history and are not overwritten."
                ),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            BNBUPrimaryButton(
                title = interfaceText("重新补交", "Resubmit"),
                onClick = onStartResubmission,
                modifier = Modifier.fillMaxWidth(),
                enabled = attemptContext != null && !loading && writeAllowed
            )
            if (attemptContext == null && !loading) {
                Text(
                    text = interfaceText(
                        "读取并验证提交链后才能补交。",
                        "The submission chain must be loaded and verified before resubmission."
                    ),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun DetailInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 9.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = cs.onSurfaceVariant,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = label,
            modifier = Modifier.width(96.dp),
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Text(
            text = value,
            modifier = Modifier.weight(1f),
            color = cs.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun DetailSectionHeader(title: String, trailing: String? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        trailing?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun RecordResultCard(record: CheckInRecord) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = cs.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Spacer(Modifier.weight(1f))
                Text(
                    text = record.submittedDate(),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.height(18.dp))
            Text(
                text = record.sportDisplayName(),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(4.dp))
            val subtitle = record.taskTitle.localizedCheckInTaskTitle()
            if (!subtitle.equals(record.sportDisplayName(), ignoreCase = true) &&
                !record.taskTitle.equals(record.sportType, ignoreCase = true)
            ) {
                Text(
                    text = subtitle,
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Spacer(Modifier.height(20.dp))
            HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.55f))
            Spacer(Modifier.height(16.dp))
            Text(
                text = record.hours.hourText(),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = record.creditHoursLabel(),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

private fun ExerciseRecordAttemptContext?.attemptDisplayText(loading: Boolean): String = when {
    this != null -> interfaceText("第 $attemptNumber 次提交", "Attempt $attemptNumber")
    loading -> interfaceText("正在读取", "Loading")
    else -> interfaceText("尚未验证", "Not verified")
}

private fun String?.recordReviewStatusText(): String = when (this?.uppercase()) {
    "VALID" -> interfaceText("有效", "Valid")
    "INVALID" -> interfaceText("无效", "Invalid")
    else -> interfaceText("记录状态异常", "Invalid review state")
}

private fun String?.recordDetailTimeText(): String {
    return studentLocalRecordDateTimeText(AppLanguagePreferences.currentLocale)
        ?: interfaceText("未提供", "Not available")
}

private fun CheckInRecord.actualDurationDetailText(): String {
    val totalSeconds = actualDurationSeconds ?: return interfaceText("未提供", "Not available")
    val hours = totalSeconds / 3_600
    val minutes = (totalSeconds % 3_600) / 60
    val seconds = totalSeconds % 60
    return buildString {
        if (hours > 0) append(interfaceText("${hours}小时", "${hours}h"))
        if (minutes > 0 || (hours == 0L && seconds == 0L)) append(interfaceText("${minutes}分钟", "${minutes}m"))
        if (seconds > 0) append(interfaceText("${seconds}秒", "${seconds}s"))
    }
}

@Composable
private fun ProofCard(
    proof: ProofAttachment,
    imageLoader: ImageLoader,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .bnbuClickable(
                onClickLabel = interfaceText(
                    "打开${proof.type.recordDisplayLabel()}${proof.fileName}",
                    "Open ${proof.type.recordDisplayLabel()} ${proof.fileName}"
                ),
                onClick = onClick
            ),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = cs.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        ProofThumbnail(
            proof = proof,
            imageLoader = imageLoader,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f),
            onClick = onClick
        )
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (proof.type == ProofMediaType.Video) {
                    Icons.Filled.Videocam
                } else {
                    Icons.Filled.Photo
                },
                contentDescription = null,
                tint = cs.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = proof.fileName,
                modifier = Modifier.weight(1f),
                color = cs.onSurface,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            proof.displayDuration?.let {
                Spacer(Modifier.width(8.dp))
                Text(
                    text = it,
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
            }
            Spacer(Modifier.width(4.dp))
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = cs.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

private fun String.isDisplayableMediaSource(): Boolean {
    return startsWith("https://", ignoreCase = true) ||
        startsWith("http://", ignoreCase = true) ||
        startsWith("content://", ignoreCase = true) ||
        startsWith("file://", ignoreCase = true) ||
        startsWith("/")
}

private fun Context.openProofInSystemApp(proof: ProofAttachment): String? {
    if (!proof.source.isDisplayableMediaSource()) {
        return interfaceText("该媒体文件没有可用的预览地址。", "This media file has no usable preview address.")
    }
    val mimeType = if (proof.type == ProofMediaType.Video) "video/*" else "image/*"
    val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(Uri.parse(proof.source), mimeType)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    return try {
        startActivity(Intent.createChooser(intent, interfaceText("打开${proof.type.recordDisplayLabel()}", "Open ${proof.type.recordDisplayLabel()}")))
        null
    } catch (_: ActivityNotFoundException) {
        interfaceText(
            "设备上没有可以打开该${proof.type.recordDisplayLabel()}的应用。",
            "No app on this device can open this ${proof.type.recordDisplayLabel()}."
        )
    } catch (_: Exception) {
        interfaceText(
            "暂时无法打开该${proof.type.recordDisplayLabel()}，请稍后重试。",
            "Unable to open this ${proof.type.recordDisplayLabel()} right now. Please try again later."
        )
    }
}

private fun CreditType.recordDisplayLabel(): String = when (this) {
    CreditType.CourseRelated -> interfaceText("课程相关", "Course-related")
    CreditType.General -> interfaceText("其他运动", "Other exercise")
    CreditType.OrganizationOffset -> interfaceText("系统抵扣", "System offset")
}

private fun ProofMediaType.recordDisplayLabel(): String = when (this) {
    ProofMediaType.Image -> interfaceText("图片", "Image")
    ProofMediaType.Video -> interfaceText("视频", "Video")
}
