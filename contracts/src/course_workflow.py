"""Phase5 Step04 wire projections of the accepted P4-Z A/E design.

This is Contract construction, not a statistics engine or Backend implementation.
"""
from common import (UUID, VERSION, INSTANT, LOCAL_DATE, SHA256, EMAIL, ref, nullable,
                    object_schema, string_schema, integer_schema, number_schema,
                    array_of as base_array, path_parameter, cursor_parameters)


def array_of(schema, unique=False, **kwargs):
    result = base_array(schema, **kwargs)
    if unique: result['uniqueItems'] = True
    return result


def obj(properties, optional=(), description=None):
    return object_schema(properties, [k for k in properties if k not in optional], description=description)


def enum(*values): return string_schema(enum=list(values))
def literal(value): return {"type": "string" if isinstance(value, str) else "integer", "const": value}
def count(maximum=None): return integer_schema(minimum=0, **({"maximum": maximum} if maximum is not None else {}))
def text(): return string_schema(min_length=1)
def when(field, value, properties):
    return {"if": {"properties": {field: {"const": value}}, "required": [field]}, "then": {"properties": properties}}


RETIRED_ERRORS = ["COURSE_TARGET_ALREADY_MET", "COURSE_TARGET_BELOW_ACTIVE_CREDIT", "COURSE_CLOSE_BLOCKED"]
NEW_ERRORS = {
    "COURSE_RULES_LOCKED": (409, "Published targets, formula, frequency and schedule are immutable."),
    "COURSE_NOT_PUBLISHED": (409, "Draft course cannot start enrollment or exercise."),
    "COURSE_PLAN_INFEASIBLE": (422, "Authoritative complete plan evidence proves targets impossible without certification or make-up assumptions."),
    "COURSE_PLAN_UNAVAILABLE": (503, "Plan evidence or exact feasibility calculation is unavailable; not an infeasibility decision."),
    "COURSE_PLAN_STALE": (412, "Draft, template, semester or calendar evidence changed; prepare the plan again."),
    "INVITATION_FLOW_EXPIRED": (409, "Server registration or first acceptance missed its strict deadline."),
    "INVITATION_FLOW_TERMINATED": (409, "Original invitation flow was revoked or admission/course/semester became unavailable."),
    "INVITATION_FLOW_MISMATCH": (403, "Flow does not belong to the verified subject and original invitation."),
    "MAKEUP_NOT_ALLOWED": (409, "No valid named-student authorization in the original closeout period."),
    "STATISTICS_UNAVAILABLE": (503, "Complete consistent statistics sources or predecessor are not available."),
    "SETTLEMENT_BLOCKED": (409, "Unfinished legal chains or other authoritative teaching blockers remain."),
    "SETTLEMENT_SOURCE_STALE": (412, "Prepared sources, full membership, statistics or report predecessor changed."),
    "SETTLEMENT_SOURCE_UNAVAILABLE": (503, "Required complete protected Owner facts are unavailable."),
    "SETTLEMENT_CORRECTION_INVALID": (409, "Correction lacks an authorized existing fact, history scope or prior report."),
    "SEMESTER_SETTLEMENT_BLOCKED": (409, "The complete authoritative old-semester course set is not settled with current unblocked results."),
}

POLICY = {
    "rule": {"totalTargetMinutes": 1200, "thresholdMinutes": [30,45,60], "defaultThresholdMinutes": 30,
             "singleRecordCapMinutes": 60, "dailyCountLimit": 1, "weeklyCountLimits": [2,3,4], "defaultWeeklyCountLimit": 3,
             "timezone": "Asia/Shanghai", "weekStart": "MONDAY", "freezeAt": "COURSE_PUBLICATION",
             "futureTemplateRetargetsPublishedCourses": False},
    "selection": {"policyVersion": "P4Z-A-08-v1", "wholeMinutes": "FLOOR_SUM_ACTIVE_SECONDS_DIV_60",
                  "eligibleMinutes": "ZERO_BELOW_THRESHOLD_ELSE_MIN_WHOLE_MINUTES_60",
                  "objective": "JOINT_TWO_CATEGORY_CAPPED_TOTAL", "sourceAttribution": "CERTIFICATION_FIRST_THEN_STARTED_AT_AND_ID",
                  "tieBreak": ["PRESERVE_FEASIBLE_OPTIMAL_WHOLE_PREVIOUS_SET", "EARLIER_STARTED_AT_THEN_STABLE_ID_MEMBERSHIP"],
                  "zeroContributionUsesSlot": False, "certificationUsesSlots": False,
                  "startBlockedByTargetOrQuota": False, "validUncounted": "SUM_VALID_Q_MINUS_A",
                  "invalidMinutes": "SUM_INVALID_ACTUAL_WHOLE_MINUTES", "pendingIsInvalid": False,
                  "sourceTokens": ["ruleVersionId","recordFactSetVersion","reviewCandidateSetVersion","certificationSetVersion","membershipScopeVersion","previousCheckpointId"],
                  "missingSource": "UNAVAILABLE", "lostPredecessor": "UNAVAILABLE_NOT_EMPTY", "atomicSourceProtection": "ALL_OWNER_SETS_AND_ROWS_PLUS_PREDECESSOR_UNTIL_COMMIT"},
    "invitation": {"defaultLifetimeMinutes": 30, "minimumLifetimeMinutes": 5, "maximumLifetimeMinutes": 120,
                   "graceSeconds": 600, "registrationComparison": "STRICTLY_BEFORE_ORIGINAL_EXPIRY",
                   "acceptanceComparison": "STRICTLY_BEFORE_ORIGINAL_EXPIRY_PLUS_GRACE", "previewCreatesFlow": False,
                   "refreshExtends": False, "maxSuccessfulEnrollmentsPerFlow": 1,
                   "registrationNeedsVerifiedEmail": False, "finalJoinNeedsVerifiedEmail": True, "anonymousFlowNonceBits": 256,
                   "terminations": ["REVOKED","JOIN_CLOSED","COURSE_CLOSED","SEMESTER_NOT_CURRENT"]},
    "closeout": {"days": 7, "reminderDaysBeforeRegularCutoff": 14, "latePublicationReminder": "IMMEDIATE_NO_BACKDATED_SEND",
                 "makeup": "NAMED_STUDENT_WINDOW_CURRENT_TERM_OPEN_COURSE_ACTIVE_MEMBER", "delayedSettlementExtendsMakeup": False,
                 "closureBlocksNewStartsOnly": True, "protectPreReceiptFirstMaterialChain": True},
    "settlement": {"ownerSources": ["MEMBERSHIP","ROSTER","SESSIONS","MATERIALS","REVIEWS_AND_TIMERS","TECHNICAL_PROCESSING","EXEMPTIONS","CERTIFICATIONS","ENDURANCE","STATISTICS","OTHER_TEACHING"],
                   "missingSource": "UNAVAILABLE_NOT_EMPTY", "memberCoverage": "EXACT_AUTHORITATIVE_SET_NOT_COUNTS",
                   "freeze": "SOURCE_PROTECTED_ATOMIC_HEAD_ROWS_MANIFEST_RECEIPT_POINTER_AUDIT",
                   "unmetTargetIsBlocker": False, "correction": "APPEND_AUTHORIZED_EXISTING_FACT_WITH_HISTORICAL_SCOPE",
                   "replayMovesCurrentPointer": False, "archive": "COMPLETE_CURRENT_UNBLOCKED_ALL_COURSE_RESULTS"},
}


