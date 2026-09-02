package edu.bnbu.student.mvp.feature.checkin.session

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import androidx.exifinterface.media.ExifInterface
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaPolicy
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/** A small, dependency-free editor for local exercise-session drafts. */
internal object SessionMediaEditor {
    private const val MaxPhotoDecodeDimension = 4_096
    // A system-camera keyframe can be much larger than a normal inter-frame.
    // Keep the default generous while capping it well below the draft size limit.
    private const val MinimumBufferSize = 4 * 1_024 * 1_024
    private const val MaximumBufferSize = 16 * 1_024 * 1_024

    /**
     * Re-encodes a camera JPEG before it enters the draft store. This applies the
     * EXIF orientation while deliberately omitting all EXIF fields (including GPS).
     * The original is replaced only after the normalized staging file is complete.
     */
    fun normalizeCapturedPhoto(source: File): Result<Unit> {
        val staging = File(source.parentFile, ".${source.name}.normalized.jpg")
        val backup = File(source.parentFile, ".${source.name}.original.jpg")
        return saveEditedPhoto(
            source = source,
            destination = staging,
            cropAspectRatio = null,
            rotationDegrees = 0
        ).mapCatching {
            check(staging.isFile && staging.length() > 0L) { "Normalized photo is empty" }
            backup.delete()
            check(source.renameTo(backup)) { "Could not stage the original camera photo" }
            if (!staging.renameTo(source)) {
                backup.renameTo(source)
                error("Could not commit the normalized camera photo")
            }
            backup.delete()
            Unit
        }.onFailure {
            staging.delete()
            if (!source.exists() && backup.exists()) backup.renameTo(source)
        }
    }

    /**
     * Applies the selected center crop and quarter-turn rotation into [destination].
     * The caller must supply a different, staging destination file.
     */
    fun saveEditedPhoto(
        source: File,
        destination: File,
        cropAspectRatio: Float?,
        rotationDegrees: Int
    ): Result<Unit> = runCatching {
        require(source.isFile && source.length() > 0L) { "原始照片不存在或已损坏" }
        require(source.canonicalFile != destination.canonicalFile) { "不能直接覆盖原始照片" }
        val bitmap = decodeSampledBitmap(source)
        var transformed: Bitmap? = null
        var cropped: Bitmap? = null
        try {
            val matrix = orientationMatrix(source).apply {
                val normalizedRotation = ((rotationDegrees % 360) + 360) % 360
                if (normalizedRotation != 0) postRotate(normalizedRotation.toFloat())
            }
            transformed = Bitmap.createBitmap(
                bitmap,
                0,
                0,
                bitmap.width,
                bitmap.height,
                matrix,
                true
            )
            val output = cropAspectRatio
                ?.takeIf { it.isFinite() && it > 0.05f }
                ?.let { aspect -> centerCrop(transformed!!, aspect) }
                ?: transformed!!
            if (output !== transformed) cropped = output
            writeJpegWithinLimit(output, destination)
            check(destination.length() > 0L) { "编辑后的照片为空" }
        } finally {
            bitmap.recycleSafely()
            transformed?.takeUnless { it === bitmap }?.recycleSafely()
            cropped?.takeUnless { it === transformed || it === bitmap }?.recycleSafely()
        }
    }.onFailure {
        destination.delete()
    }

    /**
     * Creates a new MP4 containing the requested range. This uses the platform
     * extractor/muxer path, so it avoids a heavyweight video-editor dependency and
     * never touches the original until the draft store commits the staging file.
     */
    fun trimVideo(
        source: File,
        destination: File,
        startMillis: Long,
        endMillis: Long
    ): Result<Unit> = runCatching {
        require(source.isFile && source.length() > 0L) { "原始视频不存在或已损坏" }
        require(source.canonicalFile != destination.canonicalFile) { "不能直接覆盖原始视频" }
        require(startMillis >= 0L && endMillis > startMillis) { "视频裁剪范围无效" }

        val extractor = MediaExtractor()
        var muxer: MediaMuxer? = null
        var muxerStarted = false
        var wroteSample = false
        try {
            extractor.setDataSource(source.absolutePath)
            val trackCount = extractor.trackCount
            check(trackCount > 0) { "视频中没有可用轨道" }
            val trackMap = IntArray(trackCount) { -1 }
            var maxInputSize = MinimumBufferSize
            val activeMuxer = MediaMuxer(destination.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            muxer = activeMuxer
            for (trackIndex in 0 until trackCount) {
                val format = extractor.getTrackFormat(trackIndex)
                val mime = format.getString(MediaFormat.KEY_MIME).orEmpty()
                if (!mime.startsWith("video/") && !mime.startsWith("audio/")) continue
                trackMap[trackIndex] = activeMuxer.addTrack(format)
                extractor.selectTrack(trackIndex)
                if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                    maxInputSize = max(
                        maxInputSize,
                        format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                    )
                }
            }
            check(trackMap.any { it >= 0 }) { "视频中没有可裁剪的音视频轨道" }
            videoRotation(source)?.let(activeMuxer::setOrientationHint)
            activeMuxer.start()
            muxerStarted = true

            // Video cuts must begin on a sync frame to remain decodable. The actual
            // first frame can therefore be slightly earlier than the user marker.
            extractor.seekTo(startMillis * 1_000L, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
            var buffer = ByteBuffer.allocateDirect(maxInputSize.coerceIn(MinimumBufferSize, MaximumBufferSize))
            val info = MediaCodec.BufferInfo()
            var firstPresentationTimeUs = -1L
            val endUs = endMillis * 1_000L
            while (true) {
                val inputTrack = extractor.sampleTrackIndex
                if (inputTrack < 0) break
                val sampleTimeUs = extractor.sampleTime
                if (sampleTimeUs < 0L || sampleTimeUs > endUs) break
                val outputTrack = trackMap[inputTrack]
                if (outputTrack < 0) {
                    extractor.advance()
                    continue
                }
                buffer.clear()
                val sampleSize = extractor.readSampleData(buffer, 0)
                if (sampleSize < 0) break
                check(sampleSize <= buffer.capacity()) { "视频帧过大，无法安全裁剪" }
                if (firstPresentationTimeUs < 0L) firstPresentationTimeUs = sampleTimeUs
                info.set(
                    0,
                    sampleSize,
                    (sampleTimeUs - firstPresentationTimeUs).coerceAtLeast(0L),
                    if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
                        MediaCodec.BUFFER_FLAG_KEY_FRAME
                    } else {
                        0
                    }
                )
                activeMuxer.writeSampleData(outputTrack, buffer, info)
                wroteSample = true
                extractor.advance()
            }
        } finally {
            if (muxerStarted) muxer?.stop()
            muxer?.release()
            extractor.release()
        }
        check(wroteSample && destination.isFile && destination.length() > 0L) {
            "裁剪后的视频为空"
        }
    }.onFailure {
        destination.delete()
    }

