package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonNull
import com.google.gson.JsonPrimitive
import com.google.gson.reflect.TypeToken
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordDraftCommand
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordResubmissionCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseRecord
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordAttemptContext
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordDraft
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordResubmissionDraft
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordResubmissionGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordVersionConflictException
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionRecord
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionAlreadyActiveOnAnotherDeviceException
import edu.bnbu.student.mvp.core.exercise.ExistingRemoteExerciseSession
import edu.bnbu.student.mvp.core.exercise.ExerciseTestToolsGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseCheckInNotRequiredException
import edu.bnbu.student.mvp.core.exercise.ExerciseVersionConflictException
import edu.bnbu.student.mvp.core.exercise.StartExerciseCommand
import edu.bnbu.student.mvp.core.exercise.SubmitExerciseRecordCommand
import edu.bnbu.student.mvp.core.exercise.UpdateExerciseRecordDraftCommand
import edu.bnbu.student.mvp.core.network.v1.generated.CreateExerciseRecordRequest
import edu.bnbu.student.mvp.core.network.v1.generated.CreditType as ContractCreditType
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseRecord as ContractExerciseRecord
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseRecordStatus
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseSession
import edu.bnbu.student.mvp.core.network.v1.generated.ExerciseSessionStatus
import edu.bnbu.student.mvp.core.network.v1.generated.ReviewResult
import edu.bnbu.student.mvp.core.network.v1.generated.SessionControlRequest
import edu.bnbu.student.mvp.core.network.v1.generated.VersionedReasonRequest
import edu.bnbu.student.mvp.core.network.v1.generated.StartSessionRequest
import edu.bnbu.student.mvp.core.network.v1.generated.SubmitExerciseRecordRequest
import edu.bnbu.student.mvp.core.network.v1.generated.UpdateExerciseRecordRequest
import edu.bnbu.student.mvp.core.network.v1.generated.VersionedRequest
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

private val SAFE_REMOTE_SESSION_REQUEST_ID = Regex("^[A-Za-z0-9._:-]{1,64}$")

internal class ExerciseSessionClientContextMissingException(
    sessionId: String,
    val requestId: String
) : IllegalStateException(
    "Exercise selection is unavailable for server session ${sessionId.take(12)} " +
        "(requestId=$requestId)."
)

internal class ExerciseEnrollmentMissingException : IllegalStateException(
    "An active enrollment is required to start an exercise session."
)

