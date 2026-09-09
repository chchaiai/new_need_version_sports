import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
/** Narrow consumer capability connected to Identity only by Bootstrap. */
export interface CourseStudentOwnerLock {
    lockStudentOwner(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
}
