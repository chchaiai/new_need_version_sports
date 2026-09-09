import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
/** Small identity-owned support for the system-mode composition. */
export interface ModeGovernanceIdentity {
    authorizeMode(scope: TransactionScope, token: string): Promise<{
        subjectId: string;
        organizationId: string;
    }>;
    person(scope: TransactionScope, organizationId: string, subjectId: string): Promise<{
        userId: string;
        displayName: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    }>;
    affectedRecipients(scope: TransactionScope, organizationId: string): Promise<string[]>;
}
