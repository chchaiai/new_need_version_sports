package edu.bnbu.student.mvp.core.local

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OnboardingGuideStateTest {

    private lateinit var context: Context
    private lateinit var localStore: AndroidAppLocalStore

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        clearPersistentState()
        localStore = AndroidAppLocalStore(context)
    }

    @After
    fun tearDown() {
        clearPersistentState()
    }

    @Test
    fun preLoginCourseGuide_isCompletedOncePerDevice() {
        assertFalse(localStore.hasCompletedPreLoginCourseGuide())

        assertTrue(localStore.markPreLoginCourseGuideCompleted())

        assertTrue(localStore.hasCompletedPreLoginCourseGuide())
    }

    @Test
    fun postEnrollmentGuide_respectsLegacyAndNewCompletionFlags() {
        val legacyAccountId = "legacy-guide-account"
        val newAccountId = "new-guide-account"

        assertFalse(localStore.hasCompletedPostEnrollmentGuide(legacyAccountId))
        assertFalse(localStore.hasCompletedPostEnrollmentGuide(newAccountId))

        assertTrue(localStore.markOnboardingCompleted(legacyAccountId))
        assertTrue(localStore.hasCompletedPostEnrollmentGuide(legacyAccountId))

        assertTrue(localStore.markPostEnrollmentGuideCompleted(newAccountId))
        assertTrue(localStore.hasCompletedPostEnrollmentGuide(newAccountId))
    }

    /**
     * [AndroidAppLocalStore.clearAll] intentionally preserves privacy and
     * first-run acknowledgements across logout. This instrumentation test
     * needs a genuinely fresh local state for its device-scoped assertion.
     */
    private fun clearPersistentState() {
        context.getSharedPreferences(AndroidAppLocalStore.StoreName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        context.getSharedPreferences("bnbu.student.secure.v1", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }
}
