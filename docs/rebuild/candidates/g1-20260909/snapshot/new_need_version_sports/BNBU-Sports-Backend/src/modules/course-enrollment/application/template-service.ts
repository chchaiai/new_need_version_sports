import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, Failure, replay, type Clock, type Secrets, type CommandIdentity } from '../../../shared/application/runtime.ts';
import type { CourseRepository } from './ports/course-repository.ts';
import type { CourseAudit } from './ports/dependencies.ts';
import { FIXED_RULE_FAMILY } from '../domain/fixed-template.ts';
interface TemplateIdentity {
    authenticate(token: string, scope: TransactionScope, purpose?: 'BUSINESS'): Promise<{
        subjectId: string;
        organizationId: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    }>;
    authorizeAdministration(token: string, scope: TransactionScope, permission: string | null, superOnly?: boolean): Promise<{
        subjectId: string;
        organizationId: string;
    }>;
}
interface TemplateDependencies {
    transactions: TransactionRunner;
    snapshots: TransactionRunner;
    repository: CourseRepository;
    identity: TemplateIdentity;
    audit: CourseAudit;
    clock: Clock;
    secrets: Secrets;
}
export class TemplateService {
    private readonly d: TemplateDependencies;
    constructor(d: TemplateDependencies) { this.d = d; }
    async list(token: string, raw: Record<string, unknown>) {
        return this.d.snapshots.run(async (s) => {
            const a = await this.d.identity.authenticate(token, s, 'BUSINESS');
            ensure(a.role === 'TEACHER' || a.role === 'ADMIN', 'FORBIDDEN', 403);
            if (a.role === 'ADMIN')
                await this.d.identity.authorizeAdministration(token, s, null, true);
            const limit = raw.limit === undefined ? 20 : Number(raw.limit);
            ensure(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'INVALID_CURSOR', 400);
            let anchor: number | null = null, before = false;
            const context = 'template-page/' + a.organizationId + '/' + a.subjectId;
            if (raw.cursor !== undefined) {
                try {
                    ensure(typeof raw.cursor === 'string', 'INVALID_CURSOR', 400);
                    const c = this.d.secrets.open<{
                        anchor: number;
                        before: boolean;
                        limit: number;
                    }>(context, raw.cursor);
                    ensure(Number.isSafeInteger(c.anchor) && c.anchor >= 1 && typeof c.before === 'boolean' && c.limit === limit, 'INVALID_CURSOR', 400);
                    anchor = c.anchor;
                    before = c.before;
                }
                catch {
                    throw new Failure('INVALID_CURSOR', 400);
                }
            }
            const all = await this.d.repository.publishedTemplates(s, a.organizationId), eligible = all.filter(t => anchor === null || (before ? t.versionNo < anchor : t.versionNo > anchor)), selected = before ? eligible.slice(-limit) : eligible.slice(0, limit), first = selected[0]?.versionNo ?? anchor, last = selected[selected.length - 1]?.versionNo ?? anchor;
            const cursor = (anchor: number, before: boolean) => this.d.secrets.seal(context, { anchor, before, limit });
            return { items: selected.map(t => ({ ...t, ...FIXED_RULE_FAMILY })), page: { limit, nextCursor: last !== null && all.some(t => t.versionNo > last) ? cursor(last, false) : null, previousCursor: first !== null && all.some(t => t.versionNo < first) ? cursor(first, true) : null } };
        });
    }
    async publish(token: string, input: {
        label: {
            zh: string;
            en: string;
        };
        expectedLatestVersionId: string | null;
    }, cmd: CommandIdentity) {
        const i = { label: { zh: input.label.zh.trim(), en: input.label.en.trim() }, expectedLatestVersionId: input.expectedLatestVersionId?.toLowerCase() ?? null };
        ensure(i.label.zh && i.label.en, 'INVALID_REQUEST', 400);
        return this.d.transactions.run(async (s) => {
            const a = await this.d.identity.authorizeAdministration(token, s, null, true);
            return replay(this.d.repository, this.d.secrets, s, a.subjectId, 'publishRuleTemplateVersion', cmd, i, async () => {
                // The unique SUPER account is locked by live authorization, serializing publishers within the organization.
                const all = await this.d.repository.publishedTemplates(s, a.organizationId), latest = all[all.length - 1];
                ensure((latest?.templateVersionId ?? null) === i.expectedLatestVersionId, 'VERSION_CONFLICT', 412);
                const t = { templateVersionId: this.d.secrets.id(), versionNo: (latest?.versionNo ?? 0) + 1, label: i.label, publishedAt: this.d.clock.now() };
                await this.d.repository.publishTemplate(s, a.organizationId, t);
                await this.d.audit.append(s, { organizationId: a.organizationId, actorSubjectId: a.subjectId, action: 'RULE_TEMPLATE_PUBLISHED', resourceId: t.templateVersionId, requestId: cmd.requestId });
                return { ...t, ...FIXED_RULE_FAMILY };
            });
        });
    }
}
