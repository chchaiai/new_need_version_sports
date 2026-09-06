package edu.bnbu.student.mvp

import edu.bnbu.student.mvp.core.model.SystemModeStatus

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

/**
 * Connectivity of the periodic system-mode refresh. This is deliberately separate from
 * [SystemModeStatus]: a transport failure is not a server-authoritative maintenance decision.
 */
internal enum class SystemModeConnectionState {
    CONFIRMED,
    REFRESH_UNAVAILABLE
}

internal data class SystemModeRefreshResolution(
    val confirmedStatus: SystemModeStatus,
    val connectionState: SystemModeConnectionState
)

/**
 * Applies a successful server response, or preserves the last confirmed business mode when the
 * refresh cannot reach the service. In particular, a network error must never manufacture a
 * maintenance state or a supplementary-evidence timing promise.
 */
internal fun resolveSystemModeRefresh(
    lastConfirmedStatus: SystemModeStatus,
    refreshedStatus: SystemModeStatus?
): SystemModeRefreshResolution = if (refreshedStatus == null) {
    SystemModeRefreshResolution(
        confirmedStatus = lastConfirmedStatus,
        connectionState = SystemModeConnectionState.REFRESH_UNAVAILABLE
    )
} else {
    SystemModeRefreshResolution(
        confirmedStatus = refreshedStatus,
        connectionState = SystemModeConnectionState.CONFIRMED
    )
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
