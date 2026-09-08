"""Read-only structural contract gates. Runtime facts/transactions are not simulated here."""
from copy import deepcopy

PREFIX = '#/components/schemas/'
GROUPS = {
    'SubmitExerciseRecordRequest': ('submissionRoute', {
        'ORDINARY': 'SubmitOrdinaryExerciseRecordRequest', 'SWIMMING_TIMELY': 'SubmitSwimmingExerciseRecordRequest',
        'SWIMMING_OFFLINE': 'SubmitOfflineSwimmingExerciseRecordRequest'}),
    'AppendRecordReviewRequest': ('action', {
        'PASS': 'PassExerciseRecordRequest', 'RETURN_SUPPLEMENT': 'ReturnExerciseRecordRequest', 'INVALID': 'InvalidateExerciseRecordRequest'}),
    'CorrectExerciseRecordReviewRequest': ('result', {
        'VALID': 'CorrectExerciseRecordValidRequest', 'INVALID': 'CorrectExerciseRecordInvalidRequest'}),
}
SIX = {'UNCLEAR_EVIDENCE', 'MISSING_REQUIRED_EVIDENCE', 'EVIDENCE_SESSION_MISMATCH', 'INCONSISTENT_EVIDENCE',
       'AUTHENTICITY_REQUIRES_CLARIFICATION', 'CONFIRMED_REUSE_OR_MISUSE'}


def integrity_errors(spec):
    errors = []
    def check(condition, why):
        if not condition: errors.append(why)
    schemas = spec.get('components', {}).get('schemas', {})
    for name, (field, mapping) in GROUPS.items():
        parent = schemas.get(name, {})
        check(parent.get('discriminator') == {'propertyName': field, 'mapping': {k: PREFIX+v for k,v in mapping.items()}}, name+': exact wire mapping')
        check(parent.get('oneOf') == [{'$ref': PREFIX+v} for v in mapping.values()], name+': exact branch set/order')
        for wire, branch in mapping.items():
            node = schemas.get(branch, {})
            check(node.get('properties', {}).get(field) == {'type': 'string', 'const': wire}, branch+': literal')
            check(field in node.get('required', []) and node.get('additionalProperties') is False, branch+': required discriminator/closed shape')
    reasons = spec.get('x-review-reasons', {})
    check(set(reasons) == SIX, 'Exactly six teacher reasons, system expiry is separate')
    check(schemas.get('ReturnExerciseRecordRequest', {}).get('properties', {}).get('reasonCode', {}).get('enum') == [c for c in reasons if c != 'CONFIRMED_REUSE_OR_MISUSE'], 'Return reason applicability')
    check(schemas.get('InvalidateExerciseRecordRequest', {}).get('properties', {}).get('reasonCode', {}).get('enum') == [c for c in reasons if c != 'AUTHENTICITY_REQUIRES_CLARIFICATION'], 'Invalid reason applicability')
    p = spec.get('x-record-workflow', {})
    check(p.get('firstAcceptance', {}).get('ordinarySeconds') == 86400 and p.get('firstAcceptance', {}).get('comparison') == 'STRICTLY_BEFORE', 'P02 first boundary')
    check(p.get('lockedTransfer', {}).get('seconds') == 1800 and p.get('lockedTransfer', {}).get('comparison') == 'STRICTLY_BEFORE', 'P02 transfer boundary')
    check(p.get('historicalChain', {}).get('firstReceiptRequiredForProtection') is False, 'P02 preserve pre-receipt legal chain')
    check(p.get('historicalChain', {}).get('newStartAllowed') is False, 'Historical chain is not new activity permission')
    check(p.get('supplement', {}).get('normalMaterialVersions') == [1,2] and p.get('supplement', {}).get('returnLimit') == 1, 'One normal return / two versions')
    check(p.get('supplement', {}).get('budgetHours') == [24,72] and p.get('supplement', {}).get('aiMayDecideRound2') is False, 'Supplement budget/teacher final authority')
    check(p.get('teacherSla', {}).get('budgetSeconds') == 172800 and p.get('teacherSla', {}).get('timezone') == 'Asia/Shanghai', 'P03 school-time budget')
    check(p.get('teacherSla', {}).get('onMissingCoverage') == 'UNAVAILABLE', 'P03 no calendar fallback')
    check(p.get('pause', {}).get('combination') == 'INTERVAL_UNION' and p.get('pause', {}).get('personalOfflineIncluded') is False, 'Pause overlap/offline distinction')
    check(p.get('expiryCorrection', {}).get('grantFullWindow') is False and p.get('expiryCorrection', {}).get('resetReturnUsed') is False, 'P04 no new full window/return')
    check(p.get('expiryCorrection', {}).get('preserveLegalSuccessors') is True and p.get('expiryCorrection', {}).get('publicAdminMutation') is False, 'P04 successor/authority protection')
    check(p.get('expiryCorrection', {}).get('resumeAt') == 'ACTUAL_ENTRY_RESTORATION', 'P04 erroneous lock exclusion')
    operations = {op['operationId']: op for item in spec['paths'].values() for method,op in item.items() if method in {'get','post','put','patch','delete'}}
    for name in ['submitExerciseRecord','completeExerciseRecordMaterial','submitExerciseRecordSupplement','renewRecordUploadAuthorization']:
        op=operations.get(name,{})
        check(op.get('x-roles') == ['STUDENT'] and op.get('x-resource-scope') == 'SELF_ORIGINAL_SESSION_RECORD', name+': historical self scope')
        check(op.get('x-system-mode-replay') == 'AUTHORIZED_COMMITTED_RESULT_ONLY', name+': committed replay scope')
        check(op.get('x-idempotency',{}).get('evaluationOrder',[])[:2] == ['AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE','EXACT_COMMITTED_RECEIPT'], name+': auth before replay before new eligibility')
    for name in ['appendExerciseRecordReview','correctExerciseRecordReview','listTeacherReviewQueue']:
        check(operations.get(name,{}).get('x-roles') == ['TEACHER'], name+': teacher-only scope')
    check('DAILY_RECORD_ALREADY_EXISTS' not in spec.get('x-error-catalog',{}), 'One-record/day rejection retired; counting is separate')
    check('creditedMinutes' not in schemas['ExerciseRecord']['properties'], 'No obsolete automatic credited minute field')
    # Traverse only this step's student/public projection graph; global Phase5 privacy scan is step5.
    visited=set()
    banned={'score','grade','rank','ranking','remark','internalNote','hiddenNote','prompt','apiKey','providerResponse','storageKey'}
    def visit(value):
        if isinstance(value,dict):
            target=value.get('$ref','')
            if target.startswith(PREFIX) and target not in visited:
                visited.add(target); visit(schemas[target[len(PREFIX):]])
            check(not banned.intersection(value.get('properties',{})), 'Sensitive field in step3 student projection')
            for v in value.values(): visit(v)
        elif isinstance(value,list):
            for v in value: visit(v)
    for root in ['ExerciseRecord','FirstMaterialAcceptance','SupplementAcceptanceReceipt','RecordReview','ReviewNotificationContext']:
        visit({'$ref':PREFIX+root})
    return errors


