package edu.bnbu.student.contractvalidation.mock

import bnbu.cr005.review.*
import edu.bnbu.student.contractvalidation.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** The caller runs blocking loads off the UI thread. Each new load invalidates prior responses. */
class MockScreenController(private val http: ContractMockHttp, private val systemMode: MockOperation) {
    private val lock = Any()
    private var epoch = 0L
    private val mutableState = MutableStateFlow(ValidationPage(PageState.LOADING, "加载中"))
    val state: StateFlow<ValidationPage> = mutableState
    private var mode = ModeSignal.UNKNOWN
    private var lastValue: Any? = null
    private var lastRead: MockCall? = null
    private var lastSource = ViewSource.LIVE
    private var lastRelease: AppReleasePolicy? = null

    fun invalidate(): Unit = synchronized(lock) {
        epoch++; mode = ModeSignal.UNKNOWN; lastValue = null; lastRead = null
        mutableState.value = ValidationPage(PageState.LOADING, "重新核对状态")
    }
    private fun begin(): Long = synchronized(lock) {
        epoch++; mode = ModeSignal.UNKNOWN; lastValue = null
        mutableState.value = ValidationPage(PageState.LOADING, "加载中")
        epoch
    }
    private fun commit(token: Long, page: ValidationPage, value: Any? = null): Boolean = synchronized(lock) {
        if (epoch != token) return false
        lastValue = value; mutableState.value = page
        true
    }
    private fun readFailure(call: MockCall, result: HttpResult): ValidationPage {
        val failure = MockPresentation.failure(result)
        val previous = synchronized(lock) { lastRelease }
        if (call.operation.id != "getAppReleasePolicy" || previous == null) return failure
        // A failed refresh cannot quietly clear a previously received forced-upgrade decision.
        val cached = MockPresentation.data(previous, StudentViewContext(ModeSignal.UNKNOWN, ViewSource.CACHED))
        return failure.copy(rows = cached.rows, readOnly = true)
    }
    fun load(call: MockCall, source: ViewSource = ViewSource.LIVE, english: Boolean = false) {
        require(call.operation.method == "GET") { "Use a guarded command for writes" }
        val token = begin()
        synchronized(lock) { if (token == epoch) { lastRead = call; lastSource = source } }
        val modeResult = http.execute(MockCall(systemMode))
        val normal = (modeResult as? HttpResult.Data)?.value as? SystemMode
        if (normal == null) { commit(token, readFailure(call, modeResult)); return }
        if (normal.mode != SystemMode.Mode.NORMAL) { commit(token, MockPresentation.maintenance(normal, true)); return }
        synchronized(lock) { if (token != epoch) return; mode = ModeSignal.NORMAL }
        val result = http.execute(call)
        if (result !is HttpResult.Data) { commit(token, readFailure(call, result)); return }
        val page = try { MockPresentation.data(result.value, StudentViewContext(ModeSignal.NORMAL, source), english) }
            catch (_: IllegalArgumentException) { MockPresentation.failure(HttpResult.InvalidResponse) }
        synchronized(lock) {
            if (token != epoch) return
            if (page.problem == null && result.value is AppReleasePolicy) lastRelease = result.value
            commit(token, page, if (page.problem == null) result.value else null)
        }
    }

    /** A resumed upload requires a new material read; the receipt alone never enables it. */
    fun loadLockedMaterial(call: MockCall) {
        val refresh = synchronized(lock) {
            if (lastValue !is FirstMaterialEligibility || lastSource != ViewSource.LIVE) return
            lastRead ?: return
        }
        // Refresh mode and eligibility.serverNow before evaluating the 30-minute boundary.
        load(refresh)
        val eligibility: FirstMaterialEligibility
        val token: Long
        synchronized(lock) {
            eligibility = lastValue as? FirstMaterialEligibility ?: return
            if (mode != ModeSignal.NORMAL || mutableState.value.readOnly) return
            token = epoch
        }
        val result = http.execute(call)
        val material = (result as? HttpResult.Data)?.value as? MaterialVersion
        if (material == null) { commit(token, MockPresentation.failure(result)); return }
        val page = try {
            require(call.operation.id == "getRecordMaterial")
            require(call.pathValues["recordId"] == material.recordId.toString())
            require(call.pathValues["materialVersionId"] == material.materialVersionId.toString())
            val route = requireNotNull(eligibility.firstReceipt).submissionRoute
            val p = eligibility.toFirstMaterialPage(route, StudentViewContext(ModeSignal.NORMAL, ViewSource.LIVE), material)
            ValidationPage(PageState.RESUME, "同批材料续传", listOf(DisplayRow("resume.batch", "原锁定批次", p.lockedBatchId.toString())),
                if (p.canAttemptLockedTransfer) setOf(PageAction.CONTINUE_BATCH) else emptySet())
        } catch (_: IllegalArgumentException) { MockPresentation.failure(HttpResult.InvalidResponse) }
        commit(token, page, eligibility)
    }

    /** Only the explicitly tested supplement command is wired; other product flows belong to Phase8. */
    fun submitSupplement(recordRead: MockCall, command: MockCall) {
        require(recordRead.operation.id == "getOwnExerciseRecord" && command.operation.id == "submitExerciseRecordSupplement")
        require(!command.idempotencyKey.isNullOrBlank())
        load(recordRead)
        val token: Long
        val record: ExerciseRecord
        synchronized(lock) {
            if (mode != ModeSignal.NORMAL || PageAction.SUPPLEMENT !in mutableState.value.actions) return
            record = lastValue as? ExerciseRecord ?: return
            token = epoch
        }
        val request = command.body as? SupplementRecordMaterialRequest ?: return
        val review = record.currentReview
        val timer = review.supplementTimer ?: return
        val consistent = recordRead.pathValues["recordId"] == record.recordId.toString() &&
            command.pathValues["recordId"] == record.recordId.toString() &&
            request.expectedVersion == review.version && request.materialVersionId == review.materialVersionId &&
            request.expectedRoundNo.value.toLong() == review.roundNo && request.timerId == timer.timerId &&
            request.returnActionId == timer.returnActionId && request.expectedTimerVersion == timer.version &&
            request.expectedTimingSourceRevision == timer.sourceRevision
        if (!consistent) { commit(token, MockPresentation.failure(HttpResult.InvalidResponse)); return }
        synchronized(lock) {
            if (token != epoch) return
            mutableState.value = ValidationPage(PageState.LOADING, "正在核对服务器受理结果")
        }
        val result = http.execute(command)
        val receipt = (result as? HttpResult.Data)?.value as? SupplementAcceptanceReceipt
        if (receipt == null) { commit(token, MockPresentation.failure(result)); return }
        val page = try {
            require(receipt.material.recordId == record.recordId && receipt.material.items == request.items &&
                receipt.material.previousMaterialVersionId == request.materialVersionId &&
                receipt.material.returnActionId == request.returnActionId)
            MockPresentation.data(receipt, StudentViewContext(ModeSignal.NORMAL, ViewSource.LIVE))
        } catch (_: IllegalArgumentException) { MockPresentation.failure(HttpResult.InvalidResponse) }
        commit(token, page)
    }
}
