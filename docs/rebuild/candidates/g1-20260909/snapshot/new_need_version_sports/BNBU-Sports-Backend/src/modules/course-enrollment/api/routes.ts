import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, command, path, instant, keysetPage } from '../../../shared/api/route-kit.ts';
import { ensure, type Clock, type Secrets } from '../../../shared/application/runtime.ts';
import { CourseService } from '../application/course-service.ts';
import { courseWire, ruleCommand, enrollmentWire, invitationWire, flowWire, courseSummary, studentWire } from './mappers.ts';
function page<T>(r: FastifyRequest, items: T[], id: (item: T) => string, secrets: Secrets, context: string) {
    const q = r.query as Record<string, unknown>;
    return keysetPage(items, item => [id(item)], { query: q, secrets, context: 'course-page-v2', order: 'ASC',
        binding: { context, actor: bearer(r), status: q.status ?? null } });
}
export function registerCourses(app: FastifyInstance, v: ContractValidator, service: CourseService, clock: Clock, secrets: Secrets) {
    const cid = (r: FastifyRequest) => path(r, 'courseId'), code = (r: FastifyRequest) => path(r, 'invitationCode', false), wire = (x: Awaited<ReturnType<CourseService['get']>>) => courseWire(x, clock.now());
    route(app, v, 'POST', '/teacher/courses', 'Course', 201, async (r) => { const b = v.parse('CourseCreateRequest', r.body); return wire(await service.create(bearer(r), { ...b, rule: ruleCommand(b.rule) }, command(r))); });
    route(app, v, 'GET', '/teacher/courses', 'CoursePage', 200, async (r) => {
        const q = r.query as {
            status?: string;
        };
        ensure(q.status === undefined || ['DRAFT', 'OPEN', 'CLOSED'].includes(q.status), 'INVALID_REQUEST', 400);
        return page(r, (await service.list(bearer(r))).map(wire).filter(c => q.status === undefined || c.status === q.status), c => c.courseId, secrets, 'courses');
    });
    route(app, v, 'GET', '/student/course', 'StudentCourse', 200, async (r) => {
        const c = wire(await service.currentStudent(bearer(r)));
        return { courseId: c.courseId, semester: c.semester, name: c.name, description: c.description, responsibleTeacher: c.responsibleTeacher, checkinOpensAt: c.checkinOpensAt, checkinClosesAt: c.checkinClosesAt, targets: { courseRelatedTargetMinutes: c.targets.courseRelatedTargetMinutes, otherTargetMinutes: c.targets.otherTargetMinutes, totalTargetMinutes: 1200 }, publishedRule: c.publishedRule };
    });
    const makeupWire = (g: Awaited<ReturnType<CourseService['authorizeMakeup']>>) => ({ authorizationId: g.id, courseId: g.courseId, enrollmentId: g.enrollmentId, ruleVersionId: g.ruleVersionId, startsAt: instant(g.startsAt), endsAtExclusive: instant(g.endsAtExclusive), authorizedAt: instant(g.authorizedAt), authorizedBy: { teacherId: g.actorSubjectId, name: g.teacherName }, version: 0 });
    route(app, v, 'POST', '/courses/:courseId/makeup-authorizations', 'MakeupAuthorization', 200, async (r) => { const b = v.parse('MakeupAuthorizationRequest', r.body); return makeupWire(await service.authorizeMakeup(bearer(r), cid(r), { ...b, startsAt: new Date(b.startsAt).getTime(), endsAtExclusive: new Date(b.endsAtExclusive).getTime() }, command(r))); });
    route(app, v, 'GET', '/courses/:courseId/makeup-authorizations', 'MakeupAuthorizationPage', 200, async (r) => page(r, (await service.makeups(bearer(r), cid(r))).map(makeupWire), g => g.authorizationId, secrets, 'makeup/' + cid(r)));
    route(app, v, 'GET', '/student/makeup-authorizations', 'MakeupAuthorizationPage', 200, async (r) => page(r, (await service.makeups(bearer(r), null)).map(makeupWire), g => g.authorizationId, secrets, 'student-makeup'));
    route(app, v, 'GET', '/courses/:courseId', 'Course', 200, async (r) => wire(await service.get(bearer(r), cid(r))));
    route(app, v, 'POST', '/courses/:courseId/draft-rule', 'Course', 200, async (r) => { const b = v.parse('CourseDraftUpdateRequest', r.body); return wire(await service.draft(bearer(r), cid(r), { ...b, rule: ruleCommand(b.rule) }, command(r))); });
    route(app, v, 'POST', '/courses/:courseId/publication-plan', 'CoursePlanEvidence', 200, async (r) => { const p = await service.prepare(bearer(r), cid(r), v.parse('CoursePlanRequest', r.body), command(r)); return { evidenceId: p.id, draftVersion: p.draftVersion, templateVersionId: p.templateId, semesterVersion: p.semesterVersion, calendarSourceVersion: p.calendarVersion, result: p.result, proofKind: p.proofKind, explanation: { zh: p.result === 'FEASIBLE' ? '存在合法完整日程见证' : p.result === 'INFEASIBLE' ? '完整目录穷尽后不可完成' : '缺少完整可验证的计划证据', en: p.result === 'FEASIBLE' ? 'A legal complete schedule witness exists' : p.result === 'INFEASIBLE' ? 'Exhaustive complete catalog has no feasible schedule' : 'Reliable plan evidence is unavailable' }, publicationToken: p.publicationToken, computedAt: instant(p.computedAt) }; });
    route(app, v, 'POST', '/courses/:courseId/publication', 'Course', 200, async (r) => wire(await service.publish(bearer(r), cid(r), v.parse('PublishCourseRequest', r.body), command(r))));
    route(app, v, 'POST', '/courses/:courseId/closure', 'Course', 200, async (r) => wire(await service.close(bearer(r), cid(r), v.parse('CourseCloseRequest', r.body), command(r))));
    route(app, v, 'POST', '/courses/:courseId/change-impact', 'CourseChangeImpact', 200, async (r) => { const p = await service.impact(bearer(r), cid(r), v.parse('CourseChangeProposal', r.body), command(r)); return { ...p, expiresAt: instant(p.expiresAt), affectedStudents: p.affectedStudents.map(studentWire) }; });
    route(app, v, 'PUT', '/courses/:courseId', 'Course', 200, async (r) => wire(await service.update(bearer(r), cid(r), v.parse('CourseUpdateRequest', r.body), command(r))));
    route(app, v, 'POST', '/courses/:courseId/invitations', 'CreatedCourseInvitation', 201, async (r) => { const x = await service.createInvitation(bearer(r), cid(r), v.parse('CourseInvitationCreateRequest', r.body), command(r)); return { invitation: invitationWire(x.invitation), invitationCode: x.invitationCode }; });
    route(app, v, 'GET', '/courses/:courseId/invitations', 'CourseInvitationPage', 200, async (r) => {
        const q = r.query as {
            status?: string;
        };
        ensure(q.status === undefined || ['ACTIVE', 'EXPIRED', 'REVOKED', 'COURSE_CLOSED', 'NOT_CURRENT'].includes(q.status), 'INVALID_REQUEST', 400);
        return page(r, (await service.invitations(bearer(r), cid(r))).map(invitationWire).filter(i => q.status === undefined || i.status === q.status), i => i.invitationId, secrets, 'invitations/' + cid(r));
    });
    route(app, v, 'POST', '/courses/:courseId/invitations/:invitationId/revocation', 'CourseInvitation', 200, async (r) => invitationWire(await service.revokeInvitation(bearer(r), cid(r), path(r, 'invitationId'), v.parse('CourseInvitationRevokeRequest', r.body), command(r))));
    route(app, v, 'GET', '/course-invitations/:invitationCode', 'CourseInvitationPreview', 200, async (r) => { const p = await service.preview(code(r)); return { ...p, course: courseSummary(p.course.course, p.course.semester), expiresAt: instant(p.expiresAt) }; });
    route(app, v, 'POST', '/course-invitations/:invitationCode/new-student-flows', 'NewInvitationFlowAuthorization', 200, async (r) => { const result = await service.registerNew(code(r), v.parse('RegisterNewInvitationFlowRequest', r.body), command(r)); return { flow: flowWire(result.flow), flowAuthorization: result.flowAuthorization }; });
    route(app, v, 'POST', '/course-invitations/:invitationCode/student-registration', 'SessionTokenPair', 201, async (r) => { const p = await service.registerStudent(code(r), v.parse('NewStudentRegistrationRequest', r.body), command(r)); return { ...p, accessExpiresAt: instant(p.accessExpiresAt), refreshExpiresAt: instant(p.refreshExpiresAt) }; });
    route(app, v, 'POST', '/course-invitations/:invitationCode/existing-student-flows', 'InvitationRegistrationFlow', 200, async (r) => flowWire(await service.registerExisting(bearer(r), code(r), v.parse('RegisterExistingInvitationFlowRequest', r.body), command(r))));
    route(app, v, 'POST', '/course-invitations/:invitationCode/join', 'Enrollment', 201, async (r) => enrollmentWire(await service.join(bearer(r), code(r), v.parse('ExistingStudentJoinRequest', r.body), command(r))));
    route(app, v, 'GET', '/courses/:courseId/members', 'EnrollmentPage', 200, async (r) => {
        const q = r.query as Record<string, unknown>;
        ensure(q.status === undefined || q.status === 'ACTIVE' || q.status === 'REMOVED', 'INVALID_REQUEST', 400);
        return page(r, (await service.members(bearer(r), cid(r), q.status)).map(enrollmentWire), e => e.enrollmentId, secrets, 'members/' + cid(r));
    });
    route(app, v, 'POST', '/courses/:courseId/members/:enrollmentId/removal', 'Enrollment', 200, async (r) => enrollmentWire(await service.transitionMember(bearer(r), cid(r), path(r, 'enrollmentId'), false, v.parse('EnrollmentTransitionRequest', r.body), command(r))));
    route(app, v, 'POST', '/courses/:courseId/members/:enrollmentId/restoration', 'Enrollment', 200, async (r) => enrollmentWire(await service.transitionMember(bearer(r), cid(r), path(r, 'enrollmentId'), true, v.parse('EnrollmentTransitionRequest', r.body), command(r))));
}
