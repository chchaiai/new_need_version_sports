import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { SemesterManagementRepository, SemesterRecord, SemesterInput } from '../../../application/ports/management.ts';
import { ensure, Failure } from '../../../../../shared/application/runtime.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { SemesterAccess } from '../../../application/public/semesters.ts';
export class PostgresSemesterRepository implements SemesterAccess, SemesterManagementRepository {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async current(scope: TransactionScope, org: string) { const r = (await this.tx.client(scope).query("SELECT id FROM academic_term.semester WHERE organization_id=$1 AND status='CURRENT' FOR SHARE", [org])).rows[0]; return r ? this.get(scope, org, r.id) : null; }
    async get(scope: TransactionScope, org: string, id: string): Promise<SemesterRecord> {
        const r = (await this.tx.client(scope).query(`SELECT id,organization_id,academic_year,term_type,display_name,
   start_date::text,end_date::text,status,version,updated_at FROM academic_term.semester WHERE id=$1 AND organization_id=$2 FOR SHARE`, [id, org])).rows[0];
        ensure(r, 'RESOURCE_NOT_FOUND', 404);
        if (!['UPCOMING', 'CURRENT', 'ARCHIVED'].includes(r.status) || !['FIRST', 'SECOND', 'SUMMER'].includes(r.term_type))
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        return { id: r.id, organizationId: r.organization_id, academicYear: r.academic_year, termType: r.term_type, displayName: r.display_name, startDate: r.start_date, endDate: r.end_date, status: r.status, version: Number(r.version), updatedAt: r.updated_at.getTime() };
    }
    async all(s: TransactionScope, org: string): Promise<SemesterRecord[]> {
        return (await this.tx.client(s).query('SELECT id,organization_id,academic_year,term_type,display_name,start_date::text,end_date::text,status,version,updated_at FROM academic_term.semester WHERE organization_id=$1 ORDER BY id', [org])).rows.map(r => ({ id: r.id, organizationId: r.organization_id, academicYear: r.academic_year, termType: r.term_type, displayName: r.display_name, startDate: r.start_date, endDate: r.end_date, status: r.status, version: Number(r.version), updatedAt: r.updated_at.getTime() }));
    }
    async currentWithoutLock(s: TransactionScope, org: string) { return (await this.all(s, org)).find(r => r.status === 'CURRENT') ?? null; }
    async lockCatalog(s: TransactionScope, org: string) { await this.tx.client(s).query('INSERT INTO academic_term.catalog_state(organization_id) VALUES($1) ON CONFLICT DO NOTHING', [org]); await this.tx.client(s).query('SELECT organization_id FROM academic_term.catalog_state WHERE organization_id=$1 FOR UPDATE', [org]); }
    async lock(s: TransactionScope, org: string, ids: readonly string[]) { await this.tx.client(s).query('SELECT id FROM academic_term.semester WHERE organization_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE', [org, ids]); }
    private conflict(error: unknown): never { if ((error as {
        code?: string;
    }).code === '23505')
        throw new Failure('SEMESTER_COMBINATION_EXISTS', 409); throw error; }
    async save(s: TransactionScope, org: string, id: string, i: SemesterInput, now: number) { try {
        await this.tx.client(s).query("INSERT INTO academic_term.semester(id,organization_id,academic_year,term_type,display_name,start_date,end_date,status,version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,'UPCOMING',0,$8,$8)", [id, org, i.academicYear, i.termType, i.displayName, i.startDate, i.endDate, new Date(now)]);
    }
    catch (e) {
        this.conflict(e);
    } }
    async update(s: TransactionScope, id: string, i: SemesterInput, now: number) { try {
        await this.tx.client(s).query('UPDATE academic_term.semester SET academic_year=$2,term_type=$3,display_name=$4,start_date=$5,end_date=$6,updated_at=$7,version=version+1 WHERE id=$1', [id, i.academicYear, i.termType, i.displayName, i.startDate, i.endDate, new Date(now)]);
    }
    catch (e) {
        this.conflict(e);
    } }
    async switch(s: TransactionScope, org: string, previous: string | null, target: string, actor: string, event: string, now: number) { const c = this.tx.client(s); if (previous)
        await c.query("UPDATE academic_term.semester SET status='ARCHIVED',version=version+1,updated_at=$2 WHERE id=$1", [previous, new Date(now)]); await c.query("UPDATE academic_term.semester SET status='CURRENT',version=version+1,updated_at=$2 WHERE id=$1", [target, new Date(now)]); await c.query('INSERT INTO academic_term.semester_transition(id,organization_id,previous_semester_id,current_semester_id,actor_subject_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6)', [event, org, previous, target, actor, new Date(now)]); }
    async reserve(s: TransactionScope, subject: string, op: string, key: string, fingerprint: string) { const c = this.tx.client(s); await c.query('INSERT INTO academic_term.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [subject, op, key, fingerprint]); const r = (await c.query('SELECT fingerprint,sealed_result FROM academic_term.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE', [subject, op, key])).rows[0]; return { fingerprint: r.fingerprint as string, result: r.sealed_result as string | null }; }
    async finish(s: TransactionScope, subject: string, op: string, key: string, result: string) { await this.tx.client(s).query('UPDATE academic_term.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, op, key, result]); }
}
