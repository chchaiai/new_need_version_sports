package edu.bnbu.student.mvp.feature.checkin

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.ProofUploadRule
import edu.bnbu.student.mvp.core.model.hourText
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import java.io.File
import java.util.UUID

/** Other-exercise notes are limited to 200 characters by §第三部分 5.7. */
internal const val MaxCheckInNoteLength = 200

/** The check-in entry point is the exercise-session flow; legacy task selection is retired. */
@Composable
internal fun CheckInScreen(
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    onReturnHome: () -> Unit = {}
) {
    ExerciseCheckInRoot(
        appState = appState,
        controller = exerciseSessionController,
        onReturnHome = onReturnHome
    )
}

@Composable
internal fun HoursControl(
    value: Double,
    maxHours: Double,
    enabled: Boolean,
    onChange: (Double) -> Unit
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        TextButton(
            enabled = enabled && value > 1.0,
            onClick = { onChange((value - 1.0).coerceAtLeast(1.0)) }
        ) { Text("−") }
        Text(
            text = value.hourText(),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        TextButton(
            enabled = enabled && value < maxHours,
            onClick = { onChange((value + 1.0).coerceAtMost(maxHours)) }
        ) { Text("+") }
        Spacer(Modifier.width(8.dp))
        Text(
            text = interfaceText("单次最多 ${maxHours.hourText()}", "Up to ${maxHours.hourText()} per session"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
internal fun NoteEditor(
    value: String,
    placeholder: String,
    enabled: Boolean,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(placeholder) },
        minLines = 3,
        supportingText = { Text("${value.length}/$MaxCheckInNoteLength") }
    )
}

@Composable
internal fun ProofAttachmentPanel(
    proofAttachments: List<ProofAttachment>,
    existingProofs: List<ProofAttachment>,
    totalProofCount: Int,
    enabled: Boolean,
    onProofAttachmentsChanged: (List<ProofAttachment>) -> Unit
) {
    val context = LocalContext.current
    var notice by remember { mutableStateOf<String?>(null) }
    var pendingPhoto by remember { mutableStateOf<File?>(null) }
    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = pendingPhoto
        pendingPhoto = null
        if (!success || file == null || file.length() <= 0L) {
            file?.delete()
            if (success) notice = interfaceText("现场照片保存失败，请重试。", "Could not save the on-site photo. Try again.")
            return@rememberLauncherForActivityResult
        }
        val attachment = file.toCameraProofAttachment(context, ProofMediaType.Image)
        if (attachment.validationMessage != null) {
            file.delete()
            notice = attachment.validationMessage
        } else {
            onProofAttachmentsChanged(proofAttachments + attachment)
            notice = interfaceText("已添加现场照片。", "On-site photo added.")
        }
    }
    fun launchCamera(type: ProofMediaType) {
        require(type == ProofMediaType.Image) {
            "Legacy proof panel cannot record video; use ExerciseVideoRecorderDialog."
        }
        runCatching {
            val file = context.createCheckInCameraFile(type)
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            file to uri
        }.fold(
            onSuccess = { (file, uri) ->
                pendingPhoto = file
                photoLauncher.launch(uri)
            },
            onFailure = { notice = interfaceText("无法打开系统相机，请检查相机是否可用。", "Could not open the system camera. Check that it is available.") }
        )
    }
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchCamera(ProofMediaType.Image)
        } else {
            notice = interfaceText(
                "现场拍照需要相机权限。",
                "On-site photos require camera permission."
            )
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        val isCaptureInProgress = pendingPhoto != null
        Text(interfaceText("凭证必须现场拍摄，不支持从相册或文件中选择。", "Proof must be captured on site; photos and files cannot be selected."), style = MaterialTheme.typography.bodySmall)
        Text(ProofUploadRule.summaryText, style = MaterialTheme.typography.bodySmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                enabled = enabled && !isCaptureInProgress && totalProofCount < ProofUploadRule.maxAttachmentCount &&
                    (existingProofs + proofAttachments).count { it.type == ProofMediaType.Image } <
                    ProofUploadRule.maxImageCount,
                onClick = {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                        PackageManager.PERMISSION_GRANTED
                    ) {
                        launchCamera(ProofMediaType.Image)
                    } else {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                },
                modifier = Modifier.weight(1f)
            ) { Text(interfaceText("现场拍照", "Take photo")) }
        }
        notice?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        proofAttachments.forEach { attachment ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = attachment.fileName,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(
                    enabled = enabled,
                    onClick = {
                        attachment.deleteOwnedCameraFile(context, "proof_")
                        attachment.releasePersistableReadPermissionIfPossible(context)
                        onProofAttachmentsChanged(proofAttachments.filterNot { it.id == attachment.id })
                    }
                ) { Text(interfaceText("移除", "Remove")) }
            }
        }
    }
}

