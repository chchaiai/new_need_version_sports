package edu.bnbu.student.mvp.feature.guide

import android.animation.ValueAnimator
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class GuideArtwork {
    CourseJoin,
    DirectJoin,
    StartExercise,
    ExerciseRecord,
    SubmittedRecords,
    Applications
}

private enum class GuideExit { Skip, Finish }

private data class GuideStep(
    val title: String,
    val eyebrow: String,
    val description: String,
    val artwork: GuideArtwork
)

/**
 * Motion stays short and quiet. The horizontal pager provides the primary
 * movement; artwork and copy simply settle into place with the new page.
 */
private object GuideMotion {
    const val PageEnter = 260
    const val FinishFade = 220
    val ContentOffset = 12.dp
}

/**
 * Shown before sign-in. Its content only describes the existing course join
 * path and deliberately avoids showing made-up course or student data.
 */
@Composable
fun PreLoginCourseGuideScreen(
    onStartJoin: () -> Unit,
    onSkipToLogin: () -> Unit
) {
    GuidePagerScreen(
        headerTitle = interfaceText("加入课程", "Join a course"),
        steps = preLoginGuideSteps(),
        skipLabel = interfaceText("直接登录", "Go to sign in"),
        skipDescription = interfaceText(
            "跳过加入课程指引并进入登录页",
            "Skip the course guide and go to sign in"
        ),
        finalActionLabel = interfaceText("开始加入课程", "Start joining a course"),
        onSkip = onSkipToLogin,
        onFinish = onStartJoin
    )
}

/**
 * Shown only after an authenticated account has an active course enrollment.
 * It explains the real exercise and service flow without changing navigation
 * or any course, check-in, or application policy.
 */
@Composable
fun PostEnrollmentGuideScreen(onFinish: () -> Unit) {
    GuidePagerScreen(
        headerTitle = interfaceText("运动指引", "Activity guide"),
        steps = postEnrollmentGuideSteps(),
        skipLabel = interfaceText("跳过", "Skip"),
        skipDescription = interfaceText(
            "跳过运动指引并进入首页",
            "Skip the activity guide and go to Home"
        ),
        finalActionLabel = interfaceText("进入首页", "Go to Home"),
        onSkip = onFinish,
        onFinish = onFinish
    )
}

private fun preLoginGuideSteps(): List<GuideStep> = listOf(
    GuideStep(
        title = interfaceText("先加入课程", "Join your course first"),
        eyebrow = interfaceText(
            "准备课程二维码或邀请码",
            "Have a course QR code or invitation code ready"
        ),
        description = interfaceText(
            "老师会提供课程二维码或邀请码。扫码或手动输入后，即可找到对应课程。",
            "Your teacher provides a course QR code or invitation code. Scan it or enter it manually to find the right course."
        ),
        artwork = GuideArtwork.CourseJoin
    ),
    GuideStep(
        title = interfaceText("确认后直接加入", "Confirm and join directly"),
        eyebrow = interfaceText("核对信息后再加入", "Review before you join"),
        description = interfaceText(
            "核对课程，填写姓名、学号、性别和年级；服务端校验成功后立即加入并进入学生首页，无需等待教师审核。",
            "Review the course and enter your name, student ID, gender, and grade. After server validation, you join immediately and open the student home screen without teacher approval."
        ),
        artwork = GuideArtwork.DirectJoin
    )
)

