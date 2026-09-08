"""Step05 Contract construction: teaching drafts, governance and safe projections.

No OCR client, worker, persistence layer or authorization implementation lives here.
"""
from copy import deepcopy
from common import UUID, VERSION, INSTANT, LOCAL_DATE, SHA256, ref, nullable, integer_schema, number_schema, string_schema, path_parameter, query_parameter, cursor_parameters
from course_workflow import obj, enum, literal, text, count, array_of, when

NEW_ERRORS = {
    'TEACHING_SOURCE_INVALID':(422,'Authoritative source type/content/checksum or owner/purpose binding is invalid.'),
    'TEACHING_SOURCE_NOT_READY':(409,'Source bytes/probing or extraction result are not ready.'),
    'TEACHING_BATCH_NOT_REVIEWABLE':(409,'Batch is incomplete, technical-only or not in the original legal teaching scope.'),
    'TEACHING_ROW_UNRESOLVED':(409,'A required row has unresolved identity, time, date, event or source issues.'),
    'TEACHING_DUPLICATE_IDENTITY':(409,'Source-row or stable student identity is repeated; never silently deduplicate.'),
    'TEACHING_SOURCE_STALE':(412,'Batch, row, roster, identity, enrollment, rule or outcome source version changed.'),
    'TEACHING_SOURCE_UNAVAILABLE':(503,'A necessary complete protected teaching source is unavailable.'),
    'ENDURANCE_CONVERSION_UNAVAILABLE':(409,'No unique authoritative matching rule; no selected measurement may commit.'),
    'TECHNICAL_SERVICE_REFERENCE_INVALID':(422,'Connection, credential, model or policy reference is absent or not authorized for this purpose/scope.'),
    'TECHNICAL_SERVICE_VALIDATION_REQUIRED':(409,'Automatic VLM approval requires accepted school-sample evidence matching this exact revision and policy.'),
    'MANUAL_WINDOW_CONFLICT':(409,'Manual window is already open or the referenced current window cannot close.'),
    'PROJECTION_NOT_READY':(409,'The complete source-bound projection/export is not ready.'),
}
PURPOSES=['VLM_REVIEW','ROSTER_OCR','ENDURANCE_OCR']
BATCH_STATES=['PARSING','REVIEW_REQUIRED','PARTIALLY_CONFIRMED','COMPLETED','FAILED_TECHNICAL']
ISSUES=['UNREADABLE','MISSING_REQUIRED_FIELD','LOW_CONFIDENCE','DUPLICATE_IDENTITY','IDENTITY_CONFLICT','UNMATCHED_STUDENT','WRONG_ROW','EVENT_GENDER_MISMATCH','AMBIGUOUS_TIME_FORMAT','MISSING_TEST_DATE','RULE_MATCH_UNAVAILABLE']
POLICY={
    'roster':{'sourceKinds':['XLSX','CSV','PAPER_SCAN'],'maximumSourceBytes':104857600,'maximumPersonnelRows':500,
        'countErrorsAndDuplicates':True,'publishRequires':'ALL_IDENTITY_ROWS_CONFIRMED_OR_REASONED_EXCLUDED_AND_UNIQUE_IDENTITIES',
        'matching':'STUDENT_NUMBER_PRIMARY_NAME_VERIFIED','equalCountsProveIdentity':False,'createsMembership':False,'rollback':'CURRENT_ROSTER_POINTER_ONLY'},
    'endurance':{'ambiguous430':'BLOCK_UNTIL_EXPLICIT_TEACHER_INTERPRETATION','wireTime':'NONNEGATIVE_INTEGER_SECONDS',
        'selectedRows':'NO_DUPLICATE_IDS_ALL_VERSIONS_AND_SOURCES_CHECKED_BEFORE_ATOMIC_COMMIT','unselectedRows':'UNCHANGED_PENDING',
        'missingOrMultipleRuleMatch':'REJECT_WHOLE_COMMAND','correction':'APPEND_MEASUREMENT_AND_CONVERSION_WITH_PREDECESSOR_AND_REASON'},
    'extraction':{'inputBinding':['batchId','taskId','attemptNo','inputSha256','serviceRevisionId','policyVersion'],
        'lateResult':'NEVER_OVERWRITE_TEACHER_DECISION_OR_NEW_INPUT','technicalFailure':'NOT_BUSINESS_INVALID_OR_AUTOMATIC_PASS',
        'retry':'FINITE_POLICY_BOUND_ATTEMPTS','rawProviderOutputPublic':False},
    'governance':{'purposes':PURPOSES,'adminKind':'SUPER','subAdminIndirectGrant':False,'publicSecrets':False,'publicPrompts':False,
        'automaticVlmApproval':'ACCEPTED_REAL_SCHOOL_SAMPLE_EVIDENCE_BOUND_TO_EXACT_SERVICE_POLICY','statusMissingSource':'UNAVAILABLE_NOT_ZERO_OR_HEALTHY'},
    'manual':{'oneOpenWindowPerPurposeScope':True,'overlap':'ANY_APPLICABLE_ORGANIZATION_OR_COURSE_WINDOW_ROUTES_TO_MANUAL',
        'teacher':'ORIGINAL_RESPONSIBLE_TEACHER_ONLY','requiresHardChecks':True,'recovery':'UNDECIDED_TASKS_ONLY'},
    'projection':{'sources':['ROSTER','MEMBERSHIP','IDENTITY','ENDURANCE','REVIEWS','APPLICATIONS','STATISTICS','SETTLEMENT'],
        'complete':'OWNER_COMPLETE_SETS_NOT_EQUAL_TRUNCATED_LISTS','currentPublication':'SOURCE_AND_PREDECESSOR_PROTECTED_NO_SOURCE_WRITES',
        'export':'FIXED_PROJECTION_CONTENT_HASH_ROLE_SCOPE_AND_RECHECKED_DOWNLOAD'},
    'student':{'construction':'POSITIVE_ALLOWLIST_BEFORE_SERIALIZATION','forbidden':['gradeValue','finalGrade','score','level','rank','ranking','conversion','remark'],
        'notification':'CREATE_AND_READ_REJECT_ENTIRE_PROHIBITED_MESSAGE','cacheKey':['actorSubject','resourceScope','projectionSchemaVersion','sourceRevision'],
        'oldCache':'PURGE_OR_QUARANTINE_FAIL_CLOSED_NO_LEGACY_FALLBACK','telemetry':'NO_GRADE_VALUES_NOTIFICATIONS_RAW_MEDIA_SECRETS_OR_PROMPTS'},
    'legacyRemark':{'decision':'ACCEPTED_PHASE4_H19_7','businessSync':'APPLIED_USER_AUTHORIZED', 'readRole':'AUTHENTICATED_CURRENT_TEACHER', 'narrowByResponsibleTeacherMembershipOrGroup':False, 'newRemarkWrite':False, 'audit':['actorSubjectId','purpose','publicationId','serverReadAt']},
}


def page(s,name,item,extra=None):s[name]=obj({**(extra or {}),'items':array_of(ref(item)),'page':ref('CursorPage')})


