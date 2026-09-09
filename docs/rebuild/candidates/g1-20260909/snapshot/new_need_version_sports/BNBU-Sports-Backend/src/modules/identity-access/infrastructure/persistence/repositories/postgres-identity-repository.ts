import type { QueryResultRow } from 'pg';
import { Failure } from '../../../../../shared/application/runtime.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { IdentityRepository, Challenge, NewStudentIdentity } from '../../../application/ports/identity-repository.ts';
import type { Account, Session } from '../../../domain/account.ts';
import type { StudentIdentity } from '../../../application/public/identity.ts';
function accountRow(row: QueryResultRow): Account {
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(row.role_snapshot) || !['ACTIVE', 'DISABLED'].includes(row.access_state) ||
        ![null, 'SUPER', 'SUB'].includes(row.admin_kind) || !Number.isSafeInteger(Number(row.version)))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return { subjectId: row.subject_id, organizationId: row.organization_id, role: row.role_snapshot,
        displayName: row.display_name, email: row.email_normalized, verified: row.email_verified_at !== null,
        accessState: row.access_state, adminKind: row.admin_kind, version: Number(row.version),
        passwordHash: row.password_phc, passwordVersion: Number(row.password_version ?? 0), mustChangePassword: row.must_change ?? false };
}
function sessionRow(row: QueryResultRow): Session {
    return { id: row.id, subjectId: row.subject_id, organizationId: row.organization_id,
        accessDigest: row.access_token_digest, refreshDigest: row.refresh_token_digest, passwordVersion: Number(row.password_version),
        issuedAt: row.issued_at.getTime(), accessExpiresAt: row.access_expires_at.getTime(), expiresAt: row.expires_at.getTime(), revokedAt: row.revoked_at?.getTime() ?? null };
}
export class PostgresIdentityRepository implements IdentityRepository {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async linkReplayOwner(scope: TransactionScope, subject: string, operation: string, key: string, owner: string) {
        await this.tx.client(scope).query('UPDATE identity_access.command_replay SET retention_subject_ids=array_append(retention_subject_ids,$4::uuid) WHERE subject=$1 AND operation=$2 AND key_digest=$3 AND NOT ($4::uuid=ANY(retention_subject_ids))', [subject, operation, key, owner]);
    }
    async reserveClosure(scope: TransactionScope, subject: string, operation: string, key: string, fingerprint: string) {
        const client = this.tx.client(scope);
        await client.query('INSERT INTO identity_access.account_closure_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [subject, operation, key, fingerprint]);
        const r = (await client.query('SELECT fingerprint,sealed_result FROM identity_access.account_closure_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE', [subject, operation, key])).rows[0];
        return { fingerprint: r.fingerprint as string, result: r.sealed_result as string | null };
    }
    async finishClosure(scope: TransactionScope, subject: string, operation: string, key: string, result: string) {
        await this.tx.client(scope).query('UPDATE identity_access.account_closure_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, key, result]);
    }
    async eraseAccount(scope: TransactionScope, subject: string, emailDigest: string, challengeSubject: string, now: number) {
        const c = this.tx.client(scope);
        await c.query(`DELETE FROM identity_access.command_replay WHERE subject=$1 OR $1::uuid=ANY(retention_subject_ids) OR subject=$3 OR subject IN
          (SELECT id::text FROM identity_access.auth_challenge WHERE subject_id=$1::uuid OR email_digest=$2) OR subject IN
          (SELECT access_token_digest FROM identity_access.auth_session WHERE subject_id=$1::uuid) OR subject IN
          (SELECT refresh_token_digest FROM identity_access.auth_session WHERE subject_id=$1::uuid)`, [subject, emailDigest, challengeSubject]);
        await c.query('DELETE FROM identity_access.auth_challenge WHERE subject_id=$1::uuid OR email_digest=$2', [subject, emailDigest]);
        const removed = await c.query('DELETE FROM identity_access.login_account WHERE subject_id=$1', [subject]);
        if (removed.rowCount !== 1)
            throw new Error('ACCOUNT_CLOSURE_TARGET_CHANGED');
        const closed = await c.query('UPDATE identity_access.user_subject SET closed_at=$2 WHERE id=$1 AND closed_at IS NULL', [subject, new Date(now)]);
        if (closed.rowCount !== 1)
            throw new Error('ACCOUNT_CLOSURE_TARGET_CHANGED');
    }
    async lockLiveStudentOwner(scope: TransactionScope, org: string, subject: string) {
        // Serialize lifecycle operations without blocking unrelated historical FK KEY SHARE checks.
        const result = await this.tx.client(scope).query(`SELECT id FROM identity_access.user_subject
            WHERE organization_id=$1 AND id=$2 AND role_snapshot='STUDENT' AND closed_at IS NULL
            FOR NO KEY UPDATE`, [org, subject]);
        return result.rowCount === 1;
    }
    async person(scope: TransactionScope, org: string, subject: string) {
        // Read-only profile projection: do not lock a second actor account while holding mode state.
        const r = (await this.tx.client(scope).query(`SELECT s.id,s.role_snapshot,COALESCE(t.name,st.name,adm.name) AS name
            FROM identity_access.user_subject s
            JOIN identity_access.login_account a ON a.subject_id=s.id
            LEFT JOIN identity_access.teacher_profile t ON t.subject_id=s.id
            LEFT JOIN identity_access.student_profile st ON st.subject_id=s.id
            LEFT JOIN identity_access.admin_profile adm ON adm.subject_id=s.id
            WHERE s.organization_id=$1 AND s.id=$2 AND s.closed_at IS NULL`, [org, subject])).rows[0];
        if (!r)
            return null;
        if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(r.role_snapshot) || typeof r.name !== 'string' || !r.name.trim())
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        return { userId: r.id as string, displayName: r.name as string, role: r.role_snapshot as 'STUDENT' | 'TEACHER' | 'ADMIN' };
    }
    async affectedRecipients(scope: TransactionScope, org: string) {
        return (await this.tx.client(scope).query(`SELECT s.id FROM identity_access.user_subject s
            JOIN identity_access.login_account a ON a.subject_id=s.id
            WHERE s.organization_id=$1 AND s.closed_at IS NULL AND s.role_snapshot IN ('STUDENT','TEACHER') ORDER BY s.id`, [org])).rows.map(r => r.id as string);
    }
    async createStudent(scope: TransactionScope, input: NewStudentIdentity) {
        const c = this.tx.client(scope);
        try {
            await c.query("INSERT INTO identity_access.user_subject(id,organization_id,role_snapshot,created_at) VALUES($1,$2,'STUDENT',$3)", [input.subjectId, input.organizationId, new Date(input.now)]);
            await c.query("INSERT INTO identity_access.login_account(subject_id,organization_id,email_normalized,email_verified_at,access_state,created_at,updated_at,version) VALUES($1,$2,$3,$4,'ACTIVE',$4,$4,0)", [input.subjectId, input.organizationId, input.email, new Date(input.now)]);
            await c.query(`INSERT INTO identity_access.student_profile(subject_id,organization_id,student_number,name,gender,grade_year,college,major,administrative_class) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [input.subjectId, input.organizationId, input.studentNumber, input.name, input.gender, input.gradeYear, input.college, input.major, input.administrativeClass]);
        }
        catch (error) {
            const constraint = (error as {
                code?: string;
                constraint?: string;
            });
            if (constraint.code === '23505' && constraint.constraint === 'login_account_organization_id_email_normalized_key')
                throw new Failure('EMAIL_ALREADY_IN_USE', 409);
            if (constraint.code === '23505' && constraint.constraint === 'student_profile_organization_id_student_number_key')
                throw new Failure('STUDENT_NUMBER_ALREADY_IN_USE', 409);
            throw error;
        }
    }
    async account(scope: TransactionScope, id: string): Promise<Account | null> {
        const client = this.tx.client(scope);
        // All credential/session mutations serialize through their current account first.
        const locked = await client.query('SELECT subject_id FROM identity_access.login_account WHERE subject_id=$1 FOR UPDATE', [id]);
        if (!locked.rowCount)
            return null;
        const result = await client.query(`SELECT a.*, s.role_snapshot, p.password_phc, p.password_version, p.must_change,
      adm.admin_kind, COALESCE(t.name,st.name,adm.name) AS display_name
      FROM identity_access.login_account a JOIN identity_access.user_subject s ON s.id=a.subject_id
      LEFT JOIN identity_access.password_credential p ON p.subject_id=a.subject_id
      LEFT JOIN identity_access.teacher_profile t ON t.subject_id=a.subject_id
      LEFT JOIN identity_access.student_profile st ON st.subject_id=a.subject_id
      LEFT JOIN identity_access.admin_profile adm ON adm.subject_id=a.subject_id
      WHERE a.subject_id=$1 AND s.closed_at IS NULL`, [id]);
        return result.rows[0] ? accountRow(result.rows[0]) : null;
    }
    async login(scope: TransactionScope, org: string, loginType: string, identifier: string) {
        const result = await this.tx.client(scope).query(`SELECT a.subject_id FROM identity_access.login_account a
      JOIN identity_access.user_subject s ON s.id=a.subject_id
      LEFT JOIN identity_access.admin_profile p ON p.subject_id=a.subject_id
      WHERE a.organization_id=$1 AND (($2='TEACHER_EMAIL' AND s.role_snapshot='TEACHER' AND a.email_normalized=$3)
      OR ($2='ADMIN_EMAIL' AND s.role_snapshot='ADMIN' AND p.admin_kind='SUPER' AND a.email_normalized=$3)
      OR ($2='ADMIN_LOGIN_NAME' AND s.role_snapshot='ADMIN' AND p.admin_kind='SUB' AND p.login_name_normalized=$3))`, [org, loginType, identifier]);
        return result.rows[0] ? this.account(scope, result.rows[0].subject_id) : null;
    }
    async emailInUse(scope: TransactionScope, org: string, email: string): Promise<boolean> {
        return (await this.tx.client(scope).query('SELECT subject_id FROM identity_access.login_account WHERE organization_id=$1 AND email_normalized=$2', [org, email])).rowCount !== 0;
    }
    async email(scope: TransactionScope, org: string, email: string) {
        const result = await this.tx.client(scope).query('SELECT subject_id FROM identity_access.login_account WHERE organization_id=$1 AND email_normalized=$2', [org, email]);
        return result.rows[0] ? this.account(scope, result.rows[0].subject_id) : null;
    }
    async refreshSubject(scope: TransactionScope, digest: string, keyDigest: string): Promise<string | null> {
        const client = this.tx.client(scope);
        // Read the owner without taking a receipt lock. The caller locks the account next,
        // then validates the credential/receipt again inside that serialized lifecycle.
        const current = (await client.query('SELECT subject_id FROM identity_access.auth_session WHERE refresh_token_digest=$1', [digest])).rows[0];
        if (current) return current.subject_id as string;
        const saved = (await client.query("SELECT retention_subject_ids FROM identity_access.command_replay WHERE subject=$1 AND operation='refreshSession' AND key_digest=$2", [digest, keyDigest])).rows[0];
        if (!saved) return null;
        if (!Array.isArray(saved.retention_subject_ids) || saved.retention_subject_ids.length !== 1)
            throw new Error('REFRESH_RECEIPT_OWNER_INVALID');
        return saved.retention_subject_ids[0] as string;
    }
    async session(scope: TransactionScope, digest: string, refresh: boolean) {
        const result = await this.tx.client(scope).query(`SELECT subject_id FROM identity_access.auth_session
      WHERE ($2 AND refresh_token_digest=$1) OR (NOT $2 AND access_token_digest=$1)`, [digest, refresh]);
        if (!result.rows[0] || !await this.account(scope, result.rows[0].subject_id))
            return null;
        const locked = await this.tx.client(scope).query(`SELECT * FROM identity_access.auth_session
      WHERE ($2 AND refresh_token_digest=$1) OR (NOT $2 AND access_token_digest=$1) FOR UPDATE`, [digest, refresh]);
        return locked.rows[0] ? sessionRow(locked.rows[0]) : null;
    }
    async saveSession(scope: TransactionScope, s: Session) {
        await this.tx.client(scope).query(`INSERT INTO identity_access.auth_session
      (id,subject_id,organization_id,access_token_digest,refresh_token_digest,password_version,issued_at,access_expires_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [s.id, s.subjectId, s.organizationId, s.accessDigest, s.refreshDigest, s.passwordVersion, new Date(s.issuedAt), new Date(s.accessExpiresAt), new Date(s.expiresAt)]);
    }
    async rotate(scope: TransactionScope, s: Session) {
        await this.tx.client(scope).query(`UPDATE identity_access.auth_session SET access_token_digest=$2,refresh_token_digest=$3,
      issued_at=$4,access_expires_at=$5,expires_at=$6 WHERE id=$1`, [s.id, s.accessDigest, s.refreshDigest, new Date(s.issuedAt), new Date(s.accessExpiresAt), new Date(s.expiresAt)]);
    }
    async revoke(scope: TransactionScope, subject: string, now: number, reason: string, except: string | null) {
        await this.tx.client(scope).query(`UPDATE identity_access.auth_session SET revoked_at=$2,revoke_reason=$3
      WHERE subject_id=$1 AND revoked_at IS NULL AND ($4::uuid IS NULL OR id<>$4)`, [subject, new Date(now), reason, except]);
    }
    async revokeOne(scope: TransactionScope, id: string, now: number) {
        await this.tx.client(scope).query("UPDATE identity_access.auth_session SET revoked_at=$2,revoke_reason='LOGOUT_CURRENT' WHERE id=$1", [id, new Date(now)]);
    }
    async password(scope: TransactionScope, subject: string, encoded: string, now: number, current: string | null) {
        const client = this.tx.client(scope);
        const changed = await client.query(`UPDATE identity_access.password_credential SET password_phc=$2,must_change=false,
      password_version=password_version+1,changed_at=$3 WHERE subject_id=$1 RETURNING password_version`, [subject, encoded, new Date(now)]);
        if (changed.rowCount !== 1)
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        await client.query('UPDATE identity_access.login_account SET version=version+1,updated_at=$2 WHERE subject_id=$1', [subject, new Date(now)]);
        await this.revoke(scope, subject, now, current ? 'PASSWORD_CHANGED' : 'PASSWORD_RESET', current);
        if (current)
            await client.query('UPDATE identity_access.auth_session SET password_version=$2 WHERE id=$1 AND subject_id=$3', [current, changed.rows[0].password_version, subject]);
    }
    async reserve(scope: TransactionScope, subject: string, operation: string, key: string, fingerprint: string) {
        const client = this.tx.client(scope);
        await client.query(`INSERT INTO identity_access.command_replay(subject,operation,key_digest,fingerprint)
      VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [subject, operation, key, fingerprint]);
        const result = await client.query(`SELECT fingerprint,sealed_result FROM identity_access.command_replay
      WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE`, [subject, operation, key]);
        return { fingerprint: result.rows[0].fingerprint, result: result.rows[0].sealed_result as string | null };
    }
    async finish(scope: TransactionScope, subject: string, operation: string, key: string, result: string) {
        await this.tx.client(scope).query(`UPDATE identity_access.command_replay SET sealed_result=$4
      WHERE subject=$1 AND operation=$2 AND key_digest=$3`, [subject, operation, key, result]);
    }
    async throttle(scope: TransactionScope, bucket: string, now: number, window: number, limit: number) {
        const result = await this.tx.client(scope).query(`INSERT INTO identity_access.auth_throttle(bucket_digest,window_start,attempts)
      VALUES($1,$2,1) ON CONFLICT(bucket_digest) DO UPDATE SET
      attempts=CASE WHEN identity_access.auth_throttle.window_start <= $3 THEN 1 ELSE identity_access.auth_throttle.attempts+1 END,
      window_start=CASE WHEN identity_access.auth_throttle.window_start <= $3 THEN $2 ELSE identity_access.auth_throttle.window_start END
      RETURNING attempts`, [bucket, new Date(now), new Date(now - window)]);
        return result.rows[0].attempts <= limit;
    }
    async saveChallenge(scope: TransactionScope, c: Challenge) {
        await this.tx.client(scope).query(`INSERT INTO identity_access.auth_challenge
      (id,organization_id,subject_id,purpose,email_digest,code_digest,max_attempts,created_at,expires_at,sealed_email)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [c.id, c.organizationId, c.subjectId, c.purpose, c.emailDigest, c.codeDigest, c.maxAttempts, new Date(c.createdAt), new Date(c.expiresAt), c.sealedEmail]);
    }
    async peekChallenge(scope: TransactionScope, id: string) {
        const r = (await this.tx.client(scope).query('SELECT * FROM identity_access.auth_challenge WHERE id=$1', [id])).rows[0];
        return r ? this.challengeRow(r) : null;
    }
    async changeEmail(scope: TransactionScope, subject: string, email: string, now: number) {
        try {
            const r = await this.tx.client(scope).query('UPDATE identity_access.login_account SET email_normalized=$2,email_verified_at=$3,updated_at=$3,version=version+1 WHERE subject_id=$1', [subject, email, new Date(now)]);
            if (r.rowCount !== 1)
                throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        }
        catch (error) {
            if ((error as {
                code?: string;
                constraint?: string;
            }).code === '23505' && (error as {
                constraint?: string;
            }).constraint === 'login_account_organization_id_email_normalized_key')
                throw new Failure('EMAIL_ALREADY_IN_USE', 409);
            throw error;
        }
    }
    async challenge(scope: TransactionScope, id: string) {
        const r = (await this.tx.client(scope).query('SELECT * FROM identity_access.auth_challenge WHERE id=$1 FOR UPDATE', [id])).rows[0];
        return r ? this.challengeRow(r) : null;
    }
    private challengeRow(r: QueryResultRow): Challenge {
        return { id: r.id, organizationId: r.organization_id, subjectId: r.subject_id, purpose: r.purpose, emailDigest: r.email_digest, sealedEmail: r.sealed_email,
            codeDigest: r.code_digest, attempts: r.attempts, maxAttempts: r.max_attempts, createdAt: r.created_at.getTime(), expiresAt: r.expires_at.getTime(), consumedAt: r.consumed_at?.getTime() ?? null };
    }
    async failChallenge(scope: TransactionScope, id: string) { await this.tx.client(scope).query('UPDATE identity_access.auth_challenge SET attempts=attempts+1 WHERE id=$1', [id]); }
    async consumeChallenge(scope: TransactionScope, id: string, now: number) {
        const result = await this.tx.client(scope).query('UPDATE identity_access.auth_challenge SET consumed_at=$2,sealed_email=NULL WHERE id=$1 AND consumed_at IS NULL', [id, new Date(now)]);
        if (result.rowCount !== 1)
            throw new Error('CHALLENGE_ALREADY_CONSUMED');
    }
    async currentStudentProjection(scope: TransactionScope, subject: string, org: string): Promise<StudentIdentity | null> {
        // One MVCC read; a display projection must not lock a second account after a Course lock.
        const r = (await this.tx.client(scope).query(`SELECT p.* FROM identity_access.student_profile p
            JOIN identity_access.login_account a ON a.subject_id=p.subject_id AND a.organization_id=p.organization_id
            JOIN identity_access.user_subject u ON u.id=p.subject_id AND u.organization_id=p.organization_id
            WHERE p.subject_id=$1 AND p.organization_id=$2 AND u.role_snapshot='STUDENT' AND u.closed_at IS NULL
            AND a.email_verified_at IS NOT NULL AND a.access_state='ACTIVE'`, [subject, org])).rows[0];
        if (!r) return null;
        if (!['FEMALE', 'MALE'].includes(r.gender) || ![1, 2, 3, 4].includes(r.grade_year)) throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        return { subjectId: r.subject_id, organizationId: r.organization_id, studentNumber: r.student_number, name: r.name, gender: r.gender,
            gradeYear: r.grade_year, college: r.college, major: r.major, administrativeClass: r.administrative_class };
    }
    async student(scope: TransactionScope, subject: string, org: string): Promise<StudentIdentity | null> {
        const r = (await this.tx.client(scope).query('SELECT * FROM identity_access.student_profile WHERE subject_id=$1 AND organization_id=$2', [subject, org])).rows[0];
        if (!r)
            return null;
        if (!['FEMALE', 'MALE'].includes(r.gender) || ![1, 2, 3, 4].includes(r.grade_year))
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        return { subjectId: r.subject_id, organizationId: r.organization_id, studentNumber: r.student_number, name: r.name, gender: r.gender, gradeYear: r.grade_year, college: r.college, major: r.major, administrativeClass: r.administrative_class };
    }
    async teacher(scope: TransactionScope, subject: string, org: string) {
        const r = (await this.tx.client(scope).query('SELECT subject_id,name FROM identity_access.teacher_profile WHERE subject_id=$1 AND organization_id=$2', [subject, org])).rows[0];
        return r ? { subjectId: r.subject_id, name: r.name } : null;
    }
}
