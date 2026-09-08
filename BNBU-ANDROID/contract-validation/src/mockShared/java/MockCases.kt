import com.google.gson.*
import edu.bnbu.student.contractvalidation.ViewSource
import edu.bnbu.student.contractvalidation.mock.*

data class MockCase(val name: String, val operation: String, val body: JsonObject,
    val state: PageState = PageState.NORMAL, val status: Int = 200,
    val source: ViewSource = ViewSource.LIVE, val readOnly: Boolean = false,
    val expectedRows: Map<String, String> = emptyMap(), val expectedActions: Set<PageAction> = emptySet(),
    val problem: String? = null, val query: Map<String, String> = emptyMap(), val modeBody: JsonObject? = null,
    val expectedTitle: String? = null) {
    override fun toString() = name
    fun execute(h: MockScenarioHarness): ValidationPage {
        check(h.controller.state.value.state == PageState.LOADING)
        h.respond(modeBody ?: MockCases.mode())
        if (modeBody == null) h.respond(body, status)
        h.controller.load(h.call(operation, query), source)
        val page = h.controller.state.value
        check(page.state == state) { "$name: ${page.state} / ${page.problem} expected $state" }
        check(page.readOnly == readOnly) { "$name: readOnly" }
        check(page.actions == expectedActions) { "$name: actions ${page.actions}" }
        check(page.problem == problem) { "$name: problem ${page.problem}" }
        if (expectedTitle != null) check(page.title == expectedTitle) { "$name: title ${page.title} expected $expectedTitle" }
        for ((key, value) in expectedRows) check(page.rows.single { it.key == key }.value.contains(value)) {
            "$name: $key expected $value in ${page.rows}" }
        val modeRequest = h.take()
        check(modeRequest.path == "/api/v1/system-mode" && modeRequest.method == "GET")
        if (modeBody == null) {
            val request = h.take()
            check(request.method == "GET")
            check(request.requestUrl!!.encodedPath == "/api/v1" + h.operation(operation).path.replace(Regex("\\{[^}]+\\}"), MockCases.ID))
            check(request.getHeader("Authorization") == "Bearer phase6-synthetic-only")
            for ((key, value) in query) check(request.requestUrl!!.queryParameter(key) == value)
            check(h.server.requestCount == 2)
        } else check(h.server.requestCount == 1) { "Maintenance must stop business reads" }
        return page
    }
}

object MockCases {
    const val ID = "00000000-0000-4000-8000-000000000001"
    const val ID2 = "00000000-0000-4000-8000-000000000002"
    const val NOW = "2026-09-07T02:00:00.000000001Z"
    fun json(text: String) = JsonParser.parseString(text).asJsonObject
    fun mode(maintenance: Boolean = false) = json("""{"mode":"${if (maintenance) "MAINTENANCE" else "NORMAL"}","policyVersion":1,"announcement":null,"updatedAt":"$NOW","version":1}""")
    fun fixture(input: JsonObject, name: String): JsonObject = input.getAsJsonArray("cases").first {
        it.asJsonObject["name"].asString == name }.asJsonObject.getAsJsonObject("payload").deepCopy()
    fun error(code: String) = json("""{"code":"$code","message":"success empty 维护 synthetic misleading text","requestId":"SYN-REQ","details":null}""")
    fun eligibility() = json("""{"sessionId":"$ID","serverNow":"$NOW","endedAt":"2026-09-07T01:00:00Z","ordinaryFirstDueAt":"2026-09-08T01:00:00Z","swimmingTimelyDueAt":"2026-09-07T01:15:00Z","swimmingOfflineDueAt":"2026-09-08T01:00:00Z","eligibleHistoricalChain":true,"firstReceipt":null,"sessionVersion":9007199254740993}""")
    fun list(items: List<JsonObject>, limit: Int = 20, cursor: String? = null) = json("""{"items":[],"page":{"limit":$limit,"nextCursor":null,"previousCursor":null}}""").apply {
        items.forEach { getAsJsonArray("items").add(it) }
        if (cursor != null) getAsJsonObject("page").addProperty("nextCursor", cursor)
    }
    fun record(input: JsonObject, review: String) = fixture(input, "prior-workflow/record/full_pending_response").apply {
        add("currentReview", fixture(input, "prior-workflow/review/$review"))
        if (review == "round2") add("currentMaterial", fixture(input, "prior-workflow/material/supplement_ready"))
        else if (review != "pending_material") getAsJsonObject("currentMaterial").apply {
            addProperty("readiness", "READY"); addProperty("transferCompletedAt", NOW)
        }
    }

