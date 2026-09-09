import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface ActorContext {
    subjectId: string;
    organizationId: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    sessionId: string;
    accountVersion: number;
    mustChangePassword: boolean;
}
export interface IdentityAccess {
    /** Revalidates the live account/session and holds locks in the caller's transaction. */
    authenticate(accessToken: string, scope: TransactionScope, purpose?: 'BUSINESS' | 'PASSWORD_CHANGE' | 'SECURITY_READ' | 'LOGOUT' | 'AUTHENTICATION_ONLY'): Promise<ActorContext>;
    student(subjectId: string, organizationId: string, scope: TransactionScope): Promise<StudentIdentity>;
    teacher(subjectId: string, organizationId: string, scope: TransactionScope): Promise<{
        subjectId: string;
        name: string;
    }>;
}
export interface StudentIdentity {
    subjectId: string;
    organizationId: string;
    studentNumber: string;
    name: string;
    gender: 'FEMALE' | 'MALE';
    gradeYear: number;
    college: string | null;
    major: string | null;
    administrativeClass: string | null;
}