    fun readVideoDurationSeconds(file: File): Double? {
        if (!file.isFile || file.length() <= 0L) return null
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(file.absolutePath)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                ?.toDoubleOrNull()
                ?.div(1_000.0)
        } catch (_: RuntimeException) {
            null
        } finally {
            runCatching { retriever.release() }
        }
    }

    private fun decodeSampledBitmap(file: File): Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        check(bounds.outWidth > 0 && bounds.outHeight > 0) { "无法读取照片" }
        val options = BitmapFactory.Options().apply {
            inSampleSize = calculateSampleSize(bounds.outWidth, bounds.outHeight)
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return BitmapFactory.decodeFile(file.absolutePath, options)
            ?: error("无法解码照片")
    }

    private fun calculateSampleSize(width: Int, height: Int): Int {
        var sample = 1
        while (width / sample > MaxPhotoDecodeDimension || height / sample > MaxPhotoDecodeDimension) {
            sample *= 2
        }
        return sample
    }

    private fun writeJpegWithinLimit(bitmap: Bitmap, destination: File) {
        for (quality in intArrayOf(92, 85, 78, 70, 62, 54)) {
            check(FileOutputStream(destination, false).use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
            }) { "无法写入编辑后的照片" }
            if (destination.length() in 1L..ExerciseMediaPolicy.MaxImageBytes) return
        }
        error("处理后的照片超过 10 MiB")
    }

    private fun orientationMatrix(file: File): Matrix {
        val orientation = runCatching {
            ExifInterface(file.absolutePath).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
        }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)
        return Matrix().apply {
            when (orientation) {
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> setScale(-1f, 1f)
                ExifInterface.ORIENTATION_ROTATE_180 -> setRotate(180f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> setScale(1f, -1f)
                ExifInterface.ORIENTATION_TRANSPOSE -> {
                    setRotate(90f)
                    postScale(-1f, 1f)
                }

                ExifInterface.ORIENTATION_ROTATE_90 -> setRotate(90f)
                ExifInterface.ORIENTATION_TRANSVERSE -> {
                    setRotate(-90f)
                    postScale(-1f, 1f)
                }

                ExifInterface.ORIENTATION_ROTATE_270 -> setRotate(-90f)
            }
        }
    }

    private fun centerCrop(bitmap: Bitmap, aspectRatio: Float): Bitmap {
        val currentAspect = bitmap.width.toFloat() / bitmap.height.toFloat()
        if (abs(currentAspect - aspectRatio) < 0.002f) return bitmap
        val cropWidth: Int
        val cropHeight: Int
        if (currentAspect > aspectRatio) {
            cropHeight = bitmap.height
            cropWidth = min(bitmap.width, (cropHeight * aspectRatio).toInt().coerceAtLeast(1))
        } else {
            cropWidth = bitmap.width
            cropHeight = min(bitmap.height, (cropWidth / aspectRatio).toInt().coerceAtLeast(1))
        }
        val left = ((bitmap.width - cropWidth) / 2).coerceAtLeast(0)
        val top = ((bitmap.height - cropHeight) / 2).coerceAtLeast(0)
        return Bitmap.createBitmap(bitmap, left, top, cropWidth, cropHeight)
    }

    private fun videoRotation(file: File): Int? {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(file.absolutePath)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
                ?.toIntOrNull()
                ?.takeIf { it in setOf(0, 90, 180, 270) }
        } catch (_: RuntimeException) {
            null
        } finally {
            runCatching { retriever.release() }
        }
    }

    private fun Bitmap.recycleSafely() {
        if (!isRecycled) recycle()
    }
}
