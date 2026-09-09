import type { QueryResultRow } from 'pg';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import { Failure } from '../../../../../shared/application/runtime.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { GovernanceRepository, StudentAccountFact, SubAdminFact, TeacherFact, AccountPageQuery, GovernanceChanges } from '../../../application/ports/governance-repository.ts';
import type { TeacherInput, TeacherValidationRow } from '../../../domain/teacher-csv.ts';
function sub(r: QueryResultRow): SubAdminFact { return { adminId: r.subject_id, loginName: r.login_name_normalized, name: r.name, verifiedEmail: r.email_normalized, department: r.department, permissions: r.permissions, state: r.access_state, createdAt: new Date(r.created_at).getTime(), updatedAt: new Date(r.updated_at).getTime(), version: Number(r.version) }; }
function teacher(r: QueryResultRow): TeacherFact { return { teacherId: r.subject_id, organizationId: r.organization_id, employeeId: r.employee_id, name: r.name, verifiedEmail: r.email_normalized, title: r.title, college: r.college, department: r.department, accountState: r.access_state, mustChangePassword: r.must_change, updatedAt: new Date(r.updated_at).getTime(), version: Number(r.version) }; }
function unique(error: unknown): never { const e = error as {
    code?: string;
    constraint?: string;
}; if (e.code === '23505') {
    if (e.constraint === 'admin_profile_login_name_normalized_key')
        throw new Failure('LOGIN_NAME_ALREADY_IN_USE', 409);
    if (e.constraint === 'teacher_profile_organization_id_employee_id_key')
        throw new Failure('EMPLOYEE_ID_ALREADY_IN_USE', 409);
    if (e.constraint === 'login_account_organization_id_email_normalized_key')
        throw new Failure('EMAIL_ALREADY_IN_USE', 409);
} throw error; }
export class PostgresGovernanceRepository implements GovernanceRepository {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async governanceEvent(s: TransactionScope, id: string, org: string, subject: string, actor: string, action: string, changes: GovernanceChanges, now: number) { await this.tx.client(s).query('INSERT INTO identity_access.governance_event(id,organization_id,subject_id,actor_subject_id,action,before_state,after_state,before_permissions,after_permissions,reason,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [id, org, subject, actor, action, changes.beforeState ?? null, changes.afterState ?? null, changes.beforePermissions ?? null, changes.afterPermissions ?? null, changes.reason ?? null, new Date(now)]); }
    async studentAccounts(s: TransactionScope, org: string, subject?: string): Promise<StudentAccountFact[]> {
        return (await this.tx.client(s).query(`SELECT p.*,a.email_normalized,a.updated_at,a.version
            FROM identity_access.student_profile p JOIN identity_access.login_account a ON a.subject_id=p.subject_id AND a.organization_id=p.organization_id
            JOIN identity_access.user_subject u ON u.id=p.subject_id AND u.organization_id=p.organization_id
            WHERE p.organization_id=$1 AND ($2::uuid IS NULL OR p.subject_id=$2) AND u.role_snapshot='STUDENT'
            AND u.closed_at IS NULL AND a.email_verified_at IS NOT NULL ORDER BY p.subject_id`, [org, subject ?? null])).rows.map(r => {
            if (!['FEMALE', 'MALE'].includes(r.gender) || ![1, 2, 3, 4].includes(r.grade_year)) throw new Error('PERSISTENCE_INVARIANT_BROKEN');
            return { student: { subjectId: r.subject_id, organizationId: r.organization_id, studentNumber: r.student_number, name: r.name, gender: r.gender,
                gradeYear: r.grade_year, college: r.college, major: r.major, administrativeClass: r.administrative_class },
                organizationId: r.organization_id, verifiedEmail: r.email_normalized, updatedAt: r.updated_at.getTime(), version: Number(r.version) };
        });
    }
    async subAdmin(s: TransactionScope, org: string, id: string) {
        const r = (await this.tx.client(s).query(`SELECT p.*,a.email_normalized,a.access_state,a.created_at,a.updated_at,a.version,
       ARRAY(SELECT permission FROM identity_access.admin_permission WHERE subject_id=p.subject_id ORDER BY permission) AS permissions
       FROM identity_access.admin_profile p JOIN identity_access.login_account a ON a.subject_id=p.subject_id WHERE p.organization_id=$1 AND p.subject_id=$2 AND p.admin_kind='SUB'`, [org, id])).rows[0];
        return r ? sub(r) : null;
    }
    async subAdmins(s: TransactionScope, org: string, q: AccountPageQuery) {
        const r = (await this.tx.client(s).query(`SELECT
       (SELECT count(*)::integer FROM identity_access.admin_profile WHERE organization_id=$1 AND admin_kind='SUB') AS total,
       (SELECT count(*)::integer FROM identity_access.admin_profile p JOIN identity_access.login_account a ON a.subject_id=p.subject_id WHERE p.organization_id=$1 AND p.admin_kind='SUB' AND a.access_state='ACTIVE') AS active,
       (SELECT COALESCE(jsonb_agg(t),'[]') FROM (SELECT p.*,a.email_normalized,a.access_state,a.created_at,a.updated_at,a.version,
        ARRAY(SELECT permission FROM identity_access.admin_permission WHERE subject_id=p.subject_id ORDER BY permission) AS permissions
        FROM identity_access.admin_profile p JOIN identity_access.login_account a ON a.subject_id=p.subject_id
        WHERE p.organization_id=$1 AND p.admin_kind='SUB' AND ($2::text IS NULL OR a.access_state=$2) AND ($3::uuid IS NULL OR CASE WHEN $4 THEN p.subject_id<$3 ELSE p.subject_id>$3 END)
        ORDER BY CASE WHEN $4 THEN p.subject_id END DESC,p.subject_id ASC LIMIT $5) t) AS items`, [org, q.state, q.anchor, q.before, q.limit + 1])).rows[0];
        return { items: r.items.map(sub), total: r.total, active: r.active };
    }
    async teacher(s: TransactionScope, org: string, id: string) {
        const r = (await this.tx.client(s).query(`SELECT p.*,a.email_normalized,a.access_state,a.updated_at,a.version,c.must_change FROM identity_access.teacher_profile p
        JOIN identity_access.login_account a ON a.subject_id=p.subject_id JOIN identity_access.password_credential c ON c.subject_id=p.subject_id WHERE p.organization_id=$1 AND p.subject_id=$2`, [org, id])).rows[0];
        return r ? teacher(r) : null;
    }
    async teachers(s: TransactionScope, org: string, q: AccountPageQuery) {
        return (await this.tx.client(s).query(`SELECT p.*,a.email_normalized,a.access_state,a.updated_at,a.version,c.must_change FROM identity_access.teacher_profile p
        JOIN identity_access.login_account a ON a.subject_id=p.subject_id JOIN identity_access.password_credential c ON c.subject_id=p.subject_id
        WHERE p.organization_id=$1 AND ($2::text IS NULL OR a.access_state=$2) AND ($3::uuid IS NULL OR CASE WHEN $4 THEN p.subject_id<$3 ELSE p.subject_id>$3 END)
        AND ($6::text IS NULL OR position(lower($6) in lower(p.name||' '||p.employee_id||' '||a.email_normalized))>0)
        AND ($7::text IS NULL OR p.college=$7 OR p.department=$7)
        ORDER BY CASE WHEN $4 THEN p.subject_id END DESC,p.subject_id ASC LIMIT $5`, [org, q.state, q.anchor, q.before, q.limit + 1, q.q, q.college])).rows.map(teacher);
    }
    private async base(s: TransactionScope, org: string, id: string, role: string, email: string, hash: string, now: number) { const c = this.tx.client(s); await c.query('INSERT INTO identity_access.user_subject(id,organization_id,role_snapshot,created_at) VALUES($1,$2,$3,$4)', [id, org, role, new Date(now)]); await c.query("INSERT INTO identity_access.login_account(subject_id,organization_id,email_normalized,email_verified_at,access_state,created_at,updated_at) VALUES($1,$2,$3,$4,'ACTIVE',$4,$4)", [id, org, email, new Date(now)]); await c.query('INSERT INTO identity_access.password_credential(subject_id,password_phc,must_change,password_version,changed_at) VALUES($1,$2,true,0,$3)', [id, hash, new Date(now)]); }
    async createSubAdmin(s: TransactionScope, org: string, id: string, actor: string, input: {
        loginName: string;
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: string[];
    }, hash: string, now: number) { try {
        await this.base(s, org, id, 'ADMIN', input.verifiedEmail, hash, now);
        await this.tx.client(s).query("INSERT INTO identity_access.admin_profile(subject_id,organization_id,admin_kind,name,login_name_normalized,created_by_super_admin_subject_id,department) VALUES($1,$2,'SUB',$3,$4,$5,$6)", [id, org, input.name, input.loginName, actor, input.department]);
        await this.permissions(s, id, input.permissions);
    }
    catch (e) {
        unique(e);
    } }
    private async permissions(s: TransactionScope, id: string, permissions: string[]) { await this.tx.client(s).query('DELETE FROM identity_access.admin_permission WHERE subject_id=$1', [id]); for (const p of permissions)
        await this.tx.client(s).query('INSERT INTO identity_access.admin_permission(subject_id,permission) VALUES($1,$2)', [id, p]); }
    async updateSubAdmin(s: TransactionScope, id: string, input: {
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: string[];
    }, now: number) { try {
        await this.tx.client(s).query('UPDATE identity_access.login_account SET email_normalized=$2,email_verified_at=$3,updated_at=$3,version=version+1 WHERE subject_id=$1', [id, input.verifiedEmail, new Date(now)]);
        await this.tx.client(s).query('UPDATE identity_access.admin_profile SET name=$2,department=$3 WHERE subject_id=$1', [id, input.name, input.department]);
        await this.permissions(s, id, input.permissions);
    }
    catch (e) {
        unique(e);
    } }
    async setState(s: TransactionScope, id: string, state: 'ACTIVE' | 'DISABLED', now: number) { await this.tx.client(s).query('UPDATE identity_access.login_account SET access_state=$2,updated_at=$3,version=version+1 WHERE subject_id=$1', [id, state, new Date(now)]); if (state === 'DISABLED')
        await this.tx.client(s).query("UPDATE identity_access.auth_session SET revoked_at=$2,revoke_reason='ACCOUNT_DISABLED' WHERE subject_id=$1 AND revoked_at IS NULL", [id, new Date(now)]); }
    async validateExisting(s: TransactionScope, org: string, rows: TeacherValidationRow[]) { const c = this.tx.client(s); const emails = new Set((await c.query('SELECT email_normalized FROM identity_access.login_account WHERE organization_id=$1 AND email_normalized=ANY($2::text[])', [org, rows.map(r => r.email).filter(Boolean)])).rows.map(r => r.email_normalized)); const ids = new Set((await c.query('SELECT employee_id FROM identity_access.teacher_profile WHERE organization_id=$1 AND employee_id=ANY($2::text[])', [org, rows.map(r => r.employeeId).filter(Boolean)])).rows.map(r => r.employee_id)); return rows.map(r => ({ ...r, errors: [...r.errors, ...(r.email && emails.has(r.email) ? ['EMAIL_ALREADY_IN_USE'] : []), ...(r.employeeId && ids.has(r.employeeId) ? ['EMPLOYEE_ID_ALREADY_IN_USE'] : [])] })); }
    async saveValidation(s: TransactionScope, id: string, org: string, actor: string, sealed: string, valid: boolean, now: number, expires: number, previewKey: string) { await this.tx.client(s).query('INSERT INTO identity_access.teacher_batch_validation(id,organization_id,actor_subject_id,sealed_rows,valid,created_at,expires_at,preview_key_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, org, actor, sealed, valid, new Date(now), new Date(expires), previewKey]); }
    async validation(s: TransactionScope, org: string, actor: string, id: string) { const r = (await this.tx.client(s).query('SELECT sealed_rows,valid,expires_at,consumed_at,preview_key_digest FROM identity_access.teacher_batch_validation WHERE id=$1 AND organization_id=$2 AND actor_subject_id=$3 FOR UPDATE', [id, org, actor])).rows[0]; return r ? { sealedRows: r.sealed_rows as string | null, valid: r.valid as boolean, expiresAt: r.expires_at.getTime(), consumedAt: r.consumed_at?.getTime() ?? null, previewKey: r.preview_key_digest as string } : null; }
    async lockTeacherCreation(s: TransactionScope, org: string) { await this.tx.client(s).query("SELECT pg_advisory_xact_lock(hashtextextended('identity-teacher-batch/v1/'||$1::text,0))", [org]); }
    async createTeacher(s: TransactionScope, org: string, id: string, input: TeacherInput, hash: string, now: number) { try {
        await this.base(s, org, id, 'TEACHER', input.email, hash, now);
        await this.tx.client(s).query('INSERT INTO identity_access.teacher_profile(subject_id,organization_id,employee_id,name,college) VALUES($1,$2,$3,$4,$5)', [id, org, input.employeeId, input.name, input.college]);
    }
    catch (e) {
        unique(e);
    } }
    async consumeValidation(s: TransactionScope, id: string, now: number) { await this.tx.client(s).query('UPDATE identity_access.teacher_batch_validation SET consumed_at=$2,sealed_rows=NULL WHERE id=$1', [id, new Date(now)]); }
}
