import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface CourseFacts {
    courseId: string;
    organizationId: string;
    semesterId: string;
    responsibleTeacherSubjectId: string;
    status: 'DRAFT' | 'OPEN' | 'CLOSED';
    closedAt: number | null;
    version: number;
    ruleVersionId: string | null;
    thresholdMinutes: 30 | 45 | 60;
    weeklyCountLimit: 2 | 3 | 4;
    regularCutoffAt: number;
    closeoutEndsAt: number;
    allowedIntervals: {
        startsAt: number;
        endsAtExclusive: number;
    }[];
}
export interface CourseAccess {
    facts(scope: TransactionScope, organizationId: string, courseId: string): Promise<CourseFacts>;
    member(scope: TransactionScope, organizationId: string, courseId: string, studentSubjectId: string): Promise<{
        enrollmentId: string;
        status: 'ACTIVE' | 'REMOVED';
        version: number;
    }>;
    /** Checks new Session admission; H must separately enforce one active Session and actual mode/identity. */
    assertSessionStart(scope: TransactionScope, organizationId: string, courseId: string, studentSubjectId: string, now: number): Promise<CourseFacts>;
    /** Only lifecycle fact; H validates provenance and original deadlines on its own legitimate object. */
    assertExistingChain(scope: TransactionScope, organizationId: string, courseId: string, serverAcceptedAt: number): Promise<CourseFacts>;
}
