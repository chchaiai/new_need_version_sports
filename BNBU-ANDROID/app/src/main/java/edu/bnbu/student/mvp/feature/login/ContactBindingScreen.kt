package edu.bnbu.student.mvp.feature.login

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUPrimaryButton
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.network.v1.IntentFingerprint
import edu.bnbu.student.mvp.core.network.v1.MutationIntentRegistry
import edu.bnbu.student.mvp.core.network.v1.MutationIntentScope
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1StudentApi
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import edu.bnbu.student.mvp.core.network.v1.generated.EmailVerificationChallengeAccepted
import edu.bnbu.student.mvp.core.network.v1.generated.EmailVerificationChallengeRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class ContactBindingMode {
    RequiredActivation,
    ManageContacts
}

private enum class EmailFlowState {
    Idle,
    Sending,
    CodeSent,
    Verifying,
    Success,
    ActivationPending,
    Error,
}

@Composable
fun ContactBindingScreen(
    mode: ContactBindingMode,
    localStore: AndroidAppLocalStore,
    currentEmailMasked: String?,
    currentEmailVerified: Boolean,
    expectedUserVersion: Long,
    onCurrentUserUpdated: (CurrentUserData) -> Unit,
    onBindingComplete: () -> Unit,
    onBack: () -> Unit = {},
    onLogout: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
    onOpenHelp: () -> Unit = {},
    activationLoading: Boolean = false,
    activationError: String? = null,
    onRetryActivation: () -> Unit = {},
) {
    BackHandler(enabled = mode == ContactBindingMode.RequiredActivation) {
        // Mandatory activation must never reveal the authenticated shell below.
    }

    val api = remember(localStore) { V1StudentApi.create(localStore) }
    val registry = remember { MutationIntentRegistry() }
    val coroutineScope = rememberCoroutineScope()
    val currentCodeFocusRequester = remember { FocusRequester() }
    val newCodeFocusRequester = remember { FocusRequester() }
    val colors = MaterialTheme.colorScheme

    var email by rememberSaveable { mutableStateOf("") }
    var requestedEmail by rememberSaveable { mutableStateOf("") }
    var challengeId by rememberSaveable { mutableStateOf<String?>(null) }
    var challengeMode by rememberSaveable { mutableStateOf<String?>(null) }
    var challengeExpiresAtMillis by rememberSaveable { mutableStateOf<Long?>(null) }
    var currentCode by rememberSaveable { mutableStateOf("") }
    var newCode by rememberSaveable { mutableStateOf("") }
    var flowState by rememberSaveable { mutableStateOf(EmailFlowState.Idle) }
    var errorMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var userFacingError by remember { mutableStateOf<UserFacingError?>(null) }
    var resendAttempt by rememberSaveable { mutableIntStateOf(0) }
    var resendBlockedSeconds by rememberSaveable { mutableIntStateOf(0) }
    var nowMillis by remember { mutableLongStateOf(System.currentTimeMillis()) }

    val normalizedEmail = email.trim().lowercase()
    val emailValid = normalizedEmail.matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
    val requiresCurrentCode = challengeMode == EmailVerificationChallengeAccepted.Mode.REBIND.value
    val currentCodeValid = !requiresCurrentCode || currentCode.matches(Regex("^\\d{4,10}$"))
    val newCodeValid = newCode.matches(Regex("^\\d{4,10}$"))
    val expiresAt = challengeExpiresAtMillis
    val expirySeconds = expiresAt?.let {
        (((it - nowMillis).coerceAtLeast(0L)) + 999L) / 1_000L
    } ?: 0L
    val challengeExpired = challengeId != null && expirySeconds <= 0L
    val sending = flowState == EmailFlowState.Sending
    val verifying = flowState == EmailFlowState.Verifying
    val locale = if (AppLanguagePreferences.currentLanguage == AppLanguage.Chinese) {
        EmailVerificationChallengeRequest.Locale.zhMinusCN
    } else {
        EmailVerificationChallengeRequest.Locale.en
    }

    LaunchedEffect(challengeExpiresAtMillis) {
        while (challengeExpiresAtMillis != null) {
            nowMillis = System.currentTimeMillis()
            if (nowMillis >= requireNotNull(challengeExpiresAtMillis)) break
            delay(1_000)
        }
    }
    LaunchedEffect(resendBlockedSeconds) {
        if (resendBlockedSeconds > 0) {
            delay(1_000)
            resendBlockedSeconds = (resendBlockedSeconds - 1).coerceAtLeast(0)
        }
    }
    LaunchedEffect(challengeId) {
        if (challengeId != null) {
            if (requiresCurrentCode) currentCodeFocusRequester.requestFocus()
            else newCodeFocusRequester.requestFocus()
        }
    }
    LaunchedEffect(activationLoading, activationError) {
        flowState = when {
            activationLoading -> EmailFlowState.ActivationPending
            !activationError.isNullOrBlank() -> EmailFlowState.Error
            else -> flowState
        }
    }

    fun clearChallenge() {
        requestedEmail = ""
        challengeId = null
        challengeMode = null
        challengeExpiresAtMillis = null
        currentCode = ""
        newCode = ""
        errorMessage = null
        userFacingError = null
        resendBlockedSeconds = 0
        flowState = EmailFlowState.Idle
    }

    fun requestCode() {
        if (!emailValid || sending || verifying || expectedUserVersion <= 0 || resendBlockedSeconds > 0) return
        val attempt = resendAttempt
        flowState = EmailFlowState.Sending
        errorMessage = null
        userFacingError = null
        coroutineScope.launch {
            val intent = registry.acquire(
                MutationIntentScope(
                    accountScope = "email-security",
                    operationId = "requestCurrentUserEmailChallenge",
                    actionSlot = "$normalizedEmail:$attempt"
                ),
                IntentFingerprint.fromCanonicalInput(
                    "requestCurrentUserEmailChallenge",
                    "$normalizedEmail\n$expectedUserVersion\n${locale.value}\n$attempt"
                )
            )
            try {
                val challenge = api.requestEmailVerificationChallenge(
                    email = normalizedEmail,
                    locale = locale,
                    expectedVersion = expectedUserVersion,
                    intent = intent
                )
                registry.complete(intent)
                requestedEmail = normalizedEmail
                challengeId = challenge.challengeId
                challengeMode = challenge.mode.value
                challengeExpiresAtMillis = challenge.expiresAt.toEpochMilli()
                currentCode = ""
                newCode = ""
                resendAttempt += 1
                flowState = EmailFlowState.CodeSent
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                registry.abandon(intent)
                resendBlockedSeconds = error.retryAfterSeconds() ?: 0
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.OTP)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.OTP,
                    httpStatus = (error as? V1HttpException)?.statusCode
                )
                flowState = EmailFlowState.Error
            }
        }
    }

    fun verifyCode() {
        val activeChallengeId = challengeId ?: return
        if (!currentCodeValid || !newCodeValid || challengeExpired || sending || verifying) return
        flowState = EmailFlowState.Verifying
        errorMessage = null
        userFacingError = null
        coroutineScope.launch {
            val intent = registry.acquire(
                MutationIntentScope(
                    accountScope = "email-security",
                    operationId = "verifyCurrentUserEmailChallenge",
                    actionSlot = activeChallengeId
                ),
                IntentFingerprint.fromCanonicalInput(
                    "verifyCurrentUserEmailChallenge",
                    "$activeChallengeId\n$currentCode\n$newCode"
                )
            )
            try {
                val current = api.verifyEmailChallenge(
                    challengeId = activeChallengeId,
                    newEmailCode = newCode,
                    currentEmailCode = currentCode.takeIf { requiresCurrentCode },
                    intent = intent
                ).data ?: error("CURRENT_USER_DATA_MISSING")
                registry.complete(intent)
                flowState = EmailFlowState.Success
                onCurrentUserUpdated(current)
                onBindingComplete()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                registry.abandon(intent)
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.OTP)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.OTP,
                    httpStatus = (error as? V1HttpException)?.statusCode
                )
                flowState = EmailFlowState.Error
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .testTag("screen.emailSecurity")
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = BNBULayout.ScreenHorizontal, vertical = BNBULayout.Space16),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space20)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
            ) {
                if (mode == ContactBindingMode.ManageContacts) {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("emailSecurity.back")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = interfaceText("返回", "Back"))
                    }
                }
                Text(
                    text = if (mode == ContactBindingMode.RequiredActivation) {
                        interfaceText("验证邮箱", "Verify email")
                    } else {
                        interfaceText("修改邮箱", "Change email")
                    },
                    color = colors.onSurface,
                    style = MaterialTheme.typography.headlineMedium
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                Text(
                    text = if (currentEmailVerified) {
                        interfaceText(
                            "修改邮箱时，需要验证当前邮箱和新邮箱。",
                            "Changing your email requires codes from both addresses."
                        )
                    } else {
                        interfaceText(
                            "绑定学校登记邮箱，用于身份验证和邮箱验证码登录。业务提醒只在站内通知中心查看。",
                            "Bind the email registered with your school for identity verification and email-code sign-in. Business reminders appear only in the in-app notification centre."
                        )
                    },
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = if (currentEmailVerified) {
                        currentEmailMasked.orEmpty().ifBlank {
                            interfaceText("当前邮箱已验证", "Current email verified")
                        }.let { currentEmail ->
                            interfaceText("当前邮箱：$currentEmail", "Current email: $currentEmail")
                        }
                    } else {
                        interfaceText("尚未验证邮箱", "Email not verified")
                    },
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            BNBUFormField(
                value = email,
                onValueChange = {
                    email = it.take(254)
                    clearChallenge()
                },
                label = if (currentEmailVerified) {
                    interfaceText("新邮箱", "New email")
                } else {
                    interfaceText("邮箱", "Email")
                },
                placeholder = interfaceText(
                    if (currentEmailVerified) "请输入新的学校登记邮箱" else "请输入学校登记邮箱",
                    if (currentEmailVerified) {
                        "Enter your new school-registered email"
                    } else {
                        "Enter the email registered with your school"
                    }
                ),
                supportingText = if (currentEmailVerified) {
                    interfaceText(
                        "验证码将分别发送到当前邮箱和新邮箱。",
                        "Codes will be sent separately to your current and new email addresses."
                    )
                } else {
                    interfaceText("请输入学校登记邮箱", "Enter the email registered with your school")
                },
                errorText = if (email.isNotBlank() && !emailValid) {
                    interfaceText("请输入有效的邮箱地址。", "Enter a valid email address.")
                } else {
                    null
                },
                required = true,
                enabled = !sending && !verifying,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = if (challengeId == null) ImeAction.Done else ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onDone = { requestCode() },
                    onNext = {
                        if (requiresCurrentCode) currentCodeFocusRequester.requestFocus()
                        else newCodeFocusRequester.requestFocus()
                    }
                ),
                testTag = "emailSecurity.newEmail"
            )

            if (challengeId == null) {
                BNBUPrimaryButton(
                    title = if (sending) {
                        interfaceText("正在发送…", "Sending…")
                    } else {
                        interfaceText("发送验证码", "Send verification code")
                    },
                    enabled = emailValid && expectedUserVersion > 0,
                    loading = sending,
                    modifier = Modifier.testTag("emailSecurity.sendCode"),
                    onClick = ::requestCode
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                    Text(
                        text = if (requiresCurrentCode) {
                            interfaceText(
                                "验证码已发送到当前邮箱和 $requestedEmail",
                                "Codes were sent to your current email and $requestedEmail"
                            )
                        } else {
                            interfaceText(
                                "验证码已发送到 $requestedEmail",
                                "Code sent to $requestedEmail"
                            )
                        },
                        color = colors.onSurface,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.testTag("emailSecurity.deliveryStatus")
                    )
                    Text(
                        text = if (challengeExpired) {
                            interfaceText("验证码已过期，请重新发送。", "The code expired. Send a new one.")
                        } else {
                            interfaceText(
                                "验证码 ${formatDuration(expirySeconds)} 后失效",
                                "Code expires in ${formatDuration(expirySeconds)}"
                            )
                        },
                        color = if (challengeExpired) colors.error else colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.testTag("emailSecurity.expiry")
                    )
                }

                if (requiresCurrentCode) {
                    BNBUFormField(
                        value = currentCode,
                        onValueChange = {
                            currentCode = it.filter(Char::isDigit).take(10)
                            errorMessage = null
                            userFacingError = null
                        },
                        label = interfaceText("当前邮箱验证码", "Current-email code"),
                        placeholder = interfaceText("输入验证码", "Enter code"),
                        errorText = if (currentCode.isNotBlank() && !currentCodeValid) {
                            interfaceText("验证码为 4–10 位数字。", "The code must contain 4–10 digits.")
                        } else {
                            null
                        },
                        required = true,
                        enabled = !sending && !verifying,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.NumberPassword,
                            imeAction = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { newCodeFocusRequester.requestFocus() }
                        ),
                        inputModifier = Modifier.focusRequester(currentCodeFocusRequester),
                        testTag = "emailSecurity.currentCode"
                    )
                }

                BNBUFormField(
                    value = newCode,
                    onValueChange = {
                        newCode = it.filter(Char::isDigit).take(10)
                        errorMessage = null
                        userFacingError = null
                    },
                    label = if (requiresCurrentCode) {
                        interfaceText("新邮箱验证码", "New-email code")
                    } else {
                        interfaceText("邮箱验证码", "Email code")
                    },
                    placeholder = interfaceText("输入验证码", "Enter code"),
                    errorText = if (newCode.isNotBlank() && !newCodeValid) {
                        interfaceText("验证码为 4–10 位数字。", "The code must contain 4–10 digits.")
                    } else {
                        null
                    },
                    required = true,
                    enabled = !sending && !verifying,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.NumberPassword,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { verifyCode() }),
                    inputModifier = Modifier.focusRequester(newCodeFocusRequester),
                    testTag = "emailSecurity.newCode"
                )

                BNBUPrimaryButton(
                    title = if (verifying) {
                        interfaceText("正在验证…", "Verifying…")
                    } else {
                        interfaceText("验证并继续", "Verify and continue")
                    },
                    enabled = currentCodeValid && newCodeValid && !challengeExpired,
                    loading = verifying,
                    modifier = Modifier.testTag("emailSecurity.verify"),
                    onClick = ::verifyCode
                )

                TextButton(
                    enabled = !sending && !verifying && resendBlockedSeconds == 0,
                    onClick = ::requestCode,
                    colors = ButtonDefaults.textButtonColors(contentColor = colors.onSurfaceVariant),
                    modifier = Modifier.testTag("emailSecurity.resend")
                ) {
                    Text(
                        text = if (resendBlockedSeconds > 0) {
                            interfaceText(
                                "重新发送 ${resendBlockedSeconds}s",
                                "Resend in ${resendBlockedSeconds}s"
                            )
                        } else {
                            interfaceText("重新发送验证码", "Resend verification code")
                        },
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            errorMessage?.let {
                Text(
                    text = it,
                    color = colors.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.testTag("emailSecurity.message")
                )
            }
            userFacingError?.let { error ->
                BNBUErrorPanel(
                    error = error,
                    onDismiss = { userFacingError = null }
                )
            }

            when {
                activationLoading -> {
                    Text(
                        text = interfaceText(
                            "邮箱验证成功，正在准备账户…",
                            "Email verified. Preparing your account…"
                        ),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.testTag("emailSecurity.activationLoading")
                    )
                }
                !activationError.isNullOrBlank() -> {
                    Text(
                        text = activationError,
                        color = colors.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.testTag("emailSecurity.activationError")
                    )
                    TextButton(onClick = onRetryActivation, modifier = Modifier.testTag("emailSecurity.retryActivation")) {
                        Text(interfaceText("重试", "Retry"))
                    }
                }
                flowState == EmailFlowState.Success -> Text(
                    text = interfaceText("邮箱验证成功。", "Email verified."),
                    color = colors.tertiary,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.testTag("emailSecurity.success")
                )
                else -> Unit
            }
        }

        if (mode == ContactBindingMode.RequiredActivation) {
            RequiredActivationFooter(
                onOpenHelp = onOpenHelp,
                onOpenPrivacy = onOpenPrivacy,
                onLogout = onLogout,
            )
        }
    }
}

