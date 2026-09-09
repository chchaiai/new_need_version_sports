import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { Account } from '../../domain/account.ts';
export interface IdentityAudit {
    append(scope: TransactionScope, event: {
        organizationId: string;
        actorSubjectId: string;
        action: string;
        resourceId: string;
        requestId: string;
    }): Promise<void>;
}
export interface IdentityMode {
    assertAllowed(scope: TransactionScope, organizationId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN', action: 'BUSINESS' | 'PASSWORD_CHANGE' | 'SECURITY_READ' | 'LOGOUT'): Promise<void>;
}
export interface PermissionFacts {
    permissions(scope: TransactionScope, account: Account): Promise<string[]>;
}
export interface OtpDelivery {
    send(email: string, code: string, purpose: string): Promise<void>;
}
