import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, Failure, replay, type Clock, type Secrets, type CommandIdentity } from '../../../shared/application/runtime.ts';
import type { SemesterManagementRepository, SemesterIdentity, SemesterCourses, SemesterAudit, SemesterInput, SemesterRecord } from './ports/management.ts';
export interface SemesterDependencies {
    transactions: TransactionRunner;
    snapshots: TransactionRunner;
    repository: SemesterManagementRepository;
    identity: SemesterIdentity;
    courses: SemesterCourses;
    audit: SemesterAudit;
    clock: Clock;
    secrets: Secrets;
}
export class SemesterService {
    private readonly d: SemesterDependencies;
    constructor(d: SemesterDependencies) { this.d = d; }
    private valid(i: SemesterInput, update = false) { const code = update ? 'INVALID_REQUEST' : 'VALIDATION_FAILED', status = update ? 400 : 422; ensure(/^\d{4}-\d{4}$/.test(i.academicYear) && Number(i.academicYear.slice(5)) === Number(i.academicYear.slice(0, 4)) + 1 && i.startDate <= i.endDate && i.displayName.trim(), code, status); return { ...i, displayName: i.displayName.trim() }; }
    private summary(r: SemesterRecord) { return { semesterId: r.id, academicYear: r.academicYear, termType: r.termType, displayName: r.displayName, startDate: r.startDate, endDate: r.endDate, status: r.status }; }
    private async view(s: TransactionScope, r: SemesterRecord) { const count = (await this.d.courses.counts(s, r.organizationId, [r.id]))[0]; return { ...this.summary(r), courseCount: count?.courseCount ?? 0, studentCount: count?.studentCount ?? 0, version: r.version, updatedAt: r.updatedAt }; }
    private async event(s: TransactionScope, org: string, actor: string, action: string, id: string, cmd: CommandIdentity) { await this.d.audit.append(s, { organizationId: org, actorSubjectId: actor, action, resourceId: id, requestId: cmd.requestId }); }
    async current(token: string) { return this.d.snapshots.run(async (s) => { const a = await this.d.identity.authenticate(token, s, 'BUSINESS'), r = await this.d.repository.currentWithoutLock(s, a.organizationId); ensure(r, 'RESOURCE_NOT_FOUND', 404); return this.summary(r); }); }
    async list(token: string, raw: Record<string, unknown>) {
        return this.d.snapshots.run(async (s) => {
            const a = await this.d.identity.authorizeAdministration(token, s, 'SEMESTER'), all = await this.d.repository.all(s, a.organizationId), limit = raw.limit === undefined ? 20 : Number(raw.limit), status = raw.status ?? null;
            ensure(Number.isInteger(limit) && limit >= 1 && limit <= 100 && (status === null || ['UPCOMING', 'CURRENT', 'ARCHIVED'].includes(String(status))), 'INVALID_CURSOR', 400);
            const context = 'semester-page/' + a.organizationId + '/' + a.subjectId, filters = { status, limit };
            let anchor: string | null = null, before = false;
            if (raw.cursor !== undefined) {
                try {
                    ensure(typeof raw.cursor === 'string', 'INVALID_CURSOR', 400);
                    const c = this.d.secrets.open<{
                        anchor: string;
                        before: boolean;
                        filters: unknown;
                    }>(context, raw.cursor);
                    ensure(typeof c.anchor === 'string' && typeof c.before === 'boolean' && this.d.secrets.equal(this.d.secrets.digest('filters', filters), this.d.secrets.digest('filters', c.filters)), 'INVALID_CURSOR', 400);
                    anchor = c.anchor;
                    before = c.before;
                }
                catch {
                    throw new Failure('INVALID_CURSOR', 400);
                }
            }
            const filtered = all.filter(r => status === null || r.status === status), eligible = filtered.filter(r => anchor === null || (before ? r.id < anchor : r.id > anchor));
            const selected = before ? eligible.slice(-limit) : eligible.slice(0, limit), counts = await this.d.courses.counts(s, a.organizationId, selected.map(r => r.id)), byId = new Map(counts.map(c => [c.semesterId, c]));
            const current = all.find(r => r.status === 'CURRENT'), first = selected[0]?.id ?? anchor, last = selected[selected.length - 1]?.id ?? anchor, cursor = (id: string, b: boolean) => this.d.secrets.seal(context, { anchor: id, before: b, filters });
            return { summary: { currentSemester: current ? this.summary(current) : null, upcomingCount: all.filter(r => r.status === 'UPCOMING').length, archivedCount: all.filter(r => r.status === 'ARCHIVED').length, generatedAt: this.d.clock.now() }, items: selected.map(r => ({ ...this.summary(r), courseCount: byId.get(r.id)?.courseCount ?? 0, studentCount: byId.get(r.id)?.studentCount ?? 0, version: r.version, updatedAt: r.updatedAt })), page: { limit, nextCursor: last && filtered.some(r => r.id > last) ? cursor(last, false) : null, previousCursor: first && filtered.some(r => r.id < first) ? cursor(first, true) : null } };
        });
    }
    async create(token: string, input: SemesterInput, cmd: CommandIdentity) { const i = this.valid(input); return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, 'SEMESTER'); return replay(this.d.repository, this.d.secrets, s, a.subjectId, 'createSemester', cmd, i, async () => { await this.d.repository.lockCatalog(s, a.organizationId); const id = this.d.secrets.id(); await this.d.repository.save(s, a.organizationId, id, i, this.d.clock.now()); await this.event(s, a.organizationId, a.subjectId, 'SEMESTER_CREATED', id, cmd); return this.view(s, (await this.d.repository.all(s, a.organizationId)).find(r => r.id === id)!); }); }); }
    async update(token: string, id: string, input: SemesterInput & {
        expectedVersion: number;
    }, cmd: CommandIdentity) { const i = { ...this.valid(input, true), expectedVersion: input.expectedVersion }; return this.d.transactions.run(async (s) => { const a = await this.d.identity.authorizeAdministration(token, s, 'SEMESTER'); return replay(this.d.repository, this.d.secrets, s, a.subjectId, 'updateUpcomingSemester/' + id, cmd, i, async () => { await this.d.repository.lockCatalog(s, a.organizationId); await this.d.repository.lock(s, a.organizationId, [id]); const r = (await this.d.repository.all(s, a.organizationId)).find(r => r.id === id); ensure(r, 'RESOURCE_NOT_FOUND', 404); ensure(r.status === 'UPCOMING', 'SEMESTER_NOT_UPCOMING', 409); ensure(r.version === i.expectedVersion, 'VERSION_CONFLICT', 412); await this.d.repository.update(s, id, i, this.d.clock.now()); await this.event(s, a.organizationId, a.subjectId, 'SEMESTER_UPDATED', id, cmd); return this.view(s, (await this.d.repository.all(s, a.organizationId)).find(r => r.id === id)!); }); }); }
    async switch(token: string, id: string, input: {
        expectedTargetVersion: number;
        expectedCurrentSemesterVersion: number | null;
    }, cmd: CommandIdentity) {
        return this.d.transactions.run(async (s) => {
            const a = await this.d.identity.authorizeAdministration(token, s, 'SEMESTER');
            return replay(this.d.repository, this.d.secrets, s, a.subjectId, 'switchCurrentSemester/' + id, cmd, input, async () => {
                const observed = await this.d.repository.currentWithoutLock(s, a.organizationId);
                // Course before semester matches Session/Course locking; recheck the full course set after semester exclusion.
                const lockedCourses = observed ? await this.d.courses.lockCourses(s, a.organizationId, observed.id) : [];
                await this.d.repository.lockCatalog(s, a.organizationId);
                await this.d.repository.lock(s, a.organizationId, observed ? [observed.id, id] : [id]);
                const all = await this.d.repository.all(s, a.organizationId), current = all.find(r => r.status === 'CURRENT') ?? null, target = all.find(r => r.id === id);
                ensure((current?.id ?? null) === (observed?.id ?? null), 'VERSION_CONFLICT', 412);
                ensure(target, 'RESOURCE_NOT_FOUND', 404);
                ensure(target.status === 'UPCOMING', 'SEMESTER_NOT_UPCOMING', 409);
                ensure(target.version === input.expectedTargetVersion && (current?.version ?? null) === input.expectedCurrentSemesterVersion, 'VERSION_CONFLICT', 412);
                ensure(this.d.clock.now() >= new Date(target.startDate + 'T00:00:00+08:00').getTime(), 'SEMESTER_START_DATE_NOT_REACHED', 409);
                if (current)
                    await this.d.courses.assertSettled(s, a.organizationId, current.id, lockedCourses);
                const now = this.d.clock.now();
                await this.d.repository.switch(s, a.organizationId, current?.id ?? null, id, a.subjectId, this.d.secrets.id(), now);
                await this.event(s, a.organizationId, a.subjectId, 'CURRENT_SEMESTER_SWITCHED', id, cmd);
                const after = await this.d.repository.all(s, a.organizationId);
                return { currentSemester: await this.view(s, after.find(r => r.id === id)!), archivedSemester: current ? await this.view(s, after.find(r => r.id === current.id)!) : null, switchedAt: now };
            });
        });
    }
}
