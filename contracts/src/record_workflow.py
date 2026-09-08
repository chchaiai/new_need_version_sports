"""CR-20260908-001: public material/review protocol; no runtime or database code."""
from common import (INSTANT, UUID, VERSION, SHA256, LOCAL_DATE, ContractRegistry,
                    add_paged_schema, array_of, cursor_parameters, integer_schema,
                    nullable, number_schema, object_schema, path_parameter,
                    query_parameter, ref, string_schema)

REASONS = {
    "UNCLEAR_EVIDENCE": ("材料不清晰", "Unclear evidence", ["RETURN_SUPPLEMENT", "INVALID"]),
    "MISSING_REQUIRED_EVIDENCE": ("必需材料缺失（含要求的前后照）", "Missing required evidence", ["RETURN_SUPPLEMENT", "INVALID"]),
    "EVIDENCE_SESSION_MISMATCH": ("材料与本次运动不符", "Evidence does not match this session", ["RETURN_SUPPLEMENT", "INVALID"]),
    "INCONSISTENT_EVIDENCE": ("材料信息矛盾", "Inconsistent evidence", ["RETURN_SUPPLEMENT", "INVALID"]),
    "AUTHENTICITY_REQUIRES_CLARIFICATION": ("材料真实性待核实", "Evidence authenticity requires clarification", ["RETURN_SUPPLEMENT"]),
    "CONFIRMED_REUSE_OR_MISUSE": ("经核实存在重复使用或冒用材料", "Confirmed reuse or misuse of evidence", ["INVALID"]),
}
STAGES = ["MATERIAL_PROCESSING", "SYSTEM_CHECK_PENDING", "AI_REVIEW_PENDING", "TECHNICAL_PROCESSING",
          "TEACHER_REVIEW_REQUIRED", "SUPPLEMENT_REQUIRED", "SUPPLEMENT_REVIEW_REQUIRED", "VALID", "INVALID"]
NEW_ERRORS = {
    "FIRST_MATERIAL_DEADLINE_MISSED": (409, "No first receipt exists and the authoritative first-acceptance deadline has been reached."),
    "FIRST_MATERIAL_ALREADY_ACCEPTED": (409, "A different first-material command already committed; read its receipt."),
    "MATERIAL_BATCH_CONFLICT": (409, "A command attempts to replace a locked batch, manifest, checksum, or material binding."),
    "MATERIAL_NOT_READY": (409, "Required objects are not all authoritatively complete and verified; this is not a review result."),
    "MATERIAL_TRANSFER_DEADLINE_MISSED": (409, "The locked objects did not complete before the applicable strict deadline."),
    "SUPPLEMENT_NOT_ALLOWED": (409, "No current original supplementary opportunity permits this new command."),
    "SUPPLEMENT_DEADLINE_MISSED": (409, "The final authoritative supplementary acceptance deadline has been reached."),
    "REVIEW_ACTION_NOT_ALLOWED": (409, "The current review stage or already-used return opportunity forbids the action."),
    "REVIEW_PRECONDITION_UNSATISFIED": (422, "Required checks or established facts do not support the requested review action."),
    "CORRECTION_CONFLICT": (409, "A later legal decision, settlement, or correction requires targeted review; it must not be overwritten."),
}
POLICY = {
    "changeRequest": "CR-20260908-001",
    "firstAcceptance": {"ordinarySeconds": 86400, "swimmingTimelySeconds": 900,
                        "swimmingOfflineSeconds": 86400, "comparison": "STRICTLY_BEFORE",
                        "clock": "AUTHORITATIVE_SERVER_FULL_PRECISION_UTC", "origin": "PERSISTED_SESSION_ENDED_AT"},
    "lockedTransfer": {"seconds": 1800, "comparison": "STRICTLY_BEFORE", "origin": "FIRST_ACCEPTED_AT",
                       "completion": "MAX_AUTHORITATIVE_REQUIRED_OBJECT_COMPLETION_INSTANT",
                       "sameBatchOnly": True, "newSupplementGrace": False},
    "historicalChain": {"required": "SERVER_CONFIRMED_LEGAL_SESSION_OR_RECORD_BEFORE_LIFECYCLE_BOUNDARY",
                        "firstReceiptRequiredForProtection": False, "retains": ["ORIGINAL_FIRST_WINDOW", "ORIGINAL_LOCKED_TRANSFER"],
                        "newStartAllowed": False, "ownerAuthenticationRequired": True},
    "supplement": {"normalMaterialVersions": [1, 2], "normalReviewRounds": [1, 2],
                   "returnLimit": 1, "budgetHours": [24, 72], "defaultHours": 24,
                   "acceptanceComparison": "STRICTLY_BEFORE", "requiresAllMediaReady": True,
                   "acceptedEndsStudentTimer": True, "aiMayDecideRound2": False},
    "teacherSla": {"budgetSeconds": 172800, "timezone": "Asia/Shanghai", "dayBoundary": "00:00",
                   "calendar": "OWNER_CONFIRMED_VERSIONED_COVERAGE", "onMissingCoverage": "UNAVAILABLE",
                   "revisionPolicy": "PIN_EXISTING_ROUND_UNLESS_EXPLICIT_AUDITED_REBASE",
                   "overdueEffect": "REMINDER_ONLY"},
    "pause": {"sources": ["MAINTENANCE", "CONFIRMED_PLATFORM_INCIDENT", "ERRONEOUS_LOCK"],
              "combination": "INTERVAL_UNION", "personalOfflineIncluded": False,
              "openPauseHasFinalDueAt": False, "slaIntersection": "CONFIRMED_WORKING_DAY_INTERVALS"},
    "expiryCorrection": {"appendOnly": True, "confirmedIncidentRequired": True,
                         "preserveLegalSuccessors": True, "resetReturnUsed": False, "grantFullWindow": False,
                         "resumeAt": "ACTUAL_ENTRY_RESTORATION", "conflict": "CORRECTION_CONFLICT",
                         "publicAdminMutation": False, "runtimeOwner": "PHASE_7_BACKEND"},
    "replayOrder": ["AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE", "EXACT_COMMITTED_RECEIPT",
                    "NEW_COMMAND_MODE_VERSION_DEADLINE_AND_CURRENT_SOURCE_CHECKS"],
    "newWriteAtomicity": ["MATERIAL_AND_CASE_BINDING", "TIMER_AND_ROUND", "CURRENT_PROJECTION",
                          "SOURCE_REVISIONS", "NOTIFICATION_AUDIT_OUTBOX", "COMMAND_RECEIPT"],
}


