"""Actual-candidate validation with two schema engines and separately labelled models."""
import argparse,hashlib,json
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry
from referencing.jsonschema import DRAFT202012
from check_teaching import integrity_errors,mutation_results,student_graph
from fixtures import build
from model_cases import run as models


def main():
    p=argparse.ArgumentParser();p.add_argument('--spec',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False);raw=a.spec.read_bytes();spec=yaml.safe_load(raw);sha=hashlib.sha256(raw).hexdigest()
    registry=Registry().with_resource('urn:bnbu:teaching',DRAFT202012.create_resource(spec));results=[];cases=build(spec)
    for row in cases:
        v=Draft202012Validator({'$ref':'urn:bnbu:teaching#/components/schemas/'+row['schema']},registry=registry,format_checker=FormatChecker())
        issues=list(v.iter_errors(row['payload']));results.append({'name':row['name'],'passed':(not issues)==row['expectedValid'],'expectedValid':row['expectedValid'],'actualValid':not issues,'issues':[{'path':'/'.join(map(str,e.absolute_path)),'message':e.message} for e in issues[:3]]})
    errors=integrity_errors(spec);mutation=mutation_results(spec);model=models(spec['x-teaching-workflow'])
    report={'candidateSha256':sha,'schemaCases':len(results),'schemaPassed':sum(r['passed'] for r in results),'integrityErrors':errors,'studentReachableSchemas':student_graph(spec)[0],
        'mutationCount':len(mutation),'mutationsRejected':sum(r['rejected'] for r in mutation),'finiteModelCases':len(model),'finiteModelPassed':sum(r['passed'] for r in model),
        'schemaResults':results,'mutations':mutation,'finiteModels':model,'scope':'Synthetic Contract schema and finite design models only. No DB/auth/OCR accuracy/upload/cache/notification delivery/real media/Backend or E2E execution.'}
    (a.output/'python-result.json').write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode())
    (a.output/'runtime-input.json').write_bytes((json.dumps({'candidateSha256':sha,'spec':spec,'cases':cases},ensure_ascii=False)+'\n').encode())
    print(json.dumps({k:v for k,v in report.items() if k not in ['schemaResults','mutations','finiteModels','studentReachableSchemas']},ensure_ascii=False))
    failures=[r for r in results if not r['passed']]+[r for r in model if not r['passed']]+[r for r in mutation if not r['rejected']]
    if errors or failures:raise SystemExit(json.dumps({'errors':errors,'failures':failures},ensure_ascii=False))

if __name__=='__main__':main()
