package edu.bnbu.student.mvp.feature.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.BrandMark
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.studentNumberForDisplay
import edu.bnbu.student.mvp.core.model.studentStatusLabel
import edu.bnbu.student.mvp.core.state.StudentAppState

/** Full account information, opened from the profile header instead of the main Profile tab. */
@Composable
fun AccountDetailsScreen(
    appState: StudentAppState,
    onBack: () -> Unit
) {
    BackHandler(onBack = onBack)
    val colors = MaterialTheme.colorScheme
    val student = appState.workspace.student
    val pendingCalculation = stringResource(R.string.profile_pending_calculation)
    val pendingValue = stringResource(R.string.profile_pending)
    val gender = when (student.gender.trim().lowercase()) {
        "male" -> interfaceText("男", "Male")
        "female" -> interfaceText("女", "Female")
        else -> pendingValue
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .bnbuClickable(
                        onClickLabel = stringResource(R.string.common_back),
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
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.common_back), color = colors.onSurface)
            }
        }
        item {
            Text(
                text = stringResource(R.string.profile_account_details),
                color = colors.onSurface,
                style = MaterialTheme.typography.headlineSmall
            )
        }
        item {
            SwissPanel {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    BrandMark(compact = true)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = student.name,
                            color = colors.onSurface,
                            style = MaterialTheme.typography.titleLarge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
        item {
            SwissPanel {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    AccountDetailRow(stringResource(R.string.profile_name), student.name)
                    AccountDetailRow(
                        stringResource(R.string.profile_student_id),
                        student.studentNumberForDisplay()
                    )
                    AccountDetailRow(
                        interfaceText("学生状态", "Student status"),
                        studentStatusLabel(student.status)
                    )
                    AccountDetailRow(stringResource(R.string.profile_gender), gender)
                    AccountDetailRow(stringResource(R.string.profile_class), student.className)
                    AccountDetailRow(
                        stringResource(R.string.profile_admission_year),
                        student.admissionYear?.toString() ?: stringResource(R.string.profile_pending)
                    )
                    AccountDetailRow(
                        stringResource(R.string.profile_current_grade),
                        student.localizedGradeLabel().ifBlank { pendingCalculation }
                    )
                    if (student.currentAcademicYear.isNotBlank()) {
                        AccountDetailRow(
                            stringResource(R.string.profile_calculation_year),
                            student.currentAcademicYear
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountDetailRow(label: String, value: String) {
    val colors = MaterialTheme.colorScheme
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Text(
            text = label,
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = value,
            color = colors.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.End,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis
        )
    }
}
