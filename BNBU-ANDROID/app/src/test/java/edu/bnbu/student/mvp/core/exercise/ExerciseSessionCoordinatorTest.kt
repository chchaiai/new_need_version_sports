package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlinx.coroutines.runBlocking

class ExerciseSessionCoordinatorTest {
    @Test
    fun restoreUsesServerStateInsteadOfAStaleLocalMirror() = runBlocking {
        val gateway = FakeExerciseGateway()
        val local = session(ExerciseSessionPhase.ACTIVE, version = 1L, durationSeconds = 600L)
        val server = session(ExerciseSessionPhase.PAUSED, version = 4L, durationSeconds = 900L)
        gateway.onGetActive = { server }
        val coordinator = ExerciseSessionCoordinator(gateway)

        val result = coordinator.restore(local)

        assertTrue(result is ExerciseSessionOperationResult.Success)
        assertEquals(server, coordinator.state.session)
        assertEquals(null, coordinator.state.recoverableFailure)
    }

    @Test
    fun restoreFailureRetainsLocalMirrorAndExposesRecoverableFailure() = runBlocking {
        val gateway = FakeExerciseGateway()
        val local = session(ExerciseSessionPhase.ACTIVE, version = 1L, durationSeconds = 600L)
        val failure = IllegalStateException("offline")
        gateway.onGetActive = { throw failure }
        val coordinator = ExerciseSessionCoordinator(gateway)

        val result = coordinator.restore(local)

        assertTrue(result is ExerciseSessionOperationResult.Failed)
        assertEquals(local, coordinator.state.session)
        assertSame(failure, coordinator.state.recoverableFailure?.cause)
    }

    @Test
    fun matchingPersistedSessionRecoversButAnotherDeviceSessionStaysReadOnly() = runBlocking {
        val sameDeviceGateway = FakeExerciseGateway()
        val local = session(ExerciseSessionPhase.ACTIVE, version = 1L, durationSeconds = 600L)
        val authoritative = session(
            ExerciseSessionPhase.PAUSED,
            version = 4L,
            durationSeconds = 900L
        )
        sameDeviceGateway.onGetActive = { mirror ->
            assertEquals(local.sessionId, mirror?.sessionId)
            authoritative
        }
        val sameDevice = ExerciseSessionCoordinator(sameDeviceGateway)

        val recovered = sameDevice.restore(local)

        assertTrue(recovered is ExerciseSessionOperationResult.Success)
        assertEquals(authoritative, sameDevice.state.session)
        assertEquals(null, sameDevice.state.existingRemoteSession)

        val remote = ExistingRemoteExerciseSession(
            sessionId = "session-on-device-a",
            phase = ExerciseSessionPhase.ACTIVE,
            startedAtEpochMillis = 12_345L,
            requestId = "req-device-b"
        )
        val otherDeviceGateway = FakeExerciseGateway()
        otherDeviceGateway.onGetActive = {
            throw ExerciseSessionAlreadyActiveOnAnotherDeviceException(remote)
        }
        var cancelCalls = 0
        otherDeviceGateway.onCancel = {
            cancelCalls += 1
            error("Another device's Session must never be cancelled")
        }
        val otherDevice = ExerciseSessionCoordinator(otherDeviceGateway)

        val conflict = otherDevice.restore(localMirror = null)
        val cancel = otherDevice.cancel()

        assertTrue(conflict is ExerciseSessionOperationResult.AlreadyActive)
        assertEquals(null, otherDevice.state.session)
        assertEquals(remote, otherDevice.state.existingRemoteSession)
        assertTrue(cancel is ExerciseSessionOperationResult.Rejected)
        assertEquals(0, cancelCalls)
    }

