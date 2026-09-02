package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.network.ProgressRequestBody
import edu.bnbu.student.mvp.core.network.EnduranceScoreResponse
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.core.network.v1.generated.AppReleasePolicy
import edu.bnbu.student.mvp.core.network.v1.generated.ClassSection
import edu.bnbu.student.mvp.core.network.v1.generated.ConfirmMediaUploadRequest
import edu.bnbu.student.mvp.core.network.v1.generated.Course
import edu.bnbu.student.mvp.core.network.v1.generated.CreateExemptionApplicationRequest
import edu.bnbu.student.mvp.core.network.v1.generated.CreateFeedbackRequest
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import edu.bnbu.student.mvp.core.network.v1.generated.Enrollment
import edu.bnbu.student.mvp.core.network.v1.generated.ExemptionApplication
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseRecord
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseRecordEvidenceContext
import edu.bnbu.student.mvp.core.network.v1.generated.Feedback
import edu.bnbu.student.mvp.core.network.v1.generated.HelpArticle
import edu.bnbu.student.mvp.core.network.v1.generated.MediaEvidence
import edu.bnbu.student.mvp.core.network.v1.generated.MediaAccess
import edu.bnbu.student.mvp.core.network.v1.generated.MediaAccessRequest
import edu.bnbu.student.mvp.core.network.v1.generated.MediaUploadSession
import edu.bnbu.student.mvp.core.network.v1.generated.Notification
import edu.bnbu.student.mvp.core.network.v1.generated.PushDevice
import edu.bnbu.student.mvp.core.network.v1.generated.PushDeviceRegistrationRequest
import edu.bnbu.student.mvp.core.network.v1.generated.Semester
import edu.bnbu.student.mvp.core.network.v1.generated.StudentScore
import edu.bnbu.student.mvp.core.network.v1.generated.StructuredExemptionApplication
import edu.bnbu.student.mvp.core.network.v1.generated.TeacherProfile
import edu.bnbu.student.mvp.core.network.v1.generated.UpdateExemptionApplicationRequest
import edu.bnbu.student.mvp.core.network.v1.generated.UpdateUserPreferencesRequest
import edu.bnbu.student.mvp.core.network.v1.generated.UserPreferences
import edu.bnbu.student.mvp.core.network.v1.generated.VersionedRequest
import java.io.File
import java.io.IOException
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.Response
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class V1StudentWorkspaceSnapshot(
    val currentUser: CurrentUserData,
    val enrollments: List<Enrollment>,
    val classSections: Map<String, ClassSection>,
    val courses: Map<String, Course>,
    val records: List<ExerciseRecord>,
    val recordEvidenceContexts: Map<String, ExerciseRecordEvidenceContext> = emptyMap(),
    val scores: List<StudentScore>,
    val notifications: List<Notification>,
    val teachers: Map<String, TeacherProfile> = emptyMap(),
    val currentSemester: Semester? = null,
    val sessionEnrollmentId: String? = null
)

data class V1UploadedExemptionMedia(
    val mediaId: String,
    val mimeType: String,
    val fileSizeBytes: Long
)

/**
 * Student-facing V1 operations used by the authenticated Android workspace.
 * Every route in this adapter is pinned to the vendored OpenAPI document.
 */
