"""Check handoff indexes and exact prior evidence. Does not grant human acceptance."""
from pathlib import Path
import argparse,json,hashlib,re,subprocess
from datetime import datetime, timezone
import yaml

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8'))

def main():
    p=argparse.ArgumentParser();p.add_argument('--verification',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    metadata=load(ROOT/'contracts/contract-metadata.json');digest=sha(ROOT/'contracts/openapi.yaml');assert digest==metadata['openapiSha256']
    spec=yaml.safe_load((ROOT/'contracts/openapi.yaml').read_bytes());ops={v['operationId']:v for p in spec['paths'].values() for v in p.values() if isinstance(v,dict) and 'operationId' in v}
    report=load(HERE/'build-result.json');trace=load(HERE/'traceability.json');fixtures=load(HERE/'fixtures.json');diff=load(HERE/'contract-diff.json')
    for data in [report,trace,fixtures,diff]:assert data['candidateSha256']==digest
    for row in report['outputFiles']:assert sha(HERE/row['path'])==row['sha256']
    original=load(a.verification/'all-runtime-input.json');jvm=load(a.verification/'strict-jvm-result.json')
    assert fixtures['cases']==original['cases'] and fixtures['sourceSha256']==sha(a.verification/'all-runtime-input.json')
    assert original['candidateSha256']==jvm['candidateSha256']==digest
    assert jvm['total']==jvm['passed']==len(fixtures['cases'])==992
    assert {r['at'] for r in trace['acceptanceScenarios']}=={f'AT-{i:02}' for i in range(1,29)}
    inventory=ROOT/'docs/rebuild/phase-2/android/p2a-student-ui/page-inventory.md'
    page_ids=set(re.findall(r'^\| `(PAGE-STU-\d+)` \|',inventory.read_text(encoding='utf-8'),re.M))
    assert {r['page'] for r in trace['studentPages']}==page_ids and len(page_ids)==41
    assert len(trace['businessDecisions'])==12
    cases={r['name'] for r in fixtures['cases']}
    for row in trace['acceptanceScenarios']:
        assert set(row['operationIds'])<=set(ops)
        assert set(row['schemaNames'])<=set(spec['components']['schemas'])
        assert set(row['legalSchemaExamples'])<=cases
        if row['at'] in ['AT-26','AT-27']:assert row['currentDisposition']=='SUPERSEDED_NO_DELEGATION_API_VERIFY_DENIAL_LATER' and not row['operationIds']
    for row in trace['studentPages']:
        assert (ROOT/row['source']).is_file()
        for name in row['operationIds']:assert name in ops and set(ops[name]['x-roles'])&{'ANONYMOUS','STUDENT'}
    assert len([r for r in diff['operations'] if r['after']])==len(ops)==176
    removed=[r['operationId'] for r in diff['operations'] if r['change']=='REMOVED'];assert removed==['getOwnFinalGrade']
    step6=load(ROOT/'contracts/validation/step06_final/result.json')
    assert step6['candidateSha256']==digest and step6['allExpectedExits']
    for artifact in step6['evidenceArtifacts']:assert sha(a.verification/artifact['path'])==artifact['sha256']
    subprocess.run(['git','-C',str(ROOT),'diff','--check'],check=True)
    manifest=load(ROOT/'contracts/release-manifest.json')
    review=manifest['humanFinalReview']
    if review=='ACCEPTED':
        acceptance=manifest['humanFinalReviewRecord']
        assert acceptance['candidateSha256']==digest and acceptance['decision']=='ACCEPTED'
        assert acceptance['source']=='USER_MESSAGE_IN_CURRENT_CONVERSATION' and acceptance['verbatim']
    data={'status':'PASS','candidateSha256':digest,'casesUnchangedFromExecutedStep6':992,'studentPages':41,'acceptanceScenarios':28,'businessDecisions':12,'actualStep6EvidenceHashes':'PASS','studentOperationRoles':'PASS','cancelledDelegationNotRestored':'PASS','protocolNotRegeneratedOrModifiedThisStep':True,'humanFinalReview':review,'humanReviewSource':'contracts/release-manifest.json; recorded user decision, not granted by this check','github':manifest['github'],'step7':manifest['step7Status'],'checkedAtUTC':datetime.now(timezone.utc).isoformat()}
    a.output.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(data,ensure_ascii=False))

if __name__=='__main__':main()
