"""Read-only Step04 structural gates; these do not implement provider authorization."""
from copy import deepcopy

SOURCES = ['MEMBERSHIP','ROSTER','SESSIONS','MATERIALS','REVIEWS_AND_TIMERS','TECHNICAL_PROCESSING','EXEMPTIONS','CERTIFICATIONS','ENDURANCE','STATISTICS','OTHER_TEACHING']


def integrity_errors(spec):
    errors=[]
    def check(ok,message):
        if not ok:errors.append(message)
    s=spec['components']['schemas'];p=spec.get('x-course-workflow',{})
    ops={o['operationId']:o for item in spec['paths'].values() for o in item.values() if isinstance(o,dict) and 'operationId' in o}
    check('CR-20260908-002' in spec['x-contract-governance']['acceptedPhase5ChangeRequests'],'CR identity')
    check(p.get('rule')=={'totalTargetMinutes':1200,'thresholdMinutes':[30,45,60],'defaultThresholdMinutes':30,'singleRecordCapMinutes':60,'dailyCountLimit':1,'weeklyCountLimits':[2,3,4],'defaultWeeklyCountLimit':3,'timezone':'Asia/Shanghai','weekStart':'MONDAY','freezeAt':'COURSE_PUBLICATION','futureTemplateRetargetsPublishedCourses':False},'Frozen rule policy')
    for field,value in {'wholeMinutes':'FLOOR_SUM_ACTIVE_SECONDS_DIV_60','eligibleMinutes':'ZERO_BELOW_THRESHOLD_ELSE_MIN_WHOLE_MINUTES_60',
            'objective':'JOINT_TWO_CATEGORY_CAPPED_TOTAL','sourceAttribution':'CERTIFICATION_FIRST_THEN_STARTED_AT_AND_ID',
            'zeroContributionUsesSlot':False,'certificationUsesSlots':False,'startBlockedByTargetOrQuota':False,
            'validUncounted':'SUM_VALID_Q_MINUS_A','invalidMinutes':'SUM_INVALID_ACTUAL_WHOLE_MINUTES','pendingIsInvalid':False,
            'missingSource':'UNAVAILABLE','lostPredecessor':'UNAVAILABLE_NOT_EMPTY','atomicSourceProtection':'ALL_OWNER_SETS_AND_ROWS_PLUS_PREDECESSOR_UNTIL_COMMIT'}.items():
        check(p.get('selection',{}).get(field)==value,'Selection '+field)
    check(p.get('selection',{}).get('tieBreak')==['PRESERVE_FEASIBLE_OPTIMAL_WHOLE_PREVIOUS_SET','EARLIER_STARTED_AT_THEN_STABLE_ID_MEMBERSHIP'],'Whole prior set tie break')
    check(p.get('selection',{}).get('sourceTokens')==list(s['ProgressSourceVersions']['properties']),'All source-set/predecessor tokens')
    check(s['ProgressSourceVersions']['required']==list(s['ProgressSourceVersions']['properties']),'No optional source token')
    check(s['CourseChangeProposal']['required']==['name','description','expectedVersion'],'No published targets/schedule write')
    check(s['StartExerciseSessionRequest']['required']==['courseId','expectedRuleVersionId','makeupAuthorizationId'],'Start explicit original rule/makeup binding')
    check(s['CourseRuleConfiguration']['properties']['thresholdMinutes']=={'type':'integer','enum':[30,45,60],'default':30},'Threshold wire enum/default')
    check(s['CourseRuleConfiguration']['properties']['weeklyCountLimit']=={'type':'integer','enum':[2,3,4],'default':3},'Frequency wire enum/default')
    for name in ['ExerciseRecord','ExerciseSession']:
        check('ruleVersionId' in s[name]['required'],'Rule bound '+name)
    for code in ['COURSE_TARGET_ALREADY_MET','COURSE_TARGET_BELOW_ACTIVE_CREDIT','COURSE_CLOSE_BLOCKED','DAILY_RECORD_ALREADY_EXISTS']:
        check(code not in spec['x-error-catalog'],'Retired '+code)
        check(all(code not in o['x-error-codes'] for o in ops.values()),'No operation consumes '+code)
    inv=p.get('invitation',{})
    for field,value in {'defaultLifetimeMinutes':30,'minimumLifetimeMinutes':5,'maximumLifetimeMinutes':120,'graceSeconds':600,
        'registrationComparison':'STRICTLY_BEFORE_ORIGINAL_EXPIRY','acceptanceComparison':'STRICTLY_BEFORE_ORIGINAL_EXPIRY_PLUS_GRACE',
        'previewCreatesFlow':False,'refreshExtends':False,'maxSuccessfulEnrollmentsPerFlow':1,
        'registrationNeedsVerifiedEmail':False,'finalJoinNeedsVerifiedEmail':True,'anonymousFlowNonceBits':256}.items():check(inv.get(field)==value,'Invitation '+field)
    check(inv.get('terminations')==['REVOKED','JOIN_CLOSED','COURSE_CLOSED','SEMESTER_NOT_CURRENT'],'Grace termination set')
    check(s['CourseInvitationCreateRequest']['properties']['lifetimeMinutes']=={'type':'integer','minimum':5,'maximum':120,'default':30},'Server invitation lifetime')
    check('expiresAt' not in s['CourseInvitationCreateRequest']['properties'],'No client expiry')
    check('newRegistrationAllowed' in s['CourseInvitationPreview']['required'],'Preview exposes admission closure without writing')
    check(ops['previewCourseInvitation']['x-idempotency'].get('reason')=='Read-only operation.','Preview read-only')
    check('flowId' in s['ExistingStudentJoinRequest']['required'],'Existing flow bound')
    check(set(s['RegisterNewInvitationFlowRequest']['required'])=={'clientFlowNonce'},'Do not require completed email verification before flow registration')
    check(s['RegisterNewInvitationFlowRequest']['properties']['clientFlowNonce'].get('pattern')=='^[0-9a-f]{64}$','Bound unpredictable original anonymous subject')
    check({'flowAuthorization','emailOtpProof','verifiedEmail'}<=set(s['NewStudentRegistrationRequest']['required']),'Final joining must still verify identity')
    for oid in ['publishRuleTemplateVersion','listPublishedRuleTemplates']:
        check(ops[oid].get('x-admin-kind-required')=='SUPER','Super-only '+oid)
        check(ops[oid]['x-admin-permissions']==[] and 'FIRST_PASSWORD_CHANGE_REQUIRED' in ops[oid]['x-error-codes'],'No indirect sub-admin grant '+oid)
    check(ops['registerNewInvitationFlow']['security']==[] and 'INVALID_CREDENTIALS' in ops['registerNewInvitationFlow']['x-error-codes'],'Anonymous proof failure channel')
    for oid in ['registerExistingInvitationFlow','registerNewInvitationFlow','joinCourseByInvitation','registerStudentAndJoinCourse','confirmCourseSettlement','closeCourse','publishCourse','authorizeCourseMakeup']:
        check(ops[oid]['x-idempotency'].get('evaluationOrder')==['AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE','EXACT_COMMITTED_RECEIPT','NEW_COMMAND_MODE_VERSION_ELIGIBILITY_AND_SOURCE_PROTECTION'],'Auth/replay/new-check '+oid)
        check(ops[oid].get('x-system-mode-replay')=='AUTHORIZED_COMMITTED_RESULT_ONLY','Exact replay scope '+oid)
    close=p.get('closeout',{});settle=p.get('settlement',{})
    check(close.get('closureBlocksNewStartsOnly') is True and close.get('protectPreReceiptFirstMaterialChain') is True,'Closure protects first legal pre-receipt chain')
    check(close.get('days')==7 and close.get('reminderDaysBeforeRegularCutoff')==14 and close.get('delayedSettlementExtendsMakeup') is False,'Closeout/reminder fixed')
    check(settle.get('ownerSources')==SOURCES,'Independent full source set')
    check(settle.get('memberCoverage')=='EXACT_AUTHORITATIVE_SET_NOT_COUNTS' and settle.get('missingSource')=='UNAVAILABLE_NOT_EMPTY','Settlement completeness')
    check(settle.get('unmetTargetIsBlocker') is False,'Unmet target may settle')
    check(settle.get('freeze')=='SOURCE_PROTECTED_ATOMIC_HEAD_ROWS_MANIFEST_RECEIPT_POINTER_AUDIT','Atomic protected report publication')
    check(settle.get('replayMovesCurrentPointer') is False,'Old receipt never rewinds pointer')
    check(settle.get('correction')=='APPEND_AUTHORIZED_EXISTING_FACT_WITH_HISTORICAL_SCOPE','Historical correction')
    check(settle.get('archive')=='COMPLETE_CURRENT_UNBLOCKED_ALL_COURSE_RESULTS','Full semester closure sources')
    check(s['ConfirmSettlementRequest']['required']==['preparationId','preparationToken','expectedPreviousSettlementVersionId'],'No client report rows/totals/ready flag')
    source_constraints=s['SettlementReportVersion']['properties']['sources']
    check(source_constraints.get('maxItems')==len(SOURCES) and len(source_constraints.get('allOf',[]))==len(SOURCES),'Every unique report source Owner')
    check(len(s['ProgressTotals']['properties']['categories'].get('allOf',[]))==2,'Exactly both categories')
    check('FIRST_MATERIAL_PENDING' in s['SettlementBlocker']['properties']['code']['enum'] and 'LOCKED_TRANSFER_PENDING' in s['SettlementBlocker']['properties']['code']['enum'],'Both material chains block')
    check(ops['confirmCourseSettlement']['x-roles']==['TEACHER'] and ops['confirmCourseSettlement']['x-resource-scope']=='RESPONSIBLE_TEACHER','Teacher settlement authority')
    check('SEMESTER_SETTLEMENT_BLOCKED' in ops['switchCurrentSemester']['x-error-codes'],'Semester archival blocker')
    check(not any('TryPublishSelection' in o['operationId'] for o in ops.values()),'Internal selection publication not public')
    # Student/statistics/report graph must not gain grades, ranks, remarks or secrets.
    visited=set();banned={'score','grade','rank','ranking','remark','internalNote','apiKey','storageKey','providerResponse','flowAuthorization'}
    def visit(node):
        if isinstance(node,dict):
            target=node.get('$ref','')
            if target.startswith('#/components/schemas/') and target not in visited:
                visited.add(target);visit(s[target.split('/')[-1]])
            for name in node.get('properties',{}):check(name not in banned,'Private field in report/progress '+name)
            for value in node.values():visit(value)
        elif isinstance(node,list):
            for value in node:visit(value)
    for name in ['StudentCourseProgress','RecordCreditDetailPage','SettlementReportRowPage','CourseSettlementSummaryPage']:visit(s[name])
    return errors


