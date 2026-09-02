package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.reflect.TypeToken
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.core.network.v1.generated.AuthSession
import edu.bnbu.student.mvp.core.network.v1.generated.ClassSection
import edu.bnbu.student.mvp.core.network.v1.generated.Course
import edu.bnbu.student.mvp.core.network.v1.generated.CourseInvitePreview
import edu.bnbu.student.mvp.core.network.v1.generated.CourseStatus
import edu.bnbu.student.mvp.core.network.v1.generated.CourseJoinGender
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import edu.bnbu.student.mvp.core.network.v1.generated.EmailVerificationChallengeAccepted
import edu.bnbu.student.mvp.core.network.v1.generated.EmailVerificationChallengeRequest
import edu.bnbu.student.mvp.core.network.v1.generated.Enrollment
import edu.bnbu.student.mvp.core.network.v1.generated.EnrollmentStatus
import edu.bnbu.student.mvp.core.network.v1.generated.Gender
import edu.bnbu.student.mvp.core.network.v1.generated.IssueJoinCapabilityRequest
import edu.bnbu.student.mvp.core.network.v1.generated.JoinCapabilityTransport
import edu.bnbu.student.mvp.core.network.v1.generated.JoinResult
import edu.bnbu.student.mvp.core.network.v1.generated.StudentSignInCodeRequest
import edu.bnbu.student.mvp.core.network.v1.generated.StudentSignInCodeAccepted
import edu.bnbu.student.mvp.core.network.v1.generated.StudentSignInCodeVerificationRequest
import edu.bnbu.student.mvp.core.network.v1.generated.User
import edu.bnbu.student.mvp.core.network.v1.generated.UserRole
import edu.bnbu.student.mvp.core.network.v1.generated.UserStatus
import edu.bnbu.student.mvp.core.network.v1.generated.VerifyEmailChallengeRequest
import java.time.Instant
import okhttp3.OkHttpClient

data class V1StudentSignInChallenge(
    val challengeId: String,
    val expiresAt: Instant,
    val requestId: String
)

data class V1StudentAuthenticated(
    val user: User,
    val requestId: String
)

data class V1EmailVerificationChallenge(
    val challengeId: String,
    val mode: EmailVerificationChallengeAccepted.Mode,
    val expiresAt: Instant,
    val requestId: String
)

data class V1StudentJoinCompleted(
    val studentProfile: edu.bnbu.student.mvp.core.network.v1.generated.StudentProfile,
    val enrollment: Enrollment,
    val course: Course,
    val classSection: ClassSection,
    val currentUser: CurrentUserData,
    val requestId: String
)

data class V1Page<T>(
    val items: List<T>,
    val nextCursor: ScopedCursor?,
    val hasMore: Boolean,
    val limit: Int,
    val requestId: String
)

class V1JoinCapability private constructor(
    private val wireValue: String,
    val classSectionId: String,
    val expiresAt: Instant
) {
    internal fun headerValue(now: Instant): String {
        check(now.isBefore(expiresAt)) { "Join Capability has expired" }
        return wireValue
    }

    override fun toString(): String =
        "V1JoinCapability(value=<redacted>, classSectionId=<redacted>, expiresAt=$expiresAt)"

    companion object {
        internal fun fromTransport(value: JoinCapabilityTransport): V1JoinCapability {
            require(value.joinCapability.length >= 32) { "Join Capability is shorter than the contract" }
            require(value.classSectionId.isNotBlank()) { "Join Capability classSectionId is blank" }
            return V1JoinCapability(
                wireValue = value.joinCapability,
                classSectionId = value.classSectionId,
                expiresAt = value.expiresAt.toInstant()
            )
        }
    }
}

data class V1CourseListQuery(
    val limit: Int = 20,
    val sort: String? = null,
    val search: String? = null,
    val status: CourseStatus? = null
) {
    init {
        validateListQuery(limit, sort, search)
    }
}

