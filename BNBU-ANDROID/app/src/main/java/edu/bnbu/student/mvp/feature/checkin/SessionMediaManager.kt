package edu.bnbu.student.mvp.feature.checkin

import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.ImageLoader
import coil3.compose.SubcomposeAsyncImage
import coil3.request.ImageRequest
import coil3.video.VideoFrameDecoder
import coil3.video.videoFrameMillis
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.ProofUploadRule
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.checkin.session.SessionMediaDraft
import java.io.File

private val MediaManagerBlue = Color(0xFF007AFF)

/**
 * The single visual manager for the session-media draft source. It intentionally
 * reads [ExerciseSessionController.drafts] directly, so thumbnails and final
 * submission always share the same student-managed local evidence list.
 */
@Composable
internal fun SessionMediaManager(
    controller: ExerciseSessionController,
    submissionRequired: Boolean,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val imageLoader = remember(context) {
        ImageLoader.Builder(context)
            .components { add(VideoFrameDecoder.Factory()) }
            .build()
    }
    val drafts = controller.drafts
    val photos = drafts.filter { it.type == ProofMediaType.Image }
    val videos = drafts.filter { it.type == ProofMediaType.Video }
    var previewDraftId by rememberSaveable { mutableStateOf<String?>(null) }
    var deleteDraftId by rememberSaveable { mutableStateOf<String?>(null) }

    val previewDraft = previewDraftId?.let { id -> drafts.firstOrNull { it.id == id } }
    val canDeletePreview = previewDraft?.serverMediaId == null &&
        !controller.isMediaBusy &&
        !controller.isSessionBusy
    when (previewDraft?.type) {
        ProofMediaType.Image -> RetainedPhotoPreviewDialog(
            draft = previewDraft,
            file = controller.resolveDraftFile(previewDraft),
            imageLoader = imageLoader,
            canDelete = canDeletePreview,
            onDelete = { deleteDraftId = previewDraft.id },
            onDismiss = { previewDraftId = null }
        )

        ProofMediaType.Video -> RetainedVideoPreviewDialog(
            file = controller.resolveDraftFile(previewDraft),
            canDelete = canDeletePreview,
            onDelete = { deleteDraftId = previewDraft.id },
            onDismiss = { previewDraftId = null }
        )

        null -> Unit
    }

    deleteDraftId?.let { draftId ->
        AlertDialog(
            onDismissRequest = { deleteDraftId = null },
            title = { Text(interfaceText("删除这项凭证？", "Delete this evidence item?")) },
            text = {
                Text(
                    interfaceText(
                        "删除后，这项本地照片或视频不会随本次打卡提交。此操作不能撤销。",
                        "After deletion, this local photo or video will not be submitted with the check-in. This cannot be undone."
                    )
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        deleteDraftId = null
                        controller.removeDraft(draftId) { removed ->
                            if (removed) previewDraftId = null
                        }
                    },
                    enabled = !controller.isMediaBusy && !controller.isSessionBusy
                ) {
                    Text(interfaceText("删除", "Delete"), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteDraftId = null }) {
                    Text(interfaceText("取消", "Cancel"))
                }
            }
        )
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = interfaceText("已拍摄素材", "Captured media"),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            MediaCountPill(
                text = interfaceText(
                    "照片 ${photos.size}/${ProofUploadRule.maxImageCount}",
                    "Photos ${photos.size}/${ProofUploadRule.maxImageCount}"
                )
            )
            Spacer(Modifier.width(6.dp))
            MediaCountPill(
                text = interfaceText(
                    "视频 ${videos.size}/${ProofUploadRule.maxVideoCount}",
                    "Video ${videos.size}/${ProofUploadRule.maxVideoCount}"
                )
            )
        }
        Spacer(Modifier.height(10.dp))
        if (drafts.isEmpty()) {
            MediaEmptyState(submissionRequired = submissionRequired)
        } else {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(drafts, key = { it.id }) { draft ->
                    val file = controller.resolveDraftFile(draft)
                    MediaDraftThumbnail(
                        draft = draft,
                        file = file,
                        imageLoader = imageLoader,
                        onOpen = { previewDraftId = draft.id }
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = interfaceText(
                    "点击某项凭证可预览；正式提交开始前，可以删除不合适的照片或视频。",
                    "Open an evidence item to preview it. Before formal submission starts, you can delete an unsuitable photo or video."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (submissionRequired) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = interfaceText("当前保留的照片和视频会全部作为本次打卡凭证提交。", "All retained photos and videos will be submitted as proof for this check-in."),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun MediaCountPill(text: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun MediaEmptyState(submissionRequired: Boolean) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.58f),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.CameraAlt,
                contentDescription = null,
                tint = MediaManagerBlue,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = if (submissionRequired) {
                    interfaceText("请先现场拍摄至少 1 张照片或 1 个视频。", "Capture at least one on-site photo or video first.")
                } else {
                    interfaceText("拍摄完成后，照片和视频会立即显示在这里。", "Captured photos and videos will appear here immediately.")
                },
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun MediaDraftThumbnail(
    draft: SessionMediaDraft,
    file: File?,
    imageLoader: ImageLoader,
    onOpen: () -> Unit
) {
    val shape = MaterialTheme.shapes.medium
    val canOpen = file?.isFile == true
    Surface(
        modifier = Modifier
            .width(112.dp)
            .height(122.dp)
            .bnbuClickable(enabled = canOpen, onClick = onOpen),
        color = MaterialTheme.colorScheme.surface,
        shape = shape,
        shadowElevation = 2.dp
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(92.dp)
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                DraftThumbnailImage(
                    draft = draft,
                    file = file,
                    imageLoader = imageLoader
                )
                if (draft.type == ProofMediaType.Video) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.56f),
                        shape = MaterialTheme.shapes.extraLarge
                    ) {
                        Icon(
                            imageVector = Icons.Filled.PlayArrow,
                            contentDescription = interfaceText("播放视频", "Play video"),
                            tint = Color.White,
                            modifier = Modifier.padding(5.dp).size(22.dp)
                        )
                    }
                    Text(
                        text = draft.durationSeconds?.let(::formatMediaDuration)
                            ?: interfaceText("时长未知", "Unknown duration"),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(5.dp)
                            .background(Color.Black.copy(alpha = 0.66f), MaterialTheme.shapes.extraSmall)
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
            Text(
                text = if (draft.type == ProofMediaType.Image) {
                    interfaceText("现场照片", "On-site photo")
                } else {
                    if (draft.compressedForUpload) {
                        interfaceText("现场视频", "On-site video")
                    } else {
                        interfaceText("视频待压缩", "Video needs compression")
                    }
                },
                modifier = Modifier.padding(start = 8.dp, end = 8.dp, top = 6.dp),
                style = MaterialTheme.typography.labelMedium,
                maxLines = 1
            )
            Text(
                text = if (draft.type == ProofMediaType.Image) {
                    formatByteCount(draft.byteCount)
                } else {
                    draft.durationSeconds?.let(::formatMediaDuration) ?: formatByteCount(draft.byteCount)
                },
                modifier = Modifier.padding(start = 8.dp, end = 8.dp, bottom = 6.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun DraftThumbnailImage(
    draft: SessionMediaDraft,
    file: File?,
    imageLoader: ImageLoader
) {
    val context = LocalContext.current
    if (file?.isFile != true) {
        MediaLoadFallback(draft.type)
        return
    }
    val request = remember(file.absolutePath, draft.type, draft.coverTimestampMillis) {
        ImageRequest.Builder(context)
            .data(file)
            .apply {
                if (draft.type == ProofMediaType.Video) {
                    decoderFactory(VideoFrameDecoder.Factory())
                    videoFrameMillis(draft.coverTimestampMillis ?: 0L)
                }
            }
            .build()
    }
    SubcomposeAsyncImage(
        model = request,
        imageLoader = imageLoader,
        contentDescription = if (draft.type == ProofMediaType.Image) {
            interfaceText("现场照片缩略图", "On-site photo thumbnail")
        } else {
            interfaceText("现场视频封面", "On-site video cover")
        },
        contentScale = ContentScale.Crop,
        modifier = Modifier.fillMaxSize(),
        loading = {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            }
        },
        error = { MediaLoadFallback(draft.type) }
    )
}

@Composable
private fun MediaLoadFallback(type: ProofMediaType) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = if (type == ProofMediaType.Image) Icons.Filled.Image else Icons.Filled.Videocam,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(26.dp)
        )
        Spacer(Modifier.height(3.dp))
        Text(
            text = interfaceText("无法加载", "Unavailable"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun RetainedPhotoPreviewDialog(
    draft: SessionMediaDraft,
    file: File?,
    imageLoader: ImageLoader,
    canDelete: Boolean,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Color.Black) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Filled.Close,
                            interfaceText("关闭预览", "Close preview"),
                            tint = Color.White
                        )
                    }
                    Text(
                        text = interfaceText("已确认保留的现场照片", "Confirmed retained photo"),
                        color = Color.White,
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    IconButton(onClick = onDelete, enabled = canDelete) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = interfaceText("删除这项照片凭证", "Delete this photo evidence"),
                            tint = if (canDelete) Color(0xFFFF453A) else Color.White.copy(alpha = 0.35f)
                        )
                    }
                }
                ZoomablePhoto(file = file, imageLoader = imageLoader)
                Text(
                    text = interfaceText(
                        "正式提交开始前，如果觉得不合适，可以删除这项凭证。",
                        "If this item is unsuitable, you can delete it before formal submission starts."
                    ),
                    modifier = Modifier.padding(16.dp),
                    color = Color.White.copy(alpha = 0.78f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun RetainedVideoPreviewDialog(
    file: File?,
    canDelete: Boolean,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Color.Black) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Filled.Close,
                            interfaceText("关闭视频预览", "Close video preview"),
                            tint = Color.White
                        )
                    }
                    Text(
                        text = interfaceText("已确认保留的现场视频", "Confirmed retained video"),
                        color = Color.White,
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    IconButton(onClick = onDelete, enabled = canDelete) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = interfaceText("删除这项视频凭证", "Delete this video evidence"),
                            tint = if (canDelete) Color(0xFFFF453A) else Color.White.copy(alpha = 0.35f)
                        )
                    }
                }
                if (file?.isFile == true) {
                    AndroidView(
                        factory = { androidContext ->
                            VideoView(androidContext).also { view ->
                                view.setVideoURI(Uri.fromFile(file))
                                view.setMediaController(MediaController(androidContext).also(view::setMediaController))
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        MediaPreviewUnavailable(ProofMediaType.Video)
                    }
                }
                Text(
                    text = interfaceText(
                        "正式提交开始前，如果觉得不合适，可以删除这项凭证；处理失败时也可以删除后重录。",
                        "If this item is unsuitable, you can delete it before formal submission starts. If processing fails, delete it and record again."
                    ),
                    modifier = Modifier.padding(16.dp),
                    color = Color.White.copy(alpha = 0.78f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun ZoomablePhoto(file: File?, imageLoader: ImageLoader) {
    var scale by remember(file?.absolutePath) { mutableFloatStateOf(1f) }
    var offset by remember(file?.absolutePath) { mutableStateOf(Offset.Zero) }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .pointerInput(file?.absolutePath) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 5f)
                    offset = if (scale <= 1.01f) Offset.Zero else offset + pan
                }
            },
        contentAlignment = Alignment.Center
    ) {
        if (file?.isFile != true) {
            MediaPreviewUnavailable(ProofMediaType.Image)
        } else {
            SubcomposeAsyncImage(
                model = file,
                imageLoader = imageLoader,
                contentDescription = interfaceText("原始现场照片", "Original on-site photo"),
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                        translationX = offset.x
                        translationY = offset.y
                    },
                loading = {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color.White)
                    }
                },
                error = { MediaPreviewUnavailable(ProofMediaType.Image) }
            )
        }
    }
}

@Composable
private fun MediaPreviewUnavailable(type: ProofMediaType) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = if (type == ProofMediaType.Image) Icons.Filled.Image else Icons.Filled.Videocam,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.7f),
            modifier = Modifier.size(42.dp)
        )
        Spacer(Modifier.height(10.dp))
        Text(
            text = interfaceText("文件不存在、损坏或暂时无法加载。", "The file is missing, damaged, or temporarily unavailable."),
            color = Color.White.copy(alpha = 0.78f),
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 28.dp)
        )
    }
}

private fun formatMediaDuration(seconds: Double): String {
    val totalSeconds = seconds.toLong().coerceAtLeast(0L)
    return "%02d:%02d".format(totalSeconds / 60L, totalSeconds % 60L)
}

private fun formatByteCount(byteCount: Long): String {
    return if (byteCount >= 1_000_000L) {
        "%.1f MB".format(byteCount / 1_000_000.0)
    } else {
        "${(byteCount / 1_000L).coerceAtLeast(1L)} KB"
    }
}
