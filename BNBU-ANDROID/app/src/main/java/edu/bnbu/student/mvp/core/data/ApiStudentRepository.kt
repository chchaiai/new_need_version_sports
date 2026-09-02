package edu.bnbu.student.mvp.core.data

import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CheckInTimeWindow
import edu.bnbu.student.mvp.core.model.Course
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.EnduranceConversionRequest
import edu.bnbu.student.mvp.core.model.EnduranceScoreResult
import edu.bnbu.student.mvp.core.model.EnduranceRunStatus
import edu.bnbu.student.mvp.core.model.Exemption
import edu.bnbu.student.mvp.core.model.ExemptionApplication
import edu.bnbu.student.mvp.core.model.GradeBlock
import edu.bnbu.student.mvp.core.model.GradeRow
import edu.bnbu.student.mvp.core.model.GradeSubItem
import edu.bnbu.student.mvp.core.model.HelpArticleContent
import edu.bnbu.student.mvp.core.model.Membership
import edu.bnbu.student.mvp.core.model.NoticeCategory
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.ProofUploadRule
import edu.bnbu.student.mvp.core.model.StudentNotice
import edu.bnbu.student.mvp.core.model.StudentProgress
import edu.bnbu.student.mvp.core.model.StudentProfile
import edu.bnbu.student.mvp.core.model.StudentStatus
import edu.bnbu.student.mvp.core.model.SportHourRule
import edu.bnbu.student.mvp.core.model.TeacherInfo
import edu.bnbu.student.mvp.core.model.StudentWorkspace
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.network.LoginResponse
import edu.bnbu.student.mvp.core.network.MembershipResponse
import edu.bnbu.student.mvp.core.network.MarkReadResponse
import edu.bnbu.student.mvp.core.network.NotificationResponse
import edu.bnbu.student.mvp.core.network.SportRecordResponse
import edu.bnbu.student.mvp.core.network.SportSummaryResponse
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.StudentLoginRequest
import edu.bnbu.student.mvp.core.network.SubmitRecordResponse
import edu.bnbu.student.mvp.core.network.SubmitSportRecordRequest
import edu.bnbu.student.mvp.core.network.UploadProofResponse
import edu.bnbu.student.mvp.core.network.UploadedProofFile
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.core.network.UserDto
import edu.bnbu.student.mvp.core.network.EnduranceScoreResponse
import edu.bnbu.student.mvp.core.network.ExemptionResponse
import edu.bnbu.student.mvp.core.network.ExemptionSubmitResponse
import edu.bnbu.student.mvp.core.network.ExemptionSupplementRequest
import edu.bnbu.student.mvp.core.network.StudentProfileResponse
import edu.bnbu.student.mvp.core.network.StudentProfileUpdateRequest
import edu.bnbu.student.mvp.core.network.StudentCourseDetailResponse
import edu.bnbu.student.mvp.core.network.StudentCoursesResponse
import edu.bnbu.student.mvp.core.network.CheckInTimeWindowResponse
import edu.bnbu.student.mvp.core.network.StudentGradesResponse
import edu.bnbu.student.mvp.core.network.FeedbackTicketListResponse
import edu.bnbu.student.mvp.core.network.FeedbackTicketResponse
import edu.bnbu.student.mvp.core.network.SubmitFeedbackRequest
import edu.bnbu.student.mvp.core.network.LanguagePreferenceResponse
import edu.bnbu.student.mvp.core.network.UpdateLanguagePreferenceRequest
import edu.bnbu.student.mvp.core.network.v1.V1StudentWorkspaceGateway
import edu.bnbu.student.mvp.core.network.v1.V1StudentWorkspaceSnapshot
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordDraftCommand
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordResubmissionCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordAttemptContext
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordForm
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordResubmissionDraft
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordResubmissionGateway
import edu.bnbu.student.mvp.core.exercise.SubmitExerciseRecordCommand
import edu.bnbu.student.mvp.core.network.v1.generated.CreateExemptionApplicationRequest
import edu.bnbu.student.mvp.core.network.v1.generated.CreateFeedbackRequest
import edu.bnbu.student.mvp.core.network.v1.generated.ExemptionApplication as ContractExemptionApplication
import edu.bnbu.student.mvp.core.network.v1.generated.StructuredExemptionApplication as ContractStructuredExemptionApplication
import edu.bnbu.student.mvp.core.network.v1.generated.Feedback as ContractFeedback
import edu.bnbu.student.mvp.core.network.v1.generated.HelpArticle as ContractHelpArticle
import edu.bnbu.student.mvp.core.network.v1.generated.UpdateUserPreferencesRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.URI

internal fun selectCurrentEnrollmentId(
    sessionEnrollmentId: String?,
    currentSemesterId: String?,
    activeEnrollmentSemesterIds: Map<String, String>
): String? {
    val semesterId = currentSemesterId?.takeIf(String::isNotBlank) ?: return null
    val currentCandidates = activeEnrollmentSemesterIds
        .filterValues { it == semesterId }
        .keys
    return sessionEnrollmentId?.takeIf(String::isNotBlank)?.let { sessionId ->
        sessionId.takeIf { it in currentCandidates }
    } ?: currentCandidates.singleOrNull()
}

