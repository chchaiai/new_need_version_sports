package edu.bnbu.student.mvp.core.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import edu.bnbu.student.mvp.MainActivity
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** Receives data-only FCM messages and renders a generic, non-personal alert. */
class BnbuFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // Never render server-provided title/body fields. FCM payloads must remain
        // data-only; an opaque notice id only makes Android notification IDs stable.
        showGenericNotification(message.data[NotificationIdKey])
    }

    override fun onNewToken(token: String) {
        if (token.isBlank()) return
        val credentialStore = AndroidAppLocalStore(applicationContext)
        credentialStore.loadAuthSession() ?: return
        serviceScope.launch {
            FcmPushRegistrar.registerCurrentDevice(
                applicationContext,
                credentialStore
            )
        }
    }

    private fun showGenericNotification(notificationId: String?) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Services are not Activity contexts. Resolve all notification copy
        // through the same app-scoped locale context used by the UI.
        val localizedResources = AppLanguagePreferences.localizedContext(this).resources
        manager.createNotificationChannel(
            NotificationChannel(
                ChannelId,
                localizedResources.getString(R.string.push_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = localizedResources.getString(R.string.push_channel_description)
            }
        )
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        manager.notify(
            notificationId?.hashCode() ?: DefaultNotificationId,
            NotificationCompat.Builder(this, ChannelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(localizedResources.getString(R.string.push_generic_title))
                .setContentText(localizedResources.getString(R.string.push_generic_body))
                .setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        localizedResources.getString(R.string.push_generic_body)
                    )
                )
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()
        )
    }

    private companion object {
        const val ChannelId = "bnbu_campus_sports"
        const val NotificationIdKey = "notification_id"
        const val DefaultNotificationId = 8003
        val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }
}
