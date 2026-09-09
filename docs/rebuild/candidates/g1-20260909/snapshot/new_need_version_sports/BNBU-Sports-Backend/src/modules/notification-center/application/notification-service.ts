import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, replay, type Clock, type Secrets, type CommandIdentity } from '../../../shared/application/runtime.ts';
import type { NotificationRepository, Notice } from './ports/notification-repository.ts';
export interface NoticeIdentity {
    authenticate(token: string, scope: TransactionScope, purpose?: 'BUSINESS' | 'AUTHENTICATION_ONLY'): Promise<{
        subjectId: string;
        organizationId: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    }>;
}
export class NotificationService {
    private readonly tx: TransactionRunner;
    private readonly repository: NotificationRepository;
    private readonly identity: NoticeIdentity;
    private readonly clock: Clock;
    private readonly secrets: Secrets;
    constructor(tx: TransactionRunner, repository: NotificationRepository, identity: NoticeIdentity, clock: Clock, secrets: Secrets) { this.tx = tx; this.repository = repository; this.identity = identity; this.clock = clock; this.secrets = secrets; }
    private safe(n: Notice) { return (n.notificationType === 'SYSTEM_MODE' && n.targetRoute === 'SYSTEM_MODE' && n.targetId === null && ((n.title === '系统已恢复 / System restored' && n.body === '请刷新当前系统模式后继续操作。 / Refresh the current system mode to continue.') || (n.title === '系统维护 / System maintenance' && n.body === '请查看当前维护公告。 / View the current maintenance announcement.'))) || n.notificationType === 'COURSE_MEMBERSHIP' && n.title === '课程成员状态更新' && ['课程成员关系已生效，请查看课程页面。', '课程成员关系已移出，请查看课程页面。'].includes(n.body) && n.targetRoute === 'COURSE' && n.targetId !== null; }
    async list(token: string, student: boolean) {
        return this.tx.run(async (s) => {
            const a = await this.identity.authenticate(token, s);
            ensure((a.role === 'STUDENT') === student, 'FORBIDDEN', 403);
            // Filter whole messages before count/pagination, never replace a forbidden field with null.
            return (await this.repository.list(s, a.organizationId, a.subjectId)).filter(n => this.safe(n));
        });
    }
    private async own(scope: TransactionScope, org: string, subject: string, id: string, lock: boolean) {
        const n = await this.repository.get(scope, org, subject, id, lock);
        ensure(n && this.safe(n), 'RESOURCE_NOT_FOUND', 404);
        return n;
    }
    async mark(token: string, student: boolean, id: string, command?: CommandIdentity) {
        return this.tx.run(async (s) => {
            const a = await this.identity.authenticate(token, s, student ? 'AUTHENTICATION_ONLY' : 'BUSINESS');
            ensure((a.role === 'STUDENT') === student, 'FORBIDDEN', 403);
            const mark = async () => {
                if (student) await this.identity.authenticate(token, s, 'BUSINESS');
                const n = await this.own(s, a.organizationId, a.subjectId, id, true);
                const readAt = n.readAt ?? this.clock.now();
                await this.repository.mark(s, a.organizationId, a.subjectId, id, readAt);
                return { ...n, readAt };
            };
            if (!student) return mark();
            ensure(command, 'INVALID_REQUEST', 400);
            await this.own(s, a.organizationId, a.subjectId, id, false);
            const result = await replay(this.repository, this.secrets, s, a.organizationId + '/' + a.subjectId,
                'markOwnStudentNotificationRead/' + id.toLowerCase(), command, {}, mark);
            // Receipt replay never bypasses current recipient or whole-message safety, including during maintenance.
            const current = await this.own(s, a.organizationId, a.subjectId, id, true);
            ensure(this.safe(result) && this.secrets.equal(
                this.secrets.digest('notification-source', { ...current, readAt: null }),
                this.secrets.digest('notification-source', { ...result, readAt: null })), 'RESOURCE_NOT_FOUND', 404);
            return result;
        });
    }
}
export type { Notice } from './ports/notification-repository.ts';
