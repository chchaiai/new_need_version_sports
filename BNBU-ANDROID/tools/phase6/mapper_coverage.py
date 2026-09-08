"""Tie passing mapper cases to affected student page families, without claiming rendered UI coverage."""
import json
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

from contract_entry import require, sha, write_json


GROUPS = {
    'startup': (['mode/', 'session/', 'account/'], ['001']),
    'maintenance': (['mode/', 'supplement/', 'sla/'], ['002']),
    'otp_account': (['otp/', 'account/', 'error/'], ['005', '006', '009', '024', '080', '081', '082', '083']),
    'course': (['course/'], ['010', '021']),
    'home_progress': (['home/', 'progress/'], ['020', '023']),
    'session': (['session/', 'error/'], ['022', '040']),
    'notification': (['notification/'], ['025']),
    'invitation': (['invitation/'], ['030', '031', '032', '033', '034', '035']),
    'media': (['media/'], ['041']),
    'first_material': (['first_material/'], ['042', '043']),
    'records': (['record/', 'reason/', 'time/', 'date/'], ['050', '051']),
    'endurance': (['endurance/'], ['052']),
    'supplement': (['supplement/', 'sla/', 'reason/'], ['060', '061']),
    'applications': (['application/', 'certification/'], ['070']),
    'help': (['help/'], ['084']),
    'feedback': (['feedback/'], ['085']),
    'release': (['release/'], ['086']),
}


def report_mapper(repo: Path, result: dict, junit: Path, destination: Path):
    trace_path = repo / 'contracts/validation/step07_handoff/traceability.json'
    trace = json.loads(trace_path.read_text('utf-8'))
    require(trace['candidateSha256'] == result['candidateSha256'], 'Mapper traceability SHA mismatch')
    cases = result['cases']
    names = {row['name'] for row in cases}
    require(len(names) == result['planned'] == result['executed'] == result['passed'], 'Mapper report incomplete')
    require(all(row['status'] == 'PASS' for row in cases), 'Mapper case failure')
    tree = ET.parse(junit / 'TEST-Phase6MapperTest.xml').getroot()
    require(int(tree.get('tests')) == len(names) and
            all(int(tree.get(k, '0')) == 0 for k in ['failures', 'errors', 'skipped']), 'Mapper JUnit mismatch')
    for row in tree.findall('testcase'):
        name = row.get('name', '')
        require(name.startswith('wireThroughMapperToPresentation[') and name.endswith(']'), 'Unexpected JUnit case format')
    actual_names = {r.get('name')[len('wireThroughMapperToPresentation['):-1] for r in tree.findall('testcase')}
    require(actual_names == names, 'Mapper case set differs from actual JUnit')
    anchors = ['progress/1199_percent100_is_not_target_met', 'home/CACHED_checkpoint_is_not_current',
        'home/ARCHIVED_checkpoint_is_not_current', 'first_material/ORDINARY_equal',
        'first_material/locked_equal_deadline', 'supplement/confirmed_fault_uses_current_remainder_not_new_window',
        'sla/missing_calendar_server_projection_only', 'sla/overdue_does_not_invalidate_student_record',
        'notification/null_route_no_text_inference', 'mode/estimated_recovery_keeps_maintenance_closed',
        'wire/unknown_state_and_forbidden_student_fields_rejected_before_mapping']
    require(set(anchors) <= names, 'Required business-boundary mapper checks missing')
    pages = []
    group_cases = {g: sorted(n for n in names if any(n.startswith(prefix) for prefix in prefixes))
                   for g, (prefixes, _) in GROUPS.items()}
    require(all(group_cases.values()), 'Unverified mapper family')
    for page in trace['studentPages']:
        groups = [g for g, (_, ids) in GROUPS.items() if page['page'].split('-')[-1] in ids]
        if page['operationIds']:
            require(groups, 'Unassigned affected page: ' + page['page'])
        else:
            require(not groups, 'Local-only page incorrectly assigned protocol implementation')
        pages.append(dict(page=page['page'], title=page['title'], operationIds=page['operationIds'],
            groups=groups, status='MAPPER_FAMILY_TESTED_UI_NOT_RUN' if groups else 'NO_NEW_API_LOCAL_OR_SCHOOL_PROCESS',
            note='Family cases verify data semantics, not every operation, permission race, command or rendered page.'))
    value = dict(contractSha256=result['candidateSha256'], sourceTraceabilitySha256=sha(trace_path),
        planned=result['planned'], passed=result['passed'], junitCaseSet='EXACT_MATCH',
        distinctCasesByPrefix=dict(sorted(Counter(n.split('/')[0] for n in names).items())),
        requiredBoundaryCases=anchors, groupCases=group_cases, studentPages=pages,
        decodedRootSchemas=result['decodedSchemas'],
        renderedPageTests=0, mockTransportTests=0, deviceTests=0,
        boundaries=['Independent validation module, app runtime not migrated',
            'Host-only strict schema boundary is not yet an Android device codec',
            'canAttempt flags never authorize server writes; fresh owned response and server recheck required',
            'No real student data, backend, media service, Web or 6C acceptance',
            'Student notification regex is defense in depth; server template safety and Phase7/9 checks remain required'])
    write_json(destination, value)
    return value
