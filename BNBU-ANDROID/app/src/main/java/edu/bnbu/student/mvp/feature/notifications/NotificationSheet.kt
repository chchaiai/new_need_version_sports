package edu.bnbu.student.mvp.feature.notifications

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.StatusBadge
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.pressScale
import edu.bnbu.student.mvp.R
import kotlinx.coroutines.launch

private enum class NotificationFilter(val labelRes: Int) {
    All(R.string.notification_all),
    Unread(R.string.notification_unread),
    Deadline(R.string.notification_deadline),
    Application(R.string.notification_application)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotificationSheet(
    notices: List<StudentNoticeUiModel>,
    unreadCount: Int,
    onDismiss: () -> Unit,
    onMarkRead: (String) -> Unit,
    onMarkAllRead: () -> Unit,
    onOpenExemption: (String?) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var selectedFilter by rememberSaveable { mutableStateOf(NotificationFilter.All) }
    var selectedNoticeId by rememberSaveable { mutableStateOf<String?>(null) }
    var isDismissing by remember { mutableStateOf(false) }
    val selectedNotice = selectedNoticeId?.let { id -> notices.firstOrNull { it.id == id } }
    val dismissSheet: ((() -> Unit)?) -> Unit = dismiss@{ afterDismiss ->
        if (isDismissing) return@dismiss
        isDismissing = true
        scope.launch {
            try {
                sheetState.hide()
                onDismiss()
                afterDismiss?.invoke()
            } finally {
                isDismissing = false
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = { dismissSheet(null) },
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        BackHandler(enabled = selectedNotice != null) {
            selectedNoticeId = null
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.82f)
                .navigationBarsPadding()
                .padding(horizontal = 18.dp)
        ) {
            NotificationSheetHeader(
                unreadCount = unreadCount,
                showingDetail = selectedNotice != null,
                onBack = { selectedNoticeId = null },
                onMarkAllRead = onMarkAllRead,
                onDismiss = { dismissSheet(null) }
            )

            AnimatedContent(
                targetState = selectedNoticeId,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                transitionSpec = {
                    val openingDetail = targetState != null
                    val enterOffset: (Int) -> Int = { width ->
                        if (openingDetail) width / 10 else -width / 10
                    }
                    val exitOffset: (Int) -> Int = { width ->
                        if (openingDetail) -width / 14 else width / 14
                    }
                    (fadeIn(
                        animationSpec = tween(
                            durationMillis = BNBUMotion.Standard,
                            easing = FastOutSlowInEasing
                        )
                    ) + slideInHorizontally(
                        animationSpec = tween(
                            durationMillis = BNBUMotion.Standard,
                            easing = FastOutSlowInEasing
                        ),
                        initialOffsetX = enterOffset
                    )) togetherWith (fadeOut(
                        animationSpec = tween(durationMillis = BNBUMotion.Quick)
                    ) + slideOutHorizontally(
                        animationSpec = tween(durationMillis = BNBUMotion.Standard),
                        targetOffsetX = exitOffset
                    ))
                },
                label = "notificationListDetail"
            ) { activeNoticeId ->
                val activeNotice = activeNoticeId?.let { id -> notices.firstOrNull { it.id == id } }
                if (activeNotice != null) {
                    NotificationDetail(
                        notice = activeNotice,
                        onMarkRead = onMarkRead
                    )
                } else {
                    NotificationList(
                        notices = notices,
                        selectedFilter = selectedFilter,
                        onFilterSelected = { selectedFilter = it },
                        onNoticeSelected = { notice ->
                            if (notice.isUnread) onMarkRead(notice.id)
                            if (notice.opensExemption) {
                                dismissSheet { onOpenExemption(notice.targetId) }
                            } else {
                                selectedNoticeId = notice.id
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun NotificationSheetHeader(
    unreadCount: Int,
    showingDetail: Boolean,
    onBack: () -> Unit,
    onMarkAllRead: () -> Unit,
    onDismiss: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (showingDetail) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = stringResource(R.string.notification_back_list))
                }
            } else {
                Icon(
                    imageVector = if (unreadCount > 0) Icons.Filled.NotificationsActive else Icons.Filled.Notifications,
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(10.dp))
            }
            Text(
                text = stringResource(if (showingDetail) R.string.notification_detail else R.string.notification_title),
                color = cs.onSurface,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onDismiss) {
                Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.notification_close))
            }
        }
        if (!showingDetail) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusBadge(
                    text = if (unreadCount > 0) {
                        pluralStringResource(
                            R.plurals.notification_unread_count,
                            unreadCount,
                            unreadCount
                        )
                    } else {
                        stringResource(R.string.notification_none_unread)
                    }
                )
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onMarkAllRead, enabled = unreadCount > 0) {
                    Text(stringResource(R.string.notification_mark_all))
                }
            }
        }
    }
}

