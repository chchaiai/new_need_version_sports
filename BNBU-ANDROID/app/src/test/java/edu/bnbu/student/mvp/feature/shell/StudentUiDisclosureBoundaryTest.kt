package edu.bnbu.student.mvp.feature.shell

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentUiDisclosureBoundaryTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun studentNavigationHasNoLegacyScoringRouteOrShortcut() {
        val root = source("shell/AppRootScreen.kt")
        val profile = source("profile/ProfileScreen.kt")

        assertTrue(root.contains("Grades(\"记录与进度\""))
        assertFalse(root.contains("EnduranceScoring"))
        assertFalse(profile.contains("profile_endurance"))
        assertFalse(profile.contains("onOpenEnduranceScoring"))
    }

    @Test
    fun reachableSummaryScreensDoNotProjectLegacyResultFields() {
        val grades = source("grades/GradesScreen.kt")
        val courses = source("courses/CoursesScreen.kt")
        val dashboard = source("dashboard/DashboardScreen.kt")

        listOf(
            "enduranceRunScore",
            "totalScore",
            "totalDisplay",
            "visibleBlocks",
            "publishedTotalGrade",
            "FinalGradePanel"
        ).forEach { forbidden ->
            assertFalse("Student summary UI must not reference $forbidden", grades.contains(forbidden))
            assertFalse("Course UI must not reference $forbidden", courses.contains(forbidden))
            assertFalse("Dashboard UI must not reference $forbidden", dashboard.contains(forbidden))
        }
    }

    @Test
    fun notificationSheetConsumesOnlyTheFilteredUiProjection() {
        val sheet = source("notifications/NotificationSheet.kt")

        assertTrue(sheet.contains("List<StudentNoticeUiModel>"))
        assertFalse(sheet.contains("List<StudentNotice>"))
        assertFalse(sheet.contains("NoticeCategory"))
    }

    @Test
    fun notificationSheetChromeFollowsTheInPlaceApplicationLanguage() {
        val sheet = source("notifications/NotificationSheet.kt")

        listOf(
            "R.string.notification_title",
            "R.string.notification_none_unread",
            "R.string.notification_mark_all",
            "R.string.notification_empty"
        ).forEach { expected ->
            assertTrue("Notification chrome must resolve $expected", sheet.contains(expected))
        }
        assertTrue(sheet.contains("private fun appString("))
        assertTrue(sheet.contains("AppLanguagePreferences.localizedContext(hostContext)"))
        assertTrue(sheet.contains("appPlural(R.plurals.notification_unread_count"))
    }

    private fun source(relativePath: String): String = File(
        projectRoot,
        "app/src/main/java/edu/bnbu/student/mvp/feature/$relativePath"
    ).readText()
}
