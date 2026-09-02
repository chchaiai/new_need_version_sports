package edu.bnbu.student.mvp.feature.login

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.UniversityBrandLockup
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable

@Composable
fun LoginScreen(
    onEmailLogin: () -> Unit,
    onScanJoin: () -> Unit,
    onRecoveryRequest: () -> Unit,
    onOpenPrivacy: () -> Unit = {},
    privacyAccepted: Boolean = false,
    onPrivacyAcceptedChange: (Boolean) -> Unit = {},
    onLocalReview: (() -> Unit)? = null,
) {
    val colors = MaterialTheme.colorScheme

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
            .padding(top = 16.dp, bottom = 28.dp)
            .testTag("screen.login"),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp)
        ) {
            UniversityBrandLockup(modifier = Modifier.fillMaxWidth())

            Spacer(Modifier.height(40.dp))

            Text(
                text = stringResource(R.string.login_title),
                color = colors.onBackground,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.login_subtitle),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(Modifier.height(32.dp))

            SwissPanel(contentPadding = 20.dp) {
                Text(
                    text = stringResource(R.string.login_choose_method),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(20.dp))

                PrivacyConsentRow(
                    checked = privacyAccepted,
                    onCheckedChange = onPrivacyAcceptedChange,
                    onOpenPrivacy = onOpenPrivacy
                )

                Spacer(Modifier.height(24.dp))
                LoginMethodButton(
                    title = stringResource(R.string.login_email_button),
                    subtitle = stringResource(R.string.login_email_hint),
                    icon = Icons.Filled.Email,
                    primary = true,
                    enabled = privacyAccepted,
                    modifier = Modifier.testTag("login.email"),
                    onClick = onEmailLogin
                )
                HorizontalDivider(
                    modifier = Modifier.padding(top = 24.dp),
                    color = colors.outlineVariant.copy(alpha = 0.6f)
                )
                SectionLabel(label = stringResource(R.string.login_other_methods))

                LoginMethodButton(
                    title = stringResource(R.string.login_scan_button),
                    subtitle = stringResource(R.string.login_scan_hint),
                    icon = Icons.Filled.QrCodeScanner,
                    primary = false,
                    enabled = privacyAccepted,
                    modifier = Modifier.testTag("login.scanJoin"),
                    onClick = onScanJoin
                )

                if (onLocalReview != null) {
                    HorizontalDivider(
                        modifier = Modifier.padding(top = 24.dp),
                        color = colors.outlineVariant.copy(alpha = 0.6f)
                    )
                    SectionLabel(label = stringResource(R.string.login_local_review_section))
                    Text(
                        text = stringResource(R.string.login_local_review_description),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    LoginMethodButton(
                        title = stringResource(R.string.login_local_review_button),
                        subtitle = stringResource(R.string.login_local_review_hint),
                        icon = Icons.Filled.Person,
                        primary = false,
                        enabled = privacyAccepted,
                        modifier = Modifier.testTag("login.localReview"),
                        onClick = onLocalReview
                    )
                }

            }

            Spacer(Modifier.height(12.dp))
            TextButton(
                onClick = onRecoveryRequest,
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 10.dp),
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .heightIn(min = 48.dp)
                    .testTag("login.recoveryRequest")
            ) {
                Text(
                    text = stringResource(R.string.login_recovery),
                    style = MaterialTheme.typography.labelLarge
                )
            }

        }
    }
}

@Composable
private fun PrivacyConsentRow(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    onOpenPrivacy: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val privacyText = buildAnnotatedString {
        append(stringResource(R.string.login_privacy_prefix))
        append(" ")
        withLink(
            LinkAnnotation.Clickable(
                tag = "privacy",
                styles = TextLinkStyles(
                    style = SpanStyle(
                        color = colors.primary,
                        fontWeight = FontWeight.Medium
                    )
                ),
                linkInteractionListener = { onOpenPrivacy() }
            )
        ) {
            append(stringResource(R.string.login_privacy_policy))
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("login.privacyConsent"),
        shape = MaterialTheme.shapes.medium,
        color = colors.surfaceContainerHigh,
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Checkbox(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = CheckboxDefaults.colors(checkedColor = colors.primary)
            )
            Spacer(Modifier.width(4.dp))
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(top = 11.dp, end = 4.dp)
            ) {
                Text(
                    text = privacyText,
                    color = colors.onSurface,
                    style = MaterialTheme.typography.bodyMedium
                )
                AnimatedVisibility(visible = !checked) {
                    Text(
                        text = stringResource(R.string.login_privacy_required),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun LoginMethodButton(
    title: String,
    subtitle: String,
    icon: ImageVector,
    primary: Boolean,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val containerColor by animateColorAsState(
        targetValue = when {
            !enabled -> colors.surfaceContainerHigh
            primary -> colors.primary
            else -> colors.surface
        },
        label = "methodContainer"
    )
    val contentColor by animateColorAsState(
        targetValue = when {
            !enabled -> colors.onSurfaceVariant.copy(alpha = 0.58f)
            primary -> colors.onPrimary
            else -> colors.onSurface
        },
        label = "methodContent"
    )

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .bnbuClickable(
                enabled = enabled,
                role = Role.Button,
                onClick = onClick
            ),
        shape = MaterialTheme.shapes.large,
        color = containerColor,
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = if (primary && enabled) {
                    colors.onPrimary.copy(alpha = 0.14f)
                } else {
                    colors.primary.copy(alpha = if (enabled) 0.1f else 0.06f)
                }
            ) {
                Box(
                    modifier = Modifier.size(36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (!primary && enabled) colors.primary else contentColor,
                        modifier = Modifier.size(19.dp)
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = contentColor,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = subtitle,
                    color = contentColor.copy(alpha = 0.74f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.width(8.dp))
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = contentColor.copy(alpha = 0.72f),
                modifier = Modifier.size(19.dp)
            )
        }
    }
}

@Composable
private fun SectionLabel(label: String) {
    Text(
        text = label,
        modifier = Modifier.padding(top = 28.dp, bottom = 12.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Medium
    )
}
