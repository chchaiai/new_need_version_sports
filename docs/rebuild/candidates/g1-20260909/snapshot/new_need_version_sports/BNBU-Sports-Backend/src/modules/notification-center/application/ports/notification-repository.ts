import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { ReplayStore } from '../../../../shared/application/runtime.ts';
export interface Notice {
    id: string;
    organizationId: string;
    recipientSubjectId: string;
    notificationType: string;
    title: string;
    body: string;
    targetRoute: string;
    targetId: string | null;
    createdAt: number;
    readAt: number | null;
}
export interface NotificationRepository extends ReplayStore {
    list(scope: TransactionScope, organizationId: string, recipient: string): Promise<Notice[]>;
    get(scope: TransactionScope, organizationId: string, recipient: string, id: string, lock: boolean): Promise<Notice | null>;
    mark(scope: TransactionScope, organizationId: string, recipient: string, id: string, now: number): Promise<void>;
}
