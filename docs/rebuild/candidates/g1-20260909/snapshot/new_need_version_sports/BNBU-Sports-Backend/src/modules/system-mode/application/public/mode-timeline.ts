import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface MaintenancePeriod {
    startedAt: number;
    endedAt: number | null;
    startTransitionId: string;
    endTransitionId: string | null;
}
export interface ModeTimeline {
    organizationId: string;
    observedAt: number;
    modeVersion: number;
    policyVersion: number;
    currentMode: 'NORMAL' | 'MAINTENANCE';
    periods: MaintenancePeriod[];
}
/** Authoritative pause facts only. Consumers own deadlines and never alter exercise duration. */
export interface ModeTimelineAccess {
    maintenance(scope: TransactionScope, organizationId: string): Promise<ModeTimeline>;
}
