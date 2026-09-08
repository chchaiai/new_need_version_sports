import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    // Both Android plugin IDs are supplied by the root's pinned AGP 8.7.3 classpath.
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Validation-only library. :app does not depend on it; its runtime binding is unchanged.
val repository = rootProject.projectDir.parentFile
val phase6Python = providers.gradleProperty("phase6Python").orElse("python")
val generatorJar = providers.gradleProperty("phase6GeneratorJar").orElse("")
val runtimeDir = providers.gradleProperty("phase6RuntimeDir").orElse("")
val fullValidation = providers.gradleProperty("phase6FullValidation").map { it.toBoolean() }.orElse(false)
val mapperValidation = providers.gradleProperty("phase6MapperValidation").map { it.toBoolean() }.orElse(false)
val mockValidation = providers.gradleProperty("phase6MockValidation").map { it.toBoolean() }.orElse(false)
val generated = layout.buildDirectory.dir("generated/phase6")
val runner = rootProject.file("tools/phase6/contract_entry.py")
val verifyBinding by tasks.registering(Exec::class) {
    group = "verification"
    description = "Check the published RC bytes, generator/template inputs and runtime jars."
    doFirst {
        require(generatorJar.get().isNotBlank()) { "Supply -Pphase6GeneratorJar=<pinned CLI jar>" }
        require(runtimeDir.get().isNotBlank()) { "Supply -Pphase6RuntimeDir=<pinned Step6 runtime jars>" }
        commandLine(phase6Python.get(), "-B", "-X", "utf8", runner, "verify",
            "--repo", repository, "--generator-jar", generatorJar.get(), "--runtime-dir", runtimeDir.get())
    }
}
val generatePhase6Models by tasks.registering(Exec::class) {
    group = "verification"
    description = "Generate twice from the published recipe and require identical model bytes."
    dependsOn(verifyBinding)
    // Always regenerate both times. An old output directory cannot satisfy this gate.
    doFirst {
        commandLine(phase6Python.get(), "-B", "-X", "utf8", runner, "generate",
            "--repo", repository, "--generator-jar", generatorJar.get(), "--runtime-dir", runtimeDir.get(),
            "--java", File(System.getProperty("java.home"), "bin/java").absolutePath,
            "--output", generated.get().asFile)
    }
}

val prepareSchemaSuite by tasks.registering(Exec::class) {
    group = "verification"
    dependsOn(generatePhase6Models)
    doFirst {
        commandLine(phase6Python.get(), "-B", "-X", "utf8",
            rootProject.file("tools/phase6/schema_suite.py"), "--repo", repository,
            "--output", generated.get().asFile)
    }
}
val prepareMockSuite by tasks.registering(Exec::class) {
    group = "verification"
    dependsOn(prepareSchemaSuite)
    doFirst {
        commandLine(phase6Python.get(), "-B", "-X", "utf8", rootProject.file("tools/phase6/mock_suite.py"),
            "--repo", repository, "--output", generated.get().asFile)
    }
}

android {
    namespace = "edu.bnbu.student.contractvalidation"
    compileSdk = 35
    defaultConfig {
        minSdk = 26
        targetSdk = 35
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets {
        getByName("main").java.srcDir(generated.map { it.dir("models") })
        // Hash-bound Phase5 assertions, with recorded file-I/O/format/test-runner adapters.
        getByName("test").java.srcDir(generated.map { it.dir("probe") })
        getByName("test").java.srcDir("src/mockShared/java")
        getByName("androidTest").java.srcDir("src/mockShared/java")
        getByName("androidTest").java.srcDir(generated.map { it.dir("probe") })
        getByName("androidTest").java.srcDir(generated.map { it.dir("mock-device-support") })
        getByName("androidTest").assets.srcDir(generated.map { it.dir("mock-assets") })
    }
    testOptions.unitTests.all {
        it.systemProperty("phase6.input", generated.get().file("smoke-input.json").asFile.absolutePath)
        it.systemProperty("phase6.output", layout.buildDirectory.dir("reports/phase6").get().asFile.absolutePath)
        it.systemProperty("phase6.build", layout.buildDirectory.get().asFile.absolutePath)
        it.systemProperty("phase6.schemaInput", generated.get().file("schema-input.json").asFile.absolutePath)
        it.systemProperty("phase6.supplementalInput", generated.get().file("supplemental-input.json").asFile.absolutePath)
        if (fullValidation.get()) {
            it.dependsOn(prepareSchemaSuite)
        } else {
            it.filter.excludeTestsMatching("Phase6ContractSchemaTest")
        }
        if (!mapperValidation.get()) it.filter.excludeTestsMatching("Phase6MapperTest")
        it.systemProperty("phase6.mockInput", generated.get().file("mock-assets/phase6/mock-input.json").asFile.absolutePath)
        if (mockValidation.get()) it.dependsOn(prepareMockSuite)
        else {
            it.filter.excludeTestsMatching("Phase6MockTest")
            it.filter.excludeTestsMatching("Phase6MockBoundaryTest")
        }
    }
}
kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
tasks.named("preBuild") { dependsOn(generatePhase6Models) }
// Wire source producers explicitly for Android's host-side test compilation too.
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    dependsOn(generatePhase6Models)
}
tasks.withType<JavaCompile>().configureEach { dependsOn(generatePhase6Models) }
tasks.configureEach {
    if (name.contains("AndroidTest") && (name.startsWith("compile") || name.startsWith("merge") || name.startsWith("package"))) {
        dependsOn(prepareMockSuite)
    }
}

dependencies {
    implementation("com.google.code.gson:gson:2.11.0")
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    // Match versions already used/resolved by the repository's Android app; no app dependency.
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("com.squareup.okio:okio:3.9.1")
    constraints {
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.20")
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.20")
        implementation("androidx.annotation:annotation:1.9.1")
        implementation("androidx.profileinstaller:profileinstaller:1.4.1")
        implementation("com.google.errorprone:error_prone_annotations:2.43.0")
    }
    testImplementation("junit:junit:4.13.2")
    // Published Phase5 schema validator is test-only (host and Android test APK).
    // Hash checks run before generation/compilation; no unpinned fallback downloads.
    testImplementation(files(runtimeDir.map { File(it, "json-schema-1.9.1.jar") }))
    testImplementation(files(runtimeDir.map { File(it, "jmail-2.1.0.jar") }))
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    androidTestImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    androidTestImplementation(files(runtimeDir.map { File(it, "json-schema-1.9.1.jar") }))
    androidTestImplementation(files(runtimeDir.map { File(it, "jmail-2.1.0.jar") }))
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4-android")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.7.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    // Use the same cached Activity version as the existing Android toolchain.
    debugImplementation("androidx.activity:activity-compose:1.10.0")
}
