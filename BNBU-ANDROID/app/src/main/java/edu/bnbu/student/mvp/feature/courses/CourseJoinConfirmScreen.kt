package edu.bnbu.student.mvp.feature.courses

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUPrimaryButton
import edu.bnbu.student.mvp.core.designsystem.GridBackground
import edu.bnbu.student.mvp.core.designsystem.SegmentedControl
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.CourseJoinRequestBody
import edu.bnbu.student.mvp.core.network.v1.generated.CourseInvitePreview
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

private const val MaxNameLength = 64
private const val MaxStudentNumberLength = 32
private const val MaxGradeLength = 4
private val StudentNumberPattern = Regex("^[A-Za-z0-9][A-Za-z0-9-]{4,31}$")
private val GradeYearPattern = Regex("^\\d{4}$")

/** Course information resolved and validated from a teacher-issued invitation. */
data class CourseJoinInfo(
    val id: String,
    val name: String,
    val teacher: String,
    val semester: String,
    val isDemoScanResult: Boolean = false
)

internal fun CourseInvitePreview.toCourseJoinInfo(): CourseJoinInfo = CourseJoinInfo(
    id = classSectionId,
    name = courseName,
    teacher = teacherDisplayName,
    semester = semesterDisplayName
)

sealed interface CourseJoinCompletion {
    val alreadyJoined: Boolean

    data class Authoritative(
        val currentUser: CurrentUserData,
        override val alreadyJoined: Boolean = false
    ) : CourseJoinCompletion
}

private enum class JoinGender(val apiValue: String) {
    Male("male"),
    Female("female");

    @Composable
    fun label(): String = when (this) {
        Male -> interfaceText("男", "Male")
        Female -> interfaceText("女", "Female")
    }

    companion object {
        fun from(value: String): JoinGender? = entries.firstOrNull {
            it.apiValue.equals(value.trim(), ignoreCase = true)
        }
    }
}

/**
 * Confirms identity details and atomically creates an active course membership.
 * A successful response is handed to [onJoined] before this screen navigates away.
 */
