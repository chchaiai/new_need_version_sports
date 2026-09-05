package edu.bnbu.student.mvp.feature.checkin

import androidx.activity.compose.BackHandler

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Schedule
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
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
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.core.time.studentLocalRecordDateText
import edu.bnbu.student.mvp.core.time.studentLocalRecordDateTimeText

@Composable
internal fun RecordListIntro(records: List<CheckInRecord>) {
    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionTitle(
                eyebrow = interfaceText("记录", "Records"),
                title = interfaceText("打卡记录", "Check-in records")
            )
            Text(
                text = interfaceText(
                    "查看实际分钟、审核阶段和最终计入结果",
                    "View actual minutes, review stage, and final credited result."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        if (records.isNotEmpty()) {
            RecordOverview(
                totalCount = records.size,
                recordedMinutes = records.sumOf {
                    it.toExerciseRecordReviewUiModel().creditedWholeMinutes ?: 0
                }
            )
        }
    }
}

@Composable
private fun RecordOverview(
    totalCount: Int,
    recordedMinutes: Int
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
                    text = interfaceText("已计入分钟", "Credited minutes"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
                Text(
                    text = interfaceText("$recordedMinutes 分钟", "$recordedMinutes min"),
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
    val review = record.toExerciseRecordReviewUiModel()
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
                    text = review.actualWholeMinutes.minuteValueText(),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = interfaceText("实际运动", "Actual exercise"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.weight(1f))
                RecordStageBadge(stage = review.stage)
            }
            Spacer(Modifier.height(7.dp))
            Text(
                text = review.creditOutcomeText(),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
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
private fun RecordStageBadge(stage: ExerciseRecordReviewStage) {
    val cs = MaterialTheme.colorScheme
    val container = when (stage) {
        ExerciseRecordReviewStage.ValidCredited,
        ExerciseRecordReviewStage.ValidNotCredited -> Color(0xFF34C759).copy(alpha = 0.14f)
        ExerciseRecordReviewStage.Invalid -> cs.errorContainer
        ExerciseRecordReviewStage.PendingChecks,
        ExerciseRecordReviewStage.Unknown -> Color(0xFFFF9500).copy(alpha = 0.15f)
    }
    val content = when (stage) {
        ExerciseRecordReviewStage.Invalid -> cs.onErrorContainer
        ExerciseRecordReviewStage.ValidCredited,
        ExerciseRecordReviewStage.ValidNotCredited -> Color(0xFF1D7A36)
        ExerciseRecordReviewStage.PendingChecks,
        ExerciseRecordReviewStage.Unknown -> Color(0xFF8A5200)
    }
    Surface(
        color = container,
        contentColor = content,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = stage.displayText(),
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

private fun Int?.minuteValueText(): String = this?.let {
    interfaceText("$it 分钟", "$it min")
} ?: interfaceText("待提供", "Pending")

private fun ExerciseRecordReviewStage.displayText(): String = when (this) {
    ExerciseRecordReviewStage.PendingChecks -> interfaceText("待检查", "Pending checks")
    ExerciseRecordReviewStage.ValidCredited -> interfaceText("有效 · 已计入", "Valid · Credited")
    ExerciseRecordReviewStage.ValidNotCredited -> interfaceText("有效 · 未计入", "Valid · Not credited")
    ExerciseRecordReviewStage.Invalid -> interfaceText("无效", "Invalid")
    ExerciseRecordReviewStage.Unknown -> interfaceText("状态待确认", "Status pending")
}

private fun ExerciseRecordReviewUiModel.creditOutcomeText(): String = when (stage) {
    ExerciseRecordReviewStage.ValidCredited -> interfaceText(
        "实际计入 ${creditedWholeMinutes ?: 0} 分钟",
        "${creditedWholeMinutes ?: 0} minutes credited"
    )
    ExerciseRecordReviewStage.ValidNotCredited -> interfaceText(
        "记录有效，但本次未计入进度",
        "The record is valid but not credited to progress"
    )
    ExerciseRecordReviewStage.Invalid -> interfaceText(
        "记录无效；实际运动事实仍保留",
        "The record is invalid; the actual exercise fact remains"
    )
    ExerciseRecordReviewStage.PendingChecks -> interfaceText(
        "材料已受理，尚未确认有效或计入",
        "Evidence accepted; validity and credit are not confirmed"
    )
    ExerciseRecordReviewStage.Unknown -> interfaceText(
        "当前接口返回了尚未支持的状态",
        "The current interface returned an unsupported state"
    )
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
    onBack: () -> Unit
) {
    BackHandler(onBack = onBack)
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme
    var openError by remember { mutableStateOf<String?>(null) }
    val review = record.toExerciseRecordReviewUiModel()
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
                        icon = Icons.Filled.Info,
                        label = interfaceText("处理阶段", "Processing stage"),
                        value = review.stage.displayText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Info,
                        label = interfaceText("计入结果", "Credit result"),
                        value = review.creditOutcomeText()
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
                        icon = Icons.Filled.Timer,
                        label = interfaceText("可计分钟", "Eligible minutes"),
                        value = review.eligibleWholeMinutes.minuteValueText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Timer,
                        label = interfaceText("实际计入", "Credited minutes"),
                        value = review.creditedWholeMinutes.minuteValueText()
                    )
                    HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    DetailInfoRow(
                        icon = Icons.Filled.Schedule,
                        label = interfaceText("业务日期", "Business date"),
                        value = record.businessDate?.takeIf { it.isNotBlank() }
                            ?: interfaceText("待服务器提供", "Pending server data")
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
        if (!record.teacherPublicFeedback.isNullOrBlank()) {
            item {
                DetailSectionHeader(title = interfaceText("公开原因或说明", "Public reason or note"))
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
                title = interfaceText("首版照片与视频（只读）", "Initial photos & videos (read-only)"),
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
    val review = record.toExerciseRecordReviewUiModel()
    val statusIcon = when (review.stage) {
        ExerciseRecordReviewStage.ValidCredited,
        ExerciseRecordReviewStage.ValidNotCredited -> Icons.Filled.CheckCircle
        ExerciseRecordReviewStage.Invalid -> Icons.Filled.Error
        ExerciseRecordReviewStage.PendingChecks,
        ExerciseRecordReviewStage.Unknown -> Icons.Filled.HourglassTop
    }
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
                Icon(
                    imageVector = statusIcon,
                    contentDescription = null,
                    tint = cs.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = review.stage.displayText(),
                    modifier = Modifier.weight(1f),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
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
                text = review.actualWholeMinutes.minuteValueText(),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText("实际运动分钟", "Actual exercise minutes"),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = review.creditOutcomeText(),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
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