private fun postEnrollmentGuideSteps(): List<GuideStep> = listOf(
    GuideStep(
        title = interfaceText("开始一次运动", "Start an activity"),
        eyebrow = interfaceText("从首页或“运动”开始", "Start from Home or Exercise"),
        description = interfaceText(
            "选择课程和运动项目后开始计时，完成本次运动任务。",
            "Choose a course and an activity, then start timing your workout."
        ),
        artwork = GuideArtwork.StartExercise
    ),
    GuideStep(
        title = interfaceText("记录运动过程", "Record your activity"),
        eyebrow = interfaceText("计时、暂停后继续", "Time, pause, and resume"),
        description = interfaceText(
            "运动中可暂停后继续，并使用照片或视频记录现场过程。",
            "Pause and resume while you exercise, then use photos or video to capture the activity."
        ),
        artwork = GuideArtwork.ExerciseRecord
    ),
    GuideStep(
        title = interfaceText("提交并查看记录", "Submit and review records"),
        eyebrow = interfaceText("完成后确认并提交", "Confirm and submit when finished"),
        description = interfaceText(
            "补充说明、确认凭证后提交打卡；在“记录”中查看历史运动、时长和媒体。",
            "Add notes, confirm your proof, and submit the check-in. Use Records to review exercise history, duration, and media."
        ),
        artwork = GuideArtwork.SubmittedRecords
    ),
    GuideStep(
        title = interfaceText("需要时提交申请", "Apply when you need to"),
        eyebrow = interfaceText("个人中心 · 服务", "Profile · Services"),
        description = interfaceText(
            "可按性别提交 800 米或 1000 米耐力跑免测，也可提交校队、社团申请，并查看状态、补充材料或重新提交。",
            "Submit the gender-matched 800 m or 1000 m endurance exemption, or a school-team or student-club application, then review status, add documents, or resubmit."
        ),
        artwork = GuideArtwork.Applications
    )
)

@Composable
private fun GuidePagerScreen(
    headerTitle: String,
    steps: List<GuideStep>,
    skipLabel: String,
    skipDescription: String,
    finalActionLabel: String,
    onSkip: () -> Unit,
    onFinish: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { steps.size })
    val scope = rememberCoroutineScope()
    val animationsEnabled = remember { ValueAnimator.areAnimatorsEnabled() }
    var isTransitioning by remember { mutableStateOf(false) }
    var exit by remember { mutableStateOf<GuideExit?>(null) }
    val currentPage = pagerState.currentPage
    val isLastPage = currentPage == steps.lastIndex
    val isFinishing = exit != null
    val screenAlpha by animateFloatAsState(
        targetValue = if (isFinishing) 0f else 1f,
        animationSpec = if (animationsEnabled) tween(GuideMotion.FinishFade) else snap(),
        label = "guideFinishFade"
    )

    fun moveTo(page: Int) {
        if (isTransitioning || isFinishing || page !in steps.indices) return
        scope.launch {
            isTransitioning = true
            if (animationsEnabled) pagerState.animateScrollToPage(page)
            else pagerState.scrollToPage(page)
            isTransitioning = false
        }
    }

    fun requestExit(reason: GuideExit) {
        if (!isTransitioning && !isFinishing) exit = reason
    }

    LaunchedEffect(exit) {
        when (exit) {
            null -> Unit
            GuideExit.Skip -> {
                if (animationsEnabled) delay(GuideMotion.FinishFade.toLong())
                onSkip()
            }
            GuideExit.Finish -> {
                if (animationsEnabled) delay(GuideMotion.FinishFade.toLong())
                onFinish()
            }
        }
    }

    BackHandler(enabled = currentPage > 0 && !isTransitioning && !isFinishing) {
        moveTo(currentPage - 1)
    }

    Scaffold(
        modifier = Modifier.alpha(screenAlpha),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            GuideHeader(
                title = headerTitle,
                currentPage = currentPage,
                skipLabel = skipLabel,
                skipDescription = skipDescription,
                enabled = !isTransitioning && !isFinishing,
                onBack = { moveTo(currentPage - 1) },
                onSkip = { requestExit(GuideExit.Skip) }
            )
        },
        bottomBar = {
            GuideActions(
                currentPage = currentPage,
                totalSteps = steps.size,
                isLastPage = isLastPage,
                finalActionLabel = finalActionLabel,
                enabled = !isTransitioning && !isFinishing,
                animationsEnabled = animationsEnabled,
                onContinue = {
                    if (isLastPage) requestExit(GuideExit.Finish)
                    else moveTo(currentPage + 1)
                }
            )
        }
    ) { innerPadding ->
        HorizontalPager(
            state = pagerState,
            userScrollEnabled = !isTransitioning && !isFinishing,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) { page ->
            GuideStepContent(
                step = steps[page],
                isActive = page == currentPage,
                animationsEnabled = animationsEnabled
            )
        }
    }
}