@Composable
private fun RequiredActivationFooter(
    onOpenHelp: () -> Unit,
    onOpenPrivacy: () -> Unit,
    onLogout: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = BNBULayout.ScreenHorizontal, vertical = BNBULayout.Space12),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space4)
    ) {
        HorizontalDivider(color = colors.outlineVariant)
        TextButton(
            onClick = onOpenHelp,
            colors = ButtonDefaults.textButtonColors(contentColor = colors.onSurfaceVariant),
            modifier = Modifier.testTag("emailSecurity.help")
        ) {
            Text(
                text = interfaceText("邮箱遇到问题？查看学校核验说明", "Email problem? View school verification guidance"),
                style = MaterialTheme.typography.bodySmall
            )
        }
        Text(
            text = interfaceText(
                "继续即表示你已阅读《隐私政策》",
                "By continuing, you acknowledge the Privacy Policy"
            ),
            modifier = Modifier
                .clickable(role = Role.Button, onClick = onOpenPrivacy)
                .padding(horizontal = BNBULayout.Space8, vertical = BNBULayout.Space8)
                .testTag("emailSecurity.privacy"),
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center
        )
        TextButton(
            onClick = onLogout,
            colors = ButtonDefaults.textButtonColors(contentColor = colors.error.copy(alpha = 0.82f)),
            modifier = Modifier.testTag("emailSecurity.logout")
        ) {
            Text(
                text = interfaceText("退出当前账号", "Sign out of this account"),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
fun ContactActivationHelpScreen(onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(BNBULayout.ScreenHorizontal),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = interfaceText("返回", "Back"))
        }
        Text(
            text = interfaceText("邮箱无法使用", "Email unavailable"),
            color = colors.onSurface,
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = interfaceText(
                "学生端没有手机号、短信验证码或自助账户恢复入口。请联系学校体育教学部门或账户管理员完成身份核验，并按学校流程处理登录邮箱；本页面不会直接改绑。",
                "The student client has no phone, SMS-code, or self-service account-recovery flow. Contact the school sports office or account administrator for identity verification and follow the school's email-recovery process; this page cannot change the address."
            ),
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}

private fun formatDuration(totalSeconds: Long): String {
    val safe = totalSeconds.coerceAtLeast(0L)
    val minutes = safe / 60
    val seconds = safe % 60
    return "%02d:%02d".format(minutes, seconds)
}

private fun Exception.retryAfterSeconds(): Int? {
    val httpError = this as? V1HttpException ?: return null
    return runCatching {
        httpError.error.details
            .takeIf { it.isJsonObject }
            ?.asJsonObject
            ?.get("retryAfterSeconds")
            ?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }
            ?.asInt
    }.getOrNull()?.takeIf { it > 0 }
}
