package edu.bnbu.student.mvp.core.exercise

internal class FakeExerciseGateway : ExerciseGateway {
    var onStart: suspend (StartExerciseCommand) -> ExerciseSessionRecord = {
        error("start was not expected")
    }
    var onGetActive: suspend (ExerciseSessionRecord?) -> ExerciseSessionRecord? = {
        error("getActive was not expected")
    }
    var onGet: suspend (String, ExerciseSessionRecord?) -> ExerciseSessionRecord = { _, _ ->
        error("get was not expected")
    }
    var onPause: suspend (ExerciseSessionRecord) -> ExerciseSessionRecord = {
        error("pause was not expected")
    }
    var onResume: suspend (ExerciseSessionRecord) -> ExerciseSessionRecord = {
        error("resume was not expected")
    }
    var onAddSixtyMinutes: suspend (ExerciseSessionRecord) -> ExerciseSessionRecord = {
        error("addSixtyMinutes was not expected")
    }
    var onFinish: suspend (ExerciseSessionRecord) -> ExerciseSessionRecord = {
        error("finish was not expected")
    }
    var onCancel: suspend (ExerciseSessionRecord) -> ExerciseSessionRecord = {
        error("cancel was not expected")
    }
    var onCreateRecordDraft: suspend (
        CreateExerciseRecordDraftCommand
    ) -> ExerciseRecordDraft = {
        error("createRecordDraft was not expected")
    }
    var onFindRecordDraft: suspend (String) -> ExerciseRecordDraft? = { null }
    var onUpdateRecordDraft: suspend (
        UpdateExerciseRecordDraftCommand
    ) -> ExerciseRecordDraft = {
        error("updateRecordDraft was not expected")
    }
    var onSubmitRecord: suspend (SubmitExerciseRecordCommand) -> ExerciseRecord = {
        error("submitRecord was not expected")
    }

    override suspend fun start(command: StartExerciseCommand): ExerciseSessionRecord =
        onStart(command)

    override suspend fun getActive(
        localMirror: ExerciseSessionRecord?
    ): ExerciseSessionRecord? = onGetActive(localMirror)

    override suspend fun get(
        sessionId: String,
        localMirror: ExerciseSessionRecord?
    ): ExerciseSessionRecord = onGet(sessionId, localMirror)

    override suspend fun pause(current: ExerciseSessionRecord): ExerciseSessionRecord =
        onPause(current)

    override suspend fun resume(current: ExerciseSessionRecord): ExerciseSessionRecord =
        onResume(current)

    override suspend fun addSixtyMinutes(current: ExerciseSessionRecord): ExerciseSessionRecord =
        onAddSixtyMinutes(current)

    override suspend fun finish(current: ExerciseSessionRecord): ExerciseSessionRecord =
        onFinish(current)

    override suspend fun cancel(current: ExerciseSessionRecord): ExerciseSessionRecord =
        onCancel(current)

    override suspend fun createRecordDraft(
        command: CreateExerciseRecordDraftCommand
    ): ExerciseRecordDraft = onCreateRecordDraft(command)

    override suspend fun findRecordDraft(sessionId: String): ExerciseRecordDraft? =
        onFindRecordDraft(sessionId)

    override suspend fun updateRecordDraft(
        command: UpdateExerciseRecordDraftCommand
    ): ExerciseRecordDraft = onUpdateRecordDraft(command)

    override suspend fun submitRecord(command: SubmitExerciseRecordCommand): ExerciseRecord =
        onSubmitRecord(command)
}
