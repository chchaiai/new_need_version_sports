import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { CourseFacts } from './courses.ts';
export interface SessionStartInput {
    accessToken: string;
    courseId: string;
    expectedRuleVersionId: string;
    /** Required: null selects ordinary admission; a UUID selects that exact grant. */
    makeupAuthorizationId: string | null;
}
export interface SessionAdmission {
    organizationId: string;
    studentSubjectId: string;
    course: CourseFacts & {
        ruleVersionId: string;
    };
    enrollmentId: string;
    enrollmentVersion: number;
    admittedAt: number;
    makeupAuthorization: {
        authorizationId: string;
        courseId: string;
        enrollmentId: string;
        ruleVersionId: string;
        startsAt: number;
        endsAtExclusive: number;
        authorizedAt: number;
    } | null;
}
export interface SessionAdmissionAccess {
    /** Same caller transaction as H's session insert; time and actor are server-owned. */
    authorizeSessionStart(scope: TransactionScope, input: SessionStartInput): Promise<SessionAdmission>;
}
