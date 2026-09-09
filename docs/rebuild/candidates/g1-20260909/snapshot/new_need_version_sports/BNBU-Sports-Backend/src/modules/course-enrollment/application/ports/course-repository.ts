import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { ReplayStore } from '../../../../shared/application/runtime.ts';
import type { Course, Template, Enrollment, Invitation, InvitationFlow } from '../../domain/course.ts';
import type { PlanResult } from '../../domain/publication-plan.ts';
export interface PlanEvidence extends PlanResult {
    id: string;
    courseId: string;
    draftVersion: number;
    semesterVersion: number;
    calendarVersion: string;
    templateId: string;
    tokenDigest: string | null;
    computedAt: number;
}
export interface Impact {
    tokenDigest: string;
    courseId: string;
    actorSubjectId: string;
    expectedVersion: number;
    name: string;
    description: string | null;
    expiresAt: number;
    membershipDigest: string;
}
export interface Makeup {
    id: string;
    courseId: string;
    enrollmentId: string;
    ruleVersionId: string;
    startsAt: number;
    endsAtExclusive: number;
    authorizedAt: number;
    actorSubjectId: string;
}
export interface CourseRepository extends ReplayStore {
    activeStudentSubjects(scope: TransactionScope, organizationId: string, semesterId: string, subjects: readonly string[]): Promise<string[]>;
    publishedTemplates(scope: TransactionScope, org: string): Promise<Template[]>;
    publishTemplate(scope: TransactionScope, org: string, t: Template): Promise<void>;
    semesterCounts(scope: TransactionScope, org: string, ids: readonly string[]): Promise<{
        semesterId: string;
        courseCount: number;
        studentCount: number;
    }[]>;
    semesterCourses(scope: TransactionScope, org: string, id: string, lock: boolean): Promise<Course[]>;
    eraseIdentityReplays(scope: TransactionScope, organizationId: string, subjectId: string): Promise<void>;
    saveClosure(scope: TransactionScope, courseId: string, actor: string, reason: string, now: number): Promise<void>;
    exactMakeup(scope: TransactionScope, id: string, courseId: string, enrollmentId: string, ruleVersionId: string): Promise<Makeup | null>;
    saveMakeup(scope: TransactionScope, value: Makeup): Promise<void>;
    makeups(scope: TransactionScope, courseId: string, enrollmentId: string | null): Promise<Makeup[]>;
    course(scope: TransactionScope, org: string, id: string, lock?: boolean): Promise<Course | null>;
    courses(scope: TransactionScope, org: string, teacher: string): Promise<Course[]>;
    saveCourse(scope: TransactionScope, course: Course, actor: string, revisionId: string): Promise<void>;
    updateCourse(scope: TransactionScope, course: Course, actor: string, revisionId: string | null): Promise<void>;
    template(scope: TransactionScope, org: string, id: string): Promise<Template | null>;
    invitationCourseId(scope: TransactionScope, digest: string): Promise<string | null>;
    invitation(scope: TransactionScope, digest: string): Promise<Invitation | null>;
    invitationById(scope: TransactionScope, id: string, courseId: string): Promise<Invitation | null>;
    hasUnfinishedFlow(scope: TransactionScope, invitationId: string, now: number): Promise<boolean>;
    invitations(scope: TransactionScope, courseId: string): Promise<Invitation[]>;
    saveInvitation(scope: TransactionScope, value: Invitation): Promise<void>;
    revokeInvitation(scope: TransactionScope, id: string): Promise<void>;
    terminateFlows(scope: TransactionScope, courseId: string): Promise<void>;
    flow(scope: TransactionScope, id: string, lock?: boolean): Promise<InvitationFlow | null>;
    existingFlow(scope: TransactionScope, invitationId: string, subject: string): Promise<InvitationFlow | null>;
    saveFlow(scope: TransactionScope, value: InvitationFlow): Promise<void>;
    completeFlow(scope: TransactionScope, id: string, subjectId: string): Promise<void>;
    enrollments(scope: TransactionScope, courseId: string): Promise<Enrollment[]>;
    activeEnrollment(scope: TransactionScope, org: string, semesterId: string, subjectId: string): Promise<Enrollment | null>;
    saveEnrollment(scope: TransactionScope, value: Enrollment, eventId: string, actor: string, now: number): Promise<void>;
    updateEnrollment(scope: TransactionScope, value: Enrollment, eventId: string, actor: string, now: number): Promise<void>;
    savePlan(scope: TransactionScope, plan: PlanEvidence): Promise<void>;
    plan(scope: TransactionScope, digest: string): Promise<PlanEvidence | null>;
    saveImpact(scope: TransactionScope, value: Impact): Promise<void>;
    impact(scope: TransactionScope, digest: string): Promise<Impact | null>;
    hasMakeup(scope: TransactionScope, courseId: string, enrollmentId: string, now: number): Promise<boolean>;
}
