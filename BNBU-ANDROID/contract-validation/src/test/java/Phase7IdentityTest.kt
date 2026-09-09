import bnbu.cr005.review.*
import edu.bnbu.student.contractvalidation.*
import org.junit.Assert.*
import org.junit.Test

class Phase7IdentityTest {
    private fun deleted() = MapperWire.json("""{"kind":"DELETED_STUDENT","studentId":"${MapperWire.ID}"}""")

    @Test fun deletedIdentityIsLabelledWithoutInventingAProfile() {
        val reference = MapperWire.read<StudentReference>(deleted())
        assertTrue(reference.actualInstance is DeletedStudentReference)
        val display = reference.toIdentityDisplay()
        assertEquals("已注销学生", display.zh)
        assertEquals("Deleted student", display.en)
        assertTrue(display.readOnly)
        assertEquals(MapperWire.ID, display.id.toString())
        assertThrows(IllegalArgumentException::class.java) { reference.currentStudent() }
    }

    @Test fun pendingStillMeansCurrentAccount() {
        val value = MapperWire.json("""{"kind":"CURRENT_STUDENT","student":{}}""")
        value.add("student", MapperWire.fixture("checks/wire/StudentDashboard").get("student"))
        value.getAsJsonObject("student").addProperty("studentStatus", "PENDING")
        val reference = MapperWire.read<StudentReference>(value)
        assertEquals(StudentSummary.StudentStatus.PENDING, reference.currentStudent().studentStatus)
        assertFalse(reference.toIdentityDisplay().readOnly)
    }

    @Test fun deletedIdentityCannotBecomeOwnRecordOrProgress() {
        val record = MapperWire.fixture("prior-workflow/record/full_pending_response").apply { add("student", deleted()) }
        assertThrows(IllegalArgumentException::class.java) { MapperWire.read<ExerciseRecord>(record).toStudentRecord() }
        val progress = MapperWire.fixture("prior-courses/progress/current").apply { add("student", deleted()) }
        assertThrows(IllegalArgumentException::class.java) { MapperWire.read<StudentCourseProgress>(progress).toStudentProgress() }
    }

    @Test fun unknownMissingAndPiiFailBeforeDisplay() {
        for (payload in listOf(deleted().apply { addProperty("name", "SYNTHETIC") },
            deleted().apply { addProperty("kind", "UNKNOWN") }, deleted().apply { remove("kind") })) {
            assertThrows(RuntimeException::class.java) { MapperWire.read<StudentReference>(payload).toIdentityDisplay() }
        }
        assertThrows(IllegalArgumentException::class.java) { StudentReference().toIdentityDisplay() }
    }
}
