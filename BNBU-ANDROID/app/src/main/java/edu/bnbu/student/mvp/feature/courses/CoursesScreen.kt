package edu.bnbu.student.mvp.feature.courses

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.PersonOutline
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.TextFields
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton as OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.Course
import edu.bnbu.student.mvp.core.state.StudentAppState

private val CourseCardShape = RoundedCornerShape(18.dp)
private val CourseControlShape = RoundedCornerShape(14.dp)

@Composable
fun CoursesScreen(
    appState: StudentAppState,
    onScanJoin: () -> Unit = {},
    onEnterCode: () -> Unit = {}
) {
    var selectedCourseId by rememberSaveable { mutableStateOf<String?>(null) }

    BackHandler(enabled = selectedCourseId != null) {
        selectedCourseId = null
    }

    AnimatedContent(
        targetState = selectedCourseId,
        modifier = Modifier.fillMaxSize(),
        transitionSpec = {
            val openingDetail = initialState == null && targetState != null
            val direction = if (openingDetail) 1 else -1
            (fadeIn(tween(BNBUMotion.Standard, delayMillis = 40)) +
                slideInHorizontally(
                    tween(BNBUMotion.Emphasized, easing = FastOutSlowInEasing),
                    initialOffsetX = { direction * (it / 9) }
                )).togetherWith(
                fadeOut(tween(BNBUMotion.Quick)) +
                    slideOutHorizontally(
                        tween(BNBUMotion.Standard, easing = FastOutSlowInEasing),
                        targetOffsetX = { -direction * (it / 12) }
                    )
            )
        },
        label = "courseListDetail"
    ) { animatedCourseId ->
        val selectedCourse = animatedCourseId?.let { id ->
            appState.workspace.courses.firstOrNull { it.id == id }
        }
        if (selectedCourse == null) {
            CourseList(
                appState = appState,
                onCourseSelected = { selectedCourseId = it.id },
                onScanJoin = onScanJoin,
                onEnterCode = onEnterCode
            )
        } else {
            CourseDetail(
                course = selectedCourse,
                onBack = { selectedCourseId = null }
            )
        }
    }
}

@Composable
@OptIn(ExperimentalFoundationApi::class)
private fun CourseList(
    appState: StudentAppState,
    onCourseSelected: (Course) -> Unit,
    onScanJoin: () -> Unit,
    onEnterCode: () -> Unit
) {
    var historyExpanded by rememberSaveable { mutableStateOf(false) }
    val courses = appState.workspace.courses
    val historyCourses = courses.filter { it.isHistorical() }
    val currentCourses = courses.filterNot { it in historyCourses }
    val subtitle = when {
        courses.isEmpty() -> interfaceText("课程同步后将在这里显示", "Your courses will appear here after syncing.")
        historyCourses.isEmpty() -> interfaceText("${currentCourses.size} 门课程正在修读", "${currentCourses.size} courses in progress")
        else -> interfaceText("${currentCourses.size} 门正在修读 · ${historyCourses.size} 门历史课程", "${currentCourses.size} in progress · ${historyCourses.size} past courses")
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 8.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            CourseLargeHeader(
                title = interfaceText("我的课程", "My courses"),
                subtitle = subtitle,
                supportingText = interfaceText("每学期仅可选择一门课程", "You may select one course per semester.")
            )
        }

        if (courses.isEmpty()) {
            item {
                EmptyCoursesPanel()
            }
        } else {
            item {
                CourseSectionHeader(
                    title = interfaceText("本学期", "This semester"),
                    count = currentCourses.size
                )
            }

            if (currentCourses.isEmpty()) {
                item {
                    QuietMessagePanel(
                        title = interfaceText("本学期暂无课程", "No courses this semester"),
                        message = interfaceText("你仍可以在下方查看历史课程。", "You can still view past courses below.")
                    )
                }
            } else {
                items(currentCourses, key = { "current-${it.id}" }) { course ->
                    CourseCard(
                        course = course,
                        historical = false,
                        modifier = Modifier.animateItemPlacement(
                            animationSpec = tween(BNBUMotion.Standard, easing = FastOutSlowInEasing)
                        ),
                        onClick = { onCourseSelected(course) }
                    )
                }
            }

            if (historyCourses.isNotEmpty()) {
                item(key = "history-section") {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        HistoryCourseHeader(
                            count = historyCourses.size,
                            expanded = historyExpanded,
                            onClick = { historyExpanded = !historyExpanded }
                        )
                        AnimatedVisibility(
                            visible = historyExpanded,
                            enter = fadeIn(tween(BNBUMotion.Standard)) + expandVertically(
                                animationSpec = tween(
                                    BNBUMotion.Emphasized,
                                    easing = FastOutSlowInEasing
                                )
                            ),
                            exit = fadeOut(tween(BNBUMotion.Quick)) + shrinkVertically(
                                animationSpec = tween(
                                    BNBUMotion.Standard,
                                    easing = FastOutSlowInEasing
                                )
                            )
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                historyCourses.forEach { course ->
                                    CourseCard(
                                        course = course,
                                        historical = true,
                                        onClick = { onCourseSelected(course) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (appState.canStartNewCourseJoin) {
            item(key = "join-course-actions") {
                JoinCourseActions(onScanJoin = onScanJoin, onEnterCode = onEnterCode)
            }
        }
    }
}

@Composable
private fun CourseLargeHeader(
    title: String,
    subtitle: String,
    supportingText: String
) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = title,
            color = colors.onBackground,
            fontSize = 34.sp,
            lineHeight = 41.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.4).sp
        )
        Text(
            text = subtitle,
            color = colors.onSurface,
            fontSize = 17.sp,
            lineHeight = 23.sp
        )
        Text(
            text = supportingText,
            color = colors.onSurfaceVariant,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun CourseSectionHeader(title: String, count: Int, unit: String = interfaceText("门", "courses")) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = colors.onBackground,
            fontSize = 20.sp,
            lineHeight = 25.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "$count $unit",
            color = colors.onSurfaceVariant,
            fontSize = 15.sp,
            lineHeight = 20.sp
        )
    }
}

@Composable
private fun EmptyCoursesPanel() {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = CourseCardShape,
        color = colors.surface
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Text(
                text = interfaceText("还没有课程", "No courses yet"),
                color = colors.onSurface,
                fontSize = 20.sp,
                lineHeight = 25.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText("扫描教师提供的二维码或输入邀请码，加入体育教学班。", "Scan your instructor's QR code or enter an invitation code to join a class."),
                color = colors.onSurfaceVariant,
                fontSize = 15.sp,
                lineHeight = 22.sp
            )
        }
    }
}