@Composable
private fun GuideHeader(
    title: String,
    currentPage: Int,
    skipLabel: String,
    skipDescription: String,
    enabled: Boolean,
    onBack: () -> Unit,
    onSkip: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .height(64.dp)
            .padding(horizontal = BNBULayout.ScreenHorizontal),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (currentPage > 0) {
            IconButton(
                onClick = onBack,
                enabled = enabled,
                modifier = Modifier
                    .width(96.dp)
                    .height(BNBULayout.TouchTarget)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = interfaceText("上一步", "Previous step")
                )
            }
        } else {
            Spacer(Modifier.width(96.dp).height(BNBULayout.TouchTarget))
        }
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center
        )
        TextButton(
            onClick = onSkip,
            enabled = enabled,
            modifier = Modifier
                .width(96.dp)
                .heightIn(min = BNBULayout.TouchTarget)
                .semantics { contentDescription = skipDescription }
        ) {
            Text(skipLabel)
        }
    }
}

@Composable
private fun GuideStepContent(
    step: GuideStep,
    isActive: Boolean,
    animationsEnabled: Boolean
) {
    val artworkScale by animateFloatAsState(
        targetValue = if (isActive) 1f else 0.97f,
        animationSpec = if (animationsEnabled) {
            tween(BNBUMotion.Emphasized, easing = FastOutSlowInEasing)
        } else {
            snap()
        },
        label = "guideArtworkScale"
    )
    val artworkAlpha by animateFloatAsState(
        targetValue = if (isActive) 1f else 0.45f,
        animationSpec = if (animationsEnabled) tween(BNBUMotion.Standard) else snap(),
        label = "guideArtworkAlpha"
    )
    val detailAlpha by animateFloatAsState(
        targetValue = if (isActive) 1f else 0f,
        animationSpec = if (animationsEnabled) tween(GuideMotion.PageEnter) else snap(),
        label = "guideDetailAlpha"
    )
    val detailOffset by animateDpAsState(
        targetValue = if (isActive) 0.dp else GuideMotion.ContentOffset,
        animationSpec = if (animationsEnabled) {
            tween(GuideMotion.PageEnter, easing = FastOutSlowInEasing)
        } else {
            snap()
        },
        label = "guideDetailOffset"
    )

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val compactHeight = maxHeight < 500.dp
        val artworkHeight = if (compactHeight) 232.dp else 254.dp
        val verticalPadding = if (compactHeight) BNBULayout.Space4 else BNBULayout.Space16
        val artworkSpacing = if (compactHeight) BNBULayout.Space24 else 36.dp

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    horizontal = BNBULayout.ScreenHorizontal,
                    vertical = verticalPadding
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            GuideArtwork(
                step = step,
                artworkHeight = artworkHeight,
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 360.dp)
                    .scale(artworkScale)
                    .alpha(artworkAlpha)
            )
            Spacer(Modifier.height(artworkSpacing))
            Column(
                modifier = Modifier.graphicsLayer {
                    alpha = detailAlpha
                    translationY = detailOffset.toPx()
                },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = step.eyebrow,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(BNBULayout.Space8))
                Text(
                    text = step.title,
                    color = MaterialTheme.colorScheme.onSurface,
                    style = if (compactHeight) {
                        MaterialTheme.typography.headlineMedium
                    } else {
                        MaterialTheme.typography.headlineLarge
                    },
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(BNBULayout.Space12))
                Text(
                    text = step.description,
                    modifier = Modifier.widthIn(max = 340.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = if (compactHeight) {
                        MaterialTheme.typography.bodyMedium
                    } else {
                        MaterialTheme.typography.bodyLarge
                    },
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun GuideArtwork(
    step: GuideStep,
    artworkHeight: Dp,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier
            .height(artworkHeight)
            .semantics {
                contentDescription = interfaceText(
                    "%1\$s 引导插图",
                    "%1\$s guide illustration"
                ).format(step.title)
            },
        shape = MaterialTheme.shapes.extraLarge,
        color = colors.surfaceContainerLow,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(BNBULayout.Space20)
        ) {
            when (step.artwork) {
                GuideArtwork.CourseJoin -> CourseJoinArtwork()
                GuideArtwork.DirectJoin -> DirectJoinArtwork()
                GuideArtwork.StartExercise -> StartExerciseArtwork()
                GuideArtwork.ExerciseRecord -> ExerciseRecordArtwork()
                GuideArtwork.SubmittedRecords -> SubmittedRecordsArtwork()
                GuideArtwork.Applications -> ApplicationsArtwork()
            }
        }
    }
}

