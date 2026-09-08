"""Synthetic wire cases. No real school calendar, accounts or student data."""
from copy import deepcopy

U='00000000-0000-4000-8000-000000000001'
V='00000000-0000-4000-8000-000000000002'
T='2026-09-07T02:00:00.000000001Z'
LABEL={'zh':'测试','en':'Test'}
STUDENT={'studentId':U,'studentNumber':'20260001','name':'测试学生','gender':'FEMALE','gradeYear':1,'college':None,'major':None,'administrativeClass':None,'studentStatus':'ACTIVE'}
SOURCES=['MEMBERSHIP','ROSTER','SESSIONS','MATERIALS','REVIEWS_AND_TIMERS','TECHNICAL_PROCESSING','EXEMPTIONS','CERTIFICATIONS','ENDURANCE','STATISTICS','OTHER_TEACHING']
REFS=[{'owner':o,'scopeId':U,'sourceVersion':'v1','complete':True} for o in SOURCES]
CATEGORY={'category':'COURSE_RELATED','targetMinutes':600,'activeCertificationMinutes':570,'countedCertificationMinutes':570,'countedRecordMinutes':30,'cappedCompletedMinutes':600,'remainingMinutes':0}
TOTALS={'categories':[CATEGORY,{**CATEGORY,'category':'OTHER','activeCertificationMinutes':599,'countedCertificationMinutes':599,'countedRecordMinutes':0,'cappedCompletedMinutes':599,'remainingMinutes':1}],
    'totalTargetMinutes':1200,'totalCompletedMinutes':1199,'completionRatio':1199/1200,'displayPercent':100,'targetMet':False,'actualDurationSeconds':5400,
    'countedRecordMinutes':30,'countedCertificationMinutes':1169,'invalidActualMinutes':0,'validUncountedEligibleMinutes':30,'validFormulaExcludedMinutes':30,'pendingRecordCount':0}
CHECKPOINT={'checkpointId':U,'courseId':U,'enrollmentId':U,'sources':{'ruleVersionId':U,'recordFactSetVersion':'r1','reviewCandidateSetVersion':'b1',
    'certificationSetVersion':'c1','membershipScopeVersion':'m1','previousCheckpointId':None},'policyVersion':'P4Z-A-08-v1','totals':TOTALS,'selectedRecordIds':[U],'computedAt':T}
RULE={'templateVersionId':U,'courseRelatedTargetMinutes':600,'otherTargetMinutes':600,'allowedIntervals':[{'startsAt':T,'endsAtExclusive':'2026-09-30T02:00:00.000000001Z'}],
      'regularCutoffAt':'2026-09-30T02:00:00.000000001Z','plannedSettlementAt':'2026-10-07T02:00:00.000000001Z'}