def register_schemas(s):
    s['RuleTemplatePublishRequest'] = obj({'label': ref('LocalizedText'), 'expectedLatestVersionId': nullable(UUID)},
        description='Super-admin publishes only the fixed allowed rule family. No caller formula, free thresholds, extension or old-course retargeting.')
    s['RuleTemplateVersion'] = obj({'templateVersionId': UUID, 'versionNo': integer_schema(minimum=1), 'label': ref('LocalizedText'),
        'status': literal('PUBLISHED'), 'totalTargetMinutes': literal(1200), 'thresholdChoices': {'type':'array','items':enum(30,45,60),'const':[30,45,60]},
        'defaultThresholdMinutes': literal(30), 'singleRecordCapMinutes': literal(60), 'dailyCountLimit': literal(1),
        'weeklyCountChoices': {'type':'array','items':{'type':'integer','enum':[2,3,4]},'const':[2,3,4]}, 'defaultWeeklyCountLimit': literal(3),
        'formulaVersion': literal('P4Z-A-08-v1'), 'publishedAt': INSTANT}, description='Immutable fixed rule template. Version UUID is opaque, not ordered lexically.')
    # Integer enums must remain integer wire types for generators and strict validators.
    s['RuleTemplateVersion']['properties']['thresholdChoices']['items'] = {'type':'integer','enum':[30,45,60]}
    s['RuleTemplateVersionPage'] = obj({'items': array_of(ref('RuleTemplateVersion')), 'page':ref('CursorPage')})
    s['CourseAllowedInterval'] = obj({'startsAt':INSTANT,'endsAtExclusive':INSTANT}, description='Authoritative allowed exercise interval, start inclusive/end exclusive; intervals are ordered, non-overlapping, and inside the original current semester.')
    s['CourseRuleConfiguration'] = obj({'templateVersionId':UUID,
        'courseRelatedTargetMinutes':count(1200),'otherTargetMinutes':count(1200),
        'thresholdMinutes':{'type':'integer','enum':[30,45,60],'default':30},
        'weeklyCountLimit':{'type':'integer','enum':[2,3,4],'default':3},
        'allowedIntervals':array_of(ref('CourseAllowedInterval'),min_items=1),
        'regularCutoffAt':INSTANT,'plannedSettlementAt':INSTANT}, optional=('thresholdMinutes','weeklyCountLimit'),
        description='Draft parameters. Targets sum exactly 1200. Allowed intervals end no later than regular cutoff; the seven-day closeout is server-derived. Planned settlement is no earlier than its end, compatible with semester archival. Server validates interval, calendar, semester and joint two-category feasibility without hypothetical certification/make-up.')
    s['CourseRuleVersion'] = obj({'ruleVersionId':UUID,'courseId':UUID,'semesterId':UUID,'versionNo':integer_schema(minimum=1),
        'template':ref('RuleTemplateVersion'),'courseRelatedTargetMinutes':count(1200),'otherTargetMinutes':count(1200),
        'thresholdMinutes':{'type':'integer','enum':[30,45,60]},'weeklyCountLimit':{'type':'integer','enum':[2,3,4]},
        'allowedIntervals':array_of(ref('CourseAllowedInterval'),min_items=1),'regularCutoffAt':INSTANT,'closeoutEndsAt':INSTANT,
        'plannedSettlementAt':INSTANT,'reminderScheduledAt':INSTANT,'publishedAt':INSTANT},
        description='Immutable server-filled publication snapshot. Asia/Shanghai day/week; closeout ends seven days after cutoff. Reminder scheduled at max(publication, cutoff minus 14 days), never a fabricated sent record. Name/description updates do not alter this object.')
    s['CourseCreateRequest'] = obj({'semesterId':UUID,'name':text(),'description':nullable(text()),'rule':ref('CourseRuleConfiguration')})
    s['CourseDraftUpdateRequest'] = obj({'rule':ref('CourseRuleConfiguration'),'expectedVersion':VERSION})
    s['CoursePlanRequest'] = obj({'expectedCourseVersion':VERSION})
    s['CoursePlanEvidence'] = obj({'evidenceId':UUID,'draftVersion':VERSION,'templateVersionId':UUID,'semesterVersion':VERSION,'calendarSourceVersion':text(),
        'result':enum('FEASIBLE','INFEASIBLE','UNAVAILABLE'),'proofKind':enum('LEGAL_COMPLETE_WITNESS','EXACT_EXHAUSTIVE_PROOF','STRICT_IMPOSSIBILITY_PROOF','NONE'),
        'explanation':ref('LocalizedText'),'publicationToken':nullable(text()),'computedAt':INSTANT},
        description='Opaque server evidence bound to exact draft and complete Owner calendar. Feasible requires a complete legal non-overlapping per-category witness; day capacity alone is insufficient (610/590 over 20 days fails). Unknown/partial search is UNAVAILABLE, never proof of infeasibility. No client-provided true/optimal/feasible flag is accepted.')
    s['CoursePlanEvidence']['allOf']=[when('result','FEASIBLE',{'proofKind':literal('LEGAL_COMPLETE_WITNESS'),'publicationToken':text()}),
        when('result','INFEASIBLE',{'proofKind':enum('EXACT_EXHAUSTIVE_PROOF','STRICT_IMPOSSIBILITY_PROOF'),'publicationToken':{'type':'null'}}),
        when('result','UNAVAILABLE',{'proofKind':literal('NONE'),'publicationToken':{'type':'null'}})]
    s['PublishCourseRequest'] = obj({'expectedCourseVersion':VERSION,'publicationToken':text()})
    s['CourseChangeProposal'] = obj({'name':text(),'description':nullable(text()),'expectedVersion':VERSION})
    s['CourseChangeImpact'] = obj({'canApply':{'type':'boolean'},'impactToken':text(),'affectedStudents':array_of(ref('StudentSummary')),'expiresAt':INSTANT},
        description='Name/description impact only. No path through this token can mutate frozen targets or schedule.')
    s['CourseUpdateRequest'] = obj({**s['CourseChangeProposal']['properties'],'impactToken':text()})
    p=s['Course']['properties']; p['status']=enum('DRAFT','OPEN','CLOSED')
    p.update({'draftRule':nullable(ref('CourseRuleConfiguration')),'publishedRule':nullable(ref('CourseRuleVersion')),'closedAt':nullable(INSTANT)})
    s['Course']['required'] += ['draftRule','publishedRule','closedAt']
    s['Course']['allOf']=[when('status','DRAFT',{'draftRule':ref('CourseRuleConfiguration'),'publishedRule':{'type':'null'},'displayStatus':{'type':'null'},'joinOpen':{'const':False},'closedAt':{'type':'null'}}),
        when('status','OPEN',{'draftRule':{'type':'null'},'publishedRule':ref('CourseRuleVersion'),'closedAt':{'type':'null'}}),
        when('status','CLOSED',{'draftRule':{'type':'null'},'publishedRule':ref('CourseRuleVersion'),'displayStatus':{'type':'null'},'joinOpen':{'const':False},'closedAt':INSTANT})]
    s['Course']['description']='Course lifecycle is separate from settlement/archive. Existing targets/checkin fields are server-derived compatibility summaries of draft or frozen rule; never independently writable. Draft target revisionNumber starts at 1; publication freezes it.'
    s['StudentCourse']['properties']['publishedRule']=ref('CourseRuleVersion');s['StudentCourse']['required'].append('publishedRule')
    for n in ['ExerciseSession','ExerciseRecord']:
        s[n]['properties']['ruleVersionId']=UUID;s[n]['required'].append('ruleVersionId')
    s['ExerciseSession']['properties']['makeupAuthorizationId']=nullable(UUID);s['ExerciseSession']['required'].append('makeupAuthorizationId')
    s['StartExerciseSessionRequest']=obj({'courseId':UUID,'expectedRuleVersionId':UUID,'makeupAuthorizationId':nullable(UUID)},
        description='Original course rule binding; make-up reference null for a normal start. Neither actual seconds, date, progress, nor counted minutes are caller-writable.')
    s['MakeupAuthorizationRequest']=obj({'enrollmentId':UUID,'startsAt':INSTANT,'endsAtExclusive':INSTANT,'expectedCourseVersion':VERSION},
        description='Responsible teacher names one active member and an explicit window within the original seven-day closeout; no automatic full-class extension.')
    s['MakeupAuthorization']=obj({'authorizationId':UUID,'courseId':UUID,'enrollmentId':UUID,'ruleVersionId':UUID,
        'startsAt':INSTANT,'endsAtExclusive':INSTANT,'authorizedAt':INSTANT,'authorizedBy':ref('TeacherSummary'),'version':VERSION})
    s['MakeupAuthorizationPage']=obj({'items':array_of(ref('MakeupAuthorization')),'page':ref('CursorPage')})

    s['ProgressSourceVersions']=obj({'ruleVersionId':UUID,'recordFactSetVersion':text(),'reviewCandidateSetVersion':text(),
        'certificationSetVersion':text(),'membershipScopeVersion':text(),'previousCheckpointId':nullable(UUID)},
        description='Opaque source-set tokens plus predecessor, not timestamps or client ordering keys. Null predecessor only for proven first computation; cache loss cannot manufacture null.')
    s['ProgressCategory']=obj({'category':ref('ExerciseCategory'),'targetMinutes':count(1200),'activeCertificationMinutes':count(),
        'countedCertificationMinutes':count(1200),'countedRecordMinutes':count(1200),'cappedCompletedMinutes':count(1200),'remainingMinutes':count(1200)},
        description='Certification first: b=min(target,C), then selected records by start instant/ID consume the remainder. No cross-category transfer or certification day/week slot. completed=b+sum(a); remaining=target-completed.')
    s['ProgressTotals']=obj({'categories':array_of(ref('ProgressCategory'),min_items=2,max_items=2),'totalTargetMinutes':literal(1200),
        'totalCompletedMinutes':count(1200),'completionRatio':number_schema(minimum=0,maximum=1),'displayPercent':count(100),'targetMet':{'type':'boolean'},
        'actualDurationSeconds':number_schema(minimum=0),'countedRecordMinutes':count(),'countedCertificationMinutes':count(),
        'invalidActualMinutes':count(),'validUncountedEligibleMinutes':count(),'validFormulaExcludedMinutes':count(),'pendingRecordCount':count()},
        description='Exactly one row per category. Only raw total==1200 means targetMet; display 100 can mean1199. Actual seconds include all real records, invalidActualMinutes=sum invalid floor(s/60), validUncounted=sum valid(q-a), validFormulaExcluded=sum valid(m-q). Pending/technical/review records are neither invalid nor valid. Certification is not exercise time.')
    s['ProgressTotals']['allOf']=[when('targetMet',True,{'totalCompletedMinutes':{'const':1200}}),when('targetMet',False,{'totalCompletedMinutes':{'maximum':1199}})]
    s['ProgressTotals']['properties']['categories']['allOf']=[
        {'contains':{'properties':{'category':{'const':category}},'required':['category']},'minContains':1,'maxContains':1}
        for category in ['COURSE_RELATED','OTHER']]
    s['StatisticsCheckpoint']=obj({'checkpointId':UUID,'courseId':UUID,'enrollmentId':UUID,'sources':ref('ProgressSourceVersions'),
        'policyVersion':literal('P4Z-A-08-v1'),'totals':ref('ProgressTotals'),'selectedRecordIds':array_of(UUID,unique=True),'computedAt':INSTANT},
        description='Immutable complete result from one consistent source set and predecessor. Totals, positive-count detail, pointer and command receipt commit atomically with Owner set/row protection held until commit. Replaying old success returns original checkpoint, never moves current pointer. Stale workers must recompute, not relabel tokens.')
    s['RecordCreditExplanation']=obj({'code':enum('BELOW_THRESHOLD','SINGLE_RECORD_CAP','CATEGORY_REMAINING_LIMIT','SAME_DAY_OTHER_RECORD','ORIGINAL_WEEK_LIMIT','JOINT_OPTIMAL_SELECTION'),
        'message':ref('LocalizedText'),'relatedRecordIds':array_of(UUID)}, description='Formula loss m-q is separate from eligible uncounted q-a. Explain only true current facts. Partial positive a<q is a category remainder, not day/week rejection. No review invalidity implied.')
    s['RecordCreditDetail']=obj({'checkpointId':UUID,'recordId':UUID,'sessionId':UUID,'ruleVersionId':UUID,'category':ref('ExerciseCategory'),
        'businessDate':LOCAL_DATE,'originalWeekStartsOn':LOCAL_DATE,'startedAt':INSTANT,'actualDurationSeconds':number_schema(minimum=0),
        'actualWholeMinutes':count(),'eligibleMinutes':count(60),'countedMinutes':count(60),'reviewResult':nullable(ref('ReviewResult')),
        'explanations':array_of(ref('RecordCreditExplanation'))},
        description='m=floor(sum ACTIVE seconds/60) once; q=0 if m<H else min(m,60); a only from joint selected VALID set, 0<=a<=q. Original Shanghai start date/week and immutable rule never move at completion/supplement. Non-valid records have a=0. Missing sources are unavailable, not zero. Explanation cannot hide inconsistent output.')
    s['RecordCreditDetail']['allOf']=[when('reviewResult',None,{'countedMinutes':{'const':0}}),when('reviewResult','INVALID',{'countedMinutes':{'const':0}})]
    s['RecordCreditDetailPage']=obj({'checkpointId':UUID,'items':array_of(ref('RecordCreditDetail')),'page':ref('CursorPage')},description='Cursor pinned to this immutable checkpoint. Every page and record belongs to its course/enrollment/rule; include pending and invalid facts as well as candidates.')
    s['StudentCourseProgress']=obj({'courseId':UUID,'enrollmentId':UUID,'student':ref('StudentSummary'),
        'state':enum('CURRENT','RECOMPUTING','UNAVAILABLE'),'checkpoint':nullable(ref('StatisticsCheckpoint')),'unavailableReason':nullable(enum('SOURCE_INCOMPLETE','SOURCE_CHANGED','PREDECESSOR_UNAVAILABLE','RECOVERY_REQUIRED')),
        'observedAt':INSTANT}, description='CURRENT means checkpoint covers current protected sources. RECOMPUTING may expose the last committed checkpoint explicitly as historical. UNAVAILABLE returns no numeric fallback. Session eligibility is independently checked by the Session Owner; target/daily/weekly cap never closes a start.')
    s['StudentCourseProgress']['allOf']=[when('state','CURRENT',{'checkpoint':ref('StatisticsCheckpoint'),'unavailableReason':{'type':'null'}}),
        when('state','RECOMPUTING',{'unavailableReason':literal('SOURCE_CHANGED')}),when('state','UNAVAILABLE',{'checkpoint':{'type':'null'},'unavailableReason':enum('SOURCE_INCOMPLETE','PREDECESSOR_UNAVAILABLE','RECOVERY_REQUIRED')})]
    s['CourseStatisticsScope']=obj({'scopeId':UUID,'courseId':UUID,'membershipScopeVersion':text(),'kind':enum('CURRENT_ACTIVE_MEMBERS','HISTORICAL_SETTLEMENT'),
        'memberCount':count(),'settlementVersionId':nullable(UUID),'snapshotId':UUID},description='Denominator belongs to the same authoritative complete enrollment set as aggregates. Historical scope never silently becomes today\'s active members.')
    s['CourseStatisticsScope']['allOf']=[when('kind','CURRENT_ACTIVE_MEMBERS',{'settlementVersionId':{'type':'null'}}),when('kind','HISTORICAL_SETTLEMENT',{'settlementVersionId':UUID})]
    s['StudentCourseProgressPage']=obj({'scope':ref('CourseStatisticsScope'),'items':array_of(ref('StudentCourseProgress')),'page':ref('CursorPage')},description='All pages pinned to the same server snapshot and complete membership scope. No page-by-page latest-source mixing. Unavailable snapshot returns STATISTICS_UNAVAILABLE.')
    s['AdminCurrentCourseMetrics']['properties']['scope']=ref('CourseStatisticsScope');s['AdminCurrentCourseMetrics']['required'].append('scope')
    s['AdminCurrentCourseMetrics']['description']='Authorized read-only current-active-member aggregate. Complete same-snapshot scope; sum each member\'s capped checkpoint before averaging. ValidRecordCount means review VALID, not selected record count. Missing sources return STATISTICS_UNAVAILABLE, never zero. Known empty scope alone has zero average; no inferred completed-student ratio.'

    s['CourseInvitationCreateRequest']=obj({'lifetimeMinutes':{'type':'integer','minimum':5,'maximum':120,'default':30},'expectedCourseVersion':VERSION},optional=('lifetimeMinutes',),description='Server derives createdAt and original expiresAt. QR and manual code use exactly the same lifetime and one grace policy.')
    s['CourseInvitation']['properties']['createdAt']=INSTANT;s['CourseInvitation']['required'].append('createdAt')
    s['CourseInvitation']['properties']['revocable']['description']='Unrevoked invitation with an unfinished legally registered flow can still be revoked during natural-expiry grace, so its current expiry is not sufficient to make it irrevocable.'
    s['CourseInvitationPreview']['properties'].update({'newRegistrationAllowed':{'type':'boolean'},
        'unavailableReason':nullable(enum('EXPIRED','REVOKED','JOIN_CLOSED','COURSE_CLOSED','NOT_CURRENT'))})
    s['CourseInvitationPreview']['required']+=['newRegistrationAllowed','unavailableReason']
    s['CourseInvitationPreview']['allOf']=[when('newRegistrationAllowed',True,{'status':literal('ACTIVE'),'unavailableReason':{'type':'null'}}),
        when('newRegistrationAllowed',False,{'unavailableReason':enum('EXPIRED','REVOKED','JOIN_CLOSED','COURSE_CLOSED','NOT_CURRENT')})]
    s['RegisterExistingInvitationFlowRequest']=obj({'expectedAccountVersion':VERSION})
    s['RegisterNewInvitationFlowRequest']=obj({'clientFlowNonce':string_schema(min_length=64,max_length=64,pattern='^[0-9a-f]{64}$',fmt='password',write_only=True)},
        description='Explicit registration-start command, not preview. Client creates a cryptographically random 256-bit nonce once for this flow and reuses it for exact retries; server binds its digest as the anonymous command subject to the original invitation. No email verification or personal data is required to register before expiry; final joining still requires Identity Owner verification. No account/enrollment is created, and local draft/challenge request alone is not registration. Never log the nonce or persist it as plaintext server data.')
    s['InvitationRegistrationFlow']=obj({'flowId':UUID,'registeredAt':INSTANT,'originalExpiresAt':INSTANT,'graceEndsAt':INSTANT,
        'status':enum('REGISTERED','COMPLETED','TERMINATED'),'course':ref('InvitationCourseSummary'),'version':VERSION},
        description='Same authenticated actor or server-bound anonymous flow subject, same original invitation/course/semester, server registeredAt<originalExpiresAt. Fixed grace end expiresAt+600 seconds. First acceptance strictly before end. Revoke/admission close/course close/semester invalidity terminate unfinished flows. No refresh extension or identity/unique-course exemption.')
    s['NewInvitationFlowAuthorization']=obj({'flow':ref('InvitationRegistrationFlow'),'flowAuthorization':string_schema(min_length=1,fmt='password')},description='One-flow sensitive proof bound to the server-registered anonymous flow, not proof of email/account identity. Persist only non-reversible/secure replay material, never raw proof in logs or URLs. Does not create login rights; exact replay only with original nonce subject, expires with original flow and cannot refresh grace.')
    s['ExistingStudentJoinRequest']['properties']['flowId']=UUID;s['ExistingStudentJoinRequest']['required'].append('flowId')
    p=s['NewStudentRegistrationRequest']['properties'];p.update({'flowId':UUID,'flowAuthorization':string_schema(min_length=1,fmt='password',write_only=True)})
    s['NewStudentRegistrationRequest']['required']+=['flowId','flowAuthorization']
    s['NewStudentRegistrationRequest']['description']='Authenticate original bound flow proof, then verify and consume STUDENT_EMAIL_BINDING OTP only for the first successful final registration. verifiedEmail must match the Identity Owner proof subject. Atomically create account/profile/enrollment and bind the verified account to the original anonymous flow; email proof may complete during grace if still valid. Flow possession alone is not verified identity. Stable full request and authorized original subject exact replay returns original success without re-consuming OTP or refreshing grace; no partial account enrollment.'

    s['SettlementSourceReference']=obj({'owner':enum(*POLICY['settlement']['ownerSources']),'scopeId':text(),'sourceVersion':text(),'complete':{'type':'boolean','const':True}}, description='Opaque complete authoritative public Owner source. Required source set is complete; failures cannot be represented by omitted owners or fabricated empty tokens.')
    s['SettlementBlocker']=obj({'owner':enum(*POLICY['settlement']['ownerSources']),'objectId':text(),
        'code':enum('UNFINISHED_SESSION','FIRST_MATERIAL_PENDING','LOCKED_TRANSFER_PENDING','TECHNICAL_PROCESSING','REVIEW_PENDING','SUPPLEMENT_WINDOW_ACTIVE','ROSTER_PENDING','ENDURANCE_PENDING','APPLICATION_PENDING','STATISTICS_PENDING','OTHER_TEACHING_PENDING'),
        'reason':ref('LocalizedText')},description='Responsible-teacher actionable reference supplied by the owning capability. Review/timer values consumed, never reinterpreted by settlement. Valid unfinished first-material chains block even before an acceptance receipt exists.')
    s['SettlementPreparationRequest']=obj({'expectedCourseVersion':VERSION,'expectedPreviousSettlementVersionId':nullable(UUID),
        'correctionFactId':nullable(UUID),'reason':nullable(text())},description='Normal first settlement uses null correction and predecessor; correction references an authorized existing Owner fact and preceding report with reason. Server derives historical membership and all values; clients do not submit statistics, row arrays, blocker booleans or source tokens.')
    s['SettlementPreparationRequest']['allOf']=[when('correctionFactId',None,{'expectedPreviousSettlementVersionId':{'type':'null'},'reason':{'type':'null'}}),
        {'if':{'properties':{'correctionFactId':{'type':'string'}},'required':['correctionFactId']},'then':{'properties':{'expectedPreviousSettlementVersionId':UUID,'reason':text()}}}]
    s['SettlementPreparation']=obj({'preparationId':UUID,'courseId':UUID,'semesterId':UUID,'expectedCourseVersion':VERSION,'previousSettlementVersionId':nullable(UUID),
        'correctionFactId':nullable(UUID),'reason':nullable(text()),'state':enum('READY','BLOCKED','UNAVAILABLE'),
        'preparationToken':nullable(text()),'membershipScopeVersion':nullable(text()),'sources':array_of(ref('SettlementSourceReference')),
        'blockers':array_of(ref('SettlementBlocker')),'unavailableOwners':array_of(enum(*POLICY['settlement']['ownerSources']),unique=True),'preparedAt':INSTANT},
        description='Full server manifest pins independently supplied complete member set, all sources, every immutable statistics checkpoint and content, and report predecessor. Public summary is not itself a trust proof. READY requires no new-start eligibility left (original closeout ended or course explicitly closed), no pending chains, all sources complete/current and exact member coverage. Being below1200 is not a blocker. Ready tokens are invalidated by any relevant drift.')
    s['SettlementPreparation']['allOf']=[when('state','READY',{'preparationToken':text(),'membershipScopeVersion':text(),'sources':{'minItems':len(POLICY['settlement']['ownerSources'])},'blockers':{'maxItems':0},'unavailableOwners':{'maxItems':0}}),
        when('state','BLOCKED',{'preparationToken':{'type':'null'},'blockers':{'minItems':1}}),when('state','UNAVAILABLE',{'preparationToken':{'type':'null'},'unavailableOwners':{'minItems':1}})]
    s['ConfirmSettlementRequest']=obj({'preparationId':UUID,'preparationToken':text(),'expectedPreviousSettlementVersionId':nullable(UUID)})
    s['SettlementReportVersion']=obj({'settlementVersionId':UUID,'courseId':UUID,'semesterId':UUID,'versionNo':integer_schema(minimum=1),
        'previousSettlementVersionId':nullable(UUID),'kind':enum('INITIAL','CORRECTION'),'correctionFactId':nullable(UUID),'reason':nullable(text()),
        'membershipScopeVersion':text(),'memberCount':count(),'sourceManifestSha256':SHA256,'sources':array_of(ref('SettlementSourceReference'),min_items=len(POLICY['settlement']['ownerSources'])),
        'policyVersion':literal('P4Z-A-08-v1'),'confirmedAt':INSTANT,'confirmedBy':ref('TeacherSummary')},
        description='Immutable confirmed version. Head, complete rows/content identities, full manifest, command result, pointer and audit/notification facts commit together under source/predecessor protection. No PDF/file generation is implied; failed artifact export cannot rename an old file as new or reverse an already committed business transaction.')
    s['SettlementReportVersion']['allOf']=[when('kind','INITIAL',{'previousSettlementVersionId':{'type':'null'},'correctionFactId':{'type':'null'},'reason':{'type':'null'},'versionNo':{'const':1}}),
        when('kind','CORRECTION',{'previousSettlementVersionId':UUID,'correctionFactId':UUID,'reason':text(),'versionNo':{'minimum':2}})]
    # A minItems check alone accepts repeated Owners and can conceal an omitted source.
    complete_sources={'minItems':len(POLICY['settlement']['ownerSources']), 'maxItems':len(POLICY['settlement']['ownerSources']),
        'allOf':[{'contains':{'properties':{'owner':{'const':owner}},'required':['owner']},'minContains':1,'maxContains':1}
                 for owner in POLICY['settlement']['ownerSources']]}
    s['SettlementReportVersion']['properties']['sources'].update(complete_sources)
    s['SettlementPreparation']['allOf'][0]['then']['properties']['sources']=complete_sources
    s['SettlementReportRow']=obj({'settlementVersionId':UUID,'enrollmentId':UUID,'student':ref('StudentSummary'),'checkpoint':ref('StatisticsCheckpoint'),
        'unmetTargetReasons':array_of(ref('LocalizedText'))},description='Exactly one immutable row per authoritative historical enrollment. Original checkpoint content, not a lookup of today\'s cache. No final grade, score, rank or substitute remark; controlled correction reason is on the report event.')
    s['SettlementReportRowPage']=obj({'settlementVersionId':UUID,'membershipScopeVersion':text(),'items':array_of(ref('SettlementReportRow')),'page':ref('CursorPage')},description='Cursor is pinned to report version/content; all pages cover its exact full member set without duplication. Historical removed members remain in original scope.')
    s['SettlementReportVersionPage']=obj({'items':array_of(ref('SettlementReportVersion')),'page':ref('CursorPage')})
    s['CourseSettlementSummary']=obj({'courseId':UUID,'state':enum('NOT_SETTLED','BLOCKED','UNAVAILABLE','SETTLED'),
        'currentSettlementVersionId':nullable(UUID),'pendingCount':nullable(count()),'sourceVersion':nullable(text()),'observedAt':INSTANT},description='Admin aggregate only; no student/record/media/grade drill-down. SETTLED requires current complete unblocked sources, not merely a past report. Missing sources are UNAVAILABLE with no invented pendingCount=0.')
    s['CourseSettlementSummary']['allOf']=[when('state','UNAVAILABLE',{'pendingCount':{'type':'null'},'sourceVersion':{'type':'null'}}),when('state','SETTLED',{'currentSettlementVersionId':UUID,'pendingCount':{'const':0},'sourceVersion':text()})]
    s['CourseSettlementSummaryPage']=obj({'semesterId':UUID,'courseSetVersion':text(),'items':array_of(ref('CourseSettlementSummary')),'page':ref('CursorPage')},description='Complete authority-pinned course set across pages. Semester archival must obtain and recheck all courses under its protected switch, never only one page.')


