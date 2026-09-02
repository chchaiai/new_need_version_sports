package edu.bnbu.student.mvp.core.config

import edu.bnbu.student.mvp.BuildConfig

private val AllowedClientTestEnvironments = setOf("local", "test", "staging")

/**
 * Client-side half of the test-tools gate. This never grants Backend
 * authority: the internal endpoint independently fails closed outside its
 * environment/account guard.
 */
internal fun clientTestToolsEnabled(
    explicitFlag: Boolean,
    environment: String,
    backendCapabilities: Set<String>
): Boolean = explicitFlag &&
    environment.trim().lowercase() in AllowedClientTestEnvironments &&
    ClientTestToolsPolicy.TestDurationAdvanceCapability in backendCapabilities

internal object ClientTestToolsPolicy {
    val isEnabled: Boolean
        get() = BuildConfig.BNBU_TEST_TOOLS_ENABLED &&
            BuildConfig.BNBU_ENVIRONMENT.trim().lowercase() in AllowedClientTestEnvironments

    const val TestDurationAdvanceCapability = "TEST_DURATION_ADVANCE"
}
