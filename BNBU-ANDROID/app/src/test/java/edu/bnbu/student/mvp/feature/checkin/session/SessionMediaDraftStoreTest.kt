package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.model.ProofMediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class SessionMediaDraftStoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val clock = FakeExerciseClock(10_000L)

    @Test
    fun capturedPhotoIsStoredLocallyAndRestoredByANewStoreInstance() {
        val root = temporaryFolder.newFolder("drafts")
        val store = SessionMediaDraftStore(root, clock)
        val key = SessionDraftKey("student-1", "session-1")
        val target = store.prepareCapture(key, ProofMediaType.Image).getOrThrow()
        target.file.writeBytes(byteArrayOf(1, 2, 3))

        val completed = store.completeCapture(target, success = true).getOrThrow()
        val restored = SessionMediaDraftStore(root, clock).list(key)

        assertEquals(completed, restored.single())
        assertTrue(target.file.isFile)
    }

    @Test
    fun pendingCaptureWithWrittenBytesNeverBecomesRetainedAfterProcessRestart() {
        val root = temporaryFolder.newFolder("drafts")
        val key = SessionDraftKey("student-1", "session-1")
        val firstStore = SessionMediaDraftStore(root, clock)
        val target = firstStore.prepareCapture(key, ProofMediaType.Video).getOrThrow()
        target.file.writeBytes(byteArrayOf(4, 5, 6, 7))

        val recovered = SessionMediaDraftStore(root, clock).list(key)

        assertTrue(recovered.isEmpty())
        assertTrue(target.file.isFile)

        val confirmed = SessionMediaDraftStore(root, clock)
            .completeCapture(target, success = true, durationSeconds = 10.0)
            .getOrThrow()
        assertEquals(SessionMediaDraftStatus.Ready, confirmed.status)
    }

    @Test
    fun unconfirmedCaptureCanBeDiscardedThenRetakenBeforeAnyEvidenceIsRetained() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val discarded = store.prepareCapture(key, ProofMediaType.Image).getOrThrow()
        discarded.file.writeBytes(byteArrayOf(1, 2, 3))

        assertTrue(store.list(key).isEmpty())
        assertTrue(store.completeCapture(discarded, success = false).isFailure)
        assertFalse(discarded.file.exists())

        val retake = store.prepareCapture(key, ProofMediaType.Image).getOrThrow()
        retake.file.writeBytes(byteArrayOf(4, 5, 6))
        assertTrue(store.list(key).isEmpty())
        assertTrue(store.completeCapture(retake, success = true).isSuccess)
        assertEquals(listOf(retake.draftId), store.readyForSubmission(key).getOrThrow().map { it.id })
    }

    @Test
    fun cancelledVideoCaptureOnlyRemovesPendingBytesAndNeverBecomesReady() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val target = store.prepareCapture(key, ProofMediaType.Video).getOrThrow()
        target.file.writeBytes(byteArrayOf(7, 8, 9))

        assertTrue(store.list(key).isEmpty())
        assertTrue(store.cancelCapture(target))

        assertFalse(target.file.exists())
        assertTrue(store.list(key).isEmpty())
        assertTrue(store.readyForSubmission(key).isFailure)
    }

    @Test
    fun enforcesSixPhotoAndOneVideoDraftLimit() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")

        repeat(6) { capture(store, key, ProofMediaType.Image) }
        capture(store, key, ProofMediaType.Video)

        assertTrue(store.prepareCapture(key, ProofMediaType.Image).isFailure)
        assertTrue(store.prepareCapture(key, ProofMediaType.Video).isFailure)
        assertEquals(7, store.list(key).size)
    }

    @Test
    fun videoLongerThanFifteenSecondsIsRejectedAndRemoved() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val target = store.prepareCapture(key, ProofMediaType.Video).getOrThrow()
        target.file.writeBytes(byteArrayOf(1, 2, 3))

        val result = store.completeCapture(target, success = true, durationSeconds = 15.01)

        assertTrue(result.isFailure)
        assertFalse(target.file.exists())
        assertTrue(store.list(key).isEmpty())
    }

    @Test
    fun captureCannotBeCompletedForAnotherSession() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val originalKey = SessionDraftKey("student-1", "session-1")
        val otherKey = SessionDraftKey("student-1", "session-2")
        val target = store.prepareCapture(originalKey, ProofMediaType.Image).getOrThrow()
        target.file.writeBytes(byteArrayOf(1, 2, 3))
        val mismatchedTarget = target.copy(key = otherKey)

        val result = store.completeCapture(mismatchedTarget, success = true)

        assertTrue(result.isFailure)
        assertTrue(target.file.exists())
        assertTrue(store.list(originalKey).isEmpty())
        assertTrue(store.list(otherKey).isEmpty())

        assertTrue(store.completeCapture(target, success = true).isSuccess)
        assertEquals(1, store.list(originalKey).size)
    }

    @Test
    fun serverCheckpointSurvivesRestartAndLocksTheUploadedDraft() {
        val root = temporaryFolder.newFolder("drafts")
        val key = SessionDraftKey("student-1", "session-1")
        val store = SessionMediaDraftStore(root, clock)
        val photo = capture(store, key, ProofMediaType.Image)
        val evidence = ExerciseMediaEvidence(
            mediaId = "media-1",
            sessionId = key.sessionId,
            mediaType = ProofMediaType.Image,
            status = ExerciseMediaServerStatus.PROCESSING,
            version = 4L
        )

        val checkpointed = store.setServerEvidence(key, photo.id, evidence)
        val restored = SessionMediaDraftStore(root, clock).list(key).single()

        assertEquals("media-1", checkpointed?.serverMediaId)
        assertEquals(ExerciseMediaServerStatus.PROCESSING, restored.serverMediaStatus)
        assertEquals(4L, restored.serverMediaVersion)

        assertTrue(store.prepareEdit(key, photo.id).isFailure)
        assertFalse(store.remove(key, photo.id))
    }

    @Test
    fun readySubmissionAutomaticallyIncludesEveryRetainedDraft() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val photo = capture(store, key, ProofMediaType.Image)
        val rawVideo = capture(store, key, ProofMediaType.Video)
        assertTrue(store.readyForSubmission(key).isFailure)
        val compression = store.prepareEdit(key, rawVideo.id).getOrThrow()
        compression.file.writeBytes(byteArrayOf(7, 8, 9))
        val video = store.commitFileUpdate(
            compression,
            durationSeconds = 15.0,
            compressedForUpload = true
        ).getOrThrow()

        assertEquals(
            listOf(photo.id, video.id),
            store.readyForSubmission(key).getOrThrow().map { it.id }
        )
    }

    @Test
    fun reorderedPhotosPersistAndDefineSubmissionOrder() {
        val root = temporaryFolder.newFolder("drafts")
        val store = SessionMediaDraftStore(root, clock)
        val key = SessionDraftKey("student-1", "session-1")
        val first = capture(store, key, ProofMediaType.Image)
        val second = capture(store, key, ProofMediaType.Image)
        val third = capture(store, key, ProofMediaType.Image)

        assertTrue(store.reorderImages(key, listOf(third.id, first.id, second.id)))

        val restored = SessionMediaDraftStore(root, clock).list(key)
        assertEquals(listOf(third.id, first.id, second.id), restored.map { it.id })
        assertEquals(
            listOf(third.id, first.id, second.id),
            store.readyForSubmission(key).getOrThrow().map { it.id }
        )
    }

    @Test
    fun committedEditReplacesOnlyAfterNewFileAndIndexAreReady() {
        val root = temporaryFolder.newFolder("drafts")
        val store = SessionMediaDraftStore(root, clock)
        val key = SessionDraftKey("student-1", "session-1")
        val original = capture(store, key, ProofMediaType.Image)
        val originalFile = store.resolveFile(key, original)

        val target = store.prepareEdit(key, original.id).getOrThrow()
        target.file.writeBytes(byteArrayOf(9, 8, 7, 6))
        val updated = store.commitFileUpdate(target).getOrThrow()

        assertEquals(original.id, updated.id)
        assertNotEquals(original.fileName, updated.fileName)
        assertTrue(store.resolveFile(key, updated).isFile)
        assertFalse(originalFile.exists())
        assertEquals(updated, SessionMediaDraftStore(root, clock).list(key).single())
    }

    @Test
    fun failedReplacementLeavesTheOriginalDraftUntouched() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val original = capture(store, key, ProofMediaType.Image)
        val originalFile = store.resolveFile(key, original)

        val target = store.prepareReplacement(key, original.id).getOrThrow()
        // Leave the camera staging file empty to emulate a cancelled/failed capture.
        assertTrue(store.commitFileUpdate(target).isFailure)

        assertTrue(originalFile.isFile)
        assertEquals(original, store.list(key).single())
        assertFalse(target.file.exists())
    }

    @Test
    fun removingDraftUpdatesIndexAndDeletesTheLocalFile() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val draft = capture(store, key, ProofMediaType.Image)
        val file = store.resolveFile(key, draft)

        assertTrue(store.remove(key, draft.id))

        assertTrue(store.list(key).isEmpty())
        assertFalse(file.exists())
    }

    @Test
    fun videoCoverFramePersistsWithTheSameDraft() {
        val root = temporaryFolder.newFolder("drafts")
        val store = SessionMediaDraftStore(root, clock)
        val key = SessionDraftKey("student-1", "session-1")
        val video = capture(store, key, ProofMediaType.Video)

        assertTrue(store.setVideoCover(key, video.id, 3_500L))

        assertEquals(3_500L, SessionMediaDraftStore(root, clock).list(key).single().coverTimestampMillis)
    }

    @Test
    fun accountsAndSessionsUseDifferentPrivateDirectories() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val first = store.prepareCapture(
            SessionDraftKey("student-1", "session-1"),
            ProofMediaType.Image
        ).getOrThrow()
        val second = store.prepareCapture(
            SessionDraftKey("student-2", "session-1"),
            ProofMediaType.Image
        ).getOrThrow()
        val third = store.prepareCapture(
            SessionDraftKey("student-1", "session-2"),
            ProofMediaType.Image
        ).getOrThrow()

        assertNotEquals(first.file.parentFile, second.file.parentFile)
        assertNotEquals(first.file.parentFile, third.file.parentFile)
        assertFalse(first.file.absolutePath.contains("student-1"))
        assertFalse(first.file.absolutePath.contains("session-1"))
    }

    @Test
    fun cancelledOrEmptyCaptureIsRemoved() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val key = SessionDraftKey("student-1", "session-1")
        val cancelled = store.prepareCapture(key, ProofMediaType.Image).getOrThrow()

        assertTrue(store.completeCapture(cancelled, success = false).isFailure)
        assertFalse(cancelled.file.exists())
        assertTrue(store.list(key).isEmpty())

        val empty = store.prepareCapture(key, ProofMediaType.Image).getOrThrow()
        assertTrue(store.completeCapture(empty, success = true).isFailure)
        assertFalse(empty.file.exists())
    }

    @Test
    fun clearSessionDeletesOnlyTheRequestedSession() {
        val store = SessionMediaDraftStore(temporaryFolder.newFolder("drafts"), clock)
        val firstKey = SessionDraftKey("student-1", "session-1")
        val secondKey = SessionDraftKey("student-1", "session-2")
        capture(store, firstKey, ProofMediaType.Image)
        capture(store, secondKey, ProofMediaType.Image)

        assertTrue(store.clearSession(firstKey))

        assertTrue(store.list(firstKey).isEmpty())
        assertEquals(1, store.list(secondKey).size)
    }

    private fun capture(
        store: SessionMediaDraftStore,
        key: SessionDraftKey,
        type: ProofMediaType
    ): SessionMediaDraft {
        val target = store.prepareCapture(key, type).getOrThrow()
        target.file.writeBytes(byteArrayOf(1, 2, 3))
        val durationSeconds = if (type == ProofMediaType.Video) 15.0 else null
        return store.completeCapture(
            target,
            success = true,
            durationSeconds = durationSeconds
        ).getOrThrow()
    }

    private class FakeExerciseClock(var now: Long) : ExerciseClock {
        override fun nowEpochMillis(): Long = now
    }
}