def register_schemas(s):
    s['TeachingSourceAllocationRequest']=obj({'purpose':enum('ROSTER','ENDURANCE'),'sourceFormat':enum('XLSX','CSV','PAPER_SCAN'),
        'displayName':text(),'declaredContentType':enum('text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png'),
        'declaredByteSize':integer_schema(minimum=1),'expectedCourseVersion':VERSION},
        description='Teacher-only temporary source. Roster aggregate100MiB and500 personnel rows are fixed; every error/duplicate row counts. Endurance ingestion operational byte limits are returned in the allocation, not silently asserted to be roster business limits. Source declared metadata never substitutes for authoritative content probing. New input requires open course; accepted batch continuation retains original scope.')
    s['TeachingSourceAllocation']=obj({'sourceAssetId':UUID,'upload':ref('UploadAllocation'),'maximumAcceptedBytes':integer_schema(minimum=1),'version':VERSION})
    s['TeachingSourceFinalizeRequest']=obj({'expectedVersion':VERSION,'checksumSha256':SHA256})
    s['TeachingSourceAsset']=obj({'sourceAssetId':UUID,'courseId':UUID,'purpose':enum('ROSTER','ENDURANCE'),'sourceFormat':enum('XLSX','CSV','PAPER_SCAN'),
        'displayName':text(),'byteSize':integer_schema(minimum=1),'checksumSha256':SHA256,'status':enum('VERIFIED','BOUND'),
        'verifiedAt':INSTANT,'version':VERSION},description='Teacher-only verified source metadata; no object path or permanent URL. Paper image retained only under restricted review/history policy, never delivered to student or admin course directory. Electronic data is parsed directly, not OCR-rendered.')
    s['TeachingSourceReference']=obj({'sourceAssetId':UUID,'checksumSha256':SHA256,'expectedSourceVersion':VERSION})
    s['CreateTeachingBatchRequest']=obj({'sourceFormat':enum('XLSX','CSV','PAPER_SCAN'),'sources':array_of(ref('TeachingSourceReference'),min_items=1),
        'expectedCourseVersion':VERSION},description='One electronic file or one ordered paper source batch. Verify full aggregate bytes/row count, source ownership/purpose/checksum and unique asset identities before acceptance; source order is part of stable request identity. New acceptance requires open course; already accepted original batches remain operable after closure.')
    s['CreateTeachingBatchRequest']['allOf']=[when('sourceFormat',f,{'sources':{'maxItems':1}}) for f in ['XLSX','CSV']]
    s['ExtractionAttemptSummary']=obj({'taskId':UUID,'attemptNo':integer_schema(minimum=1),'inputSha256':SHA256,
        'serviceRevisionId':nullable(UUID),'policyVersion':text(),'state':enum('RUNNING','SUCCEEDED','FAILED','MANUAL_REQUIRED','STALE'),
        'failureCode':nullable(enum('TIMEOUT','UNAVAILABLE','PARSE_FAILED','INVALID_OUTPUT','RETRY_EXHAUSTED')),'startedAt':INSTANT,'finishedAt':nullable(INSTANT)},
        description='Safe teacher technical metadata. XLSX/CSV deterministic parser has null service revision. Late results cannot change original OCR text, teacher decision or formal fact. Retries bind immutable input/configuration; no provider prompt, key or raw payload.')
    s['TeachingBatchCounts']=obj({'sourcePersonnelRows':count(),'pendingRows':count(),'confirmedRows':count(),'excludedRows':count(),'formalRows':count()},
        description='Same complete source-set revision, errors and duplicate rows included. Counts unavailable until parsing completeness proven. Formal rows are committed facts, not OCR success. Completeness cannot be inferred from equal totals.')
    for name,kind in [('RosterImportBatch','ROSTER'),('EnduranceCaptureBatch','ENDURANCE')]:
        s[name]=obj({'batchId':UUID,'courseId':UUID,'kind':literal(kind),'sourceFormat':enum('XLSX','CSV','PAPER_SCAN'),
            'sources':array_of(ref('TeachingSourceAsset'),min_items=1),'inputSha256':SHA256,'state':enum(*BATCH_STATES),
            'counts':nullable(ref('TeachingBatchCounts')),'rowsSourceVersion':nullable(text()),'attempt':nullable(ref('ExtractionAttemptSummary')),
            'publishedRosterSnapshotId':nullable(UUID),'acceptedAt':INSTANT,'version':VERSION},description='State derived by owning module from full source rows, immutable teacher decisions and committed formal results. PARSING/technical failure never equals formal import. COMPLETED requires all rows terminal and formal publication/measurements; partial confirmation preserves outstanding rows. Historical completion receipt is not undone by later roster pointer changes.')
        if kind=='ROSTER':
            s[name]['allOf']=[when('state','COMPLETED',{'counts':ref('TeachingBatchCounts'),'rowsSourceVersion':text(),'publishedRosterSnapshotId':UUID})]
        else:
            s[name]['properties'].pop('publishedRosterSnapshotId')
            s[name]['required'].remove('publishedRosterSnapshotId')
        page(s,name+'Page',name)
    s['TeachingSourcePosition']=obj({'sourceAssetId':UUID,'pageNo':integer_schema(minimum=1),'rowNo':integer_schema(minimum=1)},description='Stable original page/row identity; duplicate source positions cannot be hidden by reordering or filtering.')
    s['DraftIdentityCandidate']=obj({'candidateId':UUID,'studentNumber':text(),'name':text(),'studentId':nullable(UUID),'enrollmentId':nullable(UUID),'identitySourceVersion':text()},
        description='Candidate for explicit identity check, never fuzzy-name authorization. Official roster identity may exist before account registration; null account/enrollment is not a reason to silently drop that roster row.')
    s['TeachingDraftIssue']=obj({'code':enum(*ISSUES),'field':text(),'message':ref('LocalizedText')})
    s['RosterDraftRow']=obj({'rowId':UUID,'batchId':UUID,'position':ref('TeachingSourcePosition'),'originalText':text(),
        'candidateStudentNumber':nullable(text()),'candidateName':nullable(text()),'confidenceHint':nullable(number_schema(minimum=0,maximum=1)),
        'identityCandidates':array_of(ref('DraftIdentityCandidate')),'issues':array_of(ref('TeachingDraftIssue')),
        'state':enum('REVIEW_REQUIRED','CONFIRMED','EXCLUDED'),'decisionId':nullable(UUID),'version':VERSION},description='Original extracted text is immutable. Confidence is an extraction hint, never a true accuracy measure or formal identity. Teacher decisions append; repeated/conflicting identities remain explicit.')
    page(s,'RosterDraftRowPage','RosterDraftRow',{'batchId':UUID,'rowsSourceVersion':text()})
    s['RosterIdentityConfirmation']=obj({'studentNumber':text(),'name':text(),'candidateId':nullable(UUID),'identitySourceVersion':text()},
        description='Explicit source-grounded identity; candidate is null only for a confirmed official identity without an existing account match. Server verifies source identity and absence of unresolved ambiguity, not just a caller boolean.')
    s['ResolveRosterDraftRowRequest']=obj({'action':enum('CONFIRM','EXCLUDE'),'expectedBatchVersion':VERSION,'expectedRowVersion':VERSION,
        'identity':nullable(ref('RosterIdentityConfirmation')),'reason':nullable(text())})
    s['ResolveRosterDraftRowRequest']['allOf']=[when('action','CONFIRM',{'identity':ref('RosterIdentityConfirmation')}),when('action','EXCLUDE',{'identity':{'type':'null'},'reason':text()})]
    s['PublishRosterBatchRequest']=obj({'expectedCourseVersion':VERSION,'expectedBatchVersion':VERSION,'expectedRowsSourceVersion':text(),'expectedCurrentSnapshotId':nullable(UUID)},
        description='Server loads all source rows, confirms terminal decisions and stable identity uniqueness, then atomically appends snapshot/entries/findings/completion, current pointer, receipt and audit/outbox. No caller allResolved or digest. All pages/source fragments must be complete; same-count different identities fail.')
    s['RosterBatchPublication']=obj({'batchId':UUID,'snapshot':ref('RosterSnapshot'),'rowsSourceVersion':text(),'publishedAt':INSTANT},description='Exact original success receipt; retry does not rerun extraction, substitute latest snapshot or move a newer pointer backward.')
    s['RosterSnapshot']['properties']['sourceFormat']=enum('XLSX','CSV','PAPER_SCAN')
    s['RosterSnapshot']['properties']['entryCount']['minimum']=0
    s['RosterSnapshot']['properties'].update({'sourceBatchId':nullable(UUID),'sourceRowCount':integer_schema(minimum=1,maximum=500),'rowsSourceVersion':text()})
    s['RosterSnapshot']['required']+=['sourceBatchId','sourceRowCount','rowsSourceVersion']
    s['RosterSnapshot']['description']='Immutable official source identity snapshot. entryCount counts confirmed unique identities, sourceRowCount preserves errors/duplicates/excluded rows. Empty confirmed set is not proof of registered completion. Legacy snapshot batch linkage is null only when the original fact lacks it, never invented by migration.'

    s['ResolvedEnduranceValues']=obj({'enrollmentId':UUID,'expectedEnrollmentVersion':VERSION,'distanceMeters':{'type':'integer','enum':[800,1000]},
        'testedOn':LOCAL_DATE,'timeRepresentation':enum('INTEGER_SECONDS','MM_SS'),'explicitTimeText':text(),'durationSeconds':integer_schema(minimum=0,fmt='int32'),
        'ruleTableId':UUID,'ruleRevisionNumber':integer_schema(minimum=1),'expectedOutcomeVersion':VERSION},
        description='Teacher supplies an unambiguous interpretation against original source. MM_SS must match integer seconds exactly; INTEGER_SECONDS text is the exact base10 second count. Original4.30 remains untouched. Server checks identity, event/gender/grade/date and exactly one rule before READY; current values/versions rechecked at selected-row commit.')
    s['ResolvedEnduranceValues']['allOf']=[when('timeRepresentation','MM_SS',{'explicitTimeText':{'pattern':'^[0-9]+:[0-5][0-9]$'}}),
        when('timeRepresentation','INTEGER_SECONDS',{'explicitTimeText':{'pattern':'^[0-9]+$'}})]
    s['EnduranceDraftRow']=obj({'rowId':UUID,'batchId':UUID,'position':ref('TeachingSourcePosition'),'originalText':text(),'originalTimeText':nullable(text()),
        'identityCandidates':array_of(ref('DraftIdentityCandidate')),'confidenceHint':nullable(number_schema(minimum=0,maximum=1)),
        'issues':array_of(ref('TeachingDraftIssue')),'state':enum('REVIEW_REQUIRED','READY','CONFIRMED','EXCLUDED'),
        'resolvedValues':nullable(ref('ResolvedEnduranceValues')),'decisionId':nullable(UUID),'measurementId':nullable(UUID),'version':VERSION},
        description='4.30 is AMBIGUOUS_TIME_FORMAT, never automatically270 or258 seconds. READY means teacher resolved all original issues, not a formal measurement. Formal confirmation is a separate atomic selection command; unselected rows remain unchanged.')
    s['EnduranceDraftRow']['allOf']=[when('state','READY',{'resolvedValues':ref('ResolvedEnduranceValues'),'issues':{'maxItems':0},'measurementId':{'type':'null'}}),
        when('state','CONFIRMED',{'resolvedValues':ref('ResolvedEnduranceValues'),'issues':{'maxItems':0},'measurementId':UUID}),when('state','EXCLUDED',{'measurementId':{'type':'null'}})]
    page(s,'EnduranceDraftRowPage','EnduranceDraftRow',{'batchId':UUID,'rowsSourceVersion':text()})
    s['ResolveEnduranceDraftRowRequest']=obj({'action':enum('RESOLVE','EXCLUDE'),'expectedBatchVersion':VERSION,'expectedRowVersion':VERSION,
        'resolvedValues':nullable(ref('ResolvedEnduranceValues')),'reason':text()},description='Append teacher interpretation or reasoned exclusion. Does not overwrite extraction text, accept raw OCR confidence as identity, or silently clear unresolved hard issues.')
    s['ResolveEnduranceDraftRowRequest']['allOf']=[when('action','RESOLVE',{'resolvedValues':ref('ResolvedEnduranceValues')}),when('action','EXCLUDE',{'resolvedValues':{'type':'null'}})]
    s['EnduranceSelectedRow']=obj({'rowId':UUID,'expectedRowVersion':VERSION,'resolvedValues':ref('ResolvedEnduranceValues')},description='Exact selected row identity and teacher-resolved semantic values/Owner versions. Server compares to current bound row; caller cannot substitute values after review.')
    s['ConfirmEnduranceRowsRequest']=obj({'expectedBatchVersion':VERSION,'expectedRowsSourceVersion':text(),'selectedRows':array_of(ref('EnduranceSelectedRow'),min_items=1)},
        description='Reject repeated row IDs even if other fields differ; never silently deduplicate. Check all selected rows, current identity/rule/outcome guards and unique conversion before any write. Full selection/dates/seconds/rule versions define stable idempotency. One failure rejects whole selection; unselected rows untouched.')
    s['EnduranceMeasurement']=obj({'measurementId':UUID,'enrollmentId':UUID,'distanceMeters':{'type':'integer','enum':[800,1000]},'durationSeconds':integer_schema(minimum=0,fmt='int32'),
        'testedOn':LOCAL_DATE,'conversion':ref('EnduranceConversion'),'sourceBatchId':nullable(UUID),'sourceRowId':nullable(UUID),
        'previousMeasurementId':nullable(UUID),'correctionReason':nullable(text()),'confirmedBy':ref('TeacherSummary'),'confirmedAt':INSTANT},
        description='Formal append-only original seconds/test-date and uniquely matched conversion snapshot. Subsequent rule changes never rewrite old conversion. Correction must reference prior fact and reason; no reverse derivation from score.')
    s['EnduranceMeasurement']['allOf']=[when('previousMeasurementId',None,{'correctionReason':{'type':'null'}}),
        {'if':{'properties':{'previousMeasurementId':{'type':'string'}},'required':['previousMeasurementId']},'then':{'properties':{'correctionReason':text()}}}]
    page(s,'EnduranceMeasurementPage','EnduranceMeasurement')
    s['EnduranceRowsConfirmation']=obj({'batchId':UUID,'measurements':array_of(ref('EnduranceMeasurement'),min_items=1),'batch':ref('EnduranceCaptureBatch'),'committedAt':INSTANT},
        description='Selected measurement/conversion/row/outcome pointers, receipt, audit/outbox committed together. Exact replay returns original set and original batch result; no new measurement or current-pointer rollback.')
    s['ConfirmEnduranceMeasurementRequest']=obj({'durationSeconds':integer_schema(minimum=0,fmt='int32'),'testedOn':LOCAL_DATE,
        'distanceMeters':{'type':'integer','enum':[800,1000]},'ruleTableId':UUID,'ruleRevisionNumber':integer_schema(minimum=1),
        'expectedEnrollmentVersion':VERSION,'expectedVersion':VERSION,'previousMeasurementId':nullable(UUID),'correctionReason':nullable(text())},
        description='Manual teacher entry/correction of an existing test. Server rechecks gender/grade/event/date, exactly one rule and outcome predecessor. Initial entry has null predecessor/reason; correcting a prior outcome requires original measurement and nonempty reason. No arbitrary OCR decimal notation or score input.')
    s['ConfirmEnduranceMeasurementRequest']['allOf']=deepcopy(s['EnduranceMeasurement']['allOf'])
    s['EnduranceOutcome']['properties'].update({'measurementId':nullable(UUID),'testedOn':nullable(LOCAL_DATE)})
    s['EnduranceOutcome']['required']+=['measurementId','testedOn']
    s['EnduranceOutcome']['description']='Teacher-only measured time, date and conversion/exception result; confirmed new measurements require one unique conversion. Legacy missing conversion remains explicitly null rather than guessed; historical correction appends a new version.'
    s['StudentEnduranceOutcome']=obj({'enrollmentId':UUID,'outcome':enum('UNRECORDED','MEASURED','EXEMPT'),
        'distanceMeters':nullable({'type':'integer','enum':[800,1000]}),'durationSeconds':nullable(integer_schema(minimum=0,fmt='int32')),
        'testedOn':nullable(LOCAL_DATE),'approvedExemptionApplicationId':nullable(UUID),'updatedAt':INSTANT,'version':VERSION},
        description='Positive student allowlist of own raw event/time/date or exemption. No conversion object, score, level, rank or grade, including null/empty substitutes. Legacy missing source date remains null with no invented backfill.')
    s['StudentEnduranceOutcome']['allOf']=[when('outcome','UNRECORDED',{'durationSeconds':{'type':'null'},'testedOn':{'type':'null'},'approvedExemptionApplicationId':{'type':'null'}}),
        when('outcome','MEASURED',{'distanceMeters':{'type':'integer','enum':[800,1000]},'durationSeconds':integer_schema(minimum=0,fmt='int32'),'approvedExemptionApplicationId':{'type':'null'}}),
        when('outcome','EXEMPT',{'durationSeconds':{'type':'null'},'testedOn':{'type':'null'},'approvedExemptionApplicationId':UUID})]

    s['AssessmentRosterSource']=obj({'owner':enum(*POLICY['projection']['sources']),'sourceVersion':text(),'scopeId':text()})
    s['AssessmentRosterProjection']=obj({'projectionId':UUID,'courseId':UUID,'snapshotId':nullable(UUID),'membershipScopeVersion':text(),
        'state':enum('CURRENT','RECOMPUTING','UNAVAILABLE'),'confirmedRosterIdentityCount':nullable(count()),'registeredMatchedCount':nullable(count()),
        'rosterIncompleteCount':nullable(count()),'outsideRosterMemberCount':nullable(count()),'sources':array_of(ref('AssessmentRosterSource')),
        'incompleteSources':array_of(enum(*POLICY['projection']['sources']),unique=True),'contentSha256':nullable(SHA256),'generatedAt':INSTANT},
        description='Read-only independent Owner composition, not an enrollment/outcome/settlement source of truth. Denominator from full confirmed unique roster identities; outside members are separate. Equal counts or mutually truncated lists do not prove completeness. Unknown source/count is null; old cache cannot claim current. Publication protects complete source sets and projection predecessor, writes no source Owner.')
    s['AssessmentRosterProjection']['allOf']=[when('state','CURRENT',{'incompleteSources':{'maxItems':0},'contentSha256':SHA256,'confirmedRosterIdentityCount':count(),'registeredMatchedCount':count(),'rosterIncompleteCount':count(),'outsideRosterMemberCount':count()}),
        when('state','UNAVAILABLE',{'confirmedRosterIdentityCount':{'type':'null'},'registeredMatchedCount':{'type':'null'},'rosterIncompleteCount':{'type':'null'},'outsideRosterMemberCount':{'type':'null'},'contentSha256':{'type':'null'},'incompleteSources':{'minItems':1}})]
    s['AssessmentRosterRow']=obj({'rowKey':text(),'rosterStudentNumber':nullable(text()),'rosterName':nullable(text()),'student':nullable(ref('StudentSummary')),
        'enrollmentId':nullable(UUID),'registrationState':enum('MATCHED_VERIFIED_JOINED','NOT_REGISTERED_OR_JOINED','IDENTITY_UNRESOLVED','OUTSIDE_ROSTER'),
        'enduranceState':enum('UNRECORDED','DRAFT_PENDING','MEASURED','EXEMPT','UNAVAILABLE'),'endurance':nullable(ref('StudentEnduranceOutcome')),
        'progress':nullable(ref('StudentCourseProgress')),'reviewPendingCount':nullable(count()),'applicationPendingCount':nullable(count()),
        'settlement':nullable(ref('CourseSettlementSummary')),'unresolvedReasons':array_of(ref('LocalizedText'))},
        description='Teacher-only complete roster identities plus outside members, without merging distinct status columns. Registered completion requires verified school identity AND joined this class AND number/name match. Unavailable results remain explicit; progress uses A checkpoint, settlement uses E public state, never reverse-approves E.')
    page(s,'AssessmentRosterRowPage','AssessmentRosterRow',{'projectionId':UUID,'contentSha256':SHA256})
    s['AssessmentExportRequest']=obj({'projectionId':UUID,'expectedContentSha256':SHA256})
    s['AssessmentExportArtifact']=obj({'artifactId':UUID,'projectionId':UUID,'contentSha256':SHA256,'state':enum('PENDING','READY','FAILED'),
        'fileSha256':nullable(SHA256),'createdAt':INSTANT},description='Teacher report artifact bound to fixed projection and content identity. Source changes require new artifact; failed/pending export is not a successful file. No raw student/teacher media, final grade or remark in this combined report.')
    s['AssessmentExportArtifact']['allOf']=[when('state','READY',{'fileSha256':SHA256}),when('state','PENDING',{'fileSha256':{'type':'null'}}),when('state','FAILED',{'fileSha256':{'type':'null'}})]

    s['TechnicalServiceScope']=obj({'kind':enum('ORGANIZATION','COURSE'),'courseId':nullable(UUID)},description='Organization is always the authenticated super-admin organization; COURSE must belong to it. Scope is normalized in stable request identity, not an arbitrary query or script.')
    s['TechnicalServiceScope']['allOf']=[when('kind','ORGANIZATION',{'courseId':{'type':'null'}}),when('kind','COURSE',{'courseId':UUID})]
    s['TechnicalServiceRevisionRequest']=obj({'purpose':enum(*PURPOSES),'scope':ref('TechnicalServiceScope'),'providerId':text(),'modelId':text(),'modelVersion':text(),
        'connectionReferenceId':UUID,'credentialReferenceId':UUID,'policyVersion':text(),'enabled':{'type':'boolean'},'automaticApprovalEnabled':{'type':'boolean'},
        'validationEvidenceId':nullable(UUID),'expectedCurrentRevisionId':nullable(UUID)},
        description='SUPER-only immutable revision, no raw secret/URL/credentials/prompts/free script or media. Connection/secret references resolve through authorized pre-provisioned infrastructure; missing references fail, never fabricate a configured service. VLM auto-approval requires accepted real-school sample evidence for exact purpose/model/policy/scope. OCR always drafts, never automatic formal approval.')
    s['TechnicalServiceRevisionRequest']['allOf']=[when('purpose',p,{'automaticApprovalEnabled':{'const':False}}) for p in ['ROSTER_OCR','ENDURANCE_OCR']]+[
        when('automaticApprovalEnabled',True,{'validationEvidenceId':UUID})]
    s['TechnicalServiceRevision']=obj({'revisionId':UUID,'purpose':enum(*PURPOSES),'scope':ref('TechnicalServiceScope'),
        'providerId':text(),'modelId':text(),'modelVersion':text(),'policyVersion':text(),'enabled':{'type':'boolean'},'automaticApprovalEnabled':{'type':'boolean'},
        'validationEvidenceId':nullable(UUID),'previousRevisionId':nullable(UUID),'publishedAt':INSTANT,'publishedBySubjectId':UUID},
        description='Non-sensitive governance projection; secret/connection credentials are never echoed, copied into tasks or normal audit. In-flight tasks retain original input/service/policy revision on new publication. Complete revision/pointer/receipt/audit/outbox is atomic.')
    page(s,'TechnicalServiceRevisionPage','TechnicalServiceRevision')
    s['TechnicalTaskCounts']=obj({'total':count(),'succeeded':count(),'failed':count(),'pending':count(),'oldestPendingSeconds':nullable(count())},description='Same complete sampling window; categories partition task count, unknown is not0. These are technical outcomes, not accuracy or teacher judgments.')
    s['TechnicalQualityEvidence']=obj({'evidenceId':UUID,'sampleSetId':UUID,'annotationVersion':text(),'windowStartsAt':INSTANT,'windowEndsAt':INSTANT,
        'serviceRevisionId':UUID,'policyVersion':text(),'evaluationStatus':enum('ACCEPTED','NOT_ACCEPTED'),
        'falseApprovalRate':nullable(number_schema(minimum=0,maximum=1)),'anomalyRecall':nullable(number_schema(minimum=0,maximum=1)),
        'ocrErrorRate':nullable(number_schema(minimum=0,maximum=1)),'teacherTaskCount':nullable(count())},description='Reference to real-school labelled evaluation, never model confidence or a service self-report. No sample rows/media or student identities. Null metric means not evaluated/not applicable, never perfect accuracy; acceptance requires the separately authorized evaluation evidence.')
    s['TechnicalServiceRunStatus']=obj({'purpose':enum(*PURPOSES),'scope':ref('TechnicalServiceScope'),'state':enum('AVAILABLE','DEGRADED','NOT_CONFIGURED','UNKNOWN','UNAVAILABLE'),
        'serviceRevisionId':nullable(UUID),'windowStartsAt':INSTANT,'windowEndsAt':INSTANT,'lastSuccessfulProbeAt':nullable(INSTANT),
        'taskCounts':nullable(ref('TechnicalTaskCounts')),'sourceRevision':nullable(text()),'quality':nullable(ref('TechnicalQualityEvidence')),'observedAt':INSTANT},
        description='SUPER-only desensitized snapshot. Source failure, incomplete metrics or inconsistent sampling yields UNKNOWN/UNAVAILABLE and null counts; a past successful probe never proves current health. No model key, prompt, media, student identifier or teaching decision.')
    s['TechnicalServiceRunStatus']['allOf']=[when('state',state,{'taskCounts':{'type':'null'},'sourceRevision':{'type':'null'}}) for state in ['UNKNOWN','UNAVAILABLE']]
    s['OpenManualModeRequest']=obj({'purpose':enum(*PURPOSES),'scope':ref('TechnicalServiceScope'),'reason':text(),'expectedSourceRevision':text()})
    s['CloseManualModeRequest']=obj({'reason':text(),'expectedWindowVersion':VERSION,'expectedSourceRevision':text()})
    s['ManualModeWindow']=obj({'windowId':UUID,'purpose':enum(*PURPOSES),'scope':ref('TechnicalServiceScope'),'reason':text(),
        'state':enum('OPEN','CLOSED'),'openedAt':INSTANT,'closedAt':nullable(INSTANT),'openedBySubjectId':UUID,'closedBySubjectId':nullable(UUID),
        'sourceRevision':text(),'version':VERSION},description='At most one open window per exact purpose/scope. Any applicable organization/course open window routes hard-check-passed undecided work to original responsible teacher. Closing one scope does not defeat another applicable open scope. No admin/cross-teacher decision and no second review of completed task.')
    s['ManualModeWindow']['allOf']=[when('state','OPEN',{'closedAt':{'type':'null'},'closedBySubjectId':{'type':'null'}}),when('state','CLOSED',{'closedAt':INSTANT,'closedBySubjectId':UUID})]
    page(s,'ManualModeWindowPage','ManualModeWindow')


