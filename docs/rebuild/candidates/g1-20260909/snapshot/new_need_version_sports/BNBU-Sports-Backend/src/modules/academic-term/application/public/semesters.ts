import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface SemesterFact {
    id: string;
    organizationId: string;
    academicYear: string;
    termType: 'FIRST' | 'SECOND' | 'SUMMER';
    displayName: string;
    startDate: string;
    endDate: string;
    status: 'UPCOMING' | 'CURRENT' | 'ARCHIVED';
    version: number;
}
export interface SemesterAccess {
    current(scope: TransactionScope, organizationId: string): Promise<SemesterFact | null>;
    get(scope: TransactionScope, organizationId: string, semesterId: string): Promise<SemesterFact>;
}