@Composable
@OptIn(ExperimentalFoundationApi::class)
private fun NotificationList(
    notices: List<StudentNoticeUiModel>,
    selectedFilter: NotificationFilter,
    onFilterSelected: (NotificationFilter) -> Unit,
    onNoticeSelected: (StudentNoticeUiModel) -> Unit
) {
    val filtered = remember(notices, selectedFilter) {
        notices.filter { notice ->
            when (selectedFilter) {
                NotificationFilter.All -> true
                NotificationFilter.Unread -> notice.isUnread
                NotificationFilter.Deadline -> notice.kind == StudentNoticeKind.Deadline
                NotificationFilter.Application -> notice.kind == StudentNoticeKind.Review
            }
        }
    }
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(NotificationFilter.entries, key = { it.name }) { filter ->
            val selected = filter == selectedFilter
            val interactionSource = remember { MutableInteractionSource() }
            FilterChip(
                selected = selected,
                onClick = { onFilterSelected(filter) },
                modifier = Modifier.pressScale(interactionSource),
                interactionSource = interactionSource,
                label = {
                    Text(
                        text = stringResource(filter.labelRes),
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                leadingIcon = if (selected) {
                    {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                } else {
                    null
                }
            )
        }
    }

    if (filtered.isEmpty()) {
        EmptyPlaceholder(
            title = stringResource(R.string.notification_empty),
            message = stringResource(R.string.notification_empty_hint)
        )
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(filtered, key = { it.id }) { notice ->
                NotificationRow(
                    notice = notice,
                    modifier = Modifier.animateItemPlacement(
                        animationSpec = tween(BNBUMotion.Standard, easing = FastOutSlowInEasing)
                    ),
                    onClick = { onNoticeSelected(notice) }
                )
            }
        }
    }
}

@Composable
private fun NotificationRow(
    notice: StudentNoticeUiModel,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val iconTint by animateColorAsState(
        targetValue = if (notice.isUnread) cs.primary else cs.onSurfaceVariant,
        animationSpec = BNBUMotion.colorSpec,
        label = "notificationReadTint"
    )
    val containerColor by animateColorAsState(
        targetValue = if (notice.isUnread) cs.surface else cs.surfaceVariant.copy(alpha = 0.55f),
        animationSpec = BNBUMotion.colorSpec,
        label = "notificationReadContainer"
    )
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .background(containerColor)
            .bnbuClickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(
                imageVector = if (notice.isUnread) Icons.Filled.NotificationsActive else Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = notice.title,
                        color = cs.onSurface,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (notice.isUnread) FontWeight.SemiBold else FontWeight.Normal,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = notice.time,
                        color = cs.onSurfaceVariant,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(start = 12.dp)
                    )
                }
                Text(notice.message, color = cs.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun NotificationDetail(notice: StudentNoticeUiModel, onMarkRead: (String) -> Unit) {
    val cs = MaterialTheme.colorScheme
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            SwissPanel {
                Text(notice.title, color = cs.onSurface, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.padding(top = 4.dp))
                Text(notice.time, color = cs.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.padding(top = 6.dp))
                Text(notice.message, color = cs.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
        }
        if (notice.isUnread) {
            item {
                TextButton(onClick = { onMarkRead(notice.id) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.notification_mark_read))
                }
            }
        }
    }
}
