import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface AccountClosureFacts {
    /** Same transaction and StudentOwnerLock. Active/paused throws shared ACCOUNT_DELETION_BLOCKED/409; failures propagate. */
    studentSessions?: {
        assertNoActive(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
    };
    adminResponsibilities?: {
        count(scope: TransactionScope, organizationId: string, adminSubjectId: string): Promise<number>;
    };
}
export interface AccountPersonalDataCleanup {
    erase(scope: TransactionScope, organizationId: string, subjectId: string): Promise<void>;
}
