import { test, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readContract } from '../../../src/bootstrap/contract-input.mjs';
import { Failure } from '../../../src/shared/domain/failure.ts';
import { TransactionUnavailableError } from '../../../src/shared/application/transactions/transaction-runner.ts';
import { mapG1Failure, type G1ErrorPolicy } from '../../../src/shared/api/g1-error-policy.ts';
const document = readContract().document;
const policies: G1ErrorPolicy[] = Object.values(document.paths).flatMap(p => Object.values(p as Record<string, any>).filter(o => o?.operationId).map(o => ({ operationId: o.operationId, errorCodes: o['x-error-codes'], httpStatuses: Object.keys(o.responses).map(Number).filter(Number.isInteger) })));
const policy = (operationId: string) => policies.find(p => p.operationId === operationId)!;
const cases: [
    string,
    string,
    number,
    string,
    number
][] = [
    ['startExerciseSession', 'INVALID_CREDENTIALS', 401, 'AUTHENTICATION_REQUIRED', 401],
    ['startExerciseSession', 'TOKEN_EXPIRED', 401, 'AUTHENTICATION_REQUIRED', 401],
    ['startExerciseSession', 'ACCOUNT_DISABLED', 403, 'FORBIDDEN', 403],
    ['startExerciseSession', 'FIRST_PASSWORD_CHANGE_REQUIRED', 403, 'FORBIDDEN', 403],
    ['getExerciseSession', 'FIRST_PASSWORD_CHANGE_REQUIRED', 403, 'FIRST_PASSWORD_CHANGE_REQUIRED', 403],
    ['startExerciseSession', 'SEMESTER_NOT_CURRENT', 409, 'COURSE_NOT_OPEN', 409],
    ['startExerciseSession', 'RESOURCE_NOT_FOUND', 404, 'COURSE_NOT_OPEN', 409],
    ['allocateMediaAsset', 'COURSE_NOT_OPEN', 409, 'FORBIDDEN', 403],
    ['startExerciseSession', 'MAKEUP_NOT_ALLOWED', 409, 'MAKEUP_NOT_ALLOWED', 409],
    ['startExerciseSession', 'SYSTEM_MAINTENANCE', 503, 'SYSTEM_MAINTENANCE', 503],
    ['changeOwnPassword', 'SYSTEM_MAINTENANCE', 503, 'FORBIDDEN', 403],
    ['startExerciseSession', 'VERSION_CONFLICT', 409, 'VERSION_CONFLICT', 412],
    ['completeExerciseSession', 'IDEMPOTENCY_KEY_REUSED', 409, 'IDEMPOTENCY_KEY_REUSED', 409]
];
for (const [operation, source, status, code, http] of cases)
    test(operation + ' maps ' + source + ' by code and frozen Contract', () => {
        const error = new Failure(source, status);
        error.message = 'localized text and secret must never select an error';
        expect(mapG1Failure(error, policy(operation))).toEqual({ code, status: http });
        expect(policy(operation).errorCodes).toContain(code);
        expect(policy(operation).httpStatuses).toContain(http);
    });
test('unknown exceptions and undeclared failure pairs stay internal while unavailable transactions return 503', () => {
    const p = policy('startExerciseSession');
    expect(mapG1Failure(new Error('password=secret; database SQL'), p)).toEqual({ code: 'INTERNAL_ERROR', status: 500 });
    expect(mapG1Failure({ code: 'VERSION_CONFLICT', status: 412 }, p)).toEqual({ code: 'INTERNAL_ERROR', status: 500 });
    expect(mapG1Failure(new Failure('UNDECLARED', 409), p)).toEqual({ code: 'INTERNAL_ERROR', status: 500 });
    expect(mapG1Failure(new TransactionUnavailableError(), p)).toEqual({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
});
test('all 176 operation mappings remain declared; emit a common failure policy matrix for H', () => {
    expect(policies).toHaveLength(176);
    const matrix = policies.map(p => ({ operationId: p.operationId, commonFailures: cases.filter(([o]) => o === 'startExerciseSession').map(([, source, status]) => ({ source, ...mapG1Failure(new Failure(source, status), p) })) }));
    for (const entry of matrix)
        for (const mapped of entry.commonFailures) {
            expect(policy(entry.operationId).errorCodes).toContain(mapped.code);
            expect(policy(entry.operationId).httpStatuses).toContain(mapped.status);
        }
    mkdirSync('evidence/phase7/G1-Z', { recursive: true });
    writeFileSync('evidence/phase7/G1-Z/common-error-policy.json', JSON.stringify({ contractSha256: readContract().canonicalSha256, kind: 'ERROR_POLICY_NOT_ENDPOINT_IMPLEMENTATION', matrix }, null, 2) + '\n');
});
