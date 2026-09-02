import java.net.URI
import java.security.MessageDigest
import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.openapitools.generator.gradle.plugin.tasks.GenerateTask

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.openapi.generator")
}

// google-services.json identifies the Firebase project; it is intentionally
// supplied by the release environment, never generated or substituted here.
if (file("google-services.json").isFile) {
    apply(plugin = "com.google.gms.google-services")
}

fun String.asBuildConfigString(): String =
    "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

fun configuredValue(name: String): String? = providers.gradleProperty(name)
    .orElse(providers.environmentVariable(name))
    .orNull
    ?.trim()
    ?.takeIf { it.isNotEmpty() }

val configuredLocalApiBaseUrl = configuredValue("BNBU_LOCAL_API_BASE_URL")
val configuredStagingApiBaseUrl = configuredValue("BNBU_STAGING_API_BASE_URL")
val configuredProductionApiBaseUrl =
    configuredValue("BNBU_PRODUCTION_API_BASE_URL") ?: configuredValue("BNBU_API_BASE_URL")
val configuredOrganizationCode = configuredValue("BNBU_ORGANIZATION_CODE")
val configuredTestToolsEnabled = configuredValue("BNBU_TEST_TOOLS_ENABLED")
    ?.equals("true", ignoreCase = true) == true

// Release signing material is deliberately external to source control.  CI must
// supply these values as environment variables; a locally ignored
// keystore.properties file is supported for a developer's protected machine.
val localSigningProperties = Properties()
val localSigningPropertiesFile = rootProject.file("keystore.properties")
if (localSigningPropertiesFile.isFile) {
    localSigningPropertiesFile.inputStream().use(localSigningProperties::load)
}

fun releaseSigningValue(name: String): String? = providers.environmentVariable(name)
    .orElse(providers.gradleProperty(name))
    .orElse(providers.provider { localSigningProperties.getProperty(name) })
    .orNull
    ?.trim()
    ?.takeIf { it.isNotEmpty() }

val releaseStoreFileValue = releaseSigningValue("BNBU_RELEASE_STORE_FILE")
val releaseStorePassword = releaseSigningValue("BNBU_RELEASE_STORE_PASSWORD")
val releaseKeyAlias = releaseSigningValue("BNBU_RELEASE_KEY_ALIAS")
val releaseKeyPassword = releaseSigningValue("BNBU_RELEASE_KEY_PASSWORD")
val releaseStoreFile = releaseStoreFileValue?.let(rootProject::file)
val missingReleaseSigningValues = listOf(
    "BNBU_RELEASE_STORE_FILE" to releaseStoreFileValue,
    "BNBU_RELEASE_STORE_PASSWORD" to releaseStorePassword,
    "BNBU_RELEASE_KEY_ALIAS" to releaseKeyAlias,
    "BNBU_RELEASE_KEY_PASSWORD" to releaseKeyPassword
).filter { (_, value) -> value == null }.map { (name, _) -> name }

