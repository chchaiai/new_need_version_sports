"""Synthetic boundary fixtures, not school data or product execution evidence."""
from copy import deepcopy

U = '00000000-0000-4000-8000-000000000001'
V = '00000000-0000-4000-8000-000000000002'
T = '2026-09-07T02:00:00.000000001Z'
ITEM = {'mediaAssetId': U, 'position': 0, 'phase': 'GENERAL', 'checksumSha256': 'a'*64}
BEFORE = {**ITEM, 'phase':'BEFORE'}
AFTER = {**ITEM, 'mediaAssetId':V, 'position':1, 'phase':'AFTER'}
EXPECTED = {'expectedVersion': 1, 'expectedRoundNo': 1, 'materialVersionId':U}
REASON = {'code':'UNCLEAR_EVIDENCE','label':{'zh':'材料不清晰','en':'Unclear evidence'}}


def build():
    cases=[]
    def add(name,schema,payload,valid=True,typed=False):
        cases.append({'name':name,'schema':schema,'payload':deepcopy(payload),'expectedValid':valid,'typed':typed})
    first={'submissionRoute':'ORDINARY','category':'COURSE_RELATED','description':'本次运动说明','items':[ITEM],'expectedSessionVersion':1}
    add('ordinary/valid','SubmitExerciseRecordRequest',first,typed=True)
    swim={**first,'submissionRoute':'SWIMMING_TIMELY','items':[BEFORE,AFTER]}
    add('swimming/valid','SubmitExerciseRecordRequest',swim,typed=True)
    offline={**swim,'submissionRoute':'SWIMMING_OFFLINE','delayExplanation':'全程离线，已有本次前后材料'}
    add('offline/valid','SubmitExerciseRecordRequest',offline,typed=True)
    approve={'action':'PASS',**EXPECTED,'publicComment':None}
    returned={'action':'RETURN_SUPPLEMENT',**EXPECTED,'publicComment':'请补充清晰材料','reasonCode':'UNCLEAR_EVIDENCE'}
    invalid={'action':'INVALID',**EXPECTED,'publicComment':None,'reasonCode':'CONFIRMED_REUSE_OR_MISUSE'}
    add('pass/valid','AppendRecordReviewRequest',approve,typed=True)
    add('return/default24','AppendRecordReviewRequest',returned,typed=True)
    add('return/72','AppendRecordReviewRequest',{**returned,'windowHours':72},typed=True)
    add('invalid/confirmed','AppendRecordReviewRequest',invalid,typed=True)
    add('correct/valid','CorrectExerciseRecordReviewRequest',{'result':'VALID',**EXPECTED,'correctedReviewId':V,'publicComment':'依据已有材料更正原判断'},typed=True)
    add('correct/invalid','CorrectExerciseRecordReviewRequest',{'result':'INVALID',**EXPECTED,'correctedReviewId':V,'publicComment':'依据已有材料更正原判断','reasonCode':'UNCLEAR_EVIDENCE'},typed=True)
    supp={**EXPECTED,'returnActionId':V,'timerId':U,'expectedTimerVersion':2,'expectedTimingSourceRevision':3,'items':[ITEM]}
    add('supplement/valid','SupplementRecordMaterialRequest',supp,typed=True)
    add('completion/normal','CompleteRecordMaterialRequest',{'batchId':U,'expectedMaterialVersion':1,'delayExplanation':None},typed=True)
    add('upload/renew','RecordUploadAuthorizationRequest',{'materialVersionId':U,'batchId':V,'expectedMaterialVersion':1},typed=True)
    material={'materialVersionId':U,'recordId':U,'batchId':V,'versionNo':1,'previousMaterialVersionId':None,'returnActionId':None,
              'items':[ITEM],'acceptedAt':T,'transferDueAt':'2026-09-07T02:30:00.000000001Z','transferCompletedAt':None,
              'readiness':'PENDING_TRANSFER','version':1}
    add('material/first_locked','MaterialVersion',material)
    mat2={**material,'materialVersionId':V,'versionNo':2,'previousMaterialVersionId':U,'returnActionId':U,'transferDueAt':None,'transferCompletedAt':T,'readiness':'READY'}
    add('material/supplement_ready','MaterialVersion',mat2)
    timer={'timerId':U,'returnActionId':V,'budgetHours':24,'startedAt':T,'originalDueAt':'2026-09-08T02:00:00.000000001Z',
           'state':'ACTIVE','remainingSeconds':86399.5,'effectiveDueAt':'2026-09-08T02:00:00.000000001Z',
           'acceptedMaterialVersionId':None,'pauses':[],'sourceRevision':1,'version':1}
    add('timer/active','SupplementTimerView',timer)
    paused={**timer,'state':'PAUSED','effectiveDueAt':None}
    add('timer/paused','SupplementTimerView',paused)
    unavailable={**timer,'state':'UNAVAILABLE','effectiveDueAt':None,'remainingSeconds':None}
    add('timer/unavailable','SupplementTimerView',unavailable)
    accepted={**timer,'state':'ACCEPTED','acceptedMaterialVersionId':V}
    add('timer/accepted','SupplementTimerView',accepted)
    calendar={'calendarId':U,'revision':1,'coverageStart':'2026-09-01','coverageEndExclusive':'2026-10-01','timezone':'Asia/Shanghai'}
    sla={'roundNo':1,'startedAt':T,'endedAt':None,'budgetSeconds':172800,'calendar':calendar,
         'calculationStatus':'AVAILABLE','unavailableReason':None,'consumedSeconds':0,'remainingSeconds':172800,
         'effectiveDueAt':'2026-09-09T02:00:00.000000001Z','overdue':False,'pauses':[],'sourceRevision':1,'version':1}
    add('sla/available','TeacherReviewSla',sla)
    add('sla/paused','TeacherReviewSla',{**sla,'calculationStatus':'PAUSED','effectiveDueAt':None})
    add('sla/missing_calendar','TeacherReviewSla',{**sla,'calculationStatus':'UNAVAILABLE','unavailableReason':'CALENDAR_MISSING','calendar':None,
                                               'consumedSeconds':None,'remainingSeconds':None,'effectiveDueAt':None,'overdue':None})
    review={'reviewCaseId':None,'processingStage':'MATERIAL_PROCESSING','result':None,'publicReason':None,'publicComment':None,'roundNo':None,
            'materialVersionId':U,'supplementReturnUsed':False,'supplementTimer':None,'teacherSla':None,'sequenceNumber':0,'updatedAt':T,'version':0}
    add('review/pending_material','RecordReviewSummary',review)
    teacher={**review,'reviewCaseId':U,'processingStage':'TEACHER_REVIEW_REQUIRED','roundNo':1,'teacherSla':sla}
    add('review/teacher_round1','RecordReviewSummary',teacher)
    supplement={**teacher,'processingStage':'SUPPLEMENT_REQUIRED','teacherSla':None,'supplementReturnUsed':True,'supplementTimer':timer,'publicReason':REASON}
    add('review/await_supplement','RecordReviewSummary',supplement)
    round2={**teacher,'processingStage':'SUPPLEMENT_REVIEW_REQUIRED','roundNo':2,'materialVersionId':V,'teacherSla':{**sla,'roundNo':2},
            'supplementReturnUsed':True,'supplementTimer':accepted}
    add('review/round2','RecordReviewSummary',round2)
    valid={**teacher,'processingStage':'VALID','result':'VALID','teacherSla':{**sla,'endedAt':T}}
    add('review/valid','RecordReviewSummary',valid)
    student={'studentId':U,'studentNumber':'20260001','name':'测试学生','gender':'FEMALE','gradeYear':1,
             'college':None,'major':None,'administrativeClass':None,'studentStatus':'ACTIVE'}
    record={'recordId':U,'sessionId':U,'courseId':U,'enrollmentId':U,'student':student,'businessDate':'2026-09-07',
            'category':'COURSE_RELATED','description':'本次运动说明','activityType':'STANDARD','actualDurationSeconds':1800,
            'currentMaterial':material,'currentReview':review,'submittedAt':T,'ruleVersionId':U}
    add('record/full_pending_response','ExerciseRecord',record,typed=True)
    first_receipt={'receiptId':U,'recordId':U,'sessionId':U,'submissionRoute':'ORDINARY','firstDueAt':'2026-09-08T02:00:00.000000001Z',
                   'acceptedAt':T,'material':material}
    add('receipt/first','FirstMaterialAcceptance',first_receipt,typed=True)
    ready_material={**material,'transferCompletedAt':T,'readiness':'READY'}
    completion={'receiptId':U,'material':ready_material,'review':teacher}
    add('receipt/completion','MaterialCompletionReceipt',completion,typed=True)
    supp_receipt={'receiptId':U,'acceptedAt':T,'material':mat2,'review':round2}
    add('receipt/supplement','SupplementAcceptanceReceipt',supp_receipt,typed=True)
    queue={'queueItemId':U,'record':{**record,'currentMaterial':ready_material,'currentReview':teacher},'reviewRoundNo':1,'sourceRevision':1}
    add('queue/teacher_only','TeacherReviewQueueItem',queue,typed=True)
    correction={'correctionId':U,'incidentReferenceId':V,'incidentRevision':1,'correctedReviewId':U,'timerId':U,'expectedCaseVersion':3,
                'expectedTimerVersion':2,'roundNo':1,'materialVersionId':U,'originalBudgetHours':24,'restoredRemainingSeconds':3600,
                'entryRestoredAt':T,'restoredStage':'SUPPLEMENT_REQUIRED','supplementReturnUsed':True,'createdAt':T}
    add('correction/original_remainder','ExpiryCorrectionFact',correction)
    event={'reviewId':U,'recordId':U,'materialVersionId':U,'sequenceNumber':1,'roundNo':1,'source':'TEACHER_RETURN',
           'fromResult':None,'result':None,'reviewer':{'teacherId':U,'name':'测试教师'},'publicReason':REASON,
           'publicComment':None,'correctedReviewId':None,'expiryCorrection':None,'occurredAt':T}
    add('event/return_not_invalid','RecordReview',event)
    expired={**event,'source':'SYSTEM_EXPIRY','result':'INVALID','reviewer':None,
             'publicReason':{'code':'SUPPLEMENT_DEADLINE_MISSED','label':{'zh':'补证逾期','en':'Supplementary evidence deadline missed'}}}
    add('event/expiry','RecordReview',expired)
    add('event/fault_correction','RecordReview',{**event,'source':'PLATFORM_FAULT_CORRECTION','reviewer':None,'correctedReviewId':U,'expiryCorrection':correction})
    add('notice/shared_reason','ReviewNotificationContext',{'recordId':U,'reviewSequenceNumber':1,'processingStage':'SUPPLEMENT_REQUIRED','publicReason':REASON,'publicComment':'请补充清晰材料'})
    add('reason/fixed_labels','PublicReviewReason',REASON)
    # Independent negative expectations, including cases that old immediate-VALID DTOs would accept.
    for label,schema,payload in [
        ('old_submit_shape','SubmitExerciseRecordRequest',{'category':'OTHER','description':'旧包','mediaAssetIds':[U]}),
        ('old_free_text_review','AppendRecordReviewRequest',{'result':'INVALID','studentVisibleReason':'仍有疑虑','expectedVersion':1}),
        ('doubt_not_invalid','AppendRecordReviewRequest',{**invalid,'reasonCode':'AUTHENTICITY_REQUIRES_CLARIFICATION'}),
        ('confirmed_not_return','AppendRecordReviewRequest',{**returned,'reasonCode':'CONFIRMED_REUSE_OR_MISUSE'}),
        ('system_reason_not_teacher','AppendRecordReviewRequest',{**invalid,'reasonCode':'SUPPLEMENT_DEADLINE_MISSED'}),
        ('second_return','AppendRecordReviewRequest',{**returned,'expectedRoundNo':2}),
        ('window48','AppendRecordReviewRequest',{**returned,'windowHours':48}),
        ('hidden_note','AppendRecordReviewRequest',{**approve,'internalNote':'hidden'}),
        ('client_completion_time','CompleteRecordMaterialRequest',{'batchId':U,'expectedMaterialVersion':1,'delayExplanation':None,'completedAt':T}),
        ('third_material','MaterialVersion',{**mat2,'versionNo':3}),
        ('first_receipt_no_transfer_deadline','FirstMaterialAcceptance',{**first_receipt,'material':{**material,'transferDueAt':None}}),
        ('offline_receipt_not_ready','FirstMaterialAcceptance',{**first_receipt,'submissionRoute':'SWIMMING_OFFLINE'}),
        ('completion_receipt_partial','MaterialCompletionReceipt',{**completion,'material':material}),
        ('supplement_receipt_not_round2','SupplementAcceptanceReceipt',{**supp_receipt,'review':teacher}),
        ('queue_contains_technical_wait','TeacherReviewQueueItem',{**queue,'record':{**record,'currentReview':{**teacher,'processingStage':'TECHNICAL_PROCESSING','teacherSla':None}}}),
        ('supplement_extra_grace','MaterialVersion',{**mat2,'transferDueAt':T}),
        ('pending_looks_valid','RecordReviewSummary',{**review,'result':'VALID'}),
        ('pending_looks_invalid','RecordReviewSummary',{**review,'result':'INVALID'}),
        ('valid_missing_result','RecordReviewSummary',{**valid,'result':None}),
        ('material_ready_no_bytes','MaterialVersion',{**material,'readiness':'READY'}),
        ('paused_guess_due','SupplementTimerView',{**paused,'effectiveDueAt':T}),
        ('unknown_guess_zero','SupplementTimerView',{**unavailable,'remainingSeconds':0}),
        ('24h_over_budget','SupplementTimerView',{**timer,'remainingSeconds':86400.1}),
        ('sla48seconds','TeacherReviewSla',{**sla,'budgetSeconds':48}),
        ('calendar_weekday_fallback','TeacherReviewSla',{**sla,'calendar':None}),
        ('pause_not_final_due','TeacherReviewSla',{**sla,'calculationStatus':'PAUSED'}),
        ('correction_new_opportunity','ExpiryCorrectionFact',{**correction,'supplementReturnUsed':False}),
        ('correction_24_to_72','ExpiryCorrectionFact',{**correction,'restoredRemainingSeconds':259200}),
        ('return_fabricates_invalid','RecordReview',{**event,'result':'INVALID'}),
        ('reason_wrong_translation','PublicReviewReason',{'code':'UNCLEAR_EVIDENCE','label':{'zh':'已证实冒用','en':'Confirmed misuse'}}),
    ]: add(label,schema,payload,False)
    # Independent shape sensitivity: remove each required request field, add unknown field,
    # and reject null, string-coerced integer, unknown discriminator on the actual source schemas.
    for row in list(cases):
        if not row['typed']: continue
        for field in row['payload']:
            if field == 'windowHours': continue  # declared optional/default 24
            p=deepcopy(row['payload']); p.pop(field)
            add(row['name']+'/missing/'+field,row['schema'],p,False)
        p=deepcopy(row['payload']); p['unexpectedField']=True
        add(row['name']+'/extra',row['schema'],p,False)
        for field in ['submissionRoute','action','result','expectedVersion','expectedSessionVersion','expectedTimerVersion']:
            if field in row['payload']:
                for bad in [None, 'UNKNOWN' if isinstance(row['payload'][field],str) else '1']:
                    p=deepcopy(row['payload']); p[field]=bad
                    add(row['name']+'/'+field+'/'+str(bad),row['schema'],p,False)
    return cases
