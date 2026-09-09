import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface ModeIdentity {
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
export interface ModeAudit {
    append(scope: TransactionScope, event: {
        organizationId: string;
        actorSubjectId: string;
        action: string;
        resourceId: string;
        requestId: string;
    }): Promise<void>;
}
export interface ModeNotifications {
    modeChanged(scope: TransactionScope, event: {
        organizationId: string;
        eventId: string;
        recipientSubjectIds: string[];
        mode: 'NORMAL' | 'MAINTENANCE';
    }): Promise<void>;
}
