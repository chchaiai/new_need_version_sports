import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
/** Structurally mapped by bootstrap to Z v1.3 StudentOwnerLock, never private SQL. */
export interface SessionStudentOwnerLock {
  lockStudentOwner(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
}
