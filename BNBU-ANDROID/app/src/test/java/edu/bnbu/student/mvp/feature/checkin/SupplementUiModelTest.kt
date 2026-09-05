package edu.bnbu.student.mvp.feature.checkin

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SupplementUiModelTest {
    @Test
    fun onlyTheApprovedTwentyFourAndSeventyTwoHourWindowsCanSubmit() {
        listOf(24, 72).forEach { window ->
            assertTrue(formalTask(windowHours = window).canSubmit(
                writeEnabled = true,
                photoCount = 1,
                videoCount = 0,
                note = "Additional evidence"
            ))
        }

        assertFalse(formalTask(windowHours = 48).canSubmit(
            writeEnabled = true,
            photoCount = 1,
            videoCount = 0,
            note = "Additional evidence"
        ))
    }

    @Test
    fun aReceivedExpiredOrUsedOpportunityCannotCreateAnotherVersion() {
        listOf(
            SupplementTaskState.Received,
            SupplementTaskState.Expired,
            SupplementTaskState.OpportunityUsed
        ).forEach { state ->
            assertFalse(formalTask(state = state).canSubmit(
                writeEnabled = true,
                photoCount = 1,
                videoCount = 0,
                note = "Additional evidence"
            ))
        }
    }

    @Test
    fun reviewSampleAndMissingBackendNeverCreateFakeSuccess() {
        assertFalse(localReviewSupplementTask().canSubmit(
            writeEnabled = true,
            photoCount = 1,
            videoCount = 0,
            note = "Review sample"
        ))
        assertFalse(formalTask(formalSubmissionAvailable = false).canSubmit(
            writeEnabled = true,
            photoCount = 1,
            videoCount = 0,
            note = "Additional evidence"
        ))
    }

    @Test
    fun everyNonOpenStateBlocksSubmissionEvenWithCompleteMaterials() {
        SupplementTaskState.entries.filter { it != SupplementTaskState.Open }.forEach { state ->
            assertFalse("$state cannot submit", formalTask(state = state).canSubmit(
                writeEnabled = true, photoCount = 1, videoCount = 1, note = "Synthetic UI test"
            ))
        }
    }

    @Test
    fun anOpenTaskStillRequiresWritePermissionAndAnExplanation() {
        assertFalse(formalTask().canSubmit(
            writeEnabled = false, photoCount = 1, videoCount = 0, note = "Synthetic UI test"
        ))
        assertFalse(formalTask().canSubmit(
            writeEnabled = true, photoCount = 1, videoCount = 0, note = "   "
        ))
    }

    @Test
    fun supplementVersionEnforcesSeparatePhotoAndVideoSlots() {
        assertFalse(formalTask().canSubmit(
            writeEnabled = true,
            photoCount = 7,
            videoCount = 0,
            note = "Additional evidence"
        ))
        assertFalse(formalTask().canSubmit(
            writeEnabled = true,
            photoCount = 0,
            videoCount = 2,
            note = "Additional evidence"
        ))
        assertFalse(formalTask().canSubmit(
            writeEnabled = true,
            photoCount = 0,
            videoCount = 0,
            note = "Additional evidence"
        ))
    }

    private fun formalTask(
        windowHours: Int = 24,
        state: SupplementTaskState = SupplementTaskState.Open,
        formalSubmissionAvailable: Boolean = true
    ) = SupplementTaskUiModel(
        recordId = "record-1",
        sportLabel = "Running",
        originalSubmittedAt = "2026-09-04 18:30",
        publicReason = "Add clearer evidence",
        deadlineLabel = "2026-09-05 18:30",
        windowHours = windowHours,
        originalEvidenceLabels = listOf("Original photo"),
        state = state,
        formalSubmissionAvailable = formalSubmissionAvailable
    )
}