@Composable
fun CourseJoinConfirmScreen(
    inviteCode: String,
    course: CourseJoinInfo,
    initialName: String = "",
    initialStudentNumber: String = "",
    initialGender: String = "",
    initialGrade: String = "",
    writeEnabled: Boolean = true,
    activeCourseId: String? = null,
    onBack: () -> Unit = {},
    onEnterExistingCourse: () -> Unit = {},
    onJoined: suspend (CourseJoinCompletion) -> Unit = {},
    submitCourseJoin: suspend (CourseJoinRequestBody) -> CourseJoinCompletion
) {
    val appLanguage = AppLanguagePreferences.currentLanguage
    var name by rememberSaveable { mutableStateOf(initialName) }
    var studentNumber by rememberSaveable { mutableStateOf(initialStudentNumber) }
    var genderValue by rememberSaveable { mutableStateOf(JoinGender.from(initialGender)?.apiValue.orEmpty()) }
    var grade by rememberSaveable { mutableStateOf(initialGrade) }
    var isSubmitting by rememberSaveable { mutableStateOf(false) }
    var hasSubmitted by rememberSaveable { mutableStateOf(false) }
    var errorMessage by rememberSaveable(appLanguage) { mutableStateOf<String?>(null) }
    var userFacingError by remember { mutableStateOf<UserFacingError?>(null) }
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val colors = MaterialTheme.colorScheme
    val nameFocusRequester = remember { FocusRequester() }
    val studentNumberFocusRequester = remember { FocusRequester() }
    val gradeFocusRequester = remember { FocusRequester() }
    val alreadyInThisCourse = activeCourseId != null && activeCourseId == course.id
    val alreadyInAnotherCourse = activeCourseId != null && activeCourseId != course.id
    val formFieldsEnabled = !isSubmitting && (writeEnabled || course.isDemoScanResult)
    val normalizedName = name.trim().replace(Regex("\\s+"), " ")
    val normalizedStudentNumber = studentNumber.trim().uppercase()
    val normalizedGrade = grade.trim()
    val nameFieldError = when {
        name.isNotEmpty() && normalizedName.isBlank() -> interfaceText("请输入姓名。", "Enter your name.")
        else -> null
    }
    val studentNumberFieldError = when {
        studentNumber.isNotBlank() && !StudentNumberPattern.matches(normalizedStudentNumber) -> interfaceText(
            "请输入 5–32 位字母、数字或连字符。",
            "Enter 5–32 letters, numbers, or hyphens."
        )
        else -> null
    }
    val gradeFieldError = when {
        grade.isNotBlank() && !GradeYearPattern.matches(normalizedGrade) -> interfaceText(
            "请输入四位数字年份。",
            "Enter a four-digit year."
        )
        else -> null
    }
    val formValid = validateDirectCourseJoin(
        name = normalizedName,
        studentNumber = normalizedStudentNumber,
        gender = genderValue,
        grade = normalizedGrade
    ) == null

    fun submit() {
        if (!writeEnabled || isSubmitting || hasSubmitted || alreadyInThisCourse || alreadyInAnotherCourse) return

        val trimmedName = name.trim().replace(Regex("\\s+"), " ")
        val normalizedStudentNumber = studentNumber.trim().uppercase()
        val trimmedGrade = grade.trim().replace(Regex("\\s+"), " ")
        errorMessage = validateDirectCourseJoin(
            name = trimmedName,
            studentNumber = normalizedStudentNumber,
            gender = genderValue,
            grade = trimmedGrade
        )
        userFacingError = null
        if (errorMessage != null) return

        focusManager.clearFocus(force = true)
        isSubmitting = true
        scope.launch {
            try {
                val body = CourseJoinRequestBody(
                    studentName = trimmedName,
                    studentNumber = normalizedStudentNumber,
                    gender = genderValue,
                    grade = trimmedGrade,
                    inviteCode = inviteCode
                )
                val response = submitCourseJoin(body)
                hasSubmitted = true
                onJoined(response)
                val message = if (response.alreadyJoined) {
                    interfaceText("你已经加入该课程", "You have already joined this course.")
                } else {
                    interfaceText("你已成功加入《${course.name}》", "You have successfully joined ${course.name}.")
                }
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                hasSubmitted = false
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.JOIN)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.JOIN,
                    httpStatus = (error as? ApiHttpException)?.statusCode
                )
            } finally {
                isSubmitting = false
            }
        }
    }

    BackHandler(enabled = !isSubmitting, onBack = onBack)

    Box(modifier = Modifier.fillMaxSize()) {
        GridBackground(modifier = Modifier.fillMaxSize())
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = BNBULayout.ScreenHorizontal, vertical = BNBULayout.Space12)
                .testTag("screen.courseJoinConfirm"),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
        ) {
            TextButton(
                onClick = onBack,
                enabled = !isSubmitting,
                modifier = Modifier.testTag("courseJoinConfirm.back")
            ) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null)
                Text(interfaceText("返回", "Back"))
            }

            Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                Text(
                    text = interfaceText("加入课程", "Join course"),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = interfaceText(
                        "课程已识别，请补充个人信息完成加入。",
                        "Course identified. Add your details to finish joining."
                    ),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (course.isDemoScanResult) {
                ValidationPanel(
                    interfaceText(
                        "模拟扫码成功预览：你可以查看和填写本页，但不会请求服务器或加入课程。",
                        "Simulated scan-success preview: you can inspect and fill in this screen, but no server request or course join will occur."
                    )
                )
            }

            CompactCourseSummary(course)

            Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                Text(
                    text = interfaceText("填写个人信息", "Enter your details"),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = interfaceText(
                        "用于课程名单核对，所有项目均需填写。",
                        "Used to match the course roster. Complete every field."
                    ),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            when {
                alreadyInThisCourse -> {
                    ValidationPanel(interfaceText("你已经加入该课程。", "You have already joined this course."))
                    BNBUPrimaryButton(
                        title = interfaceText("进入课程", "Open course"),
                        modifier = Modifier.testTag("courseJoinConfirm.openExisting"),
                        onClick = onEnterExistingCourse
                    )
                }
                alreadyInAnotherCourse -> ValidationPanel(
                    interfaceText(
                        "你本学期已加入其他体育课程，不能重复加入第二门课程。",
                        "You already belong to another PE course this term and cannot join a second course."
                    )
                )
                else -> {
                    errorMessage?.let { ValidationPanel(it) }
                    userFacingError?.let { error ->
                        BNBUErrorPanel(
                            error = error,
                            onDismiss = { userFacingError = null }
                        )
                    }
                    BNBUFormField(
                        value = name,
                        onValueChange = {
                            name = it.take(MaxNameLength)
                            errorMessage = null
                            userFacingError = null
                        },
                        label = interfaceText("姓名", "Name"),
                        placeholder = interfaceText("请输入姓名", "Enter your name"),
                        errorText = nameFieldError,
                        required = true,
                        counter = name.length to MaxNameLength,
                        enabled = formFieldsEnabled,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { studentNumberFocusRequester.requestFocus() }
                        ),
                        inputModifier = Modifier.focusRequester(nameFocusRequester),
                        testTag = "courseJoinConfirm.name"
                    )
                    BNBUFormField(
                        value = studentNumber,
                        onValueChange = {
                            studentNumber = it.take(MaxStudentNumberLength)
                            errorMessage = null
                            userFacingError = null
                        },
                        label = interfaceText("学号", "Student ID"),
                        placeholder = interfaceText("请输入学号", "Enter your student ID"),
                        supportingText = interfaceText(
                            "5–32 位字母、数字或连字符",
                            "5–32 letters, numbers, or hyphens"
                        ),
                        errorText = studentNumberFieldError,
                        required = true,
                        enabled = formFieldsEnabled,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Ascii,
                            imeAction = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { gradeFocusRequester.requestFocus() }
                        ),
                        inputModifier = Modifier.focusRequester(studentNumberFocusRequester),
                        testTag = "courseJoinConfirm.studentNumber"
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
                        ) {
                            Text(
                                text = interfaceText("性别", "Gender"),
                                color = colors.onSurface,
                                style = MaterialTheme.typography.labelLarge
                            )
                            Text(
                                text = interfaceText("必填", "Required"),
                                color = colors.onSurfaceVariant,
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                        SegmentedControl(
                            values = JoinGender.entries,
                            selected = JoinGender.from(genderValue),
                            label = { it.label() },
                            onSelected = {
                                genderValue = it.apiValue
                                errorMessage = null
                                userFacingError = null
                            },
                            enabled = formFieldsEnabled,
                            optionTestTag = { "courseJoinConfirm.gender.${it.apiValue}" }
                        )
                    }
                    BNBUFormField(
                        value = grade,
                        onValueChange = {
                            grade = it.filter(Char::isDigit).take(MaxGradeLength)
                            errorMessage = null
                            userFacingError = null
                        },
                        label = interfaceText("年级", "Cohort year"),
                        placeholder = "2024",
                        supportingText = interfaceText("例如：2024 级", "For example: 2024 cohort"),
                        errorText = gradeFieldError,
                        required = true,
                        enabled = formFieldsEnabled,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { focusManager.clearFocus(force = true) }
                        ),
                        inputModifier = Modifier.focusRequester(gradeFocusRequester),
                        testTag = "courseJoinConfirm.grade"
                    )
                    Spacer(Modifier.height(BNBULayout.Space4))
                    BNBUPrimaryButton(
                        title = if (course.isDemoScanResult) {
                            interfaceText("预览模式，不会提交", "Preview only — no submission")
                        } else if (isSubmitting) {
                            interfaceText("正在加入…", "Joining…")
                        } else {
                            interfaceText("确认加入", "Confirm join")
                        },
                        enabled = formValid && !hasSubmitted && writeEnabled && !course.isDemoScanResult,
                        loading = isSubmitting,
                        modifier = Modifier.testTag("courseJoinConfirm.submit"),
                        onClick = ::submit
                    )
                }
            }
        }
    }
}

