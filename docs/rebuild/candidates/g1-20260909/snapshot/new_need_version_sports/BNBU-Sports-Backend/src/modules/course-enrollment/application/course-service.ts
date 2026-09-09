import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, replay, type Clock, type Secrets, type CommandIdentity } from '../../../shared/application/runtime.ts';
import { validateRule, assertOwner, assertNewAdmission, assertFlow, type Course, type Rule, type Enrollment, type Invitation, type InvitationFlow } from '../domain/course.ts';
import { publicationPlan } from '../domain/publication-plan.ts';
import type { CourseRepository } from './ports/course-repository.ts';
import type { CourseRegistrationSessions } from './ports/registration-sessions.ts';
import type { CourseStudentProjection } from './ports/student-projection.ts';
import type { CourseStudentOwnerLock } from './ports/student-owner-lock.ts';
import type { CourseIdentity, CourseSemesters, CourseCalendar, CourseAudit, CourseNotifications, CourseActor, Semester, RegistrationInput } from './ports/dependencies.ts';
import type { SessionAdmissionAccess, SessionStartInput, SessionAdmission } from './public/session-admission.ts';
import type { CourseAccess, CourseFacts } from './public/courses.ts';
export interface CourseDependencies {
    transactions: TransactionRunner;
    snapshots: TransactionRunner;
    studentProjection: CourseStudentProjection;
    registrationSessions: CourseRegistrationSessions;
    repository: CourseRepository;
    identity: CourseIdentity;
    studentOwnerLock: CourseStudentOwnerLock;
    semesters: CourseSemesters;
    admissionGate: (scope: TransactionScope, organizationId: string) => Promise<void>;
    calendar: CourseCalendar;
    audit: CourseAudit;
    notifications: CourseNotifications;
    clock: Clock;
    secrets: Secrets;
    organizationId: string;
}
export class CourseService implements CourseAccess, SessionAdmissionAccess {
    private readonly d: CourseDependencies;
    constructor(d: CourseDependencies) { this.d = d; }
    async activeStudentSubjects(scope: TransactionScope, organizationId: string, semesterId: string, subjects: readonly string[]) { return this.d.repository.activeStudentSubjects(scope, organizationId, semesterId, subjects); }
    async semesterCounts(s: TransactionScope, org: string, ids: readonly string[]) { return this.d.repository.semesterCounts(s, org, ids); }
    async lockSemesterCourses(s: TransactionScope, org: string, id: string) { return (await this.d.repository.semesterCourses(s, org, id, true)).map(c => c.id); }
    async assertSemesterSettled(s: TransactionScope, org: string, id: string, locked: readonly string[], source?: {
        assertSettled(scope: TransactionScope, organizationId: string, semesterId: string, courseIds: readonly string[]): Promise<void>;
    }) {
        const current = await this.d.repository.semesterCourses(s, org, id, false);
        ensure(current.length === locked.length && current.every((c, i) => c.id === locked[i]), 'VERSION_CONFLICT', 412);
        ensure(current.every(c => c.status === 'CLOSED'), 'SEMESTER_SETTLEMENT_BLOCKED', 409);
        if (current.length) {
            ensure(source, 'SETTLEMENT_SOURCE_UNAVAILABLE', 503);
            await source.assertSettled(s, org, id, locked);
        }
    }
    async eraseIdentityReplays(scope: TransactionScope, organizationId: string, subjectId: string) { await this.d.repository.eraseIdentityReplays(scope, organizationId, subjectId); }
    async assertTeacherAccountDeletion(scope: TransactionScope, organizationId: string, teacherId: string, settlementGate?: {
        assertMayDelete(scope: TransactionScope, organizationId: string, teacherId: string, courseIds: readonly string[]): Promise<void>;
    }) {
        const owned = await this.d.repository.courses(scope, organizationId, teacherId);
        if (owned.length) {
            for (const c of owned) {
                const locked = await this.required(scope, organizationId, c.id);
                ensure(locked.status === 'CLOSED', 'FORBIDDEN', 403);
            }
            ensure(settlementGate, 'DEPENDENCY_UNAVAILABLE', 503);
            await settlementGate.assertMayDelete(scope, organizationId, teacherId, owned.map(c => c.id));
        }
    }
    private async required(s: TransactionScope, org: string, id: string, lock = true) { const c = await this.d.repository.course(s, org, id, lock); ensure(c, 'RESOURCE_NOT_FOUND', 404); return c; }
    private async semester(s: TransactionScope, c: Course) { return this.d.semesters.get(s, c.organizationId, c.semesterId); }
    private async audit(s: TransactionScope, c: Course, actor: CourseActor, action: string, command: CommandIdentity) { await this.d.audit.append(s, { organizationId: c.organizationId, actorSubjectId: actor.subjectId, action, resourceId: c.id, requestId: command.requestId }); }
    private async run<T>(token: string, op: string, resource: string, input: unknown, cmd: CommandIdentity, work: (s: TransactionScope, a: CourseActor) => Promise<T>, beforeBusiness?: (s: TransactionScope, a: CourseActor) => Promise<void>) {
        const transactions = op === 'previewCourseChangeImpact' ? this.d.snapshots : this.d.transactions;
        return transactions.run(async (s) => {
            const replayDuringMaintenance = ['closeCourse', 'joinCourse', 'publishCourse', 'registerExistingInvitationFlow', 'authorizeCourseMakeup'].includes(op);
            const a = await this.d.identity.authenticate(token, s, replayDuringMaintenance || beforeBusiness ? 'AUTHENTICATION_ONLY' : 'BUSINESS');
            if (beforeBusiness) { await beforeBusiness(s, a); await this.d.identity.authenticate(token, s, 'BUSINESS'); }
            return replay(this.d.repository, this.d.secrets, s, a.subjectId, op + '/' + resource, cmd, input, async () => {
                if (replayDuringMaintenance)
                    await this.d.identity.authenticate(token, s, 'BUSINESS');
                return work(s, a);
            });
        });
    }
    private bounds(semester: Semester) { return { start: new Date(semester.startDate + 'T00:00:00+08:00').getTime(), end: new Date(semester.endDate + 'T00:00:00+08:00').getTime() + 86400000 }; }
    private async checkRule(s: TransactionScope, org: string, semester: Semester, rule: Rule) {
        ensure(semester.status === 'CURRENT', 'SEMESTER_NOT_CURRENT');
        const b = this.bounds(semester);
        validateRule(rule, b.start, b.end);
        const template = await this.d.repository.template(s, org, rule.templateVersionId);
        ensure(template, 'RESOURCE_NOT_FOUND', 404);
        return template;
    }
    async create(token: string, input: {
        semesterId: string;
        name: string;
        description: string | null;
        rule: Rule;
    }, cmd: CommandIdentity) {
        input = { ...input, name: input.name.trim() };
        return this.run(token, 'createCourse', '', input, cmd, async (s, a) => {
            ensure(a.role === 'TEACHER', 'FORBIDDEN', 403);
            ensure(input.name.trim().length > 0, 'VALIDATION_FAILED', 422);
            const teacher = await this.d.identity.teacher(a.subjectId, a.organizationId, s), semester = await this.d.semesters.get(s, a.organizationId, input.semesterId);
            await this.checkRule(s, a.organizationId, semester, input.rule);
            const c: Course = { id: this.d.secrets.id(), organizationId: a.organizationId, semesterId: semester.id, responsibleTeacherSubjectId: a.subjectId, teacherName: teacher.name, name: input.name.trim(), description: input.description, status: 'DRAFT', joinOpen: false, rule: input.rule, published: null, version: 0, targetRevision: 1, updatedAt: this.d.clock.now(), closedAt: null };
            await this.d.repository.saveCourse(s, c, a.subjectId, this.d.secrets.id());
            await this.audit(s, c, a, 'COURSE_CREATED', cmd);
            return this.view(s, c);
        });
    }
    async draft(token: string, id: string, input: {
        rule: Rule;
        expectedVersion: number;
    }, cmd: CommandIdentity) {
        return this.run(token, 'updateCourseDraftRule', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.status === 'DRAFT', 'COURSE_RULES_LOCKED');
            ensure(c.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            await this.checkRule(s, a.organizationId, await this.semester(s, c), input.rule);
            c.rule = input.rule;
            c.version++;
            c.targetRevision++;
            c.updatedAt = this.d.clock.now();
            await this.d.repository.updateCourse(s, c, a.subjectId, this.d.secrets.id());
            await this.audit(s, c, a, 'COURSE_DRAFT_UPDATED', cmd);
            return this.view(s, c);
        });
    }
    async prepare(token: string, id: string, input: {
        expectedCourseVersion: number;
    }, cmd: CommandIdentity) {
        return this.run(token, 'prepareCoursePublication', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.status === 'DRAFT', 'COURSE_RULES_LOCKED');
            ensure(c.version === input.expectedCourseVersion, 'VERSION_CONFLICT', 412);
            const semester = await this.semester(s, c);
            await this.checkRule(s, a.organizationId, semester, c.rule);
            const now = this.d.clock.now(), catalog = await this.d.calendar.catalog(s, semester, c.rule, now), result = publicationPlan(c.rule, catalog, now);
            const token = result.result === 'FEASIBLE' ? this.d.secrets.token() : null;
            const plan = { ...result, id: this.d.secrets.id(), courseId: id, draftVersion: c.version, semesterVersion: semester.version, calendarVersion: catalog.version, templateId: c.rule.templateVersionId, tokenDigest: token ? this.d.secrets.digest('publication', token) : null, computedAt: now };
            await this.d.repository.savePlan(s, plan);
            await this.audit(s, c, a, 'COURSE_PLAN_PREPARED', cmd);
            return { ...plan, publicationToken: token };
        });
    }
    async publish(token: string, id: string, input: {
        expectedCourseVersion: number;
        publicationToken: string;
    }, cmd: CommandIdentity) {
        return this.run(token, 'publishCourse', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.status === 'DRAFT', 'COURSE_RULES_LOCKED');
            ensure(c.version === input.expectedCourseVersion, 'VERSION_CONFLICT', 412);
            const semester = await this.semester(s, c), template = await this.checkRule(s, a.organizationId, semester, c.rule);
            const p = await this.d.repository.plan(s, this.d.secrets.digest('publication', input.publicationToken));
            ensure(p && p.courseId === id && p.draftVersion === c.version && p.semesterVersion === semester.version && p.templateId === template.templateVersionId && p.result === 'FEASIBLE', 'COURSE_PLAN_STALE');
            const now = this.d.clock.now(), catalog = await this.d.calendar.catalog(s, semester, c.rule, now);
            ensure(catalog.version === p.calendarVersion && p.witness.every(w => catalog.slots.some(slot => this.d.secrets.equal(this.d.secrets.digest('slot', slot), this.d.secrets.digest('slot', w)))), 'COURSE_PLAN_STALE');
            ensure(publicationPlan(c.rule, { version: catalog.version, complete: false, slots: p.witness }, now).result === 'FEASIBLE', 'COURSE_PLAN_STALE');
            c.published = { ...c.rule, ruleVersionId: this.d.secrets.id(), courseId: id, semesterId: c.semesterId, versionNo: 1, template, closeoutEndsAt: c.rule.regularCutoffAt + 7 * 86400000, reminderScheduledAt: Math.max(now, c.rule.regularCutoffAt - 14 * 86400000), publishedAt: now };
            c.status = 'OPEN';
            c.joinOpen = true;
            c.version++;
            c.updatedAt = now;
            await this.d.repository.updateCourse(s, c, a.subjectId, null);
            await this.audit(s, c, a, 'COURSE_PUBLISHED', cmd);
            return this.view(s, c);
        });
    }
    async close(token: string, id: string, input: {
        expectedVersion: number;
        reason: string;
    }, cmd: CommandIdentity) {
        return this.run(token, 'closeCourse', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            ensure(c.status === 'OPEN', 'COURSE_NOT_OPEN');
            ensure(input.reason.trim(), 'INVALID_REQUEST', 400);
            c.status = 'CLOSED';
            c.joinOpen = false;
            c.closedAt = this.d.clock.now();
            c.updatedAt = c.closedAt;
            c.version++;
            await this.d.repository.updateCourse(s, c, a.subjectId, null);
            await this.d.repository.saveClosure(s, c.id, a.subjectId, input.reason.trim(), c.closedAt);
            await this.d.repository.terminateFlows(s, c.id);
            await this.audit(s, c, a, 'COURSE_CLOSED', cmd);
            return this.view(s, c);
        });
    }
    async impact(token: string, id: string, input: {
        name: string;
        description: string | null;
        expectedVersion: number;
    }, cmd: CommandIdentity) {
        input = { ...input, name: input.name.trim() };
        return this.run(token, 'previewCourseChangeImpact', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.status !== 'CLOSED', 'COURSE_NOT_OPEN');
            ensure(c.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            ensure(input.name.trim(), 'INVALID_REQUEST', 400);
            const members = await this.d.repository.enrollments(s, c.id), impactToken = this.d.secrets.token(), expiresAt = this.d.clock.now() + 600000;
            await this.d.repository.saveImpact(s, { tokenDigest: this.d.secrets.digest('impact', impactToken), courseId: id, actorSubjectId: a.subjectId, expectedVersion: c.version, name: input.name.trim(), description: input.description, expiresAt, membershipDigest: this.d.secrets.digest('membership', members) });
            return { canApply: true, impactToken, expiresAt, affectedStudents: await Promise.all(members.filter(e => e.status === 'ACTIVE').map(e => this.studentView(s, e))) };
        });
    }
    async update(token: string, id: string, input: {
        name: string;
        description: string | null;
        expectedVersion: number;
        impactToken: string;
    }, cmd: CommandIdentity) {
        input = { ...input, name: input.name.trim() };
        return this.run(token, 'updateCourse', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.status !== 'CLOSED', 'COURSE_NOT_OPEN');
            ensure(c.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            const p = await this.d.repository.impact(s, this.d.secrets.digest('impact', input.impactToken));
            ensure(p && p.actorSubjectId === a.subjectId && p.courseId === id && p.expectedVersion === c.version && p.name === input.name.trim() && p.description === input.description && this.d.clock.now() < p.expiresAt, 'VERSION_CONFLICT', 412);
            ensure(this.d.secrets.equal(p.membershipDigest, this.d.secrets.digest('membership', await this.d.repository.enrollments(s, c.id))), 'VERSION_CONFLICT', 412);
            c.name = p.name;
            c.description = p.description;
            c.version++;
            c.updatedAt = this.d.clock.now();
            await this.d.repository.updateCourse(s, c, a.subjectId, null);
            await this.audit(s, c, a, 'COURSE_UPDATED', cmd);
            return this.view(s, c);
        });
    }
    async createInvitation(token: string, id: string, input: {
        lifetimeMinutes?: number;
        expectedCourseVersion: number;
    }, cmd: CommandIdentity) {
        input = { ...input, lifetimeMinutes: input.lifetimeMinutes ?? 30 };
        return this.run(token, 'createCourseInvitation', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            assertNewAdmission(c, (await this.semester(s, c)).status);
            ensure(c.version === input.expectedCourseVersion, 'VERSION_CONFLICT', 412);
            const lifetime = input.lifetimeMinutes ?? 30;
            ensure(Number.isInteger(lifetime) && lifetime >= 5 && lifetime <= 120, 'INVALID_REQUEST', 400);
            const invitationCode = this.d.secrets.token(), now = this.d.clock.now(), i: Invitation = { id: this.d.secrets.id(), courseId: id, codeDigest: this.d.secrets.digest('invitation', invitationCode), displaySuffix: invitationCode.slice(-4), revoked: false, expiresAt: now + lifetime * 60000, createdAt: now, version: 0 };
            await this.d.repository.saveInvitation(s, i);
            await this.audit(s, c, a, 'INVITATION_CREATED', cmd);
            return { invitation: await this.invitationView(s, i, c), invitationCode };
        });
    }
    async revokeInvitation(token: string, id: string, invitationId: string, input: {
        expectedVersion: number;
    }, cmd: CommandIdentity) {
        return this.run(token, 'revokeCourseInvitation', id + '/' + invitationId, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            const i = await this.d.repository.invitationById(s, invitationId, id);
            ensure(i, 'RESOURCE_NOT_FOUND', 404);
            ensure(i.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            ensure(!i.revoked, 'INVITATION_INVALID', 422);
            await this.d.repository.revokeInvitation(s, i.id);
            i.revoked = true;
            i.version++;
            await this.audit(s, c, a, 'INVITATION_REVOKED', cmd);
            return this.invitationView(s, i, c);
        });
    }
    private async invitationContext(s: TransactionScope, code: string) {
        const digest = this.d.secrets.digest('invitation', code);
        // Discover only the course reference without locking an invitation before its course.
        // Admission and revocation must acquire these two rows in the same order.
        const courseId = await this.d.repository.invitationCourseId(s, digest);
        ensure(courseId, 'INVITATION_INVALID', 422);
        const c = await this.required(s, this.d.organizationId, courseId);
        const i = await this.d.repository.invitation(s, digest);
        // Decisions use the freshly locked invitation, never status from the discovery read.
        ensure(i && i.courseId === c.id, 'INVITATION_INVALID', 422);
        return { invitation: i, course: c, semester: await this.semester(s, c) };
    }
    async preview(code: string) {
        return this.d.transactions.run(async (s) => {
            await this.d.admissionGate(s, this.d.organizationId);
            const { invitation: i, course: c, semester } = await this.invitationContext(s, code), status = this.invitationStatus(i, c, semester.status);
            const allowed = status === 'ACTIVE' && c.joinOpen;
            return { status, course: { course: c, semester }, expiresAt: i.expiresAt, newRegistrationAllowed: allowed, unavailableReason: allowed ? null : status === 'ACTIVE' ? 'JOIN_CLOSED' : status };
        });
    }
    async registerExisting(token: string, code: string, input: {
        expectedAccountVersion: number;
    }, cmd: CommandIdentity) {
        return this.run(token, 'registerExistingInvitationFlow', this.d.secrets.digest('invitation', code), input, cmd, async (s, a) => {
            ensure(a.role === 'STUDENT', 'FORBIDDEN', 403);
            ensure(a.accountVersion === input.expectedAccountVersion, 'VERSION_CONFLICT', 412);
            const { invitation: i, course: c, semester } = await this.invitationContext(s, code);
            assertNewAdmission(c, semester.status);
            ensure(a.organizationId === c.organizationId, 'FORBIDDEN', 403);
            ensure(!i.revoked, 'INVITATION_INVALID', 422);
            const existing = await this.d.repository.existingFlow(s, i.id, a.subjectId);
            if (existing) {
                assertFlow(existing, i, c, semester.status, this.d.clock.now());
                return this.flowView(existing, c, semester);
            }
            ensure(this.d.clock.now() < i.expiresAt, 'INVITATION_INVALID', 422);
            ensure(!await this.d.repository.activeEnrollment(s, a.organizationId, c.semesterId, a.subjectId), 'COURSE_ALREADY_JOINED');
            const f: InvitationFlow = { id: this.d.secrets.id(), invitationId: i.id, subject: a.subjectId, authorizationDigest: null, studentSubjectId: a.subjectId, registeredAt: this.d.clock.now(), originalExpiresAt: i.expiresAt, graceEndsAt: i.expiresAt + 600000, status: 'REGISTERED', version: 0 };
            await this.d.repository.saveFlow(s, f);
            return this.flowView(f, c, semester);
        });
    }
    async registerNew(code: string, input: {
        clientFlowNonce: string;
    }, cmd: CommandIdentity) {
        const subject = this.d.secrets.digest('anonymous-flow-subject', input.clientFlowNonce);
        return this.d.transactions.run(async (s) => {
            return replay(this.d.repository, this.d.secrets, s, subject, 'registerNewInvitationFlow/' + this.d.secrets.digest('invitation', code), cmd, input, async () => {
                await this.d.admissionGate(s, this.d.organizationId);
                const { invitation: i, course: c, semester } = await this.invitationContext(s, code);
                assertNewAdmission(c, semester.status);
                ensure(!i.revoked, 'INVITATION_INVALID', 422);
                let flow = await this.d.repository.existingFlow(s, i.id, subject);
                if (flow) {
                    assertFlow(flow, i, c, semester.status, this.d.clock.now());
                }
                else {
                    ensure(this.d.clock.now() < i.expiresAt, 'INVITATION_INVALID', 422);
                    const id = this.d.secrets.id(), authorization = this.d.secrets.digest('flow-proof', { id, nonce: input.clientFlowNonce });
                    flow = { id, invitationId: i.id, subject, authorizationDigest: this.d.secrets.digest('flow-proof-verifier', authorization), studentSubjectId: null, registeredAt: this.d.clock.now(), originalExpiresAt: i.expiresAt, graceEndsAt: i.expiresAt + 600000, status: 'REGISTERED', version: 0 };
                    await this.d.repository.saveFlow(s, flow);
                }
                return { flow: this.flowView(flow, c, semester), flowAuthorization: this.d.secrets.digest('flow-proof', { id: flow.id, nonce: input.clientFlowNonce }) };
            });
        });
    }
    async registerStudent(code: string, input: RegistrationInput & {
        flowId: string;
        flowAuthorization: string;
    }, cmd: CommandIdentity) {
        input = { ...input, name: input.name.trim(), studentNumber: input.studentNumber.trim(), verifiedEmail: input.verifiedEmail.trim().toLowerCase() };
        await this.d.identity.registrationAttempt(input.emailOtpProof.challengeId);
        const ownerChanged = Symbol('registration-owner-changed');
        for (let attempt = 0; attempt < 2; attempt++) {
            try { return await this.d.transactions.run(async (s) => {
            const discovery = await this.d.repository.flow(s, input.flowId, false);
            ensure(discovery?.authorizationDigest && this.d.secrets.equal(discovery.authorizationDigest, this.d.secrets.digest('flow-proof-verifier', input.flowAuthorization)), 'INVITATION_FLOW_MISMATCH', 403);
            if (discovery.studentSubjectId) await this.d.registrationSessions.lockRegistrationOwner(s, this.d.organizationId, discovery.studentSubjectId);
            const { invitation: i, course: c, semester } = await this.invitationContext(s, code), flow = await this.d.repository.flow(s, input.flowId);
            ensure(flow && flow.invitationId === i.id && flow.authorizationDigest && this.d.secrets.equal(flow.authorizationDigest, this.d.secrets.digest('flow-proof-verifier', input.flowAuthorization)), 'INVITATION_FLOW_MISMATCH', 403);
            if (flow.studentSubjectId !== discovery.studentSubjectId) throw ownerChanged;
            const pair = await replay(this.d.repository, this.d.secrets, s, flow.subject, 'registerStudent/' + i.id, cmd, input, async () => {
                await this.d.admissionGate(s, this.d.organizationId);
                assertFlow(flow, i, c, semester.status, this.d.clock.now());
                ensure(flow.status === 'REGISTERED', 'COURSE_ALREADY_JOINED');
                const pair = await this.d.identity.registerStudent(s, input, cmd), subject = pair.actor.userId, now = this.d.clock.now();
                ensure(pair.actor.organizationId === c.organizationId && pair.actor.role === 'STUDENT', 'FORBIDDEN', 403);
                const e: Enrollment = { id: this.d.secrets.id(), organizationId: c.organizationId, semesterId: c.semesterId, courseId: c.id, studentSubjectId: subject, status: 'ACTIVE', joinedAt: now, removedAt: null, studentVisibleReason: null, version: 0 }, eventId = this.d.secrets.id();
                await this.d.repository.saveEnrollment(s, e, eventId, subject, now);
                await this.d.repository.completeFlow(s, flow.id, subject);
                await this.notice(s, e, eventId);
                await this.d.audit.append(s, { organizationId: c.organizationId, actorSubjectId: subject, action: 'ENROLLMENT_JOINED', resourceId: c.id, requestId: cmd.requestId });
                return pair;
            });
            await this.d.registrationSessions.assertRegistrationSession(s, { subjectId: pair.actor.userId, accessToken: pair.accessToken, refreshToken: pair.refreshToken });
            return pair;
        }); } catch (error) { if (error !== ownerChanged) throw error; }
        }
        // Only a null -> created-subject transition is legal; retry happens before any mutation or delivery.
        ensure(false, 'DEPENDENCY_UNAVAILABLE', 503);
    }
    async join(token: string, code: string, input: {
        expectedAccountVersion: number;
        flowId: string;
    }, cmd: CommandIdentity) {
        return this.run(token, 'joinCourse', this.d.secrets.digest('invitation', code), input, cmd, async (s, a) => {
            ensure(a.role === 'STUDENT', 'FORBIDDEN', 403);
            ensure(a.accountVersion === input.expectedAccountVersion, 'VERSION_CONFLICT', 412);
            const { invitation: i, course: c, semester } = await this.invitationContext(s, code), f = await this.d.repository.flow(s, input.flowId);
            ensure(f && f.subject === a.subjectId && f.studentSubjectId === a.subjectId, 'INVITATION_FLOW_MISMATCH', 403);
            assertFlow(f, i, c, semester.status, this.d.clock.now());
            await this.d.identity.student(a.subjectId, c.organizationId, s);
            ensure(!await this.d.repository.activeEnrollment(s, a.organizationId, c.semesterId, a.subjectId), 'COURSE_ALREADY_JOINED');
            ensure(!(await this.d.repository.enrollments(s, c.id)).some(e => e.studentSubjectId === a.subjectId), 'COURSE_ALREADY_JOINED');
            const now = this.d.clock.now(), e: Enrollment = { id: this.d.secrets.id(), organizationId: c.organizationId, semesterId: c.semesterId, courseId: c.id, studentSubjectId: a.subjectId, status: 'ACTIVE', joinedAt: now, removedAt: null, studentVisibleReason: null, version: 0 }, eventId = this.d.secrets.id();
            await this.d.repository.saveEnrollment(s, e, eventId, a.subjectId, now);
            await this.d.repository.completeFlow(s, f.id, a.subjectId);
            await this.notice(s, e, eventId);
            await this.audit(s, c, a, 'ENROLLMENT_JOINED', cmd);
            return this.enrollmentView(s, e);
        });
    }
    async transitionMember(token: string, id: string, enrollmentId: string, restore: boolean, input: {
        expectedVersion: number;
        studentVisibleReason: string;
    }, cmd: CommandIdentity) {
        return this.run(token, restore ? 'restoreCourseMember' : 'removeCourseMember', id + '/' + enrollmentId, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            assertNewAdmission({ ...c, joinOpen: true }, (await this.semester(s, c)).status);
            const e = (await this.d.repository.enrollments(s, c.id)).find(e => e.id === enrollmentId);
            ensure(e, 'RESOURCE_NOT_FOUND', 404);
            ensure(e.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            ensure(input.studentVisibleReason.trim(), 'INVALID_REQUEST', 400);
            ensure(e.status === (restore ? 'REMOVED' : 'ACTIVE'), 'ENROLLMENT_NOT_ACTIVE');
            // Identity lock serializes restoration against joining another course, in addition to the DB unique index.
            await this.d.identity.student(e.studentSubjectId, e.organizationId, s);
            if (restore)
                ensure(!await this.d.repository.activeEnrollment(s, c.organizationId, c.semesterId, e.studentSubjectId), 'COURSE_ALREADY_JOINED');
            const now = this.d.clock.now(), eventId = this.d.secrets.id();
            e.status = restore ? 'ACTIVE' : 'REMOVED';
            e.version++;
            e.removedAt = restore ? null : now;
            e.studentVisibleReason = input.studentVisibleReason.trim();
            await this.d.repository.updateEnrollment(s, e, eventId, a.subjectId, now);
            await this.notice(s, e, eventId);
            await this.audit(s, c, a, restore ? 'ENROLLMENT_RESTORED' : 'ENROLLMENT_REMOVED', cmd);
            return this.enrollmentView(s, e);
        }, async (s, a) => {
            const c = await this.required(s, a.organizationId, id, false);
            assertOwner(c, a);
            const e = (await this.d.repository.enrollments(s, c.id)).find(e => e.id === enrollmentId);
            ensure(e, 'RESOURCE_NOT_FOUND', 404);
            await this.d.identity.student(e.studentSubjectId, e.organizationId, s);
        });
    }
    private async notice(s: TransactionScope, e: Enrollment, eventId: string) { await this.d.notifications.membership(s, { organizationId: e.organizationId, recipientSubjectId: e.studentSubjectId, eventId, courseId: e.courseId, state: e.status }); }
    private invitationStatus(i: Invitation, c: Course, semester: string): 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'COURSE_CLOSED' | 'NOT_CURRENT' { return i.revoked ? 'REVOKED' : c.status !== 'OPEN' ? 'COURSE_CLOSED' : semester !== 'CURRENT' ? 'NOT_CURRENT' : this.d.clock.now() >= i.expiresAt ? 'EXPIRED' : 'ACTIVE'; }
    private async invitationView(s: TransactionScope, i: Invitation, c: Course) {
        const semester = await this.semester(s, c), now = this.d.clock.now();
        const revocable = !i.revoked && c.status === 'OPEN' && c.joinOpen && semester.status === 'CURRENT' && (now < i.expiresAt || await this.d.repository.hasUnfinishedFlow(s, i.id, now));
        return { ...i, status: this.invitationStatus(i, c, semester.status), revocable };
    }
    private flowView(f: InvitationFlow, c: Course, semester: Semester) { return { ...f, course: { course: c, semester } }; }
    async studentView(s: TransactionScope, e: Enrollment) { const student = await this.d.studentProjection.readCurrentStudent(s, e.organizationId, e.studentSubjectId), active = await this.d.repository.activeEnrollment(s, e.organizationId, e.semesterId, e.studentSubjectId); return { ...student, studentStatus: active ? 'ACTIVE' as const : 'PENDING' as const }; }
    async enrollmentView(s: TransactionScope, e: Enrollment) { return { ...e, student: await this.studentView(s, e) }; }
    async view(s: TransactionScope, c: Course) { return { course: c, semester: await this.semester(s, c), members: await this.d.repository.enrollments(s, c.id) }; }
    async currentStudent(token: string) {
        return this.d.snapshots.run(async (s) => {
            const a = await this.d.identity.authenticate(token, s);
            ensure(a.role === 'STUDENT', 'FORBIDDEN', 403);
            const semester = await this.d.semesters.current(s, a.organizationId);
            ensure(semester, 'FORBIDDEN', 403);
            const e = await this.d.repository.activeEnrollment(s, a.organizationId, semester.id, a.subjectId);
            ensure(e, 'FORBIDDEN', 403);
            const c = await this.required(s, a.organizationId, e.courseId);
            ensure(c.published, 'FORBIDDEN', 403);
            return this.view(s, c);
        });
    }
    async authorizeMakeup(token: string, id: string, input: {
        enrollmentId: string;
        startsAt: number;
        endsAtExclusive: number;
        expectedCourseVersion: number;
    }, cmd: CommandIdentity) {
        return this.run(token, 'authorizeCourseMakeup', id, input, cmd, async (s, a) => {
            const c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            ensure(c.version === input.expectedCourseVersion, 'VERSION_CONFLICT', 412);
            ensure(c.status === 'OPEN' && c.published && (await this.semester(s, c)).status !== 'ARCHIVED', 'MAKEUP_NOT_ALLOWED');
            const e = (await this.d.repository.enrollments(s, id)).find(e => e.id === input.enrollmentId);
            ensure(e && e.status === 'ACTIVE', 'MAKEUP_NOT_ALLOWED');
            ensure(Number.isFinite(input.startsAt) && Number.isFinite(input.endsAtExclusive) && input.startsAt >= c.rule.regularCutoffAt && input.endsAtExclusive <= c.published.closeoutEndsAt && input.startsAt < input.endsAtExclusive && this.d.clock.now() < input.endsAtExclusive, 'MAKEUP_NOT_ALLOWED');
            const grant = { id: this.d.secrets.id(), courseId: id, enrollmentId: e.id, ruleVersionId: c.published.ruleVersionId, startsAt: input.startsAt, endsAtExclusive: input.endsAtExclusive, authorizedAt: this.d.clock.now(), actorSubjectId: a.subjectId };
            await this.d.repository.saveMakeup(s, grant);
            await this.audit(s, c, a, 'MAKEUP_AUTHORIZED', cmd);
            return { ...grant, teacherName: c.teacherName };
        });
    }
    async makeups(token: string, id: string | null) {
        return this.d.snapshots.run(async (s) => {
            const a = await this.d.identity.authenticate(token, s);
            let enrollmentId: string | null = null;
            if (id === null) {
                ensure(a.role === 'STUDENT', 'FORBIDDEN', 403);
                const semester = await this.d.semesters.current(s, a.organizationId);
                if (!semester)
                    return [];
                const e = await this.d.repository.activeEnrollment(s, a.organizationId, semester.id, a.subjectId);
                if (!e)
                    return [];
                id = e.courseId;
                enrollmentId = e.id;
            }
            const c = await this.required(s, a.organizationId, id);
            if (enrollmentId === null)
                assertOwner(c, a);
            return (await this.d.repository.makeups(s, id, enrollmentId)).map(v => ({ ...v, teacherName: c.teacherName }));
        });
    }
    async get(token: string, id: string) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authenticate(token, s), c = await this.required(s, a.organizationId, id); assertOwner(c, a); return this.view(s, c); }); }
    async list(token: string) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authenticate(token, s); ensure(a.role === 'TEACHER', 'FORBIDDEN', 403); return Promise.all((await this.d.repository.courses(s, a.organizationId, a.subjectId)).map(c => this.view(s, c))); }); }
    async members(token: string, id: string, status?: 'ACTIVE' | 'REMOVED') {
        ensure(status === undefined || status === 'ACTIVE' || status === 'REMOVED', 'INVALID_REQUEST', 400);
        return this.d.snapshots.run(async (s) => {
            const a = await this.d.identity.authenticate(token, s), c = await this.required(s, a.organizationId, id);
            assertOwner(c, a);
            return Promise.all((await this.d.repository.enrollments(s, id)).filter(e => status === undefined || e.status === status).map(e => this.enrollmentView(s, e)));
        });
    }
    async invitations(token: string, id: string) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authenticate(token, s), c = await this.required(s, a.organizationId, id); assertOwner(c, a); return Promise.all((await this.d.repository.invitations(s, id)).map(i => this.invitationView(s, i, c))); }); }
    async facts(s: TransactionScope, org: string, id: string): Promise<CourseFacts> { const c = await this.required(s, org, id); return { courseId: c.id, organizationId: c.organizationId, semesterId: c.semesterId, responsibleTeacherSubjectId: c.responsibleTeacherSubjectId, status: c.status, closedAt: c.closedAt, version: c.version, ruleVersionId: c.published?.ruleVersionId ?? null, thresholdMinutes: c.rule.thresholdMinutes, weeklyCountLimit: c.rule.weeklyCountLimit, regularCutoffAt: c.rule.regularCutoffAt, closeoutEndsAt: c.rule.regularCutoffAt + 7 * 86400000, allowedIntervals: c.rule.allowedIntervals }; }
    async member(s: TransactionScope, org: string, id: string, student: string) { await this.required(s, org, id); const e = (await this.d.repository.enrollments(s, id)).find(e => e.studentSubjectId === student); ensure(e, 'ENROLLMENT_NOT_ACTIVE'); return { enrollmentId: e.id, status: e.status, version: e.version }; }
    async authorizeSessionStart(s: TransactionScope, input: SessionStartInput): Promise<SessionAdmission> {
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        ensure(typeof input.accessToken === 'string' && input.accessToken.length > 0 && uuid.test(input.courseId) && uuid.test(input.expectedRuleVersionId) && (input.makeupAuthorizationId === null || typeof input.makeupAuthorizationId === 'string' && uuid.test(input.makeupAuthorizationId)), 'INVALID_REQUEST', 400);
        input = { ...input, courseId: input.courseId.toLowerCase(), expectedRuleVersionId: input.expectedRuleVersionId.toLowerCase(), makeupAuthorizationId: input.makeupAuthorizationId?.toLowerCase() ?? null };
        const actor = await this.d.identity.authenticate(input.accessToken, s, 'BUSINESS');
        ensure(actor.role === 'STUDENT', 'FORBIDDEN', 403);
        await this.d.studentOwnerLock.lockStudentOwner(s, actor.organizationId, actor.subjectId);
        const c = await this.d.repository.course(s, actor.organizationId, input.courseId);
        ensure(c && c.status !== 'CLOSED', 'COURSE_NOT_OPEN');
        ensure(c.published, 'COURSE_NOT_PUBLISHED');
        ensure(c.status === 'OPEN', 'COURSE_NOT_OPEN');
        ensure((await this.semester(s, c)).status === 'CURRENT', 'COURSE_NOT_OPEN');
        const e = await this.member(s, actor.organizationId, c.id, actor.subjectId);
        ensure(e.status === 'ACTIVE', 'ENROLLMENT_NOT_ACTIVE');
        ensure(c.published.ruleVersionId === input.expectedRuleVersionId, 'VERSION_CONFLICT', 412);
        const grant = input.makeupAuthorizationId === null ? null : await this.d.repository.exactMakeup(s, input.makeupAuthorizationId, c.id, e.enrollmentId, c.published.ruleVersionId);
        // Capture the admission instant after locks; H persists this same instant as the start.
        const admittedAt = this.d.clock.now();
        ensure(Number.isSafeInteger(admittedAt) && admittedAt >= c.published.publishedAt, 'DEPENDENCY_UNAVAILABLE', 503);
        if (input.makeupAuthorizationId === null) {
            ensure(admittedAt < c.published.regularCutoffAt && c.published.allowedIntervals.some(i => i.startsAt <= admittedAt && admittedAt < i.endsAtExclusive), 'CHECKIN_WINDOW_CLOSED');
        }
        else {
            ensure(grant && grant.authorizedAt <= admittedAt && grant.startsAt >= c.published.regularCutoffAt && grant.endsAtExclusive <= c.published.closeoutEndsAt && grant.startsAt <= admittedAt && admittedAt < grant.endsAtExclusive, 'MAKEUP_NOT_ALLOWED');
        }
        return { organizationId: actor.organizationId, studentSubjectId: actor.subjectId, course: { ...await this.facts(s, actor.organizationId, c.id), ruleVersionId: c.published.ruleVersionId }, enrollmentId: e.enrollmentId, enrollmentVersion: e.version, admittedAt,
            makeupAuthorization: grant ? { authorizationId: grant.id, courseId: grant.courseId, enrollmentId: grant.enrollmentId, ruleVersionId: grant.ruleVersionId, startsAt: grant.startsAt, endsAtExclusive: grant.endsAtExclusive, authorizedAt: grant.authorizedAt } : null };
    }
    async assertSessionStart(s: TransactionScope, org: string, id: string, student: string, now: number) { const c = await this.required(s, org, id); ensure(c.status === 'OPEN', 'COURSE_NOT_OPEN'); ensure((await this.semester(s, c)).status === 'CURRENT', 'SEMESTER_NOT_CURRENT'); const e = await this.member(s, org, id, student); ensure(e.status === 'ACTIVE', 'ENROLLMENT_NOT_ACTIVE'); ensure(c.published, 'COURSE_NOT_PUBLISHED'); ensure(c.rule.allowedIntervals.some(i => i.startsAt <= now && now < i.endsAtExclusive) || await this.d.repository.hasMakeup(s, id, e.enrollmentId, now), 'CHECKIN_WINDOW_CLOSED'); return this.facts(s, org, id); }
    async assertExistingChain(s: TransactionScope, org: string, id: string, serverAcceptedAt: number) { const c = await this.required(s, org, id); ensure(c.published, 'COURSE_NOT_PUBLISHED'); ensure(Number.isFinite(serverAcceptedAt) && serverAcceptedAt >= c.published.publishedAt && (c.closedAt === null || serverAcceptedAt < c.closedAt), 'COURSE_NOT_OPEN'); return this.facts(s, org, id); }
}
export type { Rule, Course, Enrollment, Invitation, PublishedRule, Template } from '../domain/course.ts';
export type { Semester, StudentFact } from './ports/dependencies.ts';
