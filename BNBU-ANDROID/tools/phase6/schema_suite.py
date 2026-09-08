"""Build full, hash-bound Android host-test inputs; never writes the Contract."""
import argparse
from collections import Counter
from copy import deepcopy
import json
from pathlib import Path

from contract_entry import FACTORIES, check_identity, require, sha, write_json


def prepare(repo, output):
    require(output.resolve() == (repo / 'BNBU-ANDROID/contract-validation/build/generated/phase6').resolve(),
            'Unexpected generated test input directory')
    lock = json.loads((repo / 'BNBU-ANDROID/contract-validation/contract-lock.json').read_text('utf-8'))
    spec = check_identity(repo / 'contracts/openapi.yaml', repo / 'contracts/contract-metadata.json', lock)
    fixture_path = repo / 'contracts/validation/step07_handoff/fixtures.json'
    require(sha(fixture_path) == lock['inputs']['contracts/validation/step07_handoff/fixtures.json'], 'Fixture bytes changed')
    published = json.loads(fixture_path.read_text('utf-8'))['cases']
    require(len(published) == 992 and sum(c['expectedValid'] for c in published) == 159, 'Published corpus changed')
    require(len({c['name'] for c in published}) == 992, 'Duplicate published case name')
    by_name = {c['name']: c for c in published}
    supplemental = []

    def mutate(name, base, path, value=None, valid=True, category='', omit=False):
        row = deepcopy(by_name[base])
        node = row['payload']
        for key in path[:-1]:
            node = node[key]
        if omit:
            del node[path[-1]]
        else:
            node[path[-1]] = value
        row.update(name='phase6/' + name, expectedValid=valid, category=category,
                   basis=dict(sourceCase=base, instancePath=path))
        supplemental.append(row)

    # Paired values exercise omission/null, empty collections and actual Kotlin scalar types.
    ordinary = 'prior-workflow/ordinary/valid'
    for label, value, valid in [('zero', 0, True), ('beyond_double_exact', 9007199254740993, True),
                               ('int64_max', 9223372036854775807, True), ('negative', -1, False),
                               ('int64_overflow', 9223372036854775808, False),
                               ('int64_wrap_to_positive', 18446744073709551617, False),
                               ('fraction', 1.25, False), ('boolean', True, False)]:
        mutate('integer/' + label, ordinary, ['expectedSessionVersion'], value, valid, 'numbers')
    mutate('array/empty_manifest', ordinary, ['items'], [], False, 'empty_array')
    dashboard = 'checks/wire/StudentDashboard'
    mutate('array/empty_permissions', dashboard, ['actor', 'adminPermissions'], [], True, 'empty_array')
    mutate('null/required_nullable', dashboard, ['course'], None, True, 'required_nullable')
    mutate('omission/required_nullable', dashboard, ['course'], valid=False, category='required_nullable', omit=True)
    invitation = 'prior-courses/invitation/default30'
    # Published default30 omits the optional lifetime; absence must remain absence.
    for value, valid in [(5, True), (120, True), (4, False), (121, False), (None, False)]:
        mutate('optional_default/' + str(value), invitation, ['lifetimeMinutes'], value, valid, 'optional_default')
    returning = 'prior-workflow/return/default24'
    for value, valid in [(24, True), (72, True), ('24', False), (None, False), (48, False)]:
        mutate('numeric_enum/' + type(value).__name__ + '/' + str(value), returning, ['windowHours'], value, valid, 'numeric_enum')
    record = 'prior-workflow/record/full_pending_response'
    for value, valid in [('2024-02-29', True), ('2025-02-29', False), ('2026-09-08T00:00:00Z', False)]:
        mutate('date/' + value, record, ['businessDate'], value, valid, 'calendar_date')
    for label, value, valid in [
        ('seconds', '2026-09-08T02:00:00Z', True),
        ('millis', '2026-09-08T02:00:00.123Z', True),
        ('micros', '2026-09-08T02:00:00.123456Z', True),
        ('nanos', '2026-09-08T02:00:00.123456789Z', True),
        ('one_fraction_digit', '2026-09-08T02:00:00.1Z', True),
        ('two_fraction_digits', '2026-09-08T02:00:00.12Z', True),
        ('four_fraction_digits', '2026-09-08T02:00:00.1234Z', True),
        ('seven_fraction_digits', '2026-09-08T02:00:00.1234567Z', True),
        ('ten_fraction_digits', '2026-09-08T02:00:00.1234567891Z', True),
        ('long_fraction', '2026-09-08T02:00:00.' + '1234567890' * 4 + 'Z', True),
        ('fraction_empty', '2026-09-08T02:00:00.Z', False),
        ('fraction_letters', '2026-09-08T02:00:00.123xZ', False),
        ('trailing_newline', '2026-09-08T02:00:00Z\n', False),
        ('hour24', '2026-09-08T24:00:00Z', False),
        ('second61', '2026-09-08T02:00:61Z', False),
        ('lowercase_forbidden_by_schema', '2026-09-08t02:00:00z', False),
        ('leap_second', '2016-12-31T23:59:60Z', True),
        ('invalid_leap_position', '2016-12-30T23:59:60Z', False),
        ('missing_zone', '2026-09-08T02:00:00', False),
        ('offset_not_Z', '2026-09-08T10:00:00+08:00', False),
        ('invalid_calendar', '2026-02-30T02:00:00Z', False),
    ]:
        mutate('instant/' + label, record, ['submittedAt'], value, valid, 'utc_instant')
    for field in ['finalGrade', 'remark', 'rank']:
        mutate('student_unknown/' + field, dashboard, [field], 'synthetic forbidden field', False, 'unknown_field')
    # ErrorCode values are exhaustive, including technical errors which must not become business success.
    for code in spec['components']['schemas']['ErrorCode']['enum']:
        supplemental.append(dict(name='phase6/error_code/' + code, schema='ErrorCode', payload=code,
                                 expectedValid=True, category='error_code', basis={'schema':'ErrorCode/enum'}))
    for label, value in [('unknown', 'NOT_A_DEFINED_ERROR'), ('wrong_case', 'invalid_request'),
                         ('null', None), ('number', 0)]:
        supplemental.append(dict(name='phase6/error_code/' + label, schema='ErrorCode', payload=value,
                                 expectedValid=False, category='error_code', basis={'schema':'ErrorCode/type+enum'}))
    error_base = dict(code='VERSION_CONFLICT', message='Synthetic protocol error', requestId='synthetic-request-1', details=None)
    for code in ['FORBIDDEN', 'TOKEN_EXPIRED', 'SYSTEM_MAINTENANCE', 'DEPENDENCY_UNAVAILABLE', 'FIRST_PASSWORD_CHANGE_REQUIRED']:
        supplemental.append(dict(name='phase6/error_envelope/' + code, schema='ErrorEnvelope',
            payload={**error_base, 'code': code}, expectedValid=True, category='error_envelope',
            basis={'schema':'ErrorEnvelope/properties'}))
    details = dict(fieldViolations=[], currentVersion=None, retryAfterSeconds=None, blockers=[])
    for label, change, valid in [('empty_arrays', {}, True), ('int32_max', {'retryAfterSeconds':2147483647}, True),
        ('int32_overflow', {'retryAfterSeconds':2147483648}, False), ('negative_retry', {'retryAfterSeconds':-1}, False),
        ('int64_overflow', {'currentVersion':9223372036854775808}, False), ('unknown_field', {'unknown':True}, False)]:
        supplemental.append(dict(name='phase6/error_details/' + label, schema='ErrorEnvelope',
            payload={**error_base, 'details':{**details, **change}}, expectedValid=valid, category='error_envelope',
            basis={'schema':'ErrorDetails/properties'}))
    missing_details = deepcopy(error_base)
    del missing_details['details']
    supplemental.append(dict(name='phase6/error_envelope/missing_required_details', schema='ErrorEnvelope',
        payload=missing_details, expectedValid=False, category='error_envelope', basis={'schema':'ErrorEnvelope/required'}))
    common = dict(candidateSha256=lock['sha256'], spec=spec, wrapperFactories=FACTORIES, synthetic=True)
    require(len({c['name'] for c in published + supplemental}) == len(published + supplemental),
            'Duplicate case names must be fixed before execution')
    write_json(output / 'schema-input.json', {**common, 'cases': published})
    write_json(output / 'supplemental-input.json', {**common, 'cases': supplemental})
    write_json(output / 'schema-plan.json', dict(contract=lock, publishedCases=len(published),
        publishedLegal=159, publishedNegative=833, supplementalCases=len(supplemental),
        supplementalLegal=sum(c['expectedValid'] for c in supplemental),
        categories=dict(Counter(c['category'] for c in supplemental)),
        publishedRootSchemas=sorted({c['schema'] for c in published}),
        scope='Android compiled models on host JVM; no Mapper/UI/device/Web/backend claim'))
    print(f'Prepared all {len(published)} published cases and {len(supplemental)} targeted cases.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.repo.resolve(), args.output.resolve())
