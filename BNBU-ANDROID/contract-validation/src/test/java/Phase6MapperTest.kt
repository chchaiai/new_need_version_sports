import bnbu.cr005.review.*
import com.google.gson.*
import edu.bnbu.student.contractvalidation.*
import edu.bnbu.student.contractvalidation.StudentApplicationPage
import java.math.BigDecimal
import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.*
import org.junit.AfterClass
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class Phase6MapperTest(private val name: String, private val check: () -> Unit) {
    @Test fun wireThroughMapperToPresentation() {
        try {
            check()
            results.add(mapOf("name" to name, "status" to "PASS"))
        } catch (failure: Throwable) {
            results.add(mapOf("name" to name, "status" to "FAIL", "failureType" to failure.javaClass.simpleName))
            throw failure
        }
    }

    companion object {
        private val results = mutableListOf<Map<String, String>>()
        private val live = StudentViewContext(ModeSignal.NORMAL, ViewSource.LIVE)
        private val archived = StudentViewContext(ModeSignal.NORMAL, ViewSource.ARCHIVED)
        private val blocked = listOf(archived, StudentViewContext(ModeSignal.NORMAL, ViewSource.CACHED),
            StudentViewContext(ModeSignal.MAINTENANCE, ViewSource.LIVE), StudentViewContext(ModeSignal.UNKNOWN, ViewSource.LIVE))
        private fun progress() = MapperWire.fixture("prior-courses/progress/current")
        private fun review(name: String) = MapperWire.fixture("prior-workflow/review/$name")
        private fun record(review: JsonObject): JsonObject = MapperWire.fixture("prior-workflow/record/full_pending_response").apply {
            add("currentReview", review)
            if (review.get("materialVersionId").asString == MapperWire.ID2) {
                add("currentMaterial", MapperWire.fixture("prior-workflow/material/supplement_ready"))
            }
            if (review.get("processingStage").asString != "MATERIAL_PROCESSING") {
                getAsJsonObject("currentMaterial").addProperty("readiness", "READY")
                getAsJsonObject("currentMaterial").addProperty("transferCompletedAt", MapperWire.NOW)
            }
        }

        @JvmStatic @Parameterized.Parameters(name = "{0}")
        fun cases(): Collection<Array<Any>> = buildList {
            fun case(name: String, body: () -> Unit) { add(arrayOf(name, body)) }
            case("progress/1199_percent100_is_not_target_met") {
                val p = MapperWire.read<StudentCourseProgress>(progress()).toStudentProgress()
                assertFalse(p.numbers!!.targetMet)
                assertEquals(1199L, p.numbers.completed)
                assertEquals("100%", p.toPresentation().percent)
                assertEquals("目标尚未完成", p.toPresentation().status)
                assertEquals("Target not yet met", p.toPresentation(true).status)
                assertEquals(1169L, p.numbers.certificationMinutes)
                assertEquals(30L, p.numbers.recordMinutes)
                assertEquals(BigDecimal("5400"), p.numbers.actualSeconds)
            }
            case("progress/1200_is_target_met") {
                val wire = progress()
                wire.getAsJsonObject("checkpoint").getAsJsonObject("totals").apply {
                    addProperty("targetMet", true); addProperty("totalCompletedMinutes", 1200)
                    addProperty("completionRatio", 1); addProperty("countedCertificationMinutes", 1170)
                    getAsJsonArray("categories")[1].asJsonObject.apply {
                        addProperty("activeCertificationMinutes", 600); addProperty("countedCertificationMinutes", 600)
                        addProperty("cappedCompletedMinutes", 600); addProperty("remainingMinutes", 0)
                    }
                }
                assertEquals("目标已完成", MapperWire.read<StudentCourseProgress>(wire).toStudentProgress().toPresentation().status)
            }
            case("progress/recomputing_previous_checkpoint_is_history") {
                val p = MapperWire.read<StudentCourseProgress>("prior-courses/progress/recomputing_old_checkpoint").toStudentProgress()
                assertEquals(ProgressFreshness.HISTORICAL, p.freshness)
                assertNotNull(p.numbers)
                assertEquals("仅为历史结果", p.toPresentation().status)
                assertEquals("历史检查点 · 重算中", p.toPresentation().heading)
                assertEquals("Previous checkpoint · Recomputing", p.toPresentation(true).heading)
                for (source in listOf(ViewSource.CACHED, ViewSource.ARCHIVED)) {
                    for (fixture in listOf("prior-courses/progress/current", "prior-courses/progress/recomputing_old_checkpoint")) {
                        val previous = MapperWire.read<StudentCourseProgress>(fixture).toStudentProgress(source)
                        assertEquals(ProgressFreshness.HISTORICAL, previous.freshness)
                        assertFalse(previous.isRecomputing)
                        assertEquals("历史检查点", previous.toPresentation().heading)
                        assertEquals("Previous checkpoint", previous.toPresentation(true).heading)
                        assertEquals("仅为历史结果", previous.toPresentation().status)
                    }
                }
            }
            case("progress/unavailable_has_no_zero_or_cached_fallback") {
                val p = MapperWire.read<StudentCourseProgress>("prior-courses/progress/no_zero_fallback").toStudentProgress()
                assertNull(p.numbers); assertNull(p.toPresentation().minutes); assertNull(p.toPresentation().percent)
            }
            case("progress/recomputing_without_checkpoint") {
                val x = MapperWire.fixture("prior-courses/progress/no_zero_fallback").apply {
                    addProperty("state", "RECOMPUTING"); addProperty("unavailableReason", "SOURCE_CHANGED")
                }
                val dto = MapperWire.read<StudentCourseProgress>(x)
                assertEquals(ProgressFreshness.RECOMPUTING, dto.toStudentProgress().freshness)
                assertTrue(dto.toStudentProgress().isRecomputing)
                assertEquals("重算中", dto.toStudentProgress().toPresentation().heading)
                for (source in listOf(ViewSource.CACHED, ViewSource.ARCHIVED)) {
                    val previous = dto.toStudentProgress(source)
                    assertEquals(ProgressFreshness.UNAVAILABLE, previous.freshness)
                    assertFalse(previous.isRecomputing)
                    assertNull(previous.numbers)
                    assertEquals("进度暂不可用", previous.toPresentation().heading)
                    assertEquals("Progress unavailable", previous.toPresentation(true).heading)
                }
            }
            for (mutation in listOf("identity", "missing_current", "unavailable_with_numbers", "category_sum")) {
                case("progress/reject_$mutation") {
                    val x = progress()
                    when (mutation) {
                        "identity" -> x.getAsJsonObject("checkpoint").addProperty("enrollmentId", MapperWire.ID2)
                        "missing_current" -> x.add("checkpoint", JsonNull.INSTANCE)
                        "unavailable_with_numbers" -> x.addProperty("state", "UNAVAILABLE")
                        else -> x.getAsJsonObject("checkpoint").getAsJsonObject("totals").getAsJsonArray("categories")[1]
                            .asJsonObject.addProperty("remainingMinutes", 2)
                    }
                    if (mutation in listOf("missing_current", "unavailable_with_numbers")) {
                        // These two contradictions are already forbidden by Contract allOf.
                        assertThrows(JsonParseException::class.java) { MapperWire.read<StudentCourseProgress>(x) }
                        val legal = MapperWire.read<StudentCourseProgress>(progress())
                        val invalidConstructed = if (mutation == "missing_current") legal.copy(checkpoint = null)
                            else legal.copy(state = StudentCourseProgress.State.UNAVAILABLE)
                        assertThrows(IllegalArgumentException::class.java) { invalidConstructed.toStudentProgress() }
                    } else {
                        val dto = MapperWire.read<StudentCourseProgress>(x)
                        assertThrows(IllegalArgumentException::class.java) { dto.toStudentProgress() }
                    }
                }
            }
            val stages = mapOf("MATERIAL_PROCESSING" to "pending_material", "SYSTEM_CHECK_PENDING" to "valid",
                "AI_REVIEW_PENDING" to "valid", "TECHNICAL_PROCESSING" to "valid", "TEACHER_REVIEW_REQUIRED" to "teacher_round1",
                "SUPPLEMENT_REQUIRED" to "await_supplement", "SUPPLEMENT_REVIEW_REQUIRED" to "round2")
            for ((stage, base) in stages) case("record/stage_$stage") {
                val r = review(base).apply {
                    addProperty("processingStage", stage)
                    add("result", JsonNull.INSTANCE)
                    if (stage in listOf("SYSTEM_CHECK_PENDING", "AI_REVIEW_PENDING", "TECHNICAL_PROCESSING")) add("teacherSla", JsonNull.INSTANCE)
                }
                val page = MapperWire.read<ExerciseRecord>(record(r)).toStudentRecord()
                assertEquals(stage, page.stage.name)
                assertNull(page.countedMinutes); assertNull(page.eligibleMinutes)
                assertTrue(page.materialReadOnly)
                assertEquals("2026-09-07", page.date)
            }
            for (counted in listOf(0L, 30L, 60L)) case("record/valid_counted_$counted") {
                val wire = record(review("valid")).apply { addProperty("actualDurationSeconds", 5400) }
                val detail = MapperWire.fixture("prior-courses/record/partial_category_cap").apply { addProperty("countedMinutes", counted) }
                val page = MapperWire.read<ExerciseRecord>(wire).toStudentRecord(MapperWire.read(detail), MapperWire.read(progress()))
                assertEquals(if (counted == 0L) StudentRecordStage.VALID_UNCOUNTED else StudentRecordStage.VALID_CREDITED, page.stage)
                assertEquals(90L, page.actualMinutes); assertEquals(60L, page.eligibleMinutes); assertEquals(counted, page.countedMinutes)
            }
            for (scenario in listOf("absent", "recomputing", "wrong_checkpoint")) case("record/valid_statistics_$scenario") {
                val wire = record(review("valid")).apply { addProperty("actualDurationSeconds", 5400) }
                val cp = progress().apply { if (scenario == "recomputing") {
                    addProperty("state", "RECOMPUTING"); addProperty("unavailableReason", "SOURCE_CHANGED")
                } }
                val detail = MapperWire.fixture("prior-courses/record/partial_category_cap").apply {
                    if (scenario == "wrong_checkpoint") addProperty("checkpointId", MapperWire.ID2)
                }
                val page = MapperWire.read<ExerciseRecord>(wire).toStudentRecord(
                    if (scenario == "absent") null else MapperWire.read(detail), MapperWire.read(cp))
                assertEquals(StudentRecordStage.VALID_STATS_UNAVAILABLE, page.stage)
                assertNull(page.countedMinutes)
            }
            for (field in listOf("recordId", "sessionId", "ruleVersionId", "businessDate", "actualDurationSeconds", "reviewResult")) {
                case("record/reject_cross_source_$field") {
                    val wire = record(review("valid")).apply { addProperty("actualDurationSeconds", 5400) }
                    val detail = MapperWire.fixture("prior-courses/record/partial_category_cap").apply {
                        when (field) {
                            "businessDate" -> addProperty(field, "2026-09-08")
                            "actualDurationSeconds" -> addProperty(field, 5401)
                            "reviewResult" -> { addProperty(field, "INVALID"); addProperty("countedMinutes", 0) }
                            else -> addProperty(field, MapperWire.ID2)
                        }
                    }
                    val dto = MapperWire.read<ExerciseRecord>(wire)
                    val d = MapperWire.read<RecordCreditDetail>(detail)
                    val cp = MapperWire.read<StudentCourseProgress>(progress())
                    assertThrows(IllegalArgumentException::class.java) { dto.toStudentRecord(d, cp) }
                }
            }
            case("record/long_seconds_floor_without_millisecond_overflow") {
                val x = record(review("pending_material")).apply { addProperty("actualDurationSeconds", Long.MAX_VALUE) }
                assertEquals(Long.MAX_VALUE / 60L, MapperWire.read<ExerciseRecord>(x).toStudentRecord().actualMinutes)
            }
            case("record/invalid_is_not_valid_uncounted") {
                val r = review("valid").apply {
                    addProperty("processingStage", "INVALID"); addProperty("result", "INVALID")
                    add("publicReason", review("await_supplement").get("publicReason"))
                }
                assertEquals(StudentRecordStage.INVALID, MapperWire.read<ExerciseRecord>(record(r)).toStudentRecord().stage)
            }
            for (state in listOf("ACTIVE", "PAUSED", "ACCEPTED", "EXPIRED", "UNAVAILABLE")) case("supplement/state_$state") {
                val r = review("await_supplement")
                val timer = when (state) {
                    "PAUSED" -> MapperWire.fixture("prior-workflow/timer/paused")
                    "ACCEPTED" -> MapperWire.fixture("prior-workflow/timer/accepted")
                    "UNAVAILABLE" -> MapperWire.fixture("prior-workflow/timer/unavailable")
                    else -> MapperWire.fixture("prior-workflow/timer/active").apply { addProperty("state", state) }
                }
                r.add("supplementTimer", timer)
                val page = MapperWire.read<RecordReviewSummary>(r).toSupplementPage(live)
                assertEquals(state == "ACTIVE", page.canAttemptSubmit)
                assertTrue(page.returnUsed)
                assertEquals(state, page.timer!!.state.name)
                assertEquals(timer.get("remainingSeconds"), page.timer.remainingSeconds?.let(::JsonPrimitive) ?: JsonNull.INSTANCE)
            }
            for (ctx in blocked) case("supplement/blocked_${ctx.mode}_${ctx.source}") {
                assertFalse(MapperWire.read<RecordReviewSummary>(review("await_supplement")).toSupplementPage(ctx).canAttemptSubmit)
            }
            case("supplement/accepted_round2_no_student_timer_restart") {
                val dto = MapperWire.read<RecordReviewSummary>(review("round2"))
                assertFalse(dto.toSupplementPage(live).canAttemptSubmit)
                assertEquals(SupplementTimerView.State.ACCEPTED, dto.toSupplementPage(live).timer!!.state)
            }
            case("supplement/confirmed_fault_uses_current_remainder_not_new_window") {
                val r = review("await_supplement")
                r.getAsJsonObject("supplementTimer").apply {
                    addProperty("remainingSeconds", BigDecimal("7.125")); addProperty("sourceRevision", 12)
                    addProperty("effectiveDueAt", "2026-09-09T02:00:07.125Z")
                }
                val page = MapperWire.read<RecordReviewSummary>(r).toSupplementPage(live)
                assertEquals(BigDecimal("7.125"), page.timer!!.remainingSeconds)
                assertEquals(12L, page.timer.sourceRevision); assertTrue(page.returnUsed)
                assertNotEquals(page.timer.originalDueAt, page.timer.effectiveDueAt)
            }
            for (base in listOf("available", "paused", "missing_calendar")) case("sla/${base}_server_projection_only") {
                val dto = MapperWire.read<TeacherReviewSla>("prior-workflow/sla/$base")
                val page = dto.toStudentSla()
                assertEquals(dto.remainingSeconds, page.remainingSchoolSeconds)
                assertEquals(dto.effectiveDueAt, page.dueAt?.wire)
                assertEquals(dto.calendar?.revision, page.calendarVersion)
                if (base == "missing_calendar") { assertNull(page.dueAt); assertNull(page.remainingSchoolSeconds) }
            }
            case("sla/overdue_does_not_invalidate_student_record") {
                val r = review("teacher_round1")
                r.getAsJsonObject("teacherSla").apply { addProperty("overdue", true); addProperty("remainingSeconds", 0) }
                val page = MapperWire.read<ExerciseRecord>(record(r)).toStudentRecord()
                assertEquals(StudentRecordStage.TEACHER_REVIEW_REQUIRED, page.stage)
            }
            for (route in FirstMaterialAcceptance.SubmissionRoute.entries) {
                for (offset in listOf("before", "equal", "after")) case("first_material/${route.name}_$offset") {
                    val x = MapperWire.firstEligibility()
                    val field = when (route) {
                        FirstMaterialAcceptance.SubmissionRoute.ORDINARY -> "ordinaryFirstDueAt"
                        FirstMaterialAcceptance.SubmissionRoute.SWIMMING_TIMELY -> "swimmingTimelyDueAt"
                        FirstMaterialAcceptance.SubmissionRoute.SWIMMING_OFFLINE -> "swimmingOfflineDueAt"
                    }
                    x.addProperty(field, "2026-09-08T01:00:00.1234567891Z")
                    x.addProperty("serverNow", "2026-09-08T01:00:00." + when (offset) {
                        "before" -> "1234567890Z"; "equal" -> "1234567891Z"; else -> "1234567892Z"
                    })
                    val dto = MapperWire.read<FirstMaterialEligibility>(x)
                    assertEquals(9007199254740993L, dto.sessionVersion)
                    assertEquals(offset == "before", dto.toFirstMaterialPage(route, live).canAttemptFirst)
                }
            }
            case("first_material/closed_removed_owned_chain_still_has_entry") {
                val p = MapperWire.read<FirstMaterialEligibility>(MapperWire.firstEligibility())
                    .toFirstMaterialPage(FirstMaterialAcceptance.SubmissionRoute.ORDINARY, live)
                assertTrue(p.historicalChainEligible); assertTrue(p.canAttemptFirst)
            }
            case("first_material/ineligible_chain_disabled") {
                val x = MapperWire.firstEligibility().apply { addProperty("eligibleHistoricalChain", false) }
                assertFalse(MapperWire.read<FirstMaterialEligibility>(x).toFirstMaterialPage(FirstMaterialAcceptance.SubmissionRoute.ORDINARY, live).canAttemptFirst)
            }
            for (ctx in blocked) case("first_material/blocked_${ctx.mode}_${ctx.source}") {
                assertFalse(MapperWire.read<FirstMaterialEligibility>(MapperWire.firstEligibility())
                    .toFirstMaterialPage(FirstMaterialAcceptance.SubmissionRoute.ORDINARY, ctx).canAttemptFirst)
            }
            for (scenario in listOf("fresh", "no_refresh", "equal_deadline", "wrong_batch")) case("first_material/locked_$scenario") {
                val receipt = MapperWire.fixture("prior-workflow/receipt/first")
                val x = MapperWire.firstEligibility().apply { add("firstReceipt", receipt) }
                val material = receipt.getAsJsonObject("material").deepCopy()
                if (scenario == "equal_deadline") x.add("serverNow", material.get("transferDueAt"))
                if (scenario == "wrong_batch") material.addProperty("batchId", "00000000-0000-4000-8000-000000000003")
                val dto = MapperWire.read<FirstMaterialEligibility>(x)
                val m = MapperWire.read<MaterialVersion>(material)
                val route = FirstMaterialAcceptance.SubmissionRoute.valueOf(receipt.get("submissionRoute").asString)
                if (scenario == "wrong_batch") assertThrows(IllegalArgumentException::class.java) { dto.toFirstMaterialPage(route, live, m) }
                else {
                    val p = dto.toFirstMaterialPage(route, live, if (scenario == "no_refresh") null else m)
                    assertFalse(p.canAttemptFirst)
                    assertEquals(scenario == "fresh", p.canAttemptLockedTransfer)
                    assertEquals(scenario == "no_refresh", p.needsMaterialRefresh)
                    assertEquals(m.batchId, p.lockedBatchId)
                }
            }
            for (state in ExerciseSession.Status.entries) case("session/${state.name}_keeps_server_duration_version") {
                val x = MapperWire.session().apply {
                    addProperty("status", state.value); addProperty("elapsedActiveSeconds", 9007199254740993L)
                    if (state == ExerciseSession.Status.COMPLETED) { addProperty("completedAt", MapperWire.NOW); addProperty("actualDurationSeconds", 119) }
                    if (state == ExerciseSession.Status.PAUSED) addProperty("pausedAt", MapperWire.NOW)
                }
                val p = MapperWire.read<ExerciseSession>(x).toStudentSession()
                assertEquals(state, p.state); assertEquals(9007199254740993L, p.elapsedSeconds)
                assertEquals(9007199254740993L, p.version)
                assertEquals(if (state == ExerciseSession.Status.COMPLETED) 119L else null, p.actualSeconds)
            }
            for (length in listOf(0, 1, 3, 9, 10, 40)) case("time/fraction_digits_$length") {
                val fraction = if (length == 0) "" else "." + "1234567890".repeat(4).take(length)
                val wire = "2026-09-07T23:59:59${fraction}Z"
                val x = record(review("pending_material")).apply { addProperty("submittedAt", wire) }
                val p = MapperWire.read<ExerciseRecord>(x).toStudentRecord()
                assertEquals(wire, p.submittedAt.wire)
                assertEquals("2026-09-08 07:59:59${fraction} Asia/Shanghai", p.submittedAt.shanghaiLabel())
                assertEquals("2026-09-07", p.date)
            }
            case("time/leap_second_retained_for_display") {
                assertEquals("2017-01-01 07:59:60 Asia/Shanghai", StudentInstant.fromWire("2016-12-31T23:59:60Z").shanghaiLabel())
            }
            case("time/equivalent_fraction_precision") {
                assertEquals(0, StudentInstant.fromWire("2026-09-08T00:00:00.1Z").compareTo(StudentInstant.fromWire("2026-09-08T00:00:00.100Z")))
            }
            for (wire in listOf("2026-02-30", "2026-09-08T00:00:00Z")) case("date/reject_$wire") {
                assertThrows(RuntimeException::class.java) { studentDate(wire) }
            }
            for (state in CourseInvitationPreview.Status.entries) case("invitation/status_${state.name}") {
                val x = MapperWire.fixture("prior-courses/preview/active_new_registration").apply {
                    addProperty("status", state.value); addProperty("newRegistrationAllowed", state == CourseInvitationPreview.Status.ACTIVE)
                    if (state != CourseInvitationPreview.Status.ACTIVE) addProperty("unavailableReason", state.value)
                }
                val p = MapperWire.read<CourseInvitationPreview>(x).toInvitationPage(live)
                assertEquals(state, p.status); assertEquals(state == CourseInvitationPreview.Status.ACTIVE, p.canAttemptNewRegistration)
            }
            case("invitation/active_but_join_closed") {
                assertFalse(MapperWire.read<CourseInvitationPreview>("prior-courses/preview/join_closed").toInvitationPage(live).canAttemptNewRegistration)
            }
            case("invitation/fixed_grace_is_not_restarted_by_refresh") {
                val course = MapperWire.fixture("prior-courses/preview/active_new_registration").getAsJsonObject("course")
                val x = MapperWire.json("""{"flowId":"${MapperWire.ID}","registeredAt":"2026-09-07T01:59:59Z",
                    "originalExpiresAt":"2026-09-07T02:00:00Z","graceEndsAt":"2026-09-07T02:10:00Z",
                    "status":"REGISTERED","course":{},"version":3}""").apply { add("course", course) }
                val dto = MapperWire.read<InvitationRegistrationFlow>(x)
                assertEquals(dto.toInvitationFlowPage(live), dto.toInvitationFlowPage(live))
                assertEquals("2026-09-07T02:10:00Z", dto.toInvitationFlowPage(live).fixedGraceEndsAt.wire)
                x.addProperty("status", "TERMINATED")
                assertFalse(MapperWire.read<InvitationRegistrationFlow>(x).toInvitationFlowPage(live).canAttemptContinue)
            }
            for (base in listOf("checks/wire/StudentEnduranceOutcome", "checks/student/raw_measured", "checks/student/exempt")) case("endurance/$base") {
                val dto = MapperWire.read<StudentEnduranceOutcome>(base)
                val p = dto.toStudentEndurance()
                assertEquals(dto.outcome, p.state); assertEquals(dto.durationSeconds, p.durationSeconds)
                assertEquals(dto.testedOn, p.testedOn); assertEquals(dto.distanceMeters, p.distanceMeters)
            }
            case("endurance/legacy_missing_date_no_backfill") {
                val x = MapperWire.fixture("checks/student/raw_measured").apply { add("testedOn", JsonNull.INSTANCE) }
                assertNull(MapperWire.read<StudentEnduranceOutcome>(x).toStudentEndurance().testedOn)
            }
            for (status in ApplicationStatus.entries) case("application/status_${status.name}") {
                val x = MapperWire.application().apply { addProperty("status", status.value) }
                val p = MapperWire.read<StudentApplication>(x).toStudentApplicationPage(live)
                assertEquals(status, p.status); assertEquals(2, p.remainingImageSlots)
                assertEquals(status == ApplicationStatus.SUPPLEMENT_REQUIRED, p.canAttemptSupplement)
                assertEquals(9007199254740993L, p.version)
            }
            case("application/cumulative_three_images_no_fourth") {
                val x = MapperWire.application().apply { addProperty("status", "SUPPLEMENT_REQUIRED") }
                val evidence = x.getAsJsonArray("evidence")
                for (id in listOf(MapperWire.ID2, "00000000-0000-4000-8000-000000000003")) {
                    evidence.add(evidence[0].asJsonObject.deepCopy().apply { addProperty("mediaAssetId", id) })
                }
                val p = MapperWire.read<StudentApplication>(x).toStudentApplicationPage(live)
                assertEquals(0, p.remainingImageSlots); assertFalse(p.canAttemptSupplement)
            }
            for (state in CertificationCredit.State.entries) case("certification/${state.name}_minutes_not_exercise_time") {
                val x = MapperWire.application().apply {
                    add("certificationCredit", MapperWire.json("""{"state":"${state.value}","courseRelatedMinutes":100,"otherMinutes":200,
                        "revisionNumber":2,"studentVisibleReason":"Synthetic reason","updatedAt":"${MapperWire.NOW}","version":2}"""))
                }
                val p = MapperWire.read<StudentApplication>(x).toStudentApplicationPage(live)
                assertEquals(if (state == CertificationCredit.State.ACTIVE) 100 else 0, p.activeCourseMinutes)
                assertEquals(if (state == CertificationCredit.State.ACTIVE) 200 else 0, p.activeOtherMinutes)
                assertEquals(state, p.creditState)
                assertEquals("Synthetic reason", p.creditReason)
            }
            for (kind in CertificationKind.entries) case("certification/${kind.name}_not_inferred_from_name") {
                val x = MapperWire.application().apply {
                    addProperty("applicationType", "CERTIFICATION")
                    add("certification", MapperWire.json("""{"certificationKind":"${kind.value}","organizationOrTeamName":"Same ambiguous name",
                        "validFrom":"2026-09-01","validTo":"2026-09-30"}"""))
                }
                val p = MapperWire.read<StudentApplication>(x).toStudentApplicationPage(live)
                assertEquals(kind, p.certification!!.kind)
                assertEquals("2026-09-01", p.certification.validFrom)
            }
            case("home/no_course_no_fake_zero_progress") {
                val p = MapperWire.read<StudentDashboard>("checks/wire/StudentDashboard").toStudentHome(live)
                assertNull(p.course); assertNull(p.progress); assertNull(p.endurance)
            }
            for (source in listOf(ViewSource.CACHED, ViewSource.ARCHIVED)) case("home/${source.name}_checkpoint_is_not_current") {
                val x = MapperWire.fixture("checks/wire/StudentDashboard").apply {
                    add("course", MapperWire.course()); add("progress", progress())
                    add("currentSemester", MapperWire.course().get("semester"))
                }
                val page = MapperWire.read<StudentDashboard>(x).toStudentHome(StudentViewContext(ModeSignal.NORMAL, source))
                assertEquals(ProgressFreshness.HISTORICAL, page.progress!!.freshness)
                assertEquals("仅为历史结果", page.progress.toPresentation().status)
            }
            case("home/reject_teacher_actor") {
                val x = MapperWire.fixture("checks/wire/StudentDashboard")
                x.getAsJsonObject("actor").addProperty("role", "TEACHER")
                val dto = MapperWire.read<StudentDashboard>(x)
                assertThrows(IllegalArgumentException::class.java) { dto.toStudentHome(live) }
            }
            for (status in SemesterStatus.entries) case("course/semester_${status.name}_history_read_only") {
                val x = MapperWire.course()
                x.getAsJsonObject("semester").addProperty("status", status.value)
                val dto = MapperWire.read<StudentCourse>(x)
                val p = dto.toStudentCoursePage(live)
                assertEquals(status == SemesterStatus.ARCHIVED, p.readOnly)
                assertTrue(dto.toStudentCoursePage(archived).readOnly)
                assertEquals(600, p.courseTarget); assertEquals(600, p.otherTarget)
                assertEquals("2026-10-07T02:00:00.000000001Z", p.closeoutEndsAt.wire)
            }
            case("course/mismatched_rule_not_silently_repaired") {
                val x = MapperWire.course()
                x.getAsJsonObject("publishedRule").addProperty("courseId", MapperWire.ID2)
                val dto = MapperWire.read<StudentCourse>(x)
                assertThrows(IllegalArgumentException::class.java) { dto.toStudentCoursePage(live) }
            }
            for (code in PublicReviewReason.Code.entries) case("reason/${code.name}_bilingual_original_comment") {
                val x = MapperWire.publicReason(code.value)
                val p = MapperWire.read<PublicReviewReason>(x).toStudentReason("原文 · original")!!
                assertEquals(code.value, p.code); assertEquals(x.getAsJsonObject("label").get("zh").asString, p.zh)
                assertEquals(x.getAsJsonObject("label").get("en").asString, p.en)
                assertEquals("原文 · original", p.originalComment)
                assertEquals(code == PublicReviewReason.Code.SUPPLEMENT_DEADLINE_MISSED, p.systemDeadline)
            }
            case("application/history_sorted_without_overwrite_and_archive_blocks_submit") {
                val x = MapperWire.application().apply { addProperty("status", "SUPPLEMENT_REQUIRED") }
                val teacher = MapperWire.course().getAsJsonObject("responsibleTeacher")
                for (sequence in listOf(2, 1)) x.getAsJsonArray("decisions").add(MapperWire.json("""{
                    "decisionId":"${if (sequence == 1) MapperWire.ID else MapperWire.ID2}","sequenceNumber":$sequence,
                    "decision":"REQUEST_SUPPLEMENT","fromStatus":"SUBMITTED","toStatus":"SUPPLEMENT_REQUIRED",
                    "studentVisibleMessage":"Original $sequence","decidedBy":{},"occurredAt":"${MapperWire.NOW}"}""").apply { add("decidedBy", teacher) })
                val dto = MapperWire.read<StudentApplication>(x)
                val p = dto.toStudentApplicationPage(archived)
                assertEquals(listOf(1L, 2L), p.decisions.map { it.sequence })
                assertEquals(listOf("Original 1", "Original 2"), p.decisions.map { it.message })
                assertEquals(listOf(2L, 1L), dto.decisions.map { it.sequenceNumber })
                assertFalse(p.canAttemptSupplement)
            }
            case("account/student_otp_only_no_teacher_password_projection") {
                val actor = MapperWire.fixture("checks/wire/StudentDashboard").getAsJsonObject("actor")
                val p = MapperWire.read<CurrentActor>(actor).toStudentAccountPage()
                assertEquals("synthetic@example.invalid", p.verifiedEmail)
                actor.addProperty("mustChangePassword", true)
                val dto = MapperWire.read<CurrentActor>(actor)
                assertThrows(IllegalArgumentException::class.java) { dto.toStudentAccountPage() }
            }
            case("otp/server_challenge_expiry_and_retry_not_device_recomputed") {
                val x = MapperWire.json("""{"challengeId":"${MapperWire.ID}","expiresAt":"${MapperWire.NOW}","retryAfterSeconds":60}""")
                val p = MapperWire.read<AuthChallenge>(x).toOtpPage()
                assertEquals(MapperWire.NOW, p.expiresAt.wire); assertEquals(60, p.retryAfterSeconds)
            }
            for (allowed in listOf(true, false)) case("account/deletion_${allowed}_preserves_facts_list") {
                val x = MapperWire.json("""{"allowed":$allowed,"blockers":[],"dataDeleted":["account"],"factsRetained":["exercise history"]}""")
                if (!allowed) x.getAsJsonArray("blockers").add(MapperWire.json("""{"code":"ACTIVE_EXERCISE_SESSION","count":1}"""))
                val dto = MapperWire.read<AccountDeletionImpact>(x)
                val p = dto.toDeletionPage(live)
                assertEquals(allowed, p.canAttemptDelete); assertEquals(listOf("exercise history"), p.retained)
                assertFalse(dto.toDeletionPage(archived).canAttemptDelete)
            }
            for (state in MediaAsset.Status.entries) case("media/${state.name}_upload_is_not_verification") {
                val x = MapperWire.application().getAsJsonArray("evidence")[0].asJsonObject
                x.addProperty("status", state.value)
                when (state) {
                    MediaAsset.Status.REJECTED -> x.addProperty("rejectionCode", "MEDIA_CONTENT_INVALID")
                    MediaAsset.Status.EXPIRED -> x.addProperty("rejectionCode", "MEDIA_ALLOCATION_EXPIRED")
                    else -> x.add("rejectionCode", JsonNull.INSTANCE)
                }
                val p = MapperWire.read<MediaAsset>(x).toStudentMedia()
                assertEquals(state, p.state); assertEquals(state == MediaAsset.Status.VERIFIED, p.readyForBinding)
            }
            case("help/cache_explicit_not_current_maintenance_announcement") {
                val x = MapperWire.json("""{"articleId":"${MapperWire.ID}","locale":"zh-CN","title":"维护说明",
                    "bodyMarkdown":"Synthetic help","category":"MAINTENANCE","updatedAt":"${MapperWire.NOW}"}""")
                val dto = MapperWire.read<HelpArticlePublic>(x)
                assertTrue(dto.toHelpPage(ViewSource.CACHED).cached)
                assertFalse(dto.toHelpPage(ViewSource.LIVE).cached)
                assertEquals("Synthetic help", dto.toHelpPage(ViewSource.CACHED).bodyMarkdown)
            }
            for (status in FeedbackStatus.entries) case("feedback/${status.name}_public_history_and_deleted_email") {
                val x = MapperWire.json("""{"feedbackId":"${MapperWire.ID}","feedbackNumber":"F-SYN","student":{},"currentVerifiedEmail":null,
                    "category":"OTHER","description":"Synthetic feedback","status":"${status.value}","replies":[],
                    "submittedAt":"${MapperWire.NOW}","updatedAt":"${MapperWire.NOW}","version":1}""")
                x.add("student", JsonObject().apply { addProperty("kind", "CURRENT_STUDENT"); add("student", MapperWire.fixture("checks/wire/StudentDashboard").get("student")) })
                val p = MapperWire.read<FeedbackTicket>(x).toStudentFeedback()
                assertEquals(status, p.status); assertNull(p.currentEmail); assertTrue(p.history.isEmpty())
            }
            case("release/failed_refresh_preserves_forced_upgrade") {
                val x = MapperWire.json("""{"platform":"ANDROID","currentBuildNumber":1,"minimumSupportedBuildNumber":2,
                    "latestBuildNumber":3,"forceUpgrade":true,"downloadUrl":null,"message":null,"evaluatedAt":"${MapperWire.NOW}"}""")
                val p = androidReleasePage(MapperWire.read<AppReleasePolicy>(x))!!
                val failed = androidReleasePage(null, p)!!
                assertTrue(failed.forceUpgrade); assertTrue(failed.cached); assertNull(failed.downloadUrl)
                assertNull(androidReleasePage(null))
            }
            for (route in StudentNotification.TargetRoute.entries) case("notification/explicit_route_${route.name}") {
                val x = MapperWire.fixture("checks/wire/StudentNotification").apply {
                    addProperty("targetRoute", route.value); addProperty("targetId", MapperWire.ID2)
                    addProperty("title", "Same neutral text"); addProperty("body", "Same neutral text")
                }
                val p = MapperWire.read<StudentNotification>(x).toStudentNotice()
                assertEquals(route, p.route); assertEquals(MapperWire.ID2, p.targetId.toString())
                assertTrue(p.unread); assertTrue(p.reloadTargetOnOpen)
            }
            case("notification/null_route_no_text_inference") {
                val x = MapperWire.fixture("checks/wire/StudentNotification").apply { addProperty("title", "免测申请已通过") }
                assertNull(MapperWire.read<StudentNotification>(x).toStudentNotice().route)
            }
            case("notification/read_preserves_event_not_current_review") {
                val x = MapperWire.fixture("checks/wire/StudentNotification").apply {
                    addProperty("readAt", MapperWire.NOW); addProperty("targetRoute", "EXERCISE_RECORD")
                    add("reviewContext", MapperWire.json("""{"recordId":"${MapperWire.ID}","reviewSequenceNumber":1,
                        "processingStage":"SUPPLEMENT_REQUIRED","publicReason":null,"publicComment":"原文"}"""))
                }
                val p = MapperWire.read<StudentNotification>(x).toStudentNotice()
                assertFalse(p.unread); assertTrue(p.reloadTargetOnOpen)
                assertEquals("原文", p.originalComment); assertEquals(ReviewProcessingStage.SUPPLEMENT_REQUIRED, p.eventStage)
            }
            for (text in listOf("成绩 90", "final grade A", "排名第一", "历史备注", "100 points")) case("notification/reject_disclosure_$text") {
                val x = MapperWire.fixture("checks/wire/StudentNotification").apply { addProperty("body", text) }
                val dto = MapperWire.read<StudentNotification>(x)
                assertThrows(IllegalArgumentException::class.java) { dto.toStudentNotice() }
            }
            for (text in listOf("材料有效", "申请审核通过", "100 分钟", "Upload failed", "Application passed")) case("notification/allow_workflow_$text") {
                val x = MapperWire.fixture("checks/wire/StudentNotification").apply { addProperty("body", text) }
                assertEquals(text, MapperWire.read<StudentNotification>(x).toStudentNotice().body)
            }
            for (code in ErrorCode.entries) case("error/${code.name}_never_success") {
                val x = MapperWire.json("""{"code":"${code.value}","message":"维护 successful empty result","requestId":"SYN-REQ","details":null}""")
                val p = MapperWire.read<ErrorEnvelope>(x).toStudentFailure()
                assertEquals(code.value, p.code); assertEquals("SYN-REQ", p.requestId)
                assertEquals(code == ErrorCode.SYSTEM_MAINTENANCE, p.kind == StudentFailureKind.MAINTENANCE)
            }
            case("error/transport_failure_is_not_maintenance_or_empty") {
                assertEquals(StudentFailureKind.TRANSPORT, studentTransportFailure().kind)
                assertNull(studentTransportFailure().code)
            }
            case("error/version_and_retry_hints_keep_exact_integers") {
                val x = MapperWire.json("""{"code":"VERSION_CONFLICT","message":"Synthetic","requestId":"REQ",
                    "details":{"fieldViolations":[],"currentVersion":9007199254740993,"retryAfterSeconds":2147483647,"blockers":[]}}""")
                val p = MapperWire.read<ErrorEnvelope>(x).toStudentFailure()
                assertEquals(StudentFailureKind.REFRESH_REQUIRED, p.kind)
                assertEquals(9007199254740993L, p.currentVersion); assertEquals(Int.MAX_VALUE, p.retryAfterSeconds)
            }
            for (state in SystemMode.Mode.entries) case("mode/${state.name}_must_be_fresh") {
                val x = MapperWire.json("""{"mode":"${state.value}","policyVersion":1,"announcement":null,"updatedAt":"${MapperWire.NOW}","version":1}""")
                val dto = MapperWire.read<SystemMode>(x)
                assertEquals(ModeSignal.UNKNOWN, dto.toModeSignal(false))
                assertEquals(state.name, dto.toModeSignal(true).name)
            }
            case("mode/no_response_fails_closed") { assertEquals(ModeSignal.UNKNOWN, (null as SystemMode?).toModeSignal(true)) }
            case("mode/estimated_recovery_keeps_maintenance_closed") {
                val x = MapperWire.json("""{"mode":"MAINTENANCE","policyVersion":1,"version":1,"updatedAt":"${MapperWire.NOW}",
                    "announcement":{"titleZh":"维护","titleEn":"Maintenance","bodyZh":"请稍后","bodyEn":"Please wait",
                    "estimatedRecoveryAt":"2026-09-01T00:00:00Z"}}""")
                val dto = MapperWire.read<SystemMode>(x)
                val page = dto.toMaintenancePage(true)
                assertEquals(ModeSignal.MAINTENANCE, page.signal)
                assertEquals("维护" to "Maintenance", page.title)
                assertEquals("2026-09-01T00:00:00Z", page.estimatedRecoveryAt!!.wire)
                assertEquals(ModeSignal.UNKNOWN, dto.toMaintenancePage(false).signal)
            }
            case("wire/unknown_state_and_forbidden_student_fields_rejected_before_mapping") {
                val unknown = progress().apply { addProperty("state", "SURPRISE") }
                assertThrows(JsonParseException::class.java) { MapperWire.read<StudentCourseProgress>(unknown) }
                for (field in listOf("grade", "rank", "remark")) {
                    val x = MapperWire.fixture("checks/wire/StudentDashboard").apply { addProperty(field, "hidden") }
                    assertThrows(JsonParseException::class.java) { MapperWire.read<StudentDashboard>(x) }
                }
            }
            case("presentation/student_outputs_have_no_grade_score_rank_or_remark_fields") {
                for (type in listOf<Class<*>>(StudentHome::class.java, StudentEndurance::class.java, StudentNotice::class.java,
                    StudentRecord::class.java, ProgressNumbers::class.java, StudentApplicationPage::class.java)) {
                    assertTrue(type.declaredFields.none { it.name.lowercase().let { name ->
                        listOf("grade", "score", "rank", "remark").any(name::contains)
                    } })
                }
            }
        }.also { rows -> require(rows.map { it[0] }.distinct().size == rows.size) }

        @JvmStatic @AfterClass fun report() {
            val directory = Path.of(System.getProperty("phase6.output"))
            Files.createDirectories(directory)
            val report = mapOf("candidateSha256" to "0528389bb8b72714d9a4af35ffc66c87503560d41c58ad968b1713b39ff3da2d",
                "planned" to cases().size, "executed" to results.size, "passed" to results.count { it["status"] == "PASS" },
                "cases" to results, "decodedSchemas" to MapperWire.decodedSchemas.sorted(),
                "scope" to "Strict synthetic wire -> Android compiled DTO -> domain/page projection on host JVM; no rendered UI/device/backend")
            Files.write(directory.resolve("mapper.json"), (GsonBuilder().setPrettyPrinting().create().toJson(report) + "\n").toByteArray(Charsets.UTF_8))
        }
    }
}
