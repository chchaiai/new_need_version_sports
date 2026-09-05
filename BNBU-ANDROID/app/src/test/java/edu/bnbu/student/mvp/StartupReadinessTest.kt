package edu.bnbu.student.mvp

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
}
