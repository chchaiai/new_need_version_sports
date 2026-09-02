package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class EnduranceRunStatusTest {
    @Test
    fun parsesAllServerOutcomes() {
        assertEquals(EnduranceRunStatus.Recorded, EnduranceRunStatus.fromApi("recorded", 252))
        assertEquals(EnduranceRunStatus.Exempt, EnduranceRunStatus.fromApi("exempt", null))
        assertEquals(EnduranceRunStatus.Absent, EnduranceRunStatus.fromApi("absent", null))
        assertEquals(EnduranceRunStatus.NotRecorded, EnduranceRunStatus.fromApi("not_recorded", null))
    }

    @Test
    fun infersLegacyResponsesFromRecordedTimeOnly() {
        assertEquals(EnduranceRunStatus.Recorded, EnduranceRunStatus.fromApi(null, 252))
        assertEquals(EnduranceRunStatus.NotRecorded, EnduranceRunStatus.fromApi(null, null))
    }
}
