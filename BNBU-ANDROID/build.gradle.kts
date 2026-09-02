plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("org.openapi.generator") version "7.24.0" apply false
    // Applied by :app only when its real Firebase configuration is present.
    id("com.google.gms.google-services") version "4.4.2" apply false
}
