package edu.bnbu.student.mvp.feature.profile

import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrganizationRecognitionCopyTest {
    @Test
    fun chineseEmptyStateAllowsTeacherAllocationToEitherExerciseCategory() {
        val copy = resourceText("values/strings.xml")

        assertTrue(copy.contains("责任教师可自定义认可时长"))
        assertTrue(copy.contains("课程相关运动、其他运动或两者"))
        assertFalse(copy.contains("只能抵扣其他运动小时"))
        assertFalse(copy.contains("不能替代课程相关小时"))
    }

    @Test
    fun englishEmptyStateAllowsTeacherAllocationToEitherExerciseCategory() {
        val copy = resourceText("values-en/strings.xml")

        assertTrue(copy.contains("the responsible teacher can set the recognized hours"))
        assertTrue(copy.contains("course-related exercise, other exercise, or both"))
        assertFalse(copy.contains("can apply only to other exercise hours"))
    }

    private fun resourceText(relativePath: String): String {
        val path = Path.of("src", "main", "res").resolve(relativePath)
        check(Files.isRegularFile(path)) { "Android resource not found: ${path.toAbsolutePath()}" }
        return String(Files.readAllBytes(path), Charsets.UTF_8)
    }
}
