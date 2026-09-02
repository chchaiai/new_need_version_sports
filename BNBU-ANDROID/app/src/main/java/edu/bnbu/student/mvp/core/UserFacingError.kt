package edu.bnbu.student.mvp.core.error

import android.util.Log
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.exercise.ExerciseVersionConflictException
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.ExerciseMediaObjectUploadException
import edu.bnbu.student.mvp.core.network.v1.ExerciseMediaStorageErrorCode
import edu.bnbu.student.mvp.core.network.v1.ExerciseSessionClientContextMissingException
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import java.net.SocketTimeoutException
import java.time.OffsetDateTime
import java.io.IOException

/** The feature that was active when a safe, user-facing error was created. */
internal enum class ClientErrorContext {
    LOGIN,
    OTP,
    JOIN,
    SESSION,
    MEDIA,
    RECORD,
    REVIEW,
    EXEMPTION,
    ACCOUNT_DELETION,
    GENERAL
}

/**
 * A presentation model containing local, reviewed copy only.
 *
 * Backend `message`, exception messages and localized descriptions must never
 * be copied into this model. [code] and [requestId] are sanitized before use.
 */
internal data class UserFacingError(
    val code: String,
    val title: String,
    val message: String,
    val action: String,
    val requestId: String?,
    val retryable: Boolean,
    val fieldErrors: List<UserFacingFieldError> = emptyList()
) {
    fun legacySafeText(): String = buildString {
        append(title)
        append('\n')
        append(message)
        if (action.isNotBlank()) {
            append('\n')
            append(action)
        }
        append('\n')
        append(
            interfaceText(
                "诊断编号：${requestId ?: "暂不可用"}",
                "Diagnostic ID: ${requestId ?: "unavailable"}"
            )
        )
    }
}

internal data class UserFacingFieldError(
    val field: String,
    val code: String,
    val label: String,
    val message: String
)

/**
 * Strongly typed extraction of the small public allowlist in error `details`.
 * Arbitrary values, backend messages, i18n keys and params are never retained.
 */
internal data class SafeErrorDetails(
    val retryable: Boolean?,
    val retryAfterSeconds: Long?,
    val fieldErrors: List<SafeFieldError>,
    val currentState: String?,
    val expectedVersion: Long?,
    val actualVersion: Long?,
    val startedAt: String?,
    val status: String?,
    val startedOnCurrentAuthSession: Boolean?
) {
    internal data class SafeFieldError(val field: String, val code: String)

    companion object {
        fun from(element: JsonElement?): SafeErrorDetails {
            val objectValue = element
                ?.takeIf(JsonElement::isJsonObject)
                ?.asJsonObject
            if (objectValue == null) return empty()

            val fields = objectValue.get("fieldErrors")
                ?.takeIf(JsonElement::isJsonArray)
                ?.asJsonArray
                ?.asSequence()
                ?.take(MAX_FIELD_ERRORS)
                ?.mapNotNull { item ->
                    val fieldObject = item.takeIf(JsonElement::isJsonObject)?.asJsonObject
                        ?: return@mapNotNull null
                    val field = fieldObject.safeString("field")
                        ?.takeIf(SAFE_FIELD_PATH::matches)
                        ?: return@mapNotNull null
                    val code = fieldObject.safeString("code")
                        ?.let(::sanitizeCode)
                        ?.takeUnless { it == UNKNOWN_CODE }
                        ?: return@mapNotNull null
                    SafeFieldError(field = field, code = code)
                }
                ?.toList()
                .orEmpty()

            return SafeErrorDetails(
                retryable = objectValue.safeBoolean("retryable"),
                retryAfterSeconds = objectValue.safeLong("retryAfterSeconds")
                    ?.takeIf { it in 0..MAX_RETRY_AFTER_SECONDS },
                fieldErrors = fields,
                currentState = objectValue.safeString("currentState")
                    ?.let(::sanitizeCode)
                    ?.takeUnless { it == UNKNOWN_CODE },
                expectedVersion = objectValue.safeLong("expectedVersion")?.takeIf { it >= 0 },
                actualVersion = objectValue.safeLong("actualVersion")?.takeIf { it >= 0 },
                startedAt = objectValue.safeString("startedAt")
                    ?.takeIf { value ->
                        value.length <= MAX_DATE_TIME_LENGTH &&
                            runCatching { OffsetDateTime.parse(value) }.isSuccess
                    },
                status = objectValue.safeString("status")
                    ?.let(::sanitizeCode)
                    ?.takeUnless { it == UNKNOWN_CODE },
                startedOnCurrentAuthSession = objectValue.safeBoolean(
                    "startedOnCurrentAuthSession"
                )
            )
        }

        private fun empty() = SafeErrorDetails(
            retryable = null,
            retryAfterSeconds = null,
            fieldErrors = emptyList(),
            currentState = null,
            expectedVersion = null,
            actualVersion = null,
            startedAt = null,
            status = null,
            startedOnCurrentAuthSession = null
        )
    }
}

