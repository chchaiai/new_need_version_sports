package edu.bnbu.student.mvp.feature.shell

import edu.bnbu.student.mvp.core.model.AppLanguage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MaintenanceSupplementTimingUiModelTest {
    @Test
    fun pausedTimingUsesTheServerSnapshotInBothLanguages() {
        val paused = MaintenanceSupplementTimingUiModel.Paused(
            serverConfirmedRemainingSeconds = 18 * 60 * 60L + 24 * 60L
        )

        val chinese = paused.toPresentation(AppLanguage.Chinese)!!
        val english = paused.toPresentation(AppLanguage.English)!!

        assertTrue(chinese.isPaused)
        assertEquals("计时已暂停", chinese.status)
        assertEquals("剩余时间（服务器确认）：18小时24分钟", chinese.remainingTime)
        assertEquals("Timing paused", english.status)
        assertEquals("Time remaining (server confirmed): 18h 24m", english.remainingTime)
    }

    @Test
    fun aPartialMinuteRoundsUpSoTheUiNeverUnderstatesRemainingTime() {
        assertEquals("2分钟", formatRemainingTime(65, AppLanguage.Chinese))
        assertEquals("2m", formatRemainingTime(65, AppLanguage.English))
    }

    @Test
    fun repeatedMaintenanceUsesTheLatestIndependentServerSnapshot() {
        val firstMaintenance = MaintenanceSupplementTimingUiModel.Paused(
            serverConfirmedRemainingSeconds = 5 * 60 * 60L
        )
        val latestMaintenance = MaintenanceSupplementTimingUiModel.Paused(
            serverConfirmedRemainingSeconds = 7 * 60 * 60L
        )

        assertEquals(
            "剩余时间（服务器确认）：5小时",
            firstMaintenance.toPresentation(AppLanguage.Chinese)?.remainingTime
        )
        assertEquals(
            "剩余时间（服务器确认）：7小时",
            latestMaintenance.toPresentation(AppLanguage.Chinese)?.remainingTime
        )
    }

    @Test
    fun noActiveTaskDoesNotManufactureATimerCard() {
        assertNull(
            MaintenanceSupplementTimingUiModel.NoActiveTask
                .toPresentation(AppLanguage.Chinese)
        )
    }

    @Test
    fun expiredAndReceivedTasksStayDistinctFromPausedTiming() {
        val expired = MaintenanceSupplementTimingUiModel.ExpiredBeforeMaintenance
            .toPresentation(AppLanguage.Chinese)!!
        val received = MaintenanceSupplementTimingUiModel.ReceivedBeforeMaintenance
            .toPresentation(AppLanguage.Chinese)!!

        assertEquals("维护前已逾期", expired.status)
        assertFalse(expired.isPaused)
        assertNull(expired.remainingTime)
        assertEquals("补证已受理", received.status)
        assertFalse(received.isPaused)
        assertNull(received.remainingTime)
    }

    @Test
    fun unavailableProjectionDoesNotInventRemainingTimeOrAnExpiryResult() {
        val unavailable = MaintenanceSupplementTimingUiModel.Unavailable
            .toPresentation(AppLanguage.English)!!

        assertEquals("Status temporarily unavailable", unavailable.status)
        assertNull(unavailable.remainingTime)
        assertTrue(unavailable.detail.contains("has not received server-confirmed remaining time"))
        assertTrue(unavailable.detail.contains("instead of deciding expiry locally"))
    }

    @Test
    fun negativeServerRemainingTimeIsRejected() {
        val result = runCatching {
            MaintenanceSupplementTimingUiModel.Paused(serverConfirmedRemainingSeconds = -1)
        }

        assertTrue(result.isFailure)
    }
}
