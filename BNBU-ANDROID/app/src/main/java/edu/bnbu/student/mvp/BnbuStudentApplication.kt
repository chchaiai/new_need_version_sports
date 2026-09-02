package edu.bnbu.student.mvp

import android.app.Application
import android.content.Context
import edu.bnbu.student.mvp.core.designsystem.InterfaceTextResources
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences

/**
 * Installs the persisted interface locale before any Activity, Service, or
 * Compose composition can resolve resources.
 */
class BnbuStudentApplication : Application() {
    override fun attachBaseContext(base: Context) {
        // Do this before Application receives its base context.  That makes
        // application-scoped resources (including FCM services and splash
        // resources) observe the same language as the first Activity frame.
        super.attachBaseContext(AppLanguagePreferences.localizedContext(base))
    }

    override fun onCreate() {
        super.onCreate()
        // Kept explicit as a defensive invariant for any component that is
        // created with the application context rather than an Activity.
        AppLanguagePreferences.initialize(this)
        InterfaceTextResources.initialize(this)
    }
}
