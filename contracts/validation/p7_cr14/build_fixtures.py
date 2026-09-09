"""Deterministic migration of sealed 1.3 examples, plus independently specified CR cases."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[3]
BASE = 'f95c3833870fe0da55a297aa28c958ec53e9e935'
PRIOR_SHA = '5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed'
FIELDS = {'Enrollment':'student', 'ExerciseRecord':'student', 'StudentCourseProgress':'student',
          'StudentApplication':'student', 'FeedbackTicket':'student', 'SettlementReportRow':'student',
          'CourseChangeImpact':'affectedStudents', 'AssessmentRosterRow':'student'}

def sha(raw): return hashlib.sha256(raw).hexdigest()
def dump(path, value): path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf8', newline='\n')

def migrate(schema, value, schemas):
    if value is None: return None
    if '$ref' in schema:
        name=schema['$ref'].split('/')[-1]
        result=migrate(schemas[name], value, schemas)
        if name in FIELDS and isinstance(result, dict) and FIELDS[name] in result:
            key=FIELDS[name]; item=result[key]
            if name=='CourseChangeImpact' and isinstance(item,list):
                result[key]=[{'kind':'CURRENT_STUDENT','student':v} if isinstance(v,dict) else v for v in item]
            elif isinstance(item,dict): result[key]={'kind':'CURRENT_STUDENT','student':item}
        return result
    result=deepcopy(value)
    if isinstance(result,dict):
        for key,child in schema.get('properties',{}).items():
            if key in result: result[key]=migrate(child,result[key],schemas)
    if isinstance(result,list) and 'items' in schema:
        result=[migrate(schema['items'],v,schemas) for v in result]
    branches=schema.get('oneOf',schema.get('anyOf',[]))
    if branches:
        if 'discriminator' in schema and isinstance(result,dict):
            d=schema['discriminator']; target=d['mapping'].get(result.get(d['propertyName']))
            if target: return migrate({'$ref':target},result,schemas)
        for branch in branches:
            if branch.get('type')!='null':
                result=migrate(branch,result,schemas)
                break
    return result

def validator(spec,name):
    return Draft202012Validator({'$ref':'#/components/schemas/'+name,'components':spec['components']},format_checker=FormatChecker())

def main():
    old_raw=subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':contracts/openapi.yaml'])
    assert sha(old_raw)==PRIOR_SHA
    old=yaml.safe_load(old_raw); raw=(ROOT/'contracts/openapi.yaml').read_bytes(); spec=yaml.safe_load(raw)
    prior_path=ROOT/'contracts/validation/step07_handoff/fixtures.json'
    prior=json.loads(prior_path.read_bytes()); assert prior['candidateSha256']==PRIOR_SHA
    migrated=[]; changes=[]
    for case in prior['cases']:
        row=deepcopy(case)
        row['payload']=migrate({'$ref':'#/components/schemas/'+case['schema']},case['payload'],old['components']['schemas'])
        if row['payload']!=case['payload']: changes.append(case['name'])
        migrated.append(row)
    additional=[]
    def add(name,schema,payload,valid):
        additional.append(dict(name='p7/'+name,schema=schema,payload=deepcopy(payload),expectedValid=valid,category='historical_student'))
    student=next(c['payload']['student'] for c in migrated if c['name']=='checks/wire/StudentDashboard')
    current={'kind':'CURRENT_STUDENT','student':student}
    deleted={'kind':'DELETED_STUDENT','studentId':student['studentId']}
    add('reference/current','StudentReference',current,True)
    pending=deepcopy(current);pending['student']['studentStatus']='PENDING';add('reference/pending','StudentReference',pending,True)
    add('reference/deleted','StudentReference',deleted,True)
    add('current/model','CurrentStudentReference',current,True)
    add('deleted/model','DeletedStudentReference',deleted,True)
    for name,value in [('missing_kind',{'studentId':student['studentId']}),('unknown_kind',{**deleted,'kind':'UNKNOWN'}),
                       ('mixed',{**deleted,'student':student}),('null',None),('missing_id',{'kind':'DELETED_STUDENT'}),
                       ('bad_id',{**deleted,'studentId':'not-a-uuid'}),('old_summary',student),
                       ('current_missing_student',{'kind':'CURRENT_STUDENT'}),('kind_null',{**deleted,'kind':None})]:
        add('reference/'+name,'StudentReference',value,False)
    for field,value in [('name','SYNTHETIC'),('studentNumber','SYNTHETIC'),('gender','FEMALE'),('gradeYear',1),
                        ('email','synthetic@example.invalid'),('deletedAt','2026-09-09T00:00:00Z')]:
        add('deleted/pii/'+field,'StudentReference',{**deleted,field:value},False)
    by_schema={c['schema']:c['payload'] for c in migrated if c['expectedValid']}
    # Existing valid schemas are used as complete boundary fixtures, without inventing partial DTOs.
    sys.path.insert(0,str(ROOT/'contracts/scripts'))
    from verify_contract import certification_response_fixture, certification_request_fixture
    application=certification_response_fixture(certification_request_fixture('SCHOOL_TEAM')['certification'])
    by_schema['StudentApplication']=application
    by_schema['Enrollment']={'enrollmentId':student['studentId'],'courseId':student['studentId'], 'student':current,
                             'status':'ACTIVE','joinedAt':'2026-09-09T00:00:00Z','removedAt':None,'studentVisibleReason':None,'version':1}
    # Feedback and impact sample shapes follow required properties from the public schema.
    def sample(schema, depth=0):
        assert depth<25
        if '$ref' in schema:
            name=schema['$ref'].split('/')[-1]
            if name=='StudentReference': return deepcopy(current)
            if name in by_schema: return deepcopy(by_schema[name])
            return sample(spec['components']['schemas'][name],depth+1)
        if 'const' in schema:return schema['const']
        if 'enum' in schema:return schema['enum'][0]
        for k in ['anyOf','oneOf']:
            if k in schema:
                b=next((v for v in schema[k] if v.get('type')=='null'),schema[k][0]);return sample(b,depth+1)
        t=schema.get('type')
        if t=='null':return None
        if t=='object':return {k:sample(schema['properties'][k],depth+1) for k in schema.get('required',[])}
        if t=='array':return [sample(schema['items'],depth+1) for _ in range(schema.get('minItems',0))]
        if t=='boolean':return False
        if t in ['integer','number']:return schema.get('minimum',0)
        if t=='string':
            return {'uuid':student['studentId'],'date-time':'2026-09-09T00:00:00Z','date':'2026-09-09','email':'synthetic@example.invalid'}.get(schema.get('format'),'SYNTHETIC')
        raise ValueError(schema)
    for name,field in FIELDS.items():
        base=deepcopy(by_schema[name]) if name in by_schema else sample(spec['components']['schemas'][name])
        if name=='CourseChangeImpact':base[field]=[deepcopy(current)]
        elif name=='AssessmentRosterRow':base[field]=deepcopy(current)
        assert validator(spec,name).is_valid(base),(name,list(validator(spec,name).iter_errors(base)))
        add('outlet/'+name+'/current',name,base,True)
        gone=deepcopy(base);gone[field]=[deepcopy(deleted)] if name=='CourseChangeImpact' else deepcopy(deleted)
        if name=='FeedbackTicket':gone['currentVerifiedEmail']=None
        if name=='AssessmentRosterRow':gone.update(rosterName=None,rosterStudentNumber=None,registrationState='NOT_REGISTERED_OR_JOINED')
        add('outlet/'+name+'/deleted',name,gone,True)
        invalid=deepcopy(gone)
        (invalid[field][0] if name=='CourseChangeImpact' else invalid[field])['name']='SYNTHETIC'
        add('outlet/'+name+'/pii',name,invalid,False)
        old_shape=deepcopy(base);old_shape[field]=[student] if name=='CourseChangeImpact' else student
        add('outlet/'+name+'/old_shape',name,old_shape,False)
        if name=='FeedbackTicket':
            invalid=deepcopy(gone);invalid['currentVerifiedEmail']='synthetic@example.invalid';add('feedback/old_email',name,invalid,False)
        if name=='AssessmentRosterRow':
            for key,value in [('rosterName','SYNTHETIC'),('rosterStudentNumber','SYNTHETIC'),('registrationState','MATCHED_VERIFIED_JOINED')]:
                invalid=deepcopy(gone);invalid[key]=value;add('roster/'+key,name,invalid,False)
            unlinked=deepcopy(base);unlinked[field]=None;add('roster/unlinked_null',name,unlinked,True)
    failures=[]
    for case in migrated+additional:
        valid=validator(spec,case['schema']).is_valid(case['payload'])
        if valid!=case['expectedValid']: failures.append(case['name'])
    assert not failures, failures
    dump(Path(__file__).with_name('fixtures.json'),dict(version=spec['info']['version'],status=spec['info']['x-contract-status'],
        candidateSha256=sha(raw),baselineCommit=BASE,baselineSha256=PRIOR_SHA,priorFixtureSha256=sha(prior_path.read_bytes()),
        source='Schema-aware migration of original 992 cases; original bytes/expected outcomes preserved in prior file. New cases separate.',
        synthetic=True,migratedNames=changes,cases=migrated,additionalCases=additional))
    prior_trace=ROOT/'contracts/validation/step07_handoff/traceability.json'
    dump(Path(__file__).with_name('traceability.json'),dict(candidateSha256=sha(raw),
        sourceCommit=BASE,priorTraceabilitySha256=sha(prior_trace.read_bytes()),
        basis='Unchanged page-to-operation mapping only; not inherited test/acceptance results. Operation identities remain unchanged.',
        studentPages=json.loads(prior_trace.read_bytes())['studentPages']))
    print(f'PASS: {len(migrated)} regression cases ({len(changes)} migrated), {len(additional)} new CR cases.')

if __name__=='__main__':main()
