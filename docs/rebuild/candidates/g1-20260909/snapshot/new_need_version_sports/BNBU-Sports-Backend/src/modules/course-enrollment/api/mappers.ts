import type { components } from '../../../shared/api/contract.generated.ts';
import { instant } from '../../../shared/api/route-kit.ts';
import type { Rule, Course, Template, Semester, StudentFact, CourseService } from '../application/course-service.ts';
type S = components['schemas'];
export function ruleCommand(r: S['CourseRuleConfiguration']): Rule {
    return { templateVersionId: r.templateVersionId, courseRelatedTargetMinutes: r.courseRelatedTargetMinutes, otherTargetMinutes: r.otherTargetMinutes,
        thresholdMinutes: r.thresholdMinutes ?? 30, weeklyCountLimit: r.weeklyCountLimit ?? 3, allowedIntervals: r.allowedIntervals.map(i => ({ startsAt: new Date(i.startsAt).getTime(), endsAtExclusive: new Date(i.endsAtExclusive).getTime() })), regularCutoffAt: new Date(r.regularCutoffAt).getTime(), plannedSettlementAt: new Date(r.plannedSettlementAt).getTime() };
}
function ruleWire(r: Rule): S['CourseRuleConfiguration'] { return { ...r, allowedIntervals: r.allowedIntervals.map(i => ({ startsAt: instant(i.startsAt), endsAtExclusive: instant(i.endsAtExclusive) })), regularCutoffAt: instant(r.regularCutoffAt), plannedSettlementAt: instant(r.plannedSettlementAt) }; }
export function semesterWire(s: Semester): S['SemesterSummary'] { return { semesterId: s.id, academicYear: s.academicYear, termType: s.termType, displayName: s.displayName, startDate: s.startDate, endDate: s.endDate, status: s.status }; }
function templateWire(t: Template): S['RuleTemplateVersion'] { return { templateVersionId: t.templateVersionId, versionNo: t.versionNo, label: t.label, status: 'PUBLISHED', totalTargetMinutes: 1200, thresholdChoices: [30, 45, 60], defaultThresholdMinutes: 30, singleRecordCapMinutes: 60, dailyCountLimit: 1, weeklyCountChoices: [2, 3, 4], defaultWeeklyCountLimit: 3, formulaVersion: 'P4Z-A-08-v1', publishedAt: instant(t.publishedAt) }; }
export function courseSummary(c: Course, s: Semester): S['InvitationCourseSummary'] { return { courseId: c.id, name: c.name, semester: semesterWire(s), responsibleTeacher: { teacherId: c.responsibleTeacherSubjectId, name: c.teacherName } }; }
export function courseWire(v: Awaited<ReturnType<CourseService['get']>>, now: number): S['Course'] {
    const c = v.course, p = c.published;
    const { templateVersionId: _draftTemplate, ...publishedParameters } = ruleWire(c.rule);
    return { courseId: c.id, semester: semesterWire(v.semester), name: c.name, description: c.description, responsibleTeacher: { teacherId: c.responsibleTeacherSubjectId, name: c.teacherName },
        checkinOpensAt: instant(c.rule.allowedIntervals[0]!.startsAt), checkinClosesAt: instant(c.rule.regularCutoffAt), status: c.status,
        displayStatus: c.status === 'OPEN' ? (now < c.rule.allowedIntervals[0]!.startsAt ? 'UPCOMING' : 'ACTIVE') : null, joinOpen: c.joinOpen,
        targets: { courseRelatedTargetMinutes: c.rule.courseRelatedTargetMinutes, otherTargetMinutes: c.rule.otherTargetMinutes, totalTargetMinutes: 1200, revisionNumber: c.targetRevision },
        activeMemberCount: v.members.filter(e => e.status === 'ACTIVE').length, removedMemberCount: v.members.filter(e => e.status === 'REMOVED').length, version: c.version, updatedAt: instant(c.updatedAt),
        draftRule: c.status === 'DRAFT' ? ruleWire(c.rule) : null, publishedRule: p ? { ...publishedParameters, thresholdMinutes: p.thresholdMinutes, weeklyCountLimit: p.weeklyCountLimit, ruleVersionId: p.ruleVersionId, courseId: p.courseId, semesterId: p.semesterId, versionNo: p.versionNo, template: templateWire(p.template), closeoutEndsAt: instant(p.closeoutEndsAt), reminderScheduledAt: instant(p.reminderScheduledAt), publishedAt: instant(p.publishedAt) } : null, closedAt: c.closedAt === null ? null : instant(c.closedAt) };
}
export function studentWire(s: StudentFact & {
    studentStatus: 'ACTIVE' | 'PENDING';
}): S['StudentSummary'] { return { studentId: s.subjectId, studentNumber: s.studentNumber, name: s.name, gender: s.gender, gradeYear: s.gradeYear, college: s.college, major: s.major, administrativeClass: s.administrativeClass, studentStatus: s.studentStatus }; }
export function enrollmentWire(e: Awaited<ReturnType<CourseService['join']>>): S['Enrollment'] { return { enrollmentId: e.id, courseId: e.courseId, student: studentWire(e.student), status: e.status, joinedAt: instant(e.joinedAt), removedAt: e.removedAt === null ? null : instant(e.removedAt), studentVisibleReason: e.studentVisibleReason, version: e.version }; }
export function invitationWire(i: Awaited<ReturnType<CourseService['createInvitation']>>['invitation']): S['CourseInvitation'] { return { invitationId: i.id, courseId: i.courseId, displaySuffix: i.displaySuffix, status: i.status, revocable: i.revocable, expiresAt: instant(i.expiresAt), createdAt: instant(i.createdAt), version: i.version }; }
export function flowWire(f: Awaited<ReturnType<CourseService['registerExisting']>>): S['InvitationRegistrationFlow'] { return { flowId: f.id, registeredAt: instant(f.registeredAt), originalExpiresAt: instant(f.originalExpiresAt), graceEndsAt: instant(f.graceEndsAt), status: f.status, course: courseSummary(f.course.course, f.course.semester), version: f.version }; }