def mutation_results(spec):
    mutations=[]
    def add(name,apply):
        bad=deepcopy(spec);apply(bad);issues=integrity_errors(bad)
        mutations.append({'name':name,'rejected':bool(issues),'issues':issues})
    for area,fields in {'rule':['totalTargetMinutes','dailyCountLimit','freezeAt','futureTemplateRetargetsPublishedCourses'],
        'selection':['objective','sourceAttribution','tieBreak','sourceTokens','invalidMinutes','validUncounted','zeroContributionUsesSlot','startBlockedByTargetOrQuota','lostPredecessor','atomicSourceProtection'],
        'invitation':['graceSeconds','registrationComparison','acceptanceComparison','refreshExtends','previewCreatesFlow','terminations'],
        'closeout':['days','reminderDaysBeforeRegularCutoff','closureBlocksNewStartsOnly','protectPreReceiptFirstMaterialChain','delayedSettlementExtendsMakeup'],
        'settlement':['ownerSources','missingSource','memberCoverage','unmetTargetIsBlocker','freeze','replayMovesCurrentPointer','correction','archive']}.items():
        for field in fields:add(area+'/'+field,lambda v,a=area,f=field:v['x-course-workflow'][a].__setitem__(f,None))
    add('source-token-optional',lambda v:v['components']['schemas']['ProgressSourceVersions']['required'].remove('recordFactSetVersion'))
    add('old-rule-mutation',lambda v:v['components']['schemas']['CourseChangeProposal']['required'].append('otherTargetMinutes'))
    add('student-grade-leak',lambda v:v['components']['schemas']['ProgressTotals']['properties'].__setitem__('grade',{'type':'string'}))
    add('settlement-client-rows',lambda v:v['components']['schemas']['ConfirmSettlementRequest']['required'].append('rows'))
    add('email-before-registration',lambda v:v['components']['schemas']['RegisterNewInvitationFlowRequest']['required'].append('emailOtpProof'))
    add('final-join-no-otp',lambda v:v['components']['schemas']['NewStudentRegistrationRequest']['required'].remove('emailOtpProof'))
    return mutations
