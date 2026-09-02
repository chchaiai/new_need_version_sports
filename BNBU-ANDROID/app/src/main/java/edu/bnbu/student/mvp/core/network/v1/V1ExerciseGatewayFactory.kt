package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.exercise.ExerciseGateway
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore

/** Builds the V1 gateway only after authentication has supplied an active enrollment. */
internal fun createV1ExerciseGateway(
    credentialStore: AuthSessionCredentialStore
): ExerciseGateway? {
    val enrollmentId = credentialStore.loadAuthSession()?.enrollmentId
        ?.trim()
        ?.takeIf(String::isNotEmpty)
        ?: return null
    val authorizedClient = V1AuthorizedApiClient.create(credentialStore)
    return V1ExerciseSessionGateway(
        authorizedClient = authorizedClient,
        enrollmentIdProvider = {
            credentialStore.loadAuthSession()?.enrollmentId
                ?.trim()
                ?.takeIf(String::isNotEmpty)
                ?: enrollmentId
        }
    )
}
