# BNBU Sports Android

Android student client for BNBU Sports, built with Kotlin and Jetpack Compose.

## Requirements

- JDK 17
- Android SDK 35

## Build and test

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

The build verifies `app/openapi/openapi.snapshot.yaml` and generates model-only
Kotlin sources with `:app:openApiGenerate`. Generated files live under
`app/build/generated/openapi` and must not be edited by hand.

## Configuration

- `debug` is the local environment and defaults to the Android Emulator URL
  `http://10.0.2.2:13000/api/v1`. Override it with `BNBU_LOCAL_API_BASE_URL`
  when testing on a physical device on a controlled local network.
- `staging` requires an explicit HTTPS `BNBU_STAGING_API_BASE_URL` ending in
  `/api/v1`; the build fails closed when it is absent or invalid.
- `release` is the production environment and requires an explicit HTTPS
  `BNBU_PRODUCTION_API_BASE_URL` ending in `/api/v1`. `BNBU_API_BASE_URL` is
  accepted temporarily as a release-only compatibility alias.
- Copy `keystore.properties.example` to the ignored `keystore.properties` only on a protected machine when configuring release signing.
- `app/google-services.json` and signing credentials are intentionally not tracked.
