import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { Clock, Secrets } from '../../../../../shared/application/runtime.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { AuditWriter, AuditEvent } from '../../../application/public/audit.ts';
export class PostgresAuditRepository implements AuditWriter {
    private readonly tx: PostgresTransactionRunner;
    private readonly clock: Clock;
    private readonly secrets: Secrets;
    constructor(tx: PostgresTransactionRunner, clock: Clock, secrets: Secrets) { this.tx = tx; this.clock = clock; this.secrets = secrets; }
    async append(scope: TransactionScope, event: AuditEvent) {
        // No arbitrary metadata bag: secrets, reasons, profiles and raw commands cannot enter this table.
        if (!/^[A-Z][A-Z_]{1,79}$/.test(event.action) || !/^[a-zA-Z0-9_-]{1,100}$/.test(event.requestId))
            throw new Error('UNSAFE_AUDIT_EVENT');
        await this.tx.client(scope).query(`INSERT INTO audit.audit_event(id,organization_id,actor_subject_id,action,resource_id,request_id,occurred_at)
   VALUES($1,$2,$3,$4,$5,$6,$7)`, [this.secrets.id(), event.organizationId, event.actorSubjectId, event.action, event.resourceId, event.requestId, new Date(this.clock.now())]);
    }
}
