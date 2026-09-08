"""Report observed schema/union coverage, bound to the actual runtime case results."""
from collections import Counter
import json
from pathlib import Path

from contract_entry import require, write_json


def report_coverage(generated, reports, output):
    full = json.loads((generated / 'schema-input.json').read_text('utf-8'))
    extra = json.loads((generated / 'supplemental-input.json').read_text('utf-8'))
    spec = full['spec']
    runtime = []
    for file in ['full-schema.json', 'supplemental-schema.json']:
        result = json.loads((reports / file).read_text('utf-8'))
        require(result['candidateSha256'] == full['candidateSha256'], 'Coverage/result Contract mismatch')
        runtime += result['cases']
    cases = full['cases'] + extra['cases']
    require(len({r['name'] for r in cases}) == len(cases), 'Duplicate coverage case names')
    actual = {r['name']: r for r in runtime}
    require(set(actual) == {r['name'] for r in cases}, 'Coverage case names differ from executed cases')
    for row in cases:
        require(actual[row['name']]['passed'] and actual[row['name']]['expectedValid'] == row['expectedValid'],
                'Coverage cannot mark a failed or relabelled case as passed: ' + row['name'])
    unions = {}

    def discover(node, pointer):
        if isinstance(node, dict):
            if 'discriminator' in node:
                unions[pointer] = dict(property=node['discriminator']['propertyName'],
                    mapping=node['discriminator']['mapping'], legal={}, rejected=[])
            for key, child in node.items():
                discover(child, pointer + '/' + key)
        elif isinstance(node, list):
            for i, child in enumerate(node):
                discover(child, pointer + '/' + str(i))

    discover(spec['components']['schemas'], '#/components/schemas')
    visited_schemas = set()

    def resolve(pointer):
        node = spec
        for part in pointer.removeprefix('#/').split('/'):
            node = node[int(part)] if isinstance(node, list) else node[part]
        return node

    def walk(node, pointer, value, row, instance_path='$', depth=0):
        require(depth < 100, 'Unexpected recursive fixture depth')
        if '$ref' in node:
            return walk(resolve(node['$ref']), node['$ref'], value, row, instance_path, depth + 1)
        if pointer.startswith('#/components/schemas/') and len(pointer.split('/')) == 4:
            visited_schemas.add(pointer.rsplit('/', 1)[-1])
        if pointer in unions:
            group = unions[pointer]
            wire = value.get(group['property'], '<MISSING>') if isinstance(value, dict) else '<NOT_OBJECT>'
            evidence = dict(case=row['name'], instancePath=instance_path, wire=wire)
            if row['expectedValid']:
                require(isinstance(wire, str) and wire in group['mapping'], 'Unexpected legal discriminator')
                group['legal'].setdefault(wire, []).append(evidence)
            else:
                group['rejected'].append(evidence)
            if isinstance(wire, str) and wire in group['mapping']:
                target = group['mapping'][wire]
                walk(resolve(target), target, value, row, instance_path, depth + 1)
            return
        if isinstance(value, dict):
            for key, prop in node.get('properties', {}).items():
                if key in value:
                    walk(prop, pointer + '/properties/' + key, value[key], row, instance_path + '/' + key, depth + 1)
        if isinstance(value, list) and isinstance(node.get('items'), dict):
            for i, item in enumerate(value):
                walk(node['items'], pointer + '/items', item, row, instance_path + '/' + str(i), depth + 1)
        if value is not None:
            for kind in ['anyOf', 'allOf']:
                for i, child in enumerate(node.get(kind, [])):
                    if child.get('type') != 'null':
                        walk(child, pointer + '/' + kind + '/' + str(i), value, row, instance_path, depth + 1)

    for row in cases:
        pointer = '#/components/schemas/' + row['schema']
        walk(resolve(pointer), pointer, row['payload'], row)
    require(len(unions) == 6, 'The current RC must have six discriminator groups, including nested change')
    for pointer, group in unions.items():
        require(set(group['legal']) == set(group['mapping']), 'Untested legal union branches: ' + pointer)
        require(bool(group['rejected']), 'Missing rejection cases for union: ' + pointer)
    error_codes = set(spec['components']['schemas']['ErrorCode']['enum'])
    tested_codes = {r['payload'] for r in extra['cases'] if r['schema'] == 'ErrorCode' and r['expectedValid']}
    require(error_codes == tested_codes, 'ErrorCode legal value coverage incomplete')
    root_schemas = sorted({r['schema'] for r in cases})
    result = dict(candidateSha256=full['candidateSha256'], runtimeCases=len(cases),
        legalRoundtrips=sum(r['expectedValid'] for r in cases),
        expectedRejections=sum(not r['expectedValid'] for r in cases),
        publishedGroups=dict(Counter(r['name'].split('/')[0] for r in full['cases'])),
        supplementalCategories=dict(Counter(r['category'] for r in extra['cases'])),
        discriminatorGroups=unions, discriminatorGroupCount=len(unions),
        legalWireBranchCount=sum(len(g['mapping']) for g in unions.values()),
        errorCodesTested=len(tested_codes), rootSchemas=root_schemas,
        traversedSchemas=sorted(visited_schemas),
        schemasWithoutObservedTraversal=sorted(set(spec['components']['schemas']) - visited_schemas),
        limitations=['Schema traversal is not full value/path coverage of all 316 schemas.',
                     'No endpoint, Mapper, UI, device, Backend or Web execution claim.',
                     'Student privacy field checks do not prove natural-language message safety.'])
    write_json(output, result)
    return result