class V1StudentWorkspaceGateway private constructor(
    private val authorizedClient: V1AuthorizedApiClient,
    httpClient: OkHttpClient,
    private val credentialStore: AuthSessionCredentialStore,
    private val sessionEnrollmentIdProvider: () -> String?,
    private val mutationRegistry: MutationIntentRegistry = MutationIntentRegistry(),
    private val clock: () -> Instant = Instant::now,
    private val mediaPollDelayMillis: Long = 1_000L,
    private val maximumMediaPollAttempts: Int = 60,
    private val pollDelay: suspend (Long) -> Unit = { delay(it) }
) {
    private val storageClient = httpClient.newBuilder()
        .followRedirects(false)
        .followSslRedirects(false)
        .retryOnConnectionFailure(false)
        .build()

    fun currentSessionEnrollmentId(): String? =
        sessionEnrollmentIdProvider()?.takeIf(String::isNotBlank)

    suspend fun loadWorkspace(): V1StudentWorkspaceSnapshot {
        val current = getOne("getCurrentUser", "me", CurrentUserData::class.java)
        val enrollments = listAll<Enrollment>(
            operationId = "listEnrollments",
            // Student collection scope is derived from the authenticated principal
            // by ENROLLMENT_LIST_SCOPE. A student must never self-report studentId.
            path = "enrollments"
        )
        repairMissingSessionEnrollment(enrollments)
        val sections = enrollments.map(Enrollment::classSectionId).distinct().associateWith { id ->
            getOne(
                operationId = "getClassSection",
                path = "class-sections/{classSectionId}",
                responseClass = ClassSection::class.java,
                pathSegments = listOf("class-sections", id)
            )
        }
        val courses = sections.values.map(ClassSection::courseId).distinct().associateWith { id ->
            getOne(
                operationId = "getCourse",
                path = "courses/{courseId}",
                responseClass = Course::class.java,
                pathSegments = listOf("courses", id)
            )
        }
        val teachers = sections.values.map(ClassSection::teacherId).distinct().associateWith { id ->
            getOne(
                operationId = "getTeacher",
                path = "teachers/{teacherId}",
                responseClass = TeacherProfile::class.java,
                pathSegments = listOf("teachers", id)
            )
        }
        val currentSemester = getOptionalOne(
            operationId = "getCurrentSemester",
            path = "semesters/current",
            responseClass = Semester::class.java
        )
        val records = listAll<ExerciseRecord>("listExerciseRecords", "exercise-records")
        val recordEvidenceContexts = records.associate { record ->
            record.id to getOne(
                operationId = "getExerciseRecordEvidenceContext",
                path = "exercise-records/{recordId}/evidence-context",
                responseClass = ExerciseRecordEvidenceContext::class.java,
                pathSegments = listOf("exercise-records", record.id, "evidence-context")
            )
        }
        return V1StudentWorkspaceSnapshot(
            currentUser = current,
            enrollments = enrollments,
            classSections = sections,
            courses = courses,
            records = records,
            recordEvidenceContexts = recordEvidenceContexts,
            scores = listAll("listStudentScores", "student-scores"),
            notifications = listAll("listNotifications", "notifications"),
            teachers = teachers,
            currentSemester = currentSemester,
            sessionEnrollmentId = currentSessionEnrollmentId()
        )
    }

    /** Loads only the active enrollment and its class-section policy. */
    suspend fun loadActiveClassSection(): ClassSection? {
        val enrollments = listAll<Enrollment>(
            operationId = "listEnrollments",
            path = "enrollments"
        )
        repairMissingSessionEnrollment(enrollments)
        val active = enrollments.filter { it.status.value == "ACTIVE" }
        val enrollment = currentSessionEnrollmentId()?.let { sessionEnrollmentId ->
            active.singleOrNull { it.id == sessionEnrollmentId }
                ?: throw IllegalStateException("The authenticated session enrollment is not active.")
        } ?: when (active.size) {
            0 -> return null
            1 -> active.single()
            else -> throw IllegalStateException(
                "The active enrollment is ambiguous. Sign in through the intended course."
            )
        }
        return getOne(
            operationId = "getClassSection",
            path = "class-sections/{classSectionId}",
            responseClass = ClassSection::class.java,
            pathSegments = listOf("class-sections", enrollment.classSectionId)
        )
    }

    private fun repairMissingSessionEnrollment(enrollments: List<Enrollment>) {
        val current = credentialStore.loadAuthSession() ?: return
        if (current.enrollmentId != null) return
        val onlyActiveEnrollment = enrollments
            .filter { it.status.value == "ACTIVE" }
            .singleOrNull()
            ?: return
        val repaired = current.withEnrollmentIdIfMissing(onlyActiveEnrollment.id)
        check(credentialStore.saveAuthSession(repaired)) {
            "Could not persist the active enrollment context."
        }
    }

    suspend fun markNotificationRead(notificationId: String): Notification = mutation(
        operationId = "markNotificationRead",
        actionSlot = "notification:$notificationId:read",
        canonicalInput = "notificationId=$notificationId",
        request = V1ApiRequest(
            operationId = "markNotificationRead",
            method = V1HttpMethod.POST,
            relativePath = "notifications/{notificationId}/read",
            pathSegments = listOf("notifications", notificationId, "read")
        ),
        responseClass = Notification::class.java,
        expectedStatus = 200
    )

    suspend fun getPreferences(): UserPreferences =
        getOne("getCurrentUserPreferences", "me/preferences", UserPreferences::class.java)

    suspend fun updatePreferences(
        locale: UpdateUserPreferencesRequest.Locale,
        pushEnabled: Boolean,
        emailEnabled: Boolean,
        expectedVersion: Long
    ): UserPreferences = mutation(
        operationId = "updateCurrentUserPreferences",
        actionSlot = "preferences:version:$expectedVersion",
        canonicalInput = "locale=${locale.value}\npushEnabled=$pushEnabled" +
            "\nemailEnabled=$emailEnabled\nexpectedVersion=$expectedVersion",
        request = V1ApiRequest(
            operationId = "updateCurrentUserPreferences",
            method = V1HttpMethod.PATCH,
            relativePath = "me/preferences",
            body = UpdateUserPreferencesRequest(locale, pushEnabled, emailEnabled, expectedVersion)
        ),
        responseClass = UserPreferences::class.java,
        expectedStatus = 200
    )

    suspend fun registerPushDevice(
        registrationToken: String,
        appVersion: String,
        locale: PushDeviceRegistrationRequest.Locale
    ): PushDevice = mutation(
        operationId = "registerPushDevice",
        actionSlot = "push-device:${registrationToken.sha256ForIntent()}",
        canonicalInput = "tokenHash=${registrationToken.sha256ForIntent()}" +
            "\nappVersion=$appVersion\nlocale=${locale.value}",
        request = V1ApiRequest(
            operationId = "registerPushDevice",
            method = V1HttpMethod.POST,
            relativePath = "push-devices",
            body = PushDeviceRegistrationRequest(
                PushDeviceRegistrationRequest.Platform.ANDROID,
                registrationToken,
                appVersion,
                locale
            )
        ),
        responseClass = PushDevice::class.java,
        expectedStatus = 201
    )

    suspend fun unregisterPushDevice(deviceId: String) {
        mutation<Any>(
            operationId = "unregisterPushDevice",
            actionSlot = "push-device:$deviceId:unregister",
            canonicalInput = "deviceId=$deviceId",
            request = V1ApiRequest(
                operationId = "unregisterPushDevice",
                method = V1HttpMethod.DELETE,
                relativePath = "push-devices/{deviceId}",
                pathSegments = listOf("push-devices", deviceId)
            ),
            responseClass = Any::class.java,
            expectedStatus = 200,
            allowNullData = true
        )
    }

    suspend fun listHelpArticles(locale: String): List<HelpArticle> {
        val response = authorizedClient.executeCancellable<List<HelpArticle>>(
            V1ApiRequest(
                operationId = "listHelpArticles",
                method = V1HttpMethod.GET,
                relativePath = "help-articles",
                query = mapOf("locale" to locale)
            ),
            object : TypeToken<List<HelpArticle>>() {}.type
        )
        require(response.statusCode == 200) {
            "listHelpArticles returned ${response.statusCode}."
        }
        return response.data.orEmpty()
    }

    suspend fun listFeedback(): List<Feedback> = listAll("listFeedback", "feedback")

    suspend fun createFeedback(body: CreateFeedbackRequest, intentId: String): Feedback = mutation(
        operationId = "createFeedback",
        actionSlot = "feedback:$intentId",
        canonicalInput = "intentId=$intentId\ncategory=${body.category.value}" +
            "\ncontent=${body.content}",
        request = V1ApiRequest(
            operationId = "createFeedback",
            method = V1HttpMethod.POST,
            relativePath = "feedback",
            body = body
        ),
        responseClass = Feedback::class.java,
        expectedStatus = 201,
        stableAcrossProcess = true
    )

    suspend fun listExemptions(): List<StructuredExemptionApplication> =
        listAll("listStructuredExemptionApplications", "exemption-application-details")

    suspend fun createExemption(
        enrollmentId: String,
        applicationType: CreateExemptionApplicationRequest.ApplicationType,
        applicationSubtype: CreateExemptionApplicationRequest.ApplicationSubtype,
        organizationName: String?,
        reason: String,
        mediaIds: Set<String>,
        intentId: String
    ): ExemptionApplication = mutation(
        operationId = "createExemptionApplication",
        actionSlot = "exemption:$intentId:create",
        canonicalInput = "intentId=$intentId\nenrollmentId=$enrollmentId" +
            "\napplicationType=${applicationType.value}" +
            "\napplicationSubtype=${applicationSubtype.value}" +
            "\norganizationName=${organizationName.orEmpty()}\nreason=$reason" +
            "\nmediaIds=${mediaIds.sorted().joinToString(",")}",
        request = V1ApiRequest(
            operationId = "createExemptionApplication",
            method = V1HttpMethod.POST,
            relativePath = "exemption-applications",
            body = CreateExemptionApplicationRequest(
                enrollmentId = enrollmentId,
                applicationType = applicationType,
                applicationSubtype = applicationSubtype,
                organizationName = organizationName,
                reason = reason,
                mediaIds = mediaIds
            )
        ),
        responseClass = ExemptionApplication::class.java,
        expectedStatus = 201,
        stableAcrossProcess = true
    )

    suspend fun updateExemption(
        applicationId: String,
        reason: String,
        mediaIds: Set<String>,
        expectedVersion: Long
    ): ExemptionApplication = mutation(
        operationId = "updateExemptionApplication",
        actionSlot = "exemption:$applicationId:update:$expectedVersion",
        canonicalInput = "applicationId=$applicationId\nreason=$reason" +
            "\nmediaIds=${mediaIds.sorted().joinToString(",")}" +
            "\nexpectedVersion=$expectedVersion",
        request = V1ApiRequest(
            operationId = "updateExemptionApplication",
            method = V1HttpMethod.PATCH,
            relativePath = "exemption-applications/{applicationId}",
            pathSegments = listOf("exemption-applications", applicationId),
            body = UpdateExemptionApplicationRequest(
                expectedVersion = expectedVersion,
                reason = reason,
                mediaIds = mediaIds
            )
        ),
        responseClass = ExemptionApplication::class.java,
        expectedStatus = 200
    )

    suspend fun submitExemption(
        applicationId: String,
        expectedVersion: Long
    ): ExemptionApplication = mutation(
        operationId = "submitExemptionApplication",
        actionSlot = "exemption:$applicationId:submit:$expectedVersion",
        canonicalInput = "applicationId=$applicationId\nexpectedVersion=$expectedVersion",
        request = V1ApiRequest(
            operationId = "submitExemptionApplication",
            method = V1HttpMethod.POST,
            relativePath = "exemption-applications/{applicationId}/submit",
            pathSegments = listOf("exemption-applications", applicationId, "submit"),
            body = VersionedRequest(expectedVersion)
        ),
        responseClass = ExemptionApplication::class.java,
        expectedStatus = 200
    )

    suspend fun getAppReleasePolicy(): AppReleasePolicy = getOne(
        operationId = "getAppReleasePolicy",
        path = "app-release-policy",
        responseClass = AppReleasePolicy::class.java,
        query = mapOf(
            "platform" to "ANDROID",
            "currentVersion" to BuildConfig.VERSION_NAME,
            "currentBuildNumber" to BuildConfig.VERSION_CODE.toString()
        )
    )

    suspend fun previewActivityConversion(
        timeSeconds: Int,
        gender: String,
        gradeLevel: String
    ): EnduranceScoreResponse {
        val normalizedGender = gender.trim().uppercase()
        val normalizedGrade = gradeLevel.trim().uppercase()
        val response = authorizedClient.executeCancellable<EnduranceScoreResponse>(
            V1ApiRequest(
                operationId = "previewActivityConversion",
                method = V1HttpMethod.POST,
                relativePath = "activity-conversion-rules/preview",
                body = mapOf(
                    "timeSeconds" to timeSeconds,
                    "gender" to normalizedGender,
                    "gradeLevel" to normalizedGrade
                )
            ),
            EnduranceScoreResponse::class.java
        )
        require(response.statusCode == 200) {
            "previewActivityConversion returned ${response.statusCode}."
        }
        return response.data ?: throw V1ProtocolException(
            "previewActivityConversion",
            response.statusCode,
            response.meta.requestId,
            "success data is null"
        )
    }

    suspend fun uploadExemptionMedia(
        enrollmentId: String,
        file: File,
        mimeType: String,
        durationSeconds: Long?,
        captureSource: String,
        intentId: String,
        onProgress: (UploadProgress) -> Unit = {}
    ): V1UploadedExemptionMedia {
        require(file.isFile && file.length() > 0L) { "Exemption media file is not readable." }
        val normalizedMime = mimeType.trim().lowercase()
        require(normalizedMime in AllowedExemptionMimeTypes) { "Exemption media MIME type is not allowed." }
        require(durationSeconds == null) { "Exemption image must not declare a video duration." }
        require(captureSource == "IN_APP_CAMERA" || captureSource == "FILE_PICKER")

        val body = JsonObject().apply {
            addProperty("enrollmentId", enrollmentId)
            addProperty("businessPurpose", "EXEMPTION_APPLICATION")
            addProperty("mediaType", "IMAGE")
            addProperty("mimeType", normalizedMime)
            addProperty("fileSizeBytes", file.length())
            addProperty("captureSource", captureSource)
            durationSeconds?.let { addProperty("durationSeconds", it) }
        }
        val initiationIntent = acquireMutationIntent(
            operationId = "initiateMediaUpload",
            actionSlot = "exemption-media:$intentId:initiate",
            canonicalInput = "intentId=$intentId\nenrollmentId=$enrollmentId" +
                "\nmimeType=$normalizedMime\nfileSizeBytes=${file.length()}" +
                "\ndurationSeconds=${durationSeconds ?: "null"}\ncaptureSource=$captureSource"
        )
        val initiationResponse = authorizedClient.executeCancellable<MediaUploadSession>(
            V1ApiRequest(
                operationId = "initiateMediaUpload",
                method = V1HttpMethod.POST,
                relativePath = "media-uploads",
                body = V1ExplicitJsonBody(body)
            ).withMutationIntent(initiationIntent),
            MediaUploadSession::class.java
        )
        if (initiationResponse.statusCode != 201) {
            throw V1ProtocolException(
                "initiateMediaUpload",
                initiationResponse.statusCode,
                initiationResponse.meta.requestId,
                "unexpected success status"
            )
        }
        val initiated = initiationResponse.data ?: throw V1ProtocolException(
            "initiateMediaUpload",
            initiationResponse.statusCode,
            initiationResponse.meta.requestId,
            "success data is null"
        )
        if (!initiated.expiresAt.toInstant().isAfter(clock())) {
            mutationRegistry.abandon(initiationIntent)
            throw IllegalStateException("Media upload URL is expired.")
        }
        val entityTag = uploadObject(initiated, file, normalizedMime, onProgress)
        val confirmed = mutation(
            operationId = "confirmMediaUpload",
            actionSlot = "upload-session:${initiated.uploadSessionId}:confirm",
            canonicalInput = "uploadSessionId=${initiated.uploadSessionId}" +
                "\nmediaId=${initiated.mediaId}\netag=$entityTag",
            request = V1ApiRequest(
                operationId = "confirmMediaUpload",
                method = V1HttpMethod.POST,
                relativePath = "media-uploads/{uploadSessionId}/confirm",
                pathSegments = listOf("media-uploads", initiated.uploadSessionId, "confirm"),
                body = ConfirmMediaUploadRequest(entityTag.normalizedForMediaConfirmation())
            ),
            responseClass = MediaEvidence::class.java,
            expectedStatus = 200
        )
        require(confirmed.id == initiated.mediaId) { "Confirmed media ID does not match initiation." }
        require(confirmed.enrollmentId == enrollmentId) { "Confirmed media belongs to another enrollment." }
        require(confirmed.businessPurpose.value == "EXEMPTION_APPLICATION") {
            "Confirmed media has the wrong business purpose."
        }
        // Initiation, private PUT and confirmation are one logical workflow.
        // Only now may a future user retry allocate a different upload session.
        mutationRegistry.complete(initiationIntent)
        return V1UploadedExemptionMedia(confirmed.id, normalizedMime, file.length())
    }

    suspend fun createExemptionMediaAccessUrl(mediaId: String): String {
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        val access = mutation(
            operationId = "createMediaAccessUrl",
            actionSlot = "exemption-media:$mediaId:view-original",
            canonicalInput = "mediaId=$mediaId\npurpose=VIEW_ORIGINAL",
            request = V1ApiRequest(
                operationId = "createMediaAccessUrl",
                method = V1HttpMethod.POST,
                relativePath = "media/{mediaId}/access-url",
                pathSegments = listOf("media", mediaId, "access-url"),
                body = MediaAccessRequest("VIEW_ORIGINAL")
            ),
            responseClass = MediaAccess::class.java,
            expectedStatus = 200
        )
        require(access.mediaId == mediaId) { "Media access response does not match request." }
        return access.accessUrl.toString()
    }

    suspend fun awaitExemptionMediaAvailable(mediaIds: Set<String>) {
        require(mediaPollDelayMillis >= 0L) { "Media poll delay must not be negative." }
        require(maximumMediaPollAttempts > 0) { "Media poll attempts must be positive." }
        for (mediaId in mediaIds.sorted()) {
            var lastStatus = "UNKNOWN"
            var available = false
            for (attempt in 0 until maximumMediaPollAttempts) {
                val evidence = getOne(
                    operationId = "getMediaEvidence",
                    path = "media/{mediaId}",
                    responseClass = MediaEvidence::class.java,
                    pathSegments = listOf("media", mediaId)
                )
                require(evidence.id == mediaId) { "Media evidence ID does not match request." }
                require(evidence.businessPurpose.value == "EXEMPTION_APPLICATION") {
                    "Media evidence has the wrong business purpose."
                }
                lastStatus = evidence.uploadStatus.value
                when (lastStatus) {
                    "AVAILABLE" -> {
                        available = true
                        break
                    }
                    "FAILED", "DELETED" -> throw IOException(
                        "Exemption media $mediaId cannot become available (status=$lastStatus)."
                    )
                }
                if (attempt == maximumMediaPollAttempts - 1) {
                    throw IOException(
                        "Exemption media $mediaId did not become available " +
                            "after $maximumMediaPollAttempts checks (status=$lastStatus)."
                    )
                }
                pollDelay(mediaPollDelayMillis)
            }
            if (!available) {
                throw IOException("Exemption media $mediaId is not available (status=$lastStatus).")
            }
        }
    }

    private suspend fun uploadObject(
        session: MediaUploadSession,
        file: File,
        mimeType: String,
        onProgress: (UploadProgress) -> Unit
    ): String {
        val body = ProgressRequestBody(file.asRequestBody(mimeType.toMediaType()), onProgress)
        val request = Request.Builder()
            .url(session.uploadUrl.toURL())
            .apply { session.requiredHeaders.forEach(::header) }
            .method(session.uploadMethod.value, body)
            .build()
        return storageClient.newCall(request).awaitEntityTag()
    }

    private suspend fun <T> getOne(
        operationId: String,
        path: String,
        responseClass: Class<T>,
        query: Map<String, String?> = emptyMap(),
        pathSegments: List<String>? = null
    ): T {
        val response = authorizedClient.executeCancellable<T>(
            V1ApiRequest(operationId, V1HttpMethod.GET, path, query, pathSegments = pathSegments),
            responseClass
        )
        require(response.statusCode == 200) { "$operationId returned ${response.statusCode}." }
        return response.data ?: throw V1ProtocolException(
            operationId,
            response.statusCode,
            response.meta.requestId,
            "success data is null"
        )
    }

    private suspend fun <T> getOptionalOne(
        operationId: String,
        path: String,
        responseClass: Class<T>
    ): T? = try {
        getOne(operationId, path, responseClass)
    } catch (error: V1HttpException) {
        if (error.statusCode == 404) null else throw error
    }

    private suspend inline fun <reified T> listAll(
        operationId: String,
        path: String,
        query: Map<String, String?> = emptyMap()
    ): List<T> {
        val collected = mutableListOf<T>()
        val seenCursors = mutableSetOf<String>()
        var cursor: String? = null
        do {
            val requestQuery = query + mapOf("limit" to "100", "cursor" to cursor)
            val response = authorizedClient.executeCancellable<List<T>>(
                V1ApiRequest(operationId, V1HttpMethod.GET, path, requestQuery),
                object : TypeToken<List<T>>() {}.type
            )
            require(response.statusCode == 200) { "$operationId returned ${response.statusCode}." }
            val data = response.data ?: throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "paged success data is null"
            )
            collected += data
            val pagination = response.meta.requireContractPagination(
                operationId,
                response.statusCode
            )
            cursor = pagination.nextCursor.takeIf { pagination.hasMore }
            if (cursor != null && !seenCursors.add(cursor)) {
                throw V1ProtocolException(
                    operationId,
                    response.statusCode,
                    response.meta.requestId,
                    "meta.pagination.nextCursor repeats a previous page"
                )
            }
        } while (cursor != null)
        return collected
    }

    private suspend fun <T> mutation(
        operationId: String,
        actionSlot: String,
        canonicalInput: String,
        request: V1ApiRequest,
        responseClass: Class<T>,
        expectedStatus: Int,
        allowNullData: Boolean = false,
        stableAcrossProcess: Boolean = false
    ): T {
        val intent = acquireMutationIntent(
            operationId,
            actionSlot,
            canonicalInput,
            stableAcrossProcess
        )
        val response = authorizedClient.executeCancellable<T>(request.withMutationIntent(intent), responseClass)
        if (response.statusCode != expectedStatus) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "unexpected success status"
            )
        }
        if (allowNullData) {
            mutationRegistry.complete(intent)
            @Suppress("UNCHECKED_CAST")
            return Unit as T
        }
        val data = response.data ?: throw V1ProtocolException(
            operationId,
            response.statusCode,
            response.meta.requestId,
            "success data is null"
        )
        mutationRegistry.complete(intent)
        return data
    }

    private fun acquireMutationIntent(
        operationId: String,
        actionSlot: String,
        canonicalInput: String,
        stableAcrossProcess: Boolean = false
    ): MutationIntent {
        val accountScope = authorizedClient.currentAccountScope()
            ?.takeIf(String::isNotBlank)
            ?: throw IllegalStateException("Authenticated account scope is unavailable.")
        val scope = MutationIntentScope(accountScope, operationId, actionSlot)
        val fingerprint = IntentFingerprint.fromCanonicalInput(operationId, canonicalInput)
        return if (stableAcrossProcess) {
            MutationIntent(
                scope = scope,
                fingerprint = fingerprint,
                idempotencyKey = IdempotencyKey.fromGenerated(
                    "android-intent-${fingerprint.stableValue}"
                )
            )
        } else {
            mutationRegistry.acquire(scope, fingerprint)
        }
    }

    companion object {
        fun create(
            credentialStore: AuthSessionCredentialStore,
            baseUrl: String = BuildConfig.BNBU_API_BASE_URL,
            httpClient: OkHttpClient = edu.bnbu.student.mvp.core.network.SharedHttpClient.instance,
            mediaPollDelayMillis: Long = 1_000L,
            maximumMediaPollAttempts: Int = 60,
            pollDelay: suspend (Long) -> Unit = { delay(it) }
        ): V1StudentWorkspaceGateway {
            val authorized = V1AuthorizedApiClient.create(
                credentialStore = credentialStore,
                baseUrl = baseUrl,
                httpClient = httpClient
            )
            return V1StudentWorkspaceGateway(
                authorizedClient = authorized,
                httpClient = httpClient,
                credentialStore = credentialStore,
                sessionEnrollmentIdProvider = { credentialStore.loadAuthSession()?.enrollmentId },
                mediaPollDelayMillis = mediaPollDelayMillis,
                maximumMediaPollAttempts = maximumMediaPollAttempts,
                pollDelay = pollDelay
            )
        }

        private val AllowedExemptionMimeTypes = setOf(
            "image/jpeg",
            "image/png"
        )
    }
}

private suspend fun Call.awaitEntityTag(): String = suspendCancellableCoroutine { continuation ->
    continuation.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onFailure(call: Call, error: IOException) {
            if (continuation.isActive) continuation.resumeWithException(error)
        }

        override fun onResponse(call: Call, response: Response) {
            val result = runCatching {
                response.use {
                    if (!it.isSuccessful) throw IOException("Private media upload returned HTTP ${it.code}.")
                    it.header("ETag")?.trim()?.takeIf(String::isNotEmpty)
                        ?: throw IOException("Private media upload response is missing ETag.")
                }
            }
            if (!continuation.isActive) return
            result.fold(continuation::resume, continuation::resumeWithException)
        }
    })
}

private fun String.sha256ForIntent(): String =
    java.security.MessageDigest.getInstance("SHA-256")
        .digest(toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> (byte.toInt() and 0xff).toString(16).padStart(2, '0') }
