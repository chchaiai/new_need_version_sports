"""Reproducible schema/annotation/time-boundary checks against the supplied actual OpenAPI."""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry
from referencing.jsonschema import DRAFT202012
from check_workflow import integrity_errors, mutation_results
from fixtures import build
from timing_cases import run as timing_run


def main():
    p=argparse.ArgumentParser();p.add_argument('--spec',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args();args.output.mkdir(parents=True,exist_ok=False)
    data=args.spec.read_bytes();spec=yaml.safe_load(data);sha=hashlib.sha256(data).hexdigest()
    errors=integrity_errors(spec)
    cases=build(); registry=Registry().with_resource('urn:bnbu:workflow',DRAFT202012.create_resource(spec))
    results=[]
    for row in cases:
        validator=Draft202012Validator({'$ref':'urn:bnbu:workflow#/components/schemas/'+row['schema']},registry=registry,format_checker=FormatChecker())
        issues=list(validator.iter_errors(row['payload']))
        results.append({'name':row['name'],'schema':row['schema'],'passed':bool(issues) is not row['expectedValid'],
                        'expectedValid':row['expectedValid'],'actualValid':not issues,
                        'issues':[{'path':'/'.join(map(str,e.absolute_path)),'message':e.message} for e in issues[:3]]})
    mutations=mutation_results(spec); timing=timing_run(spec['x-record-workflow'])
    report={'candidateSha256':sha,'schemaCases':len(results),'schemaPassed':sum(r['passed'] for r in results),
            'integrityErrors':errors,'mutationCount':len(mutations),'mutationsRejected':sum(r['rejected'] for r in mutations),
            'timingModelCases':len(timing),'timingModelPassed':sum(r['passed'] for r in timing),
            'scope':'Contract schema/annotations and finite calculator only; synthetic calendar, no Backend/transaction/media/authorization runtime',
            'schemaResults':results,'mutations':mutations,'timingModel':timing}
    (args.output/'python-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (args.output/'runtime-input.json').write_text(json.dumps({'candidateSha256':sha,'spec':spec,'cases':cases},ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['schemaResults','mutations','timingModel']},ensure_ascii=False))
    failures=[r['name'] for r in results if not r['passed']]+[r['name'] for r in mutations if not r['rejected']]+[r['name'] for r in timing if not r['passed']]
    if errors or failures: raise SystemExit('FAILED: '+str(errors+failures))

if __name__=='__main__': main()
