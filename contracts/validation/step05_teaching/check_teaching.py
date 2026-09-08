"""Read-only structural gates. No provider authorization or database execution."""
from copy import deepcopy

FORBIDDEN={'gradeValue','finalGrade','score','level','rank','ranking','conversion','remark'}
SUPER=['publishTechnicalServiceRevision','listTechnicalServiceRevisions','getTechnicalServiceRunStatus','openManualModeWindow','listManualModeWindows','closeManualModeWindow']


def student_graph(spec):
    schemas=spec['components']['schemas'];seen=set();errors=[]
    def visit(x):
        if isinstance(x,list):
            for v in x:visit(v)
        if not isinstance(x,dict):return
        if '$ref' in x:
            name=x['$ref'].split('/')[-1]
            if name in schemas and name not in seen:seen.add(name);visit(schemas[name])
        for key in x.get('properties',{}):
            if key in FORBIDDEN:errors.append('Student reachable private field '+key)
        for k,v in x.items():
            if k not in ['description','example','examples']:visit(v)
    for item in spec['paths'].values():
        for o in item.values():
            if isinstance(o,dict) and 'STUDENT' in o.get('x-roles',[]):
                visit(o.get('responses',{}));visit(o.get('requestBody',{}));visit(o.get('parameters',[]))
    return sorted(seen),sorted(set(errors))


def integrity_errors(spec):
    errors=[]
    def check(ok,msg):
        if not ok:errors.append(msg)
    s=spec['components']['schemas'];p=spec.get('x-teaching-workflow',{})
    ops={o['operationId']:o for item in spec['paths'].values() for o in item.values() if isinstance(o,dict) and 'operationId' in o}
    check('CR-20260908-003' in spec['x-contract-governance']['acceptedPhase5ChangeRequests'],'CR identity')
    check(p.get('roster',{}).get('maximumSourceBytes')==104857600 and p.get('roster',{}).get('maximumPersonnelRows')==500,'Roster accepted byte/row cap')
    check(p.get('roster',{}).get('countErrorsAndDuplicates') is True and p.get('roster',{}).get('createsMembership') is False,'Roster raw rows and membership boundary')
    check(p.get('endurance',{}).get('missingOrMultipleRuleMatch')=='REJECT_WHOLE_COMMAND','Atomic conversion precondition')
    check(p.get('extraction',{}).get('lateResult')=='NEVER_OVERWRITE_TEACHER_DECISION_OR_NEW_INPUT','Late callback binding')
    for name,fields in {'ConfirmEnduranceRowsRequest':['expectedBatchVersion','expectedRowsSourceVersion','selectedRows'],
            'EnduranceSelectedRow':['rowId','expectedRowVersion','resolvedValues'],
            'ResolvedEnduranceValues':['expectedEnrollmentVersion','expectedOutcomeVersion','ruleTableId','ruleRevisionNumber','testedOn','durationSeconds'],
            'PublishRosterBatchRequest':['expectedBatchVersion','expectedRowsSourceVersion','expectedCurrentSnapshotId'],
            'CloseManualModeRequest':['expectedWindowVersion','expectedSourceRevision']}.items():
        check(set(fields)<=set(s[name].get('required',[])),'Missing protected source fields '+name)
        check(s[name].get('additionalProperties') is False,'Closed command '+name)
    check(s['ConfirmEnduranceRowsRequest']['properties']['selectedRows'].get('minItems')==1,'Nonempty selection')
    for oid in ['confirmEnduranceDraftRows','confirmEnduranceMeasurement']:
        check({'ENDURANCE_CONVERSION_UNAVAILABLE','TEACHING_SOURCE_STALE','TEACHING_SOURCE_UNAVAILABLE'}<=set(ops[oid]['x-error-codes']),'Atomic failure channels '+oid)
    check(ops['publishRosterBatch']['x-roles']==['TEACHER'],'Teacher publication')
    for oid in SUPER:
        check(ops[oid]['x-roles']==['ADMIN'] and ops[oid].get('x-admin-kind-required')=='SUPER','Super-only '+oid)
        check(ops[oid]['x-admin-permissions']==[] and 'FIRST_PASSWORD_CHANGE_REQUIRED' in ops[oid]['x-error-codes'],'No indirect permission grant '+oid)
    for name in ['TechnicalServiceRevision','TechnicalServiceRunStatus','TechnicalQualityEvidence']:
        check(not ({'secret','apiKey','password','credentialReferenceId','connectionReferenceId','prompt','rawResponse','media'} & set(s[name]['properties'])),'Redacted '+name)
    check('latestProbe' in s['TechnicalServiceRunStatus']['required'],'Actual latest probe')
    check(p.get('manual',{}).get('recovery')=='UNDECIDED_TASKS_ONLY','Recovery scope')
    errors+=student_graph(spec)[1]
    check('getOwnFinalGrade' not in ops and '/student/final-grade' not in spec['paths'],'Retired student grade route')
    for oid in ['listOwnNotifications','getOwnUnreadNotificationCount','markOwnNotificationRead']:check('STUDENT' not in ops[oid]['x-roles'],'Legacy notification deny '+oid)
    check('FINAL_GRADE' not in s['StudentNotification']['properties']['targetRoute']['anyOf'][0]['enum'],'Student navigation allowlist')
    for name in ['PublishFinalGradeRequest','FinalGradePublication']:
        check('remark' not in s[name]['properties'] and s[name]['additionalProperties'] is False,'No new remark '+name)
    check('remark' in s['EnduranceRuleInterval']['properties'],'Do not remove unrelated rule-row remark')
    grade=s['PublishFinalGradeRequest']['properties']['gradeValue'];check(grade.get('format')=='int32' and 'minimum' not in grade and 'maximum' not in grade,'Any signed int32 retained')
    h=ops['listHistoricalFinalGradeRemarks']
    check(h['x-roles']==['TEACHER'] and h['x-resource-scope']=='ALL_AUTHENTICATED_CURRENT_TEACHERS_HISTORICAL_REMARK_READ_ONLY','All current authenticated teacher historical read')
    check(h.get('x-access-audit',{}).get('required') is True and h['x-access-audit'].get('failure')=='DENY_DELIVERY','Read audit fail closed')
    check('gradeValue' not in s['HistoricalFinalGradeRemark']['properties'],'No all-teacher grade access expansion')
    check(p.get('legacyRemark',{}).get('businessSync')=='APPLIED_USER_AUTHORIZED','Accepted body synchronization')
    check(len(s['AdminPermission']['enum'])==8,'Exactly eight sub-admin permissions')
    check(p.get('student',{}).get('construction')=='POSITIVE_ALLOWLIST_BEFORE_SERIALIZATION','Student construction before serialization')
    check(p.get('student',{}).get('notification')=='CREATE_AND_READ_REJECT_ENTIRE_PROHIBITED_MESSAGE','Notification both boundaries')
    check(p.get('student',{}).get('oldCache')=='PURGE_OR_QUARANTINE_FAIL_CLOSED_NO_LEGACY_FALLBACK','No old unsafe cache fallback')
    return errors


