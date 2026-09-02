package edu.bnbu.student.mvp.core.local

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import edu.bnbu.student.mvp.core.model.AppThemeMode
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.model.SportHourRule
import edu.bnbu.student.mvp.core.model.StudentWorkspace
import java.security.KeyStore
import java.security.MessageDigest
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

// Sensitive writes and destructive auth cleanup must be durable before the
// operation reports success. Callers perform normal writes on Dispatchers.IO;
// logout intentionally commits its small preference deletion synchronously.
@SuppressLint("ApplySharedPref")
class AndroidAppLocalStore(
    context: Context,
    private val gson: Gson = GsonBuilder().disableHtmlEscaping().create()
) : ExerciseSessionSnapshotStorage, AuthSessionCredentialStore {
    private val appContext = context.applicationContext

    private val preferences = appContext.getSharedPreferences(
        StoreName,
        Context.MODE_PRIVATE
    )

    // ── Encrypted private-data store ─────────────────────────────
    // Authentication, profile, workspace and draft data are encrypted at rest
    // using an Android Keystore-backed AES/GCM key. Sensitive values are never
    // written in plaintext when the Keystore is unavailable.
    private val encryptedPrefs: SharedPreferences =
        appContext.getSharedPreferences(
            "bnbu.student.secure.v1",
            Context.MODE_PRIVATE
        )

    fun loadWorkspace(): StudentWorkspace? = readWorkspace().value

    fun readWorkspace(): LocalStoreReadResult<StudentWorkspace> {
        val raw = read(WorkspaceStorageKey, StudentWorkspace::class.java)
        if (raw.value == null) return raw
        val sanitized = ensureWorkspaceDefaults(raw.value)
        return raw.copy(value = sanitized)
    }

    fun saveWorkspace(workspace: StudentWorkspace): Boolean {
        return save(WorkspaceStorageKey, workspace)
    }

    /**
     * Returns the academic year stored with the last workspace snapshot.
     * It is intentionally derived from the workspace so it cannot drift from
     * the data that will be discarded during a semester transition.
     */
    fun loadCachedAcademicYear(): String {
        return readWorkspace().value?.student?.currentAcademicYear.orEmpty().trim()
    }

    /**
     * Removes only data that belongs to the cached workspace. Authentication,
     * theme, language, and other user preferences are deliberately retained.
     */
    fun clearWorkspaceCache(): Boolean {
        return try {
            val metadataCleared = preferences.edit()
                .remove(WorkspaceStorageKey)
                .remove(LastSyncKey)
                .commit()
            val encryptedWorkspaceCleared = encryptedPrefs.edit()
                .remove(encryptedValueKey(WorkspaceStorageKey))
                .remove(encryptedIvKey(WorkspaceStorageKey))
                .commit()
            metadataCleared && encryptedWorkspaceCleared
        } catch (_: RuntimeException) {
            false
        }
    }

    // Each account acknowledges the reminder independently so changing accounts
    // never suppresses the first-time reminder for another student.
    fun hasShownHealthReminder(accountId: String): Boolean {
        val key = healthReminderStorageKey(accountId) ?: return true
        return preferences.getBoolean(key, false)
    }

    fun markHealthReminderShown(accountId: String) {
        val key = healthReminderStorageKey(accountId) ?: return
        preferences.edit().putBoolean(key, true).apply()
    }

    /**
     * The onboarding acknowledgement belongs to an account instead of a device
     * session. Logout must not make a returning student see it again.
     */
    fun hasCompletedOnboarding(accountId: String): Boolean {
        val key = onboardingStorageKey(accountId) ?: return true
        return preferences.getBoolean(key, false)
    }

    fun markOnboardingCompleted(accountId: String): Boolean {
        val key = onboardingStorageKey(accountId) ?: return false
        return try {
            preferences.edit().putBoolean(key, true).commit()
        } catch (_: RuntimeException) {
            false
        }
    }

    /**
     * The course-join guide is intentionally device-scoped: it can be shown
     * before a student account has been authenticated.
     */
    fun hasCompletedPreLoginCourseGuide(): Boolean =
        preferences.getBoolean(PreLoginCourseGuideCompletedKey, false)

    fun markPreLoginCourseGuideCompleted(): Boolean {
        return try {
            preferences.edit().putBoolean(PreLoginCourseGuideCompletedKey, true).commit()
        } catch (_: RuntimeException) {
            false
        }
    }

    /**
     * A completed legacy onboarding guide remains a completion signal so
     * existing accounts are not interrupted by the redesigned post-course guide.
     */
    fun hasCompletedPostEnrollmentGuide(accountId: String): Boolean {
        val key = postEnrollmentGuideStorageKey(accountId) ?: return true
        return hasCompletedOnboarding(accountId) || preferences.getBoolean(key, false)
    }

    fun markPostEnrollmentGuideCompleted(accountId: String): Boolean {
        val key = postEnrollmentGuideStorageKey(accountId) ?: return false
        return try {
            preferences.edit().putBoolean(key, true).commit()
        } catch (_: RuntimeException) {
            false
        }
    }

    /** Records the version and time at which the user accepted the privacy policy. */
    fun agreePrivacyPolicy(policyVersion: String, agreedAt: String) {
        preferences.edit()
            .putString(PrivacyPolicyVersionKey, policyVersion)
            .putString(PrivacyPolicyAgreedAtKey, agreedAt)
            .commit()
    }

    fun hasAgreedPrivacyPolicy(expectedVersion: String): Boolean =
        getPrivacyConsentInfo()?.first == expectedVersion

    fun getOrCreateInstallationId(): String {
        val existing = preferences.getString(InstallationIdKey, null)
            ?.takeIf { it.length in 1..128 }
        if (existing != null) return existing
        val created = "android-${UUID.randomUUID()}"
        check(preferences.edit().putString(InstallationIdKey, created).commit()) {
            "Could not persist installation identifier"
        }
        return created
    }

    /** Returns the accepted policy version and ISO-8601 acceptance time, if available. */
    fun getPrivacyConsentInfo(): Pair<String, String>? {
        val version = preferences.getString(PrivacyPolicyVersionKey, null)
        val agreedAt = preferences.getString(PrivacyPolicyAgreedAtKey, null)
        return if (version.isNullOrBlank() || agreedAt.isNullOrBlank()) null else version to agreedAt
    }

    override fun readExerciseSessionSnapshot(
        accountId: String
    ): LocalStoreReadResult<ExerciseSessionSnapshot> {
        val key = exerciseSessionStorageKey(accountId)
            ?: return LocalStoreReadResult(value = null, status = LocalStoreReadStatus.Discarded)
        return read(key, ExerciseSessionSnapshot::class.java)
    }

    override fun saveExerciseSessionSnapshot(
        accountId: String,
        snapshot: ExerciseSessionSnapshot
    ): Boolean {
        val key = exerciseSessionStorageKey(accountId) ?: return false
        return save(key, snapshot)
    }

    override fun clearExerciseSessionSnapshot(accountId: String) {
        val key = exerciseSessionStorageKey(accountId) ?: return
        preferences.edit().remove(key).commit()
        clearEncryptedValue(key)
    }

    /** Persists a complete v1 token pair as one Keystore-encrypted value. */
    override fun saveAuthSession(session: AuthSessionCredentials): Boolean {
        val stored = PersistedAuthSession(
            schemaVersion = AuthSessionSchemaVersion,
            sessionId = session.sessionId,
            enrollmentId = session.enrollmentId,
            principalUserId = session.principalUserId,
            accessToken = session.accessToken,
            refreshToken = session.refreshToken,
            accessTokenExpiresAt = session.accessTokenExpiresAt?.toString(),
            refreshTokenExpiresAt = session.refreshTokenExpiresAt?.toString(),
            isLegacyAccessOnly = session.isLegacyAccessOnly
        )
        val committed = saveSensitiveString(AuthSessionStorageKey, gson.toJson(stored))
        if (committed) clearLegacyAuthToken()
        return committed
    }

    override fun loadAuthSession(): AuthSessionCredentials? {
        val storedJson = readSensitiveString(AuthSessionStorageKey)
        if (storedJson != null) {
            val session = decodeAuthSession(storedJson)
            if (session != null) return session
            clearEncryptedValue(AuthSessionStorageKey)
            preferences.edit().remove(AuthSessionStorageKey).commit()
            clearLegacyAuthToken()
            return null
        }

        // One-time migration from both historical formats: an encrypted single
        // bearer token or the still older plaintext preference. A legacy token
        // cannot refresh, but it remains usable until the first v1 login/401.
        val legacyToken = loadLegacyAuthToken() ?: return null
        val migrated = AuthSessionCredentials.legacyAccessOnly(legacyToken)
        if (migrated != null && saveAuthSession(migrated)) return migrated

        // Never keep plaintext or an old parallel token namespace when secure
        // migration is unavailable.
        clearLegacyAuthToken()
        return null
    }

    override fun savePendingRefreshIntent(intent: PendingRefreshIntent): Boolean =
        saveSensitiveString(PendingRefreshIntentStorageKey, gson.toJson(intent))

    override fun loadPendingRefreshIntent(): PendingRefreshIntent? {
        val storedJson = readSensitiveString(PendingRefreshIntentStorageKey) ?: return null
        return runCatching { gson.fromJson(storedJson, PendingRefreshIntent::class.java) }
            .getOrNull()
            ?.takeIf { intent ->
                runCatching {
                    PendingRefreshIntent(
                        sessionId = intent.sessionId,
                        refreshTokenFingerprint = intent.refreshTokenFingerprint,
                        idempotencyKey = intent.idempotencyKey
                    )
                }.isSuccess
            }
            ?: run {
                clearPendingRefreshIntent()
                null
            }
    }

    override fun clearPendingRefreshIntent() {
        preferences.edit().remove(PendingRefreshIntentStorageKey).commit()
        clearEncryptedValue(PendingRefreshIntentStorageKey)
    }

    /** Compatibility bridge for old screens while their auth adapter migrates. */
    fun saveAuthToken(token: String): Boolean {
        val session = AuthSessionCredentials.legacyAccessOnly(token) ?: return false
        return saveAuthSession(session)
    }

    fun loadAuthToken(): String? = loadAuthSession()?.accessToken

    fun saveUserProfile(userProfileJson: String): Boolean {
        return saveSensitiveString(UserProfileKey, userProfileJson)
    }

    fun loadUserProfileJson(): String? {
        return readSensitiveString(UserProfileKey)
    }

    fun saveLastSyncTime(timestamp: String): Boolean {
        return try {
            preferences.edit().putString(LastSyncKey, timestamp).apply()
            true
        } catch (_: RuntimeException) { false }
    }

    fun loadLastSyncTime(): String? {
        return preferences.getString(LastSyncKey, null)
    }

    fun loadThemeMode(): AppThemeMode {
        return AppThemeMode.fromStorage(preferences.getString(ThemeModeKey, null))
    }

    fun saveThemeMode(mode: AppThemeMode): Boolean {
        return try {
            preferences.edit().putString(ThemeModeKey, mode.storageValue).apply()
            true
        } catch (_: RuntimeException) { false }
    }

    fun loadAppLanguage(): AppLanguage {
        return AppLanguagePreferences.load(appContext)
    }

    /** Synchronous so a selected language is durable before the Activity recreates. */
    fun saveAppLanguage(language: AppLanguage): Boolean {
        return try {
            AppLanguagePreferences.save(appContext, language)
        } catch (_: RuntimeException) { false }
    }

    override fun clearAuth() {
        preferences.edit()
            .remove(AuthTokenKey)
            .remove(AuthSessionStorageKey)
            .remove(PendingRefreshIntentStorageKey)
            .remove(UserProfileKey)
            .commit()
        encryptedPrefs.edit()
            .remove(AuthTokenEncryptedKey)
            .remove(AuthTokenIvKey)
            .remove(encryptedValueKey(AuthSessionStorageKey))
            .remove(encryptedIvKey(AuthSessionStorageKey))
            .remove(encryptedValueKey(PendingRefreshIntentStorageKey))
            .remove(encryptedIvKey(PendingRefreshIntentStorageKey))
            .remove(encryptedValueKey(UserProfileKey))
            .remove(encryptedIvKey(UserProfileKey))
            .commit()
    }

    fun clearAll() {
        preferences.edit()
            .remove(WorkspaceStorageKey)
            .remove(AuthTokenKey)
            .remove(AuthSessionStorageKey)
            .remove(PendingRefreshIntentStorageKey)
            .remove(UserProfileKey)
            .remove(LastSyncKey)
            .commit()
        encryptedPrefs.edit().clear().commit()
    }

    // ── AES/GCM encryption backed by Android Keystore ─────────────
    private fun encrypt(plaintext: String): EncryptedValue? {
        return try {
            val secretKey = getOrCreateKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val iv = cipher.iv  // 12-byte random IV
            val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            EncryptedValue(
                value = android.util.Base64.encodeToString(encrypted, android.util.Base64.NO_WRAP),
                iv = android.util.Base64.encodeToString(iv, android.util.Base64.NO_WRAP)
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun decrypt(encryptedValue: String, iv: String): String? {
        return try {
            val secretKey = getOrCreateKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val ivBytes = android.util.Base64.decode(iv, android.util.Base64.DEFAULT)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, ivBytes))
            val decrypted = cipher.doFinal(android.util.Base64.decode(encryptedValue, android.util.Base64.DEFAULT))
            String(decrypted, Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        val existing = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existing != null) return existing.secretKey

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()
        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    // ── Schema-evolution guard ──────────────────────────────────────
    // Gson bypasses Kotlin data-class constructors via UnsafeAllocator,
    // so `= emptyList()` defaults are never applied for fields added
    // AFTER the app was last launched. Old cached JSON leaves them null.
    private fun ensureWorkspaceDefaults(ws: StudentWorkspace): StudentWorkspace {
        val hourRuleNull = try {
            val f = StudentWorkspace::class.java.getDeclaredField("hourRule")
            f.isAccessible = true
            f.get(ws) == null
        } catch (_: NoSuchFieldException) { false }

        val teachersNull = try {
            val f = StudentWorkspace::class.java.getDeclaredField("teachers")
            f.isAccessible = true
            f.get(ws) == null
        } catch (_: NoSuchFieldException) { false }

        val syncOpsNull = try {
            val f = StudentWorkspace::class.java.getDeclaredField("syncOperations")
            f.isAccessible = true
            f.get(ws) == null
        } catch (_: NoSuchFieldException) { false }

        val exemptionsNull = try {
            val f = StudentWorkspace::class.java.getDeclaredField("exemptions")
            f.isAccessible = true
            f.get(ws) == null
        } catch (_: NoSuchFieldException) { false }

        if (!hourRuleNull && !teachersNull && !syncOpsNull && !exemptionsNull) return ws

        return ws.copy(
            hourRule = if (hourRuleNull) SportHourRule.Standard else ws.hourRule,
            teachers = if (teachersNull) emptyList() else ws.teachers,
            syncOperations = if (syncOpsNull) emptyList() else ws.syncOperations,
            exemptions = if (exemptionsNull) emptyList() else ws.exemptions
        )
    }

    private fun <T> read(key: String, clazz: Class<T>): LocalStoreReadResult<T> {
        val json = readSensitiveString(key)
            ?: return LocalStoreReadResult(value = null, status = LocalStoreReadStatus.Missing)

        return try {
            val value = gson.fromJson(json, clazz)
            if (value == null) {
                LocalStoreReadResult(value = null, status = LocalStoreReadStatus.DecodeFailed)
            } else {
                LocalStoreReadResult(value = value, status = LocalStoreReadStatus.Loaded)
            }
        } catch (_: RuntimeException) {
            LocalStoreReadResult(value = null, status = LocalStoreReadStatus.DecodeFailed)
        }
    }

    private fun save(key: String, value: Any): Boolean {
        return saveSensitiveString(key, gson.toJson(value))
    }

    private fun saveSensitiveString(key: String, value: String): Boolean {
        return try {
            val encrypted = encrypt(value) ?: return false
            val committed = encryptedPrefs.edit()
                .putString(encryptedValueKey(key), encrypted.value)
                .putString(encryptedIvKey(key), encrypted.iv)
                .commit()
            if (committed) preferences.edit().remove(key).commit()
            committed
        } catch (_: RuntimeException) {
            false
        }
    }

    private fun readSensitiveString(key: String): String? {
        return try {
            val encryptedValue = encryptedPrefs.getString(encryptedValueKey(key), null)
            val iv = encryptedPrefs.getString(encryptedIvKey(key), null)
            if (encryptedValue != null && iv != null) {
                decrypt(encryptedValue, iv).also { decrypted ->
                    if (decrypted == null) clearEncryptedValue(key)
                }
            } else {
                // Migrate older plaintext app data once. Never continue using a
                // plaintext value if it cannot be protected by the Keystore.
                val legacyValue = preferences.getString(key, null) ?: return null
                if (saveSensitiveString(key, legacyValue)) legacyValue else {
                    preferences.edit().remove(key).commit()
                    null
                }
            }
        } catch (_: RuntimeException) {
            null
        }
    }

    private fun clearEncryptedAuthToken() {
        encryptedPrefs.edit()
            .remove(AuthTokenEncryptedKey)
            .remove(AuthTokenIvKey)
            .commit()
    }

    private fun clearLegacyAuthToken() {
        preferences.edit().remove(AuthTokenKey).commit()
        clearEncryptedAuthToken()
    }

    private fun loadLegacyAuthToken(): String? {
        return try {
            val encryptedValue = encryptedPrefs.getString(AuthTokenEncryptedKey, null)
            val iv = encryptedPrefs.getString(AuthTokenIvKey, null)
            if (encryptedValue != null && iv != null) {
                decrypt(encryptedValue, iv).also { decrypted ->
                    if (decrypted == null) clearEncryptedAuthToken()
                }
            } else {
                preferences.getString(AuthTokenKey, null)
            }
        } catch (_: RuntimeException) {
            null
        }
    }

    private fun decodeAuthSession(json: String): AuthSessionCredentials? {
        return try {
            val stored = gson.fromJson(json, PersistedAuthSession::class.java)
                ?: return null
            if (stored.schemaVersion != AuthSessionSchemaVersion) return null
            AuthSessionCredentials.fromStored(
                sessionId = stored.sessionId,
                enrollmentId = stored.enrollmentId,
                principalUserId = stored.principalUserId,
                accessToken = stored.accessToken,
                refreshToken = stored.refreshToken,
                accessTokenExpiresAt = stored.accessTokenExpiresAt,
                refreshTokenExpiresAt = stored.refreshTokenExpiresAt,
                isLegacyAccessOnly = stored.isLegacyAccessOnly
            )
        } catch (_: RuntimeException) {
            null
        }
    }

    private fun clearEncryptedValue(key: String) {
        encryptedPrefs.edit()
            .remove(encryptedValueKey(key))
            .remove(encryptedIvKey(key))
            .commit()
    }

    private fun encryptedValueKey(key: String): String = "$key.encrypted"

    private fun encryptedIvKey(key: String): String = "$key.iv"

    private fun exerciseSessionStorageKey(accountId: String): String? {
        val normalizedAccountId = accountId.trim()
        if (normalizedAccountId.isEmpty()) return null
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(normalizedAccountId.toByteArray(Charsets.UTF_8))
            .joinToString(separator = "") { byte -> "%02x".format(byte) }
        return "$ExerciseSessionStorageKey.$digest"
    }

    private fun healthReminderStorageKey(accountId: String): String? {
        val normalizedAccountId = accountId.trim()
        if (normalizedAccountId.isEmpty()) return null
        return "$HealthReminderShownKeyPrefix$normalizedAccountId"
    }

    private fun onboardingStorageKey(accountId: String): String? {
        val normalizedAccountId = accountId.trim()
        if (normalizedAccountId.isEmpty()) return null
        return "$OnboardingCompletedKeyPrefix$normalizedAccountId"
    }

    private fun postEnrollmentGuideStorageKey(accountId: String): String? {
        val normalizedAccountId = accountId.trim()
        if (normalizedAccountId.isEmpty()) return null
        return "$PostEnrollmentGuideCompletedKeyPrefix$normalizedAccountId"
    }

    private data class EncryptedValue(val value: String, val iv: String)

    private data class PersistedAuthSession(
        val schemaVersion: Int = 0,
        val sessionId: String? = null,
        val enrollmentId: String? = null,
        val principalUserId: String? = null,
        val accessToken: String = "",
        val refreshToken: String? = null,
        val accessTokenExpiresAt: String? = null,
        val refreshTokenExpiresAt: String? = null,
        val isLegacyAccessOnly: Boolean = false
    )

    companion object {
        const val StoreName = "bnbu.student.local.v1"
        const val WorkspaceStorageKey = "bnbu.student.workspace.v1"
        const val ExerciseSessionStorageKey = "bnbu.student.exercise.session.v1"
        const val AuthTokenKey = "bnbu.student.auth.token.v1"
        const val AuthSessionStorageKey = "bnbu.student.auth.session.v2"
        const val PendingRefreshIntentStorageKey = "bnbu.student.auth.refresh-intent.v1"
        const val UserProfileKey = "bnbu.student.auth.profile.v1"
        const val LastSyncKey = "bnbu.student.last_sync.v1"
        const val ThemeModeKey = "bnbu.student.theme.mode.v1"
        const val LanguageKey = "bnbu.student.language.v1"
        private const val PrivacyPolicyVersionKey = "bnbu.student.privacy_policy.version.v1"
        private const val PrivacyPolicyAgreedAtKey = "bnbu.student.privacy_policy.agreed_at.v1"
        private const val HealthReminderShownKeyPrefix = "health_reminder_shown_"
        private const val OnboardingCompletedKeyPrefix = "onboarding_completed_"
        private const val PreLoginCourseGuideCompletedKey =
            "bnbu.student.pre_login_course_guide.completed.v1"
        private const val PostEnrollmentGuideCompletedKeyPrefix =
            "post_enrollment_guide_completed_"

        // Encrypted token storage keys
        private const val AuthTokenEncryptedKey = "bnbu.student.auth.token.encrypted"
        private const val AuthTokenIvKey = "bnbu.student.auth.token.iv"
        private const val AuthSessionSchemaVersion = 2
        private const val InstallationIdKey = "bnbu.student.installation.id.v1"

        private const val KEY_ALIAS = "bnbu_student_auth_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