@Composable
private fun CourseJoinArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Row(
                modifier = Modifier.padding(BNBULayout.Space12),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ArtworkIcon(
                    imageVector = Icons.Filled.QrCodeScanner,
                    containerColor = colors.primaryContainer,
                    contentColor = colors.primary
                )
                Spacer(Modifier.width(BNBULayout.Space12))
                Column {
                    Text(
                        text = interfaceText("课程二维码或邀请码", "Course QR code or invitation code"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = interfaceText("由老师提供", "Provided by your teacher"),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CourseCodeMark()
            Spacer(Modifier.width(BNBULayout.Space16))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = interfaceText("扫码或手动输入", "Scan or enter it manually"),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(Modifier.height(BNBULayout.Space8))
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = colors.primaryContainer
                ) {
                    Text(
                        text = interfaceText("下一步核对课程信息", "Next, review course details"),
                        modifier = Modifier.padding(
                            horizontal = BNBULayout.Space12,
                            vertical = BNBULayout.Space8
                        ),
                        color = colors.onPrimaryContainer,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }
        StatusArtworkRow(
            icon = Icons.Filled.Check,
            text = interfaceText("两种方式都可加入课程", "Both options let you join"),
            containerColor = colors.secondaryContainer,
            contentColor = colors.onSecondaryContainer,
            iconColor = colors.secondary
        )
    }
}

@Composable
private fun DirectJoinArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Row(
                modifier = Modifier.padding(BNBULayout.Space12),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ArtworkIcon(
                    imageVector = Icons.AutoMirrored.Filled.MenuBook,
                    containerColor = colors.primaryContainer,
                    contentColor = colors.primary
                )
                Spacer(Modifier.width(BNBULayout.Space12))
                Column {
                    Text(
                        text = interfaceText("核对课程信息", "Review course details"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = interfaceText("课程名称和老师", "Course name and instructor"),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Column(
                modifier = Modifier.padding(BNBULayout.Space12),
                verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
            ) {
                GuideInfoRow(
                    icon = Icons.Filled.Person,
                    title = interfaceText("确认个人资料", "Confirm your details")
                )
                GuideInfoRow(
                    icon = Icons.AutoMirrored.Filled.Assignment,
                    title = interfaceText("确认姓名、学号、性别和年级", "Confirm name, student ID, gender, and grade")
                )
            }
        }
        StatusArtworkRow(
            icon = Icons.Filled.Check,
            text = interfaceText("校验成功后立即成为课程成员", "Become an active course member after validation"),
            containerColor = colors.secondaryContainer,
            contentColor = colors.onSecondaryContainer,
            iconColor = colors.secondary
        )
    }
}

@Composable
private fun StartExerciseArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Row(
                modifier = Modifier.padding(BNBULayout.Space12),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ArtworkIcon(
                    imageVector = Icons.AutoMirrored.Filled.MenuBook,
                    containerColor = colors.primaryContainer,
                    contentColor = colors.primary
                )
                Spacer(Modifier.width(BNBULayout.Space12))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = interfaceText("选择课程和运动项目", "Choose a course and activity"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = interfaceText("从首页或“运动”进入", "Open it from Home or Exercise"),
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        Box(
            modifier = Modifier
                .size(86.dp)
                .background(colors.primary, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.PlayArrow,
                contentDescription = null,
                tint = colors.onPrimary,
                modifier = Modifier.size(48.dp)
            )
        }
        StatusArtworkRow(
            icon = Icons.Filled.Timer,
            text = interfaceText("开始运动计时", "Start activity timing"),
            containerColor = colors.tertiaryContainer,
            contentColor = colors.onTertiaryContainer,
            iconColor = colors.tertiary
        )
    }
}

@Composable
private fun ExerciseRecordArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ArtworkIcon(
                imageVector = Icons.AutoMirrored.Filled.DirectionsRun,
                containerColor = colors.primaryContainer,
                contentColor = colors.primary
            )
            Spacer(Modifier.width(BNBULayout.Space12))
            Text(
                text = interfaceText("运动中", "While exercising"),
                color = colors.onSurface,
                style = MaterialTheme.typography.titleMedium
            )
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Column(modifier = Modifier.padding(BNBULayout.Space16)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Filled.Timer,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(BNBULayout.Space8))
                    Text(
                        text = "00:32:18",
                        color = colors.onSurface,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Spacer(Modifier.weight(1f))
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(colors.primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Pause,
                            contentDescription = null,
                            tint = colors.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Spacer(Modifier.height(BNBULayout.Space12))
                ProgressTrack(progress = .62f)
                Spacer(Modifier.height(BNBULayout.Space12))
                Row(horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space8)) {
                    EvidencePill(
                        icon = Icons.Filled.PhotoCamera,
                        label = interfaceText("拍照", "Photo")
                    )
                    EvidencePill(
                        icon = Icons.Filled.Videocam,
                        label = interfaceText("录像", "Video")
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Pause,
                contentDescription = null,
                tint = colors.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(BNBULayout.Space8))
            Text(
                text = interfaceText("暂停后可继续本次运动", "Resume this activity after a pause"),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun SubmittedRecordsArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ArtworkIcon(
                imageVector = Icons.Filled.History,
                containerColor = colors.primaryContainer,
                contentColor = colors.primary
            )
            Spacer(Modifier.width(BNBULayout.Space12))
            Text(
                text = interfaceText("完成记录", "Complete record"),
                color = colors.onSurface,
                style = MaterialTheme.typography.titleMedium
            )
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            color = colors.surface
        ) {
            Column(
                modifier = Modifier.padding(BNBULayout.Space12),
                verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
            ) {
                GuideInfoRow(
                    icon = Icons.Filled.Description,
                    title = interfaceText("补充说明", "Add notes")
                )
                GuideInfoRow(
                    icon = Icons.Filled.PhotoCamera,
                    title = interfaceText("确认现场凭证", "Confirm activity proof")
                )
                GuideInfoRow(
                    icon = Icons.Filled.Check,
                    title = interfaceText("提交本次打卡", "Submit this check-in")
                )
            }
        }
        StatusArtworkRow(
            icon = Icons.Filled.History,
            text = interfaceText("在“记录”中查看历史", "Review history in Records"),
            containerColor = colors.tertiaryContainer,
            contentColor = colors.onTertiaryContainer,
            iconColor = colors.tertiary
        )
    }
}

@Composable
private fun ApplicationsArtwork() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ArtworkIcon(
                imageVector = Icons.AutoMirrored.Filled.Assignment,
                containerColor = colors.primaryContainer,
                contentColor = colors.primary
            )
            Spacer(Modifier.width(BNBULayout.Space12))
            Text(
                text = interfaceText("个人中心 · 服务", "Profile · Services"),
                color = colors.onSurface,
                style = MaterialTheme.typography.titleMedium
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space12)
        ) {
            ApplicationArtworkCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Filled.FitnessCenter,
                title = interfaceText("免测申请", "Test exemption")
            )
            ApplicationArtworkCard(
                modifier = Modifier.weight(1f),
                icon = Icons.AutoMirrored.Filled.Assignment,
                title = interfaceText("打卡、校队或社团", "Check-in, school team, or student club")
            )
        }
        StatusArtworkRow(
            icon = Icons.Filled.FileUpload,
            text = interfaceText("查看状态、补充材料或重新提交", "Check status, add documents, or resubmit"),
            containerColor = colors.secondaryContainer,
            contentColor = colors.onSecondaryContainer,
            iconColor = colors.secondary
        )
    }
}

