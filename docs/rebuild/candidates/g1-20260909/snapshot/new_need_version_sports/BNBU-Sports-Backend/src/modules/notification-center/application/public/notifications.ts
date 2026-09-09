import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface MembershipNotice {
    organizationId: string;
    recipientSubjectId: string;
    eventId: string;
    courseId: string;
    state: 'ACTIVE' | 'REMOVED';
}
export interface NotificationWriter {
    membership(scope: TransactionScope, event: MembershipNotice): Promise<void>;
}
