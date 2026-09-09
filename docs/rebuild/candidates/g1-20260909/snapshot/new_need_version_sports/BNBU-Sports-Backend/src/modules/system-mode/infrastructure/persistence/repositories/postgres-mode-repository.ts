import type { QueryResultRow } from 'pg';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { ModeRepository, Transition } from '../../../application/ports/mode-repository.ts';
import type { Announcement, ModeState } from '../../../application/public/system-mode.ts';
function integer(v: unknown): number {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return n;
}
function mode(v: unknown): 'NORMAL' | 'MAINTENANCE' {
    if (v !== 'NORMAL' && v !== 'MAINTENANCE')
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return v;
}
function announcement(value: any, target: 'NORMAL' | 'MAINTENANCE'): Announcement | null {
    if (target === 'NORMAL' && value === null)
        return null;
    if (target !== 'MAINTENANCE' || !value || Object.keys(value).sort().join(',') !== 'bodyEn,bodyZh,estimatedRecoveryAt,titleEn,titleZh' ||
        ![value.titleZh, value.titleEn, value.bodyZh, value.bodyEn, value.estimatedRecoveryAt].every(v => typeof v === 'string' && v.trim().length > 0) || !Number.isFinite(Date.parse(value.estimatedRecoveryAt)))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return { titleZh: value.titleZh, titleEn: value.titleEn, bodyZh: value.bodyZh, bodyEn: value.bodyEn, estimatedRecoveryAt: value.estimatedRecoveryAt };
}
function state(r: QueryResultRow): ModeState {
    const m = mode(r.mode);
    return { mode: m, policyVersion: integer(r.policy_version), announcement: announcement(r.announcement, m), version: integer(r.version), updatedAt: integer(r.updated_at.getTime()) };
}
export class PostgresModeRepository implements ModeRepository {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async read(scope: TransactionScope, org: string): Promise<ModeState | null> {
        const r = (await this.tx.client(scope).query('SELECT * FROM system_mode.state WHERE organization_id=$1 FOR SHARE', [org])).rows[0];
        return r ? state(r) : null;
    }
    async lock(scope: TransactionScope, org: string): Promise<ModeState | null> {
        const r = (await this.tx.client(scope).query('SELECT * FROM system_mode.state WHERE organization_id=$1 FOR UPDATE', [org])).rows[0];
        return r ? state(r) : null;
    }
    async transitions(scope: TransactionScope, org: string): Promise<Transition[]> {
        return (await this.tx.client(scope).query('SELECT * FROM system_mode.transition WHERE organization_id=$1 ORDER BY sequence_no', [org])).rows.map(r => ({
            id: r.id, sequence: integer(r.sequence_no), from: mode(r.from_mode), to: mode(r.to_mode), reason: r.reason,
            announcement: announcement(r.announcement, mode(r.to_mode)), actorSubjectId: r.actor_subject_id, occurredAt: integer(r.occurred_at.getTime())
        }));
    }
    async change(scope: TransactionScope, org: string, s: ModeState, t: Transition) {
        const c = this.tx.client(scope);
        await c.query(`INSERT INTO system_mode.transition(id,organization_id,sequence_no,from_mode,to_mode,reason,announcement,actor_subject_id,occurred_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [t.id, org, t.sequence, t.from, t.to, t.reason, t.announcement, t.actorSubjectId, new Date(t.occurredAt)]);
        const changed = await c.query(`UPDATE system_mode.state SET mode=$2,policy_version=$3,announcement=$4,version=$5,updated_at=$6
            WHERE organization_id=$1 AND version=$7`, [org, s.mode, s.policyVersion, s.announcement, s.version, new Date(s.updatedAt), s.version - 1]);
        if (changed.rowCount !== 1)
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    }
    async reserve(scope: TransactionScope, subject: string, operation: string, key: string, fingerprint: string) {
        const c = this.tx.client(scope);
        await c.query('INSERT INTO system_mode.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [subject, operation, key, fingerprint]);
        const r = (await c.query('SELECT fingerprint,sealed_result FROM system_mode.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE', [subject, operation, key])).rows[0];
        return { fingerprint: r.fingerprint as string, result: r.sealed_result as string | null };
    }
    async finish(scope: TransactionScope, subject: string, operation: string, key: string, result: string) {
        await this.tx.client(scope).query('UPDATE system_mode.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, key, result]);
    }
}
