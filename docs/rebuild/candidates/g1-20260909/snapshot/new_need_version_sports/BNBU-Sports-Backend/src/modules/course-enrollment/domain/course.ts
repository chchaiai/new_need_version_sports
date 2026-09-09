import { ensure } from '../../../shared/domain/failure.ts';
export interface Interval {
    startsAt: number;
    endsAtExclusive: number;
}
export interface Rule {
    templateVersionId: string;
    courseRelatedTargetMinutes: number;
    otherTargetMinutes: number;
    thresholdMinutes: 30 | 45 | 60;
    weeklyCountLimit: 2 | 3 | 4;
    allowedIntervals: Interval[];
    regularCutoffAt: number;
    plannedSettlementAt: number;
}
export interface Template {
    templateVersionId: string;
    versionNo: number;
    label: {
        zh: string;
        en: string;
    };
    publishedAt: number;
}
export interface PublishedRule extends Rule {
    ruleVersionId: string;
    courseId: string;
    semesterId: string;
    versionNo: number;
    template: Template;
    closeoutEndsAt: number;
    reminderScheduledAt: number;
    publishedAt: number;
}
export interface Course {
    id: string;
    organizationId: string;
    semesterId: string;
    responsibleTeacherSubjectId: string;
    teacherName: string;
    name: string;
    description: string | null;
    status: 'DRAFT' | 'OPEN' | 'CLOSED';
    joinOpen: boolean;
    rule: Rule;
    published: PublishedRule | null;
    version: number;
    targetRevision: number;
    updatedAt: number;
    closedAt: number | null;
}
export interface Enrollment {
    id: string;
    organizationId: string;
    semesterId: string;
    courseId: string;
    studentSubjectId: string;
    status: 'ACTIVE' | 'REMOVED';
    joinedAt: number;
    removedAt: number | null;
    studentVisibleReason: string | null;
    version: number;
}
export interface Invitation {
    id: string;
    courseId: string;
    codeDigest: string;
    displaySuffix: string;
    revoked: boolean;
    expiresAt: number;
    createdAt: number;
    version: number;
}
export interface InvitationFlow {
    id: string;
    invitationId: string;
    subject: string;
    authorizationDigest: string | null;
    studentSubjectId: string | null;
    registeredAt: number;
    originalExpiresAt: number;
    graceEndsAt: number;
    status: 'REGISTERED' | 'COMPLETED' | 'TERMINATED';
    version: number;
}
export function validateRule(rule: Rule, semesterStart: number, semesterEndExclusive: number) {
    ensure(Number.isSafeInteger(rule.courseRelatedTargetMinutes) && Number.isSafeInteger(rule.otherTargetMinutes) && rule.courseRelatedTargetMinutes >= 0 && rule.otherTargetMinutes >= 0 && rule.courseRelatedTargetMinutes + rule.otherTargetMinutes === 1200, 'COURSE_TARGET_TOTAL_INVALID', 422);
    ensure([30, 45, 60].includes(rule.thresholdMinutes) && [2, 3, 4].includes(rule.weeklyCountLimit), 'VALIDATION_FAILED', 422);
    ensure(rule.allowedIntervals.length > 0, 'VALIDATION_FAILED', 422);
    let previous = semesterStart;
    for (const interval of rule.allowedIntervals) {
        ensure(Number.isFinite(interval.startsAt) && Number.isFinite(interval.endsAtExclusive) && interval.startsAt >= previous && interval.endsAtExclusive > interval.startsAt && interval.endsAtExclusive <= rule.regularCutoffAt, 'VALIDATION_FAILED', 422);
        previous = interval.endsAtExclusive;
    }
    ensure(rule.regularCutoffAt + 7 * 86400000 <= rule.plannedSettlementAt && rule.plannedSettlementAt <= semesterEndExclusive, 'VALIDATION_FAILED', 422);
}
export function assertOwner(course: Course, actor: {
    subjectId: string;
    organizationId: string;
    role: string;
}) {
    ensure(actor.organizationId === course.organizationId && actor.role === 'TEACHER' && actor.subjectId === course.responsibleTeacherSubjectId, 'FORBIDDEN', 403);
}
export function assertNewAdmission(course: Course, semesterStatus: string) {
    ensure(semesterStatus === 'CURRENT', 'SEMESTER_NOT_CURRENT');
    ensure(course.status === 'OPEN', 'COURSE_NOT_OPEN');
    ensure(course.joinOpen, 'INVITATION_FLOW_TERMINATED');
}
export function assertFlow(flow: InvitationFlow, invitation: Invitation, course: Course, semesterStatus: string, now: number) {
    ensure(flow.invitationId === invitation.id, 'INVITATION_FLOW_MISMATCH', 403);
    ensure(!invitation.revoked && course.status === 'OPEN' && course.joinOpen && semesterStatus === 'CURRENT' && flow.status !== 'TERMINATED', 'INVITATION_FLOW_TERMINATED');
    ensure(flow.registeredAt < flow.originalExpiresAt && flow.originalExpiresAt === invitation.expiresAt && flow.graceEndsAt === invitation.expiresAt + 600000, 'INVITATION_FLOW_MISMATCH', 403);
    ensure(now < flow.graceEndsAt, 'INVITATION_FLOW_EXPIRED', 422);
}