android {
    namespace = "edu.bnbu.student.mvp"
    compileSdk = 35

    defaultConfig {
        applicationId = "edu.bnbu.student.mvp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-mvp"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "PRIVACY_POLICY_VERSION", "\"2.2\"")
        // Fail closed for every variant unless a build type explicitly
        // tightens both the flag and environment checks below.
        buildConfigField("boolean", "BNBU_TEST_TOOLS_ENABLED", "false")

    }

    signingConfigs {
        create("release") {
            // Do not set empty values: preReleaseBuild reports a clear error
            // through validateReleaseSigningConfiguration below.
            if (missingReleaseSigningValues.isEmpty()) {
                storeFile = releaseStoreFile
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField("String", "BNBU_ENVIRONMENT", "local".asBuildConfigString())
            buildConfigField("boolean", "BNBU_ALLOW_CLEARTEXT_API", "true")
            buildConfigField(
                "boolean",
                "BNBU_TEST_TOOLS_ENABLED",
                configuredTestToolsEnabled.toString()
            )
            buildConfigField(
                "String",
                "BNBU_ORGANIZATION_CODE",
                (configuredOrganizationCode ?: "BNBU").asBuildConfigString()
            )
            buildConfigField(
                "String",
                "BNBU_API_BASE_URL",
                (configuredLocalApiBaseUrl ?: "http://10.0.2.2:13000/api/v1")
                    .asBuildConfigString()
            )
        }
        create("staging") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "BNBU_ENVIRONMENT", "staging".asBuildConfigString())
            buildConfigField("boolean", "BNBU_ALLOW_CLEARTEXT_API", "false")
            buildConfigField(
                "boolean",
                "BNBU_TEST_TOOLS_ENABLED",
                configuredTestToolsEnabled.toString()
            )
            buildConfigField(
                "String",
                "BNBU_ORGANIZATION_CODE",
                (configuredOrganizationCode ?: "configuration-required").asBuildConfigString()
            )
            buildConfigField(
                "String",
                "BNBU_API_BASE_URL",
                (configuredStagingApiBaseUrl
                    ?: "https://staging-configuration-required.invalid/api/v1")
                    .asBuildConfigString()
            )
        }
        release {
            isMinifyEnabled = true
            signingConfig = signingConfigs.getByName("release")
            buildConfigField("String", "BNBU_ENVIRONMENT", "production".asBuildConfigString())
            buildConfigField("boolean", "BNBU_ALLOW_CLEARTEXT_API", "false")
            buildConfigField("boolean", "BNBU_TEST_TOOLS_ENABLED", "false")
            buildConfigField(
                "String",
                "BNBU_ORGANIZATION_CODE",
                (configuredOrganizationCode ?: "configuration-required").asBuildConfigString()
            )
            buildConfigField(
                "String",
                "BNBU_API_BASE_URL",
                // preReleaseBuild requires an explicit HTTPS value. The
                // placeholder only keeps IDE model/sync generation valid.
                (configuredProductionApiBaseUrl
                    ?: "https://production-configuration-required.invalid/api/v1")
                    .asBuildConfigString()
            )
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    bundle {
        language {
            enableSplit = false
        }
    }

    sourceSets.getByName("main").java.srcDir(
        layout.buildDirectory.dir("generated/openapi/src/main/kotlin")
    )
    sourceSets.getByName("test").java.srcDir(
        layout.buildDirectory.dir("generated/phase5ga-contract/src/main/kotlin")
    )
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.fragment:fragment:1.8.5")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("com.google.code.gson:gson:2.11.0")
    implementation("io.coil-kt.coil3:coil-compose:3.0.4")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")
    implementation("io.coil-kt.coil3:coil-video:3.0.4")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("com.google.android.play:app-update-ktx:2.1.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.exifinterface:exifinterface:1.4.2")
    // Last stable lines compatible with this checkout's compileSdk 35 / AGP 8.7.
    implementation("androidx.camera:camera-core:1.5.3")
    implementation("androidx.camera:camera-camera2:1.5.3")
    implementation("androidx.camera:camera-lifecycle:1.5.3")
    implementation("androidx.camera:camera-video:1.5.3")
    implementation("androidx.camera:camera-view:1.5.3")
    implementation("androidx.media3:media3-common:1.8.0")
    implementation("androidx.media3:media3-effect:1.8.0")
    implementation("androidx.media3:media3-transformer:1.8.0")

    // Firebase BoM keeps Google Play services / FCM artifacts mutually compatible.
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")

    // Networking & async (student backend integration)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("com.squareup.okhttp3:okhttp-tls:4.12.0")

    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4-android")
    // Android 17 removed the reflected InputManager.getInstance() path used
    // by older Espresso releases. 3.7.0 uses the supported system-service API.
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.7.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

val openApiSnapshotFile = layout.projectDirectory.file("openapi/openapi.snapshot.yaml")
val openApiContractMetadataFile = layout.projectDirectory.file("openapi/contract.properties")
val generatedOpenApiRoot = layout.buildDirectory.dir("generated/openapi")
val phase5gaContractFile = rootProject.layout.projectDirectory.file("../contracts/openapi.yaml")
val phase5gaContractMetadataFile = rootProject.layout.projectDirectory.file("../contracts/contract-metadata.json")
val phase5gaGeneratedOpenApiRoot = layout.buildDirectory.dir("generated/phase5ga-contract")
val phase5gaContractVersion = "1.2.0-contract"
val phase5gaContractStatus = "RC"
val phase5gaContractSha256 = "667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a"
val phase5gaContractOperationCount = 121
val phase5gaGeneratedPackage = "edu.bnbu.student.mvp.phase5ga.generated"
val openApiContractProperties = Properties().apply {
    val metadata = openApiContractMetadataFile.asFile
    check(metadata.isFile) { "Missing OpenAPI contract metadata: $metadata" }
    metadata.inputStream().use(::load)
}

fun requiredOpenApiProperty(name: String): String =
    openApiContractProperties.getProperty(name)?.trim()?.takeIf { it.isNotEmpty() }
        ?: throw GradleException("Missing OpenAPI contract metadata property: $name")

val verifyPhase5gaContractBinding by tasks.registering {
    group = "verification"
    description = "Binds Phase 5G-A validation-only generation to the locked 1.2.0 root contract without migrating the legacy runtime."
    inputs.file(phase5gaContractFile)
    inputs.file(phase5gaContractMetadataFile)
    inputs.property("contractVersion", phase5gaContractVersion)
    inputs.property("contractStatus", phase5gaContractStatus)
    inputs.property("contractSha256", phase5gaContractSha256)
    inputs.property("operationCount", phase5gaContractOperationCount)

    doLast {
        val contract = phase5gaContractFile.asFile
        check(contract.isFile) { "Missing Phase 5G-A root OpenAPI contract: $contract" }
        val metadata = phase5gaContractMetadataFile.asFile
        check(metadata.isFile) { "Missing Phase 5G-A Contract metadata: $metadata" }
        val bytes = contract.readBytes()
        check(bytes.none { it == '\r'.code.toByte() }) {
            "Phase 5G-A OpenAPI contract must use LF line endings."
        }
        val actualHash = MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { byte ->
                (byte.toInt() and 0xff).toString(16).padStart(2, '0')
            }
        check(actualHash == phase5gaContractSha256) {
            "Phase 5G-A OpenAPI SHA-256 mismatch. Expected $phase5gaContractSha256 but found $actualHash."
        }

        val text = bytes.toString(Charsets.UTF_8)
        check(Regex("(?m)^  version: ${Regex.escape(phase5gaContractVersion)}\\s*$").containsMatchIn(text)) {
            "Phase 5G-A OpenAPI version must be $phase5gaContractVersion."
        }
        check(Regex("(?m)^  x-contract-status: ${Regex.escape(phase5gaContractStatus)}\\s*$").containsMatchIn(text)) {
            "Phase 5G-A OpenAPI status must be $phase5gaContractStatus."
        }
        check(Regex("(?m)^- url: /api/v1\\s*$").containsMatchIn(text)) {
            "Phase 5G-A OpenAPI must declare the single /api/v1 server prefix."
        }
        val actualOperationCount = Regex("(?m)^\\s+operationId:\\s+\\S+\\s*$")
            .findAll(text)
            .count()
        check(actualOperationCount == phase5gaContractOperationCount) {
            "Phase 5G-A OpenAPI operation count mismatch. Expected $phase5gaContractOperationCount but found $actualOperationCount."
        }

        val metadataText = metadata.readText(Charsets.UTF_8)
        val requiredMetadataEntries = listOf(
            "\"contractVersion\": \"$phase5gaContractVersion\"",
            "\"contractStatus\": \"$phase5gaContractStatus\"",
            "\"openapiSha256\": \"$phase5gaContractSha256\"",
            "\"operationCount\": $phase5gaContractOperationCount"
        )
        val missingMetadataEntries = requiredMetadataEntries.filterNot(metadataText::contains)
        check(missingMetadataEntries.isEmpty()) {
            "Phase 5G-A metadata does not match the validation binding: ${missingMetadataEntries.joinToString()}"
        }
    }
}

val phase5gaOpenApiGenerate by tasks.registering(GenerateTask::class) {
    group = "build setup"
    description = "Generates isolated model-only Kotlin sources for the locked Phase 5G-A contract."
    dependsOn(verifyPhase5gaContractBinding)
    generatorName.set("kotlin")
    library.set("jvm-okhttp4")
    inputSpec.set(phase5gaContractFile.asFile.absolutePath)
    outputDir.set(phase5gaGeneratedOpenApiRoot.get().asFile.absolutePath)
    modelPackage.set(phase5gaGeneratedPackage)
    apiPackage.set("$phase5gaGeneratedPackage.api")
    invokerPackage.set("$phase5gaGeneratedPackage.infrastructure")
    validateSpec.set(true)
    globalProperties.set(
        mapOf(
            "models" to "",
            "modelDocs" to "false",
            "modelTests" to "false",
            "apis" to "false",
            "apiDocs" to "false",
            "apiTests" to "false",
            "supportingFiles" to "false"
        )
    )
    configOptions.set(
        mapOf(
            "sourceFolder" to "src/main/kotlin",
            "dateLibrary" to "java8",
            "serializationLibrary" to "gson",
            "collectionType" to "list",
            "enumPropertyNaming" to "original",
            "modelMutable" to "false"
        )
    )
    schemaMappings.set(
        mapOf(
            "MediaAsset_contentType" to "kotlin.String?",
            "MediaAsset_byteSize" to "kotlin.Long?",
            "MediaAsset_checksumSha256" to "kotlin.String?",
            "MediaAsset_durationMilliseconds" to "kotlin.Long?",
            "MediaAsset_hasAudio" to "kotlin.Boolean?",
            "MediaAsset_widthPixels" to "kotlin.Int?",
            "MediaAsset_rejectionCode" to "MediaFinalizationRejectionCode?"
        )
    )
    importMappings.set(
        mapOf(
            "MediaFinalizationRejectionCode?" to
                "$phase5gaGeneratedPackage.MediaFinalizationRejectionCode"
        )
    )
    doFirst {
        delete(phase5gaGeneratedOpenApiRoot)
    }
}

val verifyPhase5gaGeneratedOpenApiModels by tasks.registering {
    group = "verification"
    description = "Verifies Phase 5A.1 mappings plus every Android-facing schema affected by Phase 5G-A."
    dependsOn(phase5gaOpenApiGenerate)
    inputs.property("contractSha256", phase5gaContractSha256)
    outputs.upToDateWhen { false }

    doLast {
        val modelRoot = phase5gaGeneratedOpenApiRoot.get().asFile.resolve(
            "src/main/kotlin/" + phase5gaGeneratedPackage.replace('.', '/')
        )
        val expectedModels = listOf(
            "CertificationDetails.kt",
            "CertificationKind.kt",
            "CourseInvitationPreview.kt",
            "CreateCertificationApplicationRequest.kt",
            "CreateStudentApplicationRequest.kt",
            "DirectUploadHttpMethod.kt",
            "ErrorEnvelope.kt",
            "ExerciseSession.kt",
            "MediaAllocation.kt",
            "MediaFinalizationRejectionCode.kt",
            "MediaFinalizationResult.kt",
            "PasswordChangeRequest.kt",
            "PasswordResetRequest.kt",
            "SemesterSummary.kt",
            "StudentApplication.kt",
            "StudentApplicationPage.kt",
            "StudentDashboard.kt",
            "StudentSummary.kt",
            "UpdateSubAdminRequest.kt"
        )
        val missing = expectedModels.filterNot { modelRoot.resolve(it).isFile }
        check(missing.isEmpty()) {
            "Phase 5G-A generated models are missing: ${missing.joinToString()}"
        }
        val generatedFiles = modelRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .toList()
        check(generatedFiles.isNotEmpty()) { "Phase 5G-A generation produced no Kotlin models." }
        val expectedPackage = "package $phase5gaGeneratedPackage"
        val unexpectedPackages = generatedFiles.filterNot { file ->
            file.useLines { lines -> lines.any { it.trim() == expectedPackage } }
        }
        check(unexpectedPackages.isEmpty()) {
            "Phase 5G-A generation produced sources outside the isolated package: " +
                unexpectedPackages.joinToString { it.relativeTo(modelRoot).path }
        }

        val mediaFinalizationResult = modelRoot.resolve("MediaFinalizationResult.kt")
            .readText(Charsets.UTF_8)
        val expectedBindingTypes = listOf(
            "val contentType: kotlin.String?",
            "val byteSize: kotlin.Long?",
            "val checksumSha256: kotlin.String?",
            "val durationMilliseconds: kotlin.Long?",
            "val hasAudio: kotlin.Boolean?",
            "val widthPixels: kotlin.Int?",
            "val heightPixels: kotlin.Int?",
            "val rejectionCode: MediaFinalizationRejectionCode?"
        )
        val missingBindingTypes = expectedBindingTypes.filterNot(mediaFinalizationResult::contains)
        check(missingBindingTypes.isEmpty()) {
            "Phase 5A.1 MediaFinalizationResult mappings regressed: ${missingBindingTypes.joinToString()}"
        }
        check(
            mediaFinalizationResult.contains(
                "import $phase5gaGeneratedPackage.MediaFinalizationRejectionCode"
            )
        ) {
            "Phase 5A.1 rejectionCode must import the generated rejection enum."
        }

        val forbiddenWrapperModels = listOf(
            "MediaAssetContentType.kt",
            "MediaAssetByteSize.kt",
            "MediaAssetChecksumSha256.kt",
            "MediaAssetDurationMilliseconds.kt",
            "MediaAssetHasAudio.kt",
            "MediaAssetWidthPixels.kt",
            "MediaAssetRejectionCode.kt"
        ).filter { modelRoot.resolve(it).exists() }
        check(forbiddenWrapperModels.isEmpty()) {
            "Phase 5A.1 nullable primitive/enum wrappers must not be generated: " +
                forbiddenWrapperModels.joinToString()
        }

        val certificationKind = modelRoot.resolve("CertificationKind.kt").readText(Charsets.UTF_8)
        val requiredCertificationEnumValues = listOf(
            "SCHOOL_TEAM(\"SCHOOL_TEAM\")",
            "STUDENT_CLUB(\"STUDENT_CLUB\")"
        )
        check(requiredCertificationEnumValues.all(certificationKind::contains)) {
            "Phase 5G-A CertificationKind must contain SCHOOL_TEAM and STUDENT_CLUB."
        }
        check(!certificationKind.contains("UNKNOWN")) {
            "Phase 5G-A CertificationKind must not generate an UNKNOWN fallback."
        }

        val certificationDetails = modelRoot.resolve("CertificationDetails.kt").readText(Charsets.UTF_8)
        check(certificationDetails.contains("val certificationKind: CertificationKind")) {
            "Phase 5G-A CertificationDetails.certificationKind must be required, non-null, and typed."
        }
        check(!certificationDetails.contains("val certificationKind: kotlin.String")) {
            "Phase 5G-A CertificationDetails.certificationKind must not fall back to String."
        }

        val certificationRequest = modelRoot.resolve("CreateCertificationApplicationRequest.kt")
            .readText(Charsets.UTF_8)
        check(certificationRequest.contains("val certification: CertificationDetails")) {
            "Phase 5G-A certification request must bind the generated CertificationDetails model."
        }

        val studentApplication = modelRoot.resolve("StudentApplication.kt").readText(Charsets.UTF_8)
        check(studentApplication.contains("val certification: CertificationDetails?")) {
            "Phase 5G-A response binding must expose nullable CertificationDetails for the shared application union."
        }

        val updateSubAdmin = modelRoot.resolve("UpdateSubAdminRequest.kt").readText(Charsets.UTF_8)
        check(!updateSubAdmin.contains("newPassword") && !updateSubAdmin.contains("confirmNewPassword")) {
            "Phase 5G-A Password schemas regressed: UpdateSubAdminRequest must not expose credential fields."
        }
    }
}

tasks.matching { it.name.contains("DebugUnitTest") }.configureEach {
    dependsOn(phase5gaOpenApiGenerate)
}

val verifyOpenApiContractBinding by tasks.registering {
    group = "verification"
    description = "Verifies the vendored OpenAPI snapshot, LF bytes, version, prefix, and operation count."
    inputs.file(openApiSnapshotFile)
    inputs.file(openApiContractMetadataFile)

    doLast {
        val snapshot = openApiSnapshotFile.asFile
        check(snapshot.isFile) { "Missing vendored OpenAPI snapshot: $snapshot" }
        val bytes = snapshot.readBytes()
        check(bytes.none { it == '\r'.code.toByte() }) {
            "OpenAPI snapshot must use LF line endings; do not accept a Windows CRLF hash."
        }

        val actualHash = MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { byte ->
                (byte.toInt() and 0xff).toString(16).padStart(2, '0')
            }
        val expectedHash = requiredOpenApiProperty("sha256").lowercase()
        check(actualHash == expectedHash) {
            "OpenAPI SHA-256 mismatch. Expected $expectedHash but found $actualHash. " +
                "Do not edit the snapshot or treat a CRLF hash as authoritative."
        }

        val text = bytes.toString(Charsets.UTF_8)
        val expectedVersion = requiredOpenApiProperty("contractVersion")
        check(Regex("(?m)^  version: ${Regex.escape(expectedVersion)}\\s*$").containsMatchIn(text)) {
            "OpenAPI contract version does not match contract.properties: $expectedVersion"
        }
        check(Regex("(?m)^  - url: /api/v1\\s*$").containsMatchIn(text)) {
            "OpenAPI snapshot must declare the single /api/v1 server prefix."
        }
        val actualOperationCount = Regex("(?m)^\\s+operationId:\\s+\\S+\\s*$")
            .findAll(text)
            .count()
        val expectedOperationCount = requiredOpenApiProperty("operationCount").toInt()
        check(actualOperationCount == expectedOperationCount) {
            "OpenAPI operation count mismatch. Expected $expectedOperationCount but found $actualOperationCount."
        }
    }
}

openApiGenerate {
    generatorName.set("kotlin")
    library.set("jvm-okhttp4")
    inputSpec.set(openApiSnapshotFile.asFile.absolutePath)
    outputDir.set(generatedOpenApiRoot.get().asFile.absolutePath)
    modelPackage.set(requiredOpenApiProperty("generatedPackage"))
    apiPackage.set("edu.bnbu.student.mvp.core.network.v1.generated.api")
    invokerPackage.set("edu.bnbu.student.mvp.core.network.v1.generated.infrastructure")
    validateSpec.set(true)
    globalProperties.set(
        mapOf(
            "models" to "",
            "modelDocs" to "false",
            "modelTests" to "false",
            "apis" to "false",
            "apiDocs" to "false",
            "apiTests" to "false",
            "supportingFiles" to "false"
        )
    )
    configOptions.set(
        mapOf(
            "sourceFolder" to "src/main/kotlin",
            "dateLibrary" to "java8",
            "serializationLibrary" to "gson",
            "collectionType" to "list",
            "enumPropertyNaming" to "original",
            "modelMutable" to "false"
        )
    )
}

tasks.named("openApiGenerate") {
    dependsOn(verifyOpenApiContractBinding)
    doFirst {
        delete(generatedOpenApiRoot)
    }
}

val normalizeGeneratedOpenApiModels by tasks.registering {
    group = "build setup"
    description = "Applies deterministic Kotlin-generator compatibility fixes without changing the OpenAPI snapshot."
    dependsOn(tasks.named("openApiGenerate"))
    inputs.property("contractSha256", requiredOpenApiProperty("sha256"))
    inputs.property("generatorVersion", requiredOpenApiProperty("generatorVersion"))
    outputs.upToDateWhen { false }

    doLast {
        val modelRoot = generatedOpenApiRoot.get().asFile.resolve(
            "src/main/kotlin/" + requiredOpenApiProperty("generatedPackage").replace('.', '/')
        )

        fun rewriteModel(fileName: String, oldText: String, newText: String) {
            val file = modelRoot.resolve(fileName)
            check(file.isFile) { "Expected generated model is missing: $fileName" }
            val current = file.readText(Charsets.UTF_8)
            when {
                oldText in current -> file.writeText(current.replace(oldText, newText), Charsets.UTF_8)
                newText in current -> Unit
                else -> error(
                    "OpenAPI Generator output changed for $fileName. " +
                        "Review the compatibility shim instead of editing generated code."
                )
            }
        }

        val generatedPackage = requiredOpenApiProperty("generatedPackage")
        listOf("EmptyEnvelope.kt", "ReviewRecord.kt").forEach { fileName ->
            rewriteModel(
                fileName,
                "import $generatedPackage.Null\n",
                ""
            )
        }
        rewriteModel(
            "EmptyEnvelope.kt",
            "val `data`: Null,",
            "val `data`: kotlin.Nothing?,"
        )
        rewriteModel(
            "ReviewRecord.kt",
            "val creditedDurationOverrideSeconds: Null,",
            "val creditedDurationOverrideSeconds: kotlin.Nothing?,"
        )
        rewriteModel(
            "ScoreRuleCalculationDefinition.kt",
            "_100Period0(\"100.0\");",
            "_100Period0(java.math.BigDecimal(\"100.0\"));"
        )
        val localTimeCompatibilityModel = modelRoot.resolve("ClassSectionDailyStartTime.kt")
        check(localTimeCompatibilityModel.isFile) {
            "Expected generated model is missing: ClassSectionDailyStartTime.kt"
        }
        val localTimePackage = "package $generatedPackage"
        localTimeCompatibilityModel.writeText(
            "$localTimePackage\n\n" +
                "/** Organization-local wall time from the V1 contract. */\n" +
                "typealias ClassSectionDailyStartTime = java.time.LocalTime\n",
            Charsets.UTF_8
        )
    }
}

val verifyGeneratedOpenApiModels by tasks.registering {
    group = "verification"
    description = "Ensures the OpenAPI task generated model-only Kotlin sources in the isolated v1 package."
    dependsOn(normalizeGeneratedOpenApiModels)
    inputs.file(openApiContractMetadataFile)
    outputs.upToDateWhen { false }

    doLast {
        val generatedRoot = generatedOpenApiRoot.get().asFile
        val kotlinFiles = generatedRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .toList()
        check(kotlinFiles.isNotEmpty()) { "OpenAPI generation produced no Kotlin models." }

        val expectedPackage = "package ${requiredOpenApiProperty("generatedPackage")}"
        val unexpectedPackages = kotlinFiles.filterNot { file ->
            file.useLines { lines -> lines.any { it.trim() == expectedPackage } }
        }
        check(unexpectedPackages.isEmpty()) {
            "OpenAPI generation produced non-model Kotlin sources: " +
                unexpectedPackages.joinToString { it.relativeTo(generatedRoot).path }
        }
    }
}

/**
 * Locale must come from AppLanguagePreferences, never directly from the
 * device. Keeping this as a build-time boundary prevents a newly added page,
 * dialog, service, or formatter from reintroducing the cold-start mismatch.
 */
val verifyAppLocaleBoundary by tasks.registering {
    group = "verification"
    description = "Rejects direct system-locale reads in production Kotlin sources."
    val sources = fileTree("src/main/java") { include("**/*.kt") }
    inputs.files(sources)

    doLast {
        val forbidden = listOf(
            Regex("\\b(?:java\\.util\\.)?Locale\\.getDefault\\(\\)"),
            Regex("\\bResources\\.getSystem\\(\\)"),
            Regex("\\bLocaleList\\.getDefault\\(\\)")
        )
        val violations = sources.files.flatMap { source ->
            source.readLines().mapIndexedNotNull { index, line ->
                if (forbidden.any { expression -> expression.containsMatchIn(line) }) {
                    "${source.relativeTo(projectDir)}:${index + 1}: $line"
                } else {
                    null
                }
            }
        }
        check(violations.isEmpty()) {
            "Use AppLanguagePreferences.currentLocale or localizedContext instead of " +
                "reading the device locale directly:\n${violations.joinToString("\n")}"
        }
    }
}

/** Prevents the pre-contract Android route table from reappearing in production code. */
val verifyV1ApiBoundary by tasks.registering {
    group = "verification"
    description = "Rejects legacy Android endpoint symbols and route literals outside the OpenAPI-backed V1 layer."
    val sources = fileTree("src/main/java") { include("**/*.kt") }
    inputs.files(sources)

    doLast {
        val forbiddenMarkers = listOf(
            "StudentEndpoint",
            "class StudentApiClient",
            "data class StudentApiClient",
            "\"/auth/login\"",
            "\"/sport/",
            "\"/common/notifications",
            "\"/student/",
            "\"/upload/proof\"",
            "\"/scoring/"
        )
        val violations = sources.files.flatMap { file ->
            file.readLines(Charsets.UTF_8).mapIndexedNotNull { index, line ->
                forbiddenMarkers.firstOrNull(line::contains)?.let { marker ->
                    "${file.relativeTo(projectDir)}:${index + 1} contains $marker"
                }
            }
        }
        check(violations.isEmpty()) {
            "Legacy Android API boundary violation:\n${violations.joinToString("\n")}"
        }
    }
}

tasks.named("preBuild") {
    dependsOn(verifyAppLocaleBoundary)
    dependsOn(verifyV1ApiBoundary)
    dependsOn(verifyOpenApiContractBinding)
    dependsOn(verifyGeneratedOpenApiModels)
}

fun validateRemoteApiBaseUrl(
    environment: String,
    propertyName: String,
    value: String?,
    expectedHost: String? = null
) {
    val resolved = value
        ?: throw GradleException(
            "$environment builds require -P$propertyName=https://your-$environment-domain/api/v1 " +
                "or the $propertyName environment variable."
        )
    val uri = runCatching { URI(resolved) }.getOrNull()
    if (uri?.scheme?.equals("https", ignoreCase = true) != true || uri.host.isNullOrBlank()) {
        throw GradleException("$environment $propertyName must be a valid HTTPS URL: $resolved")
    }
    if (uri.userInfo != null || uri.rawQuery != null || uri.rawFragment != null) {
        throw GradleException(
            "$environment $propertyName must not contain credentials, a query, or a fragment: $resolved"
        )
    }
    if (!(uri.path ?: "").trimEnd('/').equals("/api/v1", ignoreCase = false)) {
        throw GradleException("$environment $propertyName must end with /api/v1: $resolved")
    }
    if (
        expectedHost != null &&
        (!uri.host.equals(expectedHost, ignoreCase = true) || uri.port != -1 || uri.path != "/api/v1")
    ) {
        throw GradleException(
            "$environment $propertyName must be exactly https://$expectedHost/api/v1: $resolved"
        )
    }
    if (
        uri.host.equals("localhost", ignoreCase = true) ||
        uri.host == "127.0.0.1" ||
        uri.host == "10.0.2.2" ||
        uri.host.endsWith(".invalid")
    ) {
        throw GradleException("$environment $propertyName must use an approved remote host: $resolved")
    }
}

val validateStagingApiBaseUrl by tasks.registering {
    group = "verification"
    description = "Requires an explicit HTTPS BNBU_STAGING_API_BASE_URL for staging builds."
    inputs.property("BNBU_STAGING_API_BASE_URL", configuredStagingApiBaseUrl ?: "")
    doLast {
        validateRemoteApiBaseUrl(
            environment = "Staging",
            propertyName = "BNBU_STAGING_API_BASE_URL",
            value = configuredStagingApiBaseUrl,
            expectedHost = "api.verityai.cn"
        )
    }
}

val validateReleaseApiBaseUrl by tasks.registering {
    group = "verification"
    description = "Requires an explicit HTTPS production API URL for release builds."
    inputs.property("BNBU_PRODUCTION_API_BASE_URL", configuredProductionApiBaseUrl ?: "")
    doLast {
        validateRemoteApiBaseUrl(
            environment = "Production",
            propertyName = "BNBU_PRODUCTION_API_BASE_URL",
            value = configuredProductionApiBaseUrl
        )
    }
}

fun validateOrganizationCode(environment: String, expectedValue: String? = null) {
    val value = configuredOrganizationCode
    if (value == null || !value.matches(Regex("^[A-Z0-9][A-Z0-9_-]{1,31}$"))) {
        throw GradleException(
            "$environment builds require explicit BNBU_ORGANIZATION_CODE matching " +
                "^[A-Z0-9][A-Z0-9_-]{1,31}$"
        )
    }
    if (expectedValue != null && value != expectedValue) {
        throw GradleException("$environment builds require BNBU_ORGANIZATION_CODE=$expectedValue")
    }
}

val validateStagingOrganizationCode by tasks.registering {
    group = "verification"
    description = "Requires an explicit organization code for staging builds."
    inputs.property("BNBU_ORGANIZATION_CODE", configuredOrganizationCode ?: "")
    doLast { validateOrganizationCode("Staging", expectedValue = "BNBU") }
}

val validateReleaseOrganizationCode by tasks.registering {
    group = "verification"
    description = "Requires an explicit organization code for release builds."
    inputs.property("BNBU_ORGANIZATION_CODE", configuredOrganizationCode ?: "")
    doLast { validateOrganizationCode("Release") }
}

val validateReleaseFirebaseConfiguration by tasks.registering {
    group = "verification"
    description = "Requires app/google-services.json for release builds with FCM enabled."
    doLast {
        check(file("google-services.json").isFile) {
            "Release builds require app/google-services.json from the configured Firebase project."
        }
    }
}

val validateReleaseSigningConfiguration by tasks.registering {
    group = "verification"
    description = "Requires external signing material for release builds."
    doLast {
        check(missingReleaseSigningValues.isEmpty()) {
            "Release builds require signing configuration. Set " +
                missingReleaseSigningValues.joinToString() +
                " as CI environment variables or in the ignored keystore.properties file. " +
                "See keystore.properties.example."
        }
        check(releaseStoreFile?.isFile == true) {
            "BNBU_RELEASE_STORE_FILE must point to an existing keystore file: " +
                (releaseStoreFileValue ?: "<not set>")
        }
    }
}

tasks.configureEach {
    if (name == "preStagingBuild") {
        dependsOn(validateStagingApiBaseUrl)
        dependsOn(validateStagingOrganizationCode)
    }
    if (name == "preReleaseBuild") {
        dependsOn(validateReleaseApiBaseUrl)
        dependsOn(validateReleaseOrganizationCode)
        dependsOn(validateReleaseFirebaseConfiguration)
        dependsOn(validateReleaseSigningConfiguration)
    }
}
