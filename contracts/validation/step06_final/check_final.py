"""Final structural cross-checks supplement (never replace) prior per-step gates."""
from copy import deepcopy
import argparse,hashlib,json
from pathlib import Path
import yaml


def integrity_errors(spec):
    errors=[]
    def require(ok,msg):
        if not ok:errors.append(msg)
    schemas=spec['components']['schemas'];ops={o['operationId']:o for item in spec['paths'].values() for o in item.values() if isinstance(o,dict) and 'operationId' in o}
    p=spec['x-upload-policies']['ROSTER_SOURCE']
    require(p.get('sourceFormats')==['XLSX','CSV','PAPER_SCAN'],'Roster global source formats agree with batch API')
    require(p.get('flow')==['ALLOCATE','DIRECT_UPLOAD','VERIFY_SOURCE','PARSE_OR_OCR_DRAFT','TEACHER_CONFIRM_ROWS','ATOMIC_PUBLISH_SNAPSHOT'],'Draft-to-confirmation global flow')
    require('Parsing alone never authorizes deletion' in p.get('retention',''),'Do not delete original evidence merely because parsing succeeded')
    require('discarded after parsing' not in ops['allocateRosterImport']['description'],'Legacy upload description does not override retained source facts')
    required_cr={'CR-20260901-005','CR-20260908-001','CR-20260908-002','CR-20260908-003','CR-20260908-004'}
    require(required_cr<=set(spec['x-contract-governance']['acceptedPhase5ChangeRequests']),'All current implementation CRs linked')
    compatibility=spec['x-contract-governance'].get('phase5Compatibility',{})
    require(compatibility.get('breaking') is True and compatibility.get('publicBasePath')=='/api/v1' and compatibility.get('previousVersion')=='1.2.0-contract','Owner-confirmed breaking release keeps the public base path')
    # Every nested discriminator uses the actual wire literal and the complete branch set.
    count=0
    def walk(node):
        nonlocal count
        if isinstance(node,list):
            for v in node:walk(v)
        if not isinstance(node,dict):return
        if 'discriminator' in node:
            count+=1;d=node['discriminator'];mapping=d.get('mapping',{});branches=node.get('oneOf',[])
            require(set(mapping.values())=={b.get('$ref') for b in branches} and len(mapping)==len(branches),'Complete discriminator mapping '+d['propertyName'])
            for value,target in mapping.items():
                branch=schemas.get(target.split('/')[-1],{});prop=branch.get('properties',{}).get(d['propertyName'],{})
                require(prop.get('const')==value or prop.get('enum')==[value],'Actual wire literal '+d['propertyName']+'/'+value)
        for k,v in node.items():
            if k not in ['description','example','examples','discriminator']:walk(v)
    walk(schemas);require(count==6,'Six old/new discriminator groups, including nested rule change')
    require(schemas['ReturnExerciseRecordRequest']['properties']['windowHours'].get('enum')==[24,72],'24/72 window remains numeric enum')
    require('windowHours' not in schemas['ReturnExerciseRecordRequest']['required'],'Optional default does not become required for generator convenience')
    require('remark' not in schemas['PublishFinalGradeRequest']['properties'],'No reintroduced new grade remark')
    require(schemas['StudentDashboard']['properties']['currentSemester']=={'$ref':'#/components/schemas/SemesterSummary'},'Rejected nullable current-semester CR remains rejected')
    if spec['info']['x-contract-status']=='RC':require(spec['info']['version']=='1.3.0-contract','Owner-confirmed final version')
    return errors


def mutations(spec):
    cases=[]
    def mutation(name,fn):
        altered=deepcopy(spec);fn(altered);cases.append({'name':name,'rejected':bool(integrity_errors(altered))})
    mutation('roster/drop_paper',lambda d:d['x-upload-policies']['ROSTER_SOURCE']['sourceFormats'].pop())
    mutation('roster/parse_then_delete',lambda d:d['x-upload-policies']['ROSTER_SOURCE'].update(retention='Temporary source discarded after parsing.'))
    mutation('roster/skip_teacher',lambda d:d['x-upload-policies']['ROSTER_SOURCE']['flow'].remove('TEACHER_CONFIRM_ROWS'))
    for name in ['SubmitExerciseRecordRequest','AppendRecordReviewRequest','CorrectExerciseRecordReviewRequest']:
        mutation('mapping/drop/'+name,lambda d,n=name:d['components']['schemas'][n]['discriminator']['mapping'].pop(next(iter(d['components']['schemas'][n]['discriminator']['mapping']))))
    mutation('default/became_required',lambda d:d['components']['schemas']['ReturnExerciseRecordRequest']['required'].append('windowHours'))
    mutation('default/numeric_to_string',lambda d:d['components']['schemas']['ReturnExerciseRecordRequest']['properties']['windowHours'].update(enum=['24','72']))
    mutation('rejected_dashboard_cr',lambda d:d['components']['schemas']['StudentDashboard']['properties'].update(currentSemester={'anyOf':[{'$ref':'#/components/schemas/SemesterSummary'},{'type':'null'}]}))
    mutation('release/incorrect_compatibility_claim',lambda d:d['x-contract-governance']['phase5Compatibility'].update(breaking=False))
    return cases


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--spec',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    raw=a.spec.read_bytes();s=yaml.safe_load(raw);errors=integrity_errors(s);m=mutations(s)
    result={'candidateSha256':hashlib.sha256(raw).hexdigest(),'integrityErrors':errors,'mutationCount':len(m),'mutationsRejected':sum(x['rejected'] for x in m),'mutations':m}
    a.output.write_bytes((json.dumps(result,indent=2)+'\n').encode());print(json.dumps(result))
    if errors or not all(x['rejected'] for x in m):raise SystemExit(1)
