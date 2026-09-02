package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.ProofMediaType

internal enum class ExerciseMediaSource {
    CAMERA,
    GALLERY
}

internal data class ExerciseMediaCandidate(
    val type: ProofMediaType,
    val byteCount: Long,
    val durationSeconds: Double? = null,
    val source: ExerciseMediaSource
)

internal object ExerciseMediaPolicy {
    const val MaxImageCount = 6
    const val MaxVideoCount = 1
    const val MaxImageBytes = 10L * 1_024L * 1_024L
    const val MaxVideoDurationSeconds = 15.0

    fun validateCandidate(candidate: ExerciseMediaCandidate): Result<Unit> = runCatching {
        require(candidate.source == ExerciseMediaSource.CAMERA) {
            interfaceText("打卡凭证必须使用应用内相机拍摄。", "Check-in evidence must be captured with the in-app camera.")
        }
        require(candidate.byteCount > 0L) {
            interfaceText("拍摄的凭证文件为空。", "Captured media cannot be empty.")
        }
        if (candidate.type == ProofMediaType.Image) {
            require(candidate.byteCount <= MaxImageBytes) {
                interfaceText("拍摄的图片超过 10 MB 限制。", "The captured image exceeds the 10 MB limit.")
            }
        }
        when (candidate.type) {
            ProofMediaType.Image -> require(candidate.durationSeconds == null) {
                interfaceText("图片凭证不能包含视频时长。", "Image evidence cannot have a video duration.")
            }

            ProofMediaType.Video -> {
                val duration = requireNotNull(candidate.durationSeconds) {
                    interfaceText("无法读取视频时长，请重新拍摄。", "The video duration could not be read. Record it again.")
                }
                require(duration.isFinite() && duration > 0.0) {
                    interfaceText("视频时长无效，请重新拍摄。", "The video duration is invalid. Record it again.")
                }
                require(duration <= MaxVideoDurationSeconds) {
                    interfaceText("视频凭证不能超过 15 秒。", "Video evidence cannot exceed 15 seconds.")
                }
            }
        }
    }

    fun validateSelection(candidates: List<ExerciseMediaCandidate>): Result<Unit> = runCatching {
        require(candidates.isNotEmpty()) {
            interfaceText("至少需要拍摄 1 个凭证。", "Capture at least one evidence item.")
        }
        require(candidates.count { it.type == ProofMediaType.Image } <= MaxImageCount) {
            interfaceText("最多可添加 6 张图片。", "You can add at most 6 images.")
        }
        require(candidates.count { it.type == ProofMediaType.Video } <= MaxVideoCount) {
            interfaceText("最多可添加 1 个视频。", "You can add at most 1 video.")
        }
        candidates.forEach { validateCandidate(it).getOrThrow() }
    }
}
