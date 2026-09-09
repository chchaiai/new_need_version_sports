import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface CourseRegistrationSessions {
    lockRegistrationOwner(scope: TransactionScope, organizationId: string, subjectId: string): Promise<void>;
    assertRegistrationSession(scope: TransactionScope, input: { subjectId: string; accessToken: string; refreshToken: string }): Promise<void>;
}
