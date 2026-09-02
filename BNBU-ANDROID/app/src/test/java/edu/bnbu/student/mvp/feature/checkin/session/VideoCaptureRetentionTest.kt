package edu.bnbu.student.mvp.feature.checkin.session

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class VideoCaptureRetentionTest {
    @Test
    fun rejectedCaptureOnlyClearsPendingAndNeverRetainsOrCompresses() = runBlocking {
        var discardedCount = 0
        var retainedCount = 0
        var compressedCount = 0

        val result = processVideoCaptureRetention(
            success = false,
            discardPending = { discardedCount += 1 },
            retainPending = {
                retainedCount += 1
                "must-not-be-retained"
            },
            compressRetained = { compressedCount += 1 }
        ).getOrThrow()

        assertEquals(VideoCaptureRetentionResult.DiscardedPending, result)
        assertEquals(1, discardedCount)
        assertEquals(0, retainedCount)
        assertEquals(0, compressedCount)
    }

    @Test
    fun confirmedCaptureRetainsBeforeCompressingTheSameDraft() = runBlocking {
        val calls = mutableListOf<String>()

        val result = processVideoCaptureRetention(
            success = true,
            discardPending = { calls += "discard" },
            retainPending = {
                calls += "retain"
                "retained-draft"
            },
            compressRetained = { draftId -> calls += "compress:$draftId" }
        ).getOrThrow()

        assertEquals(VideoCaptureRetentionResult.RetainedAndCompressed, result)
        assertEquals(listOf("retain", "compress:retained-draft"), calls)
    }
}
