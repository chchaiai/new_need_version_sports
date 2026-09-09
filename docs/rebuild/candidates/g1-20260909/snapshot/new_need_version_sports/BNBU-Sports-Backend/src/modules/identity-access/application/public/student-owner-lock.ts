import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
/** Internal serialization, not authorization. Authenticate the live actor first in this same scope. */
export interface StudentOwnerLock {
    /** Locks the persistent student subject even when no exercise Session exists; held until caller commit/rollback. */
    lockStudentOwner(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
}