def build():
    cases=[]
    def add(name,schema,payload,valid=True,typed=False):cases.append({'name':name,'schema':schema,'payload':deepcopy(payload),'expectedValid':valid,'typed':typed})
    add('template/publish','RuleTemplatePublishRequest',{'label':LABEL,'expectedLatestVersionId':None},typed=True)
    template={'templateVersionId':U,'versionNo':1,'label':LABEL,'status':'PUBLISHED','totalTargetMinutes':1200,'thresholdChoices':[30,45,60],
        'defaultThresholdMinutes':30,'singleRecordCapMinutes':60,'dailyCountLimit':1,'weeklyCountChoices':[2,3,4],'defaultWeeklyCountLimit':3,'formulaVersion':'P4Z-A-08-v1','publishedAt':T}
    add('template/fixed','RuleTemplateVersion',template,typed=True)
    add('draft/defaults','CourseRuleConfiguration',RULE,typed=True)
    for h in [30,45,60]:
        for k in [2,3,4]:add(f'draft/{h}/{k}','CourseRuleConfiguration',{**RULE,'thresholdMinutes':h,'weeklyCountLimit':k})
    frozen={'ruleVersionId':U,'courseId':U,'semesterId':U,'versionNo':1,'template':template,'courseRelatedTargetMinutes':600,'otherTargetMinutes':600,
        'thresholdMinutes':30,'weeklyCountLimit':3,'allowedIntervals':RULE['allowedIntervals'],'regularCutoffAt':RULE['regularCutoffAt'],
        'closeoutEndsAt':RULE['plannedSettlementAt'],'plannedSettlementAt':RULE['plannedSettlementAt'],'reminderScheduledAt':'2026-09-16T02:00:00.000000001Z','publishedAt':T}
    add('rule/frozen','CourseRuleVersion',frozen,typed=True)
    add('course/draft_request','CourseCreateRequest',{'semesterId':U,'name':'体育课','description':None,'rule':RULE},typed=True)
    add('course/draft_update','CourseDraftUpdateRequest',{'rule':RULE,'expectedVersion':1},typed=True)
    add('course/name_only','CourseUpdateRequest',{'name':'体育课A','description':None,'expectedVersion':1,'impactToken':'opaque'},typed=True)
    plan={'evidenceId':U,'draftVersion':1,'templateVersionId':U,'semesterVersion':1,'calendarSourceVersion':'cal1','result':'FEASIBLE','proofKind':'LEGAL_COMPLETE_WITNESS','explanation':LABEL,'publicationToken':'opaque','computedAt':T}
    add('plan/feasible','CoursePlanEvidence',plan,typed=True)
    add('plan/proven_impossible','CoursePlanEvidence',{**plan,'result':'INFEASIBLE','proofKind':'STRICT_IMPOSSIBILITY_PROOF','publicationToken':None},typed=True)
    add('plan/unknown','CoursePlanEvidence',{**plan,'result':'UNAVAILABLE','proofKind':'NONE','publicationToken':None},typed=True)
    add('course/publish','PublishCourseRequest',{'expectedCourseVersion':1,'publicationToken':'opaque'},typed=True)
    add('session/normal','StartExerciseSessionRequest',{'courseId':U,'expectedRuleVersionId':U,'makeupAuthorizationId':None},typed=True)
    add('session/makeup','StartExerciseSessionRequest',{'courseId':U,'expectedRuleVersionId':U,'makeupAuthorizationId':V},typed=True)
    add('makeup/grant','MakeupAuthorizationRequest',{'enrollmentId':U,'startsAt':'2026-10-01T02:00:00Z','endsAtExclusive':'2026-10-01T03:00:00Z','expectedCourseVersion':1},typed=True)
    add('progress/1199_is_not_met','ProgressTotals',TOTALS,typed=True)
    add('checkpoint/immutable','StatisticsCheckpoint',CHECKPOINT,typed=True)
    detail={'checkpointId':U,'recordId':U,'sessionId':U,'ruleVersionId':U,'category':'COURSE_RELATED','businessDate':'2026-09-07','originalWeekStartsOn':'2026-09-07',
        'startedAt':T,'actualDurationSeconds':5400,'actualWholeMinutes':90,'eligibleMinutes':60,'countedMinutes':30,'reviewResult':'VALID',
        'explanations':[{'code':'CATEGORY_REMAINING_LIMIT','message':LABEL,'relatedRecordIds':[]}]}
    add('record/partial_category_cap','RecordCreditDetail',detail,typed=True)
    add('record/pending_not_invalid','RecordCreditDetail',{**detail,'countedMinutes':0,'reviewResult':None,'explanations':[]},typed=True)
    progress={'courseId':U,'enrollmentId':U,'student':STUDENT,'state':'CURRENT','checkpoint':CHECKPOINT,'unavailableReason':None,'observedAt':T}
    add('progress/current','StudentCourseProgress',progress,typed=True)
    add('progress/recomputing_old_checkpoint','StudentCourseProgress',{**progress,'state':'RECOMPUTING','unavailableReason':'SOURCE_CHANGED'},typed=True)
    add('progress/no_zero_fallback','StudentCourseProgress',{**progress,'state':'UNAVAILABLE','checkpoint':None,'unavailableReason':'SOURCE_INCOMPLETE'},typed=True)
    add('invitation/default30','CourseInvitationCreateRequest',{'expectedCourseVersion':1},typed=True)
    preview={'status':'ACTIVE','course':{'courseId':U,'name':'测试课程','semester':{'semesterId':U,'academicYear':'2026-2027','termType':'FIRST','displayName':'测试学期','startDate':'2026-09-01','endDate':'2027-01-31','status':'CURRENT'},
        'responsibleTeacher':{'teacherId':U,'name':'测试教师'}},'expiresAt':T,'newRegistrationAllowed':True,'unavailableReason':None}
    add('preview/active_new_registration','CourseInvitationPreview',preview,typed=True)
    add('preview/join_closed','CourseInvitationPreview',{**preview,'newRegistrationAllowed':False,'unavailableReason':'JOIN_CLOSED'},typed=True)
    add('preview/expired_new_flow_blocked','CourseInvitationPreview',{**preview,'status':'EXPIRED','newRegistrationAllowed':False,'unavailableReason':'EXPIRED'},typed=True)
    add('preview/expired_cannot_register','CourseInvitationPreview',{**preview,'status':'EXPIRED'},False)
    for value in [5,30,120]:add(f'invitation/lifetime/{value}','CourseInvitationCreateRequest',{'lifetimeMinutes':value,'expectedCourseVersion':1},typed=True)
    add('flow/existing','RegisterExistingInvitationFlowRequest',{'expectedAccountVersion':1},typed=True)
    add('flow/new_before_email_verification','RegisterNewInvitationFlowRequest',{'clientFlowNonce':'f'*64},typed=True)
    add('flow/short_nonce','RegisterNewInvitationFlowRequest',{'clientFlowNonce':'f'*32},False)
    add('flow/non_hex_nonce','RegisterNewInvitationFlowRequest',{'clientFlowNonce':'z'*64},False)
    add('join/existing','ExistingStudentJoinRequest',{'expectedAccountVersion':1,'flowId':U},typed=True)
    add('join/new_same_flow','NewStudentRegistrationRequest',{'name':'测试','studentNumber':'20260001','gender':'FEMALE','gradeYear':1,'college':None,'major':None,'administrativeClass':None,
        'verifiedEmail':'fixture@bnbu.edu.cn','emailOtpProof':{'challengeId':U,'code':'test-only'},'flowId':U,'flowAuthorization':'test-only-not-real'},typed=True)
    add('settlement/prepare','SettlementPreparationRequest',{'expectedCourseVersion':1,'expectedPreviousSettlementVersionId':None,'correctionFactId':None,'reason':None},typed=True)
    add('settlement/correction_prepare','SettlementPreparationRequest',{'expectedCourseVersion':1,'expectedPreviousSettlementVersionId':U,'correctionFactId':V,'reason':'更正已有事实'},typed=True)
    prep={'preparationId':U,'courseId':U,'semesterId':U,'expectedCourseVersion':1,'previousSettlementVersionId':None,'correctionFactId':None,'reason':None,
        'state':'READY','preparationToken':'opaque','membershipScopeVersion':'m1','sources':REFS,'blockers':[],'unavailableOwners':[],'preparedAt':T}
    add('settlement/ready','SettlementPreparation',prep,typed=True)
    for code in ['FIRST_MATERIAL_PENDING','LOCKED_TRANSFER_PENDING','SUPPLEMENT_WINDOW_ACTIVE']:
        add('settlement/blocked/'+code,'SettlementPreparation',{**prep,'state':'BLOCKED','preparationToken':None,'blockers':[{'owner':'MATERIALS' if code!='SUPPLEMENT_WINDOW_ACTIVE' else 'REVIEWS_AND_TIMERS','objectId':U,'code':code,'reason':LABEL}]},typed=True)
    add('settlement/unavailable','SettlementPreparation',{**prep,'state':'UNAVAILABLE','preparationToken':None,'sources':[],'unavailableOwners':['MEMBERSHIP']},typed=True)
    add('settlement/confirm','ConfirmSettlementRequest',{'preparationId':U,'preparationToken':'opaque','expectedPreviousSettlementVersionId':None},typed=True)
    report={'settlementVersionId':U,'courseId':U,'semesterId':U,'versionNo':1,'previousSettlementVersionId':None,'kind':'INITIAL','correctionFactId':None,'reason':None,
        'membershipScopeVersion':'m1','memberCount':1,'sourceManifestSha256':'a'*64,'sources':REFS,'policyVersion':'P4Z-A-08-v1','confirmedAt':T,'confirmedBy':{'teacherId':U,'name':'教师'}}
    add('report/initial','SettlementReportVersion',report,typed=True)
    add('report/correction','SettlementReportVersion',{**report,'settlementVersionId':V,'versionNo':2,'previousSettlementVersionId':U,'kind':'CORRECTION','correctionFactId':V,'reason':'依据已记录纠错更新报告'},typed=True)
    add('report/row','SettlementReportRow',{'settlementVersionId':U,'enrollmentId':U,'student':STUDENT,'checkpoint':CHECKPOINT,'unmetTargetReasons':[LABEL]},typed=True)
    # Negative cases exercise actual schema restrictions, not semantic invariants JSON Schema cannot compare.
    for value in [4,121,30.5,'30',None]:add('invitation/bad/'+str(value),'CourseInvitationCreateRequest',{'expectedCourseVersion':1,'lifetimeMinutes':value},False)
    for value in [29,31,0,60.5,'30',None]:add('threshold/bad/'+str(value),'CourseRuleConfiguration',{**RULE,'thresholdMinutes':value},False)
    for value in [0,1,5,'3',None]:add('week/bad/'+str(value),'CourseRuleConfiguration',{**RULE,'weeklyCountLimit':value},False)
    add('plan/unknown_with_token','CoursePlanEvidence',{**plan,'result':'UNAVAILABLE','proofKind':'NONE'},False)
    add('plan/feasible_without_witness','CoursePlanEvidence',{**plan,'proofKind':'NONE'},False)
    add('progress/rounding_is_not_target','ProgressTotals',{**TOTALS,'targetMet':True},False)
    add('progress/unavailable_with_zero_checkpoint','StudentCourseProgress',{**progress,'state':'UNAVAILABLE','unavailableReason':'SOURCE_INCOMPLETE'},False)
    add('record/pending_cannot_count','RecordCreditDetail',{**detail,'reviewResult':None},False)
    add('record/invalid_cannot_count','RecordCreditDetail',{**detail,'reviewResult':'INVALID'},False)
    add('record/old120_credit','RecordCreditDetail',{**detail,'eligibleMinutes':120,'countedMinutes':120},False)
    add('settlement/ready_but_missing_sources','SettlementPreparation',{**prep,'sources':[]},False)
    add('settlement/unknown_with_token','SettlementPreparation',{**prep,'state':'UNAVAILABLE','unavailableOwners':['ROSTER']},False)
    add('report/correction_without_previous','SettlementReportVersion',{**report,'kind':'CORRECTION','versionNo':2,'correctionFactId':V,'reason':'纠错'},False)
    duplicate=deepcopy(REFS);duplicate[-1]=deepcopy(duplicate[0])
    add('report/count_same_but_missing_owner','SettlementReportVersion',{**report,'sources':duplicate},False)
    add('settlement/count_same_but_missing_owner','SettlementPreparation',{**prep,'sources':duplicate},False)
    add('progress/two_same_categories','ProgressTotals',{**TOTALS,'categories':[CATEGORY,CATEGORY]},False)
    add('publish/caller_feasible','PublishCourseRequest',{'expectedCourseVersion':1,'publicationToken':'opaque','feasible':True},False)
    add('course/old_target_update','CourseChangeProposal',{'name':'x','description':None,'expectedVersion':1,'otherTargetMinutes':600},False)
    add('settlement/caller_rows','ConfirmSettlementRequest',{'preparationId':U,'preparationToken':'opaque','expectedPreviousSettlementVersionId':None,'rows':[]},False)
    good=deepcopy([r for r in cases if r['expectedValid'] and r['typed']])
    for row in good:
        for field in row['payload']:
            if field in ['lifetimeMinutes','thresholdMinutes','weeklyCountLimit']:continue
            value=deepcopy(row['payload']);value.pop(field);add(row['name']+'/missing/'+field,row['schema'],value,False)
        value=deepcopy(row['payload']);value['unexpectedField']=True;add(row['name']+'/extra',row['schema'],value,False)
    return cases
