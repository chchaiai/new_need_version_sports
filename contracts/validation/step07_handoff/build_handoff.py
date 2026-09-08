"""Build review/navigation artifacts from fixed inputs; never changes Contract or Git."""
import argparse
from pathlib import Path
import json,hashlib,re,subprocess
import yaml

ROOT=Path(__file__).resolve().parents[3]
CONTRACT=ROOT/'contracts'
BASE='974587c3778a53803a7959ea0f64677581e239f4'
OLD_SHA='667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a'
NEW_SHA='5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,d):p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode())
def operations(s):return {v['operationId']:{'method':m.upper(),'path':p,'definition':v} for p,item in s['paths'].items() for m,v in item.items() if isinstance(v,dict) and 'operationId' in v}
def refs(node):
    result=set()
    if isinstance(node,dict):
        if '$ref' in node and node['$ref'].startswith('#/components/schemas/'):result.add(node['$ref'].split('/')[-1])
        for v in node.values():result.update(refs(v))
    elif isinstance(node,list):
        for v in node:result.update(refs(v))
    return result
def closure(node,s):
    pending=list(refs(node));seen=set()
    while pending:
        n=pending.pop()
        if n in seen:continue
        seen.add(n);pending.extend(refs(s['components']['schemas'][n])-seen)
    return sorted(seen)
def deltas(a,b,path=''):
    if a==b:return []
    if isinstance(a,dict) and isinstance(b,dict):
        out=[]
        for k in sorted(set(a)|set(b)):
            p=path+'/'+k.replace('~','~0').replace('/','~1')
            if k not in a:out.append({'pointer':p,'change':'ADDED','after':b[k]})
            elif k not in b:out.append({'pointer':p,'change':'REMOVED','before':a[k]})
            else:out.extend(deltas(a[k],b[k],p))
        return out
    return [{'pointer':path,'change':'CHANGED','before':a,'after':b}]