def operations(registry):return {o['operationId']:o for item in registry.paths.values() for o in item.values() if isinstance(o,dict) and 'operationId' in o}


def replace(registry,oid,**changes):
    op=operations(registry)[oid];row=next(r for r in registry.operations if r.operation_id==oid)
    status,response=next((k,v) for k,v in op['responses'].items() if k.startswith('2'))
    args=dict(method=row.method,path=row.path,operation_id=oid,tag=op['tags'][0],summary=op['summary'],description=op['description'],roles=op['x-roles'],permissions=op['x-admin-permissions'],
        success_schema=response['content']['application/json']['schema']['$ref'].split('/')[-1],success_status=int(status),resource_scope=op['x-resource-scope'],system_mode=op['x-system-mode'],
        parameters=[p for p in op.get('parameters',[]) if p.get('$ref')!='#/components/parameters/IdempotencyKey'],
        idempotent=op['x-idempotency']['required'],error_codes=op['x-error-codes'],public=op['security']==[])
    if 'requestBody' in op:args['request_schema']=op['requestBody']['content']['application/json']['schema']['$ref'].split('/')[-1]
    if 'sensitiveResponse' in op['x-idempotency']:args['sensitive_response']=True
    args.update(changes);del registry.paths[row.path][row.method.lower()];registry.operations.remove(row);registry.add(**args)