def register_operations(registry):
    def replace(operation_id, **changes):
        old=next(x for item in registry.paths.values() for x in item.values() if isinstance(x,dict) and x.get('operationId')==operation_id)
        row=next(x for x in registry.operations if x.operation_id==operation_id)
        success=next((k,v) for k,v in old['responses'].items() if k.startswith('2'))
        args=dict(method=row.method,path=row.path,operation_id=operation_id,tag=old['tags'][0],summary=old['summary'],description=old['description'],roles=old['x-roles'],
                  permissions=old['x-admin-permissions'],resource_scope=old['x-resource-scope'],system_mode=old['x-system-mode'],
                  success_schema=success[1]['content']['application/json']['schema']['$ref'].split('/')[-1],success_status=int(success[0]),
                  parameters=[p for p in old.get('parameters',[]) if p.get('$ref')!='#/components/parameters/IdempotencyKey'],
                  idempotent=old['x-idempotency']['required'],error_codes=[c for c in old['x-error-codes'] if c not in RETIRED_ERRORS],public=old['security']==[])
        if 'requestBody' in old:args['request_schema']=old['requestBody']['content']['application/json']['schema']['$ref'].split('/')[-1]
        if 'sensitiveResponse' in old['x-idempotency']:args['sensitive_response']=True
        args.update(changes);del registry.paths[row.path][row.method.lower()];registry.operations.remove(row);registry.add(**args)
    def add(method,path,oid,tag,summary,description,response,request=None,roles=None,scope='RESPONSIBLE_TEACHER',errors=(),public=False,permissions=None,sensitive=False):
        params=[path_parameter(part[1:-1],text() if part=='{invitationCode}' else UUID) for part in path.split('/') if part.startswith('{')]
        if response.endswith('Page'):params+=cursor_parameters(default_limit=20,maximum_limit=100)
        registry.add(method=method,path=path,operation_id=oid,tag=tag,summary=summary,description=description,success_schema=response,request_schema=request,
            roles=roles or ['TEACHER'],resource_scope=scope,parameters=params,idempotent=method=='post',error_codes=list(errors),public=public,permissions=permissions,sensitive_response=sensitive)
    for oid,desc,errs in [
        ('createCourse','Creates a complete configuration DRAFT in the unique current semester. No join or exercise is allowed until authoritative feasible-plan publication freezes its rule.', ['COURSE_TARGET_TOTAL_INVALID','SEMESTER_NOT_CURRENT','RESOURCE_NOT_FOUND']),
        ('previewCourseChangeImpact','Evaluates name/description changes only; frozen rule, targets, frequency and schedule cannot enter this proposal.', ['VERSION_CONFLICT']),
        ('updateCourse','Applies only the previewed name/description change for an open published course. Rule and original schedule stay immutable; no old target revision update exists.', ['COURSE_NOT_OPEN','VERSION_CONFLICT']),
        ('closeCourse','Closes new member, session, application and make-up starts under shared admission protection; terminates unfinished invitation flows. Existing legal sessions, first-material chains even before first receipt, locked transfer, once-only supplement/review, accepted roster/OCR/applications and settlement continue in original scope and deadlines. Pending work DOES NOT prevent closure, and closure is not settlement or archival. No restoration.', ['COURSE_NOT_OPEN','VERSION_CONFLICT']),
        ('startExerciseSession','Server start binds the published rule and original Shanghai start day/week. Recheck school email, active membership, current semester, open published course, allowed normal interval or named make-up window, mode and single active session. Target reached/daily/weekly quota never prevents a real independent session. Closure/removal prevents new starts; completion keeps original scope.', ['ENROLLMENT_NOT_ACTIVE','COURSE_NOT_OPEN','COURSE_NOT_PUBLISHED','SESSION_ALREADY_ACTIVE','CHECKIN_WINDOW_CLOSED','MAKEUP_NOT_ALLOWED','VERSION_CONFLICT']),
        ('createCourseInvitation','Server creates a digest-backed invitation for a published open current-semester course, lifetime5..120 minutes default30; QR/manual code identical. Closing join/course or revoking terminates unfinished registered flows, not existing members.', ['COURSE_NOT_OPEN','COURSE_NOT_PUBLISHED','VERSION_CONFLICT']),
        ('joinCourseByInvitation','Require authenticated flow owner and original invitation. First successful acceptance under current flow/invitation/course/semester shared protection is strictly before fixed original expiry+600s, after registeredAt<expiry. Recheck verified identity and unique active course. No new flow at expiry. Exact committed receipt returns original enrollment once; no current-pointer or deadline refresh.', ['INVITATION_INVALID','INVITATION_FLOW_EXPIRED','INVITATION_FLOW_TERMINATED','INVITATION_FLOW_MISMATCH','COURSE_ALREADY_JOINED','VERSION_CONFLICT']),
        ('registerStudentAndJoinCourse','Authenticate original secret flow authorization and exact anonymous command subject before any receipt lookup. First successful command verifies the current school-email OTP, unique active class and identity, then atomically creates account/profile/enrollment and binds the verified identity under shared invitation/course/semester/identity protection. OTP may be verified during grace; its own validity is not extended. First acceptance<original expiry+600 seconds; exact authorized stable-request replay returns original result without re-consuming OTP, refreshing grace or recreating membership.', ['INVITATION_INVALID','INVITATION_FLOW_EXPIRED','INVITATION_FLOW_TERMINATED','INVITATION_FLOW_MISMATCH','INVALID_CREDENTIALS','CHALLENGE_EXPIRED','COURSE_ALREADY_JOINED','EMAIL_ALREADY_IN_USE','STUDENT_NUMBER_ALREADY_IN_USE']),
    ]:
        extra={'sensitive_response':True} if oid=='registerStudentAndJoinCourse' else {}
        replace(oid,description=desc,error_codes=errs,**extra)
    for oid in ['getOwnCourseProgress','getCourseMemberProgress','listCourseProgress']:
        replace(oid,description='Read authoritative joint-selection checkpoints and explicit current/recomputing/unavailable state. Server computes capped per-member categories then aggregates within one complete source/membership snapshot. No target/quota session gate, no old0/60/120 credit mapping or pending-as-invalid fallback.',error_codes=['STATISTICS_UNAVAILABLE'])
    for oid in ['listCurrentCoursesForAdmin','getCurrentCourseForAdmin']:
        op=next(x for item in registry.paths.values() for x in item.values() if isinstance(x,dict) and x.get('operationId')==oid)
        replace(oid,error_codes=op['x-error-codes']+['STATISTICS_UNAVAILABLE'])
    op=next(x for item in registry.paths.values() for x in item.values() if isinstance(x,dict) and x.get('operationId')=='switchCurrentSemester')
    replace('switchCurrentSemester',description=op['description']+' Before archiving, obtain the complete authoritative course set and current unblocked settlement/source results for every course, protected through switch commit. Missing/partial sources or a merely historical report fail closed; never bulk-invalidate pending work or restore archived semesters.',error_codes=op['x-error-codes']+['SEMESTER_SETTLEMENT_BLOCKED','SETTLEMENT_SOURCE_UNAVAILABLE'])
    for method,path,oid,tag,summary,desc,response,request in [
        ('get','/rule-template-versions','listPublishedRuleTemplates','Courses','List immutable published rule templates','Teacher selects a published allowed version; super-admin reads the same fixed rule family. Sub-admin cannot use this capability.','RuleTemplateVersionPage',None),
        ('post','/admin/rule-template-versions','publishRuleTemplateVersion','Admin governance','Publish a fixed rule template version','Super-admin only, mandatory first-password gate. No ninth permission and no GLOBAL_RULES/SYSTEM_MODE indirect grant; new template never retargets a published course.','RuleTemplateVersion','RuleTemplatePublishRequest'),
        ('post','/courses/{courseId}/draft-rule','updateCourseDraftRule','Courses','Update an unpublished course rule','Only DRAFT and responsible teacher; published parameters cannot be changed through this endpoint. Validate current semester and1200 sum.','Course','CourseDraftUpdateRequest'),
        ('post','/courses/{courseId}/publication-plan','prepareCoursePublication','Courses','Prepare exact course feasibility evidence','Use authoritative complete legal calendar and fixed draft/template/semester versions. Positive complete joint witness or exact negative evidence, otherwise unavailable. No final business fact published.','CoursePlanEvidence','CoursePlanRequest'),
        ('post','/courses/{courseId}/publication','publishCourse','Courses','Publish and freeze a feasible course','Recheck token binding, complete evidence and protected source versions and DRAFT version; atomically freeze rule and schedule, open course, schedule proper reminder. Old evidence never relabeled.','Course','PublishCourseRequest'),
        ('post','/courses/{courseId}/makeup-authorizations','authorizeCourseMakeup','Courses','Authorize one student in the original closeout','Current semester, open course, active named member, original seven-day closeout only. Persist teacher/time and original rule; delayed settlement does not extend it.','MakeupAuthorization','MakeupAuthorizationRequest'),
        ('get','/courses/{courseId}/makeup-authorizations','listCourseMakeupAuthorizations','Courses','List named make-up authorizations','Responsible teacher only, original course scope.','MakeupAuthorizationPage',None),
        ('get','/student/makeup-authorizations','listOwnMakeupAuthorizations','Courses','Read own named make-up windows','Only own enrollment grants; historical grant does not override current course, semester, membership or mode.','MakeupAuthorizationPage',None),
        ('get','/statistics/checkpoints/{checkpointId}/records','listCheckpointRecordCredits','Statistics','Read record counting detail at a checkpoint','Own student or responsible teacher only. Pin all pages to immutable checkpoint and original enrollment; retained historical self scope after removal/closure, no admin or cross-student drill-down.','RecordCreditDetailPage',None),
        ('post','/course-invitations/{invitationCode}/existing-student-flows','registerExistingInvitationFlow','Enrollment','Register the same verified existing-student join flow','Authenticated school-email verified subject; share current invitation/course/semester protection and register strictly before original expiry. At most one flow identity for same operation/idempotency command. Registration is not enrollment.','InvitationRegistrationFlow','RegisterExistingInvitationFlowRequest'),
        ('post','/course-invitations/{invitationCode}/new-student-flows','registerNewInvitationFlow','Enrollment','Register the original new-student invitation flow','Explicit registration-start command binds an unpredictable client nonce digest to the original invitation and an opaque server flow. Strict server registration before original expiry under shared admission protection; no requirement to finish email verification before expiry and no extra personal data/account. Sensitive proof only to initial requester or exact original anonymous-subject retry; preview, scanning, challenge requests and local drafts never register a flow. Final joining independently verifies identity/OTP.','NewInvitationFlowAuthorization','RegisterNewInvitationFlowRequest'),
        ('post','/courses/{courseId}/settlement-preparations','prepareCourseSettlement','Courses','Prepare complete settlement or existing-fact correction','Require every independent Owner source, full enrollment set and exact immutable A content. Both lawful first-material-before-receipt and locked transfer block. Pending windows/tasks never become invalid to clear queues. Closeout eligibility and historical correction scope rechecked.','SettlementPreparation','SettlementPreparationRequest'),
        ('post','/courses/{courseId}/settlements','confirmCourseSettlement','Courses','Confirm one immutable report version','Recheck complete source sets/rows, unchanged manifest/content/membership and predecessor under shared Owner protection held to atomic commit. Commit head/all rows/manifest/result/pointer/audit together. Source drift or unavailable protection stops publication. Exact receipt replay returns original version without moving current pointer.','SettlementReportVersion','ConfirmSettlementRequest'),
        ('get','/courses/{courseId}/settlements','listCourseSettlements','Courses','List immutable report versions','Responsible teacher reads historical and current original versions. Report existence alone is not current settlement eligibility.','SettlementReportVersionPage',None),
        ('get','/courses/{courseId}/settlements/{settlementVersionId}','getCourseSettlement','Courses','Read one fixed settlement report identity','Preserve old version/content/source even after correction or archival; same course and responsible teacher.','SettlementReportVersion',None),
        ('get','/courses/{courseId}/settlements/{settlementVersionId}/rows','listSettlementReportRows','Courses','Read version-pinned settlement rows','Exact original membership scope and checkpoint values, removed members retained; no live-cache substitution. Future authorized corrections append version with reason, never mutate old rows or reopen ordinary starts.','SettlementReportRowPage',None),
        ('get','/admin/semesters/{semesterId}/course-settlements','listSemesterSettlementSummaries','Semesters','Read course settlement summaries and pending counts','SEMESTER-permitted administrator sees aggregates only, no student data. Complete course-set version pinned across pages; service-unavailable collection never means no courses.','CourseSettlementSummaryPage',None),
    ]:
        roles=['TEACHER'];scope='RESPONSIBLE_TEACHER';errors=[];public=False;permissions=None;sensitive=False
        if oid=='listPublishedRuleTemplates':roles=['TEACHER','ADMIN'];scope='TEACHER_OR_SUPER_ADMIN';errors=['FIRST_PASSWORD_CHANGE_REQUIRED']
        if oid=='publishRuleTemplateVersion':roles=['ADMIN'];scope='SUPER_ADMIN_ONLY';errors=['FIRST_PASSWORD_CHANGE_REQUIRED','VERSION_CONFLICT']
        if oid=='updateCourseDraftRule':errors=['COURSE_RULES_LOCKED','COURSE_TARGET_TOTAL_INVALID','SEMESTER_NOT_CURRENT','VERSION_CONFLICT']
        if oid=='prepareCoursePublication':errors=['COURSE_RULES_LOCKED','VERSION_CONFLICT','COURSE_PLAN_UNAVAILABLE']
        if oid=='publishCourse':errors=['COURSE_RULES_LOCKED','COURSE_PLAN_INFEASIBLE','COURSE_PLAN_UNAVAILABLE','COURSE_PLAN_STALE','VERSION_CONFLICT']
        if oid=='authorizeCourseMakeup':errors=['MAKEUP_NOT_ALLOWED','COURSE_NOT_OPEN','ENROLLMENT_NOT_ACTIVE','VERSION_CONFLICT']
        if oid=='listOwnMakeupAuthorizations':roles=['STUDENT'];scope='SELF_ORIGINAL_ENROLLMENT'
        if oid=='listCheckpointRecordCredits':roles=['STUDENT','TEACHER'];scope='CHECKPOINT_ENROLLMENT_OWNER_OR_RESPONSIBLE_TEACHER';errors=['STATISTICS_UNAVAILABLE']
        if oid in ['registerExistingInvitationFlow','registerNewInvitationFlow']:
            public=oid=='registerNewInvitationFlow';roles=['ANONYMOUS'] if public else ['STUDENT'];scope='ANONYMOUS_FLOW_SUBJECT_AND_PRESENTED_INVITATION' if public else 'VERIFIED_SUBJECT_AND_PRESENTED_INVITATION'
            errors=['INVITATION_INVALID','INVITATION_FLOW_EXPIRED','INVITATION_FLOW_TERMINATED','INVITATION_FLOW_MISMATCH'] if public else ['INVITATION_INVALID','INVITATION_FLOW_EXPIRED','INVITATION_FLOW_TERMINATED','VERSION_CONFLICT']
            sensitive=public
            if public: errors.append('INVALID_CREDENTIALS')
        if oid=='prepareCourseSettlement':errors=['SETTLEMENT_SOURCE_UNAVAILABLE','SETTLEMENT_CORRECTION_INVALID','VERSION_CONFLICT']
        if oid=='confirmCourseSettlement':errors=['SETTLEMENT_BLOCKED','SETTLEMENT_SOURCE_STALE','SETTLEMENT_SOURCE_UNAVAILABLE','SETTLEMENT_CORRECTION_INVALID']
        if oid=='listSemesterSettlementSummaries':roles=['ADMIN'];scope='CURRENT_ORGANIZATION_READ_ONLY';permissions=['SEMESTER'];errors=['FIRST_PASSWORD_CHANGE_REQUIRED','SETTLEMENT_SOURCE_UNAVAILABLE']
        add(method,path,oid,tag,summary,desc,response,request,roles,scope,errors,public,permissions,sensitive)
    for path,item in registry.paths.items():
        for method,op in item.items():
            oid=op['operationId']
            if oid=='previewCourseInvitation':op['description']+=' Read-only preview never registers a flow, grants grace or writes any fact. newRegistrationAllowed reflects current new-entry eligibility, including join closure. It does not grant or deny an already registered subject-specific grace flow.'
            if oid=='revokeCourseInvitation':op['description']+=' Revoke even during natural-expiry grace when an unfinished flow remains; atomically terminate those flows under the same protection as final joining.'
            if oid=='listOwnCourses':
                next(p for p in op['parameters'] if p.get('name')=='status')['schema']=enum('DRAFT','OPEN','CLOSED')
            if oid in ['publishRuleTemplateVersion','listPublishedRuleTemplates']:op['x-admin-kind-required']='SUPER'
            if oid in ['registerExistingInvitationFlow','registerNewInvitationFlow','joinCourseByInvitation','registerStudentAndJoinCourse','confirmCourseSettlement','closeCourse','publishCourse','authorizeCourseMakeup']:
                op['x-idempotency']['evaluationOrder']=['AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE','EXACT_COMMITTED_RECEIPT','NEW_COMMAND_MODE_VERSION_ELIGIBILITY_AND_SOURCE_PROTECTION']
                op['x-system-mode-replay']='AUTHORIZED_COMMITTED_RESULT_ONLY'
    # No externally callable selection-publication command: this remains an internal Owner collaboration.


def register_course_workflow(schemas, registry):
    register_schemas(schemas)
    register_operations(registry)