internal object ClientErrorMapper {
    /** Returns only a syntactically valid contract code; never parses a message string. */
    fun safeCode(error: Throwable): String? = when (error) {
        is V1HttpException -> sanitizeCode(error.error.code.value)
            .takeUnless { it == UNKNOWN_CODE }
        is ApiHttpException -> legacySafeCode(error.responseBody)
        else -> null
    }

    fun map(error: Throwable, context: ClientErrorContext): UserFacingError = when (error) {
        is V1HttpException -> mapHttp(error, context)
        is ApiHttpException -> mapStatusOnlyHttp(
            statusCode = error.statusCode,
            context = context,
            safeCode = legacySafeCode(error.responseBody)
        )
        is V1NetworkException -> mapNetwork(error)
        is V1ProtocolException -> UserFacingError(
            code = "CLIENT_CONTRACT_MISMATCH",
            title = interfaceText("暂时无法读取服务响应", "Could not read the service response"),
            message = interfaceText(
                "服务返回的数据不符合接口约定。",
                "The service response did not match the current API contract."
            ),
            action = interfaceText("请稍后重试；若持续发生，请联系支持。", "Try again later. Contact support if it continues."),
            requestId = sanitizeRequestId(error.requestId),
            retryable = true
        )
        is ExerciseMediaObjectUploadException -> mapStorageUpload(error)
        is ExerciseSessionClientContextMissingException -> UserFacingError(
            code = "SESSION_CLIENT_CONTEXT_MISSING",
            title = interfaceText("无法在此设备恢复运动", "Could not restore exercise on this device"),
            message = interfaceText(
                "此设备缺少该运动的安全上下文，应用没有猜测或覆盖服务端数据。",
                "This device does not have the safe context for that exercise, so the app did not guess or overwrite server data."
            ),
            action = interfaceText("请回到原设备继续，或返回首页。", "Continue on the original device, or return home."),
            requestId = sanitizeRequestId(error.requestId),
            retryable = false
        )
        is ExerciseVersionConflictException -> stateConflict(context, requestId = null)
        is SocketTimeoutException -> networkError(timeout = true, requestId = null)
        is IOException -> networkError(timeout = error.hasCause<SocketTimeoutException>(), requestId = null)
        else -> defaultFor(context, requestId = null)
    }

    fun protocolMismatch(context: ClientErrorContext): UserFacingError = UserFacingError(
        code = "CLIENT_CONTRACT_MISMATCH",
        title = contextTitle(context),
        message = interfaceText(
            "服务返回的状态暂时无法识别，应用已保留最后确认的数据。",
            "The service returned an unrecognized state. The app retained the last confirmed data."
        ),
        action = interfaceText("请稍后刷新；若持续发生，请联系支持。", "Refresh later. Contact support if it continues."),
        requestId = null,
        retryable = true
    )