def main():
    p=argparse.ArgumentParser();p.add_argument('--verification',type=Path,required=True);p.add_argument('--output',type=Path,default=Path(__file__).parent);a=p.parse_args();a.output.mkdir(exist_ok=True,parents=True)
    old_raw=subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':contracts/openapi.yaml']);raw=(CONTRACT/'openapi.yaml').read_bytes()
    assert sha(old_raw)==OLD_SHA and sha(raw)==NEW_SHA
    old=yaml.safe_load(old_raw);new=yaml.safe_load(raw);before=operations(old);after=operations(new)
    input=load(a.verification/'all-runtime-input.json');result=load(a.verification/'strict-jvm-result.json')
    assert input['candidateSha256']==result['candidateSha256']==NEW_SHA and input['spec']==new
    assert result['passed']==result['total']==992 and all(x['passed'] for x in result['cases'])
    cases=input['cases'];assert len(cases)==len({r['name'] for r in cases})==992
    identity={'version':'1.3.0-contract','status':'RC','candidateSha256':NEW_SHA,'baselineCommit':BASE,'baselineSha256':OLD_SHA}
    changed_schemas={n for n in set(old['components']['schemas'])&set(new['components']['schemas']) if old['components']['schemas'][n]!=new['components']['schemas'][n]}
    op_rows=[]
    for name in sorted(set(before)|set(after)):
        b=before.get(name);v=after.get(name);affected=sorted(set(closure(v['definition'],new))&changed_schemas) if v else []
        status='ADDED' if b is None else 'REMOVED' if v is None else 'DIRECTLY_CHANGED' if b!=v else 'REFERENCED_SCHEMA_CHANGED' if affected else 'UNCHANGED'
        op_rows.append({'operationId':name,'change':status,'before':None if b is None else {k:v for k,v in b.items() if k!='definition'},'after':None if v is None else {k:v for k,v in v.items() if k!='definition'},'affectedSchemas':affected,'definitionDelta':deltas(b['definition'] if b else {},v['definition'] if v else {}),
            'currentRules':None if v is None else {k:val for k,val in v['definition'].items() if k.startswith('x-') or k=='security'},
            'requestSchemaRefs':[] if v is None else sorted(refs(v['definition'].get('requestBody',{}))),
            'responseSchemaRefs':[] if v is None else sorted(refs(v['definition'].get('responses',{}))),
            'responseStatusCodes':[] if v is None else sorted(v['definition'].get('responses',{}))})
    schema_rows=[]
    for name in sorted(set(old['components']['schemas'])|set(new['components']['schemas'])):
        b=old['components']['schemas'].get(name);v=new['components']['schemas'].get(name)
        if b==v:continue
        schema_rows.append({'schema':name,'change':'ADDED' if b is None else 'REMOVED' if v is None else 'CHANGED','delta':deltas(b or {},v or {})})
    counts={name:sum(x['change']==name for x in op_rows) for name in ['ADDED','REMOVED','DIRECTLY_CHANGED','REFERENCED_SCHEMA_CHANGED','UNCHANGED']}
    write(a.output/'contract-diff.json',{**identity,'breaking':True,'interpretation':'Raw definition changes and transitive changed-schema reachability are reported separately; this is not a backward-compatibility classifier. Whole RC must be reloaded.','counts':counts,'operations':op_rows,'schemas':schema_rows,'globalDelta':deltas({k:v for k,v in old.items() if k not in ['paths','components']},{k:v for k,v in new.items() if k not in ['paths','components']})})
    write(a.output/'fixtures.json',{**identity,'source':'Step6 final same-SHA all-runtime-input.json','sourceSha256':sha((a.verification/'all-runtime-input.json').read_bytes()),'synthetic':True,'scope':'Schema/generated-model examples and rejection inputs; not complete UI Mock scenarios or real Backend evidence.','cases':cases})
    disp=load(CONTRACT/'validation/step06_final/disposition.json');gaps={int(x['gap'][-2:]):x for x in disp['gaps']}
    at_gap={1:[2],2:[2,3,17],3:[2,10,21],4:[2,4],5:[3,4,5],6:[3,4,5],7:[3,4,17],8:[5,15,18],9:[1],10:[1],11:[1],12:[1],13:[1],14:[1,11],15:[8],16:[7,19],17:[9],18:[12,13],19:[4,16],20:[4,5],21:[4],22:[6],23:[11,18],24:[11,16],25:[11,13,18],26:[14],27:[14],28:[10,21]}
    at_source='docs/rebuild/handoffs/2026-09-04-teacher-first-business-update.md';text=(ROOT/at_source).read_text(encoding='utf-8');at_rows=[]
    for match in re.finditer(r'^\| AT-(\d\d) \| ([^|]+) \| ([^|]+) \|',text,re.M):
        n=int(match[1]);gs=[gaps[i] for i in at_gap[n]];names=sorted({o['operationId'] for g in gs for o in g['operations']});ss=sorted({s for g in gs for s in g['schemas']})
        for name in names:ss=sorted(set(ss)|set(closure(after[name]['definition'],new)))
        example=[c['name'] for c in cases if c['expectedValid'] and c['schema'] in ss]
        if n==21:
            names=sorted(set(names)|{'createStudentApplication','supplementStudentApplication','allocateMediaAsset'})
            for name in names:ss=sorted(set(ss)|set(closure(after[name]['definition'],new)))
            example=[c['name'] for c in cases if c['expectedValid'] and c['schema'] in ss]
        at_rows.append({'at':f'AT-{n:02}','source':at_source+'#7-开发验收场景清单尚未执行','scenario':match[2].strip(),'originalAssertionHistorical':match[3].strip(),'currentDisposition':'SUPERSEDED_NO_DELEGATION_API_VERIFY_DENIAL_LATER' if n in [26,27] else 'CONTRACT_EXPRESSED_RUNTIME_SCENARIO_NOT_RUN','gaps':[g['gap'] for g in gs],'changeRequests':sorted({g['changeRequest'] for g in gs}),'operationIds':names,'schemaNames':ss,'legalSchemaExamples':example,'evidenceSuites':sorted({g['evidenceSuite'] for g in gs}),'laterVerification':'Phase6 complete UI Mock; Phase7–9 real state machine/authorization/concurrency/media/recovery. AT26/27 only test cancelled-capability rejection; P01–04 and H13 latest decisions override older assertions.'})
    assert len(at_rows)==28
    # Stable IDs come from the actual Phase2 inventory, never fabricated REQ IDs.
    page_source='docs/rebuild/phase-2/android/p2a-student-ui/page-inventory.md';inventory=(ROOT/page_source).read_text(encoding='utf-8')
    page_ops={1:'getCurrentActor getSystemMode getOwnActiveExerciseSession',2:'getSystemMode getOwnExerciseRecord',3:'',4:'',5:'requestAuthChallenge createStudentSession',6:'requestAuthChallenge createStudentSession',7:'',8:'',9:'requestAuthChallenge registerStudentAndJoinCourse',10:'getOwnCurrentCourse',20:'getStudentDashboard getOwnCourseProgress',21:'getOwnCurrentCourse getCourse',22:'startExerciseSession getOwnActiveExerciseSession',23:'getOwnCourseProgress listOwnExerciseRecords listCheckpointRecordCredits',24:'getCurrentActor',25:'listOwnStudentNotifications getOwnStudentUnreadNotificationCount markOwnStudentNotificationRead',30:'previewCourseInvitation registerNewInvitationFlow',31:'previewCourseInvitation registerNewInvitationFlow registerStudentAndJoinCourse',32:'previewCourseInvitation registerExistingInvitationFlow',33:'previewCourseInvitation',34:'previewCourseInvitation joinCourseByInvitation',35:'joinCourseByInvitation registerStudentAndJoinCourse getOwnCurrentCourse',40:'getOwnActiveExerciseSession startExerciseSession getExerciseSession pauseExerciseSession resumeExerciseSession completeExerciseSession',41:'allocateMediaAsset finalizeMediaAsset',42:'getFirstMaterialEligibility submitExerciseRecord listRecordMaterials getRecordMaterial completeExerciseRecordMaterial renewRecordUploadAuthorization',43:'submitExerciseRecord',50:'listOwnExerciseRecords',51:'getOwnExerciseRecord listExerciseRecordReviews getRecordMaterial listCheckpointRecordCredits',52:'getOwnEnduranceOutcome',60:'getOwnExerciseRecord submitExerciseRecordSupplement',61:'getOwnExerciseRecord getRecordMaterial',70:'createStudentApplication listOwnApplications getOwnApplication supplementStudentApplication',80:'getCurrentActor',81:'logoutCurrentSession logoutAllSessions',82:'getOwnAccountDeletionImpact deleteOwnAccount',83:'requestAuthChallenge changeOwnVerifiedEmail',84:'listPublishedHelpArticles getPublishedHelpArticle',85:'createFeedback listOwnFeedback getOwnFeedback',86:'getAppReleasePolicy',87:'',88:''}
    pages=[]
    for m in re.finditer(r'^\| `PAGE-STU-(\d{3})` \| ([^|]+) \|',inventory,re.M):
        n=int(m[1]);names=page_ops[n].split()
        if n==21:names=['getOwnCurrentCourse']
        assert all(x in after for x in names)
        assert all(set(after[x]['definition']['x-roles'])&{'STUDENT','ANONYMOUS'} for x in names)
        pages.append({'page':'PAGE-STU-'+m[1],'title':m[2].strip(),'source':page_source,'operationIds':names,'disposition':'PROTOCOL_MAPPING_CLIENT_VALIDATION_PENDING' if names else 'LOCAL_PRESENTATION_OR_EXISTING_SCHOOL_PROCESS_NO_NEW_API','note':'PAGE-STU-008 follows student business §5.3 school/administrator identity verification; no new online recovery submission/approval API is invented. Shared getCourse must honor actual operation roles, not imply student permission.' if n in [8,21] else 'Bind actual server facts and permission/error rules; retain Phase2 UI foundation boundary.'})
    assert len(pages)==41
    # Business decision IDs are the existing twelve IDs, not new decisions.
    bd_at={1:[1,2,3,4],2:[18],3:[15],4:[16],5:[17],6:[4,5,6,7,8,20],7:[19,20,21],8:[9,10,11,12,13,14,22],9:[23,24,25],10:[22,28]}
    bd=[{'decision':f'BD-20260903-{n:02}','at':[f'AT-{i:02}' for i in v],'status':'EXISTING_ACCEPTED_SCOPE_LATEST_BD0904_AND_P01_04_OVERRIDE_HISTORY'} for n,v in bd_at.items()]
    bd += [{'decision':'BD-20260904-01','at':['AT-02','AT-05','AT-06','AT-07','AT-20'],'status':'EXISTING_ACCEPTED'}, {'decision':'BD-20260904-02','at':['AT-05','AT-06','AT-07','AT-08','AT-18','AT-23','AT-24','AT-25','AT-26','AT-27'],'status':'EXISTING_ACCEPTED_CANCELS_AT26_27_CAPABILITY'}]
    trace={**identity,'sourcePolicy':'Four business bodies are authority; Phase4 matrix §8 overrides historical pending/delegation text. Phase2 UI requirements do not grant extra API permissions.','gapsSource':'contracts/validation/step06_final/disposition.json','businessDecisions':bd,'acceptanceScenarios':at_rows,'studentPages':pages,'sevenStates':['NORMAL','LOADING','EMPTY','ERROR','FORBIDDEN','MAINTENANCE','RESUME'],'stateSource':'docs/rebuild/phase-2/android/p2a-student-ui/state-matrix.md','stateBoundary':'Do not infer MAINTENANCE from transport failure or INVALID from technical state; no default-empty on failure. Actual seven-state UI Mock in6, devices/accessibility in10.','webInput':'docs/rebuild/handoffs/2026-09-05-web-v81-align.md','webBoundary':'Former display-only return/supplement, review stages, locked-batch continuation, SLA, template/OCR/technical governance now have RC mappings; actual Web binding and complete Mock remain Phase6. Cancelled delegation stays absent.','unexecuted':['Phase6 A/B actual app/Mapper/Mock and6C','Backend7.0 compatibility','Phase7 actual backend/DB/calendar','Phase8 legacy/FCM migration','Phase9 E2E/recovery/OCR quality','Phase10 privacy/seven-state/accessibility','Phase11 release evidence']}
    write(a.output/'traceability.json',trace)
    summary={**identity,'operationCounts':counts,'changedSchemaCount':len(schema_rows),'acceptanceScenarioCount':len(at_rows),'studentPageCount':len(pages),'businessDecisionCount':len(bd),'fixtureCount':len(cases),'positiveFixtures':sum(x['expectedValid'] for x in cases),'outputFiles':[{ 'path':name,'sha256':sha((a.output/name).read_bytes()),'bytes':(a.output/name).stat().st_size} for name in ['contract-diff.json','fixtures.json','traceability.json']]}
    write(a.output/'build-result.json',summary);print(json.dumps(summary,ensure_ascii=False))

if __name__=='__main__':main()