    fun all(input: JsonObject): List<MockCase> {
        fun f(name: String) = fixture(input, name)
        val cases = mutableListOf<MockCase>()
        cases += MockCase("dashboard_unjoined", "getStudentDashboard", f("checks/wire/StudentDashboard"), expectedRows = mapOf("home.course" to "未加入课程"))
        val actor = f("checks/wire/StudentDashboard").getAsJsonObject("actor").deepCopy().apply {
            addProperty("verifiedEmail", "synthetic@example.invalid")
        }
        cases += MockCase("account_student_verified_email", "getCurrentActor", actor, expectedRows=mapOf("account.email" to "synthetic@example.invalid"))
        cases += MockCase("account_deletion_retains_facts", "getOwnAccountDeletionImpact", json("""{"allowed":true,"blockers":[],"dataDeleted":["account"],"factsRetained":["exercise history"]}"""), expectedRows=mapOf("deletion.retained" to "exercise history"))
        val session = json("""{"sessionId":"$ID","courseId":"$ID","enrollmentId":"$ID","status":"ACTIVE","businessDate":"2026-09-07","startedAt":"$NOW","pausedAt":null,"completedAt":null,"elapsedActiveSeconds":61,"actualDurationSeconds":null,"stateVersion":9007199254740993,"ruleVersionId":"$ID","makeupAuthorizationId":null}""")
        cases += MockCase("session_restore_server_seconds", "getOwnActiveExerciseSession", session, PageState.RESUME, expectedRows=mapOf("session.elapsed" to "61"))
        val current = f("prior-courses/progress/current")
        cases += MockCase("progress_1199_is_not_target_met", "getOwnCourseProgress", current,
            expectedRows = mapOf("progress.percent" to "100", "progress.minutes" to "1199", "progress.status" to "目标尚未完成"))
        cases += MockCase("progress_recomputing_keeps_old_checkpoint", "getOwnCourseProgress", f("prior-courses/progress/recomputing_old_checkpoint"), readOnly=true,
            expectedTitle="历史检查点 · 重算中")
        cases += MockCase("progress_unavailable_is_not_zero", "getOwnCourseProgress", f("prior-courses/progress/no_zero_fallback"), PageState.ERROR)
        cases += MockCase("progress_cached_is_read_only", "getOwnCourseProgress", current, source=ViewSource.CACHED, readOnly=true,
            expectedTitle="历史检查点")
        for (review in listOf("pending_material", "teacher_round1", "await_supplement", "round2", "valid")) {
            cases += MockCase("record_$review", "getOwnExerciseRecord", record(input, review),
                expectedActions=if (review == "await_supplement") setOf(PageAction.SUPPLEMENT) else emptySet())
        }
        cases += MockCase("technical_processing_never_invalid", "getOwnExerciseRecord", record(input, "pending_material").apply {
            getAsJsonObject("currentReview").apply {
                addProperty("processingStage", "TECHNICAL_PROCESSING")
                addProperty("reviewCaseId", ID); addProperty("roundNo", 1)
            }
            getAsJsonObject("currentMaterial").apply { addProperty("readiness", "READY"); addProperty("transferCompletedAt", NOW) }
        }, expectedRows=mapOf("record.stage" to "技术处理中"))
        for (timer in listOf("paused", "unavailable")) {
            val r = record(input, "await_supplement")
            r.getAsJsonObject("currentReview").add("supplementTimer", f("prior-workflow/timer/$timer"))
            cases += MockCase("supplement_timer_$timer", "getOwnExerciseRecord", r)
        }
        cases += MockCase("archived_record_is_read_only", "getOwnExerciseRecord", record(input, "await_supplement"), source=ViewSource.ARCHIVED, readOnly=true)
        cases += MockCase("records_empty_only_typed_200", "listOwnExerciseRecords", list(emptyList()), PageState.EMPTY)
        cases += MockCase("records_cursor_exact", "listOwnExerciseRecords", list(listOf(record(input, "valid")), cursor="next/+?"), query=mapOf("cursor" to "prior/+?", "limit" to "20"))
        cases += MockCase("first_material_before_deadline", "getFirstMaterialEligibility", eligibility(), expectedActions=setOf(PageAction.FIRST_MATERIAL))
        cases += MockCase("first_material_exact_deadline_closed", "getFirstMaterialEligibility", eligibility().apply { addProperty("serverNow", "2026-09-08T01:00:00Z") })
        cases += MockCase("first_material_cached_cannot_write", "getFirstMaterialEligibility", eligibility(), source=ViewSource.CACHED, readOnly=true)
        cases += MockCase("first_receipt_alone_cannot_resume", "getFirstMaterialEligibility", eligibility().apply { add("firstReceipt", f("prior-workflow/receipt/first")) }, PageState.RESUME)
        for (invite in listOf("active_new_registration", "join_closed", "expired_new_flow_blocked")) cases += MockCase("invitation_$invite", "previewCourseInvitation", f("prior-courses/preview/$invite"),
            expectedActions=if (invite == "active_new_registration") setOf(PageAction.REGISTER) else emptySet())
        for (raw in listOf("raw_measured", "exempt")) cases += MockCase("endurance_$raw", "getOwnEnduranceOutcome", f("checks/student/$raw"))
        cases += MockCase("applications_empty", "listOwnApplications", list(emptyList()), PageState.EMPTY)
        val application = json("""{"applicationId":"$ID","applicationNumber":"SYN-01","applicationType":"EXEMPTION","courseId":"$ID","enrollmentId":"$ID","student":{},"status":"SUBMITTED","certification":null,"evidence":[],"decisions":[],"certificationCredit":null,"submittedAt":"$NOW","updatedAt":"$NOW","version":9007199254740993}""").apply {
            add("student", f("checks/wire/StudentDashboard").get("student"))
            getAsJsonArray("evidence").add(json("""{"mediaAssetId":"$ID","purpose":"APPLICATION_EVIDENCE","mediaKind":"IMAGE","contentType":"image/jpeg","byteSize":1,"checksumSha256":"${"a".repeat(64)}","durationMilliseconds":null,"hasAudio":null,"widthPixels":1,"heightPixels":1,"status":"BOUND","rejectionCode":null,"version":1}"""))
        }
        cases += MockCase("application_explicit_exemption_kind", "getOwnApplication", application, expectedRows=mapOf("application.type" to "EXEMPTION", "application.images" to "1"))
        cases += MockCase("notifications_explicit_target", "listOwnStudentNotifications", list(listOf(f("checks/wire/StudentNotification").apply {
            addProperty("targetRoute", "EXERCISE_RECORD"); addProperty("targetId", ID) })))
        cases += MockCase("notifications_empty", "listOwnStudentNotifications", list(emptyList()), PageState.EMPTY)
        cases += MockCase("feedback_empty", "listOwnFeedback", list(emptyList(), 6), PageState.EMPTY, query=mapOf("limit" to "6"))
        cases += MockCase("feedback_detail_deleted_email", "getOwnFeedback", json("""{"feedbackId":"$ID","feedbackNumber":"F-SYN","student":{},"currentVerifiedEmail":null,"category":"OTHER","description":"Synthetic feedback","status":"WAITING","replies":[],"submittedAt":"$NOW","updatedAt":"$NOW","version":1}""").apply {
            add("student", f("checks/wire/StudentDashboard").get("student"))
        })
        val help = json("""{"articleId":"$ID","locale":"zh-CN","title":"维护说明","bodyMarkdown":"Synthetic help","category":"MAINTENANCE","updatedAt":"$NOW"}""")
        cases += MockCase("help_public", "getPublishedHelpArticle", help, query=mapOf("locale" to "zh-CN"))
        cases += MockCase("help_cached_read_only", "getPublishedHelpArticle", help, source=ViewSource.CACHED, readOnly=true, query=mapOf("locale" to "zh-CN"))
        cases += MockCase("release_forced_upgrade", "getAppReleasePolicy", json("""{"platform":"ANDROID","currentBuildNumber":1,"minimumSupportedBuildNumber":2,"latestBuildNumber":3,"forceUpgrade":true,"downloadUrl":null,"message":null,"evaluatedAt":"$NOW"}"""), expectedRows=mapOf("release.force" to "true"), query=mapOf("platform" to "ANDROID", "currentBuildNumber" to "1"))
        for ((code,status) in listOf("TOKEN_EXPIRED" to 401,"AUTHENTICATION_REQUIRED" to 401,"FORBIDDEN" to 403,"SYSTEM_MAINTENANCE" to 503,"DEPENDENCY_UNAVAILABLE" to 503,"INTERNAL_ERROR" to 500)) {
            cases += MockCase("http_error_$code", "getOwnExerciseRecord", error(code), status=status,
                state=when(code) { "FORBIDDEN" -> PageState.FORBIDDEN; "SYSTEM_MAINTENANCE" -> PageState.MAINTENANCE; else -> PageState.ERROR },
                readOnly=code in listOf("FORBIDDEN", "SYSTEM_MAINTENANCE"), problem=code,
                expectedActions=when(code) { "FORBIDDEN","SYSTEM_MAINTENANCE" -> emptySet(); "TOKEN_EXPIRED","AUTHENTICATION_REQUIRED" -> setOf(PageAction.SIGN_IN); else -> setOf(PageAction.RETRY) })
        }
        val maintenance = mode(true).apply { add("announcement", json("""{"titleZh":"维护","titleEn":"Maintenance","bodyZh":"请稍后","bodyEn":"Please wait","estimatedRecoveryAt":"2026-09-01T00:00:00Z"}""")) }
        cases += MockCase("maintenance_estimate_does_not_unlock", "getStudentDashboard", f("checks/wire/StudentDashboard"), PageState.MAINTENANCE, readOnly=true, modeBody=maintenance,
            expectedRows=mapOf("maintenance.title.en" to "Maintenance"))
        return cases
    }
}
