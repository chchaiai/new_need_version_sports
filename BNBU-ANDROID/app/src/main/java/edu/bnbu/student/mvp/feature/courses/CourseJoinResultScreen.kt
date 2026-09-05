package edu.bnbu.student.mvp.feature.courses

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassDisabled
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUPrimaryButton
import edu.bnbu.student.mvp.core.designsystem.GridBackground
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.interfaceText

private data class JoinResultCopy(
    val title: String,
    val message: String,
    val action: String,
    val icon: ImageVector,
    val positive: Boolean = false
)

/** Standalone, server-authoritative join outcome for PAGE-STU-035. */
@Composable
internal fun CourseJoinResultScreen(
    result: CourseJoinResultUiModel,
    onDone: () -> Unit,
    onRetrySubmission: () -> Unit,
    onUseAnotherInvitation: () -> Unit,
    canOpenCourse: Boolean = true,
    isDesignReview: Boolean = false
) {
    val colors = MaterialTheme.colorScheme
    val copy = joinResultCopy(result.kind)
    val iconColor = if (copy.positive) colors.primary else colors.error
    val iconBackground = if (copy.positive) {
        colors.primaryContainer
    } else {
        colors.errorContainer
    }

    BackHandler(onBack = onDone)

    Box(modifier = Modifier.fillMaxSize()) {
        GridBackground(modifier = Modifier.fillMaxSize())
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = BNBULayout.ScreenHorizontal, vertical = BNBULayout.Space24)
                .testTag("screen.courseJoinResult"),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
        ) {
            if (isDesignReview) {
                Surface(
                    color = colors.tertiaryContainer,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.testTag("courseJoinResult.designReview")
                ) {
                    Text(
                        text = interfaceText("本地设计评审样例，不代表真实入班结果", "Local design-review sample; not a real enrollment result"),
                        color = colors.onTertiaryContainer,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }
            }

            Spacer(Modifier.height(BNBULayout.Space16))
            Surface(
                color = iconBackground,
                shape = CircleShape,
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = copy.icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }
            Text(
                text = interfaceText("入班结果", "Enrollment result"),
                color = colors.primary,
                style = MaterialTheme.typography.labelLarge
            )
            Text(
                text = copy.title,
                color = colors.onSurface,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier.testTag("courseJoinResult.title")
            )
            Text(
                text = copy.message,
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center
            )

            SwissPanel(contentPadding = BNBULayout.Space16) {
                Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                    Text(
                        text = result.course.name,
                        color = colors.onSurface,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "${result.course.teacher} · ${result.course.semester}",
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = copy.action,
                        color = if (copy.positive) colors.primary else colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            result.diagnosticId?.let { diagnosticId ->
                Text(
                    text = interfaceText("诊断编号：$diagnosticId", "Diagnostic ID: $diagnosticId"),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.testTag("courseJoinResult.diagnosticId")
                )
            }

            Spacer(Modifier.height(BNBULayout.Space8))
            when (result.kind) {
                CourseJoinResultKind.Success,
                CourseJoinResultKind.AlreadyEnrolled,
                CourseJoinResultKind.SemesterConflict,
                CourseJoinResultKind.Forbidden -> BNBUPrimaryButton(
                    title = if (canOpenCourse &&
                        (result.kind == CourseJoinResultKind.Success ||
                            result.kind == CourseJoinResultKind.AlreadyEnrolled)
                    ) {
                        interfaceText("查看课程", "View course")
                    } else {
                        interfaceText("完成", "Done")
                    },
                    modifier = Modifier.testTag("courseJoinResult.done"),
                    onClick = onDone
                )

                CourseJoinResultKind.InvitationExpired,
                CourseJoinResultKind.GracePeriodExhausted,
                CourseJoinResultKind.InvitationRevoked,
                CourseJoinResultKind.CourseClosed,
                CourseJoinResultKind.ResultUnknown -> {
                    BNBUPrimaryButton(
                        title = interfaceText("重新核对邀请", "Check another invitation"),
                        modifier = Modifier.testTag("courseJoinResult.anotherInvitation"),
                        onClick = onUseAnotherInvitation
                    )
                    AppleOutlinedButton(
                        onClick = onDone,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(BNBULayout.PrimaryControlHeight)
                            .testTag("courseJoinResult.close")
                    ) {
                        Text(interfaceText("稍后处理", "Do this later"))
                    }
                }

                CourseJoinResultKind.TechnicalFailure -> {
                    BNBUPrimaryButton(
                        title = interfaceText("返回确认页重试", "Return and retry"),
                        modifier = Modifier.testTag("courseJoinResult.retry"),
                        onClick = onRetrySubmission
                    )
                    AppleOutlinedButton(
                        onClick = onDone,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(BNBULayout.PrimaryControlHeight)
                            .testTag("courseJoinResult.close")
                    ) {
                        Text(interfaceText("稍后处理", "Do this later"))
                    }
                }
            }
        }
    }
}

@Composable
private fun joinResultCopy(kind: CourseJoinResultKind): JoinResultCopy = when (kind) {
    CourseJoinResultKind.Success -> JoinResultCopy(
        title = interfaceText("已成功加入课程", "Course joined successfully"),
        message = interfaceText("服务端已建立有效成员关系，无需等待教师审批。", "The server created an active membership. Teacher approval is not required."),
        action = interfaceText("现在可以进入课程查看规则和任务。", "You can now open the course to view its rules and tasks."),
        icon = Icons.Filled.CheckCircle,
        positive = true
    )
    CourseJoinResultKind.AlreadyEnrolled -> JoinResultCopy(
        title = interfaceText("你已经加入该课程", "You already joined this course"),
        message = interfaceText("没有创建重复的成员关系。", "No duplicate membership was created."),
        action = interfaceText("返回课程页查看现有课程。", "Return to Courses to view the existing course."),
        icon = Icons.Filled.CheckCircle,
        positive = true
    )
    CourseJoinResultKind.SemesterConflict -> JoinResultCopy(
        title = interfaceText("本学期已有体育课程", "A PE course is already active this semester"),
        message = interfaceText("同一学期只能保留一个有效教学班，本次未加入第二门课程。", "Only one active class is allowed per semester. A second course was not joined."),
        action = interfaceText("请查看当前课程，或联系课程负责人核对。", "View your current course or contact the course owner."),
        icon = Icons.Filled.Lock
    )
    CourseJoinResultKind.InvitationExpired -> JoinResultCopy(
        title = interfaceText("邀请已自然过期", "Invitation expired"),
        message = interfaceText("服务端确认该邀请已超过有效期，本次没有建立成员关系。", "The server confirmed that the invitation expired. No membership was created."),
        action = interfaceText("请向教师获取新的二维码或邀请码。", "Ask the teacher for a new QR code or invitation code."),
        icon = Icons.Filled.HourglassDisabled
    )
    CourseJoinResultKind.GracePeriodExhausted -> JoinResultCopy(
        title = interfaceText("本次宽限已耗尽", "This grace period has ended"),
        message = interfaceText("已登记流程的一次 10 分钟宽限不能刷新，本次没有建立成员关系。", "The registered flow's one 10-minute grace period cannot be refreshed. No membership was created."),
        action = interfaceText("请向教师获取新的邀请后重新开始。", "Ask the teacher for a new invitation and start again."),
        icon = Icons.Filled.HourglassDisabled
    )
    CourseJoinResultKind.InvitationRevoked -> JoinResultCopy(
        title = interfaceText("邀请已被撤销", "Invitation revoked"),
        message = interfaceText("撤销会立即终止邀请及其宽限，本次没有建立成员关系。", "Revocation immediately ends the invitation and any grace period. No membership was created."),
        action = interfaceText("请联系教师确认新的加入方式。", "Contact the teacher for a new way to join."),
        icon = Icons.Filled.Lock
    )
    CourseJoinResultKind.CourseClosed -> JoinResultCopy(
        title = interfaceText("课程暂不可加入", "Course cannot be joined"),
        message = interfaceText("入班、课程或学期状态已关闭，本次没有建立成员关系。", "Enrollment, the course, or the semester is closed. No membership was created."),
        action = interfaceText("请联系课程负责人核对当前状态。", "Contact the course owner to confirm the current status."),
        icon = Icons.Filled.Lock
    )
    CourseJoinResultKind.Forbidden -> JoinResultCopy(
        title = interfaceText("当前身份不能完成入班", "This identity cannot complete enrollment"),
        message = interfaceText("服务端拒绝了本次操作，没有建立新的成员关系。", "The server rejected this operation. No new membership was created."),
        action = interfaceText("请先完成要求的身份验证，或联系管理员核对。", "Complete the required identity verification or contact an administrator."),
        icon = Icons.Filled.Lock
    )
    CourseJoinResultKind.TechnicalFailure -> JoinResultCopy(
        title = interfaceText("暂未取得明确结果", "No confirmed result yet"),
        message = interfaceText("网络或服务暂时不可用。不要把本页当作加入成功；可返回并安全重试同一次操作。", "The network or service is temporarily unavailable. Do not treat this as success; return and safely retry the same operation."),
        action = interfaceText("输入内容已保留，重试时仍以服务端最终结果为准。", "Your input is retained. The server remains authoritative when you retry."),
        icon = Icons.Filled.Refresh
    )
    CourseJoinResultKind.ResultUnknown -> JoinResultCopy(
        title = interfaceText("入班结果待核对", "Enrollment result needs verification"),
        message = interfaceText("客户端无法安全判断结果，因此不会显示成功。", "The client cannot safely determine the outcome, so it will not show success."),
        action = interfaceText("请重新查询课程事实；若仍无法确认，请联系支持并提供诊断编号。", "Query the course facts again. If still unclear, contact support with the diagnostic ID."),
        icon = Icons.Filled.WarningAmber
    )
}
