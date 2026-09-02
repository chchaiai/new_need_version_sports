package edu.bnbu.student.mvp.feature.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable

/** Lists user-visible changes for the version installed on this device. */
@Composable
fun ChangelogScreen(onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    val colors = MaterialTheme.colorScheme

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .bnbuClickable(onClick = onBack)
                    .padding(top = 12.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = stringResource(R.string.common_back),
                    tint = colors.onSurface
                )
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.common_back), color = colors.onSurface)
            }
        }
        item {
            Text(
                text = stringResource(R.string.changelog_title),
                color = colors.onSurface,
                style = MaterialTheme.typography.headlineSmall
            )
        }
        item {
            SwissPanel {
                Text(
                    text = BuildConfig.VERSION_NAME,
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleLarge
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.changelog_initial_release),
                    color = colors.primary,
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(Modifier.height(14.dp))
                ChangelogItem(stringResource(R.string.changelog_feature_core))
                ChangelogItem(stringResource(R.string.changelog_feature_support))
                ChangelogItem(stringResource(R.string.changelog_feature_offline))
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun ChangelogItem(text: String) {
    val colors = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.Top) {
        Text("•", color = colors.primary, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.width(8.dp))
        Text(
            text = text,
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
    }
    Spacer(Modifier.height(10.dp))
}
