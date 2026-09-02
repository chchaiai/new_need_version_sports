package edu.bnbu.student.mvp.feature.checkin

import android.annotation.SuppressLint
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import edu.bnbu.student.mvp.core.designsystem.ActionButton
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.PrimaryActionButton
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseVideoRecordingPhase
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseVideoRecordingState
import java.io.File
import kotlin.math.ceil

@SuppressLint("MissingPermission")
@Composable
internal fun ExerciseVideoRecorderDialog(
    outputFile: File,
    onCompleted: (durationSeconds: Double) -> Unit,
    onCancelled: () -> Unit,
    onError: (Throwable) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mainExecutor = remember(context) { ContextCompat.getMainExecutor(context) }
    val previewView = remember(context) {
        PreviewView(context).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
    }
    var recordingClock by remember(outputFile) { mutableStateOf(ExerciseVideoRecordingState()) }
    var videoCapture by remember(outputFile) { mutableStateOf<VideoCapture<Recorder>?>(null) }
    var recording by remember(outputFile) { mutableStateOf<Recording?>(null) }
    var phase by remember(outputFile) { mutableStateOf(ExerciseVideoRecordingPhase.READY) }
    var recordedNanos by remember(outputFile) { mutableLongStateOf(0L) }
    var cameraError by remember(outputFile) { mutableStateOf<Throwable?>(null) }
    var cancelRequested by remember(outputFile) { mutableStateOf(false) }
    var restartRequested by remember(outputFile) { mutableStateOf(false) }
    val isFinalizing = phase == ExerciseVideoRecordingPhase.FINALIZING ||
        phase == ExerciseVideoRecordingPhase.FINISHED

    DisposableEffect(lifecycleOwner, previewView, outputFile) {
        val providerFuture = ProcessCameraProvider.getInstance(context)
        var provider: ProcessCameraProvider? = null
        var preview: Preview? = null
        var disposed = false
        providerFuture.addListener({
            if (disposed) return@addListener
            runCatching {
                provider = providerFuture.get()
                if (disposed) return@runCatching
                preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val recorder = Recorder.Builder()
                    .setQualitySelector(QualitySelector.from(Quality.HIGHEST))
                    .build()
                val capture = VideoCapture.withOutput(recorder)
                val cameraProvider = checkNotNull(provider)
                val selector = when {
                    cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA) ->
                        CameraSelector.DEFAULT_BACK_CAMERA
                    cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) ->
                        CameraSelector.DEFAULT_FRONT_CAMERA
                    else -> error("No camera is available for exercise video recording.")
                }
                provider?.bindToLifecycle(
                    lifecycleOwner,
                    selector,
                    preview,
                    capture
                )
                videoCapture = capture
            }.onFailure {
                cameraError = it
                onError(it)
            }
        }, mainExecutor)

        onDispose {
            disposed = true
            recording?.stop()
            preview?.let { boundPreview ->
                videoCapture?.let { boundCapture ->
                    provider?.unbind(boundPreview, boundCapture)
                }
            }
            videoCapture = null
        }
    }

    fun stopRecording(cancel: Boolean) {
        cancelRequested = cancel
        recordingClock.stop()
        phase = recordingClock.phase
        recording?.stop()
    }

    fun retakeRecording() {
        if (recording == null || isFinalizing) return
        restartRequested = true
        cancelRequested = false
        recordingClock.stop()
        phase = recordingClock.phase
        recording?.stop()
    }

    fun startRecording() {
        val capture = videoCapture ?: return
        recordingClock.start()
        phase = recordingClock.phase
        recording = capture.output
            .prepareRecording(context, FileOutputOptions.Builder(outputFile).build())
            .withAudioEnabled()
            .start(mainExecutor) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        phase = ExerciseVideoRecordingPhase.RECORDING
                    }

                    is VideoRecordEvent.Status -> {
                        val duration = event.recordingStats.recordedDurationNanos
                        recordedNanos = duration.coerceAtMost(15_000_000_000L)
                        if (recordingClock.updateDuration(duration)) {
                            phase = recordingClock.phase
                            recording?.stop()
                        }
                    }

                    is VideoRecordEvent.Pause -> phase = ExerciseVideoRecordingPhase.PAUSED
                    is VideoRecordEvent.Resume -> phase = ExerciseVideoRecordingPhase.RECORDING
                    is VideoRecordEvent.Finalize -> {
                        recording = null
                        if (restartRequested) {
                            restartRequested = false
                            if (outputFile.exists() && !outputFile.delete()) {
                                recordingClock.finish()
                                phase = ExerciseVideoRecordingPhase.FINISHED
                                onError(IllegalStateException("Could not reset the video file for retake."))
                            } else {
                                recordingClock = ExerciseVideoRecordingState()
                                recordedNanos = 0L
                                cancelRequested = false
                                phase = ExerciseVideoRecordingPhase.READY
                            }
                        } else {
                            recordingClock.finish()
                            phase = ExerciseVideoRecordingPhase.FINISHED
                            when {
                                cancelRequested -> onCancelled()
                                event.hasError() -> onError(
                                    IllegalStateException("CameraX finalize error ${event.error}")
                                )
                                else -> onCompleted(
                                    (recordedNanos.coerceAtLeast(1L) / 1_000_000_000.0)
                                        .coerceAtMost(15.0)
                                )
                            }
                        }
                    }
                }
            }
    }

    Dialog(
        onDismissRequest = {
            if (recording == null) onCancelled() else stopRecording(cancel = true)
        },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnClickOutside = false
        )
    ) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView(
                factory = { previewView },
                modifier = Modifier.fillMaxSize()
            )
            Row(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(
                        horizontal = BNBULayout.ScreenHorizontal,
                        vertical = BNBULayout.Space12
                    ),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    shape = MaterialTheme.shapes.extraLarge,
                    tonalElevation = 2.dp
                ) {
                    Text(
                        text = interfaceText("打卡视频 · 最长 15 秒", "Check-in video · 15s max"),
                        modifier = Modifier.padding(
                            horizontal = BNBULayout.Space16,
                            vertical = BNBULayout.Space8
                        ),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Surface(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    shape = MaterialTheme.shapes.extraLarge,
                    tonalElevation = 2.dp
                ) {
                    IconButton(
                        onClick = {
                            if (recording == null) onCancelled() else stopRecording(cancel = true)
                        },
                        enabled = !isFinalizing
                    ) {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = interfaceText("取消录像", "Cancel video")
                        )
                    }
                }
            }
            Surface(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(
                        start = BNBULayout.ScreenHorizontal,
                        top = 88.dp,
                        end = BNBULayout.ScreenHorizontal
                    )
                    .fillMaxWidth(0.68f),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f),
                contentColor = MaterialTheme.colorScheme.onSurface,
                shape = MaterialTheme.shapes.extraLarge,
                tonalElevation = 6.dp
            ) {
                Column(
                    modifier = Modifier.padding(BNBULayout.Space16),
                    horizontalAlignment = Alignment.Start,
                    verticalArrangement = Arrangement.spacedBy(BNBULayout.Space4)
                ) {
                    val remainingSeconds = ceil((15_000_000_000L - recordedNanos)
                        .coerceAtLeast(0L) / 1_000_000_000.0).toInt()
                    Text(
                        text = if (isFinalizing) {
                            interfaceText("正在保存视频…", "Saving video…")
                        } else {
                            interfaceText("剩余 ${remainingSeconds} 秒", "${remainingSeconds}s left")
                        },
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (isFinalizing) {
                            interfaceText(
                                "正在完成文件处理，请稍候",
                                "Finalizing the recording. Please wait."
                            )
                        } else {
                            interfaceText(
                                "暂停期间不计时 · 录像将包含声音",
                                "Paused time is excluded · Audio is recorded"
                            )
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(
                        start = BNBULayout.Space16,
                        end = BNBULayout.Space16,
                        bottom = 88.dp
                    ),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = when (phase) {
                        ExerciseVideoRecordingPhase.READY -> interfaceText("— 准备就绪 —", "— Ready —")
                        ExerciseVideoRecordingPhase.RECORDING -> interfaceText("— 正在录像 —", "— Recording —")
                        ExerciseVideoRecordingPhase.PAUSED -> interfaceText("— 已暂停 —", "— Paused —")
                        ExerciseVideoRecordingPhase.FINALIZING,
                        ExerciseVideoRecordingPhase.FINISHED -> interfaceText("— 正在保存 —", "— Saving —")
                    },
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.height(BNBULayout.Space12))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    shape = MaterialTheme.shapes.extraLarge,
                    tonalElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(BNBULayout.Space12),
                        horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space12),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        when (phase) {
                            ExerciseVideoRecordingPhase.READY -> PrimaryActionButton(
                                title = interfaceText("开始录像", "Start recording"),
                                icon = Icons.Filled.PlayArrow,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = ::startRecording,
                                enabled = videoCapture != null && cameraError == null
                            )

                            ExerciseVideoRecordingPhase.RECORDING -> {
                                ActionButton(
                                    title = interfaceText("暂停", "Pause"),
                                    icon = Icons.Filled.Pause,
                                    filled = false,
                                    modifier = Modifier.weight(1.15f),
                                    onClick = {
                                        recording?.pause()
                                        recordingClock.pause()
                                        phase = recordingClock.phase
                                    }
                                )
                                ActionButton(
                                    title = interfaceText("结束", "Finish"),
                                    icon = Icons.Filled.Stop,
                                    filled = true,
                                    modifier = Modifier.weight(0.9f),
                                    onClick = { stopRecording(cancel = false) }
                                )
                                RetakeRecordingButton(onClick = ::retakeRecording)
                            }

                            ExerciseVideoRecordingPhase.PAUSED -> {
                                ActionButton(
                                    title = interfaceText("继续录制", "Resume"),
                                    icon = Icons.Filled.PlayArrow,
                                    filled = true,
                                    modifier = Modifier.weight(1.15f),
                                    onClick = {
                                        recording?.resume()
                                        recordingClock.resume()
                                        phase = recordingClock.phase
                                    }
                                )
                                ActionButton(
                                    title = interfaceText("结束", "Finish"),
                                    icon = Icons.Filled.Stop,
                                    filled = false,
                                    modifier = Modifier.weight(0.9f),
                                    onClick = { stopRecording(cancel = false) }
                                )
                                RetakeRecordingButton(onClick = ::retakeRecording)
                            }

                            ExerciseVideoRecordingPhase.FINALIZING,
                            ExerciseVideoRecordingPhase.FINISHED -> Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(28.dp),
                                    color = MaterialTheme.colorScheme.primary,
                                    strokeWidth = 3.dp
                                )
                                Spacer(Modifier.width(BNBULayout.Space12))
                                Text(
                                    text = interfaceText("正在保存视频，请稍候…", "Saving video. Please wait…"),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
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
private fun RetakeRecordingButton(onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceContainerHighest,
            contentColor = MaterialTheme.colorScheme.onSurface,
            shape = MaterialTheme.shapes.extraLarge
        ) {
            IconButton(onClick = onClick) {
                Icon(
                    imageVector = Icons.Filled.Refresh,
                    contentDescription = interfaceText("重拍", "Retake")
                )
            }
        }
        Spacer(Modifier.height(BNBULayout.Space4))
        Text(
            text = interfaceText("重拍", "Retake"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelSmall
        )
    }
}
