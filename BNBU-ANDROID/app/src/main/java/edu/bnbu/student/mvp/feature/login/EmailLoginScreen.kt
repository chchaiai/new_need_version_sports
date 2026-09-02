package edu.bnbu.student.mvp.feature.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
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
import edu.bnbu.student.mvp.core.network.v1.generated.StudentSignInCodeRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
fun EmailLoginScreen(
    localStore: AndroidAppLocalStore,
    onLoginSuccess: (CurrentUserData) -> Unit,
    onBack: () -> Unit,
) {
    val api = remember(localStore) { V1StudentApi.create(localStore) }
    val intentRegistry = remember { MutationIntentRegistry() }
    val scope = rememberCoroutineScope()
    var email by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var challengeId by rememberSaveable { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var message by rememberSaveable { mutableStateOf<String?>(null) }
    var userFacingError by remember { mutableStateOf<UserFacingError?>(null) }
    var emailFocusedOnce by remember { mutableStateOf(false) }
    var emailTouched by remember { mutableStateOf(false) }
    var sendAttempted by remember { mutableStateOf(false) }
    var codeFocusedOnce by remember { mutableStateOf(false) }
    var codeTouched by remember { mutableStateOf(false) }
    var signInAttempted by remember { mutableStateOf(false) }
    val emailFocusRequester = remember { FocusRequester() }
    val codeFocusRequester = remember { FocusRequester() }

    val normalizedEmail = email.trim().lowercase()
    val emailValid = normalizedEmail.matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
    val codeValid = code.matches(Regex("^\\d{4,10}$"))
    val emailFieldError = when {
        !(emailTouched || sendAttempted) -> null
        email.isBlank() -> interfaceText("请输入学校登记邮箱。", "Enter your school-registered email.")
        !emailValid -> interfaceText("请输入有效的邮箱地址。", "Enter a valid email address.")
        else -> null
    }
    val codeFieldError = when {
        !(codeTouched || signInAttempted) -> null
        code.isBlank() -> interfaceText("请输入邮箱验证码。", "Enter the email verification code.")
        !codeValid -> interfaceText("验证码为 4–10 位数字。", "The code must contain 4–10 digits.")
        else -> null
    }
    val locale = if (AppLanguagePreferences.currentLanguage == AppLanguage.Chinese) {
        StudentSignInCodeRequest.Locale.zhMinusCN
    } else {
        StudentSignInCodeRequest.Locale.en
    }

    LaunchedEffect(challengeId, isLoading) {
        if (challengeId != null && !isLoading) codeFocusRequester.requestFocus()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp)
            .testTag("screen.emailLogin")
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.testTag("emailLogin.back")) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
            }
            Text(
                text = interfaceText("邮箱验证码登录", "Email verification sign-in"),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(20.dp))
        SwissPanel(contentPadding = 20.dp) {
            Text(
                text = interfaceText(
                    "使用学校登记的邮箱接收一次性验证码。",
                    "Use the email registered with your school to receive a one-time code."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(18.dp))
            BNBUFormField(
                value = email,
                onValueChange = {
                    email = it.take(254)
                    challengeId = null
                    code = ""
                    message = null
                    userFacingError = null
                },
                label = interfaceText("学校登记邮箱", "School-registered email"),
                testTag = "emailLogin.email",
                enabled = !isLoading,
                required = true,
                placeholder = interfaceText("请输入学校登记邮箱", "Enter the email registered with your school"),
                supportingText = interfaceText(
                    "验证码只会发送到学校系统中已登记的邮箱。",
                    "The code is sent only to the email registered by the school."
                ),
                errorText = emailFieldError,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                inputModifier = Modifier.focusRequester(emailFocusRequester),
                loading = isLoading,
                onFocusChanged = { focused ->
                    if (focused) emailFocusedOnce = true
                    else if (emailFocusedOnce) emailTouched = true
                },
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    enabled = !isLoading,
                    onClick = requestCode@{
                        sendAttempted = true
                        if (!emailValid) {
                            emailFocusRequester.requestFocus()
                            return@requestCode
                        }
                        isLoading = true
                        message = null
                        userFacingError = null
                        scope.launch {
                            val intent = intentRegistry.acquire(
                                MutationIntentScope(
                                    accountScope = "${BuildConfig.BNBU_ORGANIZATION_CODE}:$normalizedEmail",
                                    operationId = "requestStudentSignInCode",
                                    actionSlot = "email-login-code"
                                ),
                                IntentFingerprint.fromCanonicalInput(
                                    "requestStudentSignInCode",
                                    "${BuildConfig.BNBU_ORGANIZATION_CODE}\n$normalizedEmail\n${locale.value}"
                                )
                            )
                            try {
                                val challenge = api.requestSignInCode(
                                    organizationCode = BuildConfig.BNBU_ORGANIZATION_CODE,
                                    account = normalizedEmail,
                                    locale = locale,
                                    intent = intent
                                )
                                challengeId = challenge.challengeId
                                code = ""
                                sendAttempted = false
                                codeTouched = false
                                codeFocusedOnce = false
                                signInAttempted = false
                                message = interfaceText(
                                    "验证码已发送到邮箱，请在 10 分钟内输入。",
                                    "The code was sent to your email. Enter it within 10 minutes."
                                )
                                intentRegistry.complete(intent)
                            } catch (error: CancellationException) {
                                throw error
                            } catch (error: Exception) {
                                val mapped = ClientErrorMapper.map(error, ClientErrorContext.OTP)
                                userFacingError = mapped
                                SafeClientLogger.log(
                                    error = mapped,
                                    context = ClientErrorContext.OTP,
                                    httpStatus = (error as? V1HttpException)?.statusCode
                                )
                                intentRegistry.abandon(intent)
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    modifier = Modifier.testTag("emailLogin.sendCode")
                ) {
                    Text(
                        if (challengeId == null) {
                            interfaceText("发送验证码", "Send code")
                        } else {
                            interfaceText("重新发送", "Send again")
                        }
                    )
                }
            }
            if (challengeId != null) {
                Spacer(Modifier.height(8.dp))
                BNBUFormField(
                    value = code,
                    onValueChange = {
                        code = it.filter(Char::isDigit).take(10)
                        userFacingError = null
                    },
                    label = interfaceText("邮箱验证码", "Email verification code"),
                    testTag = "emailLogin.code",
                    enabled = !isLoading,
                    required = true,
                    placeholder = interfaceText("请输入邮件中的验证码", "Enter the code from the email"),
                    supportingText = interfaceText("验证码仅用于本次登录。", "This code is only for this sign-in."),
                    errorText = codeFieldError,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    inputModifier = Modifier.focusRequester(codeFocusRequester),
                    loading = isLoading,
                    onFocusChanged = { focused ->
                        if (focused) codeFocusedOnce = true
                        else if (codeFocusedOnce) codeTouched = true
                    },
                )
            }
            message?.let {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.testTag("emailLogin.message")
                )
            }
            userFacingError?.let { error ->
                Spacer(Modifier.height(12.dp))
                BNBUErrorPanel(
                    error = error,
                    onDismiss = { userFacingError = null }
                )
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = signIn@{
                    val activeChallengeId = challengeId ?: return@signIn
                    signInAttempted = true
                    if (!codeValid) {
                        codeFocusRequester.requestFocus()
                        return@signIn
                    }
                    isLoading = true
                    message = null
                    userFacingError = null
                    scope.launch {
                        val intent = intentRegistry.acquire(
                            MutationIntentScope(
                                accountScope = "${BuildConfig.BNBU_ORGANIZATION_CODE}:$normalizedEmail",
                                operationId = "verifyStudentSignInCode",
                                actionSlot = activeChallengeId
                            ),
                            IntentFingerprint.fromCanonicalInput(
                                "verifyStudentSignInCode",
                                "$activeChallengeId\n${code.trim()}"
                            )
                        )
                        try {
                            api.verifySignInCode(
                                challengeId = activeChallengeId,
                                code = code.trim(),
                                deviceId = localStore.getOrCreateInstallationId(),
                                intent = intent
                            )
                            val current = api.getCurrentUser().data
                                ?: error("CURRENT_USER_DATA_MISSING")
                            intentRegistry.complete(intent)
                            onLoginSuccess(current)
                        } catch (error: CancellationException) {
                            throw error
                        } catch (error: Exception) {
                            val mapped = ClientErrorMapper.map(error, ClientErrorContext.LOGIN)
                            userFacingError = mapped
                            SafeClientLogger.log(
                                error = mapped,
                                context = ClientErrorContext.LOGIN,
                                httpStatus = (error as? V1HttpException)?.statusCode
                            )
                            intentRegistry.abandon(intent)
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = challengeId != null && !isLoading,
                modifier = Modifier.fillMaxWidth().testTag("emailLogin.submit")
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(20.dp),
                        strokeWidth = 2.dp
                    )
                }
                Text(
                    text = if (isLoading) interfaceText("正在登录…", "Signing in…") else interfaceText("登录", "Sign in"),
                    modifier = if (isLoading) Modifier.padding(start = 8.dp) else Modifier
                )
            }
        }
    }
}

internal fun emailSignInErrorMessage(error: Throwable): String {
    return ClientErrorMapper.map(error, ClientErrorContext.LOGIN).legacySafeText()
}