/**
 * Just-in-time disclosure before the in-app CameraX recorder requests camera
 * and microphone access.
 */
@Composable
internal fun SystemCameraVideoRecordingNotice(
    onContinue: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(interfaceText("录像与声音说明", "Video and audio notice")) },
        text = {
            Text(
                interfaceText(
                    "继续后将在应用内请求相机和麦克风权限，并同时录制画面与声音。有效录制累计最多 15 秒，暂停期间不计时，可提前结束；达到 15 秒会自动结束并在本机压缩。压缩成功且你明确提交后才会上传。",
                    "Continuing requests camera and microphone access for in-app video with audio. Active recording is limited to 15 seconds; paused time is excluded, you may stop early, and recording stops automatically at the limit before local compression. Upload occurs only after compression succeeds and you submit."
                )
            )
        },
        confirmButton = {
            TextButton(onClick = onContinue) {
                Text(interfaceText("继续录制", "Continue recording"))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(interfaceText("取消", "Cancel"))
            }
        }
    )
}

internal fun String.displaySportType(): String = when (this) {
    "running" -> interfaceText("跑步", "Running")
    "basketball" -> interfaceText("篮球", "Basketball")
    "football" -> interfaceText("足球", "Football")
    "badminton" -> interfaceText("羽毛球", "Badminton")
    "table_tennis" -> interfaceText("乒乓球", "Table tennis")
    "swimming" -> interfaceText("游泳", "Swimming")
    "fitness" -> interfaceText("健身", "Fitness")
    "cycling" -> interfaceText("骑行", "Cycling")
    else -> this
}

private fun Context.createCheckInCameraFile(type: ProofMediaType): File {
    val directory = getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: cacheDir
    check(directory.mkdirs() || directory.isDirectory) { "无法创建凭证存储目录" }
    val extension = if (type == ProofMediaType.Image) "jpg" else "mp4"
    val prefix = if (type == ProofMediaType.Image) "photo" else "video"
    return File(directory, "proof_${prefix}_${UUID.randomUUID()}.$extension").also { file ->
        check(file.createNewFile()) { "无法创建凭证文件" }
    }
}

private fun File.toCameraProofAttachment(context: Context, type: ProofMediaType): ProofAttachment {
    return ProofAttachment(
        id = UUID.randomUUID().toString(),
        type = type,
        fileName = name,
        byteCount = length(),
        durationSeconds = if (type == ProofMediaType.Video) context.videoDurationSecondsFor(Uri.fromFile(this)) else null,
        source = toURI().toString()
    )
}

private fun Context.videoDurationSecondsFor(uri: Uri): Double? {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(this, uri)
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull()?.div(1000.0)
    } catch (_: RuntimeException) {
        null
    } finally {
        runCatching { retriever.release() }
    }
}

private fun Context.releasePersistableReadPermissionIfPossible(uri: Uri) {
    runCatching { contentResolver.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
}

internal fun ProofAttachment.releasePersistableReadPermissionIfPossible(context: Context) {
    Uri.parse(source).takeIf { it.scheme == "content" }?.let(context::releasePersistableReadPermissionIfPossible)
}

internal fun ProofAttachment.deleteOwnedCameraFile(context: Context, requiredPrefix: String) {
    if (!fileName.startsWith(requiredPrefix) ||
        !fileName.endsWith(".jpg", ignoreCase = true) &&
        !fileName.endsWith(".mp4", ignoreCase = true)
    ) return
    listOfNotNull(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), context.cacheDir).forEach { directory ->
        runCatching {
            val candidate = File(directory, fileName).canonicalFile
            if (candidate.parentFile == directory.canonicalFile && candidate.isFile) candidate.delete()
        }
    }
}