def add(registry,method,path,oid,tag,summary,desc,response,request=None,roles=None,scope='RESPONSIBLE_TEACHER_ORIGINAL_BATCH',errors=(),params=None,root_only=False):
    parameters=[path_parameter(v[1:-1]) for v in path.split('/') if v.startswith('{')]+(params or [])
    if response.endswith('Page'):parameters+=cursor_parameters(default_limit=20,maximum_limit=100)
    registry.add(method=method,path=path,operation_id=oid,tag=tag,summary=summary,description=desc,success_schema=response,request_schema=request,
        roles=roles or ['TEACHER'],resource_scope=scope,parameters=parameters,idempotent=method=='post',error_codes=list(errors)+(['FIRST_PASSWORD_CHANGE_REQUIRED'] if root_only else []))
    op=registry.paths[path][method]
    if root_only:op['x-admin-kind-required']='SUPER'
    if method=='post':
        op['x-idempotency']['evaluationOrder']=['AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE','EXACT_COMMITTED_RECEIPT','NEW_COMMAND_MODE_VERSION_ELIGIBILITY_AND_SOURCE_PROTECTION']
        op['x-system-mode-replay']='AUTHORIZED_COMMITTED_RESULT_ONLY'


def register_operations(r):
    batch_errors=['TEACHING_BATCH_NOT_REVIEWABLE','TEACHING_ROW_UNRESOLVED','TEACHING_DUPLICATE_IDENTITY','TEACHING_SOURCE_STALE','TEACHING_SOURCE_UNAVAILABLE','VERSION_CONFLICT']
    add(r,'post','/courses/{courseId}/teaching-source-allocations','allocateTeachingSource','Rosters','Allocate a teacher source upload',
        'Responsible teacher only, purpose/course-bound; preflight MIME and byte budget, current open course for new input. No student/admin media access. Authoritative verification occurs after upload.','TeachingSourceAllocation','TeachingSourceAllocationRequest',errors=['COURSE_NOT_OPEN','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','VERSION_CONFLICT'])
    add(r,'post','/courses/{courseId}/teaching-source-assets/{sourceAssetId}/finalization','finalizeTeachingSource','Rosters','Verify uploaded teacher source',
        'Probe actual object bytes/type/checksum and secure source ownership. No parsing success or declared MIME creates official teaching facts. Existing original accepted source scope remains required.','TeachingSourceAsset','TeachingSourceFinalizeRequest',errors=['TEACHING_SOURCE_INVALID','TEACHING_SOURCE_NOT_READY','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','VERSION_CONFLICT'])
    add(r,'post','/courses/{courseId}/teaching-source-assets/{sourceAssetId}/download-authorization','authorizeTeachingSourceDownload','Rosters','Authorize original source for teacher review',
        'Recheck original responsible teacher, course and source/batch binding on each short-lived read. Never grant student, administrator directory or another teacher access to OCR source. No permanent URL.','TeachingSourceDownloadAuthorization',errors=['TEACHING_SOURCE_INVALID'])
    for domain,path,kind,batch,row in [('Roster','roster-import-batches','Rosters','RosterImportBatch','RosterDraftRow'),('Endurance','endurance-capture-batches','Endurance','EnduranceCaptureBatch','EnduranceDraftRow')]:
        base='/courses/{courseId}/'+path
        add(r,'post',base,'create'+domain+'Batch',kind,'Accept a '+domain.lower()+' source batch',
            'Bind ordered unique verified sources and authoritative content checksum. XLSX/CSV parse directly; paper OCR only creates drafts. New batch requires course open; no enrollment/snapshot/measurement from acceptance. Roster cap is100MiB/500 personnel rows including errors/duplicates. Technical attempts use fixed input/service/policy and finite retry; failure never invalidates a student.',batch,'CreateTeachingBatchRequest',errors=['COURSE_NOT_OPEN','TEACHING_SOURCE_INVALID','TEACHING_SOURCE_NOT_READY','ROSTER_ROW_LIMIT_EXCEEDED','PAYLOAD_TOO_LARGE','VERSION_CONFLICT'] if domain=='Roster' else ['COURSE_NOT_OPEN','TEACHING_SOURCE_INVALID','TEACHING_SOURCE_NOT_READY','PAYLOAD_TOO_LARGE','VERSION_CONFLICT'])
        add(r,'get',base,'list'+domain+'Batches',kind,'List original '+domain.lower()+' batches','Only original responsible teacher; historical batches continue after closure within original scope.',batch+'Page')
        add(r,'get',base+'/{batchId}','get'+domain+'Batch',kind,'Read one '+domain.lower()+' batch','Read derived technical/review/partial/completed state from authoritative full source set; unavailable dependencies never return a fabricated empty completed batch.',batch,errors=['TEACHING_SOURCE_UNAVAILABLE'])
        add(r,'get',base+'/{batchId}/rows','list'+domain+'DraftRows',kind,'Read '+domain.lower()+' draft rows','All pages pinned to batch/rows source revision. Keep every original position/error/duplicate; no administrative or student source access.',row+'Page',errors=['TEACHING_SOURCE_NOT_READY','TEACHING_SOURCE_UNAVAILABLE'])
        add(r,'post',base+'/{batchId}/rows/{rowId}/decision','resolve'+domain+'DraftRow',kind,'Append teacher '+domain.lower()+' row decision',
            'Recheck original batch/row/input and identity source versions. Append explicit source-grounded confirmation/interpretation or reasoned exclusion, preserve original OCR text. No caller allResolved/digest or fuzzy identity merge. Late provider callbacks cannot overwrite a teacher decision.',row,'Resolve'+domain+'DraftRowRequest',errors=batch_errors)
    add(r,'post','/courses/{courseId}/roster-import-batches/{batchId}/publication','publishRosterBatch','Rosters','Publish the complete confirmed official roster',
        'Load complete source rows, reject unresolved/duplicate stable identities and cap before any write. Course→batch→ordered rows→current snapshot protection; atomically append snapshot/entries/findings/completion/pointer/receipt/audit/outbox. Never creates/removes members. Exact original replay never selects old snapshot as current.','RosterBatchPublication','PublishRosterBatchRequest',errors=batch_errors+['ROSTER_ROW_LIMIT_EXCEEDED'])
    add(r,'post','/courses/{courseId}/endurance-capture-batches/{batchId}/confirmation','confirmEnduranceDraftRows','Endurance','Confirm all selected teacher-reviewed rows atomically',
        'Validate no repeated selected row IDs, all expected versions and exact resolved values, protected enrollment/rule/outcome source guards and one unique conversion before writing any row. Entire selected set commits measurement/conversion/row/outcome/batch/receipt/audit/outbox or none. Unselected rows stay pending, so partial is not completed. Original command replay returns original set without re-running OCR or overwriting pointers.','EnduranceRowsConfirmation','ConfirmEnduranceRowsRequest',errors=batch_errors+['ENDURANCE_CONVERSION_UNAVAILABLE','ENDURANCE_OUTCOME_EXEMPT'])
    # Preserve legacy electronic upload transport, replace its old immediate-publication result.
    replace(r,'allocateRosterImport',description='Allocate the existing electronic XLSX/CSV transport, at most100MiB. Preserve source identity/raw rows and original evidence needed by the accepted draft review; cleanup follows the source-kind retention policy, never mere parsing success. Paper sources use allocateTeachingSource.')
    replace(r,'importOfficialRoster',success_schema='RosterImportBatch',description='Accept the original XLSX/CSV allocation after authoritative content checks and direct deterministic parsing into a reviewable RosterImportBatch. It no longer publishes an official snapshot. Teacher row confirmation and publishRosterBatch supply the atomic formal publication; all500/error/duplicate rows preserved.',error_codes=['ROSTER_SOURCE_INVALID','ROSTER_ROW_LIMIT_EXCEEDED','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','COURSE_NOT_OPEN','VERSION_CONFLICT'])
    replace(r,'confirmEnduranceMeasurement',description='Responsible teacher submits explicit integer seconds/date/event and matching rule/enrollment/outcome versions. Initial manual entry or reasoned predecessor-linked correction appends measurement AND unique conversion atomically. Missing/multiple conversion rejects whole command; old OCR/time/conversion history is retained. No new facts after settlement/archive except authorized existing-fact correction.',error_codes=['ENDURANCE_OUTCOME_EXEMPT','ENDURANCE_CONVERSION_UNAVAILABLE','TEACHING_SOURCE_STALE','TEACHING_SOURCE_UNAVAILABLE','VERSION_CONFLICT'])
    add(r,'get','/courses/{courseId}/members/{enrollmentId}/endurance-measurements','listEnduranceMeasurementHistory','Endurance','Read original measurement and correction history',
        'Responsible teacher only. Immutable original test date/seconds and conversion revision, linked corrections, no rewrite by new rules.','EnduranceMeasurementPage')
    add(r,'get','/courses/{courseId}/assessment-roster','getAssessmentRosterProjection','Rosters','Read the complete-source assessment roster summary',
        'Read-only composition of full roster/member/identity/endurance/review/application/A statistics/E settlement public results and versions. Equal counts never prove identity; unknown source/count not0 or100%. No direct cross-Owner private queries or source writes.','AssessmentRosterProjection',errors=['TEACHING_SOURCE_UNAVAILABLE'])
    add(r,'get','/courses/{courseId}/assessment-roster/{projectionId}/rows','listAssessmentRosterRows','Rosters','Read fixed assessment roster rows',
        'Pinned projection/content revision across all pages; explicit registration, raw endurance, progress and settlement columns. Original source identity scope preserved, outside-roster members separate.','AssessmentRosterRowPage',errors=['PROJECTION_NOT_READY','TEACHING_SOURCE_UNAVAILABLE'])
    add(r,'post','/courses/{courseId}/assessment-roster-exports','requestAssessmentRosterExport','Rosters','Prepare a fixed teacher roster report artifact',
        'Export only a complete fixed projection/content identity in responsible-teacher scope, no final grades/remarks/raw images. An artifact task is not file readiness; no stale projection relabeled as current.','AssessmentExportArtifact','AssessmentExportRequest',errors=['PROJECTION_NOT_READY','TEACHING_SOURCE_STALE'])
    add(r,'get','/courses/{courseId}/assessment-roster-exports/{artifactId}','getAssessmentRosterExport','Rosters','Read export artifact readiness',
        'Original authorized teacher and exact immutable projection; missing file or failed generation never reports READY.','AssessmentExportArtifact')
    add(r,'post','/courses/{courseId}/assessment-roster-exports/{artifactId}/download-authorization','authorizeAssessmentRosterExportDownload','Rosters','Authorize one report download',
        'Recheck current actor/role/responsible course and fixed artifact content SHA at download. Forwarded short-lived URL or guessed ID grants no student/admin/cross-teacher rights.','AssessmentExportDownloadAuthorization',errors=['PROJECTION_NOT_READY'])
    add(r,'post','/admin/technical-service-revisions','publishTechnicalServiceRevision','Admin governance','Publish one immutable AI/OCR service revision',
        'SUPER only; source/purpose/scope/model/policy and secret reference registry validated under current revision protection. No secret/plaintext endpoint/prompt/script or student material in request snapshots, audit or response. Automatic VLM approval requires accepted real-school evidence bound to exact configuration; OCR always drafts. Old tasks retain original revision.','TechnicalServiceRevision','TechnicalServiceRevisionRequest',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True,errors=['TECHNICAL_SERVICE_REFERENCE_INVALID','TECHNICAL_SERVICE_VALIDATION_REQUIRED','VERSION_CONFLICT'])
    add(r,'get','/admin/technical-service-revisions','listTechnicalServiceRevisions','Admin governance','Read non-sensitive service revision history',
        'SUPER only, no fixed sub-admin permission grants this capability. Secret and connection credential material never returned.','TechnicalServiceRevisionPage',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True)
    add(r,'get','/admin/technical-service-status','getTechnicalServiceRunStatus','Admin governance','Read one scope-bound technical status snapshot',
        'SUPER only; actual window/source revision and complete technical counts, UNKNOWN/UNAVAILABLE with null metrics on missing/inconsistent sources. Last success/model confidence never implies health/accuracy. No original media or teaching decision.','TechnicalServiceRunStatus',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True,
        params=[query_parameter('purpose',enum(*PURPOSES),required=True),query_parameter('courseId',UUID,description='Omit for organization scope; otherwise an owned course scope.')])
    add(r,'post','/admin/manual-mode-windows','openManualModeWindow','Admin governance','Open a scoped manual-processing window',
        'SUPER only, one open window per exact purpose/scope. Use server committed time and protected source revision; route only hard-check-passed undecided tasks to original responsible teacher. No approval, extra opportunity or cross-teacher grant.','ManualModeWindow','OpenManualModeRequest',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True,errors=['MANUAL_WINDOW_CONFLICT','VERSION_CONFLICT'])
    add(r,'get','/admin/manual-mode-windows','listManualModeWindows','Admin governance','Read scoped manual-mode history',
        'SUPER only. Closed windows and audit remain immutable; scope overlap is explicit, not last-write-wins replacement.','ManualModeWindowPage',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True)
    add(r,'post','/admin/manual-mode-windows/{windowId}/closure','closeManualModeWindow','Admin governance','Close the referenced current manual window',
        'SUPER only, recheck current window and source version, append server end-time and receipt atomically. Service recovery affects undecided tasks only; teacher decisions remain final. Other applicable open scope still requires manual routing.','ManualModeWindow','CloseManualModeRequest',roles=['ADMIN'],scope='SUPER_ADMIN_ONLY',root_only=True,errors=['MANUAL_WINDOW_CONFLICT','VERSION_CONFLICT'])