@Composable
private fun GuideInfoRow(
    icon: ImageVector,
    title: String
) {
    val colors = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.primary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(BNBULayout.Space8))
        Text(
            text = title,
            color = colors.onSurface,
            style = MaterialTheme.typography.labelMedium
        )
        Spacer(Modifier.weight(1f))
        Icon(
            imageVector = Icons.Filled.Check,
            contentDescription = null,
            tint = colors.tertiary,
            modifier = Modifier.size(16.dp)
        )
    }
}

@Composable
private fun ApplicationArtworkCard(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = colors.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.Space12),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = colors.primary,
                modifier = Modifier.size(22.dp)
            )
            Text(
                text = title,
                color = colors.onSurface,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun StatusArtworkRow(
    icon: ImageVector,
    text: String,
    containerColor: Color,
    contentColor: Color,
    iconColor: Color
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = containerColor
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = BNBULayout.Space12,
                vertical = BNBULayout.Space8
            ),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(BNBULayout.Space8))
            Text(
                text = text,
                color = contentColor,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun ArtworkIcon(
    imageVector: ImageVector,
    containerColor: Color,
    contentColor: Color
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .background(containerColor, MaterialTheme.shapes.medium),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = imageVector,
            contentDescription = null,
            tint = contentColor,
            modifier = Modifier.size(21.dp)
        )
    }
}

