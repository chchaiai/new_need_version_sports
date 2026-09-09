import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface Announcement {
    titleZh: string;
    titleEn: string;
    bodyZh: string;
    bodyEn: string;
    estimatedRecoveryAt: string;
}
export interface ModeState {
    mode: 'NORMAL' | 'MAINTENANCE';
    policyVersion: number;
    announcement: Announcement | null;
    updatedAt: number;
    version: number;
}
export interface ModeAccess {
    read(scope: TransactionScope, organizationId: string): Promise<ModeState>;
    assertAllowed(scope: TransactionScope, organizationId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN', action: 'BUSINESS' | 'PASSWORD_CHANGE' | 'SECURITY_READ' | 'LOGOUT'): Promise<void>;
}
