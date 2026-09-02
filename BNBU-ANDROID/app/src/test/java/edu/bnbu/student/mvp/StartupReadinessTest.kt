package edu.bnbu.student.mvp

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StartupReadinessTest {
    @Test
    fun keepsSystemSplashUntilEveryRealStartupConditionIsReady() {
        assertTrue(
            shouldKeepSystemSplash(
                sessionRestoreComplete = false,
                privacyConsentChecked = true,
                systemModeChecked = true,
                initialTargetReady = true
            )
        )
        assertTrue(
            shouldKeepSystemSplash(
                sessionRestoreComplete = true,
                privacyConsentChecked = false,
                systemModeChecked = true,
                initialTargetReady = true
            )
        )
        assertTrue(
            shouldKeepSystemSplash(
                sessionRestoreComplete = true,
                privacyConsentChecked = true,
                systemModeChecked = true,
                initialTargetReady = false
            )
        )
        assertTrue(
            shouldKeepSystemSplash(
                sessionRestoreComplete = true,
                privacyConsentChecked = true,
                systemModeChecked = false,
                initialTargetReady = true
            )
        )
    }

    @Test
    fun releasesSystemSplashImmediatelyWhenTheRealTargetIsReady() {
        assertFalse(
            shouldKeepSystemSplash(
                sessionRestoreComplete = true,
                privacyConsentChecked = true,
                systemModeChecked = true,
                initialTargetReady = true
            )
        )
    }
}
