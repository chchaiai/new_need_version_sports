package edu.bnbu.student.mvp.feature.shell

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import edu.bnbu.student.mvp.core.designsystem.BNBUStudentTheme
import edu.bnbu.student.mvp.core.model.AppLanguage

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun MaintenancePausedSupplementPreview() {
    BNBUStudentTheme {
        MaintenancePage(
            message = "系统维护期间暂停普通业务访问。",
            estimatedRecoveryTime = "2026-09-05 16:00（Asia/Shanghai）",
            appLanguage = AppLanguage.Chinese,
            supplementTiming = MaintenanceSupplementTimingUiModel.Paused(
                serverConfirmedRemainingSeconds = 18 * 60 * 60L + 24 * 60L
            )
        )
    }
}
