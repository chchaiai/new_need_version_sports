import android.graphics.Bitmap
import android.os.Build
import android.view.Choreographer
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry
import androidx.test.runner.lifecycle.Stage
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Captures the real Android framebuffer after Compose assertions; never generates a mock picture. */
object DeviceCapture {
    fun save(name: String) {
        require(name.matches(Regex("[A-Za-z0-9_-]+")))
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.waitForIdleSync()
        // Semantic state can update before SurfaceFlinger receives the new frame.
        val frame = CountDownLatch(1)
        instrumentation.runOnMainSync {
            val activity = ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED).single()
            val view = activity.window.decorView
            if (Build.VERSION.SDK_INT >= 29 && view.isHardwareAccelerated) {
                view.viewTreeObserver.registerFrameCommitCallback { frame.countDown() }
                view.invalidate()
            } else {
                Choreographer.getInstance().postFrameCallback {
                    Choreographer.getInstance().postFrameCallback { frame.countDown() }
                }
            }
        }
        check(frame.await(5, TimeUnit.SECONDS)) { "Android frame was not committed" }
        val dir = File(instrumentation.targetContext.getExternalFilesDir(null), "phase6-device").apply { mkdirs() }
        val bitmap = requireNotNull(instrumentation.uiAutomation.takeScreenshot()) { "Android screenshot unavailable" }
        try { File(dir, "$name.png").outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) } }
        finally { bitmap.recycle() }
    }
}
