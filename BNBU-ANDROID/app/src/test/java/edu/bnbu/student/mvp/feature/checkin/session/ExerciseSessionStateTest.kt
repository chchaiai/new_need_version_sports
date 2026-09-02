package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase
import edu.bnbu.student.mvp.core.exercise.requiresExerciseDescription
import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseSessionStateTest {
    private val clock = FakeExerciseClock(1_000L)
    private val machine = ExerciseSessionMachine(clock)
    private val details = ExerciseSessionDetails(CreditType.General, "running")

    @Test
    fun startCreatesActiveSessionAtCurrentTime() {
        val result = machine.start(ExerciseSessionState.Idle, "session-1", details)

        val active = result.changedState<ExerciseSessionState.Active>()
        assertEquals("session-1", active.sessionId)
        assertEquals(1_000L, active.startedAtEpochMillis)
        assertEquals(1_000L, active.activeSegmentStartedAtEpochMillis)
        assertEquals(0L, active.accumulatedActiveMillis)
    }

    @Test
    fun exerciseDescriptionIsTruncatedAtTwoHundredCharacters() {
        val description = "a".repeat(MaxExerciseDescriptionLength + 1)

        assertEquals(MaxExerciseDescriptionLength, truncateExerciseDescription(description).length)
    }

    @Test
    fun everyStudentSubmittedExerciseRequiresAUserProvidedDescription() {
        assertTrue(CreditType.CourseRelated.requiresExerciseDescription)
        assertTrue(CreditType.General.requiresExerciseDescription)
        assertFalse(CreditType.OrganizationOffset.requiresExerciseDescription)
    }

    @Test
    fun courseDescriptionIsTrimmedForSubmission() {
        val courseDetails = ExerciseSessionDetails(
            creditType = CreditType.CourseRelated,
            sportType = "running",
            description = "  badminton drills  "
        )

        assertEquals("badminton drills", courseDetails.descriptionForSubmission())
    }

    @Test
    fun providedDescriptionIsTrimmedForSubmission() {
        val independentDetails = ExerciseSessionDetails(
            creditType = CreditType.General,
            sportType = "running",
            description = "  five kilometre run  "
        )

        assertEquals("five kilometre run", independentDetails.descriptionForSubmission())
    }

    @Test
    fun tableTennisIsAValidExerciseSport() {
        val tableTennis = ExerciseSessionDetails(CreditType.General, "table_tennis")

        assertTrue(tableTennis.isValid)
    }

    @Test
    fun otherSportNameAllowsOneToOneHundredCharacters() {
        val valid = ExerciseSessionDetails(
            creditType = CreditType.General,
            sportType = ExerciseSessionDetails.OtherSportType,
            customSportName = "a".repeat(100)
        )
        val tooLong = valid.copy(customSportName = "a".repeat(101))

        assertTrue(valid.isValid)
        assertFalse(tooLong.isValid)
    }

    @Test
    fun courseSportIsResolvedFromCurrentCourseName() {
        val selection = courseSportSelection("大学体育（羽毛球）")

        assertEquals("badminton", selection.sportType)
        assertEquals("羽毛球", selection.displayName)
        assertEquals(null, selection.customSportName)
    }

    @Test
    fun unknownCourseSportUsesAValidCustomSport() {
        val selection = courseSportSelection("大学体育（瑜伽）")
        val courseDetails = ExerciseSessionDetails(
            creditType = CreditType.CourseRelated,
            sportType = selection.sportType,
            customSportName = selection.customSportName
        )

        assertEquals("瑜伽", selection.displayName)
        assertTrue(courseDetails.isValid)
    }

    @Test
    fun activeDurationUsesTimestampsInsteadOfUiTicks() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()

        clock.advance(25.minutes)

        assertEquals(25.minutes, active.effectiveDurationMillis(clock.nowEpochMillis()))
    }

    @Test
    fun pausedTimeIsExcludedAndResumeContinuesAccumulation() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(20.minutes)
        val paused = machine.pause(active).changedState<ExerciseSessionState.Paused>()

        clock.advance(30.minutes)
        assertEquals(20.minutes, paused.effectiveDurationMillis(clock.nowEpochMillis()))

        val resumed = machine.resume(paused).changedState<ExerciseSessionState.Active>()
        clock.advance(40.minutes)
        val finished = machine.requestFinish(resumed).changedState<ExerciseSessionState.Finished>()

        assertEquals(60.minutes, finished.activeDurationMillis)
        assertEquals(1, finished.creditedHours)
    }

    @Test
    fun pausedSessionRemainsAvailableAfterMoreThanSixHours() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(20.minutes)
        val paused = machine.pause(active).changedState<ExerciseSessionState.Paused>()

        clock.advance(6.hours + 1.minutes)

        val result = machine.autoFinishIfNeeded(paused)

        assertTrue(result is ExerciseSessionTransition.Changed)
        assertSame(paused, (result as ExerciseSessionTransition.Changed).state)
        assertTrue(machine.resume(paused) is ExerciseSessionTransition.Changed)
    }

    @Test
    fun finishBeforeOneHourDiscardsTheSessionAndResetsTheTimer() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(59.minutes + 59.seconds)

        val result = machine.requestFinish(active)

        assertTrue(result is ExerciseSessionTransition.Discarded)
        result as ExerciseSessionTransition.Discarded
        assertEquals(ExerciseTooShortMessage, result.message)
        assertTrue(result.message.contains("计时已清零，本地草稿已清除"))
        assertSame(ExerciseSessionState.Idle, result.state)
        assertEquals(0L, result.state.effectiveDurationMillis(clock.nowEpochMillis()))
        assertTrue(machine.resume(result.state) is ExerciseSessionTransition.Rejected)
    }

    @Test
    fun finishPausedSessionBeforeOneHourAlsoDiscardsTheSession() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(30.minutes)
        val paused = machine.pause(active).changedState<ExerciseSessionState.Paused>()

        val result = machine.requestFinish(paused)

        assertTrue(result is ExerciseSessionTransition.Discarded)
        assertSame(ExerciseSessionState.Idle, result.state)
        assertEquals(0L, result.state.effectiveDurationMillis(clock.nowEpochMillis()))
    }

    @Test
    fun exactOneHourFinishesWithOneCreditHour() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(60.minutes)

        val finished = machine.requestFinish(active).changedState<ExerciseSessionState.Finished>()

        assertEquals(MinimumValidExerciseMillis, finished.activeDurationMillis)
        assertEquals(1, finished.creditedHours)
    }

    @Test
    fun durationBelowTwoHoursStillCreditsOneHour() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(119.minutes + 59.seconds)

        val finished = machine.requestFinish(active).changedState<ExerciseSessionState.Finished>()

        assertEquals(1, finished.creditedHours)
    }

    @Test
    fun twoHourLimitCompletesAtExactThreshold() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(125.minutes)

        val completed = machine.autoFinishIfNeeded(active)
            .changedState<ExerciseSessionState.Finished>()

        assertEquals(MaximumExerciseMillis, completed.activeDurationMillis)
        assertEquals(2, completed.creditedHours)
        assertEquals(1_000L + MaximumExerciseMillis, completed.endedAtEpochMillis)
        assertEquals(ExerciseSessionPhase.COMPLETED, completed.toExerciseSessionPhaseOrNull())
    }

    @Test
    fun localReviewShortcutAdvancesAnActiveSessionToTwoHoursWithoutCompletingIt() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(5.minutes)

        val paused = machine.advanceToTwoHoursForLocalReview(active)
            .changedState<ExerciseSessionState.Paused>()

        assertEquals(MaximumExerciseMillis, paused.accumulatedActiveMillis)
        assertEquals(MaximumExerciseMillis, paused.effectiveDurationMillis(clock.nowEpochMillis()))
        assertEquals(2, creditedExerciseHours(paused.accumulatedActiveMillis))
        val finished = machine.requestFinish(paused)
            .changedState<ExerciseSessionState.Finished>()
        assertEquals(2, finished.creditedHours)
    }

    @Test
    fun localReviewShortcutRejectsAnIdleSession() {
        val result = machine.advanceToTwoHoursForLocalReview(ExerciseSessionState.Idle)

        assertTrue(result is ExerciseSessionTransition.Rejected)
        assertSame(ExerciseSessionState.Idle, result.state)
    }

    @Test
    fun completedSessionRejectsEveryContinuationOperation() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(120.minutes)
        val completed = machine.autoFinishIfNeeded(active)
            .changedState<ExerciseSessionState.Finished>()

        val restartResult = machine.start(completed, "session-2", details)
        val pauseResult = machine.pause(completed)
        val resumeResult = machine.resume(completed)
        val finishResult = machine.requestFinish(completed)

        assertTrue(restartResult is ExerciseSessionTransition.Rejected)
        assertTrue(pauseResult is ExerciseSessionTransition.Rejected)
        assertTrue(resumeResult is ExerciseSessionTransition.Rejected)
        assertTrue(finishResult is ExerciseSessionTransition.Rejected)
        assertSame(completed, restartResult.state)
        assertSame(completed, pauseResult.state)
        assertSame(completed, resumeResult.state)
        assertSame(completed, finishResult.state)
    }

    @Test
    fun localRunningStatesUseTheSamePhasesAsTheBackendContract() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(15.minutes)
        val paused = machine.pause(active).changedState<ExerciseSessionState.Paused>()

        assertEquals(ExerciseSessionPhase.ACTIVE, active.toExerciseSessionPhaseOrNull())
        assertEquals(ExerciseSessionPhase.PAUSED, paused.toExerciseSessionPhaseOrNull())
        assertEquals(null, ExerciseSessionState.Idle.toExerciseSessionPhaseOrNull())
    }

    @Test
    fun invalidTransitionsAreRejectedWithoutChangingState() {
        val idle = ExerciseSessionState.Idle
        val pauseResult = machine.pause(idle)
        val resumeResult = machine.resume(idle)
        val finishResult = machine.requestFinish(idle)

        assertTrue(pauseResult is ExerciseSessionTransition.Rejected)
        assertTrue(resumeResult is ExerciseSessionTransition.Rejected)
        assertTrue(finishResult is ExerciseSessionTransition.Rejected)
        assertSame(idle, pauseResult.state)
        assertSame(idle, resumeResult.state)
        assertSame(idle, finishResult.state)
    }

    @Test
    fun clockRollbackDoesNotSubtractAccumulatedTime() {
        val active = machine.start(ExerciseSessionState.Idle, "session-1", details)
            .changedState<ExerciseSessionState.Active>()
        clock.advance(15.minutes)
        val paused = machine.pause(active).changedState<ExerciseSessionState.Paused>()
        val resumed = machine.resume(paused).changedState<ExerciseSessionState.Active>()

        clock.now -= 5.minutes

        assertEquals(15.minutes, resumed.effectiveDurationMillis(clock.nowEpochMillis()))
    }

    private inline fun <reified T : ExerciseSessionState> ExerciseSessionTransition.changedState(): T {
        assertTrue(this is ExerciseSessionTransition.Changed)
        return (this as ExerciseSessionTransition.Changed).state as T
    }

    private class FakeExerciseClock(var now: Long) : ExerciseClock {
        override fun nowEpochMillis(): Long = now

        fun advance(durationMillis: Long) {
            now += durationMillis
        }
    }

    private val Int.seconds: Long
        get() = this * 1_000L

    private val Int.minutes: Long
        get() = this * 60L * 1_000L

    private val Int.hours: Long
        get() = this * 60.minutes
}
