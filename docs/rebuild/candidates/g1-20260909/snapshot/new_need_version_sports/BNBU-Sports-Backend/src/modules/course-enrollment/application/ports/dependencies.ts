import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { PlanCatalog } from '../../domain/publication-plan.ts';
import type { Rule } from '../../domain/course.ts';
export interface CourseActor {
    subjectId: string;
    organizationId: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    sessionId: string;
    accountVersion: number;
    mustChangePassword: boolean;
}
export interface StudentFact {
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
export interface RegistrationInput {
    name: string;
    studentNumber: string;
    gender: 'FEMALE' | 'MALE';
    gradeYear: number;
    college: string | null;
    major: string | null;
    administrativeClass: string | null;
    verifiedEmail: string;
    emailOtpProof: {
        challengeId: string;
        code: string;
    };
}
export interface RegistrationTokens {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
    actor: {
        userId: string;
        organizationId: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
        displayName: string;
        verifiedEmail: string;
        accountState: 'ACTIVE' | 'DISABLED';
        adminKind: 'SUPER' | 'SUB' | null;
        adminPermissions: string[];
        mustChangePassword: boolean;
        version: number;
    };
}
export interface CourseIdentity {
    registrationAttempt(challengeId: string): Promise<void>;
    registerStudent(scope: TransactionScope, input: RegistrationInput, command: {
        key: string;
        requestId: string;
    }): Promise<RegistrationTokens>;
    authenticate(token: string, scope: TransactionScope, purpose?: 'BUSINESS' | 'AUTHENTICATION_ONLY'): Promise<CourseActor>;
    student(subjectId: string, organizationId: string, scope: TransactionScope): Promise<StudentFact>;
    teacher(subjectId: string, organizationId: string, scope: TransactionScope): Promise<{
        subjectId: string;
        name: string;
    }>;
}
export interface Semester {
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
export interface CourseSemesters {
    current(scope: TransactionScope, organizationId: string): Promise<Semester | null>;
    get(scope: TransactionScope, organizationId: string, semesterId: string): Promise<Semester>;
}
export interface CourseCalendar {
    catalog(scope: TransactionScope, semester: Semester, rule: Rule, notBefore: number): Promise<PlanCatalog>;
}
export interface CourseAudit {
    append(scope: TransactionScope, event: {
        organizationId: string;
        actorSubjectId: string;
        action: string;
        resourceId: string;
        requestId: string;
    }): Promise<void>;
}
export interface CourseNotifications {
    membership(scope: TransactionScope, event: {
        organizationId: string;
        recipientSubjectId: string;
        eventId: string;
        courseId: string;
        state: 'ACTIVE' | 'REMOVED';
    }): Promise<void>;
}