def mutation_results(spec):
    results=[]
    def mutate(name,fn):
        d=deepcopy(spec);fn(d);issues=integrity_errors(d);results.append({'name':name,'rejected':bool(issues),'errors':issues})
    def op(d,oid):return next(o for item in d['paths'].values() for o in item.values() if isinstance(o,dict) and o.get('operationId')==oid)
    for name in ['StudentDashboard','StudentEnduranceOutcome','StudentNotification']:
        for f in ['score','finalGrade','remark']:
            mutate(name+'/'+f,lambda d,n=name,f=f:d['components']['schemas'][n]['properties'].update({f:{'type':'null'}}))
    for name in ['ConfirmEnduranceRowsRequest','EnduranceSelectedRow','ResolvedEnduranceValues','PublishRosterBatchRequest','CloseManualModeRequest']:
        mutate(name+'/lost_guard',lambda d,n=name:d['components']['schemas'][n]['required'].clear())
        mutate(name+'/extra_fields',lambda d,n=name:d['components']['schemas'][n].update(additionalProperties=True))
    for oid in SUPER:mutate(oid+'/subadmin',lambda d,n=oid:op(d,n).update({'x-admin-kind-required':'ANY'}))
    mutate('history/narrow_scope',lambda d:op(d,'listHistoricalFinalGradeRemarks').update({'x-resource-scope':'RESPONSIBLE_TEACHER'}))
    mutate('history/audit_unavailable_allowed',lambda d:op(d,'listHistoricalFinalGradeRemarks')['x-access-audit'].update(failure='ALLOW'))
    mutate('new_remark',lambda d:d['components']['schemas']['PublishFinalGradeRequest']['properties'].update(remark={'type':'null'}))
    mutate('legacy_student_notifications',lambda d:op(d,'listOwnNotifications')['x-roles'].append('STUDENT'))
    mutate('student_grade_navigation',lambda d:d['components']['schemas']['StudentNotification']['properties']['targetRoute']['anyOf'][0]['enum'].append('FINAL_GRADE'))
    mutate('duplicate_rows_ignored',lambda d:d['x-teaching-workflow']['roster'].update(countErrorsAndDuplicates=False))
    mutate('partial_conversion_commit',lambda d:d['x-teaching-workflow']['endurance'].update(missingOrMultipleRuleMatch='KEEP_MEASUREMENT'))
    mutate('callback_overwrites_teacher',lambda d:d['x-teaching-workflow']['extraction'].update(lateResult='OVERWRITE'))
    mutate('cache_fallback',lambda d:d['x-teaching-workflow']['student'].update(oldCache='ALLOW'))
    return results
