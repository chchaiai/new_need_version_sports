package edu.bnbu.student.mvp.feature.profile

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountDetailsStudentNumberPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun accountDetailsDisplaysStudentNumberInsteadOfInternalId() {
        val source = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt"
        ).readText()

        assertTrue(
            source.contains(
                "student.studentNumberForDisplay()"
            )
        )
        assertFalse(
            source.contains(
                "AccountDetailRow(stringResource(R.string.profile_student_id), student.id)"
            )
        )
    }

    @Test
    fun accountDetailsDisplaysLocalizedGenderInTheRequestedLayout() {
        val source = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt"
        ).readText()

        assertTrue(source.contains("R.string.profile_gender), gender"))
        assertTrue(source.contains("\"female\" -> interfaceText(\"女\", \"Female\")"))
        assertFalse(source.contains("interfaceText(\"其他\", \"Other\")"))
        assertTrue(source.contains("textAlign = TextAlign.End"))
        assertFalse(source.contains("StatusBadge(text = studentStatusLabel(student.status)"))
    }
}