    private fun mapHttp(error: V1HttpException, context: ClientErrorContext): UserFacingError {
        val code = sanitizeCode(error.error.code.value)
        val details = SafeErrorDetails.from(error.error.details)
        val requestId = sanitizeRequestId(error.error.requestId)
        val fieldErrors = details.fieldErrors.map(::toUserFacingFieldError)
        val inferredRetryable = details.retryable
            ?: details.retryAfterSeconds?.let { true }
            ?: error.statusCode.isRetryableStatus()

        joinCodeError(code, requestId, fieldErrors)?.let { return it }

        return when {
            code == "ACCOUNT_DELETION_ACTIVE_SESSION" -> UserFacingError(
                code = code,
                title = interfaceText("暂时无法注销账户", "Account cannot be deleted yet"),
                message = interfaceText(
                    "账号还有一条正在进行中的运动。注销没有执行，当前数据未改变。",
                    "An exercise is still active. Deletion was not performed and current data was not changed."
                ),
                action = interfaceText("请先结束或明确放弃该运动，再重新发起注销。", "Finish or explicitly discard that exercise, then start deletion again."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code == "ACCOUNT_DELETION_PENDING_REVIEW" -> UserFacingError(
                code = code,
                title = interfaceText("暂时无法注销账户", "Account cannot be deleted yet"),
                message = interfaceText(
                    "账号仍有等待审核的业务记录。注销没有执行，当前数据未改变。",
                    "This account still has a record waiting for review. Deletion was not performed and current data was not changed."
                ),
                action = interfaceText("请等待审核完成后重新发起注销。", "Wait for the review to finish, then start deletion again."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code == "ACCOUNT_DELETION_REAUTH_REQUIRED" -> UserFacingError(
                code = code,
                title = interfaceText("需要重新验证身份", "Identity verification required"),
                message = interfaceText(
                    "本次注销验证已失效，账户没有被注销。",
                    "This deletion verification is no longer valid. The account was not deleted."
                ),
                action = interfaceText("请重新登录后再次发起注销。", "Sign in again and restart account deletion."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code in setOf(
                "ACCOUNT_DELETION_CHALLENGE_EXPIRED",
                "ACCOUNT_DELETION_VERIFICATION_CODE_INVALID"
            ) -> UserFacingError(
                code = code,
                title = interfaceText("注销验证码无效", "Invalid account-deletion code"),
                message = interfaceText(
                    "验证码错误或已过期，账户没有被注销。",
                    "The verification code is incorrect or expired. The account was not deleted."
                ),
                action = interfaceText("请重新发起注销并获取新的验证码。", "Restart deletion and request a new verification code."),
                requestId = requestId,
                retryable = true,
                fieldErrors = fieldErrors
            )
            code == "CONTACT_BINDING_REQUIRED" -> contactBindingRequired(
                requestId = requestId,
                fieldErrors = fieldErrors
            )
            code == "AUTH_VERIFICATION_CODE_INVALID" -> UserFacingError(
                code = code,
                title = interfaceText("验证码无效", "Invalid verification code"),
                message = interfaceText(
                    "验证码错误、过期或已使用。",
                    "The verification code is incorrect, expired, or already used."
                ),
                action = interfaceText("请重新获取验证码后再试。", "Request a new code and try again."),
                requestId = requestId,
                retryable = true,
                fieldErrors = fieldErrors
            )
            code == "AUTH_RATE_LIMITED" || error.statusCode == 429 -> UserFacingError(
                code = code,
                title = interfaceText("请求过于频繁", "Too many requests"),
                message = interfaceText("系统暂时限制了新的请求。", "The service temporarily limited new requests."),
                action = retryLaterAction(details.retryAfterSeconds),
                requestId = requestId,
                retryable = true,
                fieldErrors = fieldErrors
            )
            code in AUTH_SESSION_CODES || error.statusCode == 401 -> UserFacingError(
                code = code,
                title = interfaceText("登录状态已失效", "Your sign-in has expired"),
                message = interfaceText("当前登录凭据已失效或被撤销。", "Your current sign-in is no longer valid."),
                action = interfaceText("请重新登录后继续。", "Sign in again to continue."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code == "SESSION_ALREADY_ACTIVE" -> UserFacingError(
                code = code,
                title = interfaceText("无法开始运动", "Could not start exercise"),
                message = interfaceText(
                    "检测到账号已有一条正在进行中的运动，可能由另一台设备创建。",
                    "Your account already has an exercise in progress, possibly on another device."
                ),
                action = interfaceText("请回到原设备结束运动，或刷新当前状态。", "Finish it on the original device, or refresh the current status."),
                requestId = requestId,
                retryable = true,
                fieldErrors = fieldErrors
            )
            code == "SESSION_OUTSIDE_TIME_WINDOW" || code == "COURSE_CHECKIN_WINDOW_CLOSED" -> UserFacingError(
                code = code,
                title = interfaceText("当前不能开始运动", "Exercise is unavailable now"),
                message = interfaceText("当前不在允许的运动打卡时间窗口内。", "This is outside the allowed exercise check-in window."),
                action = interfaceText("请查看课程时间安排后再试。", "Check the course schedule and try at an allowed time."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            context == ClientErrorContext.RECORD &&
                code == "EXERCISE_RECORD_RESUBMISSION_NOT_ALLOWED" -> UserFacingError(
                code = code,
                title = interfaceText("当前记录不能补交", "This record cannot be resubmitted"),
                message = interfaceText(
                    "只有已被教师判定无效的当前尝试才能创建下一次补交。原记录没有被修改。",
                    "Only the current attempt reviewed as invalid can create a next attempt. The existing record was not changed."
                ),
                action = interfaceText("请刷新记录并查看最新审核结果。", "Refresh the record and review its latest result."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            context == ClientErrorContext.RECORD &&
                code == "EXERCISE_RECORD_ALREADY_EXISTS_FOR_SESSION" -> UserFacingError(
                code = code,
                title = interfaceText("这次运动已有提交", "This exercise already has a record"),
                message = interfaceText(
                    "所选的新运动会话已经关联另一条运动记录，系统没有重复创建。",
                    "The selected new exercise session is already linked to another record, so no duplicate was created."
                ),
                action = interfaceText("请刷新记录，或完成另一条新的运动后再补交。", "Refresh the records, or complete another new exercise before resubmitting."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            context == ClientErrorContext.RECORD && code == "COURSE_DEADLINE_PASSED" -> UserFacingError(
                code = code,
                title = interfaceText("补交窗口已结束", "The resubmission window has closed"),
                message = interfaceText("当前课程的提交截止时间已过。", "The current course submission deadline has passed."),
                action = interfaceText("如需处理，请联系任课教师。", "Contact your teacher if this needs review."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            context == ClientErrorContext.RECORD && code == "ENROLLMENT_NOT_ACTIVE" -> UserFacingError(
                code = code,
                title = interfaceText("当前课程关系无效", "Enrollment is no longer active"),
                message = interfaceText("当前入班关系不允许创建新的补交尝试。", "The current enrollment does not allow a new attempt."),
                action = interfaceText("请刷新课程状态；如有疑问，请联系任课教师。", "Refresh the course status. Contact your teacher if needed."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code.startsWith("MEDIA_") || code == "EXERCISE_RECORD_MEDIA_INCOMPLETE" -> mediaError(
                code = code,
                requestId = requestId,
                fieldErrors = fieldErrors,
                retryable = inferredRetryable
            )
            code.startsWith("EXEMPTION_") -> UserFacingError(
                code = code,
                title = interfaceText("无法处理免测申请", "Could not process the exemption application"),
                message = interfaceText("当前申请状态或材料不满足本次操作条件。", "The current application state or evidence does not allow this action."),
                action = interfaceText("请刷新申请并检查当前草稿材料。", "Refresh the application and check the current draft evidence."),
                requestId = requestId,
                retryable = inferredRetryable,
                fieldErrors = fieldErrors
            )
            code.startsWith("COURSE_") || code.startsWith("ENROLLMENT_") -> UserFacingError(
                code = code,
                title = interfaceText("无法加入课程", "Could not join the course"),
                message = interfaceText("课程、邀请或当前入班状态不满足加入条件。", "The course, invitation, or current enrollment state does not allow joining."),
                action = interfaceText("请检查课程邀请并刷新课程状态。", "Check the course invitation and refresh the course status."),
                requestId = requestId,
                retryable = inferredRetryable,
                fieldErrors = fieldErrors
            )
            code.startsWith("VALIDATION_") || code == "VALIDATION_FAILED" || error.statusCode == 422 -> UserFacingError(
                code = code,
                title = interfaceText("请检查输入内容", "Check the information entered"),
                message = interfaceText("部分输入不符合要求。", "Some information does not meet the requirements."),
                action = interfaceText("请根据下方提示修改后再试。", "Correct the highlighted fields and try again."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code.startsWith("PERMISSION_") || error.statusCode == 403 -> UserFacingError(
                code = code,
                title = interfaceText("没有操作权限", "You do not have permission"),
                message = interfaceText("当前账号不能执行这项操作。", "Your account cannot perform this action."),
                action = interfaceText("请返回上一页；如有疑问，请联系课程负责人。", "Go back. Contact the course owner if you need help."),
                requestId = requestId,
                retryable = false,
                fieldErrors = fieldErrors
            )
            code.startsWith("CONFLICT_") || error.statusCode == 409 -> stateConflict(
                context = context,
                requestId = requestId,
                code = code,
                fieldErrors = fieldErrors
            )
            code.startsWith("SYSTEM_") || error.statusCode >= 500 -> UserFacingError(
                code = code,
                title = interfaceText("服务暂时不可用", "Service temporarily unavailable"),
                message = interfaceText("服务暂时无法完成这项操作。", "The service cannot complete this action right now."),
                action = interfaceText("请稍后重试；若持续发生，请联系支持。", "Try again later. Contact support if it continues."),
                requestId = requestId,
                retryable = true,
                fieldErrors = fieldErrors
            )
            else -> defaultFor(
                context = context,
                requestId = requestId,
                code = code,
                retryable = inferredRetryable,
                fieldErrors = fieldErrors
            )
        }
    }

    private fun mapNetwork(error: V1NetworkException): UserFacingError {
        return networkError(
            timeout = error.hasCause<SocketTimeoutException>(),
            requestId = sanitizeRequestId(error.requestId)
        )
    }

    private fun networkError(timeout: Boolean, requestId: String?): UserFacingError = UserFacingError(
            code = if (timeout) "CLIENT_TIMEOUT" else "CLIENT_NETWORK_UNAVAILABLE",
            title = if (timeout) {
                interfaceText("请求超时", "Request timed out")
            } else {
                interfaceText("网络连接失败", "Network connection failed")
            },
            message = if (timeout) {
                interfaceText("服务没有在预期时间内响应。", "The service did not respond in time.")
            } else {
                interfaceText("当前无法连接到服务。", "The app cannot connect to the service right now.")
            },
            action = interfaceText("请检查网络连接后重试。", "Check your connection and try again."),
            requestId = requestId,
            retryable = true
        )

    private fun mapStatusOnlyHttp(
        statusCode: Int,
        context: ClientErrorContext,
        safeCode: String? = null
    ): UserFacingError {
        if (safeCode == "CONTACT_BINDING_REQUIRED") {
            return contactBindingRequired(requestId = null, fieldErrors = emptyList())
        }
        safeCode
            ?.takeUnless { it == UNKNOWN_CODE }
            ?.let { joinCodeError(it, requestId = null, fieldErrors = emptyList()) }
            ?.let { return it }
        return when {
        statusCode == 401 -> UserFacingError(
            code = "AUTH_REQUIRED",
            title = interfaceText("登录状态已失效", "Your sign-in has expired"),
            message = interfaceText("当前登录凭据已失效或被撤销。", "Your current sign-in is no longer valid."),
            action = interfaceText("请重新登录后继续。", "Sign in again to continue."),
            requestId = null,
            retryable = false
        )
        statusCode == 403 -> UserFacingError(
            code = "PERMISSION_DENIED",
            title = interfaceText("没有操作权限", "You do not have permission"),
            message = interfaceText("当前账号不能执行这项操作。", "Your account cannot perform this action."),
            action = interfaceText("请返回上一页；如有疑问，请联系课程负责人。", "Go back. Contact the course owner if you need help."),
            requestId = null,
            retryable = false
        )
        statusCode == 409 -> stateConflict(context, requestId = null)
        statusCode == 422 -> UserFacingError(
            code = "VALIDATION_FAILED",
            title = interfaceText("请检查输入内容", "Check the information entered"),
            message = interfaceText("部分输入不符合要求。", "Some information does not meet the requirements."),
            action = interfaceText("请检查填写内容后再试。", "Check the information and try again."),
            requestId = null,
            retryable = false
        )
        statusCode == 429 -> UserFacingError(
            code = "AUTH_RATE_LIMITED",
            title = interfaceText("请求过于频繁", "Too many requests"),
            message = interfaceText("系统暂时限制了新的请求。", "The service temporarily limited new requests."),
            action = interfaceText("请稍后重试。", "Try again later."),
            requestId = null,
            retryable = true
        )
        statusCode >= 500 -> UserFacingError(
            code = "SYSTEM_SERVICE_UNAVAILABLE",
            title = interfaceText("服务暂时不可用", "Service temporarily unavailable"),
            message = interfaceText("服务暂时无法完成这项操作。", "The service cannot complete this action right now."),
            action = interfaceText("请稍后重试；若持续发生，请联系支持。", "Try again later. Contact support if it continues."),
            requestId = null,
            retryable = true
        )
        else -> defaultFor(context, requestId = null, retryable = false)
        }
    }

    private fun contactBindingRequired(
        requestId: String?,
        fieldErrors: List<UserFacingFieldError>
    ) = UserFacingError(
        code = "CONTACT_BINDING_REQUIRED",
        title = interfaceText("需要验证登录邮箱", "Sign-in email verification required"),
        message = interfaceText(
            "当前账户还没有完成登录邮箱验证。",
            "This account has not completed sign-in email verification."
        ),
        action = interfaceText("请先验证邮箱后继续。", "Verify the email address to continue."),
        requestId = requestId,
        retryable = false,
        fieldErrors = fieldErrors
    )

    private fun joinCodeError(
        code: String,
        requestId: String?,
        fieldErrors: List<UserFacingFieldError>
    ): UserFacingError? {
        val copy = when (code) {
            "COURSE_INVITE_EXPIRED" -> Triple(
                interfaceText("课程邀请已过期", "Course invitation expired"),
                interfaceText("课程二维码或邀请码已过期。", "The course QR code or invitation code expired."),
                interfaceText("请向教师获取新的加入凭证。", "Ask the teacher for a new invitation.")
            )
            "COURSE_INVITE_REVOKED" -> Triple(
                interfaceText("课程邀请已停用", "Course invitation disabled"),
                interfaceText("课程二维码或邀请码已被停用。", "The course QR code or invitation code was disabled."),
                interfaceText("请向教师获取新的加入凭证。", "Ask the teacher for a new invitation.")
            )
            "COURSE_INVITE_INVALID", "AUTH_JOIN_CAPABILITY_INVALID", "AUTH_JOIN_CAPABILITY_EXPIRED" -> Triple(
                interfaceText("课程邀请无效", "Invalid course invitation"),
                interfaceText("当前二维码或邀请码无效。", "The current QR code or invitation code is invalid."),
                interfaceText("请确认使用教师当前提供的加入凭证。", "Use the current invitation provided by the teacher.")
            )
            "COURSE_NOT_FOUND", "COURSE_CLASS_SECTION_NOT_FOUND" -> Triple(
                interfaceText("未找到课程", "Course not found"),
                interfaceText("课程不存在或当前不可访问。", "The course does not exist or is not accessible."),
                interfaceText("请联系教师确认课程。", "Contact the teacher to confirm the course.")
            )
            "COURSE_CLASS_SECTION_NOT_JOINABLE", "COURSE_SEMESTER_ARCHIVED" -> Triple(
                interfaceText("课程暂不可加入", "Course cannot be joined"),
                interfaceText("该课程当前已关闭加入。", "This course is currently closed to new members."),
                interfaceText("请联系教师确认课程状态。", "Contact the teacher to confirm its status.")
            )
            "ENROLLMENT_ALREADY_ACTIVE" -> Triple(
                interfaceText("已经加入课程", "Already enrolled"),
                interfaceText("你已经加入该课程，不会创建重复课程关系。", "You already joined this course. No duplicate enrollment was created."),
                interfaceText("请返回课程页面查看。", "Return to the course page to view it.")
            )
            "ENROLLMENT_SEMESTER_CONFLICT" -> Triple(
                interfaceText("本学期已有课程", "A course is already active this semester"),
                interfaceText("你本学期已加入其他体育课程，不能重复加入第二门课程。", "You already belong to another PE course this semester."),
                interfaceText("请返回查看当前课程，或联系课程负责人。", "View the current course or contact the course owner.")
            )
            "USER_IDENTITY_CONFLICT" -> Triple(
                interfaceText("学生身份信息冲突", "Student identity conflict"),
                interfaceText("该学号已关联其他学生身份。", "This student number is linked to another identity."),
                interfaceText("请核对学号或联系管理员处理。", "Check the student number or contact an administrator.")
            )
            else -> return null
        }
        return UserFacingError(
            code = code,
            title = copy.first,
            message = copy.second,
            action = copy.third,
            requestId = requestId,
            retryable = false,
            fieldErrors = fieldErrors
        )
    }

    private fun mapStorageUpload(error: ExerciseMediaObjectUploadException): UserFacingError {
        val requestId = sanitizeRequestId(error.storageRequestId)
        val code = when (error.storageErrorCode) {
            ExerciseMediaStorageErrorCode.SIGNATURE_DOES_NOT_MATCH -> "MEDIA_STORAGE_SIGNATURE_REJECTED"
            ExerciseMediaStorageErrorCode.ACCESS_DENIED -> "MEDIA_STORAGE_ACCESS_DENIED"
            ExerciseMediaStorageErrorCode.EXPIRED_TOKEN,
            ExerciseMediaStorageErrorCode.REQUEST_EXPIRED,
            ExerciseMediaStorageErrorCode.REQUEST_TIME_TOO_SKEWED -> "MEDIA_STORAGE_AUTHORIZATION_EXPIRED"
            null -> when (error.httpStatus) {
                null -> "CLIENT_NETWORK_UNAVAILABLE"
                403 -> "MEDIA_STORAGE_ACCESS_DENIED"
                else -> "MEDIA_STORAGE_UPLOAD_FAILED"
            }
        }
        val message = when (code) {
            "MEDIA_STORAGE_SIGNATURE_REJECTED" -> interfaceText(
                "对象存储拒绝了上传签名，本地凭证草稿已保留。",
                "Storage rejected the upload signature. The local proof draft was retained."
            )
            "MEDIA_STORAGE_ACCESS_DENIED" -> interfaceText(
                "对象存储拒绝了本次上传权限，本地凭证草稿已保留。",
                "Storage denied this upload. The local proof draft was retained."
            )
            "MEDIA_STORAGE_AUTHORIZATION_EXPIRED" -> interfaceText(
                "对象存储上传授权已过期或超出有效时间，本地凭证草稿已保留。",
                "The storage authorization expired or was outside its valid time. The local proof draft was retained."
            )
            "CLIENT_NETWORK_UNAVAILABLE" -> interfaceText(
                "对象存储网络连接失败，本地凭证草稿已保留。",
                "The storage connection failed. The local proof draft was retained."
            )
            else -> interfaceText(
                "对象存储未能完成上传，本地凭证草稿已保留。",
                "Storage could not complete the upload. The local proof draft was retained."
            )
        }
        return UserFacingError(
            code = code,
            title = interfaceText("凭证上传失败", "Evidence upload failed"),
            message = message,
            action = interfaceText("请保留当前记录并稍后重试。", "Keep the current record and try again later."),
            requestId = requestId,
            retryable = true
        )
    }

    private fun mediaError(
        code: String,
        requestId: String?,
        fieldErrors: List<UserFacingFieldError>,
        retryable: Boolean
    ): UserFacingError {
        val processing = code in setOf(
            "MEDIA_PROCESSING_INCOMPLETE",
            "MEDIA_VERIFICATION_INCOMPLETE",
            "MEDIA_NOT_AVAILABLE",
            "EXERCISE_RECORD_MEDIA_INCOMPLETE"
        )
        return UserFacingError(
            code = code,
            title = if (processing) {
                interfaceText("凭证尚未处理完成", "Evidence is not ready")
            } else {
                interfaceText("无法处理现场凭证", "Could not process on-site evidence")
            },
            message = if (processing) {
                interfaceText(
                    "已确认保留的凭证仍在处理或校验中，因此当前记录不能提交。",
                    "Retained evidence is still processing or being verified, so the record cannot be submitted yet."
                )
            } else {
                interfaceText(
                    "已确认保留的凭证当前无法满足提交要求。",
                    "Retained evidence does not currently meet the submission requirements."
                )
            },
            action = interfaceText("请刷新凭证状态；不要关闭或丢弃当前记录。", "Refresh evidence status. Do not close or discard the current record."),
            requestId = requestId,
            retryable = retryable || processing,
            fieldErrors = fieldErrors
        )
    }

    private fun stateConflict(
        context: ClientErrorContext,
        requestId: String?,
        code: String = "CONFLICT_VERSION_MISMATCH",
        fieldErrors: List<UserFacingFieldError> = emptyList()
    ) = UserFacingError(
        code = sanitizeCode(code),
        title = contextTitle(context),
        message = interfaceText("数据状态已经发生变化。", "The data state changed before this action completed."),
        action = interfaceText("请刷新最新状态后再试。", "Refresh the latest state and try again."),
        requestId = requestId,
        retryable = true,
        fieldErrors = fieldErrors
    )

    private fun defaultFor(
        context: ClientErrorContext,
        requestId: String?,
        code: String = UNKNOWN_CODE,
        retryable: Boolean = true,
        fieldErrors: List<UserFacingFieldError> = emptyList()
    ) = UserFacingError(
        code = sanitizeCode(code),
        title = contextTitle(context),
        message = contextMessage(context),
        action = interfaceText("请稍后重试；若持续发生，请联系支持。", "Try again later. Contact support if it continues."),
        requestId = requestId,
        retryable = retryable,
        fieldErrors = fieldErrors
    )
}

/** Writes only sanitized identifiers and fixed enums; never accepts a Throwable or raw message. */
internal object SafeClientLogger {
    private const val TAG = "BNBUClientError"

    fun log(
        error: UserFacingError,
        context: ClientErrorContext,
        httpStatus: Int? = null
    ) {
        Log.w(TAG, formatEvent(error, context, httpStatus))
    }

    internal fun formatEvent(
        error: UserFacingError,
        context: ClientErrorContext,
        httpStatus: Int? = null
    ): String = buildString {
        append("event=client_error")
        append(" context=")
        append(context.name)
        append(" code=")
        append(sanitizeCode(error.code))
        append(" requestId=")
        append(sanitizeRequestId(error.requestId) ?: "unavailable")
        append(" retryable=")
        append(error.retryable)
        httpStatus?.takeIf { it in 100..599 }?.let {
            append(" httpStatus=")
            append(it)
        }
    }
}

private fun contextTitle(context: ClientErrorContext): String = when (context) {
    ClientErrorContext.LOGIN -> interfaceText("登录失败", "Sign-in failed")
    ClientErrorContext.OTP -> interfaceText("验证码操作失败", "Verification-code action failed")
    ClientErrorContext.JOIN -> interfaceText("无法加入课程", "Could not join the course")
    ClientErrorContext.SESSION -> interfaceText("无法同步运动状态", "Could not sync exercise state")
    ClientErrorContext.MEDIA -> interfaceText("无法处理现场凭证", "Could not process on-site evidence")
    ClientErrorContext.RECORD -> interfaceText("无法提交运动记录", "Could not submit the exercise record")
    ClientErrorContext.REVIEW -> interfaceText("无法完成审核操作", "Could not complete the review action")
    ClientErrorContext.EXEMPTION -> interfaceText("无法处理免测申请", "Could not process the exemption application")
    ClientErrorContext.ACCOUNT_DELETION -> interfaceText("无法注销账户", "Could not delete the account")
    ClientErrorContext.GENERAL -> interfaceText("操作失败", "Action failed")
}

private fun contextMessage(context: ClientErrorContext): String = when (context) {
    ClientErrorContext.LOGIN,
    ClientErrorContext.OTP -> interfaceText("登录服务未能处理请求。", "The sign-in service could not process the request.")
    ClientErrorContext.JOIN -> interfaceText("课程服务未能完成入班。", "The course service could not complete enrollment.")
    ClientErrorContext.SESSION -> interfaceText("运动状态同步没有完成，最后确认的状态已保留。", "Exercise sync did not complete. The last confirmed state was retained.")
    ClientErrorContext.MEDIA -> interfaceText("现场凭证处理没有完成，本地草稿已保留。", "Evidence processing did not complete. The local draft was retained.")
    ClientErrorContext.RECORD -> interfaceText("运动记录没有提交成功，当前记录已保留。", "The exercise record was not submitted. The current record was retained.")
    ClientErrorContext.REVIEW -> interfaceText("审核操作没有完成。", "The review action did not complete.")
    ClientErrorContext.EXEMPTION -> interfaceText("免测申请操作没有完成，当前草稿已保留。", "The exemption action did not complete. The current draft was retained.")
    ClientErrorContext.ACCOUNT_DELETION -> interfaceText("账户注销没有完成，账户仍可正常使用。", "Account deletion did not complete. The account remains active.")
    ClientErrorContext.GENERAL -> interfaceText("系统未能完成这项操作。", "The system could not complete this action.")
}

private fun retryLaterAction(retryAfterSeconds: Long?): String = retryAfterSeconds
    ?.takeIf { it in 1..MAX_RETRY_AFTER_SECONDS }
    ?.let {
        interfaceText(
            "请等待至少 $it 秒后重试。",
            "Wait at least $it seconds before trying again."
        )
    }
    ?: interfaceText("请稍后重试。", "Try again later.")

private fun toUserFacingFieldError(error: SafeErrorDetails.SafeFieldError): UserFacingFieldError {
    val label = when (error.field.lowercase()) {
        "email", "account" -> interfaceText("邮箱", "Email")
        "code", "otp", "verificationcode" -> interfaceText("验证码", "Verification code")
        "invitecode", "invite.code" -> interfaceText("课程邀请码", "Course invitation code")
        "studentnumber", "student.number" -> interfaceText("学号", "Student number")
        "description" -> interfaceText("运动说明", "Exercise description")
        "password", "currentpassword" -> interfaceText("密码", "Password")
        "finalconfirmation" -> interfaceText("最终确认文字", "Final confirmation text")
        else -> interfaceText("输入内容", "Input")
    }
    val message = when (error.code) {
        "VALIDATION_FIELD_REQUIRED" -> interfaceText("此项为必填项。", "This field is required.")
        "VALIDATION_FORMAT_INVALID" -> interfaceText("格式不正确。", "The format is invalid.")
        "VALIDATION_ENUM_UNSUPPORTED" -> interfaceText("请选择有效选项。", "Select a valid option.")
        "VALIDATION_DURATION_INVALID" -> interfaceText("时长不符合要求。", "The duration is invalid.")
        else -> interfaceText("请检查此项内容。", "Check this field.")
    }
    return UserFacingFieldError(
        field = error.field,
        code = error.code,
        label = label,
        message = message
    )
}

private fun sanitizeCode(value: String?): String = value
    ?.trim()
    ?.takeIf(SAFE_ERROR_CODE::matches)
    ?: UNKNOWN_CODE

private fun sanitizeRequestId(value: String?): String? = value
    ?.trim()
    ?.takeIf(SAFE_REQUEST_ID::matches)

/** Legacy adapter: extracts only a bounded, syntactically safe code from JSON. */
private fun legacySafeCode(responseBody: String): String? {
    if (responseBody.length !in 1..MAX_LEGACY_ERROR_BODY_LENGTH) return null
    val root = runCatching { JsonParser.parseString(responseBody) }
        .getOrNull()
        ?.takeIf(JsonElement::isJsonObject)
        ?.asJsonObject
        ?: return null
    val candidates = sequenceOf(
        root.safeString("code"),
        root.safeString("errorCode"),
        root.get("error")
            ?.takeIf(JsonElement::isJsonObject)
            ?.asJsonObject
            ?.safeString("code")
    )
    return candidates
        .filterNotNull()
        .map(::sanitizeCode)
        .firstOrNull { it != UNKNOWN_CODE }
}

private fun com.google.gson.JsonObject.safeString(name: String): String? = runCatching {
    get(name)
        ?.takeUnless(JsonElement::isJsonNull)
        ?.takeIf(JsonElement::isJsonPrimitive)
        ?.asJsonPrimitive
        ?.takeIf { it.isString }
        ?.asString
        ?.trim()
        ?.takeIf(String::isNotEmpty)
}.getOrNull()

private fun com.google.gson.JsonObject.safeBoolean(name: String): Boolean? = runCatching {
    get(name)
        ?.takeUnless(JsonElement::isJsonNull)
        ?.takeIf(JsonElement::isJsonPrimitive)
        ?.asJsonPrimitive
        ?.takeIf { it.isBoolean }
        ?.asBoolean
}.getOrNull()

private fun com.google.gson.JsonObject.safeLong(name: String): Long? = runCatching {
    get(name)
        ?.takeUnless(JsonElement::isJsonNull)
        ?.takeIf(JsonElement::isJsonPrimitive)
        ?.asJsonPrimitive
        ?.takeIf { it.isNumber }
        ?.asLong
}.getOrNull()

private inline fun <reified T : Throwable> Throwable.hasCause(): Boolean {
    var current: Throwable? = this
    repeat(MAX_CAUSE_DEPTH) {
        if (current is T) return true
        current = current?.cause
    }
    return false
}

private fun Int.isRetryableStatus(): Boolean = this == 408 || this == 429 || this >= 500

private const val UNKNOWN_CODE = "UNKNOWN"
private const val MAX_FIELD_ERRORS = 20
private const val MAX_DATE_TIME_LENGTH = 64
private const val MAX_RETRY_AFTER_SECONDS = 86_400L
private const val MAX_CAUSE_DEPTH = 8
private const val MAX_LEGACY_ERROR_BODY_LENGTH = 16_384
private val SAFE_ERROR_CODE = Regex("^[A-Z][A-Z0-9_]{0,79}$")
private val SAFE_REQUEST_ID = Regex("^[A-Za-z0-9._:-]{1,64}$")
private val SAFE_FIELD_PATH = Regex("^[A-Za-z][A-Za-z0-9_.\\[\\]-]{0,199}$")
private val AUTH_SESSION_CODES = setOf(
    "AUTH_REQUIRED",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
    "AUTH_SESSION_REVOKED",
    "AUTH_ACCOUNT_DISABLED"
)
