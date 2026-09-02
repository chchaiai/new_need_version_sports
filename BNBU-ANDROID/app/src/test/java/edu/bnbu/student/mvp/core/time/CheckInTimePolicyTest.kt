package edu.bnbu.student.mvp.core.time

import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class CheckInTimePolicyTest {
    @Test
    fun businessDateAlwaysUsesBeijingInsteadOfTheStudentDeviceZone() {
        val submittedAt = "2026-08-08T00:30:00Z"

        assertEquals(LocalDate.of(2026, 8, 8), submittedAt.toBeijingBusinessDate())
        assertEquals(
            "Aug 7, 2026",
            submittedAt.studentLocalRecordDateText(
                locale = Locale.US,
                zoneId = ZoneId.of("America/Los_Angeles")
            )
        )
    }

    @Test
    fun recordDetailsRenderTheSameInstantInTheStudentDeviceZone() {
        assertEquals(
            "Aug 8, 2026, 6:50 AM",
            "2026-08-08T13:50:00Z".studentLocalRecordDateTimeText(
                locale = Locale.US,
                zoneId = ZoneId.of("America/Los_Angeles")
            )?.replace('\u202f', ' ')
        )
        assertEquals(
            "6:50 AM",
            "2026-08-08T13:50:00Z".studentLocalRecordTimeText(
                locale = Locale.US,
                zoneId = ZoneId.of("America/Los_Angeles")
            )?.replace('\u202f', ' ')
        )
    }
}
