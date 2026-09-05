package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SystemModeTest {
    @Test
    fun parsesSupportedModesAndFailsClosedForRetiredOrUnknownValues() {
        assertEquals(SystemMode.NORMAL, SystemMode.from("NORMAL"))
        assertEquals(SystemMode.MAINTENANCE, SystemMode.from("MAINTENANCE"))
        assertEquals(SystemMode.MAINTENANCE, SystemMode.from("read_only"))
        assertEquals(SystemMode.MAINTENANCE, SystemMode.from("unknown"))
        assertEquals(SystemMode.MAINTENANCE, SystemMode.from(null))
        assertEquals(SystemMode.MAINTENANCE, SystemMode.from(""))
    }

    @Test
    fun onlyNormalAllowsWrites() {
        assertFalse(SystemMode.NORMAL.blocksWrites)
        assertTrue(SystemMode.MAINTENANCE.blocksWrites)
    }
}