@Composable
private fun CompactCourseSummary(course: CourseJoinInfo) {
    val colors = MaterialTheme.colorScheme
    SwissPanel(contentPadding = BNBULayout.Space16) {
        Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
            Text(
                text = course.name,
                color = colors.onSurface,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${course.teacher} · ${course.semester}",
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

internal fun validateDirectCourseJoin(
    name: String,
    studentNumber: String,
    gender: String,
    grade: String
): String? = when {
    name.isBlank() -> interfaceText("请填写姓名。", "Enter your name.")
    name.length > MaxNameLength -> interfaceText("姓名不能超过 %1\$d 个字符。", "Name cannot exceed %1\$d characters.").format(MaxNameLength)
    studentNumber.isBlank() -> interfaceText("请填写学号。", "Enter your student ID.")
    !StudentNumberPattern.matches(studentNumber) -> interfaceText("学号格式不正确，请输入 5–32 位字母、数字或连字符。", "The student ID format is invalid. Enter 5–32 letters, numbers, or hyphens.")
    JoinGender.from(gender) == null -> interfaceText("请选择性别。", "Select a gender.")
    grade.isBlank() -> interfaceText("请填写入学年份。", "Enter your enrollment year.")
    !GradeYearPattern.matches(grade) || grade.toIntOrNull() !in 1000..9999 -> interfaceText(
        "请输入四位数字入学年份。",
        "Enter a four-digit enrollment year."
    )
    else -> null
}

internal fun directJoinErrorMessage(error: Throwable): String {
    return ClientErrorMapper.map(error, ClientErrorContext.JOIN).legacySafeText()
}
