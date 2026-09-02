package edu.bnbu.student.mvp.core.model

import java.util.Locale

/**
 * Server-controlled availability policy for the student application.
 *
 * Only an explicit [NORMAL] response opens the application. Missing, retired,
 * or unknown server values fail closed to [MAINTENANCE].
 */
enum class SystemMode {
    NORMAL,
    MAINTENANCE;

    val blocksWrites: Boolean
        get() = this != NORMAL

    companion object {
        fun from(value: String?): SystemMode = when (value?.trim()?.uppercase(Locale.ROOT)) {
            "NORMAL" -> NORMAL
            "MAINTENANCE" -> MAINTENANCE
            // Missing and unsupported values, including the retired READ_ONLY
            // mode, fail closed to the only blocking mode the client supports.
            else -> MAINTENANCE
        }
    }
}

data class SystemModeStatus(
    val mode: SystemMode = SystemMode.NORMAL,
    val message: String = "",
    val estimatedRecoveryTime: String? = null,
    /** A planned-maintenance notice is supplied by the backend at least 48 hours ahead. */
    val plannedMaintenanceAt: String? = null
)