class ApiStudentRepository(
    initialBearerToken: String? = null,
    private val userProfile: UserDto? = null,
    private val v1Gateway: V1StudentWorkspaceGateway? = null
) : StudentRepository {
    private var lastV1Snapshot: V1StudentWorkspaceSnapshot? = null
    private var exerciseGateway: ExerciseGateway? = null
    private var recordResubmissionGateway: ExerciseRecordResubmissionGateway? = null

    internal fun attachExerciseGateway(gateway: ExerciseGateway?): ApiStudentRepository = apply {
        exerciseGateway = gateway
        recordResubmissionGateway = gateway as? ExerciseRecordResubmissionGateway
    }

    /**
     * The current access token is exposed only for session-state checks.
     * All network calls use [v1Gateway], whose credential store performs
     * refresh-token rotation and never falls back to legacy endpoints.
     */
    var bearerToken: String? = initialBearerToken

    // ── Auth ──────────────────────────────────────────────────────

    override suspend fun login(payload: StudentLoginRequest): LoginResponse {
        throw UnsupportedOperationException(
            "Password login is not part of the Android student flow; use V1 email-code login."
        )
    }

    // ── Core loading ────────────────────────────────────────────

    override fun loadWorkspace(): StudentWorkspace {
        return StudentWorkspace.empty()
    }

    /** Fetches only the current server-authoritative check-in admission policy. */
    suspend fun fetchCheckInTimeWindow(): CheckInTimeWindow = withContext(Dispatchers.IO) {
        requireV1Gateway().loadActiveClassSection()?.toCheckInTimeWindow()
            ?: CheckInTimeWindow.unavailable()
    }

    /**
     * Fetch the full student workspace from the backend (summary + records +
     * identity + notifications), then map DTOs → domain model.
     *
     * Throws on any network or mapping error so the caller can surface it to the
     * user. Persistent cache fallback is owned by StudentAppState so stale data is
     * never returned silently from the network layer.
     */
    override suspend fun loadWorkspaceAsync(): StudentWorkspace = withContext(Dispatchers.IO) {
        val snapshot = requireV1Gateway().loadWorkspace().also { lastV1Snapshot = it }
        snapshot.toWorkspace()
    }

    // ── Grades ────────────────────────────────────────────────────

    /**
     * Fetch the student's own grade data from the backend.
     *
     * This is a separate call because grade data (exam, attendance, physical)
     * is managed by teacher/admin endpoints and is not included in the summary.
     */
    suspend fun fetchStudentGrades(): StudentGradesResponse {
        throw UnsupportedOperationException("Use the V1 student-score projection in loadWorkspaceAsync().")
    }

    // ── Mutations ───────────────────────────────────────────────

    override suspend fun submitRecord(payload: SubmitSportRecordRequest): Result<SubmitRecordResponse> {
        return withContext(Dispatchers.IO) {
            runCatching {
                val gateway = requireNotNull(exerciseGateway) {
                    interfaceText("运动打卡服务尚未连接，请重新登录。", "The exercise check-in service is not connected. Sign in again.")
                }
                val sessionId = requireNotNull(payload.sessionId?.trim()?.takeIf(String::isNotEmpty)) {
                    interfaceText("未找到已完成的运动会话，请重新开始打卡。", "A completed exercise session was not found. Start the check-in again.")
                }
                val clientRequestId = requireNotNull(
                    payload.clientRequestId?.trim()?.takeIf(String::isNotEmpty)
                ) { interfaceText("打卡请求标识缺失，请重新提交。", "The check-in request ID is missing. Submit again.") }
                val mediaIds = payload.proofFiles.map { it.cosKey.trim() }
                    .filter(String::isNotEmpty)
                    .distinct()
                require(mediaIds.isNotEmpty()) {
                    interfaceText("至少需要 1 个已确认上传的凭证。", "At least one confirmed evidence upload is required.")
                }
                val creditType = when (payload.creditType.trim().uppercase()) {
                    "COURSE_RELATED", "课程相关" -> CreditType.CourseRelated
                    "GENERAL", "其他运动" -> CreditType.General
                    else -> error(interfaceText("不支持该打卡类别。", "This check-in category is not supported."))
                }
                val sportType = payload.sportType?.trim()?.uppercase()?.takeIf(String::isNotEmpty)
                    ?: error(interfaceText("请选择运动项目。", "Choose an exercise type."))
                val draft = gateway.createRecordDraft(
                    CreateExerciseRecordDraftCommand(
                        sessionId = sessionId,
                        creditType = creditType,
                        clientRequestId = clientRequestId,
                        form = ExerciseRecordForm(
                            description = payload.description,
                            sportType = sportType
                        )
                    )
                )
                val submitted = gateway.submitRecord(
                    SubmitExerciseRecordCommand(
                        recordId = draft.recordId,
                        expectedVersion = draft.version,
                        mediaIds = mediaIds
                    )
                )
                SubmitRecordResponse(
                    id = submitted.recordId,
                    submittedAt = java.time.Instant.ofEpochMilli(submitted.submittedAtEpochMillis).toString(),
                    businessDate = submitted.businessDate.toString(),
                    creditedDurationSeconds = submitted.creditedDurationSeconds,
                    reviewStatus = submitted.reviewStatus
                )
            }
        }
    }

    /** Reads additive attempt metadata without changing the frozen record projection. */
    internal suspend fun fetchExerciseRecordAttemptContext(
        recordId: String
    ): ExerciseRecordAttemptContext = withContext(Dispatchers.IO) {
        requireRecordResubmissionGateway().getRecordAttemptContext(recordId)
    }

    /**
     * Creates only the next DRAFT attempt. The preceding INVALID record remains
     * immutable and the returned draft still follows the ordinary media/submit flow.
     */
    internal suspend fun createExerciseRecordResubmission(
        command: CreateExerciseRecordResubmissionCommand
    ): ExerciseRecordResubmissionDraft = withContext(Dispatchers.IO) {
        requireRecordResubmissionGateway().createRecordResubmission(command)
    }

    override suspend fun markNotificationRead(id: String): Result<MarkReadResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val notice = requireV1Gateway().markNotificationRead(id)
                Result.success(MarkReadResponse(id = notice.id, read = notice.readAt != null))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    // ── DTO → domain mapping ─────────────────────────────────────

    private fun buildWorkspace(
        summary: SportSummaryResponse,
        records: List<SportRecordResponse>,
        memberships: List<MembershipResponse>,
        notices: List<NotificationResponse>,
        courseItems: List<StudentCourseDetailResponse> = emptyList(),
        gradesResponse: StudentGradesResponse? = null,
        gradesLoadError: String? = null,
        remoteProfile: StudentProfileResponse? = null,
        checkInTimeWindow: CheckInTimeWindow = CheckInTimeWindow.unavailable()
    ): StudentWorkspace {
        // Student identity comes from the login response (userProfile), with
        // fallback defaults when not available (e.g. synchronous loadWorkspace).
        val profile = userProfile
        val hasActiveEnrollment = courseItems.any { course ->
            course.isCurrent && course.enrollmentStatus.trim().lowercase() in setOf("active", "enrolled")
        } || (courseItems.isEmpty() && summary.courses.isNotEmpty())
        val student = StudentProfile(
            id = remoteProfile?.id?.takeIf { it.isNotBlank() } ?: profile?.id.orEmpty(),
            name = remoteProfile?.name?.takeIf { it.isNotBlank() }
                ?: profile?.name?.takeIf { it.isNotBlank() }
                ?: "学生",
            studentNumber = remoteProfile?.studentNumber?.takeIf { it.isNotBlank() }
                ?: profile?.studentNumber.orEmpty(),
            email = remoteProfile?.email?.takeIf { it.isNotBlank() } ?: profile?.email.orEmpty(),
            college = remoteProfile?.college?.takeIf { it.isNotBlank() } ?: profile?.college.orEmpty(),
            className = remoteProfile?.className?.takeIf { it.isNotBlank() } ?: profile?.className.orEmpty(),
            status = StudentStatus.fromHasActiveEnrollment(hasActiveEnrollment).name,
            gender = remoteProfile?.gender ?: profile?.gender ?: "",
            gradeLevel = remoteProfile?.currentGradeLevel
                ?: remoteProfile?.gradeLevel
                ?: profile?.gradeLevel
                ?: "",
            admissionYear = remoteProfile?.admissionYear,
            currentAcademicYear = remoteProfile?.currentAcademicYear.orEmpty(),
            gradeCalculatedAt = remoteProfile?.gradeCalculatedAt.orEmpty(),
            accountStatus = remoteProfile?.accountStatus?.takeIf { it.isNotBlank() }
                ?: profile?.accountStatus?.takeIf { it.isNotBlank() }
                ?: "ACTIVE"
        )

        val orgCredit = memberships.firstOrNull { it.status == "认证有效" && it.offset == "可抵扣" }

        val progress = StudentProgress(
            id = student.id,
            name = student.name,
            college = student.college,
            className = student.className,
            course = summary.courseHours,
            general = summary.generalHours,
            // The current summary endpoint exposes only totals. This fallback keeps the
            // breakdown honest until its raw course/general fields are available.
            rawCourse = summary.courseHours,
            rawGeneral = summary.generalHours,
            exam = 0,
            attendance = 0,
            physical = 0,
            status = statusText(summary),
            source = "api",
            organizationCredit = if (orgCredit != null) membershipToMembership(orgCredit) else null
        )

        // Courses and tasks are now returned by the backend summary API —
        // map them from the new `courses` field.
        val courses: List<Course> = if (courseItems.isNotEmpty()) {
            courseItems.map { c ->
                Course(
                    id = c.id,
                    name = c.name,
                    semester = c.semester.name.ifBlank { c.semester.academicYear },
                    students = 0,
                    completion = 0,
                    missing = 0,
                    deadline = c.semester.endDate.orEmpty(),
                    teacher = c.teacherName,
                    teacherId = c.teacherId,
                    semesterId = c.semester.id,
                    academicYear = c.semester.academicYear,
                    term = c.semester.term,
                    semesterStatus = c.semester.status,
                    status = c.status,
                    enrollmentStatus = c.enrollmentStatus,
                    isCurrent = c.isCurrent,
                    finalGrade = c.finalGrade,
                    gradeStatus = c.gradeStatus
                )
            }
        } else {
            summary.courses.map { c ->
                Course(
                    id = c.courseId,
                    name = c.courseName,
                    semester = "",
                    students = 0,
                    completion = 0,
                    missing = 0,
                    deadline = "",
                    teacher = c.teacherName,
                    teacherId = c.teacherId,
                    academicYear = remoteProfile?.currentAcademicYear.orEmpty(),
                    // Summary responses do not carry course lifecycle state, so they
                    // cannot authorize check-in when /student/courses is unavailable.
                    status = "unavailable",
                    isCurrent = true
                )
            }
        }

        // Teachers are returned directly from the summary API
        val teachers: List<TeacherInfo> = summary.teachers.map { t ->
            TeacherInfo(teacherId = t.teacherId, teacherName = t.teacherName)
        }

        // Grade scores are managed by teacher/admin endpoints. Prefer configured
        // blocks, while retaining the legacy flat check-in/physical fields used
        // by the current student API.
        val studentGrade = gradesResponse?.grades
            ?.firstOrNull { it.studentId == student.id }
            ?: gradesResponse?.grades?.firstOrNull()

        val grades = if (studentGrade != null) {
            val configuredBlocks = studentGrade.visibleBlocks.map { block ->
                GradeBlock(
                    id = block.id,
                    name = block.name,
                    weight = block.weight,
                    score = block.score,
                    scoreDisplay = block.scoreDisplay,
                    isVisible = block.isVisible,
                    displayOrder = block.displayOrder,
                    blockType = block.blockType,
                    description = block.description,
                    subItems = block.subItems?.map { subItem ->
                        GradeSubItem(
                            name = subItem.name,
                            score = subItem.score,
                            scoreDisplay = subItem.scoreDisplay
                        )
                    }
                )
            }
            val configuredIdentity = configuredBlocks.filter(GradeBlock::isVisible).joinToString(" ") {
                "${it.id} ${it.name} ${it.blockType}"
            }.lowercase()
            val hasConfiguredCheckIn = listOf("checkin", "check_in", "打卡", "学时")
                .any(configuredIdentity::contains)
            val hasConfiguredEndurance = listOf(
                "physical",
                "endurance",
                "800m",
                "800米",
                "1000m",
                "1000米",
                "耐力跑",
                "体测"
            ).any(configuredIdentity::contains)
            val legacyFocusedBlocks = buildList {
                if (!hasConfiguredEndurance) {
                    val distance = when (student.gender) {
                        "male" -> "1000 米"
                        "female" -> "800 米"
                        else -> "800 / 1000 米"
                    }
                    add(
                        GradeBlock(
                            id = "physical",
                            name = "$distance 跑步",
                            weight = 0.0,
                            score = studentGrade.physical,
                            scoreDisplay = studentGrade.physical.toString(),
                            isVisible = true,
                            displayOrder = 10,
                            blockType = "physical_test",
                            description = "耐力跑测试成绩",
                            subItems = null
                        )
                    )
                }
                if (!hasConfiguredCheckIn) {
                    add(
                        GradeBlock(
                            id = "checkin",
                            name = "打卡成绩",
                            weight = 0.0,
                            score = studentGrade.resolvedCheckinScore,
                            scoreDisplay = studentGrade.resolvedCheckinScore.toString(),
                            isVisible = true,
                            displayOrder = 20,
                            blockType = "checkin",
                            description = "根据有效运动打卡换算",
                            subItems = null
                        )
                    )
                }
            }
            GradeRow(
                studentId = studentGrade.studentId,
                studentName = studentGrade.studentName,
                visibleBlocks = configuredBlocks + legacyFocusedBlocks,
                totalScore = studentGrade.totalScore,
                totalDisplay = studentGrade.totalDisplay,
                isPassed = studentGrade.isPassed,
                courseGradeStatus = studentGrade.courseGradeStatus,
                displayConfigVersion = studentGrade.displayConfigVersion,
                sourceTrace = studentGrade.sourceTrace.orEmpty().ifBlank { "API: /student/grades" },
                enduranceRunTimeSeconds = studentGrade.enduranceRunTimeSeconds,
                enduranceRunStatus = EnduranceRunStatus.fromApi(
                    studentGrade.enduranceRunStatus,
                    studentGrade.enduranceRunTimeSeconds
                ),
                enduranceRunScore = studentGrade.enduranceRunScore
            )
        } else GradeRow(
            studentId = student.id,
            studentName = student.name,
            visibleBlocks = emptyList(),
            totalScore = null,
            totalDisplay = "未开放",
            isPassed = null,
            courseGradeStatus = "rules_not_published",
            displayConfigVersion = 0,
            sourceTrace = if (gradesLoadError != null) {
                "API: grade data not yet available — $gradesLoadError"
            } else {
                "API: grade data not yet available from summary endpoint"
            }
        )

        return StudentWorkspace(
            student = student,
            courses = courses,
            progress = progress,
            hourRule = summary.toSportHourRule(),
            records = records.map { recordResponseToRecord(it) },
            grades = grades,
            memberships = memberships.map { membershipToMembership(it) },
            notices = notices.map { noticeResponseToNotice(it) },
            teachers = teachers,
            checkInTimeWindow = checkInTimeWindow
        )
    }

    /**
     * Hour targets are teacher-configured and must come from the summary API.
     * The standard rule is only a compatibility fallback for older servers that
     * do not return the optional `rule` object.
     */
    private fun SportSummaryResponse.toSportHourRule(): SportHourRule {
        val serverRule = rule ?: return SportHourRule.Standard
        return SportHourRule(
            total = serverRule.total,
            courseRequired = serverRule.courseRequired,
            generalRequired = serverRule.generalRequired,
            dailyLimit = serverRule.dailyLimit
        )
    }

    private fun buildMissingItems(summary: SportSummaryResponse): List<String> {
        val items = mutableListOf<String>()
        if (summary.courseRemaining > 0) items.add("打卡未满：课程相关还差 ${summary.courseRemaining}h")
        if (summary.generalRemaining > 0) items.add("打卡未满：其他运动还差 ${summary.generalRemaining}h")
        return items
    }

    private fun statusText(summary: SportSummaryResponse): String {
        if (summary.completed) return "已完成"
        val parts = mutableListOf<String>()
        if (summary.courseRemaining > 0) parts.add("差课程 ${summary.courseRemaining}h")
        if (summary.generalRemaining > 0) parts.add("差其他 ${summary.generalRemaining}h")
        return parts.ifEmpty { listOf("进行中") }.joinToString("，")
    }

    private fun recordResponseToRecord(r: SportRecordResponse): CheckInRecord {
        val creditType = when (r.creditType) {
            "课程相关" -> CreditType.CourseRelated
            "其他运动" -> CreditType.General
            "系统抵扣" -> CreditType.OrganizationOffset
            else -> CreditType.General
        }
        return CheckInRecord(
            id = r.id,
            courseId = r.courseId,
            taskTitle = r.taskTitle ?: "运动打卡",
            creditType = creditType,
            hours = r.hours,
            submittedAt = r.submittedAt ?: "",
            proofSummary = "${r.proofFiles.size} 个凭证",
            proofPhotoCount = r.proofFiles.count { it.mediaType == "image" },
            proofVideoCount = r.proofFiles.count { it.mediaType == "video" },
            proofFiles = r.proofFiles.map { proof ->
                ProofAttachment(
                    id = proof.cosKey.ifBlank { proof.url },
                    type = if (proof.mediaType == "video") ProofMediaType.Video else ProofMediaType.Image,
                    fileName = proof.cosKey.substringAfterLast('/').ifBlank { "proof" },
                    byteCount = proof.size.takeIf { it > 0 },
                    source = proof.url.ifBlank { "api" }
                )
            },
            teacherPublicFeedback = r.teacherPublicFeedback,
            teacherInternalNote = r.teacherInternalNote,
            note = r.description ?: "",
            sportType = r.sportType,
            startTime = r.startTime,
            endTime = r.endTime,
            actualDurationSeconds = r.actualDurationSeconds
        )
    }

    private fun membershipToMembership(m: MembershipResponse): Membership {
        return Membership(
            id = m.id,
            type = m.type,
            organization = m.organization,
            studentId = m.studentId,
            studentName = m.studentName,
            status = m.status,
            validUntil = m.validUntil ?: "",
            offset = m.offset,
            comment = m.comment ?: "",
            updatedBy = m.updatedBy ?: "",
            updatedAt = m.updatedAt ?: ""
        )
    }

    private fun noticeResponseToNotice(n: NotificationResponse): StudentNotice {
        val category = when (n.category) {
            "截止提醒" -> NoticeCategory.Deadline
            "审核反馈", "申请与材料" -> NoticeCategory.Review
            "组织认证" -> NoticeCategory.Organization
            else -> NoticeCategory.System
        }
        return StudentNotice(
            id = n.id,
            title = n.title,
            message = n.message,
            time = n.time,
            category = category,
            isUnread = n.isUnread,
            targetType = n.targetType,
            targetId = n.targetId
        )
    }

    // ── Request factories ────────────────────────────────────────

    // ── New: Endurance scoring ────────────────────────────────────

    suspend fun convertEndurance(request: EnduranceConversionRequest): EnduranceScoreResponse {
        return withContext(Dispatchers.IO) {
            requireV1Gateway().previewActivityConversion(
                timeSeconds = request.timeSeconds,
                gender = request.gender,
                gradeLevel = request.gradeLevel
            )
        }
    }

    // ── New: Exemptions ───────────────────────────────────────────

    suspend fun listExemptions(): List<ExemptionResponse> {
        return withContext(Dispatchers.IO) {
            requireV1Gateway().listExemptions()
                .map { it.toLegacyResponse() }
                .sortedByDescending(ExemptionResponse::createdAt)
        }
    }

    suspend fun loadExemptionProofPreviews(mediaIds: List<String>): Map<String, String> {
        return withContext(Dispatchers.IO) {
            val gateway = requireV1Gateway()
            mediaIds
                .map(String::trim)
                .filter(String::isNotEmpty)
                .filterNot { it.contains("://") }
                .distinct()
                .associateWith { mediaId -> gateway.createExemptionMediaAccessUrl(mediaId) }
        }
    }

    suspend fun submitExemption(payload: ExemptionApplication): ExemptionSubmitResponse {
        return withContext(Dispatchers.IO) {
            val gateway = requireV1Gateway()
            val created = gateway.createExemption(
                enrollmentId = activeEnrollmentId(),
                applicationType = payload.toContractApplicationType(),
                applicationSubtype = payload.toContractApplicationSubtype(),
                organizationName = payload.organization,
                reason = payload.reason,
                mediaIds = payload.proofFiles.filter(String::isNotBlank).toSet(),
                intentId = payload.intentId
            )
            gateway.awaitExemptionMediaAvailable(created.mediaIds)
            gateway.submitExemption(created.id, created.version).toLegacySubmitResponse()
        }
    }

    // ── New: Tasks ────────────────────────────────────────────────

    // ── File upload ────────────────────────────────────────────────

    /**
     * Upload proof media to the backend and return COS-backed file metadata.
     *
     * Copies files from [proofAttachments] that have valid local [ProofAttachment.source]
     * URIs to temporary files, then uploads them through the private V1 media lifecycle.
     * Returns the confirmed media identifiers used by an exemption application.
     *
     * @param proofAttachments the attachments selected by the user. Only those whose
     *   [ProofAttachment.source] is a readable content:// or file:// URI are used.
     * @param cacheDir the app's cache directory — used for staging temp copies.
     * @return uploaded file metadata on success; empty list if no valid files to upload.
     */
    suspend fun uploadProofFiles(
        proofAttachments: List<ProofAttachment>,
        cacheDir: File,
        onProgress: (UploadProgress) -> Unit = {}
    ): Result<List<UploadedProofFile>> {
        return withContext(Dispatchers.IO) {
            val tempFiles = mutableListOf<File>()
            try {
                if (proofAttachments.isEmpty()) {
                    return@withContext Result.success(emptyList())
                }

                for (attachment in proofAttachments) {
                    if (!attachment.isValidForUpload) {
                        throw IOException(
                            "Upload file is invalid: ${attachment.fileName} " +
                                "(${attachment.validationMessage ?: "validation failed"})"
                        )
                    }

                    val ext = attachment.fileName
                        .substringAfterLast('.', "")
                        .lowercase()
                        .filter { it.isLetterOrDigit() }
                        .take(5)
                        .ifBlank {
                            if (attachment.type == ProofMediaType.Video) "mp4" else "jpg"
                        }
                    val tempFile = File.createTempFile("proof_", ".$ext", cacheDir)
                    tempFiles.add(tempFile)
                    openAttachmentStream(attachment).use { input ->
                        tempFile.outputStream().use { output ->
                            // Exemption evidence is image-only. Exercise video is owned by
                            // the separate session media lifecycle.
                            require(attachment.type == ProofMediaType.Image) {
                                "Exercise video must use the private media upload flow"
                            }
                            val maximumBytes = ProofUploadRule.maxImageBytes.toLong()
                            val copied = copyWithLimit(input, output, maximumBytes)
                            if (copied == 0L) {
                                throw IOException("Upload file is empty: ${attachment.fileName}")
                            }
                        }
                    }
                }

                if (tempFiles.size != proofAttachments.size) {
                    throw IOException(
                        "Prepared ${tempFiles.size} of ${proofAttachments.size} upload files"
                    )
                }

                val enrollmentId = activeEnrollmentId()
                val totalBytes = tempFiles.sumOf(File::length).coerceAtLeast(1L)
                var completedBytes = 0L
                val uploaded = tempFiles.mapIndexed { index, file ->
                    val attachment = proofAttachments[index]
                    val media = requireV1Gateway().uploadExemptionMedia(
                        enrollmentId = enrollmentId,
                        file = file,
                        mimeType = attachment.mimeTypeForV1(),
                        durationSeconds = attachment.durationSeconds?.toLong(),
                        captureSource = attachment.captureSource,
                        intentId = attachment.id,
                        onProgress = { itemProgress ->
                            onProgress(
                                UploadProgress(
                                    bytesSent = (completedBytes + itemProgress.bytesSent)
                                        .coerceAtMost(totalBytes),
                                    totalBytes = totalBytes
                                )
                            )
                        }
                    )
                    completedBytes += file.length()
                    UploadedProofFile(
                        url = "",
                        cosKey = media.mediaId,
                        mediaType = "image",
                        mimeType = media.mimeType,
                        size = media.fileSizeBytes
                    )
                }
                Result.success(uploaded)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Result.failure(e)
            } finally {
                tempFiles.forEach { it.delete() }
            }
        }
    }

    suspend fun supplementExemption(
        exemption: Exemption,
        payload: ExemptionApplication
    ): ExemptionSubmitResponse {
        return withContext(Dispatchers.IO) {
            val gateway = requireV1Gateway()
            val current = gateway.listExemptions().firstOrNull { it.id == exemption.id }
                ?: throw IOException("Exemption application no longer exists.")
            val updated = gateway.updateExemption(
                applicationId = current.id,
                reason = payload.reason,
                mediaIds = current.mediaIds + payload.proofFiles.filter(String::isNotBlank),
                expectedVersion = current.version
            )
            gateway.awaitExemptionMediaAvailable(updated.mediaIds)
            gateway.submitExemption(updated.id, updated.version).toLegacySubmitResponse()
        }
    }

    @Throws(IOException::class)
    private fun openAttachmentStream(attachment: ProofAttachment): InputStream {
        val source = attachment.source.trim()
        if (source.isEmpty()) {
            throw IOException("Upload source is empty: ${attachment.fileName}")
        }

        val sourceUri = try {
            URI(source)
        } catch (e: Exception) {
            throw IOException("Upload source is invalid: ${attachment.fileName}", e)
        }

        return when (sourceUri.scheme?.lowercase()) {
            "file" -> {
                val sourceFile = try {
                    File(sourceUri)
                } catch (e: Exception) {
                    throw IOException("Upload file path is invalid: ${attachment.fileName}", e)
                }
                if (!sourceFile.isFile || !sourceFile.canRead()) {
                    throw IOException("Upload file is not readable: ${attachment.fileName}")
                }
                FileInputStream(sourceFile)
            }

            "content" -> {
                val context = androidAppContext()
                    ?: throw IOException("Upload context is unavailable: ${attachment.fileName}")
                val androidUri = android.net.Uri.parse(source)
                context.contentResolver.openInputStream(androidUri)
                    ?: throw IOException("Upload content is not readable: ${attachment.fileName}")
            }

            else -> throw IOException(
                "Unsupported upload source scheme for ${attachment.fileName}: ${sourceUri.scheme ?: "none"}"
            )
        }
    }

    @Throws(IOException::class)
    private suspend fun copyWithLimit(
        input: InputStream,
        output: OutputStream,
        maximumBytes: Long
    ): Long {
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var copied = 0L
        while (true) {
            currentCoroutineContext().ensureActive()
            val count = input.read(buffer)
            if (count < 0) break
            if (copied > maximumBytes - count) {
                throw IOException("Upload file exceeds ${maximumBytes / 1_000_000}MB")
            }
            output.write(buffer, 0, count)
            copied += count
        }
        return copied
    }

    // ── New: Profile ──────────────────────────────────────────────

    suspend fun fetchProfile(): StudentProfileResponse {
        return withContext(Dispatchers.IO) {
            requireV1Gateway().loadWorkspace()
                .also { lastV1Snapshot = it }
                .toLegacyProfile()
        }
    }

    suspend fun updateProfile(payload: StudentProfileUpdateRequest): StudentProfileResponse {
        throw UnsupportedOperationException("School-owned student profile facts are read-only in Android.")
    }

    /**
     * Stores the student's UI language on the backend so email and other
     * server-originated communication can use the same language.
     */
    suspend fun updateLanguagePreference(language: AppLanguage): LanguagePreferenceResponse {
        return withContext(Dispatchers.IO) {
            val gateway = requireV1Gateway()
            val current = gateway.getPreferences()
            val locale = when (language.languageTag) {
                "en" -> UpdateUserPreferencesRequest.Locale.en
                else -> UpdateUserPreferencesRequest.Locale.zhMinusCN
            }
            val updated = gateway.updatePreferences(
                locale = locale,
                pushEnabled = current.pushEnabled,
                emailEnabled = current.emailEnabled,
                expectedVersion = current.version
            )
            LanguagePreferenceResponse(updated.locale.value)
        }
    }

    /** Loads only the articles currently published by an administrator. */
    suspend fun fetchHelpArticles(): List<HelpArticleContent> {
        return withContext(Dispatchers.IO) {
            requireV1Gateway().listHelpArticles(languageTagForV1())
                .map { it.toDomainModel() }
        }
    }

    // Feedback API contract is isolated here while the backend endpoint is being finalized.
    suspend fun submitFeedback(payload: SubmitFeedbackRequest): FeedbackTicketResponse {
        return withContext(Dispatchers.IO) {
            val content = buildString {
                append(payload.description.trim())
                payload.currentPage.trim().takeIf(String::isNotEmpty)?.let {
                    append("\n\nPage: ").append(it)
                }
            }.take(2000)
            val body = CreateFeedbackRequest(
                category = payload.category.toContractFeedbackCategory(),
                content = content,
                clientContext = edu.bnbu.student.mvp.core.network.v1.generated.CreateFeedbackRequestClientContext(
                    platform = edu.bnbu.student.mvp.core.network.v1.generated.CreateFeedbackRequestClientContext.Platform.ANDROID,
                    appVersion = payload.clientVersion,
                    osVersion = android.os.Build.VERSION.RELEASE
                )
            )
            requireV1Gateway().createFeedback(body, payload.intentId)
                .toLegacyResponse()
        }
    }

    suspend fun listFeedbackTickets(): List<FeedbackTicketResponse> {
        return withContext(Dispatchers.IO) {
            requireV1Gateway().listFeedback().map { it.toLegacyResponse() }
        }
    }

    private fun requireV1Gateway(): V1StudentWorkspaceGateway = v1Gateway
        ?: throw IllegalStateException("The authenticated V1 workspace gateway is not configured.")

    private fun requireRecordResubmissionGateway(): ExerciseRecordResubmissionGateway =
        recordResubmissionGateway
            ?: throw IllegalStateException(
                "The authenticated exercise record resubmission gateway is not configured."
            )

    private suspend fun activeEnrollmentId(): String {
        val gateway = requireV1Gateway()
        val snapshot = lastV1Snapshot ?: gateway.loadWorkspace().also {
            lastV1Snapshot = it
        }
        val active = snapshot.enrollments.filter { it.status.value == "ACTIVE" }
        gateway.currentSessionEnrollmentId()?.let { sessionEnrollmentId ->
            if (active.any { it.id == sessionEnrollmentId }) return sessionEnrollmentId
            throw IllegalStateException("The authenticated session enrollment is not active.")
        }
        return active.singleOrNull()?.id
            ?: throw IllegalStateException(
                if (active.isEmpty()) "An active enrollment is required."
                else "The active enrollment is ambiguous. Sign in through the intended course."
            )
    }

    private fun languageTagForV1(): String =
        edu.bnbu.student.mvp.core.local.AppLanguagePreferences.currentLanguage.languageTag

    private fun V1StudentWorkspaceSnapshot.toWorkspace(): StudentWorkspace {
        val contractProfile = requireNotNull(currentUser.studentProfile) {
            "The authenticated student projection is missing."
        }
        val activeEnrollmentSemesterIds = enrollments
            .filter { it.status.value == "ACTIVE" }
            .mapNotNull { enrollment ->
                classSections[enrollment.classSectionId]?.semesterId?.let { semesterId ->
                    enrollment.id to semesterId
                }
            }
            .toMap()
        val currentEnrollmentId = selectCurrentEnrollmentId(
            sessionEnrollmentId = sessionEnrollmentId,
            currentSemesterId = currentSemester?.id,
            activeEnrollmentSemesterIds = activeEnrollmentSemesterIds
        )
        val currentEnrollment = currentEnrollmentId?.let { id ->
            enrollments.singleOrNull { it.id == id }
        }
        val activeSection = currentEnrollment?.let { classSections[it.classSectionId] }
        val primaryScore = currentEnrollmentId?.let { enrollmentId ->
            scores.singleOrNull { it.enrollmentId == enrollmentId }
        }
        val student = StudentProfile(
            // Android's student identity key follows StudentProfile.id; User.id
            // remains the authentication principal and is never substituted.
            id = contractProfile.id,
            name = contractProfile.fullName,
            studentNumber = contractProfile.studentNumber,
            email = currentUser.user.primaryEmailMasked.orEmpty(),
            college = contractProfile.collegeName.orEmpty(),
            className = contractProfile.administrativeClassName
                ?.takeIf(String::isNotBlank)
                ?: activeSection?.displayName
                ?: activeSection?.classCode.orEmpty(),
            status = StudentStatus.fromHasActiveEnrollment(
                enrollments.any { it.status.value == "ACTIVE" }
            ).name,
            gender = contractProfile.gender.value.lowercase(),
            gradeLevel = contractProfile.gradeYear.toString(),
            admissionYear = contractProfile.gradeYear,
            currentAcademicYear = "",
            gradeCalculatedAt = primaryScore?.calculatedAt?.toString().orEmpty(),
            accountStatus = currentUser.user.status.value
        )
        val courses = enrollments.mapNotNull { enrollment ->
            val section = classSections[enrollment.classSectionId] ?: return@mapNotNull null
            val contractCourse = this.courses[section.courseId] ?: return@mapNotNull null
            val contractSemester = currentSemester?.takeIf { it.id == section.semesterId }
            Course(
                id = contractCourse.id,
                name = contractCourse.courseName,
                // Internal semester IDs are routing facts, never user-facing labels.
                semester = contractSemester?.displayName.orEmpty(),
                students = 0,
                completion = 0,
                missing = 0,
                deadline = section.submissionDeadlineAt?.toLocalDate()?.toString().orEmpty(),
                teacher = teachers[section.teacherId]?.fullName ?: section.teacherId,
                teacherId = section.teacherId,
                semesterId = section.semesterId,
                academicYear = contractSemester?.academicYear.orEmpty(),
                term = contractSemester?.termCode?.value.orEmpty(),
                semesterStatus = contractSemester?.status?.value?.lowercase().orEmpty(),
                status = section.status.value.lowercase(),
                enrollmentStatus = enrollment.status.value.lowercase(),
                isCurrent = enrollment.status.value == "ACTIVE"
            )
        }
        val validCurrentRecords = records.filter { record ->
            record.enrollmentId == currentEnrollmentId && record.currentReview?.result?.value == "VALID"
        }
        val courseSeconds = validCurrentRecords
            .filter { it.creditType.value == "COURSE_RELATED" }
            .sumOf { it.creditedDurationSeconds }
        val generalSeconds = validCurrentRecords
            .filter { it.creditType.value == "GENERAL" }
            .sumOf { it.creditedDurationSeconds }
        val totalValidSeconds = courseSeconds + generalSeconds
        val progress = StudentProgress(
            id = student.id,
            name = student.name,
            college = student.college,
            className = student.className,
            course = courseSeconds / 3600.0,
            general = generalSeconds / 3600.0,
            rawCourse = courseSeconds / 3600.0,
            rawGeneral = generalSeconds / 3600.0,
            exam = 0,
            attendance = 0,
            physical = 0,
            status = primaryScore?.qualificationStatus?.value ?: "VALID_RECORDS_SUMMED",
            source = "v1:exercise-records:valid-current-enrollment",
            organizationCredit = null,
            authoritativeTotalHours = totalValidSeconds / 3600.0
        )
        val publishedScore = primaryScore?.takeIf {
            it.status.value == "PUBLISHED" || it.status.value == "LOCKED"
        }?.finalScore
        val gradeBlocks = primaryScore?.let { score ->
            listOf(
                GradeBlock(
                    id = score.id,
                    name = "体育成绩",
                    weight = 1.0,
                    score = publishedScore?.toInt(),
                    scoreDisplay = publishedScore?.toPlainString() ?: "未发布",
                    isVisible = true,
                    displayOrder = 10,
                    blockType = "student_score",
                    description = "服务端权威成绩与合格状态",
                    subItems = null
                )
            )
        }.orEmpty()
        val gradeRow = GradeRow(
            studentId = student.id,
            studentName = student.name,
            visibleBlocks = gradeBlocks,
            totalScore = publishedScore?.toInt(),
            totalDisplay = publishedScore?.toPlainString() ?: "未发布",
            isPassed = primaryScore?.qualificationStatus?.value?.let { it == "QUALIFIED" },
            courseGradeStatus = primaryScore?.status?.value?.lowercase() ?: "not_calculated",
            displayConfigVersion = primaryScore?.calculationRevision?.toInt() ?: 0,
            sourceTrace = "V1:/student-scores"
        )
        return StudentWorkspace(
            student = student,
            courses = courses,
            progress = progress,
            // StudentScore exposes credited duration and qualification, but the
            // student role cannot read ScoreRule targets. Never invent targets.
            hourRule = SportHourRule.Unavailable,
            records = records.map { record ->
                val evidenceContext = recordEvidenceContexts[record.id]
                val evidenceCount = evidenceContext?.mediaIds?.size ?: 0
                CheckInRecord(
                    id = record.id,
                    courseId = record.courseId,
                    taskTitle = record.sportName ?: record.sportType,
                    creditType = if (record.creditType.value == "COURSE_RELATED") {
                        CreditType.CourseRelated
                    } else {
                        CreditType.General
                    },
                    hours = record.creditedDurationSeconds / 3600.0,
                    submittedAt = record.submittedAt?.toString().orEmpty(),
                    proofSummary = if (evidenceCount == 0) {
                        "暂无服务端凭证"
                    } else {
                        "服务端已管理 $evidenceCount 项凭证"
                    },
                    proofPhotoCount = 0,
                    proofVideoCount = 0,
                    proofFiles = emptyList(),
                    teacherPublicFeedback = record.currentReview?.publicComment,
                    teacherInternalNote = null,
                    note = record.description ?: "",
                    sportType = record.sportType,
                    startTime = evidenceContext?.startedAt?.toString(),
                    endTime = evidenceContext?.endedAt?.toString(),
                    actualDurationSeconds = record.actualDurationSeconds,
                    reviewStatus = record.currentReview?.result?.value,
                    businessDate = record.businessDate.toString(),
                    version = record.version
                )
            },
            grades = gradeRow,
            memberships = emptyList(),
            notices = notifications.map { notification ->
                StudentNotice(
                    id = notification.id,
                    title = notification.title,
                    message = notification.body,
                    time = notification.createdAt.toString(),
                    category = notification.notificationType.toNoticeCategory(),
                    isUnread = notification.readAt == null,
                    targetType = notification.targetType,
                    targetId = notification.targetId
                )
            },
            teachers = classSections.values.map { it.teacherId }.distinct().map { teacherId ->
                TeacherInfo(
                    teacherId = teacherId,
                    teacherName = teachers[teacherId]?.fullName ?: "任课教师"
                )
            },
            checkInTimeWindow = toCheckInTimeWindow()
        )
    }

    private fun V1StudentWorkspaceSnapshot.toCheckInTimeWindow(): CheckInTimeWindow {
        val activeSection = enrollments.firstOrNull { it.status.value == "ACTIVE" }
            ?.let { classSections[it.classSectionId] }
            ?: return CheckInTimeWindow.unavailable()
        return activeSection.toCheckInTimeWindow()
    }

    private fun edu.bnbu.student.mvp.core.network.v1.generated.ClassSection.toCheckInTimeWindow(): CheckInTimeWindow {
        return CheckInTimeWindow(
            windowMode = checkInWindowMode.value.lowercase(),
            dateRangeStart = checkInStartDate?.toString(),
            dateRangeEnd = checkInEndDate?.toString(),
            dailyStartTime = dailyStartTime?.toString().orEmpty(),
            dailyEndTime = dailyEndTime?.toString().orEmpty(),
            excludedDates = excludedDates.map { it.toString() },
            semesterDeadline = submissionDeadlineAt?.toLocalDate()?.toString()
        )
    }

    private fun V1StudentWorkspaceSnapshot.toLegacyProfile(): StudentProfileResponse {
        val profile = requireNotNull(currentUser.studentProfile)
        return StudentProfileResponse(
            id = profile.id,
            name = profile.fullName,
            studentNumber = profile.studentNumber,
            email = currentUser.user.primaryEmailMasked.orEmpty(),
            role = currentUser.user.role.value,
            college = profile.collegeName.orEmpty(),
            className = profile.administrativeClassName.orEmpty(),
            gender = profile.gender.value.lowercase(),
            preferredLanguage = languageTagForV1(),
            gradeLevel = profile.gradeYear.toString(),
            admissionYear = profile.gradeYear,
            currentGradeLevel = profile.gradeYear.toString(),
            status = profile.status,
            enrolledCourses = enrollments.count { it.status.value == "ACTIVE" },
            accountStatus = currentUser.user.status.value,
            contacts = edu.bnbu.student.mvp.core.network.ContactStatusResponse(
                email = edu.bnbu.student.mvp.core.network.ContactMethodResponse(
                    masked = currentUser.user.primaryEmailMasked,
                    verified = currentUser.user.emailVerified
                )
            )
        )
    }

    private fun ContractStructuredExemptionApplication.toLegacyResponse(): ExemptionResponse =
        ExemptionResponse(
            id = id,
            studentId = studentId,
            type = applicationSubtype?.value?.lowercase() ?: applicationType.value.lowercase(),
            category = applicationType.value.lowercase(),
            organization = organizationName,
            reason = reason,
            status = status.value.lowercase(),
            proofFiles = mediaIds.map { mediaId ->
                edu.bnbu.student.mvp.core.network.ProofFileResponse(cosKey = mediaId)
            },
            reviewComment = publicComment,
            createdAt = submittedAt?.toString().orEmpty(),
            updatedAt = decidedAt?.toString() ?: submittedAt?.toString()
        )

    private fun ContractExemptionApplication.toLegacySubmitResponse(): ExemptionSubmitResponse =
        ExemptionSubmitResponse(
            id = id,
            status = status.value.lowercase(),
            createdAt = submittedAt?.toString().orEmpty()
        )

    private fun ExemptionApplication.toContractApplicationType():
        CreateExemptionApplicationRequest.ApplicationType = when (type.lowercase()) {
        "school_team", "student_club" ->
            CreateExemptionApplicationRequest.ApplicationType.EXERCISE_CHECK_IN
        "run_800m", "run_1000m" ->
            CreateExemptionApplicationRequest.ApplicationType.PHYSICAL_TEST
        else -> error("Unsupported exemption type: $type")
    }

    private fun ExemptionApplication.toContractApplicationSubtype():
        CreateExemptionApplicationRequest.ApplicationSubtype = when (type.lowercase()) {
        "run_800m" -> CreateExemptionApplicationRequest.ApplicationSubtype.RUN_800M
        "run_1000m" -> CreateExemptionApplicationRequest.ApplicationSubtype.RUN_1000M
        "school_team" -> CreateExemptionApplicationRequest.ApplicationSubtype.SCHOOL_TEAM
        "student_club" -> CreateExemptionApplicationRequest.ApplicationSubtype.STUDENT_CLUB
        else -> error("Unsupported exemption subtype: $type")
    }

    private fun ProofAttachment.mimeTypeForV1(): String = when {
        fileName.endsWith(".png", ignoreCase = true) -> "image/png"
        else -> "image/jpeg"
    }

    private fun String.toContractFeedbackCategory(): CreateFeedbackRequest.Category = when {
        contains("bug", ignoreCase = true) || contains("故障") || contains("异常") ->
            CreateFeedbackRequest.Category.BUG
        contains("access", ignoreCase = true) || contains("无障碍") ->
            CreateFeedbackRequest.Category.ACCESSIBILITY
        contains("privacy", ignoreCase = true) || contains("隐私") ->
            CreateFeedbackRequest.Category.PRIVACY
        contains("suggest", ignoreCase = true) || contains("建议") ->
            CreateFeedbackRequest.Category.SUGGESTION
        else -> CreateFeedbackRequest.Category.OTHER
    }

    private fun ContractFeedback.toLegacyResponse(): FeedbackTicketResponse =
        FeedbackTicketResponse(
            id = id,
            ticketNumber = id,
            category = category.value.lowercase(),
            description = content,
            status = status.value.lowercase(),
            createdAt = createdAt.toString(),
            updatedAt = updatedAt.toString(),
            reply = publicReply
        )

    private fun ContractHelpArticle.toDomainModel(): HelpArticleContent =
        HelpArticleContent(
            id = id,
            categoryCode = category,
            locale = locale.value,
            title = title,
            bodyMarkdown = bodyMarkdown,
            publishedAt = publishedAt.toString(),
            version = version
        )

    private fun String.toNoticeCategory(): NoticeCategory = when {
        contains("DEADLINE", ignoreCase = true) -> NoticeCategory.Deadline
        contains("REVIEW", ignoreCase = true) || contains("EXEMPTION", ignoreCase = true) ->
            NoticeCategory.Review
        contains("ORGANIZATION", ignoreCase = true) -> NoticeCategory.Organization
        else -> NoticeCategory.System
    }

    // ── Context access for content:// URIs ─────────────────────────

    companion object {
        @Volatile
        private var _appContext: android.content.Context? = null

        /** Initialize with the Application context. Call once from Application.onCreate(). */
        fun initContext(context: android.content.Context) {
            _appContext = context.applicationContext
        }

        @JvmStatic
        fun androidAppContext(): android.content.Context? = _appContext
    }
}

private fun Throwable.isUnauthorizedResponse(): Boolean {
    return this is ApiHttpException && statusCode == 401
}

private fun CheckInTimeWindowResponse.toDomain(): CheckInTimeWindow = CheckInTimeWindow(
    windowMode = windowMode,
    dateRangeStart = dateRangeStart,
    dateRangeEnd = dateRangeEnd,
    dailyStartTime = dailyStartTime,
    dailyEndTime = dailyEndTime,
    excludedDates = excludedDates,
    semesterDeadline = semesterDeadline
)
