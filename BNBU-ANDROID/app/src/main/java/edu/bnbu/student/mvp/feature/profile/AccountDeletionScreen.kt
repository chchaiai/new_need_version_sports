package edu.bnbu.student.mvp.feature.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBUPrimaryButton
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.network.v1.AccountDeletionChallenge
import edu.bnbu.student.mvp.core.network.v1.V1AccountDeletionGateway
import edu.bnbu.student.mvp.core.state.StudentAppState
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
internal fun AccountDeletionScreen(
    appState: StudentAppState,
    localStore: AndroidAppLocalStore,
    onBack: () -> Unit
) {
    BackHandler(onBack = onBack)
    val colors = MaterialTheme.colorScheme
    val scope = rememberCoroutineScope()
    val gateway = remember(localStore) { V1AccountDeletionGateway.create(localStore) }
    var challenge by remember { mutableStateOf<AccountDeletionChallenge?>(null) }
    var verificationCode by remember { mutableStateOf("") }
    var verificationCodeFocusedOnce by remember { mutableStateOf(false) }
    var verificationCodeTouched by remember { mutableStateOf(false) }
    var finalReviewAttempted by remember { mutableStateOf(false) }
    var isBusy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<UserFacingError?>(null) }
    var showChallengeConfirmation by remember { mutableStateOf(false) }
    var showFinalConfirmation by remember { mutableStateOf(false) }
    val verificationCodeFocusRequester = remember { FocusRequester() }
    val verificationCodeValid = verificationCode.matches(Regex("^\\d{4,10}$"))
    val verificationCodeError = when {
        !(verificationCodeTouched || finalReviewAttempted) -> null
        verificationCode.isBlank() -> interfaceText(
            "请输入邮箱验证码。",
            "Enter the email verification code."
        )
        !verificationCodeValid -> interfaceText(
            "验证码须为 4–10 位数字。",
            "The code must contain 4–10 digits."
        )
        else -> null
    }

    LaunchedEffect(challenge, isBusy) {
        if (challenge != null && !isBusy) {
            verificationCodeFocusRequester.requestFocus()
        }
    }

    fun presentFailure(failure: Throwable) {
        val mapped = ClientErrorMapper.map(failure, ClientErrorContext.ACCOUNT_DELETION)
        SafeClientLogger.log(mapped, ClientErrorContext.ACCOUNT_DELETION)
        error = mapped
    }

    fun createChallenge() {
        if (isBusy) return
        isBusy = true
        error = null
        scope.launch {
            try {
                challenge = gateway.createStudentChallenge(
                    expectedVersion = appState.currentUserVersion,
                    locale = if (appState.appLanguage == AppLanguage.Chinese) "zh-CN" else "en"
                )
                verificationCode = ""
                verificationCodeFocusedOnce = false
                verificationCodeTouched = false
                finalReviewAttempted = false
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Throwable) {
                presentFailure(failure)
            } finally {
                isBusy = false
            }
        }
    }

    fun confirmDeletion() {
        val activeChallenge = challenge ?: return
        if (isBusy || !verificationCode.matches(Regex("^\\d{4,10}$"))) return
        isBusy = true
        error = null
        scope.launch {
            try {
                val confirmation = gateway.confirmStudentDeletion(
                    challenge = activeChallenge,
                    verificationCode = verificationCode
                )
                // This is intentionally the only local teardown call in this flow.
                // Every failure above leaves the authenticated account untouched.
                appState.completeAccountDeletion(confirmation)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Throwable) {
                presentFailure(failure)
            } finally {
                isBusy = false
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("accountDeletion.screen"),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .bnbuClickable(
                        onClickLabel = interfaceText("返回", "Back"),
                        onClick = onBack
                    )
                    .padding(top = 12.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = null,
                    tint = colors.onSurface
                )
                Text(interfaceText("返回", "Back"), color = colors.onSurface)
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = interfaceText("注销账户", "Delete account"),
                    color = colors.error,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = interfaceText(
                        "这是不可逆的账户生命周期操作，不是普通退出登录。",
                        "This irreversible account-lifecycle action is different from signing out."
                    ),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }

        item {
            SwissPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.WarningAmber,
                            contentDescription = interfaceText("危险操作提醒", "Destructive action warning"),
                            tint = colors.error
                        )
                        Text(
                            text = interfaceText("注销后会发生什么", "What happens after deletion"),
                            color = colors.onSurface,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    DeletionFact(
                        interfaceText(
                            "账户立即停止登录，所有设备上的访问会话和刷新凭据都会失效。",
                            "Sign-in stops immediately and access/refresh sessions on every device are revoked."
                        )
                    )
                    DeletionFact(
                        interfaceText(
                            "可识别个人信息按规则删除或匿名化；必须保留的记录和审核历史会去标识化保存。",
                            "Identifying data is deleted or anonymized; required records and review history are retained without identity."
                        )
                    )
                    DeletionFact(
                        interfaceText(
                            "注销不能恢复。以后再次注册会创建新账户，不会恢复旧账户数据。",
                            "Deletion cannot be undone. Registering later creates a new account and does not restore old account data."
                        )
                    )
                    DeletionFact(
                        interfaceText(
                            "存在进行中运动或待审核记录时，后端会拒绝注销并保留当前账户。",
                            "An active exercise or pending review blocks deletion and leaves the account unchanged."
                        )
                    )
                }
            }
        }

        error?.let { currentError ->
            item {
                BNBUErrorPanel(
                    error = currentError,
                    onDismiss = { error = null }
                )
            }
        }

        if (challenge == null) {
            item {
                BNBUPrimaryButton(
                    title = interfaceText("我已了解，继续注销", "I understand, continue"),
                    onClick = { showChallengeConfirmation = true },
                    loading = isBusy,
                    modifier = Modifier.testTag("accountDeletion.begin")
                )
            }
        } else {
            item {
                val activeChallenge = requireNotNull(challenge)
                val expiry = remember(activeChallenge.expiresAt) {
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
                        .withZone(ZoneId.systemDefault())
                        .format(activeChallenge.expiresAt)
                }
                SwissPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            text = interfaceText("验证登录邮箱", "Verify your sign-in email"),
                            color = colors.onSurface,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = interfaceText(
                                "验证码已发送到当前已验证邮箱。有效期至 $expiry。",
                                "A code was sent to your verified email. It expires at $expiry."
                            ),
                            color = colors.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        BNBUFormField(
                            value = verificationCode,
                            onValueChange = { input ->
                                verificationCode = input.filter(Char::isDigit).take(10)
                                error = null
                            },
                            label = interfaceText("邮箱验证码", "Email verification code"),
                            testTag = "accountDeletion.verificationCode",
                            placeholder = interfaceText("输入 4–10 位数字", "Enter 4–10 digits"),
                            supportingText = interfaceText(
                                "验证码只用于本次注销确认，不会写入日志。",
                                "The code is used only for this deletion confirmation and is never logged."
                            ),
                            required = true,
                            enabled = !isBusy,
                            loading = isBusy,
                            errorText = verificationCodeError,
                            isSecure = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            inputModifier = Modifier.focusRequester(verificationCodeFocusRequester),
                            onFocusChanged = { focused ->
                                if (focused) {
                                    verificationCodeFocusedOnce = true
                                } else if (verificationCodeFocusedOnce) {
                                    verificationCodeTouched = true
                                }
                            }
                        )
                        BNBUPrimaryButton(
                            title = interfaceText("进入最终确认", "Continue to final confirmation"),
                            onClick = finalReview@{
                                finalReviewAttempted = true
                                if (!verificationCodeValid) {
                                    verificationCodeFocusRequester.requestFocus()
                                    return@finalReview
                                }
                                showFinalConfirmation = true
                            },
                            enabled = !isBusy,
                            loading = isBusy,
                            modifier = Modifier.testTag("accountDeletion.finalReview")
                        )
                        TextButton(
                            onClick = {
                                challenge = null
                                verificationCode = ""
                                verificationCodeFocusedOnce = false
                                verificationCodeTouched = false
                                finalReviewAttempted = false
                                error = null
                            },
                            enabled = !isBusy,
                            modifier = Modifier.testTag("accountDeletion.restart")
                        ) {
                            Text(interfaceText("重新获取验证码", "Request a new code"))
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(32.dp)) }
    }

    if (showChallengeConfirmation) {
        AlertDialog(
            onDismissRequest = { if (!isBusy) showChallengeConfirmation = false },
            title = { Text(interfaceText("确认发起账户注销？", "Start account deletion?")) },
            text = {
                Text(
                    interfaceText(
                        "下一步会向当前已验证邮箱发送验证码。此时账户尚不会被注销。",
                        "The next step sends a code to your verified email. Your account is not deleted yet."
                    )
                )
            },
            dismissButton = {
                TextButton(onClick = { showChallengeConfirmation = false }, enabled = !isBusy) {
                    Text(interfaceText("取消", "Cancel"))
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showChallengeConfirmation = false
                        createChallenge()
                    },
                    enabled = !isBusy,
                    modifier = Modifier.testTag("accountDeletion.confirmChallenge")
                ) {
                    Text(interfaceText("发送验证码", "Send code"), color = colors.error)
                }
            }
        )
    }

    if (showFinalConfirmation) {
        AlertDialog(
            onDismissRequest = { if (!isBusy) showFinalConfirmation = false },
            title = { Text(interfaceText("最终确认注销账户", "Final account-deletion confirmation")) },
            text = {
                Text(
                    interfaceText(
                        "确认后将立即执行注销并退出所有设备。这个操作无法撤销。",
                        "Confirmation immediately deletes the account and signs out every device. This cannot be undone."
                    )
                )
            },
            dismissButton = {
                TextButton(onClick = { showFinalConfirmation = false }, enabled = !isBusy) {
                    Text(interfaceText("返回检查", "Go back"))
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showFinalConfirmation = false
                        confirmDeletion()
                    },
                    enabled = !isBusy,
                    modifier = Modifier.testTag("accountDeletion.confirmFinal")
                ) {
                    Text(interfaceText("确认永久注销", "Permanently delete"), color = colors.error)
                }
            }
        )
    }
}

@Composable
private fun DeletionFact(text: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text("•", color = MaterialTheme.colorScheme.error)
        Text(
            text = text,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