data class V1ClassSectionListQuery(
    val limit: Int = 20,
    val sort: String? = null,
    val search: String? = null,
    val courseId: String? = null,
    val semesterId: String? = null,
    val status: String? = null
) {
    init {
        validateListQuery(limit, sort, search)
        require(courseId == null || courseId.isNotBlank()) { "courseId must not be blank" }
        require(semesterId == null || semesterId.isNotBlank()) { "semesterId must not be blank" }
        require(status == null || status.isNotBlank()) { "status must not be blank" }
    }
}

data class V1EnrollmentListQuery(
    val limit: Int = 20,
    val sort: String? = null,
    val classSectionId: String? = null,
    val semesterId: String? = null,
    val status: EnrollmentStatus? = null
) {
    init {
        validateListQuery(limit, sort, search = null)
        require(classSectionId == null || classSectionId.isNotBlank()) {
            "classSectionId must not be blank"
        }
        require(semesterId == null || semesterId.isNotBlank()) { "semesterId must not be blank" }
    }
}

class V1CredentialPersistenceException(
    val operationId: String,
    val requestId: String
) : V1TransportException(
    "Could not persist authenticated session " +
        "(operationId=$operationId, requestId=$requestId)"
)

/** Student-facing adapters backed only by the pinned OpenAPI v1 contract. */
class V1StudentApi private constructor(
    private val publicTransport: V1ApiTransport,
    private val authorizedClient: V1AuthorizedApiClient,
    private val clock: () -> Instant
) {
    suspend fun requestSignInCode(
        organizationCode: String,
        account: String,
        locale: StudentSignInCodeRequest.Locale,
        intent: MutationIntent
    ): V1StudentSignInChallenge {
        require(organizationCode.matches(Regex("^[A-Z0-9][A-Z0-9_-]{1,31}$"))) {
            "organizationCode does not match the contract"
        }
        require(account.length in 1..254) { "account must contain 1..254 characters" }
        val response = publicTransport.executeCancellable<StudentSignInCodeAccepted>(
            V1ApiRequest(
                operationId = "requestStudentSignInCode",
                method = V1HttpMethod.POST,
                relativePath = "auth/student-sign-in-codes",
                body = StudentSignInCodeRequest(
                    organizationCode,
                    account,
                    StudentSignInCodeRequest.Channel.EMAIL,
                    locale
                )
            ).withMutationIntent(intent),
            StudentSignInCodeAccepted::class.java
        )
        requireStatus("requestStudentSignInCode", response, setOf(202))
        val challenge = response.data ?: throw protocolError(
            operationId = "requestStudentSignInCode",
            response = response,
            reason = "challenge acceptance data is null"
        )
        requiredId("challengeId", challenge.challengeId)
        return V1StudentSignInChallenge(
            challengeId = challenge.challengeId,
            expiresAt = challenge.expiresAt.toInstant(),
            requestId = response.meta.requestId
        )
    }

    suspend fun verifySignInCode(
        challengeId: String,
        code: String,
        deviceId: String,
        intent: MutationIntent
    ): V1StudentAuthenticated {
        requiredId("challengeId", challengeId)
        require(code.matches(Regex("^\\d{4,10}$"))) { "code does not match the contract" }
        require(deviceId.length in 1..128) { "deviceId must contain 1..128 characters" }
        val response = publicTransport.executeCancellable<AuthSession>(
            V1ApiRequest(
                operationId = "verifyStudentSignInCode",
                method = V1HttpMethod.POST,
                relativePath = "auth/student-sign-in-codes/verify",
                body = StudentSignInCodeVerificationRequest(challengeId, code, deviceId)
            ).withMutationIntent(intent),
            AuthSession::class.java
        )
        requireStatus("verifyStudentSignInCode", response, setOf(200))
        val session = response.data ?: throw protocolError(
            operationId = "verifyStudentSignInCode",
            response = response,
            reason = "authentication data is null"
        )
        installSessionOrThrow("verifyStudentSignInCode", response.meta.requestId, session)
        return V1StudentAuthenticated(session.user, response.meta.requestId)
    }

    suspend fun getCurrentUser(): V1ApiSuccess<CurrentUserData> {
        val response = authorizedClient.executeCancellable<CurrentUserData>(
            V1ApiRequest(
                operationId = "getCurrentUser",
                method = V1HttpMethod.GET,
                relativePath = "me"
            ),
            CurrentUserData::class.java
        )
        requireStatus("getCurrentUser", response, setOf(200))
        if (response.data == null) {
            throw protocolError("getCurrentUser", response, "current user data is null")
        }
        return response
    }

    suspend fun requestEmailVerificationChallenge(
        email: String,
        locale: EmailVerificationChallengeRequest.Locale,
        expectedVersion: Long,
        intent: MutationIntent
    ): V1EmailVerificationChallenge {
        require(email.length in 3..254 && '@' in email) { "email is invalid" }
        require(expectedVersion > 0) { "expectedVersion must be positive" }
        val response = authorizedClient.executeCancellable<EmailVerificationChallengeAccepted>(
            V1ApiRequest(
                operationId = "requestCurrentUserEmailChallenge",
                method = V1HttpMethod.POST,
                relativePath = "me/email-verification-challenges",
                body = EmailVerificationChallengeRequest(email, locale, expectedVersion)
            ).withMutationIntent(intent),
            EmailVerificationChallengeAccepted::class.java
        )
        requireStatus("requestCurrentUserEmailChallenge", response, setOf(202))
        val challenge = response.data ?: throw protocolError(
            "requestCurrentUserEmailChallenge",
            response,
            "email verification challenge data is null"
        )
        return V1EmailVerificationChallenge(
            challengeId = requiredId("challengeId", challenge.challengeId),
            mode = challenge.mode,
            expiresAt = challenge.expiresAt.toInstant(),
            requestId = response.meta.requestId
        )
    }

    suspend fun verifyEmailChallenge(
        challengeId: String,
        newEmailCode: String,
        currentEmailCode: String?,
        intent: MutationIntent
    ): V1ApiSuccess<CurrentUserData> {
        requiredId("challengeId", challengeId)
        require(newEmailCode.matches(Regex("^\\d{4,10}$"))) { "newEmailCode is invalid" }
        require(
            currentEmailCode == null || currentEmailCode.matches(Regex("^\\d{4,10}$"))
        ) { "currentEmailCode is invalid" }
        val response = authorizedClient.executeCancellable<CurrentUserData>(
            V1ApiRequest(
                operationId = "verifyCurrentUserEmailChallenge",
                method = V1HttpMethod.POST,
                relativePath = "me/email-verification-challenges/{challengeId}/verify",
                pathSegments = listOf(
                    "me",
                    "email-verification-challenges",
                    challengeId,
                    "verify"
                ),
                body = VerifyEmailChallengeRequest(newEmailCode, currentEmailCode)
            ).withMutationIntent(intent),
            CurrentUserData::class.java
        )
        requireStatus("verifyCurrentUserEmailChallenge", response, setOf(200))
        if (response.data == null) {
            throw protocolError("verifyCurrentUserEmailChallenge", response, "current user data is null")
        }
        return response
    }

    suspend fun previewCourseInvite(inviteToken: String): V1ApiSuccess<CourseInvitePreview> {
        validateInviteToken(inviteToken)
        val response = publicTransport.executeCancellable<CourseInvitePreview>(
            V1ApiRequest(
                operationId = "previewCourseInvite",
                method = V1HttpMethod.GET,
                relativePath = "course-invites/{inviteToken}/preview",
                pathSegments = listOf("course-invites", inviteToken, "preview")
            ),
            CourseInvitePreview::class.java
        )
        requireStatus("previewCourseInvite", response, setOf(200))
        if (response.data == null) {
            throw protocolError("previewCourseInvite", response, "invite preview data is null")
        }
        return response
    }

    suspend fun issueJoinCapability(
        inviteToken: String,
        fullName: String,
        studentNumber: String,
        gender: Gender,
        gradeYear: Int,
        intent: MutationIntent
    ): V1JoinCapability {
        validateInviteToken(inviteToken)
        require(fullName.length in 1..100) { "fullName must contain 1..100 characters" }
        require(studentNumber.length in 1..32) { "studentNumber must contain 1..32 characters" }
        require(gradeYear in 1000..9999) { "gradeYear must be a four-digit cohort year" }
        val courseJoinGender = when (gender) {
            Gender.MALE -> CourseJoinGender.MALE
            Gender.FEMALE -> CourseJoinGender.FEMALE
            else -> throw IllegalArgumentException("gender must be MALE or FEMALE for course joining")
        }
        val response = publicTransport.executeCancellable<JoinCapabilityTransport>(
            V1ApiRequest(
                operationId = "issueJoinCapability",
                method = V1HttpMethod.POST,
                relativePath = "course-invites/{inviteToken}/join-capabilities",
                pathSegments = listOf("course-invites", inviteToken, "join-capabilities"),
                body = IssueJoinCapabilityRequest(fullName, studentNumber, courseJoinGender, gradeYear)
            ).withMutationIntent(intent),
            JoinCapabilityTransport::class.java
        )
        requireStatus("issueJoinCapability", response, setOf(201))
        return response.data?.let(V1JoinCapability::fromTransport)
            ?: throw protocolError(
                operationId = "issueJoinCapability",
                response = response,
                reason = "Join Capability data is null"
            )
    }

    suspend fun joinClassSection(
        inviteToken: String,
        capability: V1JoinCapability,
        intent: MutationIntent
    ): V1StudentJoinCompleted {
        validateInviteToken(inviteToken)
        val response = publicTransport.executeCancellable<JoinResult>(
            V1ApiRequest(
                operationId = "joinClassSectionWithInvite",
                method = V1HttpMethod.POST,
                relativePath = "course-invites/{inviteToken}/join",
                headers = mapOf("X-Join-Capability" to capability.headerValue(clock())),
                pathSegments = listOf("course-invites", inviteToken, "join")
            ).withMutationIntent(intent),
            JoinResult::class.java
        )
        requireStatus("joinClassSectionWithInvite", response, setOf(200, 201))
        val result = response.data ?: throw protocolError(
            operationId = "joinClassSectionWithInvite",
            response = response,
            reason = "atomic join data is null"
        )
        require(result.classSection.id == capability.classSectionId) {
            "Join result does not match the capability ClassSection"
        }
        require(result.authSession.user.role == UserRole.STUDENT) {
            "Join result authenticated a non-student user"
        }
        require(
            result.authSession.user.status == UserStatus.PENDING_CONTACT_BINDING ||
                result.authSession.user.status == UserStatus.ACTIVE
        ) {
            "Join result contains an unsupported student account status"
        }
        require(result.studentProfile.userId == result.authSession.user.id) {
            "Join result student profile does not match the authenticated user"
        }
        require(
            result.authSession.enrollmentId == null ||
                result.authSession.enrollmentId == result.enrollment.id
        ) {
            "Join result AuthSession belongs to another enrollment"
        }
        installSessionOrThrow(
            "joinClassSectionWithInvite",
            response.meta.requestId,
            result.authSession,
            fallbackEnrollmentId = result.enrollment.id
        )
        return V1StudentJoinCompleted(
            studentProfile = result.studentProfile,
            enrollment = result.enrollment,
            course = result.course,
            classSection = result.classSection,
            currentUser = CurrentUserData(
                user = result.authSession.user,
                studentProfile = result.studentProfile,
                teacherProfile = null,
                adminProfile = null
            ),
            requestId = response.meta.requestId
        )
    }

    suspend fun listCourses(
        query: V1CourseListQuery = V1CourseListQuery(),
        cursor: ScopedCursor? = null
    ): V1Page<Course> {
        val queryMap = linkedMapOf(
            "limit" to query.limit.toString(),
            "sort" to query.sort,
            "q" to query.search,
            "status" to query.status?.value
        )
        return executePage("listCourses", "courses", queryMap, cursor, Course::class.java)
    }

    suspend fun listClassSections(
        query: V1ClassSectionListQuery = V1ClassSectionListQuery(),
        cursor: ScopedCursor? = null
    ): V1Page<ClassSection> {
        val queryMap = linkedMapOf(
            "limit" to query.limit.toString(),
            "sort" to query.sort,
            "q" to query.search,
            "courseId" to query.courseId,
            "semesterId" to query.semesterId,
            "status" to query.status
        )
        return executePage(
            "listClassSections",
            "class-sections",
            queryMap,
            cursor,
            ClassSection::class.java
        )
    }

    suspend fun listEnrollments(
        query: V1EnrollmentListQuery = V1EnrollmentListQuery(),
        cursor: ScopedCursor? = null
    ): V1Page<Enrollment> {
        val queryMap = linkedMapOf(
            "limit" to query.limit.toString(),
            "sort" to query.sort,
            "classSectionId" to query.classSectionId,
            "semesterId" to query.semesterId,
            "status" to query.status?.value
        )
        return executePage(
            "listEnrollments",
            "enrollments",
            queryMap,
            cursor,
            Enrollment::class.java
        )
    }

    suspend fun getCourse(courseId: String): V1ApiSuccess<Course> =
        executeGet(
            "getCourse",
            listOf("courses", requiredId("courseId", courseId)),
            Course::class.java
        )

    suspend fun getClassSection(classSectionId: String): V1ApiSuccess<ClassSection> =
        executeGet(
            "getClassSection",
            listOf("class-sections", requiredId("classSectionId", classSectionId)),
            ClassSection::class.java
        )

    suspend fun getEnrollment(enrollmentId: String): V1ApiSuccess<Enrollment> =
        executeGet(
            "getEnrollment",
            listOf("enrollments", requiredId("enrollmentId", enrollmentId)),
            Enrollment::class.java
        )

    private suspend fun <T> executeGet(
        operationId: String,
        pathSegments: List<String>,
        responseClass: Class<T>
    ): V1ApiSuccess<T> {
        val response = authorizedClient.executeCancellable<T>(
            V1ApiRequest(
            operationId = operationId,
            method = V1HttpMethod.GET,
            relativePath = pathSegments.joinToString("/") { "{$it}" },
            pathSegments = pathSegments
            ),
            responseClass
        )
        requireStatus(operationId, response, setOf(200))
        if (response.data == null) {
            throw protocolError(operationId, response, "resource data is null")
        }
        return response
    }

    private suspend fun <T> executePage(
        operationId: String,
        path: String,
        query: Map<String, String?>,
        cursor: ScopedCursor?,
        itemClass: Class<T>
    ): V1Page<T> {
        val accountScope = authorizedClient.currentAccountScope()
            ?: throw V1SessionInvalidatedException(requestId = null)
        val cursorScope = CursorScope.forQuery(
            accountScope,
            operationId,
            canonicalQuery(query)
        )
        var request = V1ApiRequest(
            operationId = operationId,
            method = V1HttpMethod.GET,
            relativePath = path,
            query = query
        )
        if (cursor != null) request = request.withCursor(cursor, cursorScope)
        val listType = TypeToken.getParameterized(List::class.java, itemClass).type
        val response = authorizedClient.executeCancellable<List<T>>(request, listType)
        requireStatus(operationId, response, setOf(200))
        return response.toPage(operationId, cursorScope)
    }

    private fun <T> V1ApiSuccess<List<T>>.toPage(
        operationId: String,
        scope: CursorScope
    ): V1Page<T> {
        val pagination = meta.pagination
            ?.takeUnless(JsonElement::isJsonNull)
            ?.takeIf(JsonElement::isJsonObject)
            ?.asJsonObject
            ?: throw protocolError(operationId, this, "pagination meta is missing")
        val hasMore = pagination.get("hasMore")
            ?.takeIf(JsonElement::isJsonPrimitive)
            ?.let { runCatching { it.asBoolean }.getOrNull() }
            ?: throw protocolError(operationId, this, "pagination.hasMore is invalid")
        val limit = pagination.get("limit")
            ?.takeIf(JsonElement::isJsonPrimitive)
            ?.let { runCatching { it.asInt }.getOrNull() }
            ?.takeIf { it in 1..100 }
            ?: throw protocolError(operationId, this, "pagination.limit is invalid")
        val nextCursorValue = pagination.get("nextCursor")
            ?.takeUnless(JsonElement::isJsonNull)
            ?.takeIf(JsonElement::isJsonPrimitive)
            ?.asString
            ?.takeIf(String::isNotBlank)
        if (hasMore && nextCursorValue == null) {
            throw protocolError(
                operationId,
                this,
                "pagination.nextCursor is required when hasMore=true"
            )
        }
        val pageItems = data
            ?: throw protocolError(operationId, this, "list data is null")
        return V1Page(
            items = pageItems,
            nextCursor = nextCursorValue?.let { ScopedCursor.fromServer(scope, it) },
            hasMore = hasMore,
            limit = limit,
            requestId = meta.requestId
        )
    }

    private fun installSessionOrThrow(
        operationId: String,
        requestId: String,
        session: AuthSession,
        fallbackEnrollmentId: String? = null
    ) {
        val credentials = session.toCredentials()
            .withEnrollmentIdIfMissing(fallbackEnrollmentId)
        if (!authorizedClient.installSession(credentials)) {
            throw V1CredentialPersistenceException(operationId, requestId)
        }
    }

    private fun <T> protocolError(
        operationId: String,
        response: V1ApiSuccess<T>,
        reason: String
    ): V1ProtocolException = V1ProtocolException(
        operationId = operationId,
        statusCode = response.statusCode,
        requestId = response.meta.requestId,
        reason = reason
    )

    private fun <T> requireStatus(
        operationId: String,
        response: V1ApiSuccess<T>,
        expected: Set<Int>
    ) {
        if (response.statusCode !in expected) {
            throw protocolError(
                operationId,
                response,
                "unexpected success status ${response.statusCode}; expected ${expected.sorted()}"
            )
        }
    }

    private fun validateInviteToken(value: String) {
        require(value.length in 16..512) { "inviteToken length is outside the contract" }
    }

    private fun requiredId(name: String, value: String): String {
        require(value.matches(Regex("^[A-Za-z0-9._:-]{1,64}$"))) {
            "$name must match the OpaqueId contract"
        }
        return value
    }

    companion object {
        fun create(
            credentialStore: AuthSessionCredentialStore,
            baseUrl: String = BuildConfig.BNBU_API_BASE_URL,
            httpClient: OkHttpClient = SharedHttpClient.instance,
            gson: Gson = V1Json.gson,
            clock: () -> Instant = Instant::now,
            requestIdProvider: () -> String = { "android-${java.util.UUID.randomUUID()}" },
            idempotencyKeyProvider: () -> IdempotencyKey = {
                IdempotencyKey.fromGenerated("android-auth-${java.util.UUID.randomUUID()}")
            }
        ): V1StudentApi {
            val publicTransport = V1ApiTransport(
                baseUrl = baseUrl,
                httpClient = httpClient,
                gson = gson,
                requestIdProvider = requestIdProvider
            )
            val authorizedClient = V1AuthorizedApiClient.create(
                credentialStore = credentialStore,
                baseUrl = baseUrl,
                httpClient = httpClient,
                gson = gson,
                clock = clock,
                requestIdProvider = requestIdProvider,
                idempotencyKeyProvider = idempotencyKeyProvider
            )
            return V1StudentApi(publicTransport, authorizedClient, clock)
        }
    }
}

private fun validateListQuery(limit: Int, sort: String?, search: String?) {
    require(limit in 1..100) { "limit must be in 1..100" }
    require(sort == null || sort.length <= 200) { "sort must contain at most 200 characters" }
    require(search == null || search.length in 1..100) { "search must contain 1..100 characters" }
}

private fun canonicalQuery(query: Map<String, String?>): String = query.entries
    .filter { it.value != null }
    .sortedBy { it.key }
    .joinToString(separator = "&") { (key, nullableValue) ->
        val value = requireNotNull(nullableValue)
        "${key.length}:$key=${value.length}:$value"
    }
