"""Prepare identical host/device Mock inputs from the pinned RC, never from old app APIs."""
import argparse
import json
from pathlib import Path
import shutil
from contract_entry import FACTORIES, check_identity, require, sha, write_json


def prepare(repo, output):
    module = repo / 'BNBU-ANDROID/contract-validation'
    require(output.resolve() == (module / 'build/generated/phase6').resolve(), 'Unexpected Mock output')
    lock = json.loads((module / 'contract-lock.json').read_text('utf8'))
    spec = check_identity(repo / 'contracts/openapi.yaml', repo / 'contracts/contract-metadata.json', lock)
    fixtures = repo / 'contracts/validation/p7_cr14/fixtures.json'
    require(sha(fixtures) == lock['inputs'][str(fixtures.relative_to(repo)).replace('\\', '/')], 'Fixture seal changed')

    def resolve(value):
        while '$ref' in value:
            node = spec
            for part in value['$ref'].removeprefix('#/').split('/'):
                node = node[part]
            value = node
        return value

    operations = {}
    for path, item in spec['paths'].items():
        for method, op in item.items():
            if not isinstance(op, dict) or 'operationId' not in op:
                continue
            responses = {}
            for status, response in op['responses'].items():
                schema = resolve(response).get('content', {}).get('application/json', {}).get('schema', {})
                if '$ref' in schema and str(status).isdigit():
                    responses[str(status)] = schema['$ref'].split('/')[-1]
            request = resolve(op['requestBody']).get('content', {}).get('application/json', {}).get('schema', {}) if 'requestBody' in op else {}
            operations[op['operationId']] = dict(id=op['operationId'], method=method.upper(), path=path,
                responses=responses, requestSchema=request.get('$ref', '').split('/')[-1] or None)
    source = module / 'src/test/java/Phase6FormatEvaluatorFactory.java'
    target = output / 'mock-device-support/Phase6FormatEvaluatorFactory.java'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    payload = dict(candidateSha256=lock['sha256'], spec=spec, wrapperFactories=FACTORIES,
        cases=json.loads(fixtures.read_text('utf8'))['cases'], operations=operations, synthetic=True)
    dest = output / 'mock-assets/phase6/mock-input.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    write_json(dest, payload)
    for name in ['schema-input.json', 'supplemental-input.json']:
        shutil.copyfile(output / name, dest.parent / name)
    write_json(output / 'mock-plan.json', dict(contractSha256=lock['sha256'], inputSha256=sha(dest),
        operationCount=len(operations), fixtureSha256=sha(fixtures), formatAdapterSha256=sha(source),
        transport='literal 127.0.0.1 MockWebServer only', deviceStatus='BUILD_ONLY_STEP5_EXECUTE_STEP6'))
    print('PASS: same pinned Contract, operation metadata and strict codec support for host/device Mock tests.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    prepare(a.repo.resolve(), a.output.resolve())
