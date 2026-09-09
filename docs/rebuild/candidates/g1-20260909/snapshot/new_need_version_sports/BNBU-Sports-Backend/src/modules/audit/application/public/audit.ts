import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface AuditEvent {
    organizationId: string;
    actorSubjectId: string;
    action: string;
    resourceId: string;
    requestId: string;
}
export interface AuditWriter {
    append(scope: TransactionScope, event: AuditEvent): Promise<void>;
}
