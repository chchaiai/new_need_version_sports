package edu.bnbu.student.mvp.core.push

import android.content.Context
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.local.EphemeralAuthSessionCredentialStore
import edu.bnbu.student.mvp.core.network.v1.V1StudentWorkspaceGateway
import edu.bnbu.student.mvp.core.network.v1.generated.PushDeviceRegistrationRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Synchronizes only the opaque FCM registration token, never student data. */
object FcmPushRegistrar {
    suspend fun registerCurrentDevice(
        context: Context,
        credentialStore: AndroidAppLocalStore
    ): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                check(FirebaseApp.initializeApp(context.applicationContext) != null) {
                    "Firebase is not configured"
                }
                val token = Tasks.await(FirebaseMessaging.getInstance().token).trim()
                check(token.isNotEmpty()) { "FCM returned an empty token" }
                val locale = if (
                    edu.bnbu.student.mvp.core.local.AppLanguagePreferences.currentLanguage.languageTag == "en"
                ) {
                    PushDeviceRegistrationRequest.Locale.en
                } else {
                    PushDeviceRegistrationRequest.Locale.zhMinusCN
                }
                val device = V1StudentWorkspaceGateway.create(credentialStore).registerPushDevice(
                    registrationToken = token,
                    appVersion = BuildConfig.VERSION_NAME,
                    locale = locale
                )
                context.getSharedPreferences(PushPreferenceName, Context.MODE_PRIVATE)
                    .edit()
                    .putString(PushDeviceIdKey, device.id)
                    .apply()
                Unit
            }
        }

    suspend fun unregisterCurrentDevice(
        context: Context,
        credentials: AuthSessionCredentials
    ): Result<Unit> = unregisterCurrentDevice(
        context,
        EphemeralAuthSessionCredentialStore(credentials)
    )

    internal suspend fun unregisterCurrentDevice(
        context: Context,
        credentialStore: AuthSessionCredentialStore
    ): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val preferences = context.getSharedPreferences(PushPreferenceName, Context.MODE_PRIVATE)
                val deviceId = preferences.getString(PushDeviceIdKey, null)
                    ?.takeIf(String::isNotBlank)
                    ?: return@runCatching
                V1StudentWorkspaceGateway.create(credentialStore)
                    .unregisterPushDevice(deviceId)
                preferences.edit().remove(PushDeviceIdKey).apply()
                Unit
            }
        }

    private const val PushPreferenceName = "bnbu_push_registration"
    private const val PushDeviceIdKey = "v1_push_device_id"
}
