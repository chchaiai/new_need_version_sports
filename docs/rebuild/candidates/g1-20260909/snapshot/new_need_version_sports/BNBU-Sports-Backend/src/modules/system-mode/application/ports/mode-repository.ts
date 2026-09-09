import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { ReplayStore } from '../../../../shared/application/runtime.ts';
import type { Announcement, ModeState } from '../public/system-mode.ts';
export interface Transition {
    id: string;
    sequence: number;
    from: 'NORMAL' | 'MAINTENANCE';
    to: 'NORMAL' | 'MAINTENANCE';
    reason: string;
    announcement: Announcement | null;
    actorSubjectId: string;
    occurredAt: number;
}
export interface ModeRepository extends ReplayStore {
    read(scope: TransactionScope, organizationId: string): Promise<ModeState | null>;
    lock(scope: TransactionScope, organizationId: string): Promise<ModeState | null>;
    transitions(scope: TransactionScope, organizationId: string): Promise<Transition[]>;
    change(scope: TransactionScope, organizationId: string, state: ModeState, transition: Transition): Promise<void>;
}