/** OpenAPI 1.5 adapter for the server-authoritative ExerciseSession lifecycle. */
internal class V1ExerciseSessionGateway(
    private val authorizedClient: V1AuthorizedApiClient,
    private val enrollmentIdProvider: () -> String?,
    private val clock: () -> Instant = Instant::now,
    private val mutationRegistry: MutationIntentRegistry = MutationIntentRegistry()
) : ExerciseGateway, ExerciseTestToolsGateway, ExerciseRecordResubmissionGateway {
    private val pendingObservedAt = mutableMapOf<MutationIntentScope, OffsetDateTime>()

    override suspend fun start(command: StartExerciseCommand): ExerciseSessionRecord {
        val enrollmentId = enrollmentIdProvider().normalizedId()
            ?: throw ExerciseEnrollmentMissingException()
        val operationId = "startExerciseSession"
        val scope = mutationScope(operationId, "enrollment:$enrollmentId")
        val observedAt = observedAtFor(scope)
        val body = StartSessionRequest(
            enrollmentId = enrollmentId,
            clientObservedAt = observedAt
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "enrollmentId=$enrollmentId\nclientObservedAt=$observedAt"
            )
        )
        return executeMutation(operationId, scope, intent) {
            val response = authorizedClient.executeCancellable<ExerciseSession>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-sessions",
                    body = body
                ).withMutationIntent(intent),
                ExerciseSession::class.java
            )
            response.requireStatusAndData(operationId, setOf(201)).toDomain(
                creditType = command.creditType,
                sportType = command.sportType,
                customSportName = command.customSportName,
                expectedEnrollmentId = enrollmentId
            )
        }
    }

    override suspend fun getActive(
        localMirror: ExerciseSessionRecord?
    ): ExerciseSessionRecord? {
        val operationId = "getActiveExerciseSession"
        val enrollmentId = localMirror?.enrollmentId.normalizedId()
            ?: enrollmentIdProvider().normalizedId()
        val response = authorizedClient.executeCancellable<ExerciseSession>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.GET,
                relativePath = "exercise-sessions/active",
                pathSegments = listOf("exercise-sessions", "active"),
                query = mapOf("enrollmentId" to enrollmentId)
            ),
            ExerciseSession::class.java
        )
        requireStatus(operationId, response, setOf(200))
        val remote = response.data ?: return null
        if (localMirror?.sessionId != remote.id) {
            throw ExerciseSessionAlreadyActiveOnAnotherDeviceException(
                remote.toExistingRemoteSession(response.meta.requestId)
            )
        }
        val context = localMirror.requireMatchingContext(remote.id, response.meta.requestId)
        return remote.toDomain(
            creditType = context.creditType,
            sportType = context.sportType,
            customSportName = context.customSportName,
            expectedEnrollmentId = enrollmentId
        )
    }

    override suspend fun get(
        sessionId: String,
        localMirror: ExerciseSessionRecord?
    ): ExerciseSessionRecord {
        val normalizedSessionId = sessionId.requireOpaqueId("sessionId")
        val operationId = "getExerciseSession"
        val response = authorizedClient.executeCancellable<ExerciseSession>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.GET,
                relativePath = "exercise-sessions/{sessionId}",
                pathSegments = listOf("exercise-sessions", normalizedSessionId)
            ),
            ExerciseSession::class.java
        )
        val remote = response.requireStatusAndData(operationId, setOf(200))
        require(remote.id == normalizedSessionId) {
            "Server returned a different exercise session."
        }
        val context = localMirror.requireMatchingContext(remote.id, response.meta.requestId)
        return remote.toDomain(
            creditType = context.creditType,
            sportType = context.sportType,
            customSportName = context.customSportName,
            expectedEnrollmentId = context.enrollmentId
        )
    }

    override suspend fun capabilities(): Set<String> {
        val operationId = "getInternalTestToolCapabilities"
        return try {
            val response = authorizedClient.executeCancellable<V1TestToolCapabilitiesPayload>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.GET,
                    relativePath = "internal/test-tools/capabilities",
                    pathSegments = listOf("internal", "test-tools", "capabilities")
                ),
                V1TestToolCapabilitiesPayload::class.java
            )
            response.requireStatusAndData(operationId, setOf(200))
                .capabilities
                .asSequence()
                .map(String::trim)
                .filter(String::isNotEmpty)
                .toSet()
        } catch (error: V1HttpException) {
            if (error.statusCode == 404) emptySet() else throw error
        }
    }

    override suspend fun advanceDurationOneHour(sessionId: String, expectedVersion: Long) {
        val normalizedSessionId = sessionId.requireOpaqueId("sessionId")
        require(expectedVersion >= 1L) { "expectedVersion must be positive" }
        val operationId = "advanceSyntheticExerciseSessionDuration"
        val scope = mutationScope(
            operationId,
            "session:$normalizedSessionId:version:$expectedVersion"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "sessionId=$normalizedSessionId\nexpectedVersion=$expectedVersion" +
                    "\nadvanceSeconds=3600"
            )
        )
        executeMutation(operationId, scope, intent) {
            val response = authorizedClient.executeCancellable<ExerciseSession>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "internal/test-tools/exercise-sessions/{sessionId}/advance-duration",
                    pathSegments = listOf(
                        "internal",
                        "test-tools",
                        "exercise-sessions",
                        normalizedSessionId,
                        "advance-duration"
                    ),
                    body = VersionedRequest(expectedVersion)
                ).withMutationIntent(intent),
                ExerciseSession::class.java
            )
            val advanced = response.requireStatusAndData(operationId, setOf(200))
            require(advanced.id == normalizedSessionId) {
                "Test tools returned a different exercise session."
            }
        }
    }

    override suspend fun pause(current: ExerciseSessionRecord): ExerciseSessionRecord =
        control("pauseExerciseSession", "pause", current)

    override suspend fun resume(current: ExerciseSessionRecord): ExerciseSessionRecord =
        control("resumeExerciseSession", "resume", current)

    override suspend fun addSixtyMinutes(current: ExerciseSessionRecord): ExerciseSessionRecord =
        control("addSixtyMinutesToExerciseSession", "add-sixty-minutes", current)

    override suspend fun finish(current: ExerciseSessionRecord): ExerciseSessionRecord =
        control("finishExerciseSession", "finish", current)

    override suspend fun cancel(current: ExerciseSessionRecord): ExerciseSessionRecord {
        val operationId = "cancelExerciseSession"
        current.sessionId.requireOpaqueId("sessionId")
        require(current.version >= 1L) {
            "Server exercise session version must be positive."
        }
        val scope = mutationScope(
            operationId,
            "session:${current.sessionId}:version:${current.version}"
        )
        val reason = "Student ended exercise before the minimum valid duration."
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "sessionId=${current.sessionId}\nexpectedVersion=${current.version}\nreason=$reason"
            )
        )
        return executeMutation(operationId, scope, intent) {
            val response = authorizedClient.executeCancellable<ExerciseSession>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-sessions/{sessionId}/cancel",
                    pathSegments = listOf("exercise-sessions", current.sessionId, "cancel"),
                    body = VersionedReasonRequest(
                        reason = reason,
                        expectedVersion = current.version
                    )
                ).withMutationIntent(intent),
                ExerciseSession::class.java
            )
            val remote = response.requireStatusAndData(operationId, setOf(200))
            require(remote.id == current.sessionId) {
                "Server returned a different exercise session."
            }
            remote.toDomain(
                creditType = current.creditType,
                sportType = current.sportType,
                customSportName = current.customSportName,
                expectedEnrollmentId = current.enrollmentId
            )
        }
    }

    override suspend fun createRecordDraft(
        command: CreateExerciseRecordDraftCommand
    ): ExerciseRecordDraft {
        val operationId = "createExerciseRecordDraft"
        val normalized = command.form.normalizedForDraft(command.creditType)
        val generatedBody = CreateExerciseRecordRequest(
            sessionId = command.sessionId,
            creditType = command.creditType.toContractCreditType(),
            sportType = normalized.sportType.toContractSportType(),
            description = null,
            clientRequestId = command.clientRequestId,
            sportName = normalized.otherSportName
        )
        // OpenAPI Generator represents a nullable string union as an empty
        // compatibility class. Serialize the authoritative 1.5 value explicitly:
        // GENERAL is nonblank; COURSE_RELATED blank input is normalized to null.
        val body = V1Json.gson.toJsonTree(generatedBody).asJsonObject.apply {
            add(
                "description",
                normalized.description.takeIf(String::isNotEmpty)
                    ?.let(::JsonPrimitive) ?: JsonNull.INSTANCE
            )
        }
        val scope = mutationScope(operationId, "session:${command.sessionId}")
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                recordDraftFingerprint(command.sessionId, command.creditType.name, normalized) +
                    "\nclientRequestId=${command.clientRequestId}"
            )
        )
        return executeRecordMutation(operationId, intent) {
            val response = authorizedClient.executeCancellable<ContractExerciseRecord>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-records",
                    body = V1ExplicitJsonBody(body)
                ).withMutationIntent(intent),
                ContractExerciseRecord::class.java
            )
            response.requireStatusAndData(operationId, setOf(201))
                .toDraft(expectedSessionId = command.sessionId)
        }
    }

    override suspend fun findRecordDraft(sessionId: String): ExerciseRecordDraft? {
        val normalizedSessionId = sessionId.requireOpaqueId("sessionId")
        val operationId = "listExerciseRecords"
        val matches = mutableListOf<ContractExerciseRecord>()
        val seenCursors = mutableSetOf<String>()
        var cursor: String? = null
        do {
            val response = authorizedClient.executeCancellable<List<ContractExerciseRecord>>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.GET,
                    relativePath = "exercise-records",
                    query = mapOf(
                        "status" to ExerciseRecordStatus.DRAFT.value,
                        "limit" to "100",
                        "cursor" to cursor
                    )
                ),
                object : TypeToken<List<ContractExerciseRecord>>() {}.type
            )
            requireStatus(operationId, response, setOf(200))
            val data = response.data ?: throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "paged success data is null"
            )
            matches += data.filter { it.sessionId == normalizedSessionId }
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
        require(matches.size <= 1) { "Server returned multiple drafts for one exercise session." }
        return matches.singleOrNull()?.toDraft(expectedSessionId = normalizedSessionId)
    }

    override suspend fun updateRecordDraft(
        command: UpdateExerciseRecordDraftCommand
    ): ExerciseRecordDraft {
        val operationId = "updateExerciseRecordDraft"
        val normalized = command.form.normalizedForDraft(command.creditType)
        val generatedBody = UpdateExerciseRecordRequest(
            expectedVersion = command.expectedVersion,
            sportType = normalized.sportType.toContractSportType(),
            sportName = normalized.otherSportName,
            description = normalized.description,
        )
        // The contract distinguishes an omitted PATCH property from an explicit null.
        // Gson omits nullable Kotlin properties by default, so add sportName explicitly
        // to support clearing an earlier OTHER name.
        val body = V1Json.gson.toJsonTree(generatedBody).asJsonObject.apply {
            add(
                "sportName",
                normalized.otherSportName?.let(::JsonPrimitive) ?: JsonNull.INSTANCE
            )
        }
        val scope = mutationScope(
            operationId,
            "record:${command.recordId}:version:${command.expectedVersion}"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                recordDraftFingerprint(command.recordId, "unchanged", normalized) +
                    "\nexpectedVersion=${command.expectedVersion}"
            )
        )
        return executeRecordMutation(operationId, intent) {
            val response = authorizedClient.executeCancellable<ContractExerciseRecord>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.PATCH,
                    relativePath = "exercise-records/{recordId}",
                    pathSegments = listOf("exercise-records", command.recordId),
                    body = V1ExplicitJsonBody(body)
                ).withMutationIntent(intent),
                ContractExerciseRecord::class.java
            )
            response.requireStatusAndData(operationId, setOf(200))
                .toDraft(expectedRecordId = command.recordId)
        }
    }

    override suspend fun submitRecord(
        command: SubmitExerciseRecordCommand
    ): ExerciseRecord {
        val operationId = "submitExerciseRecord"
        val body = SubmitExerciseRecordRequest(
            mediaIds = command.mediaIds.toSet(),
            expectedVersion = command.expectedVersion
        )
        val scope = mutationScope(
            operationId,
            "record:${command.recordId}:version:${command.expectedVersion}"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "recordId=${command.recordId}\nexpectedVersion=${command.expectedVersion}" +
                    "\nmediaIds=${command.mediaIds.sorted().joinToString(",")}"
            )
        )
        return executeRecordMutation(operationId, intent) {
            val response = authorizedClient.executeCancellable<ContractExerciseRecord>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-records/{recordId}/submit",
                    pathSegments = listOf("exercise-records", command.recordId, "submit"),
                    body = body
                ).withMutationIntent(intent),
                ContractExerciseRecord::class.java
            )
            response.requireStatusAndData(operationId, setOf(200))
                .toSubmitted(expectedRecordId = command.recordId)
        }
    }

    override suspend fun getRecordAttemptContext(
        recordId: String
    ): ExerciseRecordAttemptContext {
        val normalizedRecordId = recordId.requireOpaqueId("recordId")
        val operationId = "getExerciseRecordAttemptContext"
        val response = authorizedClient.executeCancellable<V1ExerciseRecordAttemptContextPayload>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.GET,
                relativePath = "exercise-records/{recordId}/attempt-context",
                pathSegments = listOf("exercise-records", normalizedRecordId, "attempt-context")
            ),
            V1ExerciseRecordAttemptContextPayload::class.java
        )
        return response.requireStatusAndData(operationId, setOf(200))
            .toDomain(expectedRecordId = normalizedRecordId)
    }

    override suspend fun createRecordResubmission(
        command: CreateExerciseRecordResubmissionCommand
    ): ExerciseRecordResubmissionDraft {
        val previousRecordId = command.previousRecordId.requireOpaqueId("previousRecordId")
        val sessionId = command.sessionId.requireOpaqueId("sessionId")
        val normalized = command.form.normalizedForDraft(command.creditType)
        val operationId = "createExerciseRecordResubmission"
        val body = com.google.gson.JsonObject().apply {
            addProperty("sessionId", sessionId)
            addProperty("creditType", command.creditType.toContractCreditType().value)
            addProperty("sportType", normalized.sportType.toContractSportType())
            normalized.otherSportName?.let { addProperty("sportName", it) }
            normalized.description.takeIf(String::isNotEmpty)?.let { addProperty("description", it) }
            addProperty("clientRequestId", command.clientRequestId)
            addProperty("expectedVersion", command.expectedVersion)
        }
        val scope = mutationScope(
            operationId,
            "record:$previousRecordId:version:${command.expectedVersion}:session:$sessionId"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(operationId, V1Json.gson.toJson(body))
        )
        return executeRecordMutation(operationId, intent) {
            val response = authorizedClient.executeCancellable<V1ExerciseRecordResubmissionPayload>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-records/{recordId}/resubmissions",
                    pathSegments = listOf("exercise-records", previousRecordId, "resubmissions"),
                    body = V1ExplicitJsonBody(body)
                ).withMutationIntent(intent),
                V1ExerciseRecordResubmissionPayload::class.java
            )
            val payload = response.requireStatusAndData(operationId, setOf(201))
            val context = payload.attemptContext.toDomain(
                expectedRecordId = payload.record.id
            )
            require(context.previousAttemptId == previousRecordId) {
                "Resubmission must link to the preceding INVALID record."
            }
            ExerciseRecordResubmissionDraft(
                draft = payload.record.toDraft(expectedSessionId = sessionId),
                attemptContext = context
            )
        }
    }

    private suspend fun control(
        operationId: String,
        action: String,
        current: ExerciseSessionRecord
    ): ExerciseSessionRecord {
        current.sessionId.requireOpaqueId("sessionId")
        require(current.version >= 1L) {
            "Server exercise session version must be positive."
        }
        val scope = mutationScope(
            operationId,
            "session:${current.sessionId}:version:${current.version}"
        )
        val observedAt = observedAtFor(scope)
        val body = SessionControlRequest(
            clientObservedAt = observedAt,
            expectedVersion = current.version
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "sessionId=${current.sessionId}\nexpectedVersion=${current.version}" +
                    "\nclientObservedAt=$observedAt"
            )
        )
        return executeMutation(operationId, scope, intent) {
            val response = authorizedClient.executeCancellable<ExerciseSession>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-sessions/{sessionId}/{$action}",
                    pathSegments = listOf("exercise-sessions", current.sessionId, action),
                    body = body
                ).withMutationIntent(intent),
                ExerciseSession::class.java
            )
            val remote = response.requireStatusAndData(operationId, setOf(200))
            require(remote.id == current.sessionId) {
                "Server returned a different exercise session."
            }
            remote.toDomain(
                creditType = current.creditType,
                sportType = current.sportType,
                customSportName = current.customSportName,
                expectedEnrollmentId = current.enrollmentId
            )
        }
    }

    private suspend fun <T> executeMutation(
        operationId: String,
        scope: MutationIntentScope,
        intent: MutationIntent,
        block: suspend () -> T
    ): T = try {
        block().also {
            mutationRegistry.complete(intent)
            clearObservedAt(scope)
        }
    } catch (error: V1HttpException) {
        if (
            operationId == "startExerciseSession" &&
            error.error.code.value == "SESSION_ALREADY_ACTIVE"
        ) {
            mutationRegistry.complete(intent)
            clearObservedAt(scope)
            val authoritativeConflict = runCatching { getActive(localMirror = null) }
                .exceptionOrNull()
            if (authoritativeConflict is ExerciseSessionAlreadyActiveOnAnotherDeviceException) {
                throw authoritativeConflict
            }
            throw error
        }
        if (
            operationId == "startExerciseSession" &&
            error.error.code.value == "SESSION_ALREADY_COMPLETED"
        ) {
            mutationRegistry.complete(intent)
            clearObservedAt(scope)
            throw ExerciseCheckInNotRequiredException().also { it.initCause(error) }
        }
        if (error.error.code.value in RefreshableSessionConflictCodes) {
            mutationRegistry.complete(intent)
            clearObservedAt(scope)
            throw ExerciseVersionConflictException(
                "Server exercise state changed during $operationId."
            ).also { it.initCause(error) }
        }
        throw error
    }

    private suspend fun <T> executeRecordMutation(
        operationId: String,
        intent: MutationIntent,
        block: suspend () -> T
    ): T = try {
        block().also { mutationRegistry.complete(intent) }
    } catch (error: V1HttpException) {
        if (error.error.code.value == "CONFLICT_VERSION_MISMATCH") {
            mutationRegistry.complete(intent)
            throw ExerciseRecordVersionConflictException(
                "Server exercise record changed during $operationId."
            ).also { it.initCause(error) }
        }
        throw error
    }

    private fun mutationScope(operationId: String, actionSlot: String): MutationIntentScope {
        val accountScope = authorizedClient.currentAccountScope()
            ?.trim()
            ?.takeIf(String::isNotEmpty)
            ?: throw IllegalStateException("An authenticated student session is required.")
        return MutationIntentScope(accountScope, operationId, actionSlot)
    }

    @Synchronized
    private fun observedAtFor(scope: MutationIntentScope): OffsetDateTime =
        pendingObservedAt.getOrPut(scope) { clock().atOffset(ZoneOffset.UTC) }

    @Synchronized
    private fun clearObservedAt(scope: MutationIntentScope) {
        pendingObservedAt.remove(scope)
    }

    private fun ExerciseSession.toDomain(
        creditType: edu.bnbu.student.mvp.core.model.CreditType,
        sportType: String,
        customSportName: String?,
        expectedEnrollmentId: String?
    ): ExerciseSessionRecord {
        id.requireOpaqueId("sessionId")
        enrollmentId.requireOpaqueId("enrollmentId")
        require(expectedEnrollmentId == null || enrollmentId == expectedEnrollmentId) {
            "Server returned an exercise session for a different enrollment."
        }
        require(version >= 1L) { "Server exercise session version must be positive." }
        return ExerciseSessionRecord(
            sessionId = id,
            phase = status.toDomainPhase(),
            version = version,
            enrollmentId = enrollmentId,
            creditType = creditType,
            sportType = sportType,
            customSportName = customSportName,
            startedAtEpochMillis = startedAt.toInstant().toEpochMilli(),
            activeDurationSeconds = actualDurationSeconds,
            endedAtEpochMillis = endedAt?.toInstant()?.toEpochMilli()
        )
    }

    private fun ExerciseSessionStatus.toDomainPhase(): ExerciseSessionPhase = when (this) {
        ExerciseSessionStatus.IN_PROGRESS -> ExerciseSessionPhase.ACTIVE
        ExerciseSessionStatus.PAUSED -> ExerciseSessionPhase.PAUSED
        ExerciseSessionStatus.COMPLETED -> ExerciseSessionPhase.COMPLETED
        ExerciseSessionStatus.CANCELLED -> ExerciseSessionPhase.CANCELLED
        ExerciseSessionStatus.EXPIRED -> ExerciseSessionPhase.EXPIRED
    }

    private fun ExerciseSession.toExistingRemoteSession(
        requestId: String
    ): ExistingRemoteExerciseSession = ExistingRemoteExerciseSession(
        sessionId = id,
        phase = status.toDomainPhase(),
        startedAtEpochMillis = startedAt.toInstant().toEpochMilli(),
        requestId = requestId.trim().takeIf(SAFE_REMOTE_SESSION_REQUEST_ID::matches)
            ?: "unavailable"
    )

    private fun ContractExerciseRecord.toDraft(
        expectedSessionId: String? = null,
        expectedRecordId: String? = null
    ): ExerciseRecordDraft {
        id.requireOpaqueId("recordId")
        sessionId.requireOpaqueId("sessionId")
        require(expectedRecordId == null || id == expectedRecordId) {
            "Server returned a different exercise record."
        }
        require(expectedSessionId == null || sessionId == expectedSessionId) {
            "Server returned a record for a different exercise session."
        }
        require(status == ExerciseRecordStatus.DRAFT) {
            "Create/update must return a DRAFT exercise record."
        }
        require(version >= 1L) { "Server exercise record version must be positive." }
        return ExerciseRecordDraft(id, sessionId, version)
    }

    private fun ContractExerciseRecord.toSubmitted(expectedRecordId: String): ExerciseRecord {
        id.requireOpaqueId("recordId")
        sessionId.requireOpaqueId("sessionId")
        require(id == expectedRecordId) { "Server returned a different exercise record." }
        require(status == ExerciseRecordStatus.REVIEWED) {
            "Submit must return a REVIEWED exercise record."
        }
        require(currentReview?.result == ReviewResult.VALID) {
            "Submit must return a system-valid current review."
        }
        require(version >= 1L) { "Server exercise record version must be positive." }
        val submitted = requireNotNull(submittedAt) {
            "Submitted exercise record is missing submittedAt."
        }
        return ExerciseRecord(
            recordId = id,
            sessionId = sessionId,
            version = version,
            submittedAtEpochMillis = submitted.toInstant().toEpochMilli(),
            businessDate = businessDate,
            creditedDurationSeconds = creditedDurationSeconds,
            reviewStatus = requireNotNull(currentReview).result.value
        )
    }

    private fun V1ExerciseRecordAttemptContextPayload.toDomain(
        expectedRecordId: String
    ): ExerciseRecordAttemptContext {
        recordId.requireOpaqueId("recordId")
        rootAttemptId.requireOpaqueId("rootAttemptId")
        previousAttemptId?.requireOpaqueId("previousAttemptId")
        require(recordId == expectedRecordId) {
            "Server returned attempt context for a different exercise record."
        }
        return ExerciseRecordAttemptContext(
            recordId = recordId,
            previousAttemptId = previousAttemptId,
            rootAttemptId = rootAttemptId,
            attemptNumber = attemptNumber
        )
    }

    private fun edu.bnbu.student.mvp.core.model.CreditType.toContractCreditType(): ContractCreditType =
        when (this) {
            edu.bnbu.student.mvp.core.model.CreditType.CourseRelated -> ContractCreditType.COURSE_RELATED
            edu.bnbu.student.mvp.core.model.CreditType.General -> ContractCreditType.GENERAL
            edu.bnbu.student.mvp.core.model.CreditType.OrganizationOffset -> error(
                "Organization offsets cannot be submitted as exercise records."
            )
        }

    private fun String.toContractSportType(): String = trim().uppercase().also {
        require(ContractSportType.matches(it)) { "Sport type does not match the contract." }
    }

    private fun recordDraftFingerprint(
        ownerId: String,
        creditType: String,
        form: edu.bnbu.student.mvp.core.exercise.ExerciseRecordForm
    ): String = buildString {
        append("ownerId=").append(ownerId)
        append("\ncreditType=").append(creditType)
        append("\nsportType=").append(form.sportType.toContractSportType())
        append("\nsportName=").append(form.otherSportName.orEmpty())
        append("\ndescription=").append(form.description)
    }

    private fun ExerciseSessionRecord?.requireMatchingContext(
        sessionId: String,
        requestId: String
    ): ExerciseSessionRecord = this?.takeIf { it.sessionId == sessionId }
        ?: throw ExerciseSessionClientContextMissingException(sessionId, requestId)

    private fun String?.normalizedId(): String? = this?.trim()?.takeIf(String::isNotEmpty)

    private fun String.requireOpaqueId(name: String): String = trim().also {
        require(it.isNotEmpty()) { "$name must not be blank" }
    }

    private fun <T> V1ApiSuccess<T>.requireStatusAndData(
        operationId: String,
        expectedStatuses: Set<Int>
    ): T {
        requireStatus(operationId, this, expectedStatuses)
        return data ?: throw V1ProtocolException(
            operationId = operationId,
            statusCode = statusCode,
            requestId = meta.requestId,
            reason = "exercise session data is null"
        )
    }

    private fun <T> requireStatus(
        operationId: String,
        response: V1ApiSuccess<T>,
        expectedStatuses: Set<Int>
    ) {
        if (response.statusCode !in expectedStatuses) {
            throw V1ProtocolException(
                operationId = operationId,
                statusCode = response.statusCode,
                requestId = response.meta.requestId,
                reason = "unexpected success status"
            )
        }
    }

    private companion object {
        val RefreshableSessionConflictCodes = setOf(
            "CONFLICT_VERSION_MISMATCH",
            "SESSION_DURATION_CAP_REACHED"
        )
        val ContractSportType = Regex("^[A-Z][A-Z0-9_]*$")
    }
}

private data class V1ExerciseRecordAttemptContextPayload(
    val recordId: String,
    val previousAttemptId: String?,
    val rootAttemptId: String,
    val attemptNumber: Int
)

private data class V1TestToolCapabilitiesPayload(
    val capabilities: List<String> = emptyList()
)

private data class V1ExerciseRecordResubmissionPayload(
    val record: ContractExerciseRecord,
    val attemptContext: V1ExerciseRecordAttemptContextPayload
)
