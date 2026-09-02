package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.ProofMediaType
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseRecordCoordinatorTest {
    @Test
    fun completedSessionCreatesUpdatesAndSubmitsARecordDraft() = runBlocking {
        val gateway = FakeExerciseGateway()
        val session = completedSession()
        val created = ExerciseRecordDraft("record-1", session.sessionId, version = 1L)
        val updated = created.copy(version = 2L)
        val submitted = ExerciseRecord(
            recordId = created.recordId,
            sessionId = session.sessionId,
            version = 3L,
            submittedAtEpochMillis = 9_000L,
            businessDate = LocalDate.parse("2026-08-11"),
            creditedDurationSeconds = 3_600L,
            reviewStatus = "VALID"
        )
        var createCommand: CreateExerciseRecordDraftCommand? = null
        gateway.onCreateRecordDraft = { command ->
            createCommand = command
            created
        }
        var updateCommand: UpdateExerciseRecordDraftCommand? = null
        gateway.onUpdateRecordDraft = { command ->
            updateCommand = command
            updated
        }
        var submitCommand: SubmitExerciseRecordCommand? = null
        gateway.onSubmitRecord = { command ->
            submitCommand = command
            submitted
        }
        val coordinator = ExerciseRecordCoordinator(gateway) { "android-record-1" }

        coordinator.begin(session)
        coordinator.edit(validForm(description = "  morning run  "))
        coordinator.updateDraft()
        coordinator.edit(validForm(description = "  evening run  "))
        coordinator.updateDraft()
        val result = coordinator.submit()

        assertTrue(result is ExerciseRecordOperationResult.Success)
        assertEquals(session.sessionId, createCommand?.sessionId)
        assertEquals("android-record-1", createCommand?.clientRequestId)
        assertEquals(
            "morning run",
            createCommand?.form?.normalizedForDraft(session.creditType)?.description
        )
        assertEquals(1L, updateCommand?.expectedVersion)
        assertEquals("evening run", updateCommand?.form?.description)
        assertEquals(2L, submitCommand?.expectedVersion)
        assertEquals(listOf("media-1"), submitCommand?.mediaIds)
        assertEquals(submitted, coordinator.state.submittedRecord)
    }

    @Test
    fun failedDraftCreationRetainsStableClientRequestIdForRetry() = runBlocking {
        val failure = IllegalStateException("offline")
        val observedClientRequestIds = mutableListOf<String>()
        var attempts = 0
        val gateway = FakeExerciseGateway().apply {
            onCreateRecordDraft = { command ->
                observedClientRequestIds += command.clientRequestId
                attempts += 1
                if (attempts == 1) throw failure
                ExerciseRecordDraft("record-1", command.sessionId, version = 1L)
            }
        }
        val coordinator = ExerciseRecordCoordinator(gateway) { "android-record-stable" }
        coordinator.begin(completedSession())
        coordinator.edit(validForm())

        val failed = coordinator.updateDraft()
        val retried = coordinator.updateDraft()

        assertTrue(failed is ExerciseRecordOperationResult.Failed)
        assertTrue(retried is ExerciseRecordOperationResult.Success)
        assertEquals(
            listOf("android-record-stable", "android-record-stable"),
            observedClientRequestIds
        )
    }

    @Test
    fun processRestartRecoversAndUpdatesExistingSessionDraftBeforeSubmission() = runBlocking {
        val recovered = ExerciseRecordDraft("record-existing", "session-1", version = 4L)
        var createCalls = 0
        var updateCommand: UpdateExerciseRecordDraftCommand? = null
        val gateway = FakeExerciseGateway().apply {
            onFindRecordDraft = { sessionId ->
                assertEquals("session-1", sessionId)
                recovered
            }
            onCreateRecordDraft = {
                createCalls += 1
                error("an existing session draft must not be recreated")
            }
            onUpdateRecordDraft = { command ->
                updateCommand = command
                recovered.copy(version = 5L)
            }
        }
        val coordinator = ExerciseRecordCoordinator(gateway) { "android-after-restart" }
        coordinator.begin(completedSession())
        coordinator.edit(validForm(description = "retry after restart"))

        val result = coordinator.updateDraft()

        assertTrue(result is ExerciseRecordOperationResult.Success)
        assertEquals(0, createCalls)
        assertEquals("record-existing", updateCommand?.recordId)
        assertEquals(4L, updateCommand?.expectedVersion)
        assertEquals(5L, coordinator.state.remoteDraft?.version)
    }

    @Test
    fun onlyAvailableServerMediaCanBeAttachedToTheRecord() = runBlocking {
        val coordinator = ExerciseRecordCoordinator(gatewayWithCreatedDraft())
        coordinator.begin(completedSession())

        val processing = coordinator.attachAvailableMedia(
            listOf(serverEvidence(ExerciseMediaServerStatus.PROCESSING))
        )
        val available = coordinator.attachAvailableMedia(
            listOf(serverEvidence(ExerciseMediaServerStatus.AVAILABLE))
        )

        assertRejectedForm(processing)
        assertTrue(available is ExerciseRecordOperationResult.Success)
        assertEquals("media-server-1", coordinator.state.form.media.single().mediaId)
        assertEquals(
            ExerciseMediaAvailability.AVAILABLE,
            coordinator.state.form.media.single().availability
        )
    }

    @Test
    fun availableServerMediaIdIsUsedByRecordSubmission() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        var submitCommand: SubmitExerciseRecordCommand? = null
        gateway.onSubmitRecord = { command ->
            submitCommand = command
            ExerciseRecord(
                command.recordId,
                "session-1",
                3L,
                9_000L,
                LocalDate.parse("2026-08-11"),
                3_600L,
                "VALID"
            )
        }
        gateway.onUpdateRecordDraft = { command ->
            ExerciseRecordDraft(command.recordId, "session-1", 2L)
        }
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())
        coordinator.edit(validForm().copy(media = emptyList()))
        coordinator.updateDraft()

        coordinator.attachAvailableMedia(
            listOf(serverEvidence(ExerciseMediaServerStatus.AVAILABLE))
        )
        coordinator.updateDraft()
        val submitted = coordinator.submit()

        assertTrue(submitted is ExerciseRecordOperationResult.Success)
        assertEquals(listOf("media-server-1"), submitCommand?.mediaIds)
    }

    @Test
    fun allRecordDescriptionsMustContainOneToTwoHundredCharacters() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())
        val courseCoordinator = ExerciseRecordCoordinator(gatewayWithCreatedDraft())
        courseCoordinator.begin(completedSession().copy(creditType = CreditType.CourseRelated))

        coordinator.edit(validForm(description = " "))
        val blankResult = coordinator.updateDraft()
        coordinator.edit(validForm(description = "a".repeat(201)))
        val longResult = coordinator.updateDraft()
        courseCoordinator.edit(validForm(description = " "))
        val blankCourseResult = courseCoordinator.updateDraft()

        assertRejectedForm(blankResult)
        assertRejectedForm(longResult)
        assertRejectedForm(blankCourseResult)
    }

    @Test
    fun otherSportNameMustContainOneToOneHundredCharacters() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())

        coordinator.edit(validForm().copy(
            sportType = ExerciseRecordForm.OtherSportType,
            otherSportName = ""
        ))
        val blankResult = coordinator.updateDraft()
        coordinator.edit(validForm().copy(
            sportType = ExerciseRecordForm.OtherSportType,
            otherSportName = "a".repeat(101)
        ))
        val longResult = coordinator.updateDraft()

        assertRejectedForm(blankResult)
        assertRejectedForm(longResult)
    }

    @Test
    fun recordCanOnlyReferenceAvailableMedia() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())
        coordinator.edit(validForm().copy(
            media = listOf(
                ExerciseMediaReference(
                    mediaId = "media-1",
                    sessionId = "session-1",
                    type = ProofMediaType.Image,
                    availability = ExerciseMediaAvailability.PROCESSING
                )
            )
        ))

        coordinator.updateDraft()
        val result = coordinator.submit()

        assertRejectedForm(result)
    }

    @Test
    fun recordCannotBindMediaFromAnotherSession() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())
        coordinator.edit(validForm().copy(
            media = listOf(
                ExerciseMediaReference(
                    mediaId = "media-1",
                    sessionId = "session-2",
                    type = ProofMediaType.Image,
                    availability = ExerciseMediaAvailability.AVAILABLE
                )
            )
        ))

        coordinator.updateDraft()
        val result = coordinator.submit()

        assertRejectedForm(result)
    }

    @Test
    fun failedSubmissionRetainsDraftFormAndMediaThenAllowsRetry() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val failure = IllegalStateException("offline")
        var submitCalls = 0
        gateway.onSubmitRecord = { command ->
            submitCalls += 1
            if (submitCalls == 1) throw failure
            ExerciseRecord(
                command.recordId,
                "session-1",
                version = 2L,
                submittedAtEpochMillis = 9_000L,
                businessDate = LocalDate.parse("2026-08-11"),
                creditedDurationSeconds = 3_600L,
                reviewStatus = "VALID"
            )
        }
        val coordinator = ExerciseRecordCoordinator(gateway)
        val form = validForm()
        coordinator.begin(completedSession())
        coordinator.edit(form)
        coordinator.updateDraft()

        val failed = coordinator.submit()

        assertTrue(failed is ExerciseRecordOperationResult.Failed)
        assertEquals("record-1", coordinator.state.remoteDraft?.recordId)
        assertEquals(form.media, coordinator.state.form.media)
        assertTrue(coordinator.state.isFormSynced)
        assertSame(failure, coordinator.state.recoverableFailure?.cause)

        val retried = coordinator.submit()

        assertTrue(retried is ExerciseRecordOperationResult.Success)
        assertEquals(2, submitCalls)
        assertEquals("record-1", coordinator.state.submittedRecord?.recordId)
    }

    @Test
    fun concurrentSubmitIsRejectedInsteadOfCreatingADuplicateRequest() = runBlocking {
        val gateway = gatewayWithCreatedDraft()
        val enteredSubmit = CompletableDeferred<Unit>()
        val releaseSubmit = CompletableDeferred<Unit>()
        var submitCalls = 0
        gateway.onSubmitRecord = { command ->
            submitCalls += 1
            enteredSubmit.complete(Unit)
            releaseSubmit.await()
            ExerciseRecord(
                command.recordId,
                "session-1",
                version = 2L,
                submittedAtEpochMillis = 9_000L,
                businessDate = LocalDate.parse("2026-08-11"),
                creditedDurationSeconds = 3_600L,
                reviewStatus = "VALID"
            )
        }
        val coordinator = ExerciseRecordCoordinator(gateway)
        coordinator.begin(completedSession())
        coordinator.edit(validForm())
        coordinator.updateDraft()

        val first = async { coordinator.submit() }
        enteredSubmit.await()
        val duplicate = coordinator.submit()
        releaseSubmit.complete(Unit)

        assertTrue(first.await() is ExerciseRecordOperationResult.Success)
        assertTrue(duplicate is ExerciseRecordOperationResult.Rejected)
        duplicate as ExerciseRecordOperationResult.Rejected
        assertEquals(ExerciseRecordRejection.OPERATION_IN_PROGRESS, duplicate.reason)
        assertEquals(1, submitCalls)
    }

    @Test
    fun sessionShorterThanOneHourCannotCreateARecordDraft() = runBlocking {
        val gateway = FakeExerciseGateway()
        var createCalls = 0
        gateway.onCreateRecordDraft = { command ->
            createCalls += 1
            ExerciseRecordDraft("record-1", command.sessionId, version = 1L)
        }
        val coordinator = ExerciseRecordCoordinator(gateway)

        val result = coordinator.begin(
            completedSession().copy(activeDurationSeconds = MinimumValidExerciseDurationSeconds - 1L)
        )

        assertTrue(result is ExerciseRecordOperationResult.Rejected)
        assertEquals(0, createCalls)
    }

    private fun gatewayWithCreatedDraft(): FakeExerciseGateway {
        return FakeExerciseGateway().apply {
            onCreateRecordDraft = { command ->
                ExerciseRecordDraft("record-1", command.sessionId, version = 1L)
            }
        }
    }

    private fun completedSession() = ExerciseSessionRecord(
        sessionId = "session-1",
        phase = ExerciseSessionPhase.COMPLETED,
        version = 4L,
        creditType = CreditType.General,
        sportType = "running",
        startedAtEpochMillis = 1_000L,
        activeDurationSeconds = MinimumValidExerciseDurationSeconds,
        endedAtEpochMillis = 3_601_000L
    )

    private fun validForm(
        description: String = "morning run"
    ) = ExerciseRecordForm(
        description = description,
        sportType = "running",
        media = listOf(
            ExerciseMediaReference(
                mediaId = "media-1",
                sessionId = "session-1",
                type = ProofMediaType.Image,
                availability = ExerciseMediaAvailability.AVAILABLE
            )
        )
    )

    private fun serverEvidence(status: ExerciseMediaServerStatus) = ExerciseMediaEvidence(
        mediaId = "media-server-1",
        sessionId = "session-1",
        mediaType = ProofMediaType.Image,
        status = status,
        version = 3L
    )

    private fun assertRejectedForm(result: ExerciseRecordOperationResult) {
        assertTrue(result is ExerciseRecordOperationResult.Rejected)
        result as ExerciseRecordOperationResult.Rejected
        assertEquals(ExerciseRecordRejection.INVALID_FORM, result.reason)
    }
}