def register_teaching_workflow(schemas,registry):
    register_schemas(schemas)
    register_operations(registry)
    register_privacy(schemas,registry)


def register_privacy(s,r):
    for name in ['RosterImportBatch','EnduranceCaptureBatch']:
        s[name].setdefault('allOf',[]).extend([when('state',v,{'counts':ref('TeachingBatchCounts'),'rowsSourceVersion':text()}) for v in ['REVIEW_REQUIRED','PARTIALLY_CONFIRMED','COMPLETED']])
    for state in ['READY','CONFIRMED','EXCLUDED']:
        s['EnduranceDraftRow']['allOf'].append(when('state',state,{'decisionId':UUID}))
    complete_sources={'minItems':8,'maxItems':8,'allOf':[
        {'contains':{'properties':{'owner':{'const':owner}},'required':['owner']},'minContains':1,'maxContains':1} for owner in POLICY['projection']['sources']]}
    s['AssessmentRosterProjection']['allOf'].append(when('state','CURRENT',{'sources':complete_sources}))
    # Explicit current teacher decision, alongside immutable original extraction.
    s['RosterDraftRow']['properties'].update({'confirmedIdentity':nullable(ref('RosterIdentityConfirmation')),'decisionReason':nullable(text())})
    s['RosterDraftRow']['required']+=['confirmedIdentity','decisionReason']
    s['RosterDraftRow']['allOf']=[when('state','CONFIRMED',{'confirmedIdentity':ref('RosterIdentityConfirmation'),'decisionId':UUID,'issues':{'maxItems':0}}),
        when('state','EXCLUDED',{'confirmedIdentity':{'type':'null'},'decisionId':UUID,'decisionReason':text()})]
    s['RosterSnapshot']['properties']['sourceRowCount']=nullable(integer_schema(minimum=1,maximum=500))
    s['RosterSnapshot']['properties']['rowsSourceVersion']=nullable(text())
    s['RosterSnapshot']['allOf']=[{'if':{'properties':{'sourceBatchId':{'type':'string'}},'required':['sourceBatchId']},
        'then':{'properties':{'sourceRowCount':integer_schema(minimum=1,maximum=500),'rowsSourceVersion':text()}}}]
    s['TechnicalProbe']=obj({'checkedAt':INSTANT,'serviceRevisionId':UUID,'result':enum('SUCCESS','FAILED','UNKNOWN')},description='Most recent actual probe, not the last successful probe reused as current health.')
    s['TechnicalServiceRunStatus']['properties']['latestProbe']=nullable(ref('TechnicalProbe'))
    s['TechnicalServiceRunStatus']['required']+=['latestProbe']
    s['TechnicalServiceRunStatus']['allOf']+=[when('state',v,{'serviceRevisionId':UUID,'taskCounts':ref('TechnicalTaskCounts'),'sourceRevision':text(),'latestProbe':ref('TechnicalProbe')}) for v in ['AVAILABLE','DEGRADED']]+[
        when('state','AVAILABLE',{'latestProbe':{'allOf':[ref('TechnicalProbe'),{'properties':{'result':{'const':'SUCCESS'}}}]}}),
        when('state','NOT_CONFIGURED',{'serviceRevisionId':{'type':'null'},'latestProbe':{'type':'null'}})]
    # Evidence may originate from an earlier disabled revision with the same exact
    # inference configuration. Otherwise enabling would require a circular future revision.
    for name in ['TechnicalServiceRevision','TechnicalQualityEvidence']:
        s[name]['properties']['configurationSha256']=SHA256;s[name]['required']+=['configurationSha256']
    s['TechnicalQualityEvidence']['description']+=' Evaluated serviceRevisionId remains historical. Reuse on enabling is allowed only after server comparison of exact canonical provider/model/version, scope, connection/credential reference, purpose and policy fingerprint; never accept caller-asserted equality. Enable/approval flags are governance state, not inference inputs.'
    operations(r)['publishTechnicalServiceRevision']['description']+=' The server computes configurationSha256 from canonical inference inputs and verifies evidence against that exact identity. Evidence from a disabled evaluation revision can authorize enabling only if those inputs match; every task still binds its actual published revision. External reference/evaluation registries are Phase7 provider prerequisites, not fabricated public objects.'
    s['TeachingSourceDownloadAuthorization']=obj({'sourceAssetId':UUID,'downloadUrl':string_schema(fmt='uri'),'expiresAt':INSTANT},
        description='Short-lived authenticated teacher download gateway; it rechecks actor/original source scope even if this URL is forwarded. Never a public bearer object URL.')
    s['AssessmentExportDownloadAuthorization']=obj({'artifactId':UUID,'projectionId':UUID,'contentSha256':SHA256,'fileSha256':SHA256,'downloadUrl':string_schema(fmt='uri'),'expiresAt':INSTANT},
        description='Authenticated teacher gateway bound to artifact/projection/file identity; recheck current responsible teacher and deny forwarded student/other-teacher use.')
    s['TechnicalServiceRevision']['allOf']=deepcopy(s['TechnicalServiceRevisionRequest']['allOf'])
    for name in ['PublishFinalGradeRequest','FinalGradePublication']:
        s[name]['properties'].pop('remark');s[name]['required'].remove('remark')
    s['PublishFinalGradeRequest']['description']='Append signed int32 grade only; remark is forbidden even null/empty or renamed extra fields. Never copy a historical remark into a new publication. No student notification or projection.'
    s['FinalGradePublication']['description']='Responsible-teacher grade publication without remark. Existing stored historical remarks are retained and available only through the audited historical read API.'
    for oid in ['getOwnFinalGrade']:
        row=next(x for x in r.operations if x.operation_id==oid);del r.paths[row.path][row.method.lower()];r.operations.remove(row)
        if not r.paths[row.path]:del r.paths[row.path]
    replace(r,'getOwnEnduranceOutcome',success_schema='StudentEnduranceOutcome',description='Own raw test distance/integer seconds/date or exemption only. Construct the allowlist before serialization; no conversion/score/level/rank/final grade/remark, including nested or null placeholders.')
    s['StudentDashboard']['properties'].pop('finalGrade');s['StudentDashboard']['required'].remove('finalGrade')
    s['StudentDashboard']['properties']['enduranceOutcome']=nullable(ref('StudentEnduranceOutcome'))
    s['StudentDashboard']['description']='Student allowlist dashboard. Current semester nullability is unchanged. Raw endurance and minutes only; unavailable source never falls back to a teacher DTO or legacy grade-bearing cache.'
    replace(r,'listFinalGradeHistory',description='Responsible-teacher append-only signed-int32 grade history without remark. Historical remarks remain physically preserved and require the separate audited current-TEACHER read operation.')
    replace(r,'publishFinalGrade',description='Append any signed-int32 grade with no remark field, alternate remark field or historical-remark copying. No 0-100 rule or administrator approval. Keep prior stored publications/remarks intact; never produce student notifications, projections or logs containing grade values.')
    s['HistoricalFinalGradeRemark']=obj({'publicationId':UUID,'courseId':UUID,'enrollmentId':UUID,'remark':nullable(string_schema(max_length=50)),'publishedAt':INSTANT},
        description='Read-only historical remark fact retained from an existing publication. Does not return the grade value or grant access to grade mutation, other teaching adjudication, members or media. New publications do not acquire a remark.')
    page(s,'HistoricalFinalGradeRemarkPage','HistoricalFinalGradeRemark')
    add(r,'get','/teacher/historical-final-grade-remarks','listHistoricalFinalGradeRemarks','Final grades','Read preserved historical remarks with access audit',
        'All authenticated actors whose CURRENT role is TEACHER may read historical remarks, without narrowing by original course responsibility, current membership or governance group. Bind purpose and filters to opaque cursor. Audit actor, purpose, returned publication objects and actual server read time before delivery; unavailable audit fails closed. No grade write, remark write, media or cross-teacher adjudication permission. Students/admins denied.',
        'HistoricalFinalGradeRemarkPage',scope='ALL_AUTHENTICATED_CURRENT_TEACHERS_HISTORICAL_REMARK_READ_ONLY',
        params=[query_parameter('purpose',text(),required=True),query_parameter('courseId',UUID),query_parameter('enrollmentId',UUID)],errors=['TEACHING_SOURCE_UNAVAILABLE'])
    history=operations(r)['listHistoricalFinalGradeRemarks'];history['x-access-audit']={'required':True,'fields':POLICY['legacyRemark']['audit'],'recordRemarkValue':False,'failure':'DENY_DELIVERY'}
    s['StudentNotification']=deepcopy(s['Notification'])
    route=s['StudentNotification']['properties']['targetRoute']['anyOf'][0]['enum'];route.remove('FINAL_GRADE')
    s['StudentNotification']['description']='Student-only whitelisted notification templates and safe navigation. Reject the entire prohibited message at creation AND read, including grade text in title/body/localized/URL/context. No partial redaction, grade counts or replacement null payload. JSON Schema cannot prove natural-language text safety; server template projection and Phase7/9 tests are mandatory.'
    page(s,'StudentNotificationPage','StudentNotification')
    for oid in ['listOwnNotifications','getOwnUnreadNotificationCount','markOwnNotificationRead']:
        op=operations(r)[oid];op['x-roles']=['TEACHER','ADMIN']
        next(x for x in r.operations if x.operation_id==oid).roles=['TEACHER','ADMIN']
        op['description']+=' Students use the dedicated allowlisted /student/notifications routes; legacy generic routes must deny the student role.'
    add(r,'get','/student/notifications','listOwnStudentNotifications','Notifications','List safe student notifications',
        'Self recipient only, filter both new and historical prohibited messages before list/count/cursor construction. Never serialize teacher notification DTO or FINAL_GRADE route. Target authorization rechecked on navigation.',
        'StudentNotificationPage',roles=['STUDENT'],scope='SELF',params=[query_parameter('read',{'type':'boolean'})])
    add(r,'get','/student/notifications/unread-count','getOwnStudentUnreadNotificationCount','Notifications','Count only safe student notifications',
        'Count from exactly the same safe recipient/template/source set as student list; prohibited messages do not contribute counts or cursors.',
        'UnreadNotificationCount',roles=['STUDENT'],scope='SELF')
    add(r,'post','/student/notifications/{notificationId}/read','markOwnStudentNotificationRead','Notifications','Mark a safe student notification read',
        'Recheck current recipient and safe template/source at read and replay. Retain first server readAt. If an old message or old receipt contains prohibited content, deny delivery rather than replay an unsafe payload. No source business mutation.',
        'StudentNotification',roles=['STUDENT'],scope='SELF')
    POLICY['student']['retiredRoutes']=['GET /student/final-grade','STUDENT on /notifications and descendants']
    POLICY['student']['retiredRouteBehavior']='DENY_403_OR_404_NO_COMPATIBILITY_GRADE_PAYLOAD'
    POLICY['student']['textGuard']='APPROVED_TEMPLATE_AND_ALLOWLIST_SOURCE_MAPPER_WITH_RUNTIME_REJECT_NOT_SCHEMA_KEYWORD_FILTER'
