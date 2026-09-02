package edu.bnbu.student.mvp.feature.profile

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BrandMark
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.SegmentedControl
import edu.bnbu.student.mvp.core.designsystem.StatusBadge
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.Membership
import edu.bnbu.student.mvp.core.model.AppThemeMode
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.model.StudentProfile
import edu.bnbu.student.mvp.core.model.studentStatusLabel
import edu.bnbu.student.mvp.core.model.studentNumberForDisplay
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.R
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
private fun ApplicationPanel(
    onOpenExemption: (String?) -> Unit,
    onOpenEnduranceScoring: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionTitle(
            eyebrow = stringResource(R.string.profile_services_eyebrow),
            title = stringResource(R.string.profile_services_title)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ServiceShortcut(
                title = stringResource(R.string.profile_exemption),
                description = stringResource(R.string.profile_exemption_short_hint),
                icon = Icons.Filled.FitnessCenter,
                modifier = Modifier.weight(1f),
                onClick = { onOpenExemption(null) }
            )
            ServiceShortcut(
                title = stringResource(R.string.profile_endurance),
                description = stringResource(R.string.profile_endurance_short_hint),
                icon = Icons.Filled.Timer,
                modifier = Modifier.weight(1f),
                onClick = onOpenEnduranceScoring
            )
        }
    }
}

@Composable
private fun ServiceShortcut(
    title: String,
    description: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = modifier.bnbuClickable(onClick = onClick),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = cs.surface)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(cs.primaryContainer, MaterialTheme.shapes.medium),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(21.dp)
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = description,
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun ProfileScreen(
    appState: StudentAppState,
    onOpenAccountDetails: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onOpenExemption: (String?) -> Unit = {},
    onOpenEnduranceScoring: () -> Unit = {}
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item { ProfileHeader(appState, onOpenAccountDetails, onOpenSettings) }

        item { ApplicationPanel(onOpenExemption, onOpenEnduranceScoring) }
        item { TeacherPanel(appState) }
        item { IdentityPanel(appState) }
        item { Spacer(Modifier.height(40.dp)) }
    }
}

@Composable
private fun ProfileHeader(
    appState: StudentAppState,
    onOpenAccountDetails: () -> Unit,
    onOpenSettings: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val student = appState.workspace.student
    val pendingCalculation = stringResource(R.string.profile_pending_calculation)

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.profile_heading),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onOpenSettings) {
                Icon(
                    imageVector = Icons.Filled.Settings,
                    contentDescription = stringResource(R.string.profile_settings),
                    tint = cs.onSurface
                )
            }
        }
        SwissPanel(
            modifier = Modifier.bnbuClickable(
                onClickLabel = stringResource(R.string.profile_account_details),
                onClick = onOpenAccountDetails
            )
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    BrandMark(compact = true)
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = student.name,
                            color = cs.onSurface,
                            style = MaterialTheme.typography.headlineSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    StatusBadge(text = studentStatusLabel(student.status), filled = true)
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }

                ProfileFacts(
                    studentId = student.studentNumberForDisplay(),
                    className = student.className,
                    grade = student.localizedGradeLabel().ifBlank { pendingCalculation }
                )
            }
        }
    }
}

@Composable
private fun ProfileFacts(studentId: String, className: String, grade: String) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(cs.surfaceVariant, MaterialTheme.shapes.medium)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        ProfileFact(
            label = stringResource(R.string.profile_student_id_short),
            value = studentId,
            maxLines = 2
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ProfileFact(
                label = stringResource(R.string.profile_class_short),
                value = className.ifBlank { "—" },
                modifier = Modifier.weight(1f),
                maxLines = 2
            )
            ProfileFact(
                label = stringResource(R.string.profile_grade_short),
                value = grade,
                modifier = Modifier.weight(1f),
                maxLines = 2
            )
        }
    }
}

