package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.ProofMediaType
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseMediaPolicyTest {
    @Test
    fun acceptsImageLimitAndLargeVideoAtFifteenSeconds() {
        val image = cameraImage(ExerciseMediaPolicy.MaxImageBytes)
        val video = cameraVideo(
            250L * 1_024L * 1_024L,
            ExerciseMediaPolicy.MaxVideoDurationSeconds
        )

        assertTrue(ExerciseMediaPolicy.validateCandidate(image).isSuccess)
        assertTrue(ExerciseMediaPolicy.validateCandidate(video).isSuccess)
    }

    @Test
    fun rejectsLargeImageAndVideoAboveFifteenSeconds() {
        val image = cameraImage(ExerciseMediaPolicy.MaxImageBytes + 1L)
        val videoByDuration = cameraVideo(
            250L * 1_024L * 1_024L,
            ExerciseMediaPolicy.MaxVideoDurationSeconds + 0.01
        )

        assertTrue(ExerciseMediaPolicy.validateCandidate(image).isFailure)
        assertTrue(ExerciseMediaPolicy.validateCandidate(videoByDuration).isFailure)
    }

    @Test
    fun rejectsGalleryEvidence() {
        val galleryImage = cameraImage(1L).copy(source = ExerciseMediaSource.GALLERY)

        assertTrue(ExerciseMediaPolicy.validateCandidate(galleryImage).isFailure)
    }

    @Test
    fun selectionAllowsSixImagesAndOneVideoButNoMore() {
        val valid = List(ExerciseMediaPolicy.MaxImageCount) { cameraImage(1L) } +
            cameraVideo(1L, 1.0)
        val tooManyImages = valid + cameraImage(1L)
        val tooManyVideos = valid + cameraVideo(1L, 1.0)

        assertTrue(ExerciseMediaPolicy.validateSelection(valid).isSuccess)
        assertTrue(ExerciseMediaPolicy.validateSelection(tooManyImages).isFailure)
        assertTrue(ExerciseMediaPolicy.validateSelection(tooManyVideos).isFailure)
    }

    private fun cameraImage(byteCount: Long) = ExerciseMediaCandidate(
        type = ProofMediaType.Image,
        byteCount = byteCount,
        source = ExerciseMediaSource.CAMERA
    )

    private fun cameraVideo(
        byteCount: Long,
        durationSeconds: Double
    ) = ExerciseMediaCandidate(
        type = ProofMediaType.Video,
        byteCount = byteCount,
        durationSeconds = durationSeconds,
        source = ExerciseMediaSource.CAMERA
    )
}
