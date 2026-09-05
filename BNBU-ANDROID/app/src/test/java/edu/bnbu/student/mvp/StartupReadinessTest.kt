package edu.bnbu.student.mvp

import edu.bnbu.student.mvp.core.model.SystemMode
import edu.bnbu.student.mvp.core.model.SystemModeStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StartupReadinessTest {
    @Test
    fun systemSplashOnlyWaitsForTheFirstVisibleComposeSurface() {
        assertTrue(shouldKeepSystemSplash(initialSurfaceReady = false))
        assertFalse(shouldKeepSystemSplash(initialSurfaceReady = true))
    }

    @Test
    fun startupSurfaceShowsLoadingUntilLocalAndServiceChecksAreReady() {
        assertEquals(
            StartupSurfaceState.LOADING,
            resolveStartupSurfaceState(
                localStartupReady = false,
                serviceState = StartupServiceState.READY
            )
        )
        assertEquals(
            StartupSurfaceState.LOADING,
            resolveStartupSurfaceState(
                localStartupReady = true,
                serviceState = StartupServiceState.CHECKING
            )
        )
    }

    @Test
    fun startupSurfaceExposesFailureInsteadOfOpeningNormalMode() {
        assertEquals(
            StartupSurfaceState.ERROR,
            resolveStartupSurfaceState(
                localStartupReady = true,
                serviceState = StartupServiceState.ERROR
            )
        )
        assertEquals(
            StartupSurfaceState.LOADING,
            resolveStartupSurfaceState(
                localStartupReady = false,
                serviceState = StartupServiceState.ERROR
            )
        )
    }

    @Test
    fun appOpensOnlyAfterEveryStartupGateIsReady() {
        assertEquals(
            StartupSurfaceState.APP,
            resolveStartupSurfaceState(
                localStartupReady = true,
                serviceState = StartupServiceState.READY
            )
        )
    }

    @Test
    fun normalRefreshFailurePreservesTheLastConfirmedModeAcrossRepeatedFailures() {
        val confirmedNormal = SystemModeStatus(
            mode = SystemMode.NORMAL,
            message = "Server-confirmed normal"
        )

        val firstFailure = resolveSystemModeRefresh(
            lastConfirmedStatus = confirmedNormal,
            refreshedStatus = null
        )
        val repeatedFailure = resolveSystemModeRefresh(
            lastConfirmedStatus = firstFailure.confirmedStatus,
            refreshedStatus = null
        )

        assertEquals(confirmedNormal, firstFailure.confirmedStatus)
        assertEquals(confirmedNormal, repeatedFailure.confirmedStatus)
        assertEquals(
            SystemModeConnectionState.REFRESH_UNAVAILABLE,
            repeatedFailure.connectionState
        )
    }

    @Test
    fun successfulRefreshCanEnterServerConfirmedMaintenance() {
        val confirmedNormal = SystemModeStatus(mode = SystemMode.NORMAL)
        val serverMaintenance = SystemModeStatus(
            mode = SystemMode.MAINTENANCE,
            message = "Scheduled maintenance"
        )

        val result = resolveSystemModeRefresh(
            lastConfirmedStatus = confirmedNormal,
            refreshedStatus = serverMaintenance
        )

        assertEquals(serverMaintenance, result.confirmedStatus)
        assertEquals(SystemModeConnectionState.CONFIRMED, result.connectionState)
    }

    @Test
    fun maintenanceRefreshFailurePreservesTheConfirmedMaintenanceFact() {
        val confirmedMaintenance = SystemModeStatus(
            mode = SystemMode.MAINTENANCE,
            message = "Server-confirmed maintenance"
        )

        val result = resolveSystemModeRefresh(
            lastConfirmedStatus = confirmedMaintenance,
            refreshedStatus = null
        )

        assertEquals(confirmedMaintenance, result.confirmedStatus)
        assertEquals(
            SystemModeConnectionState.REFRESH_UNAVAILABLE,
            result.connectionState
        )
    }

    @Test
    fun recoveredRefreshClearsTheConnectionErrorAndUsesTheLatestServerMode() {
        val staleMaintenance = SystemModeStatus(mode = SystemMode.MAINTENANCE)
        val refreshFailure = resolveSystemModeRefresh(staleMaintenance, refreshedStatus = null)
        val recoveredNormal = SystemModeStatus(mode = SystemMode.NORMAL)

        val recovered = resolveSystemModeRefresh(
            lastConfirmedStatus = refreshFailure.confirmedStatus,
            refreshedStatus = recoveredNormal
        )

        assertEquals(recoveredNormal, recovered.confirmedStatus)
        assertEquals(SystemModeConnectionState.CONFIRMED, recovered.connectionState)
    }
}