def obj(properties, description=None, optional=()):
    return object_schema(properties, [k for k in properties if k not in optional], description=description)


def enum(*values):
    return string_schema(enum=list(values))


def literal(value):
    return {"type": "string", "const": value}


def when(field, values, properties):
    return {"if": {"properties": {field: {"enum": values}}, "required": [field]},
            "then": {"properties": properties}}


def union(schemas, name, field, branches):
    schemas[name] = {"oneOf": [ref(target) for target in branches.values()],
                     "discriminator": {"propertyName": field,
                                       "mapping": {wire: ref(target)["$ref"] for wire, target in branches.items()}}}


def register_workflow_schemas(s):
    s["ReviewProcessingStage"] = enum(*STAGES)
    s["ReviewResult"] = enum("VALID", "INVALID")
    s["PublicReviewReason"] = obj({"code": enum(*REASONS, "SUPPLEMENT_DEADLINE_MISSED"),
                                   "label": ref("LocalizedText")},
                                  "Fixed bilingual classification; publicComment is separate original teacher text, never a hidden note.")
    s["PublicReviewReason"]["allOf"] = [
        when("code", [code], {"label": obj({"zh": literal(zh), "en": literal(en)})})
        for code, (zh, en, _) in REASONS.items()
    ] + [when("code", ["SUPPLEMENT_DEADLINE_MISSED"], {"label": obj({"zh": literal("补证逾期"), "en": literal("Supplementary evidence deadline missed")})})]
    s["MaterialManifestItem"] = obj({"mediaAssetId": UUID, "position": integer_schema(fmt="int32", minimum=0, maximum=6),
                                      "phase": enum("GENERAL", "BEFORE", "AFTER"), "checksumSha256": SHA256},
                                     "Immutable declared byte identity. Asset Owner probes actual bytes. Asset and position must each be unique within a version; a phase label is not proof of capture time.")
    s["MaterialManifest"] = array_of(ref("MaterialManifestItem"), min_items=1, max_items=7)
    s["MaterialManifest"]["uniqueItems"] = True
    s["MaterialVersion"] = obj({
        "materialVersionId": UUID, "recordId": UUID, "batchId": UUID,
        "versionNo": {"type": "integer", "enum": [1, 2]}, "previousMaterialVersionId": nullable(UUID),
        "returnActionId": nullable(UUID), "items": ref("MaterialManifest"), "acceptedAt": INSTANT,
        "transferDueAt": nullable(INSTANT), "transferCompletedAt": nullable(INSTANT),
        "readiness": enum("PENDING_TRANSFER", "VERIFYING", "READY", "TECHNICAL_PROCESSING", "TRANSFER_DEADLINE_MISSED", "REJECTED"),
        "version": VERSION,
    }, "One immutable manifest plus evolving readiness. READY requires every locked object verified. Full-precision authoritative transfer completion is independent of later HTTP finalization/probe time. Supplement version2 has no additional transfer grace.")
    s["MaterialVersion"]["allOf"] = [
        when("versionNo", [1], {"previousMaterialVersionId": {"type": "null"}, "returnActionId": {"type": "null"}}),
        when("versionNo", [2], {"previousMaterialVersionId": UUID, "returnActionId": UUID,
                               "transferDueAt": {"type": "null"}, "readiness": literal("READY"), "transferCompletedAt": INSTANT}),
        when("readiness", ["READY", "VERIFYING"], {"transferCompletedAt": INSTANT}),
    ]
    s["TimerPause"] = obj({"kind": enum(*POLICY["pause"]["sources"]), "referenceId": UUID, "revision": VERSION,
                            "startedAt": INSTANT, "endedAt": nullable(INSTANT)},
                           "Authorized public timing evidence only; no incident payload, provider detail, or personal data. Intervals are half-open and overlap is counted once.")
    s["SchoolCalendarReference"] = obj({"calendarId": UUID, "revision": VERSION, "coverageStart": LOCAL_DATE,
                                         "coverageEndExclusive": LOCAL_DATE, "timezone": literal("Asia/Shanghai")},
                                        "Owner-confirmed calendar identity pinned to the round. This reference is not the official calendar dataset.")
    s["TeacherReviewSla"] = obj({
        "roundNo": {"type": "integer", "enum": [1, 2]}, "startedAt": INSTANT, "endedAt": nullable(INSTANT),
        "budgetSeconds": {"type": "integer", "const": 172800}, "calendar": nullable(ref("SchoolCalendarReference")),
        "calculationStatus": enum("AVAILABLE", "PAUSED", "UNAVAILABLE"),
        "unavailableReason": nullable(enum("CALENDAR_MISSING", "CALENDAR_COVERAGE_INCOMPLETE", "TIMING_SOURCE_UNAVAILABLE")),
        "consumedSeconds": nullable(number_schema(minimum=0)), "remainingSeconds": nullable(number_schema(minimum=0, maximum=172800)),
        "effectiveDueAt": nullable(INSTANT), "overdue": nullable({"type": "boolean"}),
        "pauses": array_of(ref("TimerPause")), "sourceRevision": VERSION, "version": VERSION,
    }, "Two full confirmed school-working days, not 48 wall-clock hours. Only confirmed Shanghai day intervals count; subtract the pause union intersection. Overdue never invalidates a student's record.")
    s["TeacherReviewSla"]["allOf"] = [
        when("calculationStatus", ["UNAVAILABLE"], {"consumedSeconds": {"type": "null"}, "remainingSeconds": {"type": "null"},
               "effectiveDueAt": {"type": "null"}, "overdue": {"type": "null"}, "unavailableReason": {"type": "string"}}),
        when("calculationStatus", ["AVAILABLE", "PAUSED"], {"calendar": ref("SchoolCalendarReference"), "consumedSeconds": number_schema(minimum=0),
             "remainingSeconds": number_schema(minimum=0, maximum=172800), "overdue": {"type": "boolean"}, "unavailableReason": {"type": "null"}}),
        when("calculationStatus", ["AVAILABLE"], {"effectiveDueAt": INSTANT}),
        when("calculationStatus", ["PAUSED"], {"effectiveDueAt": {"type": "null"}}),
    ]
    s["SupplementTimerView"] = obj({
        "timerId": UUID, "returnActionId": UUID, "budgetHours": {"type": "integer", "enum": [24, 72]},
        "startedAt": INSTANT, "originalDueAt": INSTANT,
        "state": enum("ACTIVE", "PAUSED", "ACCEPTED", "EXPIRED", "UNAVAILABLE"),
        "remainingSeconds": nullable(number_schema(minimum=0, maximum=259200)), "effectiveDueAt": nullable(INSTANT),
        "acceptedMaterialVersionId": nullable(UUID), "pauses": array_of(ref("TimerPause")),
        "sourceRevision": VERSION, "version": VERSION,
    }, "Only one normal timer. Current projection may be restored by an append-only confirmed-fault correction; original EXPIRED event remains. No new full budget and return-used never resets. Acceptance ends student timing, not teacher review.")
    s["SupplementTimerView"]["allOf"] = [
        when("state", ["ACTIVE"], {"remainingSeconds": number_schema(minimum=0, maximum=259200), "effectiveDueAt": INSTANT}),
        when("state", ["PAUSED"], {"remainingSeconds": number_schema(minimum=0, maximum=259200), "effectiveDueAt": {"type": "null"}}),
        when("state", ["UNAVAILABLE"], {"remainingSeconds": {"type": "null"}, "effectiveDueAt": {"type": "null"}}),
        when("state", ["ACCEPTED"], {"acceptedMaterialVersionId": UUID}),
        when("state", ["ACTIVE", "PAUSED", "EXPIRED", "UNAVAILABLE"], {"acceptedMaterialVersionId": {"type": "null"}}),
        when("budgetHours", [24], {"remainingSeconds": nullable(number_schema(minimum=0, maximum=86400))}),
    ]
    s["RecordReviewSummary"] = obj({
        "reviewCaseId": nullable(UUID), "processingStage": ref("ReviewProcessingStage"), "result": nullable(ref("ReviewResult")),
        "publicReason": nullable(ref("PublicReviewReason")), "publicComment": nullable(string_schema(min_length=1)),
        "roundNo": nullable({"type": "integer", "enum": [1, 2]}), "materialVersionId": UUID,
        "supplementReturnUsed": {"type": "boolean"}, "supplementTimer": nullable(ref("SupplementTimerView")),
        "teacherSla": nullable(ref("TeacherReviewSla")), "sequenceNumber": integer_schema(minimum=0),
        "updatedAt": INSTANT, "version": VERSION,
    }, "Result is null in every nonterminal stage, including a teacher return. Technical failure is not a completed check. There is no actionable review Case before complete material is ready.")
    s["RecordReviewSummary"]["allOf"] = [
        when("supplementReturnUsed", [False], {"supplementTimer": {"type": "null"}}),
        when("roundNo", [2], {"supplementReturnUsed": {"const": True}}),
        when("processingStage", [x for x in STAGES if x not in ("VALID", "INVALID")], {"result": {"type": "null"}}),
        when("processingStage", ["VALID"], {"result": literal("VALID"), "publicReason": {"type": "null"}}),
        when("processingStage", ["INVALID"], {"result": literal("INVALID"), "publicReason": ref("PublicReviewReason")}),
        when("processingStage", ["MATERIAL_PROCESSING"], {"reviewCaseId": {"type": "null"}, "roundNo": {"type": "null"}, "teacherSla": {"type": "null"}}),
        when("processingStage", [x for x in STAGES if x != "MATERIAL_PROCESSING"], {"reviewCaseId": UUID, "roundNo": {"type": "integer", "enum": [1, 2]}}),
        when("processingStage", ["SUPPLEMENT_REQUIRED", "SUPPLEMENT_REVIEW_REQUIRED"], {"supplementReturnUsed": {"const": True}, "supplementTimer": ref("SupplementTimerView")}),
        when("processingStage", ["SUPPLEMENT_REQUIRED"], {"teacherSla": {"type": "null"}, "roundNo": {"const": 1}, "publicReason": ref("PublicReviewReason")}),
        when("processingStage", ["SUPPLEMENT_REVIEW_REQUIRED"], {"roundNo": {"const": 2}}),
        when("processingStage", ["TEACHER_REVIEW_REQUIRED", "SUPPLEMENT_REVIEW_REQUIRED"], {"teacherSla": ref("TeacherReviewSla")}),
        when("processingStage", ["SYSTEM_CHECK_PENDING", "AI_REVIEW_PENDING", "TECHNICAL_PROCESSING"], {"teacherSla": {"type": "null"}}),
    ]
    s["RecordReviewSummary"]["allOf"].append(when("processingStage", ["SUPPLEMENT_REVIEW_REQUIRED"], {
        "supplementTimer": {"type": "object", "properties": {"state": literal("ACCEPTED")}}}))
    for stage, action in [("SUPPLEMENT_REQUIRED", "RETURN_SUPPLEMENT"), ("INVALID", "INVALID")]:
        codes = [code for code, (_, _, actions) in REASONS.items() if action in actions]
        if stage == "INVALID":
            codes.append("SUPPLEMENT_DEADLINE_MISSED")
        s["RecordReviewSummary"]["allOf"].append(when("processingStage", [stage], {"publicReason": {"type": "object", "properties": {"code": enum(*codes)}}}))
    s["ExerciseRecord"] = obj({
        "recordId": UUID, "sessionId": UUID, "courseId": UUID, "enrollmentId": UUID, "student": ref("StudentSummary"),
        "businessDate": LOCAL_DATE, "category": ref("ExerciseCategory"), "description": string_schema(min_length=1, max_length=200),
        "activityType": enum("STANDARD", "SWIMMING"), "actualDurationSeconds": integer_schema(minimum=0),
        "currentMaterial": ref("MaterialVersion"), "currentReview": ref("RecordReviewSummary"), "submittedAt": INSTANT,
    }, "Immutable original exercise identity, duration, category and date; mutable material/review projections remain separate. First acceptance does not mean VALID or counted progress. Full eligible/countable-minute projection is supplied by the separate statistics contract in Phase5 step4.")
    branches = {}
    for wire, name in [("ORDINARY", "SubmitOrdinaryExerciseRecordRequest"), ("SWIMMING_TIMELY", "SubmitSwimmingExerciseRecordRequest"),
                       ("SWIMMING_OFFLINE", "SubmitOfflineSwimmingExerciseRecordRequest")]:
        props = {"submissionRoute": literal(wire), "category": ref("ExerciseCategory"), "description": string_schema(min_length=1, max_length=200),
                 "items": ref("MaterialManifest"), "expectedSessionVersion": VERSION}
        if wire == "SWIMMING_OFFLINE":
            props["delayExplanation"] = string_schema(min_length=1)
        s[name] = obj(props, "Server validates the actual activity/evidence requirements. Route selection cannot relabel swimming to bypass its rules. No client formal times, duration, result, or private notes.")
        branches[wire] = name
    union(s, "SubmitExerciseRecordRequest", "submissionRoute", branches)
    s["FirstMaterialAcceptance"] = obj({"receiptId": UUID, "recordId": UUID, "sessionId": UUID,
        "submissionRoute": enum(*branches), "firstDueAt": INSTANT, "acceptedAt": INSTANT, "material": ref("MaterialVersion")},
        "The original atomic acceptance receipt is replayed unchanged after successful authentication and original ownership checks. Later readiness is read separately. Offline swimming requires all material ready within its 24h window and enters teacher review.")
    s["FirstMaterialAcceptance"]["allOf"] = [
        when("submissionRoute", ["ORDINARY", "SWIMMING_TIMELY"], {"material": {"type": "object", "properties": {"versionNo": {"const": 1}, "transferDueAt": INSTANT}}}),
        when("submissionRoute", ["SWIMMING_OFFLINE"], {"material": {"type": "object", "properties": {"versionNo": {"const": 1}, "readiness": literal("READY"), "transferCompletedAt": INSTANT, "transferDueAt": {"type": "null"}}}}),
    ]
    s["FirstMaterialEligibility"] = obj({"sessionId": UUID, "serverNow": INSTANT, "endedAt": INSTANT,
        "ordinaryFirstDueAt": INSTANT, "swimmingTimelyDueAt": INSTANT, "swimmingOfflineDueAt": INSTANT,
        "eligibleHistoricalChain": {"type": "boolean"}, "firstReceipt": nullable(ref("FirstMaterialAcceptance")),
        "sessionVersion": VERSION},
        "Read-only deadlines for an owned completed legal Session. Eligibility is rechecked atomically on writes; time and identity alone do not prove evidence or activity. An existing first receipt is not required to preserve a pre-closure/removal legal Session's window.")
    s["CompleteRecordMaterialRequest"] = obj({"batchId": UUID, "expectedMaterialVersion": VERSION,
        "delayExplanation": nullable(string_schema(min_length=1))},
        "No supplied completion timestamp. Null for normal completion. Non-null explanation is consumed only for swimming personal-delay handling of this original locked batch before endedAt+24h, with existing material; no replacement batch or automatic pass.")
    s["MaterialCompletionReceipt"] = obj({"receiptId": UUID, "material": ref("MaterialVersion"), "review": ref("RecordReviewSummary")})
    s["MaterialCompletionReceipt"]["allOf"] = [{"properties": {
        "material": {"type": "object", "properties": {"readiness": literal("READY")}},
        "review": {"type": "object", "properties": {"processingStage": enum(*[v for v in STAGES if v != "MATERIAL_PROCESSING"])}}
    }}]
    s["RecordUploadAuthorizationRequest"] = obj({"materialVersionId": UUID, "batchId": UUID, "expectedMaterialVersion": VERSION})
    s["RecordUploadAuthorization"] = obj({"mediaAssetId": UUID, "materialVersionId": UUID, "batchId": UUID,
        "checksumSha256": SHA256, "uploadUrl": string_schema(fmt="uri"), "uploadMethod": ref("DirectUploadHttpMethod"),
        "requiredHeaders": {"type": "object", "additionalProperties": {"type": "string"}}, "expiresAt": INSTANT},
        "Only the original immutable object, exact headers/PUT/checksum and remaining original transfer window. Expiring a signed URL does not expire an otherwise valid business receipt, and renewal never creates a new 30-minute window.")
    expected = {"expectedVersion": VERSION, "expectedRoundNo": {"type": "integer", "enum": [1, 2]}, "materialVersionId": UUID}
    branches = {}
    for wire, name in [("PASS", "PassExerciseRecordRequest"), ("RETURN_SUPPLEMENT", "ReturnExerciseRecordRequest"), ("INVALID", "InvalidateExerciseRecordRequest")]:
        props = {"action": literal(wire), **expected, "publicComment": nullable(string_schema(min_length=1))}
        optional = ()
        if wire != "PASS":
            props["reasonCode"] = enum(*[code for code, (_, _, actions) in REASONS.items() if wire in actions])
        if wire == "RETURN_SUPPLEMENT":
            props["windowHours"] = {"type": "integer", "enum": [24, 72], "default": 24}
            props["expectedRoundNo"] = {"type": "integer", "const": 1}
            optional = ("windowHours",)
        s[name] = obj(props, "Only a responsible teacher on the current actionable round. All required checks and established facts remain server preconditions; the body cannot assert they passed.", optional)
        branches[wire] = name
    union(s, "AppendRecordReviewRequest", "action", branches)
    s["SupplementRecordMaterialRequest"] = obj({**expected, "expectedRoundNo": {"type": "integer", "const": 1}, "returnActionId": UUID, "timerId": UUID,
        "expectedTimerVersion": VERSION, "expectedTimingSourceRevision": VERSION, "items": ref("MaterialManifest")},
        "materialVersionId is the original version1. All version2 media must be ready before formal acceptance; no added 30-minute grace. Reuse original assets only from this Record. Category/date/duration/session cannot be changed.")
    s["SupplementAcceptanceReceipt"] = obj({"receiptId": UUID, "acceptedAt": INSTANT, "material": ref("MaterialVersion"),
        "review": ref("RecordReviewSummary")}, "Single atomic material version2, accepted timer and new teacher round2 result, with original command replay.")
    s["SupplementAcceptanceReceipt"]["allOf"] = [{"properties": {
        "material": {"type": "object", "properties": {"versionNo": {"const": 2}, "readiness": literal("READY")}},
        "review": {"type": "object", "properties": {"processingStage": literal("SUPPLEMENT_REVIEW_REQUIRED"), "roundNo": {"const": 2}}}
    }}]
    s["ExpiryCorrectionFact"] = obj({
        "correctionId": UUID, "incidentReferenceId": UUID, "incidentRevision": VERSION, "correctedReviewId": UUID,
        "timerId": UUID, "expectedCaseVersion": VERSION, "expectedTimerVersion": VERSION,
        "roundNo": {"type": "integer", "enum": [1, 2]}, "materialVersionId": UUID,
        "originalBudgetHours": {"type": "integer", "enum": [24, 72]},
        "restoredRemainingSeconds": number_schema(minimum=0, maximum=259200),
        "entryRestoredAt": nullable(INSTANT), "restoredStage": ref("ReviewProcessingStage"),
        "supplementReturnUsed": {"type": "boolean", "const": True}, "createdAt": INSTANT,
    }, "Read-only public explanation of an authorized append-only correction, not an admin unlock request. Preserve original terminal and legal successors. No elapsed seconds accrue while the erroneous lock still prevents entry. An accepted later decision/settlement/correction conflict must fail targeted publication, not be overwritten.")
    s["ExpiryCorrectionFact"]["allOf"] = [when("originalBudgetHours", [24], {"restoredRemainingSeconds": number_schema(minimum=0, maximum=86400)})]
    s["RecordReview"] = obj({"reviewId": UUID, "recordId": UUID, "materialVersionId": UUID,
        "sequenceNumber": integer_schema(minimum=0), "roundNo": {"type": "integer", "enum": [1, 2]},
        "source": enum("SYSTEM_AI", "TEACHER", "TEACHER_RETURN", "SYSTEM_EXPIRY", "AUTHORIZED_CORRECTION", "PLATFORM_FAULT_CORRECTION"),
        "fromResult": nullable(ref("ReviewResult")), "result": nullable(ref("ReviewResult")),
        "reviewer": nullable(ref("TeacherSummary")), "publicReason": nullable(ref("PublicReviewReason")),
        "publicComment": nullable(string_schema(min_length=1)), "correctedReviewId": nullable(UUID),
        "expiryCorrection": nullable(ref("ExpiryCorrectionFact")), "occurredAt": INSTANT,
    }, "Append-only decisions, teacher return actions and corrections. A return has null result, never a fabricated INVALID decision. No hidden note or AI provider payload is exposed.")
    s["RecordReview"]["allOf"] = [
        when("source", ["TEACHER_RETURN"], {"result": {"type": "null"}, "publicReason": ref("PublicReviewReason"), "reviewer": ref("TeacherSummary")}),
        when("source", ["SYSTEM_AI"], {"result": literal("VALID"), "publicReason": {"type": "null"}, "reviewer": {"type": "null"}}),
        when("source", ["SYSTEM_EXPIRY"], {"result": literal("INVALID"), "reviewer": {"type": "null"},
              "publicReason": {"allOf": [ref("PublicReviewReason"), {"properties": {"code": literal("SUPPLEMENT_DEADLINE_MISSED")}}]}}),
        when("source", ["PLATFORM_FAULT_CORRECTION"], {"expiryCorrection": ref("ExpiryCorrectionFact"), "correctedReviewId": UUID, "reviewer": {"type": "null"}}),
        when("source", ["TEACHER", "AUTHORIZED_CORRECTION"], {"result": ref("ReviewResult"), "reviewer": ref("TeacherSummary")}),
        when("source", ["AUTHORIZED_CORRECTION"], {"correctedReviewId": UUID}),
        when("source", ["SYSTEM_AI", "TEACHER", "TEACHER_RETURN", "SYSTEM_EXPIRY", "AUTHORIZED_CORRECTION"], {"expiryCorrection": {"type": "null"}}),
    ]
    s["RecordReview"]["allOf"] += [
        when("source", ["TEACHER_RETURN"], {"publicReason": {"type": "object", "properties": {"code": enum(*[c for c, (_, _, a) in REASONS.items() if "RETURN_SUPPLEMENT" in a])}}}),
        when("result", ["INVALID"], {"publicReason": {"type": "object", "properties": {"code": enum(*[c for c, (_, _, a) in REASONS.items() if "INVALID" in a], "SUPPLEMENT_DEADLINE_MISSED")}}}),
        when("result", ["VALID"], {"publicReason": {"type": "null"}}),
        when("source", ["TEACHER", "AUTHORIZED_CORRECTION"], {"publicReason": {"anyOf": [{"type": "null"}, {"type": "object", "properties": {"code": enum(*[c for c, (_, _, a) in REASONS.items() if "INVALID" in a])}}]}}),
    ]
    s["ReviewActionReceipt"] = obj({"receiptId": UUID, "event": ref("RecordReview"), "review": ref("RecordReviewSummary")},
        "For TEACHER_RETURN, event.reviewId is the timer/material returnActionId. The snapshot is the original committed result, not a later current-state reread.")
    branches = {}
    for wire, name in [("VALID", "CorrectExerciseRecordValidRequest"), ("INVALID", "CorrectExerciseRecordInvalidRequest")]:
        props = {"result": literal(wire), **expected, "correctedReviewId": UUID, "publicComment": string_schema(min_length=1)}
        if wire == "INVALID":
            props["reasonCode"] = enum(*[code for code, (_, _, actions) in REASONS.items() if "INVALID" in actions])
        s[name] = obj(props, "Correct a terminal judgment using existing established facts, preserving material and original decisions. This command cannot restore supplementary entry or impersonate a platform-fault correction.")
        branches[wire] = name
    union(s, "CorrectExerciseRecordReviewRequest", "result", branches)
    s["TeacherReviewQueueItem"] = obj({"queueItemId": UUID, "record": ref("ExerciseRecord"), "reviewRoundNo": {"type": "integer", "enum": [1, 2]},
        "sourceRevision": VERSION}, "One active item per Case/round; only TEACHER_REVIEW_REQUIRED or SUPPLEMENT_REVIEW_REQUIRED. AI/technical/student-wait states are not teacher todo items.")
    s["TeacherReviewQueueItem"]["allOf"] = [{"properties": {"record": {"type": "object", "properties": {
        "currentReview": {"type": "object", "properties": {"processingStage": enum("TEACHER_REVIEW_REQUIRED", "SUPPLEMENT_REVIEW_REQUIRED")}}
    }}}}]
    for name, target in [("ExerciseRecordPage", "ExerciseRecord"), ("RecordReviewPage", "RecordReview"),
                         ("MaterialVersionPage", "MaterialVersion"), ("TeacherReviewQueuePage", "TeacherReviewQueueItem")]:
        add_paged_schema(s, name, target)
    s["ReviewNotificationContext"] = obj({"recordId": UUID, "reviewSequenceNumber": integer_schema(minimum=0),
        "processingStage": ref("ReviewProcessingStage"), "publicReason": nullable(ref("PublicReviewReason")),
        "publicComment": nullable(string_schema(min_length=1))},
        "Recipient-authorized immutable event projection using the same source as review detail. Read state never starts/stops timers. Current state is reloaded from the Record.")


