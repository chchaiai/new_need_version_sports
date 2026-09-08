"""Read-only check of sealed local candidate. Publication is a separate human gate."""
import argparse
import hashlib
import json
from pathlib import Path
import yaml


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path): return json.loads(path.read_text(encoding='utf-8'))


def main():
    p=argparse.ArgumentParser();p.add_argument('--require-published',action='store_true');a=p.parse_args()
    root=Path(__file__).resolve().parents[2];repo=root.parent
    manifest=load(root/'release-manifest.json');metadata=load(root/'contract-metadata.json')
    result=load(Path(__file__).parent/'result.json');disposition=load(Path(__file__).parent/'disposition.json')
    spec=yaml.safe_load((root/'openapi.yaml').read_bytes());digest=sha(root/'openapi.yaml')
    assert digest==metadata['openapiSha256']==manifest['openapiSha256']==result['candidateSha256']==disposition['candidateSha256']
    assert metadata['contractVersion']==manifest['version']==disposition['candidateVersion']=='1.3.0-contract'
    assert metadata['contractStatus']==manifest['status']==disposition['candidateStatus']=='RC'
    assert manifest['breaking'] is True and metadata['publicBasePath']==manifest['publicBasePath']=='/api/v1'
    for section in ['artifacts','generationAndValidationInputs','authorityInputs']:
        for row in manifest[section]:
            path=(repo/row['path']).resolve();assert path.is_relative_to(repo.resolve()),row['path']
            assert sha(path)==row['sha256'],row['path']
    assert result['allExpectedExits'] and result['rcReadiness']=='PASS'
    assert all(c['exitCode']==c['expectedExit']==0 for c in result['commands'])
    assert result['runtime']['passed']==result['runtime']['total']==992
    assert result['runtime']['roundtrips']==result['allStepTypeScriptLegalFixtures']==159
    assert not disposition['blockingBusinessDecisions']
    assert {x['gap'] for x in disposition['gaps']}=={f'GAP-H{i:02}' for i in range(1,22)}
    operations={o['operationId']:(method.upper(),path,o.get('x-error-codes',[])) for path,item in spec['paths'].items() for method,o in item.items() if isinstance(o,dict) and 'operationId' in o}
    for row in disposition['gaps']:
        for name in row['schemas']:assert name in spec['components']['schemas'],name
        for op in row['operations']:assert operations[op['operationId']]==(op['method'],op['path'],op['errors'])
    for cr in manifest['implementedChangeRequests']:
        assert cr['id'] in spec['x-contract-governance']['acceptedPhase5ChangeRequests']
        assert (repo/cr['path']).is_file()
    if a.require_published:
        assert manifest['sourceCommit'] and len(manifest['sourceCommit'])==40,'Candidate is uncommitted; Step7 publication gate remains closed'
        assert manifest['humanFinalReview']=='ACCEPTED','Human final review has not occurred'
        assert all(d['recipient'] for d in manifest['distribution']),'Named consumer recipients are not confirmed'
    print('PASS: local RC bytes, source/input hashes, same-SHA results and 21 gap references agree. Publication remains a separate Step7 gate.')


if __name__=='__main__':main()
