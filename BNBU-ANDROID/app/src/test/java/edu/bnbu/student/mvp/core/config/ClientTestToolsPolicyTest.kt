package edu.bnbu.student.mvp.core.config

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientTestToolsPolicyTest {
    @Test
    fun requiresExplicitFlagAllowedEnvironmentAndBackendCapability() {
        val capability = setOf(ClientTestToolsPolicy.TestDurationAdvanceCapability)
        assertTrue(clientTestToolsEnabled(true, "local", capability))
        assertTrue(clientTestToolsEnabled(true, "test", capability))
        assertTrue(clientTestToolsEnabled(true, "staging", capability))
        assertFalse(clientTestToolsEnabled(false, "staging", capability))
        assertFalse(clientTestToolsEnabled(true, "staging", emptySet()))
        assertFalse(clientTestToolsEnabled(true, "staging", setOf("UNKNOWN")))
        assertFalse(clientTestToolsEnabled(true, "production", capability))
        assertFalse(clientTestToolsEnabled(true, "", capability))
    }
}
