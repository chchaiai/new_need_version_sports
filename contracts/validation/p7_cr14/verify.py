"""Current CR verification. Historical reports are never relabelled as this release."""
from copy import deepcopy
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT=Path(__file__).resolve().parents[3]
BASE='f95c3833870fe0da55a297aa28c958ec53e9e935'
EXPECTED_OPS=set('listSemesters listOwnCourses listCourseMakeupAuthorizations listOwnMakeupAuthorizations listCourseInvitations listCourseMembers listPublishedRuleTemplates listSubAdmins listTeacherAccounts listOwnStudentNotifications listOwnNotifications listSystemModeTransitions listStudentAccounts'.split())
OUTLETS={'Enrollment','ExerciseRecord','StudentCourseProgress','StudentApplication','FeedbackTicket','SettlementReportRow','CourseChangeImpact','AssessmentRosterRow'}

def sha(data):return hashlib.sha256(data).hexdigest()
def ops(s):return {o['operationId']:o for item in s['paths'].values() for o in item.values() if isinstance(o,dict) and 'operationId' in o}
def check(s,old):
 errors=[]
 def require(ok,message):
  if not ok:errors.append(message)
 schemas=s['components']['schemas']; prior=old['components']['schemas']
 require(s['info']['version']=='1.4.0-contract' and s['info']['x-contract-status']=='RC','version/status')
 require(s['servers']==old['servers'],'public base path')
 require(set(schemas)==set(prior)|{'StudentReference','CurrentStudentReference','DeletedStudentReference'},'schema inventory')
 for n in set(prior)-OUTLETS:require(schemas[n]==prior[n],'unrelated schema '+n)
 ref=schemas.get('StudentReference',{})
 require(ref.get('discriminator')=={'propertyName':'kind','mapping':{'CURRENT_STUDENT':'#/components/schemas/CurrentStudentReference','DELETED_STUDENT':'#/components/schemas/DeletedStudentReference'}},'explicit mapping')
 require(ref.get('oneOf')==[{'$ref':'#/components/schemas/CurrentStudentReference'},{'$ref':'#/components/schemas/DeletedStudentReference'}],'union branches')
 for n,fields in [('CurrentStudentReference',{'kind','student'}),('DeletedStudentReference',{'kind','studentId'})]:
  v=schemas.get(n,{})
  require(v.get('additionalProperties') is False and set(v.get('required',[]))==fields and set(v.get('properties',{}))==fields,'closed branch '+n)
 require(s['x-error-catalog']==old['x-error-catalog'],'global errors unchanged')
 current,previous=ops(s),ops(old);require(set(current)==set(previous),'operations unchanged')
 for n,a in current.items():
  b=previous[n]
  require(a['x-error-codes']==b['x-error-codes']+(['INVALID_REQUEST'] if n in EXPECTED_OPS else []),'error allowlist '+n)
  x,y=deepcopy(a),deepcopy(b)
  for v in [x,y]:
   for key in ['description','x-error-codes','x-query-serialization','x-historical-student-projection']:v.pop(key,None)
   if isinstance(v.get('x-idempotency'),dict):v['x-idempotency'].pop('historicalIdentityException',None)
   for p in v.get('parameters',[]):p.pop('description',None)
  require(x==y,'unrelated operation behavior '+n)
  if n in EXPECTED_OPS:
   q=a.get('x-query-serialization',{})
   require(q.get('scalarOccurrences')=='AT_MOST_ONE_AFTER_PARAMETER_NAME_DECODING' and q.get('invalidSyntaxError')=='INVALID_REQUEST' and q.get('invalidSyntaxStatus')==400,'query syntax '+n)
   require(q.get('limit',{}).get('decodedPattern')=='^[0-9]+$' and q.get('limit',{}).get('minimum')==1 and q.get('limit',{}).get('maximum')==100,'limit syntax '+n)
   require('400' in a['responses'],'HTTP400 '+n)
  else:require('x-query-serialization' not in a,'query scope expanded '+n)
 for n in OUTLETS:
  field='affectedStudents' if n=='CourseChangeImpact' else 'student'
  actual=schemas[n]['properties'][field]
  target={'$ref':'#/components/schemas/StudentReference'}
  if n=='CourseChangeImpact':actual=actual.get('items')
  if n=='AssessmentRosterRow':target={'anyOf':[target,{'type':'null'}]}
  require(actual==target,'outlet '+n)
  require(schemas[n]['required']==prior[n]['required'],'required unchanged '+n)
 require(bool(s.get('x-historical-students',{}).get('replay')),'receipt exception explicit')
 require(s['x-contract-governance'].get('phase7Compatibility',{}).get('breaking') is True,'breaking explicit')
 return errors