@Composable
private fun CourseCodeMark() {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.size(78.dp),
        shape = MaterialTheme.shapes.medium,
        color = colors.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.Space12),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            repeat(5) { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    repeat(5) { column ->
                        val isFilled = row == 0 ||
                            column == 0 ||
                            row == 4 ||
                            column == 4 ||
                            (row + column) % 3 == 0
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(
                                    if (isFilled) colors.primary else colors.surfaceContainerHighest,
                                    MaterialTheme.shapes.extraSmall
                                )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EvidencePill(
    icon: ImageVector,
    label: String
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        shape = MaterialTheme.shapes.small,
        color = colors.surfaceContainerHigh
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = BNBULayout.Space12,
                vertical = BNBULayout.Space8
            ),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = colors.onSurfaceVariant,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(BNBULayout.Space4))
            Text(
                text = label,
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun ProgressTrack(progress: Float) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(6.dp)
            .background(colors.surfaceContainerHighest, MaterialTheme.shapes.extraLarge)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .height(6.dp)
                .background(colors.primary, MaterialTheme.shapes.extraLarge)
        )
    }
}

@Composable
private fun GuideActions(
    currentPage: Int,
    totalSteps: Int,
    isLastPage: Boolean,
    finalActionLabel: String,
    enabled: Boolean,
    animationsEnabled: Boolean,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .navigationBarsPadding()
            .padding(
                start = BNBULayout.ScreenHorizontal,
                end = BNBULayout.ScreenHorizontal,
                top = BNBULayout.Space12,
                bottom = BNBULayout.Space16
            ),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        StepIndicator(
            currentPage = currentPage,
            totalSteps = totalSteps,
            animationsEnabled = animationsEnabled
        )
        Spacer(Modifier.height(BNBULayout.Space16))
        Button(
            onClick = onContinue,
            enabled = enabled,
            modifier = Modifier
                .fillMaxWidth()
                .height(BNBULayout.PrimaryControlHeight),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Text(
                text = if (isLastPage) finalActionLabel else interfaceText("继续", "Continue")
            )
        }
    }
}

@Composable
private fun StepIndicator(
    currentPage: Int,
    totalSteps: Int,
    animationsEnabled: Boolean
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.semantics {
            contentDescription = interfaceText(
                "当前第 %1\$d 步，共 %2\$d 步",
                "Step %1\$d of %2\$d"
            ).format(currentPage + 1, totalSteps)
        },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = (currentPage + 1).toString() + " / " + totalSteps,
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium
        )
        Spacer(Modifier.width(BNBULayout.Space12))
        repeat(totalSteps) { index ->
            val width by animateDpAsState(
                targetValue = if (index == currentPage) 20.dp else 6.dp,
                animationSpec = if (animationsEnabled) {
                    tween(GuideMotion.PageEnter, easing = FastOutSlowInEasing)
                } else {
                    snap()
                },
                label = "guideStepIndicator" + index
            )
            Box(
                modifier = Modifier
                    .size(width = width, height = 6.dp)
                    .background(
                        color = if (index == currentPage) colors.primary else colors.outlineVariant,
                        shape = MaterialTheme.shapes.extraLarge
                    )
            )
            if (index != totalSteps - 1) Spacer(Modifier.width(6.dp))
        }
    }
}
