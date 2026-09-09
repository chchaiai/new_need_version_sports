import { Failure } from '../application/runtime.ts';
import { TransactionUnavailableError } from '../application/transactions/transaction-runner.ts';
export interface G1ErrorPolicy {
    operationId: string;
    errorCodes: readonly string[];
    httpStatuses: readonly number[];
}
/** These common failure semantics are independent of localized exception messages. */
export const G1_ERROR_STATUS: Readonly<Record<string, number>> = Object.freeze({
    INVALID_REQUEST: 400, AUTHENTICATION_REQUIRED: 401, INVALID_CREDENTIALS: 401, TOKEN_EXPIRED: 401,
    FORBIDDEN: 403, ACCOUNT_DISABLED: 403, FIRST_PASSWORD_CHANGE_REQUIRED: 403, RESOURCE_NOT_FOUND: 404,
    SYSTEM_MAINTENANCE: 503, DEPENDENCY_UNAVAILABLE: 503, VERSION_CONFLICT: 412,
    IDEMPOTENCY_KEY_REUSED: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500,
    ENROLLMENT_NOT_ACTIVE: 409, COURSE_NOT_OPEN: 409, COURSE_NOT_PUBLISHED: 409,
    SEMESTER_NOT_CURRENT: 409, CHECKIN_WINDOW_CLOSED: 409, MAKEUP_NOT_ALLOWED: 409
});
const aliases: Readonly<Record<string, readonly string[]>> = Object.freeze({
    INVALID_CREDENTIALS: ['AUTHENTICATION_REQUIRED'], TOKEN_EXPIRED: ['AUTHENTICATION_REQUIRED'],
    SYSTEM_MAINTENANCE: ['FORBIDDEN'],
    ACCOUNT_DISABLED: ['FORBIDDEN'], FIRST_PASSWORD_CHANGE_REQUIRED: ['FORBIDDEN'],
    SEMESTER_NOT_CURRENT: ['COURSE_NOT_OPEN', 'FORBIDDEN'],
    COURSE_NOT_OPEN: ['FORBIDDEN'], COURSE_NOT_PUBLISHED: ['FORBIDDEN'], ENROLLMENT_NOT_ACTIVE: ['FORBIDDEN']
});
/** Bootstrap supplies the exact operation policy from the frozen OpenAPI, never client input. */
export function mapG1Failure(error: unknown, policy: G1ErrorPolicy): {
    code: string;
    status: number;
} {
    const failure = error instanceof TransactionUnavailableError ? new Failure('DEPENDENCY_UNAVAILABLE', 503) : error;
    if (!(failure instanceof Failure))
        return { code: 'INTERNAL_ERROR', status: 500 };
    const candidates = [failure.code, ...(aliases[failure.code] ?? [])];
    if (failure.code === 'RESOURCE_NOT_FOUND' && policy.operationId === 'startExerciseSession')
        candidates.push('COURSE_NOT_OPEN');
    const code = candidates.find(c => policy.errorCodes.includes(c));
    if (!code)
        return { code: 'INTERNAL_ERROR', status: 500 };
    const status = G1_ERROR_STATUS[code] ?? failure.status;
    if (!Number.isInteger(status) || !policy.httpStatuses.includes(status))
        return { code: 'INTERNAL_ERROR', status: 500 };
    return { code, status };
}