def mutation_results(spec):
    rows=[]
    changes=[('first_equal_allowed',('firstAcceptance','comparison'),'BEFORE_OR_EQUAL'),
             ('pre_receipt_chain_lost',('historicalChain','firstReceiptRequiredForProtection'),True),
             ('new_start_restored',('historicalChain','newStartAllowed'),True),
             ('sla_wall_clock',('teacherSla','budgetSeconds'),48),
             ('missing_calendar_guess',('teacherSla','onMissingCoverage'),'WEEKDAY_FALLBACK'),
             ('double_pause',('pause','combination'),'SUM'),
             ('offline_compensated',('pause','personalOfflineIncluded'),True),
             ('second_return',('supplement','returnLimit'),2),
             ('ai_overwrites_round2',('supplement','aiMayDecideRound2'),True),
             ('full_window_restored',('expiryCorrection','grantFullWindow'),True),
             ('overwrite_successor',('expiryCorrection','preserveLegalSuccessors'),False),
             ('restart_too_early',('expiryCorrection','resumeAt'),'INCIDENT_END')]
    for label,(a,b),value in changes:
        altered=deepcopy(spec); altered['x-record-workflow'][a][b]=value
        rows.append({'name':label,'rejected':bool(integrity_errors(altered))})
    for name,(field,mapping) in GROUPS.items():
        for wire in mapping:
            altered=deepcopy(spec); altered['components']['schemas'][name]['discriminator']['mapping'].pop(wire)
            rows.append({'name':name+'/'+wire+'/missing_mapping','rejected':bool(integrity_errors(altered))})
    altered=deepcopy(spec); altered['components']['schemas']['ExerciseRecord']['properties']['remark']={'type':'string'}
    rows.append({'name':'student_hidden_remark','rejected':bool(integrity_errors(altered))})
    return rows
