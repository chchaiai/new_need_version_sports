package edu.bnbu.student.mvp

/** State of the server-authoritative system-mode check used by the startup UI gate. */
internal enum class StartupServiceState {
    CHECKING,
    READY,
    ERROR
}

/** The only three surfaces the startup host is allowed to expose. */
internal enum class StartupSurfaceState {
    LOADING,
    ERROR,
    APP
}

internal fun resolveStartupSurfaceState(
    localStartupReady: Boolean,
    serviceState: StartupServiceState
): StartupSurfaceState = when {
    !localStartupReady -> StartupSurfaceState.LOADING
    serviceState == StartupServiceState.CHECKING -> StartupSurfaceState.LOADING
    serviceState == StartupServiceState.ERROR -> StartupSurfaceState.ERROR
    else -> StartupSurfaceState.APP
}

/**
 * The Android system splash only protects the hand-off to the first Compose surface.
 * Network and session waits are represented by that surface instead of extending the
 * non-interactive system splash.
 */
internal fun shouldKeepSystemSplash(initialSurfaceReady: Boolean): Boolean =
    !initialSurfaceReady
