package edu.bnbu.student.mvp.feature.shell

import edu.bnbu.student.mvp.core.model.AppLanguage

/**
 * UI-only projection of the server-authoritative supplementary-evidence timer during maintenance.
 *
 * The client must not derive one of these states from the maintenance announcement, a cached
 * deadline, or the estimated recovery time. A future Contract/Backend adapter must provide the
 * authoritative state and, for [Paused], the latest remaining duration after all maintenance
 * intervals have been deduplicated by the server.
 */
internal sealed interface MaintenanceSupplementTimingUiModel {
    data class Paused(val serverConfirmedRemainingSeconds: Long) : MaintenanceSupplementTimingUiModel {
        init {
            require(serverConfirmedRemainingSeconds >= 0) {
                "Server-confirmed remaining time cannot be negative"
            }
        }
    }

    data object NoActiveTask : MaintenanceSupplementTimingUiModel
    data object ExpiredBeforeMaintenance : MaintenanceSupplementTimingUiModel
    data object ReceivedBeforeMaintenance : MaintenanceSupplementTimingUiModel
    data object Unavailable : MaintenanceSupplementTimingUiModel
}

internal data class MaintenanceSupplementTimingPresentation(
    val title: String,
    val status: String,
    val remainingTime: String?,
    val detail: String,
    val isPaused: Boolean
)

internal fun MaintenanceSupplementTimingUiModel.toPresentation(
    language: AppLanguage
): MaintenanceSupplementTimingPresentation? = when (this) {
    is MaintenanceSupplementTimingUiModel.Paused -> MaintenanceSupplementTimingPresentation(
        title = localized("补证计时", "Supplementary evidence timing", language),
        status = localized("计时已暂停", "Timing paused", language),
        remainingTime = localized(
            "剩余时间（服务器确认）：${formatRemainingTime(serverConfirmedRemainingSeconds, AppLanguage.Chinese)}",
            "Time remaining (server confirmed): ${formatRemainingTime(serverConfirmedRemainingSeconds, AppLanguage.English)}",
            language
        ),
        detail = localized(
            "维护期间不消耗剩余时间。系统恢复 NORMAL 后将重新查询服务器，并按剩余时间继续；不会重置完整窗口或补扣维护时间。",
            "Maintenance does not consume this time. After the server restores NORMAL, the app will query again and continue from the remainder; it will not reset the full window or deduct maintenance time.",
            language
        ),
        isPaused = true
    )

    MaintenanceSupplementTimingUiModel.NoActiveTask -> null

    MaintenanceSupplementTimingUiModel.ExpiredBeforeMaintenance ->
        MaintenanceSupplementTimingPresentation(
            title = localized("补证计时", "Supplementary evidence timing", language),
            status = localized("维护前已逾期", "Expired before maintenance", language),
            remainingTime = null,
            detail = localized(
                "本次维护不会重新开放补证机会；仍以服务器记录的终结事实为准。",
                "This maintenance does not reopen the supplementary-evidence opportunity. The server-recorded final state remains authoritative.",
                language
            ),
            isPaused = false
        )

    MaintenanceSupplementTimingUiModel.ReceivedBeforeMaintenance ->
        MaintenanceSupplementTimingPresentation(
            title = localized("补证计时", "Supplementary evidence timing", language),
            status = localized("补证已受理", "Supplementary evidence received", language),
            remainingTime = null,
            detail = localized(
                "学生补证计时已经结束。等待后续处理不会造成补证逾期。",
                "The student timer has ended. Waiting for further processing will not cause a supplementary-evidence deadline miss.",
                language
            ),
            isPaused = false
        )

    MaintenanceSupplementTimingUiModel.Unavailable ->
        MaintenanceSupplementTimingPresentation(
            title = localized("补证计时", "Supplementary evidence timing", language),
            status = localized("状态暂不可确认", "Status temporarily unavailable", language),
            remainingTime = null,
            detail = localized(
                "若你有尚未结束的补证任务，维护期间计时和自动逾期均应暂停。当前客户端尚未取得服务器确认的剩余时间，恢复后将重新查询，不会在本机自行判定逾期。",
                "If you have an unfinished supplementary-evidence task, its timer and automatic expiry should be paused during maintenance. The app has not received server-confirmed remaining time and will query again after recovery instead of deciding expiry locally.",
                language
            ),
            isPaused = false
        )
}

internal fun formatRemainingTime(seconds: Long, language: AppLanguage): String {
    require(seconds >= 0) { "Remaining time cannot be negative" }
    val roundedMinutes = seconds / 60 + if (seconds % 60 == 0L) 0 else 1
    val hours = roundedMinutes / 60
    val minutes = roundedMinutes % 60
    return when {
        hours > 0 && minutes > 0 -> localized("${hours}小时${minutes}分钟", "${hours}h ${minutes}m", language)
        hours > 0 -> localized("${hours}小时", "${hours}h", language)
        else -> localized("${minutes}分钟", "${minutes}m", language)
    }
}

private fun localized(chinese: String, english: String, language: AppLanguage): String =
    if (language == AppLanguage.English) english else chinese