REPLAY = (" Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay "
          "returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, "
          "versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. "
          "Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, "
          "notification/audit outbox and the receipt; no partial success.")
OWNED = (" Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course "
         "closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; "
         "permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; "
         "do not require a currently active Enrollment, create a new Session, reset a deadline or move courses.")


def register_workflow_operations(r: ContractRegistry):
    def add(method, path, operation_id, summary, description, response, request=None, teacher=False, parameters=None, errors=(), status=200, shared=False):
        params = list(parameters or [])
        if not parameters:
            import re
            params = [path_parameter(x) for x in re.findall(r"{(.*?)}", path)]
        r.add(method=method, path=path, operation_id=operation_id, tag="Exercise records", summary=summary,
              description=description + (REPLAY if request else ""), roles=["STUDENT", "TEACHER"] if shared else (["TEACHER"] if teacher else ["STUDENT"]),
              success_schema=response, success_status=status, request_schema=request, parameters=params,
              resource_scope="RECORD_OWNER_OR_RESPONSIBLE_TEACHER" if shared else ("RESPONSIBLE_TEACHER_ORIGINAL_COURSE" if teacher else "SELF_ORIGINAL_SESSION_RECORD"),
              idempotent=bool(request), error_codes=list(errors))
        if request:
            r.paths[path][method]["x-system-mode-replay"] = "AUTHORIZED_COMMITTED_RESULT_ONLY"
            r.paths[path][method]["x-idempotency"]["evaluationOrder"] = POLICY["replayOrder"]

    add("get", "/exercise-sessions/{sessionId}/material-eligibility", "getFirstMaterialEligibility", "Read original first-material windows",
        "Uses the completed Session's persisted endedAt and full-precision server clock." + OWNED, "FirstMaterialEligibility", errors=["SESSION_TRANSITION_INVALID"])
    add("post", "/exercise-sessions/{sessionId}/record", "submitExerciseRecord", "Accept and lock first material",
        "Ordinary acceptedAt < endedAt+24h; swimming timely acceptedAt < endedAt+15m. Lock all declared asset IDs/checksums/positions and create "
        "one immutable Record/material version1, independently of all bytes arriving. Required objects must finish < acceptedAt+30m. "
        "Swimming completely-offline path requires already-ready original evidence and a public delay explanation before endedAt+24h, entering teacher review. "
        "All endpoints are strict; equal is too late. No immediate VALID or counted minutes. One formal Record per Session; a separate legal new Session "
        "is not rejected merely because another Record exists on that day. All routes check actual activity/evidence facts and cannot be used to relabel swimming." + OWNED,
        "FirstMaterialAcceptance", "SubmitExerciseRecordRequest", errors=["SESSION_TRANSITION_INVALID", "VERSION_CONFLICT", "FIRST_MATERIAL_DEADLINE_MISSED",
        "FIRST_MATERIAL_ALREADY_ACCEPTED", "MATERIAL_BATCH_CONFLICT", "MEDIA_NOT_VERIFIED", "MEDIA_OWNERSHIP_MISMATCH", "MEDIA_ALREADY_BOUND",
        "MEDIA_LIMIT_EXCEEDED", "MEDIA_CONTENT_INVALID", "RECORD_DESCRIPTION_INVALID"], status=201)
    add("get", "/exercise-records/{recordId}/materials", "listRecordMaterials", "Read original and supplementary material versions",
        "Owner or responsible teacher reads immutable version1/2 manifests and current readiness. Teacher may inspect original material when reviewing version2; no cross-teacher authority." + OWNED, "MaterialVersionPage",
        parameters=[path_parameter("recordId"), *cursor_parameters(default_limit=20, maximum_limit=100)], shared=True)
    add("get", "/exercise-records/{recordId}/materials/{materialVersionId}", "getRecordMaterial", "Read locked material readiness",
        "Owner or responsible teacher; both identifiers must match the same scoped Record. Missing readiness is not READY." + OWNED, "MaterialVersion", shared=True)
    add("post", "/exercise-records/{recordId}/materials/{materialVersionId}/completion", "completeExerciseRecordMaterial", "Confirm complete verified locked material",
        "Check the exact locked collection and every Asset Owner's authoritative byte completion/version/checksum/format evidence. All objects must have "
        "completed strictly before the original transfer deadline; HTTP call/probe finishing later does not invalidate proven on-time bytes. "
        "Missing bytes returns MATERIAL_NOT_READY; unavailable evidence/probe returns DEPENDENCY_UNAVAILABLE, never an INVALID review. "
        "A personally late swimming original batch, ready before endedAt+24h with delayExplanation, enters teacher exception review without replacing the batch; "
        "ordinary requests cannot consume that exception. Confirmed platform faults remain technical facts until an authorized resolution; do not automatically punish. "
        "Successful material readiness and Case handoff form one committed result." + OWNED,
        "MaterialCompletionReceipt", "CompleteRecordMaterialRequest", errors=["VERSION_CONFLICT", "MATERIAL_BATCH_CONFLICT", "MATERIAL_NOT_READY",
        "MATERIAL_TRANSFER_DEADLINE_MISSED", "MEDIA_OWNERSHIP_MISMATCH", "MEDIA_CONTENT_INVALID", "MEDIA_LIMIT_EXCEEDED"])
    add("post", "/media-assets/{mediaAssetId}/record-upload-authorization", "renewRecordUploadAuthorization", "Authorize original locked-object continuation",
        "Reauthorize only the same originally locked asset and checksum, before its original transfer deadline; no object replacement, new media or full-window reset. "
        "After complete immutable object receipt do not authorize overwrite. Authorization lifetime is bounded by the remaining business window." + OWNED,
        "RecordUploadAuthorization", "RecordUploadAuthorizationRequest", errors=["VERSION_CONFLICT", "MATERIAL_BATCH_CONFLICT", "MATERIAL_TRANSFER_DEADLINE_MISSED", "MEDIA_OWNERSHIP_MISMATCH"])
    for teacher in [False, True]:
        path = "/courses/{courseId}/exercise-records" if teacher else "/student/exercise-records"
        params = [path_parameter("courseId"), query_parameter("studentId", UUID)] if teacher else [query_parameter("courseId", UUID)]
        params += [query_parameter("reviewResult", ref("ReviewResult")), query_parameter("processingStage", ref("ReviewProcessingStage")), *cursor_parameters(default_limit=20, maximum_limit=100)]
        add("get", path, "listCourseExerciseRecords" if teacher else "listOwnExerciseRecords", "List scoped records and review stages",
            "Newest-first stable keyset order (submittedAt, recordId); cursor binds filters and actor scope. Intermediate states are not INVALID. "
            "No scores, grades, ranks, hidden remarks or internal AI data. Failed pages are errors, never empty success.", "ExerciseRecordPage", teacher=teacher, parameters=params)
        add("get", path + "/{recordId}", "getCourseExerciseRecord" if teacher else "getOwnExerciseRecord", "Read original record and current processing",
            "Includes original facts, current material and public review/timing projection. Preserve authorized historical access after closure/removal. "
            "All identifiers must match the original scoped resource; course closure does not grant another teacher authority.", "ExerciseRecord", teacher=teacher)
    add("get", "/courses/{courseId}/review-queue", "listTeacherReviewQueue", "Read deduplicated teacher review todo",
        "Only current actionable round1/2 items; stable keyset by queue entry time and queueItemId, one item per Case/round. "
        "AI, technical and student-supplement waits are excluded. Opening/refreshing does not reset SLA. Scope/revision changes invalidate cursor, not silently omit records.",
        "TeacherReviewQueuePage", teacher=True, parameters=[path_parameter("courseId"), *cursor_parameters(default_limit=20, maximum_limit=100)])
    add("post", "/courses/{courseId}/exercise-records/{recordId}/reviews", "appendExerciseRecordReview", "Act on the current teacher review round",
        "PASS/RETURN_SUPPLEMENT/INVALID only. Require current Case/round/material, responsible teacher and all action preconditions. "
        "If prescribed checks and review are complete, none of the six invalid reasons applies and only unproven doubts remain, finish VALID. "
        "Technical failures/incomplete checks do not meet that condition. First return permanently sets supplementReturnUsed, ends current SLA, "
        "and starts the one total 24h(default)/72h student timer. Return is not INVALID. Round2 permits PASS/INVALID only; old AI callbacks cannot override it. "
        "Same-source public reason and original publicComment appear in detail/notifications; no hidden note.", "ReviewActionReceipt", "AppendRecordReviewRequest", teacher=True,
        errors=["VERSION_CONFLICT", "REVIEW_ACTION_NOT_ALLOWED", "REVIEW_PRECONDITION_UNSATISFIED"], status=201)
    add("post", "/exercise-records/{recordId}/supplements", "submitExerciseRecordSupplement", "Accept the original one-time supplementary material",
        "Require SUPPLEMENT_REQUIRED, original return already used, active sole timer, current timing source and ready valid version2. "
        "acceptedAt must be strictly before effectiveDueAt; no added first-material/30m grace. Lock version2 and bind timer ACCEPTED, "
        "teacher round2/queue/new SLA in one transaction. Reuse original assets only on this same Record; 0-6 images/0-1 video, "
        "1-7 items, 250MiB per current version, swimming before/after photos. History does not cumulatively consume a version's allowance. "
        "An on-time accepted package cannot expire while waiting for teacher review. Never create version3 or reset return-used." + OWNED,
        "SupplementAcceptanceReceipt", "SupplementRecordMaterialRequest", errors=["VERSION_CONFLICT", "SUPPLEMENT_NOT_ALLOWED", "SUPPLEMENT_DEADLINE_MISSED",
        "MEDIA_NOT_VERIFIED", "MEDIA_OWNERSHIP_MISMATCH", "MEDIA_ALREADY_BOUND", "MEDIA_CONTENT_INVALID", "MEDIA_LIMIT_EXCEEDED"], status=201)
    add("post", "/courses/{courseId}/exercise-records/{recordId}/review-corrections", "correctExerciseRecordReview", "Append a correction based on existing facts",
        "Responsible teacher only. Correct a referenced terminal judgment with exact expected Case/round/material binding and established facts. "
        "Keep original event and all legal successors; newer decision, settlement or correction conflict returns CORRECTION_CONFLICT for targeted review. "
        "No new material, third round, return opportunity or student extension. Confirmed platform-fault expiry restoration is a separate controlled Backend "
        "process, represented by read-only ExpiryCorrectionFact; this public command cannot impersonate it.", "ReviewActionReceipt", "CorrectExerciseRecordReviewRequest", teacher=True,
        errors=["VERSION_CONFLICT", "CORRECTION_CONFLICT", "REVIEW_ACTION_NOT_ALLOWED", "REVIEW_PRECONDITION_UNSATISFIED", "REVIEW_RESULT_UNCHANGED"], status=201)
    r.add(method="get", path="/exercise-records/{recordId}/reviews", operation_id="listExerciseRecordReviews", tag="Exercise records",
          summary="Read append-only decisions, return and correction events", description="Owner or responsible teacher only; stable sequence order. Preserves old terminal "
          "events after correction. No raw incident data or provider payload. Student sees only their own public classification and explanation.",
          roles=["STUDENT", "TEACHER"], success_schema="RecordReviewPage", parameters=[path_parameter("recordId"), *cursor_parameters(default_limit=20, maximum_limit=100)],
          resource_scope="RECORD_OWNER_OR_RESPONSIBLE_TEACHER")
