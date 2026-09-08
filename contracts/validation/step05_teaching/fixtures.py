"""Synthetic wire examples plus adversarial boundaries; never real student data."""
from copy import deepcopy
U='00000000-0000-4000-8000-000000000001'
V='00000000-0000-4000-8000-000000000002'
T='2026-09-08T02:00:00Z'
H='a'*64
RESOLVED={'enrollmentId':U,'expectedEnrollmentVersion':1,'distanceMeters':800,'testedOn':'2026-09-07','timeRepresentation':'MM_SS','explicitTimeText':'4:30','durationSeconds':270,'ruleTableId':U,'ruleRevisionNumber':1,'expectedOutcomeVersion':1}


def build(spec):
    schemas=spec['components']['schemas'];cases=[]
    def sample(x):
        if '$ref' in x:return sample(schemas[x['$ref'].split('/')[-1]])
        if 'const' in x:return x['const']
        if 'enum' in x:return x['enum'][0]
        if 'anyOf' in x:
            if {'type':'null'} in x['anyOf']:return None
            return sample(x['anyOf'][0])
        if 'oneOf' in x:return sample(x['oneOf'][0])
        typ=x.get('type')
        if typ=='object':return {k:sample(x['properties'][k]) for k in x.get('required',[])}
        if typ=='array':return [sample(x['items']) for _ in range(x.get('minItems',0))]
        if typ=='null':return None
        if typ=='boolean':return False
        if typ in ['integer','number']:return x.get('minimum',1)
        if x.get('format') in ['uuid','date','date-time','uri','email']:
            return {'uuid':U,'date':'2026-09-07','date-time':T,'uri':'https://example.invalid/authenticated-download','email':'synthetic@example.invalid'}[x['format']]
        if 'pattern' in x and '{4}-' in x['pattern']:return '2026-2027'
        if 'pattern' in x and '64' in x['pattern']:return H
        return 'synthetic'
    def add(name,schema,payload,valid=True,typed=False):cases.append({'name':name,'schema':schema,'payload':deepcopy(payload),'expectedValid':valid,'typed':typed})
    # Independent business examples are patched into simple wire defaults.
    names=['TeachingSourceAllocationRequest','TeachingSourceAllocation','TeachingSourceFinalizeRequest','TeachingSourceAsset',
        'CreateTeachingBatchRequest','ExtractionAttemptSummary','RosterImportBatch','EnduranceCaptureBatch','RosterDraftRow',
        'ResolveRosterDraftRowRequest','PublishRosterBatchRequest','RosterBatchPublication','ResolvedEnduranceValues','EnduranceDraftRow',
        'ResolveEnduranceDraftRowRequest','ConfirmEnduranceRowsRequest','EnduranceMeasurement','EnduranceRowsConfirmation',
        'ConfirmEnduranceMeasurementRequest','StudentEnduranceOutcome','AssessmentRosterProjection','AssessmentRosterRow',
        'AssessmentExportRequest','AssessmentExportArtifact','TechnicalServiceScope','TechnicalServiceRevisionRequest','TechnicalServiceRevision',
        'TechnicalTaskCounts','TechnicalQualityEvidence','TechnicalServiceRunStatus','OpenManualModeRequest','CloseManualModeRequest',
        'ManualModeWindow','HistoricalFinalGradeRemark','StudentNotification','TeachingSourceDownloadAuthorization','AssessmentExportDownloadAuthorization',
        'PublishFinalGradeRequest','FinalGradePublication','RosterSnapshot','StudentDashboard']
    seeds={n:sample(schemas[n]) for n in names}
    seeds['ResolveRosterDraftRowRequest']['identity']={'studentNumber':'20260001','name':'合成学生','candidateId':None,'identitySourceVersion':'i1'}
    seeds['ResolvedEnduranceValues']=deepcopy(RESOLVED)
    seeds['ResolveEnduranceDraftRowRequest']['resolvedValues']=deepcopy(RESOLVED)
    selected={'rowId':U,'expectedRowVersion':1,'resolvedValues':RESOLVED}
    seeds['ConfirmEnduranceRowsRequest']['selectedRows']=[selected]
    seeds['AssessmentRosterProjection'].update(state='UNAVAILABLE',incompleteSources=['ROSTER'])
    seeds['TechnicalServiceRunStatus'].update(state='UNAVAILABLE')
    # Conversion/legacy publication are server projections, not new student fields.
    for n,p in seeds.items():add('wire/'+n,n,p,typed=True)
    for schema in ['ConfirmEnduranceRowsRequest','ResolvedEnduranceValues','ResolveRosterDraftRowRequest','PublishRosterBatchRequest','TechnicalServiceRevisionRequest','CloseManualModeRequest','TeachingSourceAllocationRequest']:
        p=seeds[schema]
        for k in schemas[schema]['required']:
            q=deepcopy(p);q.pop(k);add(schema+'/missing/'+k,schema,q,False)
        for k in ['allResolved','ignoreVersion','skipHardChecks','teacherApproved','providerSecret','extra']:
            add(schema+'/extra/'+k,schema,{**p,k:True},False)
    for state in ['CONFIRMED','EXCLUDED']:
        row=deepcopy(seeds['RosterDraftRow']);row.update(state=state,decisionId=U)
        if state=='CONFIRMED':row['confirmedIdentity']=seeds['ResolveRosterDraftRowRequest']['identity']
        else:row['decisionReason']='原图确认该行为非人员行'
        add('roster/'+state,'RosterDraftRow',row,typed=True)
        add('roster/'+state+'/no_decision','RosterDraftRow',{**row,'decisionId':None},False)
    resolve=seeds['ResolveRosterDraftRowRequest']
    add('roster/exclusion','ResolveRosterDraftRowRequest',{**resolve,'action':'EXCLUDE','identity':None,'reason':'重复原始行，保留证据'},typed=True)
    add('roster/exclusion/no_reason','ResolveRosterDraftRowRequest',{**resolve,'action':'EXCLUDE','identity':None,'reason':None},False)
    for txt,representation in [('4.30','MM_SS'),('4.30','INTEGER_SECONDS'),('4:60','MM_SS')]:
        add('time/reject/'+txt+'/'+representation,'ResolvedEnduranceValues',{**RESOLVED,'timeRepresentation':representation,'explicitTimeText':txt},False)
    add('time/integer','ResolvedEnduranceValues',{**RESOLVED,'timeRepresentation':'INTEGER_SECONDS','explicitTimeText':'270'},typed=True)
    add('time/decimal_seconds','ResolvedEnduranceValues',{**RESOLVED,'durationSeconds':258.5},False)
    add('time/negative','ResolvedEnduranceValues',{**RESOLVED,'durationSeconds':-1},False)
    add('time/wrong_event','ResolvedEnduranceValues',{**RESOLVED,'distanceMeters':1500},False)
    for field in ['expectedEnrollmentVersion','expectedOutcomeVersion','ruleRevisionNumber']:
        add('time/negative_version/'+field,'ResolvedEnduranceValues',{**RESOLVED,field:-1},False)
    row=seeds['EnduranceDraftRow']
    ready={**row,'state':'READY','resolvedValues':RESOLVED,'decisionId':U}
    add('endurance/ready','EnduranceDraftRow',ready,typed=True)
    add('endurance/confirmed','EnduranceDraftRow',{**ready,'state':'CONFIRMED','measurementId':U},typed=True)
    add('endurance/ready_missing_values','EnduranceDraftRow',{**ready,'resolvedValues':None},False)
    add('endurance/false_confirmation','EnduranceDraftRow',{**ready,'state':'CONFIRMED'},False)
    add('selection/empty','ConfirmEnduranceRowsRequest',{**seeds['ConfirmEnduranceRowsRequest'],'selectedRows':[]},False)
    measured={**seeds['StudentEnduranceOutcome'],'outcome':'MEASURED','distanceMeters':800,'durationSeconds':270,'testedOn':'2026-09-07'}
    add('student/raw_measured','StudentEnduranceOutcome',measured,typed=True)
    add('student/exempt','StudentEnduranceOutcome',{**seeds['StudentEnduranceOutcome'],'outcome':'EXEMPT','approvedExemptionApplicationId':U},typed=True)
    for name,p in [('StudentEnduranceOutcome',measured),('StudentNotification',seeds['StudentNotification']),('StudentDashboard',seeds['StudentDashboard'])]:
        for field in ['conversion','score','level','rank','ranking','gradeValue','finalGrade','remark']:
            for value in [None,0,'成绩']:
                add('privacy/'+name+'/'+field+'/'+str(value),name,{**p,field:value},False)
    dashboard={**seeds['StudentDashboard'],'enduranceOutcome':{**measured,'conversion':None}}
    add('privacy/dashboard/nested','StudentDashboard',dashboard,False)
    add('privacy/notification/grade_route','StudentNotification',{**seeds['StudentNotification'],'targetRoute':'FINAL_GRADE'},False)
    for field in ['remark','note','comment']:
        for v in [None,'', '历史备注']:
            add('grade/new_forbidden/'+field+'/'+str(v),'PublishFinalGradeRequest',{**seeds['PublishFinalGradeRequest'],field:v},False)
    for v in [-1000,0,101,2147483647,-2147483648]:add('grade/signed/'+str(v),'PublishFinalGradeRequest',{**seeds['PublishFinalGradeRequest'],'gradeValue':v})
    add('history/remark','HistoricalFinalGradeRemark',{**seeds['HistoricalFinalGradeRemark'],'remark':'保留的历史备注'},typed=True)
    add('history/grade_not_expanded','HistoricalFinalGradeRemark',{**seeds['HistoricalFinalGradeRemark'],'gradeValue':100},False)
    req=seeds['TechnicalServiceRevisionRequest']
    for purpose in ['ROSTER_OCR','ENDURANCE_OCR']:
        add('service/'+purpose,'TechnicalServiceRevisionRequest',{**req,'purpose':purpose},typed=True)
        add('service/ocr_no_auto/'+purpose,'TechnicalServiceRevisionRequest',{**req,'purpose':purpose,'automaticApprovalEnabled':True,'validationEvidenceId':U},False)
    add('service/vlm_needs_evidence','TechnicalServiceRevisionRequest',{**req,'automaticApprovalEnabled':True},False)
    add('service/vlm_evidence_reference','TechnicalServiceRevisionRequest',{**req,'automaticApprovalEnabled':True,'validationEvidenceId':U},typed=True)
    for name in ['TechnicalServiceRevisionRequest','TechnicalServiceRevision','TechnicalServiceRunStatus']:
        for k in ['apiKey','secret','prompt','rawResponse','media']:
            add('service/no_leak/'+name+'/'+k,name,{**seeds[name],k:'forbidden'},False)
    status=seeds['TechnicalServiceRunStatus'];counts=seeds['TechnicalTaskCounts']
    add('service/missing_not_zero','TechnicalServiceRunStatus',{**status,'taskCounts':counts},False)
    available={**status,'state':'AVAILABLE','serviceRevisionId':U,'taskCounts':counts,'sourceRevision':'s1','latestProbe':{'checkedAt':T,'serviceRevisionId':U,'result':'SUCCESS'}}
    add('service/available','TechnicalServiceRunStatus',available,typed=True)
    add('service/failed_probe_not_healthy','TechnicalServiceRunStatus',{**available,'latestProbe':{**available['latestProbe'],'result':'FAILED'}},False)
    add('service/course_scope','TechnicalServiceScope',{'kind':'COURSE','courseId':U},typed=True)
    add('service/course_scope_missing','TechnicalServiceScope',{'kind':'COURSE','courseId':None},False)
    manual=seeds['ManualModeWindow']
    add('manual/closed','ManualModeWindow',{**manual,'state':'CLOSED','closedAt':T,'closedBySubjectId':U},typed=True)
    add('manual/false_close','ManualModeWindow',{**manual,'state':'CLOSED'},False)
    projection=seeds['AssessmentRosterProjection']
    add('projection/unavailable_not_zero','AssessmentRosterProjection',{**projection,'registeredMatchedCount':0},False)
    current={**projection,'state':'CURRENT','incompleteSources':[],'confirmedRosterIdentityCount':2,'registeredMatchedCount':1,'rosterIncompleteCount':1,'outsideRosterMemberCount':1,'contentSha256':H,'sources':[{'owner':o,'sourceVersion':'s1','scopeId':U} for o in ['ROSTER','MEMBERSHIP','IDENTITY','ENDURANCE','REVIEWS','APPLICATIONS','STATISTICS','SETTLEMENT']]}
    add('projection/current_full_sources','AssessmentRosterProjection',current,typed=True)
    add('projection/missing_owner','AssessmentRosterProjection',{**current,'sources':current['sources'][:-1]},False)
    add('projection/duplicate_owner','AssessmentRosterProjection',{**current,'sources':current['sources'][:-1]+[current['sources'][0]]},False)
    artifact=seeds['AssessmentExportArtifact']
    add('export/ready','AssessmentExportArtifact',{**artifact,'state':'READY','fileSha256':H},typed=True)
    add('export/no_file_not_ready','AssessmentExportArtifact',{**artifact,'state':'READY'},False)
    return cases