@Composable
private fun JoinCourseActions(
    onScanJoin: () -> Unit,
    onEnterCode: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(
            onClick = onScanJoin,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
            shape = CourseControlShape
        ) {
            Icon(
                imageVector = Icons.Filled.QrCodeScanner,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(text = interfaceText("扫描二维码", "Scan QR code"), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
        OutlinedButton(
            onClick = onEnterCode,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
            shape = CourseControlShape
        ) {
            Icon(
                imageVector = Icons.Filled.TextFields,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(text = interfaceText("输入邀请码", "Enter invitation code"), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun QuietMessagePanel(title: String, message: String) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = CourseCardShape,
        color = colors.surface
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(
                text = title,
                color = colors.onSurface,
                fontSize = 17.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = message,
                color = colors.onSurfaceVariant,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }
    }
}

@Composable
private fun HistoryCourseHeader(
    count: Int,
    expanded: Boolean,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val arrowRotation by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        animationSpec = tween(BNBUMotion.Standard, easing = FastOutSlowInEasing),
        label = "historyArrow"
    )
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .bnbuClickable(
                onClickLabel = if (expanded) interfaceText("收起历史课程", "Collapse past courses") else interfaceText("展开历史课程", "Expand past courses"),
                onClick = onClick
            ),
        shape = CourseControlShape,
        color = colors.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 56.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.History,
                contentDescription = null,
                tint = colors.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(12.dp))
            Text(
                text = interfaceText("历史课程", "Past courses"),
                color = colors.onSurface,
                fontSize = 17.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = interfaceText("$count 门", "$count courses"),
                color = colors.onSurfaceVariant,
                fontSize = 15.sp,
                lineHeight = 20.sp
            )
            Spacer(Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = colors.onSurfaceVariant,
                modifier = Modifier
                    .size(22.dp)
                    .graphicsLayer { rotationZ = arrowRotation }
            )
        }
    }
}

@Composable
private fun CourseCard(
    course: Course,
    historical: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .bnbuClickable(
                onClickLabel = interfaceText("查看${course.name}详情", "View ${course.name} details"),
                onClick = onClick
            ),
        shape = CourseCardShape,
        color = colors.surface
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 17.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.Top) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Text(
                        text = course.name,
                        color = colors.onSurface,
                        fontSize = 20.sp,
                        lineHeight = 26.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Spacer(Modifier.width(10.dp))
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = colors.onSurfaceVariant,
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .size(22.dp)
                )
            }

            HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.55f))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                CourseMetaLine(
                    icon = Icons.Filled.PersonOutline,
                    text = course.teacher.ifBlank { interfaceText("任课教师待公布", "Instructor to be announced") }
                )
                CourseMetaLine(
                    icon = Icons.Filled.CalendarMonth,
                    text = course.safeSemesterDisplayLabel()
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                CourseStatusPill(
                    text = if (historical) {
                        course.semesterStatus.semesterStatusLabel()
                    } else {
                        course.enrollmentStatus.enrollmentStatusLabel()
                    },
                    emphasized = !historical && course.hasActiveMembership
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = course.safeSemesterDisplayLabel(),
                    modifier = Modifier.weight(1f),
                    color = colors.onSurfaceVariant,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (historical && course.finalGrade != null) {
                HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.55f))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = interfaceText("最终成绩", "Final grade"),
                        modifier = Modifier.weight(1f),
                        color = colors.onSurfaceVariant,
                        fontSize = 14.sp,
                        lineHeight = 19.sp
                    )
                    Text(
                        text = interfaceText("${course.finalGrade} 分", "${course.finalGrade} points"),
                        color = colors.onSurface,
                        fontSize = 17.sp,
                        lineHeight = 22.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun CourseMetaLine(icon: ImageVector, text: String) {
    val colors = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.onSurfaceVariant,
            modifier = Modifier.size(19.dp)
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = text,
            modifier = Modifier.weight(1f),
            color = colors.onSurface,
            fontSize = 15.sp,
            lineHeight = 20.sp,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun CourseDetail(
    course: Course,
    onBack: () -> Unit
) {
    val isHistoricalCourse = course.isHistorical()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 2.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            CourseDetailNavigation(onBack = onBack)
        }
        item {
            CourseDetailHeader(course = course, historical = isHistoricalCourse)
        }
        item {
            CourseInformationPanel(course = course)
        }
        if (isHistoricalCourse) {
            item {
                FinalGradePanel(course = course)
            }
        }
    }
}

