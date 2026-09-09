import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
/** Registration receipts contain credentials; consumers must recheck their live session before returning them. */
export interface RegistrationSessionAccess {
    lockRegistrationOwner(scope: TransactionScope, organizationId: string, subjectId: string): Promise<void>;
    assertRegistrationSession(scope: TransactionScope, input: { subjectId: string; accessToken: string; refreshToken: string }): Promise<void>;
}
