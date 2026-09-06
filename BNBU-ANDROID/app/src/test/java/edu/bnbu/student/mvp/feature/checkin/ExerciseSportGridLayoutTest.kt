package edu.bnbu.student.mvp.feature.checkin

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseSportGridLayoutTest {
    private val projectRoot = generateSequence(File(requireNotNull(System.getProperty("user.dir")))) { it.parentFile }
        .first { File(it, "app/src/main").isDirectory }

    private val sportResources = listOf(
        "ic_sports_running",
        "ic_sports_basketball",
        "ic_sports_football",
        "ic_sports_badminton",
        "ic_sports_table_tennis",
        "ic_sports_swimming",
        "ic_sports_fitness",
        "ic_sports_cycling",
        "ic_sports_other"
    )

    @Test
    fun independentExerciseUsesTheReviewedWebThreeColumnGrid() {
        assertEquals(3, ExerciseSportGridColumnCount)
    }

    @Test
    fun reviewedNineSportsUseDedicatedVectorResources() {
        val screen = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()

        sportResources.forEach { resourceName ->
            assertTrue(screen.contains("R.drawable.$resourceName"))
            val vector = projectFile("app/src/main/res/drawable/$resourceName.xml")
            assertTrue("Missing vector $resourceName", vector.isFile)
            val xml = vector.readText()
            assertTrue("$resourceName must be a vector", xml.contains("<vector"))
            assertTrue("$resourceName must contain vector paths", xml.contains("android:pathData="))
        }

        assertFalse(screen.contains("Icons.AutoMirrored.Filled.DirectionsRun"))
        assertFalse(screen.contains("Icons.Filled.SportsBasketball"))
        assertFalse(screen.contains("Icons.Filled.SportsSoccer"))
        assertFalse(screen.contains("Icons.Filled.Pool"))
        assertFalse(screen.contains("Icons.Filled.FitnessCenter"))
        assertFalse(screen.contains("Icons.AutoMirrored.Filled.DirectionsBike"))
        assertFalse(screen.contains("Icons.Filled.MoreHoriz"))
    }

    @Test
    fun sportChoiceExposesButtonLabelAndSelectedStateToAccessibilityServices() {
        val screen = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()

        assertTrue(screen.contains("role = Role.RadioButton"))
        assertTrue(screen.contains(".semantics { this.selected = selected }"))
        assertTrue(screen.contains("onClickLabel = interfaceText(\"选择\${option.label}\", \"Select \${option.englishLabel}\")"))
        assertTrue(screen.contains("text = interfaceText(option.label, option.englishLabel)"))
    }

    private fun projectFile(relativePath: String): File = File(projectRoot, relativePath)
}
