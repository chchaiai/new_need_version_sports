"""Owner-accepted G1 CRs. Applied after the existing Phase5 registrars."""
from copy import deepcopy

from common import ref, object_schema, string_schema, nullable

QUERY_OPERATIONS = (
    'listSemesters', 'listOwnCourses', 'listCourseMakeupAuthorizations',
    'listOwnMakeupAuthorizations', 'listCourseInvitations', 'listCourseMembers',
    'listPublishedRuleTemplates', 'listSubAdmins', 'listTeacherAccounts',
    'listOwnStudentNotifications', 'listOwnNotifications', 'listSystemModeTransitions',
    'listStudentAccounts',
)
HISTORICAL_FIELDS = {
    'Enrollment': 'student', 'ExerciseRecord': 'student', 'StudentCourseProgress': 'student',
    'StudentApplication': 'student', 'FeedbackTicket': 'student', 'SettlementReportRow': 'student',
    'CourseChangeImpact': 'affectedStudents', 'AssessmentRosterRow': 'student',
}
REPLAY_POLICY = (
    'After authorization, replay the original committed business result without re-executing the command or '
    'recomputing facts, versions, checkpoints or minutes. The sole identity-display exception is that a confirmed '
    'deleted student is projected as DELETED_STUDENT and current-profile copies/email/linked roster display names '
    'are redacted under x-historical-students. This exception overrides exact response-byte replay for those '
    'identity fields only; it never restores credentials or deleted personal data.'
)
POLICY = {
    'decision': 'P7-Z-CR-HISTORICAL-STUDENT-01',
    'current': 'CURRENT_STUDENT means a current account exists, including PENDING; it does not mean active enrollment.',
    'deleted': 'Only authoritative confirmed deletion yields DELETED_STUDENT. Missing data or unavailable dependencies '
               'must fail using the operation error policy, never masquerade as deletion. Use one consistent identity snapshot per response.',
    'identity': 'Reuse the previously public opaque studentId. No internal database key, credentials, deletion time or current-profile PII.',
    'authorization': 'Historical identity grants no login, restoration or command permission. Existing actor, role, resource ownership and system-mode gates remain.',
    'currentOnly': ['StudentAccount.student', 'StudentDashboard.student'],
    'currentEndpointRule': 'Student-owned endpoints require a current authenticated student and return CURRENT_STUDENT in their nested references. No deleted-account dashboard or self-service access.',
    'enrollment': 'Account deletion does not change ACTIVE/REMOVED membership or remove a retained relationship, list item or historical count.',
    'roster': 'Linked DELETED_STUDENT display rows have null rosterName/rosterStudentNumber. A formerly MATCHED_VERIFIED_JOINED row becomes NOT_REGISTERED_OR_JOINED in the current reconciliation and is not counted complete. Retain the confirmed identity denominator and historical relationship. Existing OUTSIDE_ROSTER and unresolved-identity distinctions remain. Frozen reports/grades/checkpoints are not recalculated.',
    'originals': 'Retain immutable school roster originals and necessary business evidence under existing restricted access/retention rules. Never use these originals to repopulate a current profile. This CR does not authorize deleting user-authored historical business content.',
    'feedback': 'DELETED_STUDENT implies currentVerifiedEmail=null.',
    'copies': 'Historical reads, exports, stored response copies and caches must use the deletion-aware identity projection. Clear derived current-profile copies at deletion; enforce an authoritative read barrier so stale caches cannot disclose deleted profile data. Restore procedures must reapply deletion facts.',
    'replay': REPLAY_POLICY,
    'backendAcceptance': 'Real PostgreSQL/HTTP, authorization, Session/deletion concurrency, derived-copy cleanup and rollback atomicity require H/Z integrated evidence; schema/Mock tests do not prove these.',
}


def reaches(node, targets, schemas, seen=frozenset()):
    if isinstance(node, list):
        return any(reaches(x, targets, schemas, seen) for x in node)
    if not isinstance(node, dict):
        return False
    target = node.get('$ref', '').removeprefix('#/components/schemas/')
    if target in targets:
        return True
    if target in schemas and target not in seen and reaches(schemas[target], targets, schemas, seen | {target}):
        return True
    return any(reaches(v, targets, schemas, seen) for k, v in node.items() if k != '$ref')