@Composable
private fun ProfileFact(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    maxLines: Int = 1
) {
    val cs = MaterialTheme.colorScheme
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(text = label, color = cs.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
        Text(
            text = value,
            color = cs.onSurface,
            style = MaterialTheme.typography.labelMedium,
            maxLines = maxLines,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun TeacherPanel(appState: StudentAppState) {
    val cs = MaterialTheme.colorScheme
    val teachers = appState.workspace.teachers
    if (teachers.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionTitle(
            eyebrow = stringResource(R.string.profile_teacher_eyebrow),
            title = stringResource(R.string.profile_teacher_title)
        )
        SwissPanel {
            Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                teachers.forEachIndexed { index, teacher ->
                    if (index > 0) {
                        HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                    }
                    Row(
                        modifier = Modifier.padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = null,
                            tint = cs.primary,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = teacher.teacherName,
                                color = cs.onSurface,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = stringResource(R.string.profile_teacher_role),
                                color = cs.onSurfaceVariant,
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun IdentityPanel(appState: StudentAppState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionTitle(
            eyebrow = stringResource(R.string.profile_identity_eyebrow),
            title = stringResource(R.string.profile_identity_title)
        )

        if (appState.workspace.memberships.isEmpty()) {
            EmptyPlaceholder(
                title = stringResource(R.string.profile_no_memberships),
                message = stringResource(R.string.profile_no_memberships_hint)
            )
        } else {
            SwissPanel {
                Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                    appState.workspace.memberships.forEachIndexed { index, membership ->
                        if (index > 0) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f))
                        }
                        MembershipContent(membership, modifier = Modifier.padding(vertical = 12.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun MembershipContent(membership: Membership, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "${membership.typeTitle} · ${membership.organization}",
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = stringResource(R.string.profile_valid_until, membership.validUntil.toDisplayDate()),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusBadge(text = membership.status, filled = membership.status == "认证有效")
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.profile_offset, membership.offset),
                        color = cs.primary,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }

        if (membership.comment.isNotBlank() && membership.comment != "offset") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(cs.surfaceVariant, MaterialTheme.shapes.small)
                    .padding(10.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Filled.Notifications,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = membership.comment,
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

private fun String.toDisplayDate(): String {
    val rawDate = take(10)
    return runCatching {
        LocalDate.parse(rawDate).format(
            DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.MEDIUM)
                .withLocale(AppLanguagePreferences.currentLocale)
        )
    }.getOrDefault(rawDate)
}

/** Full settings page, opened from the gear button in the Profile header. */
@Composable
fun ProfileSettingsScreen(
    appState: StudentAppState,
    onBack: () -> Unit,
    onOpenContactBinding: () -> Unit = {},
    onOpenAccountDeletion: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
    onOpenHelpCenter: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenAbout: () -> Unit = {}
) {
    BackHandler(onBack = onBack)
    val cs = MaterialTheme.colorScheme

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
                    tint = cs.onSurface
                )
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.common_back), color = cs.onSurface)
            }
        }
        item {
            Text(
                text = stringResource(R.string.profile_settings),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineSmall
            )
        }
        item {
            SettingsPanel(
                appState = appState,
                onOpenContactBinding = onOpenContactBinding,
                onOpenAccountDeletion = onOpenAccountDeletion,
                onOpenPrivacy = onOpenPrivacy,
                onOpenHelpCenter = onOpenHelpCenter,
                onOpenFeedback = onOpenFeedback,
                onOpenAbout = onOpenAbout
            )
        }
        item { Spacer(Modifier.height(40.dp)) }
    }
}

@Composable
private fun SettingsPanel(
    appState: StudentAppState,
    onOpenContactBinding: () -> Unit = {},
    onOpenAccountDeletion: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
    onOpenHelpCenter: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenAbout: () -> Unit = {}
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val chineseLanguageLabel = stringResource(R.string.profile_chinese)
    val englishLanguageLabel = stringResource(R.string.profile_english)
    var showLogoutConfirmation by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SwissPanel {
            Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                GroupLabel(stringResource(R.string.profile_account_security), modifier = Modifier.padding(bottom = 4.dp))
                NavigationSettingRow(
                    title = stringResource(R.string.profile_login_contacts),
                    icon = Icons.Filled.Email,
                    onClick = onOpenContactBinding
                )
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                NavigationSettingRow(
                    title = interfaceText("注销账户", "Delete account"),
                    icon = Icons.Filled.DeleteForever,
                    onClick = onOpenAccountDeletion
                )
            }
        }

        SwissPanel {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GroupLabel(stringResource(R.string.profile_preferences))
                Text(
                    text = stringResource(R.string.profile_appearance),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium
                )
                SegmentedControl(
                    values = AppThemeMode.entries,
                    selected = appState.themeMode,
                    label = {
                        when (it) {
                            AppThemeMode.Light -> stringResource(R.string.theme_light)
                            AppThemeMode.Dark -> stringResource(R.string.theme_dark)
                            AppThemeMode.System -> stringResource(R.string.theme_system)
                        }
                    },
                    onSelected = appState::updateThemeMode
                )
                Text(
                    text = stringResource(R.string.profile_appearance_hint),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                Text(
                    text = stringResource(R.string.profile_language),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.titleMedium
                )
                SegmentedControl(
                    values = AppLanguage.entries,
                    selected = appState.appLanguage,
                    label = { if (it == AppLanguage.Chinese) chineseLanguageLabel else englishLanguageLabel },
                    onSelected = { language ->
                        if (language != appState.appLanguage) {
                            if (appState.updateAppLanguage(language)) {
                                context.findActivity()?.recreate()
                            }
                        }
                    }
                )
                Text(
                    text = stringResource(R.string.profile_language_hint),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        SwissPanel {
            Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                GroupLabel(stringResource(R.string.profile_help_support), modifier = Modifier.padding(bottom = 4.dp))
                NavigationSettingRow(title = stringResource(R.string.profile_help_center), icon = Icons.AutoMirrored.Filled.HelpOutline, onClick = onOpenHelpCenter)
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                NavigationSettingRow(title = stringResource(R.string.profile_privacy), icon = Icons.Filled.FitnessCenter, onClick = onOpenPrivacy)
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                NavigationSettingRow(title = stringResource(R.string.profile_feedback), icon = Icons.Filled.Notifications, onClick = onOpenFeedback)
                HorizontalDivider(color = cs.outlineVariant.copy(alpha = 0.45f))
                NavigationSettingRow(
                    title = stringResource(R.string.profile_about),
                    icon = Icons.Filled.Info,
                    onClick = onOpenAbout
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth().bnbuClickable { showLogoutConfirmation = true },
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = cs.errorContainer)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Clear,
                    contentDescription = null,
                    tint = cs.error,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = stringResource(R.string.profile_logout),
                    color = cs.onErrorContainer,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = cs.error,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        if (showLogoutConfirmation) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirmation = false },
                title = { Text(stringResource(R.string.profile_logout)) },
                text = { Text(stringResource(R.string.profile_logout_confirmation_message)) },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirmation = false }) {
                        Text(stringResource(R.string.common_cancel))
                    }
                },
                confirmButton = {
                    TextButton(onClick = appState::logout) {
                        Text(stringResource(R.string.profile_logout))
                    }
                }
            )
        }
    }
}

private tailrec fun Context.findActivity(): android.app.Activity? = when (this) {
    is android.app.Activity -> this
    is android.content.ContextWrapper -> baseContext.findActivity()
    else -> null
}

internal fun StudentProfile.localizedGradeLabel(): String = when (gradeLevel) {
    "freshman" -> interfaceText("大一", "Year 1")
    "sophomore" -> interfaceText("大二", "Year 2")
    "junior" -> interfaceText("大三", "Year 3")
    "senior" -> interfaceText("大四", "Year 4")
    else -> gradeLevel
}

@Composable
private fun GroupLabel(title: String, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Text(
        text = title,
        modifier = modifier,
        color = cs.onSurface,
        style = MaterialTheme.typography.titleMedium
    )
}

@Composable
private fun NavigationSettingRow(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .bnbuClickable(onClick = onClick)
            .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = cs.primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = title,
            color = cs.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = cs.onSurfaceVariant,
            modifier = Modifier.size(18.dp)
        )
    }
}