@Composable
private fun CourseDetailNavigation(onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .bnbuClickable(onClickLabel = interfaceText("返回我的课程", "Back to my courses"), onClick = onBack),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = interfaceText("返回", "Back"),
            tint = colors.primary,
            modifier = Modifier
                .padding(horizontal = 10.dp)
                .size(24.dp)
        )
        Text(
            text = interfaceText("我的课程", "My courses"),
            color = colors.primary,
            fontSize = 17.sp,
            lineHeight = 22.sp
        )
    }
}

@Composable
private fun CourseDetailHeader(course: Course, historical: Boolean) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = course.name,
            color = colors.onBackground,
            fontSize = 30.sp,
            lineHeight = 37.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.25).sp
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            CourseStatusPill(
                text = if (historical) {
                    course.semesterStatus.semesterStatusLabel()
                } else {
                    course.enrollmentStatus.enrollmentStatusLabel()
                },
                emphasized = !historical && course.hasActiveMembership
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = course.safeSemesterDisplayLabel(),
                modifier = Modifier.weight(1f),
                color = colors.onSurfaceVariant,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun CourseInformationPanel(course: Course) {
    val facts = listOf(
        CourseFact(interfaceText("任课教师", "Instructor"), course.teacher.ifBlank { interfaceText("待公布", "To be announced") }),
        CourseFact(
            interfaceText("开课学期", "Teaching term"),
            course.safeSemesterDisplayLabel()
        )
    )
    CourseGroupedPanel {
        facts.forEachIndexed { index, fact ->
            DetailFactRow(label = fact.label, value = fact.value)
            if (index != facts.lastIndex) {
                HorizontalDivider(
                    modifier = Modifier.padding(start = 92.dp),
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
                )
            }
        }
    }
}

@Composable
private fun FinalGradePanel(course: Course) {
    val colors = MaterialTheme.colorScheme
    CourseGroupedPanel {
        Text(
            text = interfaceText("最终成绩", "Final grade"),
            color = colors.onSurfaceVariant,
            fontSize = 14.sp,
            lineHeight = 19.sp
        )
        Spacer(Modifier.height(8.dp))
        val finalGrade = course.finalGrade
        if (finalGrade == null) {
            Text(
                text = interfaceText("暂未发布", "Not published"),
                color = colors.onSurface,
                fontSize = 20.sp,
                lineHeight = 26.sp,
                fontWeight = FontWeight.SemiBold
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = interfaceText("$finalGrade 分", "$finalGrade points"),
                    modifier = Modifier.weight(1f),
                    color = colors.onSurface,
                    fontSize = 30.sp,
                    lineHeight = 35.sp,
                    fontWeight = FontWeight.SemiBold
                )
                CourseStatusPill(
                    text = course.gradeStatus.gradeStatusLabel(finalGrade),
                    emphasized = course.gradeStatus != "fail" && finalGrade >= 60,
                    destructive = course.gradeStatus == "fail" || finalGrade < 60
                )
            }
        }
    }
}