    @Test
    fun deviceBStartConflictNeverCreatesOrTakesOverASecondSession() = runBlocking {
        val gateway = FakeExerciseGateway()
        val remote = ExistingRemoteExerciseSession(
            sessionId = "session-on-device-a",
            phase = ExerciseSessionPhase.PAUSED,
            startedAtEpochMillis = 44_000L,
            requestId = "req-start-conflict"
        )
        var startCalls = 0
        gateway.onGetActive = { null }
        gateway.onStart = {
            startCalls += 1
            throw ExerciseSessionAlreadyActiveOnAnotherDeviceException(remote)
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(localMirror = null)

        val result = coordinator.start(
            StartExerciseCommand(CreditType.General, sportType = "RUNNING")
        )

        assertTrue(result is ExerciseSessionOperationResult.AlreadyActive)
        assertEquals(1, startCalls)
        assertEquals(null, coordinator.state.session)
        assertEquals(remote, coordinator.state.existingRemoteSession)
    }

    @Test
    fun pauseAndResumeUseTheLastServerVersion() = runBlocking {
        val gateway = FakeExerciseGateway()
        val active = session(ExerciseSessionPhase.ACTIVE, version = 7L, durationSeconds = 600L)
        val paused = session(ExerciseSessionPhase.PAUSED, version = 8L, durationSeconds = 610L)
        val resumed = session(ExerciseSessionPhase.ACTIVE, version = 9L, durationSeconds = 610L)
        gateway.onGetActive = { active }
        var pauseExpectedVersion = -1L
        var resumeExpectedVersion = -1L
        gateway.onPause = { current ->
            assertEquals(active.sessionId, current.sessionId)
            pauseExpectedVersion = current.version
            paused
        }
        gateway.onResume = { current ->
            assertEquals(paused.sessionId, current.sessionId)
            resumeExpectedVersion = current.version
            resumed
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        coordinator.pause()
        coordinator.resume()

        assertEquals(7L, pauseExpectedVersion)
        assertEquals(8L, resumeExpectedVersion)
        assertEquals(resumed, coordinator.state.session)
    }

    @Test
    fun finishUsesServerFinalDurationWithoutClientCreditFields() = runBlocking {
        val gateway = FakeExerciseGateway()
        val active = session(ExerciseSessionPhase.ACTIVE, version = 2L, durationSeconds = 3_700L)
        val completed = session(
            phase = ExerciseSessionPhase.COMPLETED,
            version = 3L,
            durationSeconds = 4_321L
        )
        gateway.onGetActive = { active }
        var receivedVersion = -1L
        gateway.onFinish = { current ->
            receivedVersion = current.version
            completed
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        val result = coordinator.finish()

        assertTrue(result is ExerciseSessionOperationResult.Success)
        assertEquals(2L, receivedVersion)
        assertEquals(4_321L, coordinator.state.session?.activeDurationSeconds)
        assertEquals(ExerciseSessionPhase.COMPLETED, coordinator.state.session?.phase)
    }

    @Test
    fun cancelUsesAuthoritativeCancelledStateForAnUnusedSession() = runBlocking {
        val gateway = FakeExerciseGateway()
        val active = session(ExerciseSessionPhase.ACTIVE, version = 2L, durationSeconds = 42L)
        val cancelled = session(ExerciseSessionPhase.CANCELLED, version = 3L, durationSeconds = 42L)
        gateway.onGetActive = { active }
        gateway.onCancel = { current ->
            assertEquals(2L, current.version)
            cancelled
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        val result = coordinator.cancel()

        assertTrue(result is ExerciseSessionOperationResult.Success)
        assertEquals(cancelled, coordinator.state.session)
    }

    @Test
    fun expectedVersionConflictRefreshesTheServerMirrorWithoutRetryingMutation() = runBlocking {
        val gateway = FakeExerciseGateway()
        val stale = session(ExerciseSessionPhase.ACTIVE, version = 2L, durationSeconds = 600L)
        val latest = session(ExerciseSessionPhase.PAUSED, version = 5L, durationSeconds = 660L)
        var activeCallCount = 0
        gateway.onGetActive = {
            activeCallCount += 1
            stale
        }
        gateway.onGet = { sessionId, localMirror ->
            activeCallCount += 1
            assertEquals(stale.sessionId, sessionId)
            assertEquals(stale, localMirror)
            latest
        }
        var pauseCallCount = 0
        gateway.onPause = { current ->
            pauseCallCount += 1
            assertEquals(2L, current.version)
            throw ExerciseVersionConflictException()
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        val result = coordinator.pause()

        assertTrue(result is ExerciseSessionOperationResult.Failed)
        assertEquals(1, pauseCallCount)
        assertEquals(2, activeCallCount)
        assertEquals(latest, coordinator.state.session)
        assertTrue(coordinator.state.recoverableFailure != null)
    }

    @Test
    fun failedPauseDoesNotFakeSuccessAndCanBeRetried() = runBlocking {
        val gateway = FakeExerciseGateway()
        val active = session(ExerciseSessionPhase.ACTIVE, version = 2L, durationSeconds = 600L)
        val paused = session(ExerciseSessionPhase.PAUSED, version = 3L, durationSeconds = 610L)
        gateway.onGetActive = { active }
        var pauseCalls = 0
        gateway.onPause = { current ->
            pauseCalls += 1
            assertEquals(2L, current.version)
            if (pauseCalls == 1) throw IllegalStateException("offline")
            paused
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        val failed = coordinator.pause()

        assertTrue(failed is ExerciseSessionOperationResult.Failed)
        assertEquals(active, coordinator.state.session)
        assertTrue(coordinator.state.recoverableFailure != null)

        val retried = coordinator.pause()

        assertTrue(retried is ExerciseSessionOperationResult.Success)
        assertEquals(paused, coordinator.state.session)
        assertEquals(2, pauseCalls)
    }

    @Test
    fun refreshCurrentReadsAuthoritativeStateAfterOutOfBandTestTool() = runBlocking {
        val gateway = FakeExerciseGateway()
        val active = session(ExerciseSessionPhase.ACTIVE, version = 2L, durationSeconds = 600L)
        val advanced = session(
            ExerciseSessionPhase.COMPLETED,
            version = 3L,
            durationSeconds = 3_600L
        )
        gateway.onGetActive = { active }
        gateway.onGet = { sessionId, localMirror ->
            assertEquals(active.sessionId, sessionId)
            assertEquals(active, localMirror)
            advanced
        }
        val coordinator = ExerciseSessionCoordinator(gateway)
        coordinator.restore(null)

        val refreshed = coordinator.refreshCurrent()

        assertTrue(refreshed is ExerciseSessionOperationResult.Success)
        assertEquals(advanced, coordinator.state.session)
    }

    private fun session(
        phase: ExerciseSessionPhase,
        version: Long,
        durationSeconds: Long
    ) = ExerciseSessionRecord(
        sessionId = "session-1",
        phase = phase,
        version = version,
        creditType = CreditType.General,
        sportType = "running",
        startedAtEpochMillis = 1_000L,
        activeDurationSeconds = durationSeconds,
        endedAtEpochMillis = if (phase == ExerciseSessionPhase.COMPLETED) 8_000_000L else null
    )
}
