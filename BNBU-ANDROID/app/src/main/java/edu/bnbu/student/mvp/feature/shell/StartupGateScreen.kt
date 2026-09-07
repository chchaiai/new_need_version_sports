package edu.bnbu.student.mvp.feature.shell

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.StartupSurfaceState
import edu.bnbu.student.mvp.core.designsystem.AppleButton
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton
import edu.bnbu.student.mvp.core.designsystem.BNBULayout

/**
 * Visible startup envelope for work that can take longer than the Android system splash.
 * It never turns an unavailable server result into a normal business state.
 */
@Composable
internal fun StartupGateScreen(
    state: StartupSurfaceState,
    allowLocalReview: Boolean,
    onRetry: () -> Unit,
    onEnterLocalReview: () -> Unit,
    onInitialSurfaceReady: () -> Unit = {}
) {
    if (state == StartupSurfaceState.APP) return

    val stateDescription = stringResource(
        if (state == StartupSurfaceState.LOADING) {
            R.string.startup_loading_state_description
        } else {
            R.string.startup_error_state_description
        }
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colorResource(R.color.bnbu_splash_background))
            .safeDrawingPadding()
            .padding(horizontal = BNBULayout.ScreenHorizontal)
            .onGloballyPositioned { onInitialSurfaceReady() }
            .testTag("startup.surface"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .widthIn(max = 520.dp)
                .verticalScroll(rememberScrollState())
                .padding(vertical = BNBULayout.Space32),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(R.drawable.splash_main_system_generated),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .size(300.dp)
                    .testTag("startup.originalBrand")
            )
            Spacer(Modifier.height(BNBULayout.Space12))

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(
                        if (state == StartupSurfaceState.LOADING) {
                            "startup.loading"
                        } else {
                            "startup.error"
                        }
                    )
                    .semantics {
                        liveRegion = LiveRegionMode.Polite
                        this.stateDescription = stateDescription
                    },
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier.padding(BNBULayout.Space24),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(BNBULayout.Space12)
                ) {
                    if (state == StartupSurfaceState.LOADING) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .size(36.dp)
                                .testTag("startup.loadingIndicator")
                        )
                        Text(
                            text = stringResource(R.string.startup_loading_title),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = stringResource(R.string.startup_loading_message),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Filled.ErrorOutline,
                            contentDescription = stringResource(R.string.startup_error_icon),
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(36.dp)
                        )
                        Text(
                            text = stringResource(R.string.startup_error_title),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = stringResource(R.string.startup_error_message),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        AppleButton(
                            onClick = onRetry,
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = BNBULayout.TouchTarget)
                                .testTag("startup.retry")
                        ) {
                            Text(stringResource(R.string.startup_retry))
                        }

                        if (allowLocalReview) {
                            AppleOutlinedButton(
                                onClick = onEnterLocalReview,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = BNBULayout.TouchTarget)
                                    .testTag("startup.localReview")
                            ) {
                                Text(stringResource(R.string.startup_local_review))
                            }
                            Text(
                                text = stringResource(R.string.startup_local_review_hint),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(BNBULayout.Space24))
            Image(
                painter = painterResource(R.drawable.splash_partner_generated),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .width(152.dp)
                    .height(30.dp)
                    .testTag("startup.originalPartnerBrand")
            )
        }
    }
}