@Composable
private fun CourseGroupedPanel(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = CourseCardShape,
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
            content = content
        )
    }
}

@Composable
private fun DetailFactRow(label: String, value: String) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = label,
            modifier = Modifier.width(80.dp),
            color = colors.onSurfaceVariant,
            fontSize = 14.sp,
            lineHeight = 20.sp
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = value,
            modifier = Modifier.weight(1f),
            color = colors.onSurface,
            fontSize = 15.sp,
            lineHeight = 20.sp
        )
    }
}

@Composable
private fun CourseStatusPill(
    text: String,
    emphasized: Boolean = false,
    destructive: Boolean = false
) {
    val colors = MaterialTheme.colorScheme
    val background: Color
    val foreground: Color
    when {
        destructive -> {
            background = colors.errorContainer
            foreground = colors.onErrorContainer
        }
        emphasized -> {
            background = colors.primaryContainer.copy(alpha = 0.82f)
            foreground = colors.onPrimaryContainer
        }
        else -> {
            background = colors.surfaceVariant
            foreground = colors.onSurfaceVariant
        }
    }
    Surface(shape = RoundedCornerShape(999.dp), color = background) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = foreground,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private data class CourseFact(
    val label: String,
    val value: String
)

private fun Course.isHistorical(): Boolean =
    !isCurrent ||
        semesterStatus == "archived" ||
        enrollmentStatus.trim().lowercase() in setOf("completed", "withdrawn", "removed", "exited", "disabled")

private fun String.enrollmentStatusLabel(): String = when (this) {
    "active", "enrolled" -> interfaceText("修读中", "In progress")
    "completed" -> interfaceText("已完成", "Complete")
    "withdrawn" -> interfaceText("已退出课程", "Exited course")
    "removed" -> interfaceText("已移出课程", "Removed from course")
    "exited" -> interfaceText("已退出课程", "Exited course")
    "disabled" -> interfaceText("成员关系已停用", "Membership disabled")
    else -> ifBlank { interfaceText("待确认", "Pending") }
}

internal fun String.semesterTermLabel(): String = when (uppercase()) {
    "FIRST" -> interfaceText("第一学期", "First semester")
    "SECOND" -> interfaceText("第二学期", "Second semester")
    "SUMMER" -> interfaceText("暑期学期", "Summer term")
    else -> ifBlank { interfaceText("学期待设置", "Term pending") }
}

internal fun Course.safeSemesterDisplayLabel(): String {
    semester.safePublicSemesterText(semesterId)?.let { return it }
    return safeSemesterYearTermLabel()
}

internal fun Course.safeSemesterYearTermLabel(): String {
    val year = academicYear.safePublicSemesterText(semesterId)
    val termLabel = term.safePublicSemesterText(semesterId)?.semesterTermLabel()
    return listOfNotNull(year, termLabel)
        .joinToString(" ")
        .ifBlank { interfaceText("学期待定", "Semester pending") }
}

private fun String.safePublicSemesterText(internalSemesterId: String): String? = trim()
    .takeIf(String::isNotEmpty)
    ?.takeUnless { value ->
        value.equals(internalSemesterId.trim(), ignoreCase = true) ||
            UUID_LIKE_SEMESTER_VALUE.matches(value)
    }

private val UUID_LIKE_SEMESTER_VALUE = Regex(
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)

private fun String.semesterStatusLabel(): String = when (this) {
    "upcoming" -> interfaceText("即将开始", "Upcoming")
    "current" -> interfaceText("当前学期", "Current semester")
    "archived" -> interfaceText("历史学期", "Past semester")
    else -> ifBlank { interfaceText("学期待定", "Semester pending") }
}

private fun String?.gradeStatusLabel(finalGrade: Int): String = when (this) {
    "pass" -> interfaceText("及格", "Pass")
    "fail" -> interfaceText("不及格", "Fail")
    else -> if (finalGrade >= 60) interfaceText("及格", "Pass") else interfaceText("不及格", "Fail")
}
