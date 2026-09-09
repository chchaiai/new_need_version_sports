import bnbu.cr005.review.*
import com.google.gson.*
import edu.bnbu.student.contractvalidation.mock.*
import edu.bnbu.student.contractvalidation.ViewSource
import edu.bnbu.student.contractvalidation.toIdentityDisplay
import edu.bnbu.student.contractvalidation.currentStudent
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.mockwebserver.*
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors

abstract class SharedMockBoundaryTests {
    protected abstract val input: JsonObject
    private fun fixture(name: String) = MockCases.fixture(input, name)
    @Test fun historicalIdentityHasNoCurrentProfileOnHostAndAndroid() {
        MockScenarioHarness(input).use { h ->
            val ref = h.codec.decode("""{"kind":"DELETED_STUDENT","studentId":"${MockCases.ID}"}""", "StudentReference") as StudentReference
            assertEquals("已注销学生", ref.toIdentityDisplay().zh)
            assertTrue(ref.toIdentityDisplay().readOnly)
            assertThrows(IllegalArgumentException::class.java) { ref.currentStudent() }
        }
    }
    @Test fun allThirteenQuery400ResponsesRemainApiErrors() {
        val operations = listOf("listSemesters", "listOwnCourses", "listCourseMakeupAuthorizations", "listOwnMakeupAuthorizations",
            "listCourseInvitations", "listCourseMembers", "listPublishedRuleTemplates", "listSubAdmins", "listTeacherAccounts",
            "listOwnStudentNotifications", "listOwnNotifications", "listSystemModeTransitions", "listStudentAccounts")
        MockScenarioHarness(input).use { h ->
            for (id in operations) {
                h.raw("""{"code":"INVALID_REQUEST","message":"Synthetic query error","requestId":"synthetic-query","details":null}""", 400)
                val result = h.http.execute(h.call(id, mapOf("limit" to "0")))
                assertTrue("$id must preserve HTTP400 error", result is HttpResult.ApiError)
                assertEquals("INVALID_REQUEST", (result as HttpResult.ApiError).error.code)
                assertEquals("0", h.take().requestUrl!!.queryParameter("limit"))
            }
        }
    }
    @Test fun ownFeedbackCannotReturnADeletedIdentity() {
        MockScenarioHarness(input).use { h ->
            h.normal()
            h.raw("""{"feedbackId":"${MockCases.ID}","feedbackNumber":"F-SYN","student":{"kind":"DELETED_STUDENT","studentId":"${MockCases.ID}"},"currentVerifiedEmail":null,"category":"OTHER","description":"Synthetic feedback","status":"WAITING","replies":[],"submittedAt":"${MockCases.NOW}","updatedAt":"${MockCases.NOW}","version":1}""")
            h.controller.load(h.call("getOwnFeedback"))
            assertEquals(PageState.ERROR, h.controller.state.value.state)
            assertTrue(h.controller.state.value.rows.isEmpty())
        }
    }
    private fun invalid(body: String, status: Int = 200, contentType: String = "application/json") {
        MockScenarioHarness(input).use { h ->
            h.normal(); h.raw(body, status, contentType)
            h.controller.load(h.call("getStudentDashboard"))
            assertEquals(PageState.ERROR, h.controller.state.value.state)
            assertEquals("INVALID_RESPONSE", h.controller.state.value.problem)
            assertEquals(emptyList<DisplayRow>(), h.controller.state.value.rows)
        }
    }
    @Test fun duplicateJsonMembersRejected() = invalid("{\"actor\":null,\"actor\":null}")
    @Test fun malformedJsonIsInvalidResponseNotTransport() = invalid("{\"actor\":")
    @Test fun concatenatedJsonRejected() = invalid(fixture("checks/wire/StudentDashboard").toString() + "{}")
    @Test fun htmlSuccessIsNotEmpty() = invalid("<html>upstream error</html>", contentType="text/html")
    @Test fun unexpected204IsNotEmpty() = invalid("", 204)
    @Test fun redirectIsNotFollowed() = invalid("{}", 302)
    @Test fun missingRequiredNullableRejected() = invalid(fixture("checks/wire/StudentDashboard").apply { remove("course") }.toString())
    @Test fun forbiddenStudentGradeRejected() = invalid(fixture("checks/wire/StudentDashboard").apply { addProperty("finalGrade", "A") }.toString())
    @Test fun unknownEnumRejected() = invalid(fixture("checks/wire/StudentDashboard").apply { getAsJsonObject("actor").addProperty("role", "UNKNOWN") }.toString())
    @Test fun nonUtf8Rejected() {
        MockScenarioHarness(input).use { h ->
            h.normal(); h.server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody(okio.Buffer().write(byteArrayOf(0xc3.toByte(),0x28))))
            h.controller.load(h.call("getStudentDashboard"))
            assertEquals("INVALID_RESPONSE", h.controller.state.value.problem)
        }
    }
    @Test fun technicalStageWithoutCaseIdentityRejected() {
        MockScenarioHarness(input).use { h ->
            val record = MockCases.record(input, "pending_material").apply {
                getAsJsonObject("currentReview").addProperty("processingStage", "TECHNICAL_PROCESSING")
            }
            h.normal(); h.respond(record); h.controller.load(h.call("getOwnExerciseRecord"))
            assertEquals(PageState.ERROR, h.controller.state.value.state)
            assertEquals("INVALID_RESPONSE", h.controller.state.value.problem)
        }
    }
    @Test fun transportFailureCannotBecomeMaintenanceOrEmpty() {
        MockScenarioHarness(input).use { h ->
            h.normal(); h.server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
            h.controller.load(h.call("getStudentDashboard"))
            assertEquals(PageState.ERROR, h.controller.state.value.state)
            assertEquals("TRANSPORT", h.controller.state.value.problem)
            assertEquals(2, h.server.requestCount) // no automatic retry
        }
    }
    @Test fun freshNormalIsRequiredToRecoverFromMaintenance() {
        MockScenarioHarness(input).use { h ->
            h.respond(MockCases.mode(true)); h.controller.load(h.call("getFirstMaterialEligibility"))
            assertEquals(PageState.MAINTENANCE, h.controller.state.value.state)
            h.raw("bad"); h.controller.load(h.call("getFirstMaterialEligibility"))
            assertEquals(PageState.ERROR, h.controller.state.value.state)
            assertTrue(h.controller.state.value.actions.none { it == PageAction.FIRST_MATERIAL })
            h.normal(); h.respond(MockCases.eligibility()); h.controller.load(h.call("getFirstMaterialEligibility"))
            assertEquals(setOf(PageAction.FIRST_MATERIAL), h.controller.state.value.actions)
            assertEquals(4, h.server.requestCount)
        }
    }
    @Test fun staleResponseCannotOverwriteNewScreenAndLoadingIsObservable() {
        MockScenarioHarness(input).use { h ->
            val entered = CountDownLatch(1); val release = CountDownLatch(1)
            h.server.dispatcher = object : Dispatcher() {
                override fun dispatch(request: RecordedRequest): MockResponse {
                    val payload = if (request.path == "/api/v1/system-mode") MockCases.mode()
                    else if (request.path == "/api/v1/student/dashboard") {
                        entered.countDown(); check(release.await(5, TimeUnit.SECONDS)); fixture("checks/wire/StudentDashboard")
                    } else MockCases.list(emptyList())
                    return MockResponse().setHeader("Content-Type", "application/json").setBody(payload.toString())
                }
            }
            val worker = Executors.newSingleThreadExecutor()
            try {
                val old = worker.submit { h.controller.load(h.call("getStudentDashboard")) }
                assertTrue(entered.await(3, TimeUnit.SECONDS))
                assertEquals(PageState.LOADING, h.controller.state.value.state)
                h.controller.load(h.call("listOwnExerciseRecords"))
                assertEquals(PageState.EMPTY, h.controller.state.value.state)
                release.countDown(); old.get(3, TimeUnit.SECONDS)
                assertEquals("打卡记录", h.controller.state.value.title)
                assertEquals(PageState.EMPTY, h.controller.state.value.state)
            } finally { release.countDown(); worker.shutdownNow() }
        }
    }
    @Test fun invalidationDisablesPreviouslyAvailableWrite() {
        MockScenarioHarness(input).use { h ->
            h.normal(); h.respond(MockCases.eligibility()); h.controller.load(h.call("getFirstMaterialEligibility"))
            assertTrue(h.controller.state.value.actions.contains(PageAction.FIRST_MATERIAL))
            h.controller.invalidate()
            assertEquals(PageState.LOADING, h.controller.state.value.state)
            assertTrue(h.controller.state.value.actions.isEmpty())
        }
    }
    @Test fun failedReleaseRefreshKeepsForcedUpgradeVisible() {
        MockScenarioHarness(input).use { h ->
            val scenario = MockCases.all(input).single { it.name == "release_forced_upgrade" }
            scenario.execute(h)
            h.normal(); h.respond(MockCases.error("DEPENDENCY_UNAVAILABLE"), 503)
            h.controller.load(h.call(scenario.operation, scenario.query))
            val page = h.controller.state.value
            assertEquals(PageState.ERROR, page.state); assertTrue(page.readOnly)
            assertEquals("true", page.rows.single { it.key == "release.force" }.value)
        }
    }
    @Test fun notificationDisclosureIsNotRendered() {
        MockScenarioHarness(input).use { h ->
            val notice = fixture("checks/wire/StudentNotification").apply { addProperty("body", "final grade A") }
            h.normal(); h.respond(MockCases.list(listOf(notice)))
            h.controller.load(h.call("listOwnStudentNotifications"))
            assertEquals("INVALID_RESPONSE", h.controller.state.value.problem)
            assertTrue(h.controller.state.value.rows.isEmpty())
        }
    }
    private fun resume(freshNow: String, readiness: String = "PENDING_TRANSFER", tamper: Boolean = false): ValidationPage {
        MockScenarioHarness(input).use { h ->
            val eligibility = MockCases.eligibility().apply { add("firstReceipt", fixture("prior-workflow/receipt/first")) }
            h.normal(); h.respond(eligibility); h.controller.load(h.call("getFirstMaterialEligibility"))
            assertTrue(h.controller.state.value.actions.isEmpty())
            h.normal(); h.respond(eligibility.deepCopy().apply { addProperty("serverNow", freshNow) })
            h.respond(fixture("prior-workflow/material/first_locked").apply {
                addProperty("readiness", readiness)
                if (readiness == "READY") addProperty("transferCompletedAt", MockCases.NOW)
                if (tamper) getAsJsonArray("items")[0].asJsonObject.addProperty("checksumSha256", "b".repeat(64))
            })
            h.controller.loadLockedMaterial(h.call("getRecordMaterial"))
            assertEquals(5, h.server.requestCount)
            return h.controller.state.value
        }
    }
    @Test fun lockedResumeNeedsFreshMatchingCurrentMaterial() {
        assertEquals(setOf(PageAction.CONTINUE_BATCH), resume(MockCases.NOW).actions)
    }
    @Test fun exactTransferDeadlineCannotResume() {
        assertTrue(resume("2026-09-07T02:30:00.000000001Z").actions.isEmpty())
    }
    @Test fun alreadyReadyMaterialCannotResume() { assertTrue(resume(MockCases.NOW, "READY").actions.isEmpty()) }
    @Test fun receiptManifestMismatchRejected() { assertEquals("INVALID_RESPONSE", resume(MockCases.NOW, tamper=true).problem) }
    @Test fun cachedReceiptCannotTriggerAnyResumeRead() {
        MockScenarioHarness(input).use { h ->
            h.normal(); h.respond(MockCases.eligibility().apply { add("firstReceipt", fixture("prior-workflow/receipt/first")) })
            h.controller.load(h.call("getFirstMaterialEligibility"), ViewSource.CACHED)
            h.controller.loadLockedMaterial(h.call("getRecordMaterial"))
            assertEquals(2, h.server.requestCount); assertTrue(h.controller.state.value.actions.isEmpty())
        }
    }
    @Test fun literalLoopbackOnly() {
        val codec = StrictMockCodec(input)
        for (url in listOf("https://example.invalid", "http://localhost", "http://192.168.0.1"))
            assertThrows(IllegalArgumentException::class.java) { ContractMockHttp(url.toHttpUrl(), codec) }
    }
    private fun supplement(h: MockScenarioHarness, status: Int = 201, mismatch: Boolean = false) {
        val requestWire = fixture("prior-workflow/supplement/valid")
        val request = h.codec.decode(requestWire.toString(), "SupplementRecordMaterialRequest") as SupplementRecordMaterialRequest
        val record = MockCases.record(input, "await_supplement")
        record.getAsJsonObject("currentReview").apply {
            addProperty("version", request.expectedVersion)
            getAsJsonObject("supplementTimer").apply { addProperty("version", request.expectedTimerVersion); addProperty("sourceRevision", request.expectedTimingSourceRevision) }
        }
        h.normal(); h.respond(record)
        if (!mismatch) {
            if (status == 201) h.respond(fixture("prior-workflow/receipt/supplement").apply {
                getAsJsonObject("material").addProperty("returnActionId", request.returnActionId.toString()) }, status)
            else h.respond(MockCases.error("VERSION_CONFLICT"), status)
        }
        val call = h.call("submitExerciseRecordSupplement").copy(body=if (mismatch) request.copy(expectedVersion=999) else request,
            idempotencyKey="phase6-synthetic-supplement-1")
        h.controller.submitSupplement(h.call("getOwnExerciseRecord"), call)
        h.take(); h.take()
        if (!mismatch) {
            val sent = h.take()
            assertEquals("POST", sent.method)
            assertEquals("/api/v1/exercise-records/${MockCases.ID}/supplements", sent.path)
            assertEquals("phase6-synthetic-supplement-1", sent.getHeader("Idempotency-Key"))
            assertEquals(requestWire, StrictMockCodec.parse(sent.body.readUtf8()))
        }
    }
    @Test fun generatedSupplementPost201WaitsForServerReceipt() {
        MockScenarioHarness(input).use { h ->
            supplement(h); assertEquals("补证已接收", h.controller.state.value.title)
            assertTrue(h.controller.state.value.actions.isEmpty()); assertEquals(3, h.server.requestCount)
        }
    }
    @Test fun supplement409RequiresRefreshAndNeverAutoResubmits() {
        MockScenarioHarness(input).use { h ->
            supplement(h, 409); assertEquals("VERSION_CONFLICT", h.controller.state.value.problem)
            assertEquals(PageState.ERROR, h.controller.state.value.state); assertEquals(3, h.server.requestCount)
        }
    }
    @Test fun staleSupplementCommandDoesNotSendPost() {
        MockScenarioHarness(input).use { h ->
            supplement(h, mismatch=true); assertEquals("INVALID_RESPONSE", h.controller.state.value.problem)
            assertEquals(2, h.server.requestCount)
        }
    }
    @Test fun invalidConstructedRequestNeverLeavesDeviceAndBecomesPageError() {
        MockScenarioHarness(input).use { h ->
            val request = h.codec.decode(fixture("prior-workflow/supplement/valid").toString(),
                "SupplementRecordMaterialRequest") as SupplementRecordMaterialRequest
            val result = h.http.execute(h.call("submitExerciseRecordSupplement").copy(body=request.copy(items=emptySet()),
                idempotencyKey="phase6-invalid-local-request"))
            assertEquals(HttpResult.InvalidRequest, result)
            assertEquals(0, h.server.requestCount)
            val page = MockPresentation.failure(result)
            assertEquals(PageState.ERROR, page.state)
            assertEquals("LOCAL_INVALID_REQUEST", page.problem)
            assertTrue(page.actions.isEmpty())
        }
    }
}
