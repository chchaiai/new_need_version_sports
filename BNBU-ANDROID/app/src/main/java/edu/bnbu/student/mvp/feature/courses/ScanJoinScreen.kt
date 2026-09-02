package edu.bnbu.student.mvp.feature.courses

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.view.View
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material3.AlertDialog
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton as OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.app.ActivityCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.zxing.BarcodeFormat
import com.google.zxing.ResultPoint
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import java.io.IOException
import java.net.URI
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

private const val InviteTokenMinLength = 16
private const val InviteTokenMaxLength = 512
private const val SimulatedInviteCode = "SIMULATED-PREVIEW-ONLY"

internal fun simulatedCourseJoinInfo() = CourseJoinInfo(
    id = "simulated-section-pe101-01",
    name = "大学体育（一）",
    teacher = "陈若宁",
    semester = "2025-2026 第二学期",
    isDemoScanResult = true
)

/**
 * Scans a teacher-provided course QR code and resolves its public invite data.
 *
 * The destination is supplied by [onInviteResolved] so this screen stays focused
 * on scanning; the caller should open [CourseJoinConfirmScreen] (B3) with the
 * supplied code and course data.
 */
@Composable
fun ScanJoinScreen(
    onInviteResolved: (inviteCode: String, course: CourseJoinInfo) -> Unit,
    onBack: () -> Unit,
    resolveInvite: suspend (inviteCode: String) -> CourseJoinInfo
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val cameraAvailable = remember(context) {
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
    }
    val flashAvailable = remember(context) {
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)
    }
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var scannerView by remember { mutableStateOf<DecoratedBarcodeView?>(null) }
    var isResolving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var userFacingError by remember { mutableStateOf<UserFacingError?>(null) }
    var showManualInput by remember { mutableStateOf(false) }
    var lastScannedValue by remember { mutableStateOf<String?>(null) }
    var retryInviteCode by remember { mutableStateOf<String?>(null) }
    var flashEnabled by remember { mutableStateOf(false) }
    var cameraPermissionPermanentlyDenied by remember { mutableStateOf(false) }

    fun resolveCode(code: String) {
        if (isResolving) return
        retryInviteCode = null
        if (!isInviteCode(code)) {
            userFacingError = null
            message = interfaceText("请输入有效的邀请码", "Enter a valid invitation code.")
            return
        }

        message = null
        userFacingError = null
        isResolving = true
        scope.launch {
            try {
                onInviteResolved(code, resolveInvite(code))
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.JOIN)
                userFacingError = mapped
                SafeClientLogger.log(
                    error = mapped,
                    context = ClientErrorContext.JOIN,
                    httpStatus = when (error) {
                        is V1HttpException -> error.statusCode
                        is ApiHttpException -> error.statusCode
                        else -> null
                    }
                )
                retryInviteCode = code.takeIf { isRetryableInviteLookupError(error) }
            } finally {
                isResolving = false
            }
        }
    }

    fun resolveQrValue(value: String) {
        val code = inviteCodeFromQr(value)
        if (code == null) {
            retryInviteCode = null
            userFacingError = null
            message = interfaceText("无效的课程二维码，请确认后重试", "Invalid course QR code. Check it and try again.")
            return
        }
        resolveCode(code)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            val activity = context as? android.app.Activity
            cameraPermissionPermanentlyDenied = activity != null &&
                !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.CAMERA)
        }
        if (!granted) {
            message = interfaceText("需要相机权限才能扫描二维码，也可以手动输入邀请码", "Camera permission is required to scan a QR code. You can also enter an invitation code manually.")
        }
    }

    fun requestCameraPermission() {
        cameraPermissionPermanentlyDenied = false
        permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    fun openAppSettings() {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", context.packageName, null)
        )
        runCatching { context.startActivity(intent) }
            .onFailure {
                message = interfaceText("无法打开系统设置，请在设备设置中允许相机权限。", "Unable to open Settings. Allow camera access in your device settings.")
            }
    }

    LaunchedEffect(Unit) {
        if (cameraAvailable && !hasCameraPermission) requestCameraPermission()
    }

    DisposableEffect(scannerView, lifecycleOwner, hasCameraPermission, isResolving) {
        val view = scannerView
        if (view == null) {
            onDispose { }
        } else {
            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_RESUME -> if (hasCameraPermission && !isResolving) view.resume()
                    Lifecycle.Event.ON_PAUSE -> view.pause()
                    else -> Unit
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            if (hasCameraPermission && !isResolving &&
                lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)
            ) {
                view.resume()
            } else {
                view.pause()
            }
            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
                view.pause()
            }
        }
    }

    BackHandler(enabled = !isResolving, onBack = onBack)

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .testTag("screen.courseJoin.scan"),
        ) {
            ScanJoinTopBar(
                onBack = onBack,
                enabled = !isResolving,
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp)
            ) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = interfaceText("扫描课程二维码", "Scan a course QR code"),
                    color = MaterialTheme.colorScheme.onBackground,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = interfaceText("将老师提供的二维码对准扫描框，识别后可核对课程信息。", "Align the teacher's QR code in the frame to review the course details."),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge
                )
                Spacer(Modifier.height(24.dp))
                if (cameraAvailable && hasCameraPermission) {
                    CameraScannerSurface(
                        isResolving = isResolving,
                        flashAvailable = flashAvailable,
                        flashEnabled = flashEnabled,
                        onFlashToggle = { flashEnabled = !flashEnabled },
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .heightIn(min = 240.dp, max = 420.dp)
                            .testTag("courseJoin.scan.camera")
                    ) {
                        androidx.compose.ui.viewinterop.AndroidView(
                            factory = { viewContext ->
                                DecoratedBarcodeView(viewContext).also { view ->
                                    view.barcodeView.decoderFactory = DefaultDecoderFactory(
                                        listOf(BarcodeFormat.QR_CODE)
                                    )
                                    view.viewFinder.visibility = View.GONE
                                    view.statusView?.visibility = View.GONE
                                    view.decodeContinuous(object : BarcodeCallback {
                                        override fun barcodeResult(result: BarcodeResult?) {
                                            val value = result?.text ?: return
                                            scope.launch {
                                                if (!isResolving && value != lastScannedValue) {
                                                    lastScannedValue = value
                                                    resolveQrValue(value)
                                                }
                                            }
                                        }

                                        override fun possibleResultPoints(resultPoints: List<ResultPoint>) = Unit
                                    })
                                    scannerView = view
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    LaunchedEffect(scannerView, flashEnabled) {
                        scannerView?.let { view ->
                            if (flashEnabled) view.setTorchOn() else view.setTorchOff()
                        }
                    }
                } else if (!cameraAvailable) {
                    CameraUnavailableContent(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .heightIn(min = 240.dp, max = 420.dp)
                    )
                } else {
                    PermissionRequiredContent(
                        permanentlyDenied = cameraPermissionPermanentlyDenied,
                        onRequestPermission = ::requestCameraPermission,
                        onOpenSettings = ::openAppSettings,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .heightIn(min = 240.dp, max = 420.dp)
                    )
                }

                Spacer(Modifier.height(14.dp))
                if (message == null && userFacingError == null) {
                    Text(
                        text = if (isResolving) interfaceText("正在读取课程信息…", "Reading course information…") else interfaceText("将二维码完整放入扫描框内", "Place the entire QR code inside the frame."),
                        color = if (isResolving) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("courseJoin.scan.hint")
                    )
                } else if (userFacingError != null) {
                    BNBUErrorPanel(
                        error = requireNotNull(userFacingError),
                        onRetry = retryInviteCode?.let { failedCode ->
                            {
                                retryInviteCode = null
                                lastScannedValue = null
                                resolveCode(failedCode)
                            }
                        },
                        onDismiss = {
                            userFacingError = null
                            retryInviteCode = null
                            lastScannedValue = null
                        }
                    )
                } else {
                    ScanMessage(
                        text = message.orEmpty(),
                        onRetry = retryInviteCode?.let { failedCode ->
                            {
                                retryInviteCode = null
                                lastScannedValue = null
                                resolveCode(failedCode)
                            }
                        }
                    )
                }

                Spacer(Modifier.height(12.dp))
                OutlinedButton(
                    onClick = {
                        onInviteResolved(SimulatedInviteCode, simulatedCourseJoinInfo())
                    },
                    enabled = !isResolving,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .testTag("courseJoin.scan.simulateSuccess")
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = interfaceText("模拟扫码成功（预览）", "Simulate scan success (preview)"),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    text = interfaceText(
                        "仅展示扫码成功后的界面，不会请求服务器或加入课程。",
                        "Shows the post-scan screen only. No server request or course join will occur."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(
                    onClick = { showManualInput = true },
                    enabled = !isResolving,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .testTag("courseJoin.scan.manualInput")
                ) {
                    Icon(
                        imageVector = Icons.Filled.Keyboard,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = interfaceText("手动输入邀请码", "Enter invitation code manually"),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    if (showManualInput) {
        ManualInviteCodeDialog(
            loading = isResolving,
            onDismiss = { if (!isResolving) showManualInput = false },
            onSubmit = { code ->
                showManualInput = false
                resolveCode(code)
            }
        )
    }
}

@Composable
private fun ScanJoinTopBar(
    onBack: () -> Unit,
    enabled: Boolean
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        IconButton(
            onClick = onBack,
            enabled = enabled,
            modifier = Modifier
                .align(Alignment.CenterStart)
                .size(48.dp)
                .testTag("courseJoin.scan.back")
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = interfaceText("返回", "Back"),
                modifier = Modifier.size(28.dp)
            )
        }
        Text(
            text = interfaceText("加入课程", "Join course"),
            color = MaterialTheme.colorScheme.onBackground,
            style = MaterialTheme.typography.titleMedium
        )
    }
}

@Composable
private fun CameraScannerSurface(
    isResolving: Boolean,
    flashAvailable: Boolean,
    flashEnabled: Boolean,
    onFlashToggle: () -> Unit,
    modifier: Modifier = Modifier,
    cameraPreview: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(Color.Black)
            .semantics {
                contentDescription = interfaceText("课程二维码相机取景区域", "Course QR-code camera preview")
            },
        contentAlignment = Alignment.Center
    ) {
        cameraPreview()
        ScannerGuide(modifier = Modifier.fillMaxSize())
        if (flashAvailable) {
            OutlinedButton(
                onClick = onFlashToggle,
                enabled = !isResolving,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 16.dp)
                    .testTag("courseJoin.scan.toggleFlash")
            ) {
                Icon(
                    imageVector = if (flashEnabled) Icons.Filled.FlashOff else Icons.Filled.FlashOn,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    if (flashEnabled) {
                        interfaceText("\u5173\u95ed\u8865\u5149", "Turn off light")
                    } else {
                        interfaceText("\u6253\u5f00\u8865\u5149", "Turn on light")
                    }
                )
            }
        }
        if (isResolving) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.62f)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator(
                    color = Color.White,
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(30.dp)
                )
                Spacer(Modifier.height(14.dp))
                Text(
                    text = interfaceText("正在识别", "Recognising"),
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

@Composable
private fun ScannerGuide(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val guideSize = minOf(size.width, size.height) * 0.68f
        val left = (size.width - guideSize) / 2f
        val top = (size.height - guideSize) / 2f
        val right = left + guideSize
        val bottom = top + guideSize
        val cornerLength = 30.dp.toPx()
        val strokeWidth = 4.dp.toPx()
        val guideColor = Color.White

        listOf(
            Offset(left, top + cornerLength) to Offset(left, top),
            Offset(left, top) to Offset(left + cornerLength, top),
            Offset(right - cornerLength, top) to Offset(right, top),
            Offset(right, top) to Offset(right, top + cornerLength),
            Offset(left, bottom - cornerLength) to Offset(left, bottom),
            Offset(left, bottom) to Offset(left + cornerLength, bottom),
            Offset(right - cornerLength, bottom) to Offset(right, bottom),
            Offset(right, bottom) to Offset(right, bottom - cornerLength)
        ).forEach { (start, end) ->
            drawLine(
                color = guideColor,
                start = start,
                end = end,
                strokeWidth = strokeWidth,
                cap = StrokeCap.Round
            )
        }
    }
}

@Composable
private fun PermissionRequiredContent(
    permanentlyDenied: Boolean,
    onRequestPermission: () -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 28.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
            modifier = Modifier.size(64.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Filled.CameraAlt,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            text = interfaceText("需要相机权限", "Camera permission required"),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = interfaceText("仅用于扫描课程二维码，你也可以在下方手动输入邀请码。", "The camera is only used to scan course QR codes. You can also enter an invitation code manually."),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = if (permanentlyDenied) onOpenSettings else onRequestPermission,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .defaultMinSize(minHeight = 48.dp)
                .testTag("courseJoin.scan.requestPermission")
        ) {
            Text(interfaceText("允许使用相机", "Allow camera access"))
        }
    }
}

@Composable
private fun CameraUnavailableContent(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 28.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Filled.CameraAlt,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(32.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = interfaceText("\u8bbe\u5907\u6ca1\u6709\u53ef\u7528\u7684\u76f8\u673a", "No camera is available on this device"),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = interfaceText("\u8bf7\u5728\u4e0b\u65b9\u624b\u52a8\u8f93\u5165\u9080\u8bf7\u7801\u4ee5\u7ee7\u7eed", "Enter the invitation code manually below to continue."),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ScanMessage(text: String, onRetry: (() -> Unit)? = null) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = colors.error.copy(alpha = 0.08f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 14.dp, vertical = 12.dp)
            .semantics {
                liveRegion = LiveRegionMode.Polite
            },
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = Icons.Filled.ErrorOutline,
            contentDescription = null,
            tint = colors.error,
            modifier = Modifier.size(20.dp)
        )
        Spacer(Modifier.width(10.dp))
        Column {
            Text(
                text = text,
                color = colors.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
            onRetry?.let {
                TextButton(onClick = it, modifier = Modifier.testTag("courseJoin.scan.retry")) {
                    Text(interfaceText("\u91cd\u8bd5", "Retry"))
                }
            }
        }
    }
}

@Composable
private fun ManualInviteCodeDialog(
    loading: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit
) {
    var code by remember { mutableStateOf("") }
    val normalizedCode = code.trim()
    val showFormatError = code.isNotBlank() && !isInviteCode(normalizedCode)
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(24.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        title = {
            Text(
                text = interfaceText("输入邀请码", "Enter invitation code"),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
        },
        text = {
            Column {
                Text(
                    text = interfaceText("请输入老师提供的邀请码，下一步将核对课程信息。", "Enter the invitation code from your teacher. You will review the course details next."),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.height(20.dp))
                BNBUFormField(
                    value = code,
                    onValueChange = { code = it },
                    label = interfaceText("邀请码", "Invitation code"),
                    testTag = "courseJoin.scan.inviteCode",
                    required = true,
                    placeholder = interfaceText(
                        "粘贴或扫描教师提供的加入凭证",
                        "Paste or scan the join credential from your teacher"
                    ),
                    supportingText = interfaceText(
                        "下一步将展示课程名称和教师信息供核对。",
                        "The next step shows the course name and teacher for review."
                    ),
                    errorText = if (showFormatError) {
                        interfaceText("请输入完整的加入凭证", "Enter the complete join credential.")
                    } else null,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.None,
                        keyboardType = KeyboardType.Ascii,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            if (isInviteCode(normalizedCode) && !loading) {
                                onSubmit(normalizedCode)
                            }
                        }
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(normalizedCode) },
                enabled = isInviteCode(normalizedCode) && !loading,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.testTag("courseJoin.scan.submitCode")
            ) { Text(interfaceText("查询课程", "Find course")) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !loading) { Text(interfaceText("取消", "Cancel")) }
        }
    )
}

/** Extracts an invite code only from the expected HTTPS /join/{code} QR URL. */
internal fun inviteCodeFromQr(rawValue: String): String? {
    val uri = runCatching { URI(rawValue.trim()) }.getOrNull() ?: return null
    if (!uri.scheme.equals("https", ignoreCase = true) || uri.host.isNullOrBlank()) return null
    val segments = uri.path.orEmpty().trim('/').split('/').filter(String::isNotBlank)
    if (segments.size != 2 || segments.first() != "join") return null
    return segments.last().takeIf(::isInviteCode)
}

internal fun isInviteCode(value: String): Boolean =
    value.trim().length in InviteTokenMinLength..InviteTokenMaxLength

internal fun inviteLookupErrorMessage(error: Throwable): String {
    return ClientErrorMapper.map(error, ClientErrorContext.JOIN).legacySafeText()
}

internal fun isRetryableInviteLookupError(error: Throwable): Boolean =
    error is IOException &&
        (error !is ApiHttpException || error.statusCode >= 500) &&
        (error !is V1HttpException || error.statusCode >= 500)

/** True only for a server-confirmed invitation expiration or revocation. */
internal fun isInviteUnavailableError(error: Throwable): Boolean {
    if (error is ApiHttpException) return error.statusCode == 410
    if (error !is V1HttpException) return false
    return error.statusCode == 410 || error.error.code.value in setOf(
        "COURSE_INVITE_EXPIRED",
        "COURSE_INVITE_REVOKED",
        "AUTH_JOIN_CAPABILITY_EXPIRED"
    )
}