def apply(spec):
    schemas = spec['components']['schemas']
    current = object_schema({'kind': string_schema(enum=['CURRENT_STUDENT']), 'student': ref('StudentSummary')},
                            ['kind', 'student'], description='Current account, including PENDING. Not enrollment state.')
    deleted = object_schema({'kind': string_schema(enum=['DELETED_STUDENT']), 'studentId': string_schema(fmt='uuid')},
                            ['kind', 'studentId'], description='Confirmed deleted account. Stable public opaque identity only; no current-profile personal data.')
    schemas.update(CurrentStudentReference=current, DeletedStudentReference=deleted,
                   StudentReference={'oneOf': [ref('CurrentStudentReference'), ref('DeletedStudentReference')],
                                     'discriminator': {'propertyName': 'kind', 'mapping': {
                                         'CURRENT_STUDENT': '#/components/schemas/CurrentStudentReference',
                                         'DELETED_STUDENT': '#/components/schemas/DeletedStudentReference'}}})
    for name, field in HISTORICAL_FIELDS.items():
        prop = schemas[name]['properties'][field]
        if name == 'CourseChangeImpact':
            assert prop['items'] == ref('StudentSummary')
            prop['items'] = ref('StudentReference')
        elif name == 'AssessmentRosterRow':
            schemas[name]['properties'][field] = nullable(ref('StudentReference'))
        else:
            assert prop == ref('StudentSummary'), (name, prop)
            schemas[name]['properties'][field] = ref('StudentReference')
    deleted_condition = {'properties': {'student': {'type': 'object', 'properties': {
        'kind': {'const': 'DELETED_STUDENT'}}, 'required': ['kind']}}, 'required': ['student']}
    for name, properties in {
        'FeedbackTicket': {'currentVerifiedEmail': {'type': 'null'}},
        'AssessmentRosterRow': {'rosterName': {'type': 'null'}, 'rosterStudentNumber': {'type': 'null'},
                               'registrationState': {'enum': ['NOT_REGISTERED_OR_JOINED', 'IDENTITY_UNRESOLVED', 'OUTSIDE_ROSTER']}},
    }.items():
        schemas[name].setdefault('allOf', []).append({'if': deepcopy(deleted_condition), 'then': {'properties': properties}})
    schemas['AssessmentRosterRow']['description'] += ' ' + POLICY['roster']
    operations = {op['operationId']: op for item in spec['paths'].values() for op in item.values()
                  if isinstance(op, dict) and 'operationId' in op}
    for name in QUERY_OPERATIONS:
        op = operations[name]
        assert '400' in op['responses'] and 'INVALID_REQUEST' not in op['x-error-codes'], name
        op['x-error-codes'].append('INVALID_REQUEST')
        op['x-query-serialization'] = {
            'scalarOccurrences': 'AT_MOST_ONE_AFTER_PARAMETER_NAME_DECODING',
            'invalidSyntaxError': 'INVALID_REQUEST',
            'invalidSyntaxStatus': 400,
            'limit': {'decodedPattern': '^[0-9]+$', 'minimum': 1, 'maximum': 100, 'omittedDefault': 20,
                      'leadingZeros': 'ALLOWED_NORMALIZED_TO_INTEGER',
                      'rejectedForms': ['exponent', 'decimal point', 'sign', 'whitespace', 'empty', 'non-ASCII digits']},
            'scope': 'Declared scalar query parameters only. Values are decoded once; reject duplicate decoded names before selection/coercion. Existing enum/boolean/string constraints remain. Invalid opaque cursor content keeps INVALID_CURSOR; duplicate cursor is INVALID_REQUEST.',
        }
        for parameter in op.get('parameters', []):
            if parameter.get('in') != 'query':
                continue
            parameter['description'] = parameter.get('description', '') + ' At most one occurrence of this decoded scalar query name; duplicates return HTTP 400 / INVALID_REQUEST.'
            if parameter['name'] == 'limit':
                parameter['description'] += ' Decoded value must consist only of ASCII decimal digits, numeric value 1–100; leading zeros allowed, omission defaults to 20. No exponent, decimal point, sign or whitespace.'
    for op in operations.values():
        if reaches(op.get('responses', {}), set(HISTORICAL_FIELDS), schemas):
            op['x-historical-student-projection'] = 'x-historical-students'
            op['description'] += ' Historical student identities follow x-historical-students; current student endpoints remain current-only.'
            if 'x-idempotency' in op:
                op['description'] += ' ' + REPLAY_POLICY
                if isinstance(op['x-idempotency'], dict):
                    op['x-idempotency']['historicalIdentityException'] = REPLAY_POLICY
    spec['x-historical-students'] = POLICY
    spec['x-public-conventions']['idempotency'] += ' ' + REPLAY_POLICY
    spec['components']['parameters']['IdempotencyKey']['description'] += ' Historical student identity display follows the scoped deletion-aware exception in x-historical-students.'
    spec['x-contract-governance']['acceptedPhase7ChangeRequests'] = [
        'P7-Z-CR-HISTORICAL-STUDENT-01', 'P7-Z-CR-QUERY-ERRORS-01']
    spec['x-contract-governance']['phase7Compatibility'] = {
        'previousVersion': '1.3.0-contract',
        'previousOpenapiSha256': '5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed',
        'breaking': True, 'publicBasePath': '/api/v1',
        'consumerPolicy': 'Regenerate Android contract-validation and Web validation consumers; H/Z adapt before G1 joint acceptance. Legacy Android :app/runtime migration stays in Phase8. No old/new response mixing or restoration of deleted PII on rollback.',
    }
