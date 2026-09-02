package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.BindExerciseMediaCommand
import edu.bnbu.student.mvp.core.exercise.ConfirmExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaObjectUploader
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadMethod
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadReceipt
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadSession
import edu.bnbu.student.mvp.core.exercise.InitiateExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.UploadExerciseMediaObjectCommand
import edu.bnbu.student.mvp.core.model.ProofMediaType
import java.io.File
import java.net.URI
import java.security.MessageDigest
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class SessionMediaUploadCoordinatorTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun readyCameraDraftFlowsThroughInitiateUploadConfirmAndBindWithoutLocalDeletion() =
        runBlocking {
            val source = mediaFile("photo.jpg")
            val draft = draft(source, ProofMediaType.Image)
            val gateway = FakeMediaGateway(ProofMediaType.Image)
            val uploader = FakeObjectUploader()
            val coordinator = SessionMediaUploadCoordinator(gateway, uploader)

            val result = coordinator.uploadAndBind("session-1", draft, source)

            assertEquals(ExerciseMediaServerStatus.BOUND, result.status)
            assertEquals("draft-1", gateway.initiateCommand?.uploadIntentId)
            assertEquals(source.length(), gateway.initiateCommand?.fileSizeBytes)
            assertEquals(sha256(source), gateway.initiateCommand?.declaredContentSha256)
            assertEquals("upload-1", gateway.confirmCommand?.uploadSessionId)
            assertEquals("media-1", gateway.bindCommand?.mediaId)
            assertEquals(2L, gateway.bindCommand?.expectedVersion)
            assertEquals(source, uploader.command?.sourceFile)
            assertTrue(source.isFile)
        }

    @Test
    fun videoDurationUsesTheSameCeilingRuleAsBackendVerification() = runBlocking {
        val source = mediaFile("clip.mp4")
        val draft = draft(source, ProofMediaType.Video, durationSeconds = 1.2)
        val gateway = FakeMediaGateway(ProofMediaType.Video)
        val coordinator = SessionMediaUploadCoordinator(gateway, FakeObjectUploader())

        coordinator.uploadAndBind("session-1", draft, source)

        assertEquals(2L, gateway.initiateCommand?.durationSeconds)
        assertEquals("video/mp4", gateway.initiateCommand?.mimeType)
    }

    @Test
    fun uploadFailureStopsConfirmationAndPreservesLocalDraft() {
        val source = mediaFile("photo.jpg")
        val draft = draft(source, ProofMediaType.Image)
        val gateway = FakeMediaGateway(ProofMediaType.Image)
        val failure = IllegalStateException("storage unavailable")
        val coordinator = SessionMediaUploadCoordinator(
            gateway,
            FakeObjectUploader(failure)
        )

        assertThrows(IllegalStateException::class.java) {
            runBlocking { coordinator.uploadAndBind("session-1", draft, source) }
        }

        assertEquals(null, gateway.confirmCommand)
        assertEquals(null, gateway.bindCommand)
        assertTrue(source.isFile)
    }

    @Test
    fun refreshKeepsTheOriginalMediaIdentity() = runBlocking {
        val gateway = FakeMediaGateway(ProofMediaType.Image).apply {
            refreshed = evidence(ExerciseMediaServerStatus.AVAILABLE, version = 4L)
        }
        val coordinator = SessionMediaUploadCoordinator(gateway, FakeObjectUploader())

        val result = coordinator.refresh(evidence(ExerciseMediaServerStatus.PROCESSING, 3L))

        assertEquals(ExerciseMediaServerStatus.AVAILABLE, result.status)
        assertEquals(4L, result.version)
    }

    private fun mediaFile(name: String): File = temporaryFolder.newFile(name).apply {
        writeBytes(byteArrayOf(1, 2, 3, 4))
    }

    private fun draft(
        file: File,
        type: ProofMediaType,
        durationSeconds: Double? = null
    ) = SessionMediaDraft(
        id = "draft-1",
        type = type,
        fileName = file.name,
        capturedAtEpochMillis = 1_000L,
        byteCount = file.length(),
        durationSeconds = durationSeconds,
        compressedForUpload = true,
        status = SessionMediaDraftStatus.Ready
    )

    private fun evidence(status: ExerciseMediaServerStatus, version: Long) =
        ExerciseMediaEvidence("media-1", "session-1", ProofMediaType.Image, status, version)

    private fun sha256(file: File): String = MessageDigest.getInstance("SHA-256")
        .digest(file.readBytes())
        .joinToString("") { byte ->
            (byte.toInt() and 0xff).toString(16).padStart(2, '0')
        }

    private class FakeObjectUploader(
        private val failure: Throwable? = null
    ) : ExerciseMediaObjectUploader {
        var command: UploadExerciseMediaObjectCommand? = null

        override suspend fun upload(
            command: UploadExerciseMediaObjectCommand
        ): ExerciseMediaUploadReceipt {
            this.command = command
            failure?.let { throw it }
            return ExerciseMediaUploadReceipt("etag-1")
        }
    }

    private class FakeMediaGateway(
        private val mediaType: ProofMediaType
    ) : ExerciseMediaUploadGateway {
        var initiateCommand: InitiateExerciseMediaUploadCommand? = null
        var confirmCommand: ConfirmExerciseMediaUploadCommand? = null
        var bindCommand: BindExerciseMediaCommand? = null
        var refreshed = evidence(ExerciseMediaServerStatus.PROCESSING, 3L)

        override suspend fun initiateUpload(
            command: InitiateExerciseMediaUploadCommand
        ): ExerciseMediaUploadSession {
            initiateCommand = command
            return ExerciseMediaUploadSession(
                "upload-1",
                "media-1",
                URI("https://storage.example.test/private"),
                ExerciseMediaUploadMethod.PUT,
                emptyMap(),
                9_999_999_999_999L
            )
        }

        override suspend fun confirmUpload(
            command: ConfirmExerciseMediaUploadCommand
        ): ExerciseMediaEvidence {
            confirmCommand = command
            return ExerciseMediaEvidence(
                command.mediaId,
                "session-1",
                mediaType,
                ExerciseMediaServerStatus.UPLOADED,
                2L
            )
        }

        override suspend fun getMedia(mediaId: String): ExerciseMediaEvidence = refreshed

        override suspend fun bindMedia(command: BindExerciseMediaCommand): ExerciseMediaEvidence {
            bindCommand = command
            return ExerciseMediaEvidence(
                command.mediaId,
                command.sessionId,
                mediaType,
                ExerciseMediaServerStatus.BOUND,
                command.expectedVersion + 1L
            )
        }

        private companion object {
            fun evidence(status: ExerciseMediaServerStatus, version: Long) =
                ExerciseMediaEvidence(
                    "media-1",
                    "session-1",
                    ProofMediaType.Image,
                    status,
                    version
                )
        }
    }
}
