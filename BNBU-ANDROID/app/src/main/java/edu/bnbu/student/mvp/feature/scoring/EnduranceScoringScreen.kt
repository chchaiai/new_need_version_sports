package edu.bnbu.student.mvp.feature.scoring

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.designsystem.ActionButton
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.StatusBadge
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.EnduranceConversionRequest
import edu.bnbu.student.mvp.core.model.EnduranceScoreResult
import edu.bnbu.student.mvp.core.model.StudentProfile
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.R
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job

@Composable
fun EnduranceScoringScreen(
    appState: StudentAppState,
    student: StudentProfile,
    repository: ApiStudentRepository?,
    onUnauthorized: () -> Unit,
    onBack: () -> Unit
) {
    var minutes by remember { mutableStateOf("") }
    var seconds by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<EnduranceScoreResult?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val requestJob = remember { mutableStateOf<Job?>(null) }
    val focusManager = LocalFocusManager.current
    val cs = MaterialTheme.colorScheme
    val invalidTime = stringResource(R.string.endurance_invalid_time)
    val invalidSeconds = stringResource(R.string.endurance_invalid_seconds)
    val genderRequired = stringResource(R.string.endurance_gender_required)
    val gradeRequired = stringResource(R.string.endurance_grade_required)
    val conversionFailed = stringResource(R.string.endurance_failed)
    val handleBack = {
        focusManager.clearFocus(force = true)
        onBack()
    }

    BackHandler(onBack = handleBack)

    DisposableEffect(Unit) {
        onDispose { requestJob.value?.cancel() }
    }

    // Auto-determine run type from gender
    val runType = if (student.gender == "male") "1000m" else "800m"
    val studentLabel = student.localizedDemographicLabel()

    fun convert() {
        if (isLoading || requestJob.value?.isActive == true) return
        val minVal = minutes.toIntOrNull() ?: 0
        val secVal = seconds.toIntOrNull() ?: 0
        val totalSeconds = minVal * 60 + secVal
        result = null

        if (totalSeconds <= 0) {
            errorMessage = invalidTime
            return
        }

        if (secVal !in 0..59) {
            errorMessage = invalidSeconds
            return
        }

        if (student.gender.isBlank()) {
            errorMessage = genderRequired
            return
        }
        if (student.gradeLevel.isBlank()) {
            errorMessage = gradeRequired
            return
        }

        if (repository == null) {
            result = previewEnduranceResult(totalSeconds, student.gender, student.gradeLevel)
            errorMessage = null
            return
        }

        isLoading = true
        errorMessage = null
        val request = appState.launchAuthenticatedRequest {
            try {
                val response = repository.convertEndurance(
                    EnduranceConversionRequest(
                        timeSeconds = totalSeconds,
                        gender = student.gender,
                        gradeLevel = student.gradeLevel
                    )
                )
                result = EnduranceScoreResult(
                    score = response.score,
                    tier = response.tier,
                    timeSeconds = response.timeSeconds,
                    gender = response.gender,
                    gradeLevel = response.gradeLevel,
                    gradeGroup = response.gradeGroup
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (e is ApiHttpException && e.statusCode == 401) {
                    onUnauthorized()
                    return@launchAuthenticatedRequest
                }
                errorMessage = "$conversionFailed: ${e.message}"
            } finally {
                isLoading = false
            }
        }
        requestJob.value = request
        if (request == null) {
            isLoading = false
            onUnauthorized()
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .bnbuClickable(onClick = handleBack),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = null,
                tint = cs.onSurface
            )
            Text(
                text = stringResource(R.string.common_back),
                color = cs.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Spacer(Modifier.height(16.dp))

        SectionTitle(
            eyebrow = interfaceText("耐力跑评分", "Endurance Scoring"),
            title = stringResource(R.string.endurance_title)
        )

        Spacer(Modifier.height(8.dp))

        SwissPanel {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.FitnessCenter,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(
                        text = stringResource(R.string.endurance_test, runType),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = studentLabel,
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        SwissPanel {
            Text(
                text = if (repository == null) {
                    interfaceText("演示试算", "Demo calculation")
                } else {
                    interfaceText("试算说明", "Calculation notes")
                },
                color = cs.primary,
                style = MaterialTheme.typography.labelMedium
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = interfaceText(
                    "输入用时后按性别和年级组换算。女生对应 800m，男生对应 1000m。此工具只用于试算，不写入正式成绩。",
                    "Enter a time to calculate by gender and grade group. Women use 800m and men use 1000m. This tool is a preview and does not change official grades."
                ),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            if (repository == null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = interfaceText(
                        "演示账户使用初始化示例换算表；正式结果以服务器当前启用的换算表为准。",
                        "Demo accounts use the initial sample table. Official results use the conversion table currently enabled by the server."
                    ),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Time input
        SwissPanel {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.endurance_minutes),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(
                        value = minutes,
                        onValueChange = { minutes = it.filter { c -> c.isDigit() }.take(2) },
                        placeholder = { Text("0") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                Text(
                    text = "′",
                    color = cs.onSurface,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Medium
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.endurance_seconds),
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(
                        value = seconds,
                        onValueChange = { seconds = it.filter { c -> c.isDigit() }.take(2) },
                        placeholder = { Text("00") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                Text(
                    text = "″",
                    color = cs.onSurface,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(Modifier.height(14.dp))

            ActionButton(
                title = if (isLoading) stringResource(R.string.endurance_converting) else stringResource(R.string.endurance_convert),
                icon = Icons.Filled.Timer,
                filled = true,
                enabled = !isLoading && requestJob.value?.isActive != true,
                onClick = { convert() }
            )
        }

        // Error
        AnimatedVisibility(
            visible = errorMessage != null,
            enter = expandVertically(tween(BNBUMotion.Standard)) + fadeIn(tween(BNBUMotion.Standard)),
            exit = shrinkVertically(tween(BNBUMotion.Standard)) + fadeOut(tween(BNBUMotion.Quick))
        ) {
            errorMessage?.let { msg ->
                Column {
                    Spacer(Modifier.height(12.dp))
                    ValidationPanel(message = msg)
                }
            }
        }

        // Result
        AnimatedVisibility(
            visible = result != null,
            enter = expandVertically(tween(BNBUMotion.Emphasized)) + fadeIn(tween(BNBUMotion.Standard)),
            exit = shrinkVertically(tween(BNBUMotion.Standard)) + fadeOut(tween(BNBUMotion.Quick))
        ) {
            result?.let { score ->
                Column {
                    Spacer(Modifier.height(16.dp))
                    SectionTitle(
                        eyebrow = interfaceText("结果", "Result"),
                        title = stringResource(R.string.endurance_result)
                    )

                    Spacer(Modifier.height(8.dp))

                    val scoreColor = when (score.tier) {
                        "excellent" -> cs.primary
                        "good" -> cs.tertiary
                        "pass" -> cs.secondary
                        "fail" -> cs.error
                        else -> cs.onSurfaceVariant
                    }

                    SwissPanel {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = stringResource(R.string.endurance_score),
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = "${score.score}",
                            color = scoreColor,
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = stringResource(R.string.endurance_level),
                            color = cs.onSurfaceVariant,
                            style = MaterialTheme.typography.labelMedium
                        )
                        StatusBadge(text = score.localizedTierLabel(), filled = true)
                    }
                }

                Spacer(Modifier.height(14.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cs.primaryContainer, MaterialTheme.shapes.small)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = stringResource(R.string.endurance_input_time, score.timeSeconds / 60, score.timeSeconds % 60),
                        color = cs.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = studentLabel,
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                    }
                }
            }
        }
    }
}

/** Mirrors the initialized demo bands only; production conversion always uses the server table. */
private fun previewEnduranceResult(
    timeSeconds: Int,
    gender: String,
    gradeLevel: String
): EnduranceScoreResult {
    val juniorOrSenior = gradeLevel == "junior" || gradeLevel == "senior"
    val bands = when {
        gender == "male" && !juniorOrSenior -> listOf(
            120..240 to (100 to "excellent"), 241..270 to (90 to "good"),
            271..330 to (80 to "pass"), 331..390 to (60 to "pass"), 391..600 to (40 to "fail")
        )
        gender == "male" -> listOf(
            120..250 to (100 to "excellent"), 251..280 to (90 to "good"),
            281..340 to (80 to "pass"), 341..400 to (60 to "pass"), 401..600 to (40 to "fail")
        )
        !juniorOrSenior -> listOf(
            120..210 to (100 to "excellent"), 211..240 to (90 to "good"),
            241..300 to (80 to "pass"), 301..360 to (60 to "pass"), 361..600 to (40 to "fail")
        )
        else -> listOf(
            120..220 to (100 to "excellent"), 221..250 to (90 to "good"),
            251..310 to (80 to "pass"), 311..370 to (60 to "pass"), 371..600 to (40 to "fail")
        )
    }
    val converted = when {
        timeSeconds < bands.first().first.first -> 100 to "excellent"
        timeSeconds > bands.last().first.last -> 0 to "fail"
        else -> bands.firstOrNull { timeSeconds in it.first }?.second ?: (0 to "fail")
    }
    return EnduranceScoreResult(
        score = converted.first,
        tier = converted.second,
        timeSeconds = timeSeconds,
        gender = gender,
        gradeLevel = gradeLevel,
        gradeGroup = if (juniorOrSenior) "junior_senior" else "freshman_sophomore"
    )
}

private fun StudentProfile.localizedDemographicLabel(): String {
    val gender = when (gender) {
        "male" -> interfaceText("男", "Male")
        "female" -> interfaceText("女", "Female")
        else -> gender
    }
    val grade = when (gradeLevel) {
        "freshman" -> interfaceText("大一", "Year 1")
        "sophomore" -> interfaceText("大二", "Year 2")
        "junior" -> interfaceText("大三", "Year 3")
        "senior" -> interfaceText("大四", "Year 4")
        else -> gradeLevel
    }
    return listOf(gender, grade).filter { it.isNotBlank() }.joinToString(" · ")
}

private fun EnduranceScoreResult.localizedTierLabel(): String = when (tier) {
    "excellent" -> interfaceText("优秀", "Excellent")
    "good" -> interfaceText("良好", "Good")
    "pass" -> interfaceText("及格", "Pass")
    "fail" -> interfaceText("不及格", "Fail")
    else -> tier
}
