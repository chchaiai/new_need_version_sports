package edu.bnbu.student.mvp.core.local

/**
 * In-memory copy used only while logout finishes remote cleanup after the
 * durable application store has already been cleared for privacy.
 */
internal class EphemeralAuthSessionCredentialStore(
    initial: AuthSessionCredentials
) : AuthSessionCredentialStore {
    private var session: AuthSessionCredentials? = initial
    private var pendingRefreshIntent: PendingRefreshIntent? = null

    @Synchronized
    override fun saveAuthSession(session: AuthSessionCredentials): Boolean {
        this.session = session
        return true
    }

    @Synchronized
    override fun loadAuthSession(): AuthSessionCredentials? = session

    @Synchronized
    override fun savePendingRefreshIntent(intent: PendingRefreshIntent): Boolean {
        pendingRefreshIntent = intent
        return true
    }

    @Synchronized
    override fun loadPendingRefreshIntent(): PendingRefreshIntent? = pendingRefreshIntent

    @Synchronized
    override fun clearPendingRefreshIntent() {
        pendingRefreshIntent = null
    }

    @Synchronized
    override fun clearAuth() {
        session = null
        pendingRefreshIntent = null
    }
}
