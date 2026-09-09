import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface ModeNoticeWriter {
    modeChanged(scope: TransactionScope, event: {
        organizationId: string;
        eventId: string;
        recipientSubjectIds: string[];
        mode: 'NORMAL' | 'MAINTENANCE';
    }): Promise<void>;
}
