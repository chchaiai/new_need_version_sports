package edu.bnbu.student.mvp.feature.courses

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Keyboard
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/**
 * Dedicated invite-code entry page for students who do not have a scannable QR code.
 *
 * A valid code is resolved through the same public lookup endpoint as [ScanJoinScreen]
 * before the student can continue to [CourseJoinConfirmScreen].
 */
@Composable
fun EnterInviteCodeScreen(
    onInviteResolved: (inviteCode: String, course: CourseJoinInfo) -> Unit,
    onBack: () -> Unit,
    resolveInvite: suspend (inviteCode: String) -> CourseJoinInfo
) {
    val appLanguage = AppLanguagePreferences.currentLanguage
    var code by rememberSaveable { mutableStateOf("") }
    var isResolving by remember { mutableStateOf(false) }
    var codeFocusedOnce by rememberSaveable { mutableStateOf(false) }
    var codeTouched by rememberSaveable { mutableStateOf(false) }
    var submitAttempted by rememberSaveable { mutableStateOf(false) }
    var userFacingError by remember(appLanguage) { mutableStateOf<UserFacingError?>(null) }
    val codeFocusRequester = remember { FocusRequester() }
    val scope = rememberCoroutineScope()
    val normalizedCode = code.trim()
    val codeError = when {
        !(codeTouched || submitAttempted) -> null
        normalizedCode.isBlank() -> interfaceText(
            "请输入邀请码。",
            "Enter an invitation code."
        )
        !isInviteCode(normalizedCode) -> interfaceText(
            "邀请码格式不完整。",
            "The invitation code format is incomplete."
        )
        else -> null
    }

    fun resolveInviteCode() {
        if (isResolving) return
        submitAttempted = true
        if (!isInviteCode(normalizedCode)) {
            userFacingError = null
            codeFocusRequester.requestFocus()
            return
        }

        userFacingError = null
        isResolving = true
        scope.launch {
            try {
                onInviteResolved(normalizedCode, resolveInvite(normalizedCode))
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.JOIN)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.JOIN,
                    httpStatus = when (error) {
                        is V1HttpException -> error.statusCode
                        is ApiHttpException -> error.statusCode
                        else -> null
                    }
                )
            } finally {
                isResolving = false
            }
        }
    }

    BackHandler {
        if (!isResolving) onBack()
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .testTag("screen.courseJoin.enterCode"),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onBack,
                enabled = !isResolving,
                modifier = Modifier.testTag("courseJoin.enterCode.back")
            ) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null)
                Text(interfaceText("返回", "Back"))
            }

            Icon(
                imageVector = Icons.Filled.Keyboard,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Text(
                text = interfaceText("输入邀请码", "Enter invitation code"),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    "请输入老师提供的邀请码。查询后请核对课程名称和教师信息，再确认直接加入。",
                    "Enter the code from your teacher. Review the course name and instructor before joining directly."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.height(8.dp))
            BNBUFormField(
                value = code,
                onValueChange = {
                    code = it.take(InviteTokenMaxLength)
                    userFacingError = null
                },
                label = interfaceText("邀请码", "Invitation code"),
                testTag = "courseJoin.enterCode.input",
                enabled = !isResolving,
                loading = isResolving,
                required = true,
                placeholder = interfaceText("粘贴或扫描加入凭证", "Paste or scan the join credential"),
                supportingText = interfaceText(
                    "请输入教师当前提供的完整加入凭证。",
                    "Enter the complete current invitation provided by your teacher."
                ),
                errorText = codeError,
                inputModifier = Modifier.focusRequester(codeFocusRequester),
                onFocusChanged = { focused ->
                    if (focused) {
                        codeFocusedOnce = true
                    } else if (codeFocusedOnce) {
                        codeTouched = true
                    }
                },
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    keyboardType = KeyboardType.Ascii,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(onDone = { resolveInviteCode() })
            )
            userFacingError?.let { error ->
                BNBUErrorPanel(
                    error = error,
                    onRetry = if (error.retryable) ::resolveInviteCode else null,
                    onDismiss = { userFacingError = null },
                    modifier = Modifier.testTag("courseJoin.enterCode.error")
                )
            }
            Button(
                onClick = ::resolveInviteCode,
                enabled = !isResolving && normalizedCode.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("courseJoin.enterCode.submit")
            ) {
                if (isResolving) {
                    CircularProgressIndicator(
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier
                            .size(20.dp)
                            .testTag("courseJoin.enterCode.loading")
                    )
                } else {
                    Text(interfaceText("查询课程", "Find course"))
                }
            }
        }
    }
}
