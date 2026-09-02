# Keep local JSON persistence stable if R8/minification is enabled for release.
# Gson reflects over model field names for the current SharedPreferences store.
-keep class edu.bnbu.student.mvp.core.model.** { *; }
-keep class edu.bnbu.student.mvp.core.local.** { *; }

# Keep network request/response models — Gson serialization relies on reflection
-keep class edu.bnbu.student.mvp.core.network.** { *; }

# Keep OkHttp internals (connection pool, HTTP/2, interceptors)
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep Android Keystore encryption classes
-keep class javax.crypto.** { *; }
-keep class android.security.keystore.** { *; }

# Coil 3 uses service loading and reflective component discovery.
-keep class coil3.** { *; }
-dontwarn coil3.**

# ZXing Android Embedded discovers barcode formats and camera integration at runtime.
-keep class com.journeyapps.** { *; }
-keep class com.google.zxing.** { *; }

# Firebase Cloud Messaging registers services and handlers from manifest/runtime metadata.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Gson requires generic signatures and SerializedName-annotated fields at runtime.
-keepattributes Signature,InnerClasses,EnclosingMethod
-keepattributes *Annotation*
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Compose supplies its own consumer rules; suppress optional-class warnings during R8.
-dontwarn androidx.compose.**

# Preserve coroutine runtime classes used by asynchronous application work.
-keep class kotlinx.coroutines.** { *; }