def reach(node,target,schemas,seen=frozenset()):
 if isinstance(node,list):return any(reach(x,target,schemas,seen) for x in node)
 if not isinstance(node,dict):return False
 n=node.get('$ref','').split('/')[-1]
 if n in target:return True
 if n in schemas and n not in seen and reach(schemas[n],target,schemas,seen|{n}):return True
 return any(reach(v,target,schemas,seen) for k,v in node.items() if k!='$ref')

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 raw=(ROOT/'contracts/openapi.yaml').read_bytes();s=yaml.safe_load(raw)
 oldraw=subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':contracts/openapi.yaml']);old=yaml.safe_load(oldraw)
 assert sha(oldraw)=='5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed'
 errors=check(s,old); corpus=json.loads(Path(__file__).with_name('fixtures.json').read_bytes())
 assert corpus['candidateSha256']==sha(raw)
 results=[];validators={}
 for c in corpus['cases']+corpus['additionalCases']:
  v=validators.setdefault(c['schema'],Draft202012Validator({'$ref':'#/components/schemas/'+c['schema'],'components':s['components']},format_checker=FormatChecker()))
  actual=v.is_valid(c['payload'])
  results.append(dict(name=c['name'],expectedValid=c['expectedValid'],actualValid=actual,passed=actual==c['expectedValid']))
 mutations=[]
 for name in EXPECTED_OPS:
  changed=deepcopy(s);ops(changed)[name]['x-error-codes'].remove('INVALID_REQUEST');mutations.append(dict(name='allowlist/'+name,rejected=bool(check(changed,old))))
 for name,modify in [('mapping',lambda t:t['components']['schemas']['StudentReference']['discriminator']['mapping'].pop('DELETED_STUDENT')),
  ('pii_allowed',lambda t:t['components']['schemas']['DeletedStudentReference'].update(additionalProperties=True)),
  ('query_scope',lambda t:ops(t)['getStudentDashboard'].update({'x-query-serialization':{}})),
  ('role_change',lambda t:ops(t)['listCourseMembers']['x-roles'].append('STUDENT')),
  ('summary_change',lambda t:t['components']['schemas']['StudentSummary']['required'].remove('name'))]:
  changed=deepcopy(s);modify(changed);mutations.append(dict(name=name,rejected=bool(check(changed,old))))
 impact=[]
 for path,item in s['paths'].items():
  for method,op in item.items():
   if isinstance(op,dict) and 'operationId' in op and reach(op.get('responses',{}),OUTLETS,s['components']['schemas']):
    current_only=op.get('x-roles')==['STUDENT']
    impact.append(dict(operationId=op['operationId'],method=method.upper(),path='/api/v1'+path,roles=op['x-roles'],
      classification='CURRENT_ONLY' if current_only else 'HISTORICAL_CAPABLE',backendImplemented='NOT_ASSERTED'))
 result=dict(contractVersion=s['info']['version'],candidateSha256=sha(raw),baseCommit=BASE,structuralErrors=errors,
  cases=len(results),passed=sum(x['passed'] for x in results),results=results,mutations=mutations,affectedResponseOperations=impact,
  queryOperations=sorted(EXPECTED_OPS),backend='NOT_RUN; H/Z candidate failures and joint acceptance remain open')
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
 if errors or not all(x['passed'] for x in results) or not all(x['rejected'] for x in mutations):raise SystemExit('FAIL: '+str(a.output))
 print(f'PASS: {len(results)} Python cases; {len(mutations)} structural mutations rejected; {len(impact)} affected response operations. No backend claim.')

if __name__=='__main__':main()
