package edu.bnbu.student.mvp.feature.checkin.session

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

internal data class CompressedExerciseVideo(
    val durationSeconds: Double,
    val containsAudio: Boolean
)

/** Produces the only video copy eligible for upload: H.264/AAC MP4, clipped to 15 seconds. */
@OptIn(markerClass = [UnstableApi::class])
internal class SessionVideoCompressor(private val context: Context) {
    suspend fun compress(source: File, destination: File): CompressedExerciseVideo {
        require(source.isFile && source.length() > 0L) { "Recorded video is missing." }
        require(destination.parentFile?.isDirectory == true) { "Compression directory is missing." }
        if (destination.exists() && !destination.delete()) {
            error("Could not reset the compression output file.")
        }

        val sourceHeight = readVideoHeight(source).coerceAtLeast(1)
        val mediaItem = MediaItem.Builder()
            .setUri(Uri.fromFile(source))
            .setClippingConfiguration(
                MediaItem.ClippingConfiguration.Builder()
                    .setEndPositionMs(MaximumCompressedVideoDurationMillis)
                    .build()
            )
            .build()
        val videoEffects: List<Effect> = listOf(Presentation.createForHeight(sourceHeight))

        return suspendCancellableCoroutine { continuation ->
            lateinit var transformer: Transformer
            val listener = object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    if (!continuation.isActive) return
                    runCatching { inspectCompressedOutput(destination) }.fold(
                        onSuccess = continuation::resume,
                        onFailure = continuation::resumeWithException
                    )
                }

                override fun onError(
                    composition: Composition,
                    exportResult: ExportResult,
                    exportException: ExportException
                ) {
                    if (continuation.isActive) continuation.resumeWithException(exportException)
                }
            }
            transformer = Transformer.Builder(context)
                .setAudioMimeType(MimeTypes.AUDIO_AAC)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .addListener(listener)
                .build()
            continuation.invokeOnCancellation {
                transformer.cancel()
                destination.delete()
            }
            val edited = androidx.media3.transformer.EditedMediaItem.Builder(mediaItem)
                .setEffects(androidx.media3.transformer.Effects(emptyList(), videoEffects))
                .build()
            transformer.start(edited, destination.absolutePath)
        }
    }

    private fun inspectCompressedOutput(file: File): CompressedExerciseVideo {
        check(file.isFile && file.length() > 0L) { "Compressed video is empty." }
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(file.absolutePath)
            val durationMillis = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                ?.toLongOrNull()
                ?: error("Compressed video duration is unavailable.")
            val hasAudio = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO)
                ?.equals("yes", ignoreCase = true) == true
            check(durationMillis in 1L..MaximumCompressedVideoDurationMillis) {
                "Compressed video exceeds 15 seconds."
            }
            check(hasAudio) { "Compressed video does not contain audio." }
            CompressedExerciseVideo(durationMillis / 1_000.0, containsAudio = true)
        } finally {
            retriever.release()
        }
    }

    private fun readVideoHeight(file: File): Int {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(file.absolutePath)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                ?.toIntOrNull()
                ?: 1
        } finally {
            retriever.release()
        }
    }

    private companion object {
        const val MaximumCompressedVideoDurationMillis = 15_000L
    }
}
