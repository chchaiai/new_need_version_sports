import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { ReplayStore } from '../../../../shared/application/runtime.ts';
import type { SemesterFact } from '../public/semesters.ts';
export interface SemesterRecord extends SemesterFact {
    updatedAt: number;
}
export interface SemesterInput {
    academicYear: string;
    termType: 'FIRST' | 'SECOND' | 'SUMMER';
    displayName: string;
    startDate: string;
    endDate: string;
}
export interface SemesterManagementRepository extends ReplayStore {
    all(scope: TransactionScope, org: string): Promise<SemesterRecord[]>;
    currentWithoutLock(scope: TransactionScope, org: string): Promise<SemesterRecord | null>;
    lockCatalog(scope: TransactionScope, org: string): Promise<void>;
    lock(scope: TransactionScope, org: string, ids: readonly string[]): Promise<void>;
    save(scope: TransactionScope, org: string, id: string, input: SemesterInput, now: number): Promise<void>;
    update(scope: TransactionScope, id: string, input: SemesterInput, now: number): Promise<void>;
    switch(scope: TransactionScope, org: string, previous: string | null, target: string, actor: string, eventId: string, now: number): Promise<void>;
}
export interface SemesterIdentity {
    authenticate(token: string, scope: TransactionScope, purpose?: 'BUSINESS'): Promise<{
        subjectId: string;
        organizationId: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    }>;
    authorizeAdministration(token: string, scope: TransactionScope, permission: string | null, superOnly?: boolean): Promise<{
        subjectId: string;
        organizationId: string;
    }>;
}
export interface SemesterCourses {
    counts(scope: TransactionScope, org: string, ids: readonly string[]): Promise<{
        semesterId: string;
        courseCount: number;
        studentCount: number;
    }[]>;
    lockCourses(scope: TransactionScope, org: string, semesterId: string): Promise<readonly string[]>;
    assertSettled(scope: TransactionScope, org: string, semesterId: string, courseIds: readonly string[]): Promise<void>;
}
export interface SemesterAudit {
    append(scope: TransactionScope, event: {
        organizationId: string;
        actorSubjectId: string;
        action: string;
        resourceId: string;
        requestId: string;
    }): Promise<void>;
}
