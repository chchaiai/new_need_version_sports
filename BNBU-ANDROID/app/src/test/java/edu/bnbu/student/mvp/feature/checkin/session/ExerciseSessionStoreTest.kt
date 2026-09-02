package edu.bnbu.student.mvp.feature.checkin.session

import com.google.gson.Gson
import edu.bnbu.student.mvp.core.local.ExerciseSessionSnapshot
import edu.bnbu.student.mvp.core.local.ExerciseSessionSnapshotStorage
import edu.bnbu.student.mvp.core.local.LocalStoreReadResult
import edu.bnbu.student.mvp.core.local.LocalStoreReadStatus
import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseSessionStoreTest {
    private val storage = FakeSnapshotStorage()
    private val store = ExerciseSessionStore(storage)
    private val details = ExerciseSessionDetails(CreditType.General, "running")

    @Test
    fun activeSessionRoundTripsWithoutLosingTimingFields() {
        val active = ExerciseSessionState.Active(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 5_000L,
            accumulatedActiveMillis = 30.minutes
        )

        assertTrue(store.save("student-1", active))
        val restored = store.restore("student-1")

        assertEquals(LocalStoreReadStatus.Loaded, restored.status)
        assertEquals(active, restored.state)
    }

    @Test
    fun pausedAndFinishedSessionsRoundTrip() {
        val paused = ExerciseSessionState.Paused(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            pausedAtEpochMillis = 61.minutes,
            accumulatedActiveMillis = 60.minutes
        )
        assertTrue(store.save("student-1", paused))
        assertEquals(paused, store.restore("student-1").state)

        val finished = ExerciseSessionState.Finished(
            sessionId = "session-1",
            details = details.copy(
                description = "完成一小时跑步训练",
            ),
            startedAtEpochMillis = 1_000L,
            endedAtEpochMillis = 61.minutes,
            activeDurationMillis = 60.minutes,
            creditedHours = 1
        )
        assertTrue(store.save("student-1", finished))
        assertEquals(finished, store.restore("student-1").state)
    }

    @Test
    fun tooShortPausedSessionRoundTripsWithItsOriginalSessionId() {
        val paused = ExerciseSessionState.Paused(
            sessionId = "session-with-drafts",
            details = details,
            startedAtEpochMillis = 1_000L,
            pausedAtEpochMillis = 1_000L + 59.minutes + 59.seconds,
            accumulatedActiveMillis = 59.minutes + 59.seconds
        )

        assertTrue(store.save("student-1", paused))

        assertEquals(paused, store.restore("student-1").state)
    }

    @Test
    fun legacyTwoHourPausedSessionRestoresAsCompleted() {
        val legacyPaused = ExerciseSessionState.Paused(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            pausedAtEpochMillis = 1_000L + MaximumExerciseMillis,
            accumulatedActiveMillis = MaximumExerciseMillis
        )

        assertTrue(store.save("student-1", legacyPaused))
        val completed = store.restore("student-1").state as ExerciseSessionState.Finished

        assertEquals(MaximumExerciseMillis, completed.activeDurationMillis)
        assertEquals(1_000L + MaximumExerciseMillis, completed.endedAtEpochMillis)
        assertEquals(2, completed.creditedHours)
    }

    @Test
    fun snapshotSurvivesJsonSerializationUsedByAndroidStore() {
        val active = ExerciseSessionState.Active(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 5_000L,
            accumulatedActiveMillis = 30.minutes
        )
        val gson = Gson()

        val json = gson.toJson(active.toSnapshot())
        val decoded = gson.fromJson(json, ExerciseSessionSnapshot::class.java)

        assertEquals(active, decoded.toExerciseSessionStateOrNull())
    }

    @Test
    fun accountIdsAreIsolatedByStorageContract() {
        val active = ExerciseSessionState.Active(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 1_000L
        )

        store.save("student-1", active)

        assertEquals(active, store.restore("student-1").state)
        assertEquals(ExerciseSessionState.Idle, store.restore("student-2").state)
    }

    @Test
    fun idleStateClearsPersistedSession() {
        val active = ExerciseSessionState.Active(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 1_000L
        )
        store.save("student-1", active)

        assertTrue(store.save("student-1", ExerciseSessionState.Idle))

        assertNull(storage.values["student-1"])
        assertEquals(ExerciseSessionState.Idle, store.restore("student-1").state)
    }

    @Test
    fun corruptOrFutureSnapshotIsDiscardedAndCleared() {
        storage.values["student-1"] = ExerciseSessionSnapshot(
            schemaVersion = 99,
            phase = ExerciseSessionSnapshot.PhaseActive,
            sessionId = "session-1",
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 1_000L
        )

        val restored = store.restore("student-1")

        assertEquals(ExerciseSessionState.Idle, restored.state)
        assertEquals(LocalStoreReadStatus.Discarded, restored.status)
        assertNull(storage.values["student-1"])
    }

    @Test
    fun invalidFinishedCreditsCannotBePersisted() {
        val invalid = ExerciseSessionState.Finished(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            endedAtEpochMillis = 61.minutes,
            activeDurationMillis = 60.minutes,
            creditedHours = 2
        )

        assertFalse(store.save("student-1", invalid))
        assertNull(storage.values["student-1"])
    }

    private class FakeSnapshotStorage : ExerciseSessionSnapshotStorage {
        val values = mutableMapOf<String, ExerciseSessionSnapshot>()

        override fun readExerciseSessionSnapshot(
            accountId: String
        ): LocalStoreReadResult<ExerciseSessionSnapshot> {
            val value = values[accountId]
            return LocalStoreReadResult(
                value = value,
                status = if (value == null) {
                    LocalStoreReadStatus.Missing
                } else {
                    LocalStoreReadStatus.Loaded
                }
            )
        }

        override fun saveExerciseSessionSnapshot(
            accountId: String,
            snapshot: ExerciseSessionSnapshot
        ): Boolean {
            values[accountId] = snapshot
            return true
        }

        override fun clearExerciseSessionSnapshot(accountId: String) {
            values.remove(accountId)
        }
    }

    private val Int.minutes: Long
        get() = this * 60L * 1_000L

    private val Int.seconds: Long
        get() = this * 1_000L
}
