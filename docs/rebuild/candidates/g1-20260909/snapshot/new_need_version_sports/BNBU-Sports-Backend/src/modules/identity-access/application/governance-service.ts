import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, Failure, replay, type Clock, type Secrets, type PasswordHasher, type CommandIdentity } from '../../../shared/application/runtime.ts';
import { ADMIN_PERMISSIONS } from '../domain/permissions.ts';
import { parseTeachers, type TeacherInput, type TeacherValidationRow } from '../domain/teacher-csv.ts';
import { IdentityService } from './identity-service.ts';
import type { GovernanceRepository, AccountPageQuery, TeacherFact, GovernanceChanges } from './ports/governance-repository.ts';
import type { IdentityRepository } from './ports/identity-repository.ts';
import type { IdentityAudit } from './ports/dependencies.ts';
import type { AccountClosureFacts, AccountPersonalDataCleanup } from './ports/account-closure.ts';
export interface GovernanceDependencies {
    transactions: TransactionRunner;
    snapshots: TransactionRunner;
    studentMemberships: { active(scope: TransactionScope, organizationId: string, subjects: readonly string[]): Promise<readonly string[]> };
    identity: IdentityService;
    repository: GovernanceRepository;
    receipts: IdentityRepository;
    clock: Clock;
    secrets: Secrets;
    passwords: PasswordHasher;
    schoolEmailDomains: readonly string[];
    audit: IdentityAudit;
    closureFacts?: AccountClosureFacts;
    personalDataCleanup: AccountPersonalDataCleanup;
    teachingClosure: {
        assertMayDelete(scope: TransactionScope, organizationId: string, teacherId: string): Promise<void>;
    };
}
export class GovernanceService {
    private readonly d: GovernanceDependencies;
    constructor(d: GovernanceDependencies) { this.d = d; }
    private email(value: string) { const email = value.trim().toLowerCase(); ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && this.d.schoolEmailDomains.includes(email.split('@')[1]!), 'VALIDATION_FAILED', 422); return email; }
    private profile(input: {
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: readonly string[];
    }) { const name = input.name.trim(), permissions = ADMIN_PERMISSIONS.filter(p => input.permissions.includes(p)); ensure(name && permissions.length && input.permissions.every(p => (ADMIN_PERMISSIONS as readonly string[]).includes(p)), 'VALIDATION_FAILED', 422); return { name, verifiedEmail: this.email(input.verifiedEmail), department: input.department?.trim() || null, permissions }; }
    private async event(s: TransactionScope, org: string, actor: string, action: string, id: string, cmd: CommandIdentity, changes: GovernanceChanges = {}) { await this.d.repository.governanceEvent(s, this.d.secrets.id(), org, id, actor, action, changes, this.d.clock.now()); await this.d.audit.append(s, { organizationId: org, actorSubjectId: actor, action, resourceId: id, requestId: cmd.requestId }); }
    private async run<T>(token: string, permission: string | null, superOnly: boolean, op: string, id: string | null, input: unknown, cmd: CommandIdentity, work: (s: TransactionScope, org: string, actor: string) => Promise<T>) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, permission, superOnly, id ?? undefined, op.startsWith('delete')); return replay(this.d.receipts, this.d.secrets, s, a.subjectId, op + (id ? '/' + id : ''), cmd, input, () => work(s, a.organizationId, a.subjectId)); }); }
    private async link(s: TransactionScope, actor: string, op: string, cmd: CommandIdentity, owner: string) { await this.d.receipts.linkReplayOwner(s, actor, op, this.d.secrets.digest('idempotency-key', cmd.key), owner); }
    private async responsibilities(s: TransactionScope, org: string, id: string) { const provider = this.d.closureFacts?.adminResponsibilities; ensure(provider, 'DEPENDENCY_UNAVAILABLE', 503); const count = await provider.count(s, org, id); ensure(Number.isSafeInteger(count) && count >= 0, 'DEPENDENCY_UNAVAILABLE', 503); ensure(count === 0, 'ADMIN_RESPONSIBILITY_BLOCKED', 409); }
    private pageQuery(raw: Record<string, unknown>, op: string, org: string, actor: string): {
        query: AccountPageQuery;
        context: string;
        filters: Record<string, unknown>;
    } {
        const state = typeof raw.state === 'string' ? raw.state : null, q = typeof raw.q === 'string' ? raw.q.trim() : null, college = typeof raw.collegeOrDepartment === 'string' ? raw.collegeOrDepartment.trim() : null;
        const limit = raw.limit === undefined ? 20 : Number(raw.limit);
        ensure(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'INVALID_CURSOR', 400);
        ensure(state === null || ['ACTIVE', 'DISABLED', ...(op === 'teachers' ? ['RECOVERY_REQUIRED'] : [])].includes(state), 'INVALID_CURSOR', 400);
        const filters = { state, q, college, limit }, context = 'account-page/' + op + '/' + org + '/' + actor;
        let anchor: string | null = null, before = false;
        if (raw.cursor !== undefined) {
            try {
                ensure(typeof raw.cursor === 'string', 'INVALID_CURSOR', 400);
                const c = this.d.secrets.open<{
                    filters: Record<string, unknown>;
                    anchor: string;
                    before: boolean;
                }>(context, raw.cursor);
                ensure(this.d.secrets.equal(this.d.secrets.digest('filters', c.filters), this.d.secrets.digest('filters', filters)) && /^[0-9a-f-]{36}$/.test(c.anchor) && typeof c.before === 'boolean', 'INVALID_CURSOR', 400);
                anchor = c.anchor;
                before = c.before;
            }
            catch {
                throw new Failure('INVALID_CURSOR', 400);
            }
        }
        return { query: { anchor, before, limit, state, q, college }, context, filters };
    }
    private page<T>(rows: T[], identity: (r: T) => string, p: ReturnType<GovernanceService['pageQuery']>) { const { query: q, context, filters } = p, extra = rows.length > q.limit; let items = rows.slice(0, q.limit); if (q.before)
        items = items.reverse(); const cursor = (before: boolean, anchor: string) => this.d.secrets.seal(context, { filters, anchor, before }); return { items, page: { limit: q.limit, nextCursor: items.length && (q.before ? q.anchor !== null : extra) ? cursor(false, identity(items[items.length - 1]!)) : null, previousCursor: items.length && (q.before ? extra : q.anchor !== null) ? cursor(true, identity(items[0]!)) : null } }; }
    async subAdmins(token: string, raw: Record<string, unknown>) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, null, true), p = this.pageQuery(raw, 'sub-admins', a.organizationId, a.subjectId), r = await this.d.repository.subAdmins(s, a.organizationId, p.query); return { ...this.page(r.items, r => r.adminId, p), summary: { totalCount: r.total, activeCount: r.active, generatedAt: this.d.clock.now() } }; }); }
    async subAdmin(token: string, id: string) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, null, true), r = await this.d.repository.subAdmin(s, a.organizationId, id); ensure(r, 'RESOURCE_NOT_FOUND', 404); return r; }); }
    private async studentRows(s: TransactionScope, org: string, subject?: string) {
        const rows = await this.d.repository.studentAccounts(s, org, subject);
        const active = new Set(await this.d.studentMemberships.active(s, org, rows.map(r => r.student.subjectId)));
        return rows.map(r => ({ ...r, student: { ...r.student, studentStatus: active.has(r.student.subjectId) ? 'ACTIVE' as const : 'PENDING' as const } }));
    }
    async students(token: string, raw: Record<string, unknown>) {
        return this.d.snapshots.run(async s => {
            const a = await this.d.identity.authorizeAdministration(token, s, 'USERS_ACCOUNTS');
            for (const key of ['q', 'collegeOrDepartment']) ensure(raw[key] === undefined || typeof raw[key] === 'string' && raw[key].trim().length > 0, 'INVALID_REQUEST', 400);
            ensure(raw.status === undefined || raw.status === 'ACTIVE' || raw.status === 'PENDING', 'INVALID_REQUEST', 400);
            const q = typeof raw.q === 'string' ? raw.q.trim().toLowerCase() : null, college = typeof raw.collegeOrDepartment === 'string' ? raw.collegeOrDepartment.trim().toLowerCase() : null;
            const items = (await this.studentRows(s, a.organizationId)).filter(r =>
                (raw.status === undefined || r.student.studentStatus === raw.status) && (college === null || r.student.college?.toLowerCase() === college) &&
                (q === null || [r.student.name, r.student.studentNumber, r.student.college, r.student.major, r.student.administrativeClass].some(v => v?.toLowerCase().includes(q))));
            return { items, binding: { organizationId: a.organizationId, subjectId: a.subjectId, sessionId: a.sessionId, q, college, status: raw.status ?? null } };
        });
    }
    async studentAccount(token: string, id: string) {
        return this.d.snapshots.run(async s => {
            const a = await this.d.identity.authorizeAdministration(token, s, 'USERS_ACCOUNTS');
            const rows = await this.studentRows(s, a.organizationId, id);
            ensure(rows.length === 1, 'RESOURCE_NOT_FOUND', 404);
            return rows[0]!;
        });
    }
    async teachers(token: string, raw: Record<string, unknown>) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, 'USERS_ACCOUNTS'), p = this.pageQuery(raw, 'teachers', a.organizationId, a.subjectId), rows = await this.d.repository.teachers(s, a.organizationId, p.query); return this.page(rows, r => r.teacherId, p); }); }
    async teacher(token: string, id: string) { return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, 'USERS_ACCOUNTS'), r = await this.d.repository.teacher(s, a.organizationId, id); ensure(r, 'RESOURCE_NOT_FOUND', 404); return r; }); }
    async createSubAdmin(token: string, input: {
        loginName: string;
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: readonly string[];
        initialPassword: string;
        confirmInitialPassword: string;
    }, cmd: CommandIdentity) { const p = { ...input, ...this.profile(input), loginName: input.loginName.trim().toLowerCase() }; ensure(p.loginName && p.initialPassword.length > 0 && p.initialPassword === p.confirmInitialPassword, 'INVALID_REQUEST', 400); return this.run(token, null, true, 'createSubAdmin', null, p, cmd, async (s, org, actor) => { const id = this.d.secrets.id(); await this.d.repository.createSubAdmin(s, org, id, actor, p, await this.d.passwords.hash(p.initialPassword), this.d.clock.now()); await this.link(s, actor, 'createSubAdmin', cmd, id); await this.event(s, org, actor, 'SUB_ADMIN_CREATED', id, cmd, { afterState: 'ACTIVE', afterPermissions: p.permissions }); return (await this.d.repository.subAdmin(s, org, id))!; }); }
    async updateSubAdmin(token: string, id: string, input: {
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: readonly string[];
        expectedVersion: number;
    }, cmd: CommandIdentity) { const p = { ...this.profile(input), expectedVersion: input.expectedVersion }; return this.run(token, null, true, 'updateSubAdmin', id, p, cmd, async (s, org, actor) => { const current = await this.d.repository.subAdmin(s, org, id); ensure(current, 'RESOURCE_NOT_FOUND', 404); ensure(current.version === p.expectedVersion, 'VERSION_CONFLICT', 412); await this.d.repository.updateSubAdmin(s, id, p, this.d.clock.now()); await this.link(s, actor, 'updateSubAdmin/' + id, cmd, id); await this.event(s, org, actor, 'SUB_ADMIN_UPDATED', id, cmd, { beforeState: current.state, afterState: current.state, beforePermissions: current.permissions, afterPermissions: p.permissions }); return (await this.d.repository.subAdmin(s, org, id))!; }); }
    async setState(token: string, id: string, input: {
        targetState: 'ACTIVE' | 'DISABLED';
        expectedVersion: number;
    }, cmd: CommandIdentity) { return this.run(token, null, true, 'setSubAdminState', id, input, cmd, async (s, org, actor) => { const current = await this.d.repository.subAdmin(s, org, id); ensure(current, 'RESOURCE_NOT_FOUND', 404); ensure(current.version === input.expectedVersion, 'VERSION_CONFLICT', 412); if (current.state !== input.targetState) {
        if (input.targetState === 'DISABLED')
            await this.responsibilities(s, org, id);
        await this.d.repository.setState(s, id, input.targetState, this.d.clock.now());
        await this.event(s, org, actor, 'SUB_ADMIN_STATE_CHANGED', id, cmd, { beforeState: current.state, afterState: input.targetState, beforePermissions: current.permissions, afterPermissions: current.permissions });
    } await this.link(s, actor, 'setSubAdminState/' + id, cmd, id); return (await this.d.repository.subAdmin(s, org, id))!; }); }
    async validateTeachers(token: string, input: {
        csvText: string;
    }, cmd: CommandIdentity) { return this.run(token, 'USERS_ACCOUNTS', false, 'validateTeacherAccountBatch', null, input, cmd, async (s, org, actor) => { const rows = await this.d.repository.validateExisting(s, org, parseTeachers(input.csvText, this.d.schoolEmailDomains)), valid = rows.length > 0 && rows.every(r => r.errors.length === 0), id = this.d.secrets.id(), now = this.d.clock.now(), expiresAt = now + 10 * 60000; await this.d.repository.saveValidation(s, id, org, actor, this.d.secrets.seal('teacher-validation/' + id, rows), valid, now, expiresAt, this.d.secrets.digest('idempotency-key', cmd.key)); return { validationId: id, valid, rows, rowCount: rows.length, errorCount: rows.reduce((n, r) => n + r.errors.length, 0), expiresAt }; }); }
    async createTeachers(token: string, input: {
        validationId: string;
        initialPassword: string;
    }, cmd: CommandIdentity) { ensure(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(input.initialPassword), 'INVALID_REQUEST', 400); return this.run(token, 'USERS_ACCOUNTS', false, 'createTeacherAccountBatch', null, input, cmd, async (s, org, actor) => { await this.d.repository.lockTeacherCreation(s, org); const validation = await this.d.repository.validation(s, org, actor, input.validationId); ensure(validation && validation.valid && validation.sealedRows && validation.consumedAt === null && this.d.clock.now() < validation.expiresAt, 'VALIDATION_FAILED', 422); const rows = await this.d.repository.validateExisting(s, org, this.d.secrets.open<TeacherValidationRow[]>('teacher-validation/' + input.validationId, validation.sealedRows)); ensure(rows.length > 0 && rows.every(r => r.errors.length === 0), 'VALIDATION_FAILED', 422); const teachers: TeacherFact[] = []; for (const row of [...rows].sort((a, b) => a.email!.localeCompare(b.email!))) {
        const id = this.d.secrets.id(), teacher = { employeeId: row.employeeId!, name: row.name!, email: row.email!, college: row.college } satisfies TeacherInput;
        await this.d.repository.createTeacher(s, org, id, teacher, await this.d.passwords.hash(input.initialPassword), this.d.clock.now());
        await this.link(s, actor, 'createTeacherAccountBatch', cmd, id);
        await this.d.receipts.linkReplayOwner(s, actor, 'validateTeacherAccountBatch', validation.previewKey, id);
        await this.event(s, org, actor, 'TEACHER_ACCOUNT_CREATED', id, cmd, { afterState: 'ACTIVE' });
        teachers.push((await this.d.repository.teacher(s, org, id))!);
    } await this.d.repository.consumeValidation(s, input.validationId, this.d.clock.now()); return { createdCount: teachers.length, teachers }; }); }
    async deleteTeacher(token: string, id: string, input: {
        confirmationEmployeeId: string;
        reason: string;
        expectedVersion: number;
    }, cmd: CommandIdentity) { return this.run(token, 'USERS_ACCOUNTS', false, 'deleteTeacherAccount', id, input, cmd, async (s, org, actor) => { const teacher = await this.d.repository.teacher(s, org, id); ensure(teacher, 'RESOURCE_NOT_FOUND', 404); ensure(teacher.version === input.expectedVersion, 'VERSION_CONFLICT', 412); ensure(input.confirmationEmployeeId === teacher.employeeId && input.reason.trim(), 'INVALID_REQUEST', 400); await this.d.teachingClosure.assertMayDelete(s, org, id); await this.d.personalDataCleanup.erase(s, org, id); await this.event(s, org, actor, 'TEACHER_ACCOUNT_DELETED', id, cmd, { beforeState: teacher.accountState, reason: input.reason.trim() }); await this.d.receipts.eraseAccount(s, id, this.d.secrets.digest('email', teacher.verifiedEmail), this.d.secrets.digest('challenge-subject', teacher.verifiedEmail), this.d.clock.now()); return { deleted: true as const, retainedFacts: ['OPAQUE_HISTORICAL_SUBJECT', 'COURSES_AND_TEACHER_SNAPSHOTS', 'TEACHING_FACTS', 'AUDIT_HISTORY'] }; }); }
    async deleteSubAdmin(token: string, id: string, input: {
        confirmationLoginName: string;
        expectedVersion: number;
        responsibilityTransferConfirmed: true;
    }, cmd: CommandIdentity) { return this.run(token, null, true, 'deleteSubAdmin', id, input, cmd, async (s, org, actor) => { const admin = await this.d.repository.subAdmin(s, org, id); ensure(admin, 'RESOURCE_NOT_FOUND', 404); ensure(admin.version === input.expectedVersion, 'VERSION_CONFLICT', 412); ensure(input.confirmationLoginName === admin.loginName && input.responsibilityTransferConfirmed, 'INVALID_REQUEST', 400); await this.responsibilities(s, org, id); await this.d.personalDataCleanup.erase(s, org, id); await this.event(s, org, actor, 'SUB_ADMIN_DELETED', id, cmd, { beforeState: admin.state, beforePermissions: admin.permissions }); await this.d.receipts.eraseAccount(s, id, this.d.secrets.digest('email', admin.verifiedEmail), this.d.secrets.digest('challenge-subject', admin.verifiedEmail), this.d.clock.now()); return { deleted: true as const, retainedFacts: ['OPAQUE_HISTORICAL_SUBJECT', 'COMPLETED_BUSINESS_FACTS', 'AUDIT_HISTORY'] }; }); }
}
