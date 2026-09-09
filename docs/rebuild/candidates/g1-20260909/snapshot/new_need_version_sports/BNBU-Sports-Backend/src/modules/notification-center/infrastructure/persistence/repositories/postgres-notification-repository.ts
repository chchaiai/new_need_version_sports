import type { QueryResultRow } from 'pg';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { Clock, Secrets } from '../../../../../shared/application/runtime.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { NotificationRepository, Notice } from '../../../application/ports/notification-repository.ts';
import type { ModeNoticeWriter } from '../../../application/public/mode-notifications.ts';
import type { MembershipNotice, NotificationWriter } from '../../../application/public/notifications.ts';
function notice(r: QueryResultRow): Notice {
    return { id: r.id, organizationId: r.organization_id, recipientSubjectId: r.recipient_subject_id,
        notificationType: r.notification_type, title: r.title, body: r.body, targetRoute: r.target_route,
        targetId: r.target_id, createdAt: r.created_at.getTime(), readAt: r.read_at?.getTime() ?? null };
}
export class PostgresNotificationRepository implements NotificationWriter, NotificationRepository, ModeNoticeWriter {
    private readonly tx: PostgresTransactionRunner;
    private readonly clock: Clock;
    private readonly secrets: Secrets;
    constructor(tx: PostgresTransactionRunner, clock: Clock, secrets: Secrets) { this.tx = tx; this.clock = clock; this.secrets = secrets; }
    async list(scope: TransactionScope, org: string, recipient: string): Promise<Notice[]> { return (await this.tx.client(scope).query('SELECT * FROM notification_center.in_app_notification WHERE organization_id=$1 AND recipient_subject_id=$2 ORDER BY created_at DESC,id DESC', [org, recipient])).rows.map(notice); }
    async get(scope: TransactionScope, org: string, recipient: string, id: string, lock: boolean): Promise<Notice | null> {
        const client = this.tx.client(scope), args = [id, org, recipient];
        const result = lock
            ? await client.query('SELECT * FROM notification_center.in_app_notification WHERE id=$1 AND organization_id=$2 AND recipient_subject_id=$3 FOR UPDATE', args)
            : await client.query('SELECT * FROM notification_center.in_app_notification WHERE id=$1 AND organization_id=$2 AND recipient_subject_id=$3', args);
        return result.rows[0] ? notice(result.rows[0]) : null;
    }
    async mark(scope: TransactionScope, org: string, recipient: string, id: string, now: number) { await this.tx.client(scope).query('UPDATE notification_center.in_app_notification SET read_at=COALESCE(read_at,$4) WHERE id=$1 AND organization_id=$2 AND recipient_subject_id=$3', [id, org, recipient, new Date(now)]); }
    async reserve(scope: TransactionScope, subject: string, operation: string, key: string, fingerprint: string) {
        const client = this.tx.client(scope);
        await client.query('INSERT INTO notification_center.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [subject, operation, key, fingerprint]);
        const row = (await client.query('SELECT fingerprint,sealed_result FROM notification_center.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE', [subject, operation, key])).rows[0]!;
        return { fingerprint: row.fingerprint, result: row.sealed_result as string | null };
    }
    async finish(scope: TransactionScope, subject: string, operation: string, key: string, result: string) {
        await this.tx.client(scope).query('UPDATE notification_center.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, key, result]);
    }
    async eraseIdentityReplays(scope: TransactionScope, org: string, subjectId: string): Promise<void> {
        await this.tx.client(scope).query('DELETE FROM notification_center.command_replay WHERE subject=$1', [org + '/' + subjectId]);
    }
    async modeChanged(scope: TransactionScope, event: {
        organizationId: string;
        eventId: string;
        recipientSubjectIds: string[];
        mode: 'NORMAL' | 'MAINTENANCE';
    }) {
        const title = event.mode === 'NORMAL' ? '系统已恢复 / System restored' : '系统维护 / System maintenance';
        const body = event.mode === 'NORMAL' ? '请刷新当前系统模式后继续操作。 / Refresh the current system mode to continue.' : '请查看当前维护公告。 / View the current maintenance announcement.';
        for (const recipient of new Set(event.recipientSubjectIds)) {
            await this.tx.client(scope).query(`INSERT INTO notification_center.in_app_notification
                (id,organization_id,recipient_subject_id,event_key,notification_type,title,body,target_route,target_id,created_at)
                VALUES($1,$2,$3,$4,'SYSTEM_MODE',$5,$6,'SYSTEM_MODE',NULL,$7) ON CONFLICT(recipient_subject_id,event_key) DO NOTHING`, [this.secrets.id(), event.organizationId, recipient, event.eventId, title, body, new Date(this.clock.now())]);
        }
    }
    async membership(scope: TransactionScope, event: MembershipNotice) {
        const body = event.state === 'ACTIVE' ? '课程成员关系已生效，请查看课程页面。' : '课程成员关系已移出，请查看课程页面。';
        await this.tx.client(scope).query(`INSERT INTO notification_center.in_app_notification
   (id,organization_id,recipient_subject_id,event_key,notification_type,title,body,target_route,target_id,created_at)
   VALUES($1,$2,$3,$4,'COURSE_MEMBERSHIP','课程成员状态更新',$5,'COURSE',$6,$7) ON CONFLICT(recipient_subject_id,event_key) DO NOTHING`, [this.secrets.id(), event.organizationId, event.recipientSubjectId, event.eventId, body, event.courseId, new Date(this.clock.now())]);
    }
}
