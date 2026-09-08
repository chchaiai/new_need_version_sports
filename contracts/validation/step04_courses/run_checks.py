"""Check actual candidate schema, structural invariants and bounded design models."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry
from referencing.jsonschema import DRAFT202012
from check_courses import integrity_errors, mutation_results
from fixtures import build
from model_cases import run as models


def main():
    p=argparse.ArgumentParser();p.add_argument('--spec',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False);data=a.spec.read_bytes();spec=yaml.safe_load(data);sha=hashlib.sha256(data).hexdigest()
    identity=json.loads(Path(__file__).with_name('reference-identity.json').read_text(encoding='utf-8'))
    reference=Path(__file__).with_name('accepted_selection_reference.py').read_bytes()
    source=(Path(__file__).resolve().parents[3]/identity['source']).read_bytes()
    assert hashlib.sha256(source).hexdigest()==identity['sourceSha256'],'Accepted design input changed'
    assert hashlib.sha256(reference).hexdigest()==identity['extractedUtf8Sha256'],'Reference bytes changed'
    block=next(b for b in re.findall(r'```python[^\r\n]*\r?\n(.*?)```',source.decode('utf-8'),re.S) if 'def select_credit(' in b)
    assert block.encode('utf-8')==reference,'Reference must be the unchanged accepted A-08 code'
    errors=integrity_errors(spec);cases=build();registry=Registry().with_resource('urn:bnbu:course',DRAFT202012.create_resource(spec));results=[]
    for row in cases:
        v=Draft202012Validator({'$ref':'urn:bnbu:course#/components/schemas/'+row['schema']},registry=registry,format_checker=FormatChecker())
        issues=list(v.iter_errors(row['payload']));results.append({'name':row['name'],'expectedValid':row['expectedValid'],'actualValid':not issues,
            'passed':(not issues)==row['expectedValid'],'issues':[{'path':'/'.join(map(str,e.absolute_path)),'message':e.message} for e in issues[:3]]})
    mutation=mutation_results(spec);model=models(spec['x-course-workflow'])
    report={'candidateSha256':sha,'schemaCases':len(results),'schemaPassed':sum(r['passed'] for r in results),'integrityErrors':errors,
        'mutationCount':len(mutation),'mutationsRejected':sum(r['rejected'] for r in mutation),'finiteModelCases':len(model),'finiteModelPassed':sum(r['passed'] for r in model),
        'schemaResults':results,'mutations':mutation,'finiteModels':model,'scope':'Synthetic schema/finite models only. Trusted Owner identity/source/lock inputs; no Backend, actual calendar, DB concurrency, OTP, upload or E2E execution.'}
    (a.output/'python-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (a.output/'runtime-input.json').write_text(json.dumps({'candidateSha256':sha,'spec':spec,'cases':cases},ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['schemaResults','mutations','finiteModels']},ensure_ascii=False))
    failures=[r['name'] for r in results if not r['passed']]+[r['name'] for r in model if not r['passed']]+[r['name'] for r in mutation if not r['rejected']]
    if errors or failures:raise SystemExit('FAILED: '+str(errors+failures))

if __name__=='__main__':main()
