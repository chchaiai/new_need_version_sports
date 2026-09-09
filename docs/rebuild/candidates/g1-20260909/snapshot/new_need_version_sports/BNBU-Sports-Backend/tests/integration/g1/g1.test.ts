import { afterAll, beforeAll, expect, test } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { runner } from 'node-pg-migrate';
import { createPool } from '../../../src/shared/infrastructure/postgres.ts';
import { NodeSecrets, ScryptPasswords } from '../../../src/shared/infrastructure/crypto.ts';
import { readConfig } from '../../../src/bootstrap/config.ts';
import { createLocalMailDelivery } from '../../../src/bootstrap/local-mail.ts';
import { createG1 } from '../../../src/bootstrap/g1.ts';
import { Failure } from '../../../src/shared/application/runtime.ts';
const config = readConfig(process.env), pool = createPool(config.database), org = randomUUID(), semester = randomUUID(), template = randomUUID();
const passwords = new ScryptPasswords(), secrets = new NodeSecrets(randomBytes(32), randomBytes(32));
const start = Date.parse('2026-09-10T00:00:00Z');
let now = start, encoded: string, base: string;
const delivered: {
    email: string;
    code: string;
    purpose: string;
}[] = [];
let g1: ReturnType<typeof createG1>;
const dates = Array.from({ length: 24 }, (_, i) => Date.parse('2026-10-01T00:00:00Z') + Math.floor(i / 3) * 7 * 86400000 + (i % 3) * 86400000);
const rule = { templateVersionId: template, courseRelatedTargetMinutes: 600, otherTargetMinutes: 600, thresholdMinutes: 30 as const, weeklyCountLimit: 3 as const, allowedIntervals: dates.map(t => ({ startsAt: new Date(t).toISOString(), endsAtExclusive: new Date(t + 3600000).toISOString() })), regularCutoffAt: '2026-12-01T00:00:00Z', plannedSettlementAt: '2026-12-08T00:00:00Z' };
const command = () => ({ key: randomUUID(), requestId: randomUUID() });
async function account(role: 'TEACHER' | 'STUDENT' | 'ADMIN' = 'TEACHER', mustChange = false, organization: string = org, superId: string | null = null) {
    const id = randomUUID(), email = id + '@example.edu';
    await pool.query('INSERT INTO identity_access.user_subject(id,organization_id,role_snapshot,created_at) VALUES($1,$2,$3,$4)', [id, organization, role, new Date(now)]);
    await pool.query("INSERT INTO identity_access.login_account(subject_id,organization_id,email_normalized,email_verified_at,access_state,created_at,updated_at) VALUES($1,$2,$3,$4,'ACTIVE',$4,$4)", [id, organization, email, new Date(now)]);
    if (role === 'TEACHER')
        await pool.query('INSERT INTO identity_access.teacher_profile(subject_id,organization_id,employee_id,name) VALUES($1::uuid,$2,$1::text,$3)', [id, organization, 'Synthetic Teacher']);
    if (role === 'STUDENT')
        await pool.query("INSERT INTO identity_access.student_profile(subject_id,organization_id,student_number,name,gender,grade_year) VALUES($1::uuid,$2,$1::text,'Synthetic Student','FEMALE',1)", [id, organization]);
    if (role === 'ADMIN')
        await pool.query("INSERT INTO identity_access.admin_profile(subject_id,organization_id,admin_kind,name,login_name_normalized,created_by_super_admin_subject_id) VALUES($1,$2,$3,'Synthetic Admin',$4,$5)", [id, organization, superId ? 'SUB' : 'SUPER', superId ? email : null, superId]);
    if (role !== 'STUDENT')
        await pool.query('INSERT INTO identity_access.password_credential(subject_id,password_phc,must_change,password_version,changed_at) VALUES($1,$2,$3,0,$4)', [id, encoded, mustChange, new Date(now)]);
    return { id, email };
}
async function http(method: string, path: string, body?: unknown, token?: string, key = randomUUID()) {
    const response = await fetch(base + '/api/v1' + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Idempotency-Key': key }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() as Record<string, any>, headers: response.headers };
}
async function login(a: {
    email: string;
}, password = 'InitialA1!') { const r = await http('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: a.email, password }); expect(r.status, JSON.stringify(r.body)).toBe(201); return r.body; }
async function studentToken(a: {
    email: string;
}) { const challenge = await g1.identity.requestChallenge({ email: a.email, purpose: 'STUDENT_LOGIN' }, command()); const otp = delivered.findLast(d => d.email === a.email)!; return g1.identity.studentLogin({ otpProof: { challengeId: challenge.challengeId, code: otp.code } }, command()); }
async function publishedCourse(token: string) { const created = await http('POST', '/teacher/courses', { semesterId: semester, name: 'Synthetic Course', description: null, rule }, token); expect(created.status, JSON.stringify(created.body)).toBe(201); const id = created.body.courseId; const plan = await http('POST', '/courses/' + id + '/publication-plan', { expectedCourseVersion: 0 }, token); expect(plan.status, JSON.stringify(plan.body)).toBe(200); expect(plan.body.result).toBe('FEASIBLE'); const result = await http('POST', '/courses/' + id + '/publication', { expectedCourseVersion: 0, publicationToken: plan.body.publicationToken }, token); expect(result.status, JSON.stringify(result.body)).toBe(200); return result.body; }
async function invite(token: string, course: Record<string, any>) { const r = await http('POST', '/courses/' + course.courseId + '/invitations', { lifetimeMinutes: 5, expectedCourseVersion: course.version }, token); expect(r.status, JSON.stringify(r.body)).toBe(201); return r.body; }
beforeAll(async () => {
    expect(config.database.database).toBe('p7_foundation');
    expect(config.database.user).toBe('p7_foundation');
    expect((await pool.query('SELECT version() AS v')).rows[0].v).toContain('PostgreSQL 17.6');
    await runner({ databaseUrl: config.database, dir: 'migrations', direction: 'up', count: Infinity, migrationsTable: 'foundation_migrations', checkOrder: true, log: () => { }, logger: { info: () => { }, warn: () => { }, error: () => { } } });
    encoded = await passwords.hash('InitialA1!');
    await pool.query("INSERT INTO identity_access.organization(id,code,name,business_timezone,created_at) VALUES($1,'G1-SYNTHETIC','G1 synthetic organization','Asia/Shanghai',$2)", [org, new Date(now)]);
    await pool.query("INSERT INTO system_mode.state(organization_id,mode,policy_version,version,updated_at) VALUES($1,'NORMAL',0,0,$2)", [org, new Date(now)]);
    await pool.query("INSERT INTO academic_term.semester(id,organization_id,academic_year,term_type,display_name,start_date,end_date,status,version,created_at,updated_at) VALUES($1,$2,'2026-2027','FIRST','Synthetic Semester','2026-09-01','2027-01-31','CURRENT',0,$3,$3)", [semester, org, new Date(now)]);
    await pool.query("INSERT INTO course_enrollment.rule_template_version(id,organization_id,version_no,label_zh,label_en,published_at) VALUES($1,$2,1,'合成模板','Synthetic template',$3)", [template, org, new Date(now)]);
    g1 = createG1(pool, { organizationId: org, schoolEmailDomains: ['example.edu'], clock: { now: () => now }, secrets, passwords, dummyPasswordHash: encoded,
        permissions: { async permissions(_scope, account) {
                if (account.adminKind !== 'SUPER')
                    throw new Failure('DEPENDENCY_UNAVAILABLE', 503);
                return ['COURSE_VIEW', 'SEMESTER', 'USERS_ACCOUNTS', 'FEEDBACK', 'GLOBAL_RULES', 'SYSTEM_MODE', 'HELP_CENTER', 'AUDIT_QUERY'];
            } },
        // Strict test-only adapters. Neither is imported by production bootstrap or evidence marked live delivery/calendar.
        delivery: { async send(email, code, purpose) { delivered.push({ email, code, purpose }); } },
        calendar: { async catalog(_scope, term, r) { expect(term.id).toBe(semester); expect(r.templateVersionId).toBe(template); return { version: 'SYNTHETIC-OWNER-CALENDAR-v1', complete: true, slots: dates.flatMap((t, i) => ['COURSE_RELATED', 'OTHER'].map(category => ({ id: i + '/' + category, category: category as 'COURSE_RELATED' | 'OTHER', startsAt: t, endsAtExclusive: t + 3600000 }))) }; } }
    });
    base = await g1.app.listen({ host: '127.0.0.1', port: 0 });
});
afterAll(async () => { await g1?.app.close(); await pool.end(); });
test('real HTTP health and schema reject malformed auth without leaking internals', async () => {
    expect((await fetch(base + '/health/ready')).status).toBe(200);
    const r = await http('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: 'x', password: 'x', unknown: true });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('INVALID_REQUEST');
    expect(r.headers.get('cache-control')).toBe('no-store');
});
test('first-password gate, nonempty personal password, exact replay and other-session revocation', async () => {
    const a = await account('TEACHER', true), first = await login(a), other = await login(a);
    expect((await http('POST', '/teacher/courses', { semesterId: semester, name: 'Blocked', description: null, rule }, first.accessToken)).body.code).toBe('FIRST_PASSWORD_CHANGE_REQUIRED');
    const key = randomUUID(), body = { currentPassword: 'InitialA1!', newPassword: 'x', expectedVersion: 0 };
    const changed = await http('PUT', '/me/password', body, first.accessToken, key);
    expect(changed.status).toBe(200);
    expect(changed.body.mustChangePassword).toBe(false);
    expect((await http('PUT', '/me/password', body, first.accessToken, key)).body).toEqual(changed.body);
    expect((await http('GET', '/me', undefined, other.accessToken)).status).toBe(401);
    expect((await http('GET', '/me', undefined, first.accessToken)).status).toBe(200);
    await login(a, 'x');
});
test('refresh rotation is atomic; duplicate exact key returns original tokens and old refresh cannot rotate again', async () => {
    const a = await account(), pair = await login(a), key = randomUUID(), body = { refreshToken: pair.refreshToken };
    const [left, right] = await Promise.all([http('POST', '/auth/sessions/refresh', body, undefined, key), http('POST', '/auth/sessions/refresh', body, undefined, key)]);
    expect(left.status).toBe(200);
    expect(secrets.digest('replay', right.body)).toEqual(secrets.digest('replay', left.body));
    expect(left.body.refreshToken === pair.refreshToken).toBe(false);
    expect((await http('POST', '/auth/sessions/refresh', body)).status).toBe(401);
    expect((await http('GET', '/me', undefined, pair.accessToken)).status).toBe(401);
});
test('logout replay is stable; disabled accounts reject existing access and correct-password login', async () => {
    const a = await account(), p = await login(a), key = randomUUID();
    expect((await http('POST', '/auth/sessions/current/logout', undefined, p.accessToken, key)).status).toBe(200);
    expect((await http('POST', '/auth/sessions/current/logout', undefined, p.accessToken, key)).status).toBe(200);
    const p2 = await login(a);
    await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED' WHERE subject_id=$1", [a.id]);
    // getCurrentActor declares FORBIDDEN; password login separately declares ACCOUNT_DISABLED.
    expect((await http('GET', '/me', undefined, p2.accessToken)).body.code).toBe('FORBIDDEN');
    expect((await http('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: a.email, password: 'InitialA1!' })).body.code).toBe('ACCOUNT_DISABLED');
});
test('OTP proof is purpose-bound, one-use; reset revokes all old sessions and accepts a one-character password', async () => {
    const a = await account(), p = await login(a), challenge = await g1.identity.requestChallenge({ email: a.email, purpose: 'PASSWORD_RESET' }, command()), code = delivered.findLast(d => d.email === a.email)!.code;
    expect((await http('POST', '/auth/sessions/student', { otpProof: { challengeId: challenge.challengeId, code } })).status).toBe(401);
    expect((await http('POST', '/auth/password/reset', { otpProof: { challengeId: challenge.challengeId, code }, newPassword: 'z' })).status).toBe(200);
    expect((await http('GET', '/me', undefined, p.accessToken)).status).toBe(401);
    await login(a, 'z');
    expect((await http('POST', '/auth/password/reset', { otpProof: { challengeId: challenge.challengeId, code }, newPassword: 'q' })).body.code).toBe('CHALLENGE_EXPIRED');
});
test('failed OTP attempts persist across rejected transactions and reach rate limit', async () => {
    const a = await account('STUDENT'), c = await g1.identity.requestChallenge({ email: a.email, purpose: 'STUDENT_LOGIN' }, command());
    for (let i = 0; i < 5; i++)
        expect((await http('POST', '/auth/sessions/student', { otpProof: { challengeId: c.challengeId, code: 'wrong' } })).status).toBe(401);
    expect((await http('POST', '/auth/sessions/student', { otpProof: { challengeId: c.challengeId, code: 'wrong' } })).body.code).toBe('RATE_LIMITED');
});
test('maintenance blocks teachers including password changes; restoration does not clear first-change gate', async () => {
    const a = await account('TEACHER', true), p = await login(a);
    await pool.query(`UPDATE system_mode.state SET mode='MAINTENANCE',announcement=$2 WHERE organization_id=$1`, [org, JSON.stringify({ titleZh: '维护', titleEn: 'Maintenance', bodyZh: '维护中', bodyEn: 'Maintenance', estimatedRecoveryAt: '2026-09-11T00:00:00Z' })]);
    try {
        // This mixed-role security operation uses FORBIDDEN for a teacher during maintenance.
        expect((await http('PUT', '/me/password', { currentPassword: 'InitialA1!', newPassword: 'x', expectedVersion: 0 }, p.accessToken)).body.code).toBe('FORBIDDEN');
    }
    finally {
        await pool.query("UPDATE system_mode.state SET mode='NORMAL',announcement=NULL WHERE organization_id=$1", [org]);
    }
    expect((await http('GET', '/me', undefined, p.accessToken)).body.mustChangePassword).toBe(true);
});
test('audit database failure rolls back credential, version and session changes', async () => {
    const a = await account(), p = await login(a), other = await login(a), auditKey = command();
    await pool.query(`CREATE FUNCTION public.g1_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PASSWORD_CHANGED' THEN RAISE EXCEPTION 'INJECTED_AUDIT_FAILURE'; END IF; RETURN NEW; END $$`);
    await pool.query('CREATE TRIGGER g1_fail_audit BEFORE INSERT ON audit.audit_event FOR EACH ROW EXECUTE FUNCTION public.g1_fail_audit()');
    try {
        expect((await http('PUT', '/me/password', { currentPassword: 'InitialA1!', newPassword: 'x', expectedVersion: 0 }, p.accessToken, auditKey.key)).status).toBe(500);
    }
    finally {
        await pool.query('DROP TRIGGER g1_fail_audit ON audit.audit_event');
        await pool.query('DROP FUNCTION public.g1_fail_audit()');
    }
    expect((await http('GET', '/me', undefined, other.accessToken)).status).toBe(200);
    expect((await http('GET', '/me', undefined, p.accessToken)).body.version).toBe(0);
    await login(a);
});
test('course publication is frozen and another teacher has no resource authority', async () => {
    const p = await login(await account()), other = await login(await account()), c = await publishedCourse(p.accessToken);
    expect((await http('GET', '/courses/' + c.courseId, undefined, other.accessToken)).status).toBe(403);
    expect((await http('POST', '/courses/' + c.courseId + '/draft-rule', { rule, expectedVersion: c.version }, p.accessToken)).body.code).toBe('COURSE_RULES_LOCKED');
    await expect(pool.query("UPDATE course_enrollment.course SET rule=jsonb_set(rule,'{thresholdMinutes}','45') WHERE id=$1", [c.courseId])).rejects.toThrow('COURSE_RULES_LOCKED');
});
test('concurrent joins across courses create exactly one active membership and one committed result', async () => {
    const p = await login(await account()), c1 = await publishedCourse(p.accessToken), c2 = await publishedCourse(p.accessToken), i1 = await invite(p.accessToken, c1), i2 = await invite(p.accessToken, c2), s = await account('STUDENT'), sp = await studentToken(s);
    const flow1 = await g1.courses.registerExisting(sp.accessToken, i1.invitationCode, { expectedAccountVersion: 0 }, command()), flow2 = await g1.courses.registerExisting(sp.accessToken, i2.invitationCode, { expectedAccountVersion: 0 }, command());
    const results = await Promise.allSettled([g1.courses.join(sp.accessToken, i1.invitationCode, { expectedAccountVersion: 0, flowId: flow1.id }, command()), g1.courses.join(sp.accessToken, i2.invitationCode, { expectedAccountVersion: 0, flowId: flow2.id }, command())]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect((await pool.query("SELECT count(*)::integer AS n FROM course_enrollment.enrollment WHERE student_subject_id=$1 AND status='ACTIVE'", [s.id])).rows[0].n).toBe(1);
});
test('natural expiry preserves only the registered fixed grace; course closure blocks new starts but preserves old provenance', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), s = await account('STUDENT'), sp = await studentToken(s);
    const flow = await g1.courses.registerExisting(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0 }, command());
    now += 5 * 60000;
    try {
        expect((await g1.courses.preview(i.invitationCode)).status).toBe('EXPIRED');
        const e = await g1.courses.join(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command());
        expect(e.status).toBe('ACTIVE');
        const closed = await http('POST', '/courses/' + c.courseId + '/closure', { expectedVersion: c.version, reason: 'End admissions' }, p.accessToken);
        expect(closed.status, JSON.stringify(closed.body)).toBe(200);
        await expect(g1.transactions.run(scope => g1.courses.assertSessionStart(scope, org, c.courseId, s.id, now))).rejects.toThrow('COURSE_NOT_OPEN');
        await expect(g1.transactions.run(scope => g1.courses.assertExistingChain(scope, org, c.courseId, start + 1))).resolves.toMatchObject({ status: 'CLOSED' });
        await expect(g1.transactions.run(scope => g1.courses.assertExistingChain(scope, org, c.courseId, now))).rejects.toThrow('COURSE_NOT_OPEN');
    }
    finally {
        now = start;
    }
});
test('invitation raw code and credentials are absent from ordinary rows and safe audit events', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c);
    const rows = (await pool.query('SELECT row_to_json(i)::text AS j FROM course_enrollment.course_invitation i WHERE id=$1', [i.invitation.invitationId])).rows;
    expect(rows[0].j).not.toContain(i.invitationCode);
    const events = JSON.stringify((await pool.query('SELECT * FROM audit.audit_event')).rows);
    expect(events).not.toContain('InitialA1!');
    expect(events).not.toContain(p.accessToken);
    expect(events).not.toContain(i.invitationCode);
    const replayRows = JSON.stringify((await pool.query('SELECT * FROM identity_access.command_replay')).rows);
    expect(replayRows).not.toContain(p.accessToken);
    expect(replayRows).not.toContain('InitialA1!');
});
test('refresh exact replay after account disable fails closed', async () => {
    const a = await account(), p = await login(a), key = randomUUID(), body = { refreshToken: p.refreshToken };
    expect((await http('POST', '/auth/sessions/refresh', body, undefined, key)).status).toBe(200);
    await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED' WHERE subject_id=$1", [a.id]);
    expect((await http('POST', '/auth/sessions/refresh', body, undefined, key)).body.code).toBe('ACCOUNT_DISABLED');
});
test('new registration requires bound flow AND email proof; exact replay does not create duplicate identity/enrollment', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), email = randomUUID() + '@example.edu';
    const flow = await http('POST', '/course-invitations/' + i.invitationCode + '/new-student-flows', { clientFlowNonce: randomBytes(32).toString('hex') });
    expect(flow.status).toBe(200);
    const challenge = await g1.identity.requestChallenge({ purpose: 'STUDENT_EMAIL_BINDING', email }, command()), otp = delivered.findLast(d => d.email === email)!.code;
    const body = { name: 'Synthetic New Student', studentNumber: randomUUID(), gender: 'MALE', gradeYear: 2, college: null, major: null, administrativeClass: null, verifiedEmail: email, emailOtpProof: { challengeId: challenge.challengeId, code: otp }, flowId: flow.body.flow.flowId, flowAuthorization: flow.body.flowAuthorization }, key = randomUUID();
    const denied = await http('POST', '/course-invitations/' + i.invitationCode + '/student-registration', { ...body, flowAuthorization: 'unrelated' });
    expect(denied.body.code).toBe('INVITATION_FLOW_MISMATCH');
    const result = await http('POST', '/course-invitations/' + i.invitationCode + '/student-registration', body, undefined, key);
    expect(result.status, JSON.stringify(result.body)).toBe(201);
    const again = await http('POST', '/course-invitations/' + i.invitationCode + '/student-registration', body, undefined, key);
    expect(again.status).toBe(201);
    expect(secrets.digest('registration', again.body)).toEqual(secrets.digest('registration', result.body));
    expect((await pool.query('SELECT count(*)::integer AS n FROM identity_access.login_account WHERE email_normalized=$1', [email])).rows[0].n).toBe(1);
    expect((await pool.query('SELECT count(*)::integer AS n FROM course_enrollment.enrollment WHERE student_subject_id=$1', [result.body.actor.userId])).rows[0].n).toBe(1);
});
test('notification failure rolls back the entire new-account and enrollment transaction including OTP consumption', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), email = randomUUID() + '@example.edu';
    const f = await g1.courses.registerNew(i.invitationCode, { clientFlowNonce: randomBytes(32).toString('hex') }, command()), challenge = await g1.identity.requestChallenge({ purpose: 'STUDENT_EMAIL_BINDING', email }, command()), otp = delivered.findLast(d => d.email === email)!.code;
    const body = { name: 'Synthetic Rollback', studentNumber: randomUUID(), gender: 'MALE' as const, gradeYear: 2, college: null, major: null, administrativeClass: null, verifiedEmail: email, emailOtpProof: { challengeId: challenge.challengeId, code: otp }, flowId: f.flow.id, flowAuthorization: f.flowAuthorization };
    await pool.query("CREATE FUNCTION public.g1_fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_NOTICE_FAILURE'; END $$");
    await pool.query('CREATE TRIGGER g1_fail_notice BEFORE INSERT ON notification_center.in_app_notification FOR EACH ROW EXECUTE FUNCTION public.g1_fail_notice()');
    try {
        await expect(g1.courses.registerStudent(i.invitationCode, body, command())).rejects.toThrow('INJECTED_NOTICE_FAILURE');
    }
    finally {
        await pool.query('DROP TRIGGER g1_fail_notice ON notification_center.in_app_notification');
        await pool.query('DROP FUNCTION public.g1_fail_notice()');
    }
    expect((await pool.query('SELECT count(*)::integer AS n FROM identity_access.login_account WHERE email_normalized=$1', [email])).rows[0].n).toBe(0);
    expect((await pool.query('SELECT consumed_at FROM identity_access.auth_challenge WHERE id=$1', [challenge.challengeId])).rows[0].consumed_at).toBeNull();
    await expect(g1.courses.registerStudent(i.invitationCode, body, command())).resolves.toHaveProperty('accessToken');
});
test('revocation terminates a registered grace and exact end of grace rejects acceptance', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), s = await account('STUDENT'), sp = await studentToken(s), f = await g1.courses.registerExisting(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0 }, command());
    await g1.courses.revokeInvitation(p.accessToken, c.courseId, i.invitation.invitationId, { expectedVersion: 0 }, command());
    await expect(g1.courses.join(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0, flowId: f.id }, command())).rejects.toThrow('INVITATION_FLOW_TERMINATED');
    const next = await invite(p.accessToken, c), flow = await g1.courses.registerExisting(sp.accessToken, next.invitationCode, { expectedAccountVersion: 0 }, command());
    now += 15 * 60000;
    try {
        const fresh = await studentToken(s);
        await expect(g1.courses.join(fresh.accessToken, next.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command())).rejects.toThrow('INVITATION_FLOW_EXPIRED');
    }
    finally {
        now = start;
    }
});
test('removal frees the unique course; restoring into a second active course is rejected', async () => {
    const p = await login(await account()), c1 = await publishedCourse(p.accessToken), c2 = await publishedCourse(p.accessToken), i1 = await invite(p.accessToken, c1), i2 = await invite(p.accessToken, c2), s = await account('STUDENT'), sp = await studentToken(s);
    const f = await g1.courses.registerExisting(sp.accessToken, i1.invitationCode, { expectedAccountVersion: 0 }, command());
    const e = await g1.courses.join(sp.accessToken, i1.invitationCode, { expectedAccountVersion: 0, flowId: f.id }, command());
    await g1.courses.transitionMember(p.accessToken, c1.courseId, e.id, false, { expectedVersion: 0, studentVisibleReason: 'Transfer' }, command());
    const f2 = await g1.courses.registerExisting(sp.accessToken, i2.invitationCode, { expectedAccountVersion: 0 }, command());
    await g1.courses.join(sp.accessToken, i2.invitationCode, { expectedAccountVersion: 0, flowId: f2.id }, command());
    await expect(g1.courses.transitionMember(p.accessToken, c1.courseId, e.id, true, { expectedVersion: 1, studentVisibleReason: 'Restore' }, command())).rejects.toThrow('COURSE_ALREADY_JOINED');
    expect((await pool.query('SELECT status FROM course_enrollment.enrollment WHERE id=$1', [e.id])).rows[0].status).toBe('REMOVED');
});
test('student course and notification projections exclude teacher metadata and reject unsafe historical message content', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), s = await account('STUDENT'), sp = await studentToken(s), flow = await g1.courses.registerExisting(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0 }, command());
    await g1.courses.join(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command());
    const course = await http('GET', '/student/course', undefined, sp.accessToken);
    expect(course.status).toBe(200);
    expect(course.body).not.toHaveProperty('version');
    expect(course.body).not.toHaveProperty('status');
    expect(course.body).not.toHaveProperty('activeMemberCount');
    expect((await http('GET', '/notifications', undefined, sp.accessToken)).status).toBe(403);
    const notices = await http('GET', '/student/notifications', undefined, sp.accessToken);
    expect(notices.status).toBe(200);
    expect(notices.body.items).toHaveLength(1);
    const notice = notices.body.items[0];
    const first = await http('POST', '/student/notifications/' + notice.notificationId + '/read', undefined, sp.accessToken);
    expect(first.status).toBe(200);
    expect((await http('POST', '/student/notifications/' + notice.notificationId + '/read', undefined, sp.accessToken)).body.readAt).toBe(first.body.readAt);
    await pool.query("UPDATE notification_center.in_app_notification SET body='Final grade 99' WHERE id=$1", [notice.notificationId]);
    expect((await http('GET', '/student/notifications', undefined, sp.accessToken)).body.items).toHaveLength(0);
    expect((await http('POST', '/student/notifications/' + notice.notificationId + '/read', undefined, sp.accessToken)).status).toBe(404);
});
test('authorized committed course closure replays during maintenance; a new write still fails', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), key = randomUUID(), body = { expectedVersion: c.version, reason: 'Close course' };
    const closed = await http('POST', '/courses/' + c.courseId + '/closure', body, p.accessToken, key);
    expect(closed.status).toBe(200);
    await pool.query('UPDATE system_mode.state SET mode=\'MAINTENANCE\',announcement=$2 WHERE organization_id=$1', [org, JSON.stringify({ titleZh: '维护', titleEn: 'Maintenance', bodyZh: '维护中', bodyEn: 'Maintenance', estimatedRecoveryAt: '2026-09-11T00:00:00Z' })]);
    try {
        const again = await http('POST', '/courses/' + c.courseId + '/closure', body, p.accessToken, key);
        expect(again.status).toBe(200);
        expect(again.body).toEqual(closed.body);
        expect((await http('POST', '/courses/' + c.courseId + '/closure', body, p.accessToken)).body.code).toBe('SYSTEM_MAINTENANCE');
        expect((await http('GET', '/system-mode')).body.mode).toBe('MAINTENANCE');
    }
    finally {
        await pool.query("UPDATE system_mode.state SET mode='NORMAL',announcement=NULL WHERE organization_id=$1", [org]);
    }
});
test('named makeup windows cannot extend closeout or grant another enrollment', async () => {
    const p = await login(await account()), c = await publishedCourse(p.accessToken), i = await invite(p.accessToken, c), s = await account('STUDENT'), sp = await studentToken(s), f = await g1.courses.registerExisting(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0 }, command()), e = await g1.courses.join(sp.accessToken, i.invitationCode, { expectedAccountVersion: 0, flowId: f.id }, command());
    const body = { enrollmentId: e.id, startsAt: '2026-12-02T00:00:00Z', endsAtExclusive: '2026-12-02T01:00:00Z', expectedCourseVersion: c.version };
    expect((await http('POST', '/courses/' + c.courseId + '/makeup-authorizations', body, p.accessToken)).status).toBe(200);
    expect((await http('POST', '/courses/' + c.courseId + '/makeup-authorizations', { ...body, endsAtExclusive: '2026-12-09T00:00:00Z' }, p.accessToken)).body.code).toBe('MAKEUP_NOT_ALLOWED');
    expect((await http('GET', '/student/makeup-authorizations', undefined, sp.accessToken)).body.items).toHaveLength(1);
    await expect(g1.transactions.run(scope => g1.courses.assertSessionStart(scope, org, c.courseId, s.id, Date.parse(body.startsAt)))).resolves.toHaveProperty('ruleVersionId');
});
async function modeWorld() {
    const organization = randomUUID(), granted = new Set<string>(), modeDelivery: {
        email: string;
        code: string;
    }[] = [];
    let tick = start;
    await pool.query("INSERT INTO identity_access.organization(id,code,name,business_timezone,created_at) VALUES($1::uuid,$1::text,'Mode synthetic','Asia/Shanghai',$2)", [organization, new Date(tick)]);
    await pool.query("INSERT INTO system_mode.state(organization_id,mode,policy_version,version,updated_at) VALUES($1,'NORMAL',0,0,$2)", [organization, new Date(tick)]);
    const server = createG1(pool, { organizationId: organization, schoolEmailDomains: ['example.edu'], clock: { now: () => tick }, secrets, passwords, dummyPasswordHash: encoded,
        permissions: { async permissions(_scope, a) { return a.adminKind === 'SUPER' || granted.has(a.subjectId) ? ['SYSTEM_MODE'] : []; } },
        delivery: { async send(email, code) { modeDelivery.push({ email, code }); } },
        calendar: { async catalog() { throw new Failure('DEPENDENCY_UNAVAILABLE', 503); } } });
    const url = await server.app.listen({ host: '127.0.0.1', port: 0 });
    const admin = await account('ADMIN', false, organization);
    async function signIn(a: {
        email: string;
    }, kind = 'ADMIN_EMAIL') {
        return server.identity.passwordLogin({ loginType: kind, identifier: a.email, password: 'InitialA1!' }, command());
    }
    async function call(method: string, path: string, body?: unknown, token?: string, key = randomUUID()) {
        const r = await fetch(url + '/api/v1' + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Idempotency-Key': key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: r.status, body: await r.json() as Record<string, any> };
    }
    return { organization, server, admin, granted, signIn, call, modeDelivery, setTime: (n: number) => { tick = n; } };
}
const modeAnnouncement = { titleZh: '计划维护', titleEn: 'Scheduled maintenance', bodyZh: '维护中，请等待恢复。', bodyEn: 'Please wait for recovery.', estimatedRecoveryAt: '2026-09-10T00:00:02Z' };
const entering = (version = 0) => ({ targetMode: 'MAINTENANCE' as const, reason: 'Scheduled maintenance with explicit recovery', expectedVersion: version, announcement: modeAnnouncement });
test('mode transitions expose complete actual pauses and never use the estimated recovery as an end', async () => {
    const w = await modeWorld();
    try {
        const token = (await w.signIn(w.admin)).accessToken;
        expect((await w.call('GET', '/admin/system-mode/transitions', undefined, 'invalid')).body.code).toBe('AUTHENTICATION_REQUIRED');
        expect((await w.call('POST', '/admin/system-mode/transitions', { ...entering(), announcement: { ...modeAnnouncement, titleZh: '   ' } }, token)).body.code).toBe('MAINTENANCE_ANNOUNCEMENT_REQUIRED');
        expect((await w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, w.organization))).periods).toEqual([]);
        w.setTime(start + 1000);
        const begin = await w.call('POST', '/admin/system-mode/transitions', entering(), token);
        expect(begin.status, JSON.stringify(begin.body)).toBe(201);
        w.setTime(start + 5000);
        const paused = await w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, w.organization));
        expect(paused).toMatchObject({ currentMode: 'MAINTENANCE', modeVersion: 1, observedAt: start + 5000, periods: [{ startedAt: start + 1000, endedAt: null, endTransitionId: null }] });
        expect((await w.call('GET', '/system-mode')).body.mode).toBe('MAINTENANCE');
        const end = await w.call('POST', '/admin/system-mode/transitions', { targetMode: 'NORMAL', reason: 'Service verified', expectedVersion: 1 }, token);
        expect(end.status, JSON.stringify(end.body)).toBe(201);
        w.setTime(start + 6000);
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(2), token)).status).toBe(201);
        w.setTime(start + 9000);
        expect((await w.call('POST', '/admin/system-mode/transitions', { targetMode: 'NORMAL', reason: 'Recovered again', expectedVersion: 3 }, token)).status).toBe(201);
        const restored = await w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, w.organization));
        expect(restored.periods.map(p => [p.startedAt, p.endedAt])).toEqual([[start + 1000, start + 5000], [start + 6000, start + 9000]]);
        expect(restored.periods[0]!.startTransitionId).toBe(begin.body.transition.transitionId);
        const page = await w.call('GET', '/admin/system-mode/transitions?limit=1', undefined, token);
        expect(page.status).toBe(200);
        expect(page.body.items[0].sequenceNumber).toBe(4);
        const next = await w.call('GET', '/admin/system-mode/transitions?limit=1&cursor=' + encodeURIComponent(page.body.page.nextCursor), undefined, token);
        expect(next.body.items[0].sequenceNumber).toBe(3);
        expect((await w.call('GET', '/admin/system-mode/transitions?cursor=invalid', undefined, token)).body.code).toBe('INVALID_CURSOR');
        await expect(pool.query('DELETE FROM system_mode.transition WHERE organization_id=$1', [w.organization])).rejects.toThrow('APPEND_ONLY_FACT');
    }
    finally {
        await w.server.app.close();
    }
});
test('mode governance checks live role, first password, delegated permission and disable state', async () => {
    const w = await modeWorld();
    try {
        const teacher = await account('TEACHER', false, w.organization), teacherToken = (await w.signIn(teacher, 'TEACHER_EMAIL')).accessToken;
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(), teacherToken)).body.code).toBe('FORBIDDEN');
        const sub = await account('ADMIN', false, w.organization, w.admin.id), subToken = (await w.signIn(sub, 'ADMIN_LOGIN_NAME')).accessToken;
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(), subToken)).body.code).toBe('FORBIDDEN');
        w.granted.add(sub.id);
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(), subToken)).status).toBe(201);
        w.granted.delete(sub.id);
        expect((await w.call('GET', '/admin/system-mode/transitions', undefined, subToken)).body.code).toBe('FORBIDDEN');
        const mainToken = (await w.signIn(w.admin)).accessToken;
        const first = await account('ADMIN', true, w.organization, w.admin.id);
        w.granted.add(first.id);
        const firstToken = (await w.signIn(first, 'ADMIN_LOGIN_NAME')).accessToken;
        expect((await w.call('GET', '/admin/system-mode/transitions', undefined, firstToken)).body.code).toBe('FIRST_PASSWORD_CHANGE_REQUIRED');
        await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED' WHERE subject_id=$1", [w.admin.id]);
        expect((await w.call('POST', '/admin/system-mode/transitions', { targetMode: 'NORMAL', reason: 'Recover', expectedVersion: 1 }, mainToken)).body.code).toBe('FORBIDDEN');
        expect((await w.call('GET', '/system-mode')).body.mode).toBe('MAINTENANCE');
    }
    finally {
        await w.server.app.close();
    }
});
test('concurrent authorized mode switches serialize without lock-upgrade deadlocks; exact replay stays scoped', async () => {
    const w = await modeWorld();
    try {
        const sub = await account('ADMIN', false, w.organization, w.admin.id);
        w.granted.add(sub.id);
        const tokens = [(await w.signIn(w.admin)).accessToken, (await w.signIn(sub, 'ADMIN_LOGIN_NAME')).accessToken], keys = [randomUUID(), randomUUID()];
        const results = await Promise.all(tokens.map((token, i) => w.call('POST', '/admin/system-mode/transitions', entering(), token, keys[i])));
        expect(results.map(r => r.status).sort()).toEqual([201, 412]);
        const win = results.findIndex(r => r.status === 201), token = tokens[win]!, key = keys[win]!;
        const repeat = await w.call('POST', '/admin/system-mode/transitions', entering(), token, key);
        expect(repeat).toEqual(results[win]);
        expect(await w.call('POST', '/admin/system-mode/transitions', { ...entering(), reason: '  ' + entering().reason + '  ', announcement: { ...modeAnnouncement, estimatedRecoveryAt: '2026-09-10T00:00:02.000Z' } }, token, key)).toEqual(results[win]);
        expect((await w.call('POST', '/admin/system-mode/transitions', { ...entering(), reason: 'Different command' }, token, key)).body.code).toBe('IDEMPOTENCY_KEY_REUSED');
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(1), token)).body.code).toBe('SYSTEM_MODE_UNCHANGED');
        expect((await pool.query('SELECT count(*)::integer AS n FROM system_mode.transition WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(1);
    }
    finally {
        await w.server.app.close();
    }
});
for (const failure of ['audit', 'notification'] as const)
    test('mode ' + failure + ' failure rolls back state, immutable transition, recipients and command receipt', async () => {
        const w = await modeWorld();
        const table = failure === 'audit' ? 'audit.audit_event' : 'notification_center.in_app_notification';
        try {
            await account('STUDENT', false, w.organization);
            const token = (await w.signIn(w.admin)).accessToken, key = randomUUID();
            await pool.query("CREATE FUNCTION public.g1_fail_mode() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_MODE_FAILURE'; END $$");
            await pool.query('CREATE TRIGGER g1_fail_mode BEFORE INSERT ON ' + table + ' FOR EACH ROW EXECUTE FUNCTION public.g1_fail_mode()');
            try {
                expect((await w.call('POST', '/admin/system-mode/transitions', entering(), token, key)).status).toBe(500);
            }
            finally {
                await pool.query('DROP TRIGGER g1_fail_mode ON ' + table);
                await pool.query('DROP FUNCTION public.g1_fail_mode()');
            }
            expect((await w.call('GET', '/system-mode')).body).toMatchObject({ mode: 'NORMAL', version: 0 });
            expect((await pool.query('SELECT count(*)::integer AS n FROM system_mode.transition WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0);
            expect((await pool.query('SELECT count(*)::integer AS n FROM system_mode.command_replay WHERE subject=$1', [w.admin.id])).rows[0].n).toBe(0);
            expect((await pool.query('SELECT count(*)::integer AS n FROM notification_center.in_app_notification WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0);
            expect((await w.call('POST', '/admin/system-mode/transitions', entering(), token, key)).status).toBe(201);
        }
        finally {
            await w.server.app.close();
        }
    });
test('mode notifications use fixed safe templates and transaction recipients; student projections accept only exact templates', async () => {
    const w = await modeWorld();
    try {
        const teacher = await account('TEACHER', false, w.organization), student = await account('STUDENT', false, w.organization), token = (await w.signIn(w.admin)).accessToken;
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(), token)).status).toBe(201);
        expect((await w.call('POST', '/admin/system-mode/transitions', { targetMode: 'NORMAL', reason: 'Verified recovery', expectedVersion: 1 }, token)).status).toBe(201);
        const teacherToken = (await w.signIn(teacher, 'TEACHER_EMAIL')).accessToken;
        const notices = await w.call('GET', '/notifications', undefined, teacherToken);
        expect(notices.status).toBe(200);
        expect(notices.body.items).toHaveLength(2);
        expect(notices.body.items.every((n: any) => n.targetRoute === 'SYSTEM_MODE' && n.targetId === null)).toBe(true);
        expect((await pool.query('SELECT count(*)::integer AS n FROM notification_center.in_app_notification WHERE recipient_subject_id=$1', [student.id])).rows[0].n).toBe(2);
        const publicRows = JSON.stringify(notices.body);
        expect(publicRows).not.toContain('Scheduled maintenance with explicit recovery');
        expect(publicRows).not.toContain(w.admin.email);
        const challenge = await w.server.identity.requestChallenge({ purpose: 'STUDENT_LOGIN', email: student.email }, command());
        const studentToken = (await w.server.identity.studentLogin({ otpProof: { challengeId: challenge.challengeId, code: w.modeDelivery.find(d => d.email === student.email)!.code } }, command())).accessToken;
        await pool.query(`INSERT INTO notification_center.in_app_notification(id,organization_id,recipient_subject_id,event_key,notification_type,title,body,target_route,created_at)
            VALUES($1::uuid,$2,$3,$1::text,'SYSTEM_MODE','系统已恢复 / System restored','Grade: 99','SYSTEM_MODE',$4)`, [randomUUID(), w.organization, student.id, new Date(start)]);
        expect((await w.call('GET', '/student/notifications', undefined, studentToken)).body.items).toHaveLength(2);
        expect((await w.call('GET', '/student/notifications/unread-count', undefined, studentToken)).body.unreadCount).toBe(2);
        expect((await w.call('GET', '/notifications', undefined, studentToken)).body.code).toBe('FORBIDDEN');
    }
    finally {
        await w.server.app.close();
    }
});
test('mode timeline rejects missing, inconsistent or clock-regressed facts instead of returning a false empty pause list', async () => {
    const w = await modeWorld();
    try {
        await expect(w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, randomUUID()))).rejects.toThrow('DEPENDENCY_UNAVAILABLE');
        const token = (await w.signIn(w.admin)).accessToken;
        w.setTime(start + 1000);
        expect((await w.call('POST', '/admin/system-mode/transitions', entering(), token)).status).toBe(201);
        w.setTime(start);
        await expect(w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, w.organization))).rejects.toThrow('DEPENDENCY_UNAVAILABLE');
        w.setTime(start + 1000);
        await pool.query("UPDATE system_mode.state SET mode='NORMAL',announcement=NULL WHERE organization_id=$1", [w.organization]);
        await expect(w.server.transactions.run(s => w.server.modeGovernance.maintenance(s, w.organization))).rejects.toThrow('DEPENDENCY_UNAVAILABLE');
    }
    finally {
        await w.server.app.close();
    }
});
async function admissionFixture() {
    const teacher = await account(), p = await login(teacher), course = await publishedCourse(p.accessToken), invitation = await invite(p.accessToken, course), student = await account('STUDENT'), pair = await studentToken(student), flow = await g1.courses.registerExisting(pair.accessToken, invitation.invitationCode, { expectedAccountVersion: 0 }, command()), enrollment = await g1.courses.join(pair.accessToken, invitation.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command());
    const grant = await g1.courses.authorizeMakeup(p.accessToken, course.courseId, { enrollmentId: enrollment.id, startsAt: Date.parse('2026-12-02T00:00:00Z'), endsAtExclusive: Date.parse('2026-12-02T01:00:00Z'), expectedCourseVersion: course.version }, command());
    return { teacher, course, student, enrollment, grant, invitation, p };
}
test('session admission binds live student, exact rule and normal interval without substituting an arbitrary grant', async () => {
    const f = await admissionFixture();
    now = dates[0]!;
    try {
        const token = (await studentToken(f.student)).accessToken;
        const input = { accessToken: token, courseId: f.course.courseId, expectedRuleVersionId: f.course.publishedRule.ruleVersionId, makeupAuthorizationId: null };
        const result = await g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input));
        expect(result).toMatchObject({ studentSubjectId: f.student.id, enrollmentId: f.enrollment.id, admittedAt: now, makeupAuthorization: null });
        expect(result.course.ruleVersionId).toBe(input.expectedRuleVersionId);
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, expectedRuleVersionId: randomUUID() }))).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 412 });
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, makeupAuthorizationId: randomUUID() }))).rejects.toMatchObject({ code: 'MAKEUP_NOT_ALLOWED', status: 409 });
        const teacherToken = (await login(f.teacher)).accessToken;
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, accessToken: teacherToken }))).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
        await pool.query('UPDATE identity_access.login_account SET email_verified_at=NULL WHERE subject_id=$1', [f.student.id]);
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input))).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    }
    finally {
        now = start;
    }
});
test('session admission validates named makeup id, enrollment, course and rule; null never uses a grace grant', async () => {
    const f = await admissionFixture(), other = await admissionFixture();
    const peer = await account('STUDENT'), peerToken = (await studentToken(peer)).accessToken, peerFlow = await g1.courses.registerExisting(peerToken, f.invitation.invitationCode, { expectedAccountVersion: 0 }, command()), peerEnrollment = await g1.courses.join(peerToken, f.invitation.invitationCode, { expectedAccountVersion: 0, flowId: peerFlow.id }, command());
    const peerGrant = await g1.courses.authorizeMakeup(f.p.accessToken, f.course.courseId, { enrollmentId: peerEnrollment.id, startsAt: f.grant.startsAt, endsAtExclusive: f.grant.endsAtExclusive, expectedCourseVersion: f.course.version }, command());
    now = f.grant.startsAt;
    try {
        const token = (await studentToken(f.student)).accessToken, input = { accessToken: token, courseId: f.course.courseId, expectedRuleVersionId: f.course.publishedRule.ruleVersionId, makeupAuthorizationId: f.grant.id };
        const result = await g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input));
        expect(result.makeupAuthorization).toEqual({ authorizationId: f.grant.id, courseId: f.course.courseId, enrollmentId: f.enrollment.id, ruleVersionId: input.expectedRuleVersionId, startsAt: f.grant.startsAt, endsAtExclusive: f.grant.endsAtExclusive, authorizedAt: f.grant.authorizedAt });
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, courseId: input.courseId.toUpperCase(), expectedRuleVersionId: input.expectedRuleVersionId.toUpperCase(), makeupAuthorizationId: input.makeupAuthorizationId.toUpperCase() }))).resolves.toMatchObject({ makeupAuthorization: { authorizationId: f.grant.id } });
        for (const id of [randomUUID(), other.grant.id, peerGrant.id])
            await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, makeupAuthorizationId: id }))).rejects.toMatchObject({ code: 'MAKEUP_NOT_ALLOWED' });
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, { ...input, makeupAuthorizationId: null }))).rejects.toMatchObject({ code: 'CHECKIN_WINDOW_CLOSED' });
        // The new physical reference now rejects corrupt rule bindings before they can be observed.
        await expect(pool.query('UPDATE course_enrollment.makeup_authorization SET rule_version_id=$2 WHERE id=$1', [f.grant.id, randomUUID()])).rejects.toMatchObject({ code: '23503', constraint: 'makeup_published_rule_fk' });
        await pool.query('UPDATE course_enrollment.makeup_authorization SET enrollment_id=$2 WHERE id=$1', [f.grant.id, other.enrollment.id]).then(() => { throw new Error('FOREIGN_ENROLLMENT_ACCEPTED'); }, e => expect(e.code).toBe('23503'));
    }
    finally {
        now = start;
    }
});
test('named admission uses inclusive start and exclusive end from server time and rechecks removal, archive and closure', async () => {
    const f = await admissionFixture();
    now = f.grant.startsAt - 1;
    try {
        let token = (await studentToken(f.student)).accessToken;
        const input = () => ({ accessToken: token, courseId: f.course.courseId, expectedRuleVersionId: f.course.publishedRule.ruleVersionId, makeupAuthorizationId: f.grant.id });
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input()))).rejects.toMatchObject({ code: 'MAKEUP_NOT_ALLOWED' });
        now = f.grant.startsAt;
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input()))).resolves.toHaveProperty('admittedAt', now);
        await pool.query("UPDATE course_enrollment.enrollment SET status='REMOVED',removed_at=$2 WHERE id=$1", [f.enrollment.id, new Date(now)]);
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input()))).rejects.toMatchObject({ code: 'ENROLLMENT_NOT_ACTIVE' });
        await pool.query("UPDATE course_enrollment.enrollment SET status='ACTIVE',removed_at=NULL WHERE id=$1", [f.enrollment.id]);
        await expect(g1.transactions.run(async (s) => {
            await g1.transactions.client(s).query("UPDATE academic_term.semester SET status='ARCHIVED' WHERE id=$1", [semester]);
            return g1.sessionAdmission.authorizeSessionStart(s, input());
        })).rejects.toMatchObject({ code: 'COURSE_NOT_OPEN' }); // The rejected transaction rolls the synthetic archive back.
        now = f.grant.endsAtExclusive;
        token = (await studentToken(f.student)).accessToken;
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input()))).rejects.toMatchObject({ code: 'MAKEUP_NOT_ALLOWED' });
        const teacherToken = (await login(f.teacher)).accessToken;
        await g1.courses.close(teacherToken, f.course.courseId, { expectedVersion: f.course.version, reason: 'Closed' }, command());
        await expect(g1.transactions.run(s => g1.sessionAdmission.authorizeSessionStart(s, input()))).rejects.toMatchObject({ code: 'COURSE_NOT_OPEN' });
    }
    finally {
        now = start;
    }
});
test('admission holds exact grant locks until caller commit and caller failure rolls back a real PostgreSQL write', async () => {
    const f = await admissionFixture();
    now = f.grant.startsAt;
    try {
        const token = (await studentToken(f.student)).accessToken, input = { accessToken: token, courseId: f.course.courseId, expectedRuleVersionId: f.course.publishedRule.ruleVersionId, makeupAuthorizationId: f.grant.id }, probe = randomUUID();
        let admitted!: () => void, release!: () => void;
        const entered = new Promise<void>(r => { admitted = r; }), leave = new Promise<void>(r => { release = r; });
        const work = g1.transactions.run(async (s) => { await g1.sessionAdmission.authorizeSessionStart(s, input); await g1.transactions.client(s).query("INSERT INTO foundation_probe.certification_kind VALUES($1,'SCHOOL_TEAM')", [probe]); admitted(); await leave; throw new Error('CALLER_ABORT'); });
        const rejected = expect(work).rejects.toThrow('CALLER_ABORT');
        await entered;
        const concurrent = await pool.connect();
        try {
            await concurrent.query('BEGIN');
            await concurrent.query("SET LOCAL lock_timeout='100ms'");
            await expect(concurrent.query('UPDATE course_enrollment.makeup_authorization SET starts_at=starts_at WHERE id=$1', [f.grant.id])).rejects.toMatchObject({ code: '55P03' });
        }
        finally {
            await concurrent.query('ROLLBACK');
            concurrent.release();
            release();
        }
        await rejected;
        expect((await pool.query('SELECT count(*)::integer AS n FROM foundation_probe.certification_kind WHERE id=$1', [probe])).rows[0].n).toBe(0);
    }
    finally {
        now = start;
    }
});
test('Session reference targets enforce the full owner, course, semester, rule and named grant tuple', async () => {
    const f = await admissionFixture(), other = await admissionFixture(), client = await pool.connect();
    try {
        // Test-only consumer DDL; this is not H's Session repository or migration.
        await client.query(`CREATE TABLE foundation_probe.session_reference_probe (
            organization_id uuid NOT NULL, student_subject_id uuid NOT NULL, semester_id uuid NOT NULL,
            course_id uuid NOT NULL, enrollment_id uuid NOT NULL, rule_version_id uuid NOT NULL, makeup_authorization_id uuid,
            FOREIGN KEY(student_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
            FOREIGN KEY(semester_id,organization_id) REFERENCES academic_term.semester(id,organization_id),
            FOREIGN KEY(course_id,organization_id,semester_id,rule_version_id)
                REFERENCES course_enrollment.course(id,organization_id,semester_id,published_rule_version_id),
            FOREIGN KEY(enrollment_id,organization_id,semester_id,course_id,student_subject_id)
                REFERENCES course_enrollment.enrollment(id,organization_id,semester_id,course_id,student_subject_id),
            FOREIGN KEY(makeup_authorization_id,course_id,enrollment_id,rule_version_id)
                REFERENCES course_enrollment.makeup_authorization(id,course_id,enrollment_id,rule_version_id)
        )`);
        const values = [org, f.student.id, semester, f.course.courseId, f.enrollment.id, f.course.publishedRule.ruleVersionId, f.grant.id];
        const insert = 'INSERT INTO foundation_probe.session_reference_probe VALUES($1,$2,$3,$4,$5,$6,$7)';
        await client.query(insert, values);
        await client.query(insert, [...values.slice(0, 6), null]);
        for (const [index, value] of [[0, randomUUID()], [1, other.student.id], [2, randomUUID()], [3, other.course.courseId], [4, other.enrollment.id], [5, other.course.publishedRule.ruleVersionId], [6, other.grant.id]] as [
            number,
            string
        ][]) {
            const invalid = [...values];
            invalid[index] = value;
            await expect(client.query(insert, invalid)).rejects.toMatchObject({ code: '23503' });
        }
        expect((await client.query('SELECT count(*)::integer AS n FROM foundation_probe.session_reference_probe')).rows[0].n).toBe(2);
        await g1.courses.close(f.p.accessToken, f.course.courseId, { expectedVersion: f.course.version, reason: 'Historical references remain' }, command());
        expect((await client.query('SELECT count(*)::integer AS n FROM foundation_probe.session_reference_probe')).rows[0].n).toBe(2);
        await expect(client.query('DELETE FROM course_enrollment.makeup_authorization WHERE id=$1', [f.grant.id])).rejects.toMatchObject({ code: '23503' });
    }
    finally {
        await client.query('DROP TABLE IF EXISTS foundation_probe.session_reference_probe');
        client.release();
    }
});
test('student owner serialization exists without a Session and permits unrelated historical FK key-share locks', async () => {
    const student = await account('STUDENT'), peer = await account('STUDENT');
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { entered = r; }), leave = new Promise<void>(r => { release = r; });
    const owner = g1.transactions.run(async (s) => { await g1.studentOwnerLock.lockStudentOwner(s, org, student.id); entered(); await leave; });
    await ready;
    try {
        await expect(g1.transactions.run(async (s) => {
            await g1.transactions.client(s).query("SET LOCAL lock_timeout='100ms'");
            await g1.studentOwnerLock.lockStudentOwner(s, org.toUpperCase(), student.id.toUpperCase());
        })).rejects.toMatchObject({ code: '55P03' });
        await g1.transactions.run(async (s) => {
            await g1.transactions.client(s).query("SET LOCAL lock_timeout='100ms'");
            await g1.studentOwnerLock.lockStudentOwner(s, org, peer.id);
            await g1.transactions.client(s).query('SELECT id FROM identity_access.user_subject WHERE id=$1 FOR KEY SHARE', [student.id]);
        });
    }
    finally {
        release();
        await owner;
    }
    await expect(g1.transactions.run(s => g1.studentOwnerLock.lockStudentOwner(s, org, student.id))).resolves.toBeUndefined();
});
test('student owner lock fails closed for missing, foreign, nonstudent, closed and inactive transaction scope', async () => {
    const student = await account('STUDENT'), teacher = await account();
    for (const [organization, subject] of [[org, randomUUID()], [randomUUID(), student.id], [org, teacher.id]]) {
        await expect(g1.transactions.run(s => g1.studentOwnerLock.lockStudentOwner(s, organization!, subject!))).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    }
    const closed = randomUUID();
    await pool.query("INSERT INTO identity_access.user_subject(id,organization_id,role_snapshot,created_at,closed_at) VALUES($1,$2,'STUDENT',$3,$3)", [closed, org, new Date(now)]);
    await expect(g1.transactions.run(s => g1.studentOwnerLock.lockStudentOwner(s, org, closed))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const inactive = await g1.transactions.run(async (s) => s);
    await expect(g1.studentOwnerLock.lockStudentOwner(inactive, org, student.id)).rejects.toThrow('TRANSACTION_SCOPE_INACTIVE');
});
test('live admission holds the student owner lock until caller rollback, then releases it', async () => {
    const f = await admissionFixture();
    now = f.grant.startsAt;
    let release!: () => void, entered!: () => void;
    const ready = new Promise<void>(r => { entered = r; }), leave = new Promise<void>(r => { release = r; });
    try {
        const token = (await studentToken(f.student)).accessToken;
        const owner = g1.transactions.run(async (s) => {
            await g1.sessionAdmission.authorizeSessionStart(s, { accessToken: token, courseId: f.course.courseId, expectedRuleVersionId: f.course.publishedRule.ruleVersionId, makeupAuthorizationId: f.grant.id });
            entered();
            await leave;
            throw new Error('ADMISSION_CALLER_ABORT');
        });
        const rejected = expect(owner).rejects.toThrow('ADMISSION_CALLER_ABORT');
        await ready;
        try {
            await expect(g1.transactions.run(async (s) => {
                await g1.transactions.client(s).query("SET LOCAL lock_timeout='100ms'");
                await g1.studentOwnerLock.lockStudentOwner(s, org, f.student.id);
            })).rejects.toMatchObject({ code: '55P03' });
        }
        finally {
            release();
            await rejected;
        }
        await expect(g1.transactions.run(s => g1.studentOwnerLock.lockStudentOwner(s, org, f.student.id))).resolves.toBeUndefined();
    }
    finally {
        now = start;
    }
});
async function emailProof(email: string, purpose: string) {
    const r = await http('POST', '/auth/challenges', { email, purpose });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    const delivery = delivered.findLast(d => d.email === email.trim().toLowerCase() && d.purpose === purpose);
    return { challengeId: r.body.challengeId as string, code: delivery?.code ?? '000000' };
}
test('all six challenge purposes retain a uniform public response; email payload is encrypted and cleared on consumption', async () => {
    const a = await account('STUDENT'), token = (await studentToken(a)).accessToken;
    const next = randomUUID() + '@example.edu', currentEmailProof = await emailProof(a.email, 'CURRENT_EMAIL_VERIFICATION'), newEmailProof = await emailProof(next, 'NEW_EMAIL_VERIFICATION');
    expect((await http('POST', '/auth/challenges', { email: randomUUID() + '@example.edu', purpose: 'ACCOUNT_DELETION' })).status).toBe(202);
    const stored = (await pool.query('SELECT sealed_email FROM identity_access.auth_challenge WHERE id=$1', [newEmailProof.challengeId])).rows[0].sealed_email;
    expect(stored).toBeTypeOf('string');
    expect(stored).not.toContain(next);
    const key = randomUUID(), body = { currentEmailProof, newEmailProof, expectedVersion: 0 };
    const changed = await http('PUT', '/me/verified-email', body, token, key);
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    expect(changed.body.verifiedEmail).toBe(next);
    expect(changed.body.version).toBe(1);
    expect((await http('PUT', '/me/verified-email', body, token, key)).body).toEqual(changed.body);
    expect((await pool.query('SELECT sealed_email,consumed_at FROM identity_access.auth_challenge WHERE id=$1', [newEmailProof.challengeId])).rows[0]).toMatchObject({ sealed_email: null, consumed_at: expect.any(Date) });
    expect((await studentToken({ email: next })).actor.userId).toBe(a.id);
});
test('email change rejects foreign/current-purpose misuse and old-address login challenges, without consuming correct proofs on failure', async () => {
    const a = await account('STUDENT'), other = await account('STUDENT'), token = (await studentToken(a)).accessToken;
    const oldLogin = await emailProof(a.email, 'STUDENT_LOGIN'), current = await emailProof(a.email, 'CURRENT_EMAIL_VERIFICATION'), otherCurrent = await emailProof(other.email, 'CURRENT_EMAIL_VERIFICATION'), next = randomUUID() + '@example.edu', fresh = await emailProof(next, 'NEW_EMAIL_VERIFICATION');
    const body = { currentEmailProof: current, newEmailProof: fresh, expectedVersion: 0 };
    expect((await http('PUT', '/me/verified-email', { ...body, currentEmailProof: otherCurrent }, token)).body.code).toBe('INVALID_REQUEST');
    expect((await http('PUT', '/me/verified-email', { ...body, newEmailProof: oldLogin }, token)).body.code).toBe('INVALID_REQUEST');
    expect((await http('PUT', '/me/verified-email', { ...body, expectedVersion: 1 }, token)).body.code).toBe('VERSION_CONFLICT');
    expect((await http('PUT', '/me/verified-email', body, token)).status).toBe(200);
    expect((await http('POST', '/auth/sessions/student', { otpProof: oldLogin })).body.code).toBe('INVALID_CREDENTIALS');
    expect((await http('PUT', '/me/verified-email', { ...body, expectedVersion: 1 }, token)).body.code).toBe('CHALLENGE_EXPIRED');
});
test('email uniqueness is enforced at confirmation and required audit failure rolls back email, proofs and replay', async () => {
    const a = await account('STUDENT'), token = (await studentToken(a)).accessToken, next = randomUUID() + '@example.edu';
    const body = { currentEmailProof: await emailProof(a.email, 'CURRENT_EMAIL_VERIFICATION'), newEmailProof: await emailProof(next, 'NEW_EMAIL_VERIFICATION'), expectedVersion: 0 }, key = randomUUID();
    await pool.query("CREATE FUNCTION public.g1_fail_email_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_EMAIL_AUDIT_FAILURE'; END $$");
    await pool.query('CREATE TRIGGER g1_fail_email_audit BEFORE INSERT ON audit.audit_event FOR EACH ROW EXECUTE FUNCTION public.g1_fail_email_audit()');
    try {
        expect((await http('PUT', '/me/verified-email', body, token, key)).status).toBe(500);
    }
    finally {
        await pool.query('DROP TRIGGER g1_fail_email_audit ON audit.audit_event');
        await pool.query('DROP FUNCTION public.g1_fail_email_audit()');
    }
    expect((await http('GET', '/me', undefined, token)).body.verifiedEmail).toBe(a.email);
    expect((await pool.query('SELECT consumed_at FROM identity_access.auth_challenge WHERE id=$1', [body.newEmailProof.challengeId])).rows[0].consumed_at).toBeNull();
    const b = await account('STUDENT');
    await pool.query('UPDATE identity_access.login_account SET email_normalized=$2 WHERE subject_id=$1', [b.id, next]);
    expect((await http('PUT', '/me/verified-email', body, token, key)).body.code).toBe('EMAIL_ALREADY_IN_USE');
    await pool.query('UPDATE identity_access.login_account SET email_normalized=$2 WHERE subject_id=$1', [b.id, b.email]);
    expect((await http('PUT', '/me/verified-email', body, token, key)).status).toBe(200);
});
async function accountWorld(withClosure = true, existingOrg?: string, syntheticCalendar = false, localMail = false, localMailOrigin?: string) {
    const organization = existingOrg ?? randomUUID(), mail: {
        email: string;
        code: string;
        purpose: string;
    }[] = [], duties = new Map<string, number>();
    if (!existingOrg) {
        await pool.query('INSERT INTO identity_access.organization(id,code,name,business_timezone,created_at) VALUES($1,$2,$2,\'Asia/Shanghai\',$3)', [organization, organization, new Date(now)]);
        await pool.query("INSERT INTO system_mode.state(organization_id,mode,policy_version,version,updated_at) VALUES($1,'NORMAL',0,0,$2)", [organization, new Date(now)]);
    }
    await pool.query("CREATE TABLE IF NOT EXISTS foundation_probe.account_activity(organization_id uuid NOT NULL,subject_id uuid NOT NULL,status text NOT NULL CHECK(status IN ('ACTIVE','PAUSED')),PRIMARY KEY(organization_id,subject_id))");
    let server!: ReturnType<typeof createG1>;
    server = createG1(pool, { organizationId: organization, schoolEmailDomains: ['example.edu'], clock: { now: () => now }, secrets, passwords, dummyPasswordHash: encoded,
        delivery: localMail ? createLocalMailDelivery({ ...process.env, ...(localMailOrigin ? { P7_LOCAL_MAILPIT_URL: localMailOrigin } : {}) }) : { async send(email, code, purpose) { mail.push({ email, code, purpose }); } }, calendar: { async catalog() { if (!syntheticCalendar)
                throw new Failure('DEPENDENCY_UNAVAILABLE', 503); return { version: 'EXPLICIT-SYNTHETIC-G1-TEST-CATALOG', complete: true, slots: dates.flatMap((t, i) => ['COURSE_RELATED', 'OTHER'].map(category => ({ id: i + '/' + category, category: category as 'COURSE_RELATED' | 'OTHER', startsAt: t, endsAtExclusive: t + 3600000 }))) }; } },
        ...(withClosure ? { closureFacts: { studentSessions: { async assertNoActive(scope, orgId, id) { expect(orgId).toBe(organization); await server.studentOwnerLock.lockStudentOwner(scope, orgId, id); const rows = (await server.transactions.client(scope).query('SELECT status FROM foundation_probe.account_activity WHERE organization_id=$1 AND subject_id=$2', [orgId, id])).rows; if (rows.length)
                        throw new Failure('ACCOUNT_DELETION_BLOCKED', 409); } }, adminResponsibilities: { async count(_scope, orgId, id) { expect(orgId).toBe(organization); const count = duties.get(id); if (count === undefined)
                        throw new Failure('DEPENDENCY_UNAVAILABLE', 503); return count; } } } } : {})
    });
    const url = await server.app.listen({ host: '127.0.0.1', port: 0 });
    async function call(method: string, path: string, body?: unknown, token?: string, key = randomUUID()) { const r = await fetch(url + '/api/v1' + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Idempotency-Key': key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json() as Record<string, any> }; }
    async function proof(email: string, purpose: string) { const c = await call('POST', '/auth/challenges', { email, purpose }); expect(c.status).toBe(202); return { challengeId: c.body.challengeId as string, code: mail.findLast(m => m.email === email && m.purpose === purpose)?.code ?? '000000' }; }
    async function student(a: {
        email: string;
    }) { const r = await call('POST', '/auth/sessions/student', { otpProof: await proof(a.email, 'STUDENT_LOGIN') }); expect(r.status, JSON.stringify(r.body)).toBe(201); return r.body; }
    let adminToken = '';
    if (!existingOrg) {
        const admin = await account('ADMIN', false, organization);
        const r = await call('POST', '/auth/sessions/password', { loginType: 'ADMIN_EMAIL', identifier: admin.email, password: 'InitialA1!' });
        expect(r.status).toBe(201);
        adminToken = r.body.accessToken;
    }
    return { organization, server, call, proof, student, adminToken, duties, mail };
}
test('student closure fails closed without H and rejects teacher or super-admin self deletion', async () => {
    const a = await account('STUDENT'), token = (await studentToken(a)).accessToken;
    expect((await http('GET', '/me/account-deletion-impact', undefined, token)).body.code).toBe('DEPENDENCY_UNAVAILABLE');
    const teacher = (await login(await account())).accessToken;
    expect((await http('GET', '/me/account-deletion-impact', undefined, teacher)).body.code).toBe('FORBIDDEN');
    const w = await accountWorld();
    try {
        expect((await w.call('GET', '/me/account-deletion-impact', undefined, w.adminToken)).body.code).toBe('FORBIDDEN');
    }
    finally {
        await w.server.app.close();
    }
});
test('student closure blocks ACTIVE and PAUSED, then erases credentials and personal replays while retaining course facts and an exact safe receipt', async () => {
    const f = await admissionFixture(), w = await accountWorld(true, org);
    try {
        const pair = await w.student(f.student), refreshed = await w.call('POST', '/auth/sessions/refresh', { refreshToken: pair.refreshToken }), token = refreshed.body.accessToken;
        expect(refreshed.status).toBe(200);
        const notices = await w.call('GET', '/student/notifications', undefined, token);
        expect((await w.call('POST', '/student/notifications/' + notices.body.items[0].notificationId + '/read', undefined, token)).status).toBe(200);
        expect((await pool.query('SELECT count(*)::integer n FROM notification_center.command_replay WHERE subject=$1', [org + '/' + f.student.id])).rows[0].n).toBe(1);
        const proof = await w.proof(f.student.email, 'ACCOUNT_DELETION'), body = { otpProof: proof, expectedVersion: 0, acknowledgement: 'DELETE_MY_ACCOUNT' }, key = randomUUID();
        await pool.query("INSERT INTO foundation_probe.account_activity VALUES($1,$2,'ACTIVE')", [org, f.student.id]);
        for (const status of ['ACTIVE', 'PAUSED']) {
            await pool.query('UPDATE foundation_probe.account_activity SET status=$3 WHERE organization_id=$1 AND subject_id=$2', [org, f.student.id, status]);
            const impact = await w.call('GET', '/me/account-deletion-impact', undefined, token);
            expect(impact.body).toMatchObject({ allowed: false, blockers: [{ code: 'ACTIVE_EXERCISE_SESSION', count: 1 }] });
            expect((await w.call('POST', '/me/account-deletion', body, token, key)).body.code).toBe('ACCOUNT_DELETION_BLOCKED');
        }
        await pool.query('DELETE FROM foundation_probe.account_activity WHERE subject_id=$1', [f.student.id]);
        const deleted = await w.call('POST', '/me/account-deletion', body, token, key);
        expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
        expect(deleted.body.deleted).toBe(true);
        expect((await w.call('POST', '/me/account-deletion', body, token, key)).body).toEqual(deleted.body);
        expect((await w.call('POST', '/me/account-deletion', { ...body, expectedVersion: 1 }, token, key)).body.code).toBe('IDEMPOTENCY_KEY_REUSED');
        expect((await w.call('GET', '/me', undefined, token)).status).toBe(401);
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.login_account WHERE subject_id=$1', [f.student.id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.auth_session WHERE subject_id=$1', [f.student.id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.auth_challenge WHERE subject_id=$1 OR email_digest=$2', [f.student.id, secrets.digest('email', f.student.email)])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.command_replay WHERE $1::uuid=ANY(retention_subject_ids) OR subject=$1::text', [f.student.id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.command_replay WHERE subject=$1', [f.student.id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM notification_center.command_replay WHERE subject=$1', [org + '/' + f.student.id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT closed_at FROM identity_access.user_subject WHERE id=$1', [f.student.id])).rows[0].closed_at).toBeInstanceOf(Date);
        expect((await pool.query('SELECT student_subject_id FROM course_enrollment.enrollment WHERE id=$1', [f.enrollment.id])).rows[0].student_subject_id).toBe(f.student.id);
        const undelivered = w.mail.length;
        now += 60001;
        try {
            await w.proof(f.student.email, 'STUDENT_LOGIN');
            expect(w.mail).toHaveLength(undelivered);
        }
        finally {
            now -= 60001;
        }
    }
    finally {
        await w.server.app.close();
    }
});
test('closure audit failure rolls back profile erasure and proof consumption; missing/foreign OTP cannot delete', async () => {
    const w = await accountWorld();
    try {
        const a = await account('STUDENT', false, w.organization), peer = await account('STUDENT', false, w.organization), token = (await w.student(a)).accessToken;
        const body = { otpProof: await w.proof(a.email, 'ACCOUNT_DELETION'), expectedVersion: 0, acknowledgement: 'DELETE_MY_ACCOUNT' }, key = randomUUID();
        expect((await w.call('POST', '/me/account-deletion', { ...body, otpProof: await w.proof(peer.email, 'ACCOUNT_DELETION') }, token)).body.code).toBe('INVALID_REQUEST');
        await pool.query("CREATE FUNCTION public.g1_fail_closure_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_CLOSURE_AUDIT_FAILURE'; END $$");
        await pool.query('CREATE TRIGGER g1_fail_closure_audit BEFORE INSERT ON audit.audit_event FOR EACH ROW EXECUTE FUNCTION public.g1_fail_closure_audit()');
        try {
            expect((await w.call('POST', '/me/account-deletion', body, token, key)).status).toBe(500);
        }
        finally {
            await pool.query('DROP TRIGGER g1_fail_closure_audit ON audit.audit_event');
            await pool.query('DROP FUNCTION public.g1_fail_closure_audit()');
        }
        expect((await w.call('GET', '/me', undefined, token)).status).toBe(200);
        expect((await pool.query('SELECT consumed_at FROM identity_access.auth_challenge WHERE id=$1', [body.otpProof.challengeId])).rows[0].consumed_at).toBeNull();
        expect((await w.call('POST', '/me/account-deletion', body, token, key)).status).toBe(200);
    }
    finally {
        await w.server.app.close();
    }
});
const subInput = () => ({ loginName: randomUUID(), name: 'Synthetic Sub Admin', verifiedEmail: randomUUID() + '@example.edu', department: null, permissions: ['USERS_ACCOUNTS'], initialPassword: 'x', confirmInitialPassword: 'x' });
test('sub-admin creation uses a nonempty temporary password, real permission rows, immutable login name and immediate permission revocation', async () => {
    const w = await accountWorld();
    try {
        const input = subInput(), created = await w.call('POST', '/admin/sub-admins', input, w.adminToken);
        expect(created.status, JSON.stringify(created.body)).toBe(201);
        const id = created.body.adminId, sign = await w.call('POST', '/auth/sessions/password', { loginType: 'ADMIN_LOGIN_NAME', identifier: input.loginName, password: 'x' });
        expect(sign.status).toBe(201);
        expect(sign.body.actor.mustChangePassword).toBe(true);
        expect(sign.body.actor.adminPermissions).toEqual(['USERS_ACCOUNTS']);
        const token = sign.body.accessToken;
        expect((await w.call('GET', '/admin/teacher-accounts', undefined, token)).body.code).toBe('FIRST_PASSWORD_CHANGE_REQUIRED');
        expect((await w.call('PUT', '/me/password', { currentPassword: 'x', newPassword: 'z', expectedVersion: 0 }, token)).status).toBe(200);
        expect((await w.call('GET', '/admin/teacher-accounts', undefined, token)).status).toBe(200);
        expect((await w.call('POST', '/admin/sub-admins', subInput(), token)).body.code).toBe('FORBIDDEN');
        const update = { name: input.name, verifiedEmail: input.verifiedEmail, department: 'Updated', permissions: ['HELP_CENTER'], expectedVersion: 1 };
        expect((await w.call('PUT', '/admin/sub-admins/' + id, { ...update, loginName: 'forbidden' }, w.adminToken)).status).toBe(400);
        const changed = await w.call('PUT', '/admin/sub-admins/' + id, update, w.adminToken);
        expect(changed.status, JSON.stringify(changed.body)).toBe(200);
        expect(changed.body.loginName).toBe(input.loginName);
        expect((await w.call('GET', '/admin/teacher-accounts', undefined, token)).body.code).toBe('FORBIDDEN');
        const profile = await w.call('GET', '/me', undefined, token);
        expect(profile.body.adminPermissions).toEqual(['HELP_CENTER']);
        const list = await w.call('GET', '/admin/sub-admins?limit=1', undefined, w.adminToken);
        expect(list.body.summary).toMatchObject({ totalCount: 1, activeCount: 1 });
    }
    finally {
        await w.server.app.close();
    }
});
test('sub-admin disable/delete require authoritative responsibility clearance and never restore old sessions', async () => {
    const w = await accountWorld();
    try {
        const input = subInput(), r = await w.call('POST', '/admin/sub-admins', input, w.adminToken), id = r.body.adminId;
        const sign = await w.call('POST', '/auth/sessions/password', { loginType: 'ADMIN_LOGIN_NAME', identifier: input.loginName, password: 'x' }), token = sign.body.accessToken;
        expect((await w.call('POST', '/admin/sub-admins/' + id + '/state-transition', { targetState: 'DISABLED', expectedVersion: 0 }, w.adminToken)).body.code).toBe('DEPENDENCY_UNAVAILABLE');
        w.duties.set(id, 2);
        expect((await w.call('POST', '/admin/sub-admins/' + id + '/state-transition', { targetState: 'DISABLED', expectedVersion: 0 }, w.adminToken)).body.code).toBe('ADMIN_RESPONSIBILITY_BLOCKED');
        w.duties.set(id, 0);
        expect((await w.call('POST', '/admin/sub-admins/' + id + '/state-transition', { targetState: 'DISABLED', expectedVersion: 0 }, w.adminToken)).status).toBe(200);
        expect((await w.call('GET', '/me', undefined, token)).status).toBe(403);
        expect((await w.call('POST', '/admin/sub-admins/' + id + '/state-transition', { targetState: 'ACTIVE', expectedVersion: 1 }, w.adminToken)).status).toBe(200);
        expect((await w.call('GET', '/me', undefined, token)).status).toBe(401);
        const body = { confirmationLoginName: input.loginName, expectedVersion: 2, responsibilityTransferConfirmed: true }, key = randomUUID();
        const deleted = await w.call('POST', '/admin/sub-admins/' + id + '/deletion', body, w.adminToken, key);
        expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
        expect((await w.call('POST', '/admin/sub-admins/' + id + '/deletion', body, w.adminToken, key)).body).toEqual(deleted.body);
        expect((await w.call('GET', '/admin/sub-admins/' + id, undefined, w.adminToken)).status).toBe(404);
    }
    finally {
        await w.server.app.close();
    }
});
test('teacher CSV preview rejects secrets, malformed rows and duplicates; confirm is all-or-nothing and rechecks conflicts', async () => {
    const w = await accountWorld();
    try {
        const bad = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: 'employee_id,name,email,initial_password\n001,A,a@example.edu,secret' }, w.adminToken);
        expect(bad.body.code).toBe('VALIDATION_FAILED');
        const duplicate = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: 'employee_id,name,email\n001,A,a@example.edu\n001,B,a@example.edu\n,,' }, w.adminToken);
        expect(duplicate.status).toBe(201);
        expect(duplicate.body.valid).toBe(false);
        expect(duplicate.body.rows).toHaveLength(3);
        expect((await w.call('POST', '/admin/teacher-account-batches', { validationId: duplicate.body.validationId, initialPassword: 'InitialA1!' }, w.adminToken)).body.code).toBe('VALIDATION_FAILED');
        const email = randomUUID() + '@example.edu', csv = 'employee_id,name,email,college\r\n001,"Synthetic, Teacher",' + email + ',Sports\r\n', preview = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: csv }, w.adminToken);
        expect(preview.status, JSON.stringify(preview.body)).toBe(201);
        expect(preview.body.valid).toBe(true);
        const body = { validationId: preview.body.validationId, initialPassword: 'InitialA1!' }, key = randomUUID();
        expect((await w.call('POST', '/admin/teacher-account-batches', { ...body, initialPassword: 'x' }, w.adminToken)).status).toBe(400);
        const made = await w.call('POST', '/admin/teacher-account-batches', body, w.adminToken, key);
        expect(made.status, JSON.stringify(made.body)).toBe(201);
        expect(made.body.createdCount).toBe(1);
        expect(made.body.teachers[0].mustChangePassword).toBe(true);
        expect(JSON.stringify(made.body)).not.toContain(body.initialPassword);
        expect((await w.call('POST', '/admin/teacher-account-batches', body, w.adminToken, key)).body).toEqual(made.body);
        expect((await w.call('POST', '/admin/teacher-account-batches', body, w.adminToken)).body.code).toBe('VALIDATION_FAILED');
        expect((await w.call('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: email, password: body.initialPassword })).body.actor.mustChangePassword).toBe(true);
        const again = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: csv }, w.adminToken);
        expect(again.body.valid).toBe(false);
        const t = made.body.teachers[0], del = { confirmationEmployeeId: t.employeeId, reason: 'Never assigned teaching responsibilities', expectedVersion: t.version };
        expect((await w.call('POST', '/admin/teacher-accounts/' + t.teacherId + '/deletion', del, w.adminToken)).status).toBe(200);
        expect((await w.call('GET', '/admin/teacher-accounts/' + t.teacherId, undefined, w.adminToken)).status).toBe(404);
    }
    finally {
        await w.server.app.close();
    }
});
const semesterInput = (termType: 'FIRST' | 'SECOND' | 'SUMMER' = 'FIRST') => ({ academicYear: '2026-2027', termType, displayName: 'Synthetic ' + termType, startDate: '2026-09-01', endDate: '2027-01-31' });
test('semester catalog enforces real versions, dates and unique combinations; empty-semester switches preserve immutable history', async () => {
    const w = await accountWorld();
    try {
        expect((await w.call('GET', '/semesters/current', undefined, w.adminToken)).status).toBe(404);
        expect((await w.call('POST', '/semesters', { ...semesterInput(), academicYear: '2026-2028' }, w.adminToken)).body.code).toBe('VALIDATION_FAILED');
        expect((await w.call('POST', '/semesters', { ...semesterInput(), endDate: '2026-08-31' }, w.adminToken)).body.code).toBe('VALIDATION_FAILED');
        const first = await w.call('POST', '/semesters', semesterInput(), w.adminToken);
        expect(first.status, JSON.stringify(first.body)).toBe(201);
        expect(first.body).toMatchObject({ status: 'UPCOMING', version: 0, courseCount: 0, studentCount: 0 });
        expect((await w.call('POST', '/semesters', semesterInput(), w.adminToken)).body.code).toBe('SEMESTER_COMBINATION_EXISTS');
        const id = first.body.semesterId, update = { ...semesterInput(), displayName: 'Updated synthetic', expectedVersion: 0 };
        const changed = await w.call('PUT', '/semesters/' + id, update, w.adminToken);
        expect(changed.status, JSON.stringify(changed.body)).toBe(200);
        expect(changed.body.version).toBe(1);
        expect((await w.call('PUT', '/semesters/' + id, update, w.adminToken)).body.code).toBe('VERSION_CONFLICT');
        const transition = { expectedTargetVersion: 1, expectedCurrentSemesterVersion: null }, key = randomUUID(), current = await w.call('POST', '/semesters/' + id + '/current-transition', transition, w.adminToken, key);
        expect(current.status, JSON.stringify(current.body)).toBe(200);
        expect(current.body.currentSemester.version).toBe(2);
        expect(current.body.archivedSemester).toBeNull();
        expect((await w.call('POST', '/semesters/' + id + '/current-transition', transition, w.adminToken, key)).body).toEqual(current.body);
        expect((await w.call('PUT', '/semesters/' + id, { ...update, expectedVersion: 2 }, w.adminToken)).body.code).toBe('SEMESTER_NOT_UPCOMING');
        const second = (await w.call('POST', '/semesters', semesterInput('SECOND'), w.adminToken)).body;
        const future = (await w.call('POST', '/semesters', { ...semesterInput('SUMMER'), startDate: '2027-01-01' }, w.adminToken)).body;
        expect((await w.call('POST', '/semesters/' + future.semesterId + '/current-transition', { expectedTargetVersion: 0, expectedCurrentSemesterVersion: 2 }, w.adminToken)).body.code).toBe('SEMESTER_START_DATE_NOT_REACHED');
        expect((await w.call('POST', '/semesters/' + second.semesterId + '/current-transition', { expectedTargetVersion: 0, expectedCurrentSemesterVersion: 1 }, w.adminToken)).body.code).toBe('VERSION_CONFLICT');
        const switched = await w.call('POST', '/semesters/' + second.semesterId + '/current-transition', { expectedTargetVersion: 0, expectedCurrentSemesterVersion: 2 }, w.adminToken);
        expect(switched.status, JSON.stringify(switched.body)).toBe(200);
        expect(switched.body.archivedSemester.status).toBe('ARCHIVED');
        const page = await w.call('GET', '/semesters?limit=1', undefined, w.adminToken);
        expect(page.status, JSON.stringify(page.body)).toBe(200);
        expect(page.body.summary).toMatchObject({ currentSemester: { semesterId: second.semesterId }, upcomingCount: 1, archivedCount: 1 });
        const next = await w.call('GET', '/semesters?limit=1&cursor=' + encodeURIComponent(page.body.page.nextCursor), undefined, w.adminToken);
        expect(next.body.items[0].semesterId).not.toBe(page.body.items[0].semesterId);
        expect((await w.call('GET', '/semesters?limit=1&cursor=' + encodeURIComponent(next.body.page.previousCursor), undefined, w.adminToken)).body.items).toEqual(page.body.items);
        const filtered = await w.call('GET', '/semesters?limit=1&status=UPCOMING', undefined, w.adminToken);
        expect(filtered.body.summary).toEqual(page.body.summary);
        expect(filtered.body.items[0].semesterId).toBe(future.semesterId);
        expect((await w.call('GET', '/semesters?limit=2&cursor=' + encodeURIComponent(page.body.page.nextCursor), undefined, w.adminToken)).body.code).toBe('INVALID_CURSOR');
        const student = await w.student(await account('STUDENT', false, w.organization));
        expect((await w.call('GET', '/semesters/current', undefined, student.accessToken)).body.semesterId).toBe(second.semesterId);
        expect((await w.call('GET', '/semesters', undefined, student.accessToken)).status).toBe(403);
        expect((await pool.query('SELECT count(*)::integer n FROM academic_term.semester_transition WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(2);
        await expect(pool.query("UPDATE academic_term.semester SET status='CURRENT' WHERE id=$1", [id])).rejects.toThrow();
        await expect(pool.query('DELETE FROM academic_term.semester_transition WHERE organization_id=$1', [w.organization])).rejects.toThrow();
    }
    finally {
        await w.server.app.close();
    }
});
test('template publishing is SUPER-only, fixed, versioned and immutable; concurrent stale publishers cannot both commit', async () => {
    const w = await accountWorld();
    try {
        const input = { label: { zh: '固定模板', en: 'Fixed template' }, expectedLatestVersionId: null }, first = await w.call('POST', '/admin/rule-template-versions', input, w.adminToken);
        expect(first.status, JSON.stringify(first.body)).toBe(200);
        expect(first.body).toMatchObject({ status: 'PUBLISHED', versionNo: 1, totalTargetMinutes: 1200, thresholdChoices: [30, 45, 60], weeklyCountChoices: [2, 3, 4], formulaVersion: 'P4Z-A-08-v1' });
        const teacher = await account('TEACHER', false, w.organization), sign = await w.call('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: teacher.email, password: 'InitialA1!' });
        expect((await w.call('GET', '/rule-template-versions', undefined, sign.body.accessToken)).body.items).toEqual([first.body]);
        expect((await w.call('POST', '/admin/rule-template-versions', input, sign.body.accessToken)).status).toBe(403);
        const student = await w.student(await account('STUDENT', false, w.organization));
        expect((await w.call('GET', '/rule-template-versions', undefined, student.accessToken)).status).toBe(403);
        const sub = subInput(), made = (await w.call('POST', '/admin/sub-admins', { ...sub, permissions: ['GLOBAL_RULES'] }, w.adminToken)).body, subLogin = (await w.call('POST', '/auth/sessions/password', { loginType: 'ADMIN_LOGIN_NAME', identifier: sub.loginName, password: 'x' })).body;
        expect((await w.call('PUT', '/me/password', { currentPassword: 'x', newPassword: 'q', expectedVersion: made.version }, subLogin.accessToken)).status).toBe(200);
        expect((await w.call('GET', '/rule-template-versions', undefined, subLogin.accessToken)).status).toBe(403);
        expect((await w.call('POST', '/admin/rule-template-versions', { ...input, totalTargetMinutes: 1500 }, w.adminToken)).status).toBe(400);
        const results = await Promise.all([1, 2].map(n => w.call('POST', '/admin/rule-template-versions', { label: { zh: '模板' + n, en: 'Template ' + n }, expectedLatestVersionId: first.body.templateVersionId }, w.adminToken)));
        expect(results.map(r => r.status).sort()).toEqual([200, 412]);
        const all = await w.call('GET', '/rule-template-versions?limit=1', undefined, w.adminToken);
        expect(all.body.items).toEqual([first.body]);
        const second = await w.call('GET', '/rule-template-versions?limit=1&cursor=' + encodeURIComponent(all.body.page.nextCursor), undefined, w.adminToken);
        expect(second.body.items[0].versionNo).toBe(2);
        expect((await w.call('GET', '/rule-template-versions?limit=1&cursor=' + encodeURIComponent(second.body.page.previousCursor), undefined, w.adminToken)).body.items).toEqual(all.body.items);
        await expect(pool.query("UPDATE course_enrollment.rule_template_version SET label_en='overwritten' WHERE id=$1", [first.body.templateVersionId])).rejects.toThrow();
    }
    finally {
        await w.server.app.close();
    }
});
test('course closure alone cannot archive a populated semester or authorize deletion of its teacher without settlement facts', async () => {
    const w = await accountWorld(true, undefined, true);
    try {
        const term = (await w.call('POST', '/semesters', semesterInput(), w.adminToken)).body;
        expect((await w.call('POST', '/semesters/' + term.semesterId + '/current-transition', { expectedTargetVersion: 0, expectedCurrentSemesterVersion: null }, w.adminToken)).status).toBe(200);
        const tpl = (await w.call('POST', '/admin/rule-template-versions', { label: { zh: '测试模板', en: 'Synthetic' }, expectedLatestVersionId: null }, w.adminToken)).body;
        const teacher = await account('TEACHER', false, w.organization), sign = (await w.call('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: teacher.email, password: 'InitialA1!' })).body;
        const created = await w.call('POST', '/teacher/courses', { semesterId: term.semesterId, name: 'Synthetic populated course', description: null, rule: { ...rule, templateVersionId: tpl.templateVersionId } }, sign.accessToken);
        expect(created.status, JSON.stringify(created.body)).toBe(201);
        const id = created.body.courseId, plan = await w.call('POST', '/courses/' + id + '/publication-plan', { expectedCourseVersion: 0 }, sign.accessToken);
        expect(plan.body.result, JSON.stringify(plan.body)).toBe('FEASIBLE');
        const published = await w.call('POST', '/courses/' + id + '/publication', { expectedCourseVersion: 0, publicationToken: plan.body.publicationToken }, sign.accessToken);
        expect(published.status, JSON.stringify(published.body)).toBe(200);
        const next = (await w.call('POST', '/semesters', semesterInput('SECOND'), w.adminToken)).body, body = { expectedTargetVersion: 0, expectedCurrentSemesterVersion: 1 };
        expect((await w.call('POST', '/semesters/' + next.semesterId + '/current-transition', body, w.adminToken)).body.code).toBe('SEMESTER_SETTLEMENT_BLOCKED');
        const del = { confirmationEmployeeId: teacher.id, reason: 'Synthetic deletion attempt', expectedVersion: 0 };
        expect((await w.call('POST', '/admin/teacher-accounts/' + teacher.id + '/deletion', del, w.adminToken)).status).toBe(403);
        expect((await w.call('POST', '/courses/' + id + '/closure', { expectedVersion: published.body.version, reason: 'Synthetic close' }, sign.accessToken)).status).toBe(200);
        expect((await w.call('POST', '/semesters/' + next.semesterId + '/current-transition', body, w.adminToken)).status).toBe(503);
        expect((await w.call('POST', '/admin/teacher-accounts/' + teacher.id + '/deletion', del, w.adminToken)).status).toBe(503);
        expect((await w.call('GET', '/semesters/current', undefined, w.adminToken)).body.semesterId).toBe(term.semesterId);
        expect((await w.call('GET', '/me', undefined, sign.accessToken)).status).toBe(200);
        const list = await w.call('GET', '/semesters', undefined, w.adminToken);
        expect(list.body.items.find((r: any) => r.semesterId === term.semesterId).courseCount).toBe(1);
    }
    finally {
        await w.server.app.close();
    }
});
test('teacher import rechecks a previously valid preview and atomically rolls back every account when audit storage fails', async () => {
    const w = await accountWorld();
    try {
        const a = randomUUID() + '@example.edu', b = randomUUID() + '@example.edu', csv = 'employee_id,name,email\nA,Synthetic A,' + a + '\nB,Synthetic B,' + b, preview = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: csv }, w.adminToken);
        expect(preview.body.valid).toBe(true);
        const body = { validationId: preview.body.validationId, initialPassword: 'InitialA1!' }, key = randomUUID();
        await pool.query("CREATE FUNCTION public.g1_fail_teacher_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='TEACHER_ACCOUNT_CREATED' THEN RAISE EXCEPTION 'TEST_BATCH_AUDIT_FAILURE'; END IF; RETURN NEW; END $$");
        await pool.query('CREATE TRIGGER g1_fail_teacher_batch BEFORE INSERT ON audit.audit_event FOR EACH ROW EXECUTE FUNCTION public.g1_fail_teacher_batch()');
        try {
            expect((await w.call('POST', '/admin/teacher-account-batches', body, w.adminToken, key)).status).toBe(500);
        }
        finally {
            await pool.query('DROP TRIGGER g1_fail_teacher_batch ON audit.audit_event');
            await pool.query('DROP FUNCTION public.g1_fail_teacher_batch()');
        }
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.teacher_profile WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT consumed_at FROM identity_access.teacher_batch_validation WHERE id=$1', [preview.body.validationId])).rows[0].consumed_at).toBeNull();
        const other = await w.call('POST', '/admin/teacher-account-batch-validations', { csvText: 'employee_id,name,email\nA,Conflicting,' + a }, w.adminToken);
        expect((await w.call('POST', '/admin/teacher-account-batches', { validationId: other.body.validationId, initialPassword: 'InitialA1!' }, w.adminToken)).status).toBe(201);
        expect((await w.call('POST', '/admin/teacher-account-batches', body, w.adminToken, key)).body.code).toBe('VALIDATION_FAILED');
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.teacher_profile WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(1);
    }
    finally {
        await w.server.app.close();
    }
});
test('snapshot reads retain one PostgreSQL view across concurrent committed changes', async () => {
    const w = await accountWorld();
    try {
        await w.server.transactions.snapshot(async (scope) => { const c = w.server.transactions.client(scope); expect((await c.query('SHOW transaction_isolation')).rows[0].transaction_isolation).toBe('repeatable read'); expect((await c.query('SELECT count(*)::integer n FROM academic_term.semester WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0); expect((await w.call('POST', '/semesters', semesterInput(), w.adminToken)).status).toBe(201); expect((await c.query('SELECT count(*)::integer n FROM academic_term.semester WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0); });
        expect((await w.call('GET', '/semesters', undefined, w.adminToken)).body.items).toHaveLength(1);
    }
    finally {
        await w.server.app.close();
    }
});
test('local mail configuration requires explicit opt-in and rejects production and remote endpoints', () => {
    expect(() => createLocalMailDelivery({})).toThrow('LOCAL_MAIL_EXPLICIT_CONFIGURATION_REQUIRED');
    expect(() => createLocalMailDelivery({ NODE_ENV: 'production', P7_MAIL_MODE: 'local_mailpit', P7_LOCAL_MAILPIT_URL: 'http://mailpit:8025' })).toThrow('LOCAL_MAIL_EXPLICIT_CONFIGURATION_REQUIRED');
    for (const url of ['https://example.com', 'http://evil.invalid:8025', 'http://user:pass@localhost:8025', 'http://localhost:8025/path'])
        expect(() => createLocalMailDelivery({ P7_MAIL_MODE: 'local_mailpit', P7_LOCAL_MAILPIT_URL: url })).toThrow('INVALID_LOCAL_MAIL_CONFIGURATION');
});
test('HTTP challenge reaches the real local Mailpit inbox; its one-use code logs in and exact retry sends no duplicate email', async () => {
    const w = await accountWorld(true, undefined, false, true);
    try {
        const a = await account('STUDENT', false, w.organization), key = randomUUID(), body = { email: a.email, purpose: 'STUDENT_LOGIN' }, r = await w.call('POST', '/auth/challenges', body, undefined, key);
        expect(r.status, JSON.stringify(r.body)).toBe(202);
        async function inbox() { const response = await fetch(process.env.P7_LOCAL_MAILPIT_URL + '/api/v1/search?query=' + encodeURIComponent('to:' + a.email)); expect(response.status).toBe(200); return await response.json() as {
            messages: {
                ID: string;
            }[];
        }; }
        const received = await inbox();
        expect(received.messages).toHaveLength(1);
        const message = await fetch(process.env.P7_LOCAL_MAILPIT_URL + '/api/v1/message/' + received.messages[0]!.ID), mail = await message.json() as {
            Subject: string;
            Text: string;
            To: {
                Address: string;
            }[];
        };
        expect(mail.Subject).toBe('BNBU Sports / STUDENT_LOGIN');
        const code = /Verification code: (\d{6})/.exec(mail.Text)?.[1];
        expect(typeof code).toBe('string');
        expect((await w.call('POST', '/auth/challenges', body, undefined, key)).body).toEqual(r.body);
        expect((await inbox()).messages).toHaveLength(1);
        const credentials = { otpProof: { challengeId: r.body.challengeId, code } }, logged = await w.call('POST', '/auth/sessions/student', credentials);
        expect(logged.status, JSON.stringify(logged.body)).toBe(201);
        expect((await w.call('GET', '/me', undefined, logged.body.accessToken)).status).toBe(200);
        expect((await w.call('POST', '/auth/sessions/student', credentials)).body.code).toBe('CHALLENGE_EXPIRED');
        const missing = randomUUID() + '@example.edu';
        expect((await w.call('POST', '/auth/challenges', { email: missing, purpose: 'STUDENT_LOGIN' })).status).toBe(202);
        const none = await fetch(process.env.P7_LOCAL_MAILPIT_URL + '/api/v1/search?query=' + encodeURIComponent('to:' + missing));
        expect((await none.json() as {
            messages: unknown[];
        }).messages).toHaveLength(0);
        const wrong = createLocalMailDelivery({ P7_MAIL_MODE: 'local_mailpit', P7_LOCAL_MAILPIT_URL: 'http://127.0.0.1:1' });
        await expect(wrong.send(a.email, '123456', 'STUDENT_LOGIN')).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
    }
    finally {
        await w.server.app.close();
    }
});
test('local mail connection failure rolls back the challenge and never acknowledges an unaccepted delivery', async () => {
    const w = await accountWorld(true, undefined, false, true, 'http://127.0.0.1:1');
    try {
        const a = await account('STUDENT', false, w.organization), result = await w.call('POST', '/auth/challenges', { email: a.email, purpose: 'STUDENT_LOGIN' });
        expect(result.status).toBe(503);
        expect(result.body.code).toBe('DEPENDENCY_UNAVAILABLE');
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.auth_challenge WHERE organization_id=$1', [w.organization])).rows[0].n).toBe(0);
        expect(JSON.stringify(result.body)).not.toContain(a.email);
    }
    finally {
        await w.server.app.close();
    }
});
test('deletion erases anonymous registration receipts and rolls back all erasure if account deletion fails after cleanup', async () => {
    const p = await login(await account()), course = await publishedCourse(p.accessToken), invitation = await invite(p.accessToken, course), w = await accountWorld(true, org);
    try {
        const email = randomUUID() + '@example.edu', flowRequest = { clientFlowNonce: randomBytes(32).toString('hex') }, flowKey = randomUUID(), flow = await w.call('POST', '/course-invitations/' + invitation.invitationCode + '/new-student-flows', flowRequest, undefined, flowKey), proof = await w.proof(email, 'STUDENT_EMAIL_BINDING');
        const input = { name: 'Synthetic private identity', studentNumber: randomUUID(), gender: 'FEMALE', gradeYear: 3, college: null, major: null, administrativeClass: null, verifiedEmail: email, emailOtpProof: proof, flowId: flow.body.flow.flowId, flowAuthorization: flow.body.flowAuthorization }, key = randomUUID(), url = '/course-invitations/' + invitation.invitationCode + '/student-registration', registered = await w.call('POST', url, input, undefined, key);
        expect(registered.status, JSON.stringify(registered.body)).toBe(201);
        const id = registered.body.actor.userId, token = registered.body.accessToken, body = { otpProof: await w.proof(email, 'ACCOUNT_DELETION'), expectedVersion: 0, acknowledgement: 'DELETE_MY_ACCOUNT' }, deleteKey = randomUUID();
        await pool.query("CREATE FUNCTION public.g1_fail_actual_account_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_ACCOUNT_DELETE_FAILURE'; END $$");
        await pool.query('CREATE TRIGGER g1_fail_actual_account_delete BEFORE DELETE ON identity_access.login_account FOR EACH ROW EXECUTE FUNCTION public.g1_fail_actual_account_delete()');
        try {
            expect((await w.call('POST', '/me/account-deletion', body, token, deleteKey)).status).toBe(500);
        }
        finally {
            await pool.query('DROP TRIGGER g1_fail_actual_account_delete ON identity_access.login_account');
            await pool.query('DROP FUNCTION public.g1_fail_actual_account_delete()');
        }
        expect((await w.call('GET', '/me', undefined, token)).status).toBe(200);
        expect((await w.call('POST', url, input, undefined, key)).body).toEqual(registered.body);
        expect((await pool.query("SELECT count(*)::integer n FROM audit.audit_event WHERE actor_subject_id=$1 AND action='ACCOUNT_DELETED'", [id])).rows[0].n).toBe(0);
        expect((await w.call('POST', '/me/account-deletion', body, token, deleteKey)).status).toBe(200);
        expect((await w.call('POST', url, input, undefined, key)).body.code).toBe('INVITATION_FLOW_MISMATCH');
        expect((await pool.query('SELECT authorization_digest FROM course_enrollment.invitation_flow WHERE id=$1', [input.flowId])).rows[0].authorization_digest).toBeNull();
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.command_replay WHERE subject IN(SELECT subject FROM course_enrollment.invitation_flow WHERE student_subject_id=$1)', [id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.student_profile WHERE subject_id=$1', [id])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.enrollment WHERE student_subject_id=$1', [id])).rows[0].n).toBe(1);
    }
    finally {
        await w.server.app.close();
    }
});
test('email change remains student-only per the current owner decision', async () => {
    const teacher = await login(await account()), w = await accountWorld();
    try {
        const input = { currentEmailProof: { challengeId: randomUUID(), code: '123456' }, newEmailProof: { challengeId: randomUUID(), code: '654321' }, expectedVersion: 0 };
        expect((await http('PUT', '/me/verified-email', input, teacher.accessToken)).status).toBe(403);
        expect((await w.call('PUT', '/me/verified-email', input, w.adminToken)).status).toBe(403);
    }
    finally {
        await w.server.app.close();
    }
});
async function pageGet(url: string, token: string, cursor?: string | null) {
    const response = await http('GET', url + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), undefined, token);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body;
}
async function systemNotice(subject: string, safe = true) {
    const id = randomUUID();
    await pool.query(`INSERT INTO notification_center.in_app_notification
        (id,organization_id,recipient_subject_id,event_key,notification_type,title,body,target_route,target_id,created_at)
        VALUES($1::uuid,$2,$3,$1::text,'SYSTEM_MODE','系统已恢复 / System restored',$4,'SYSTEM_MODE',NULL,$5)`,
    [id, org, subject, safe ? '请刷新当前系统模式后继续操作。 / Refresh the current system mode to continue.' : 'Final grade 99', new Date(now)]);
    return id;
}
test('course keyset pages navigate both directions and reject cursor scope, filter, size and input changes', async () => {
    const p = await login(await account()), ids: string[] = [];
    for (let i = 0; i < 5; i++) {
        const created = await http('POST', '/teacher/courses', { semesterId: semester, name: 'Paged ' + i, description: null, rule }, p.accessToken);
        expect(created.status).toBe(201);
        ids.push(created.body.courseId);
    }
    const url = '/teacher/courses?limit=2&status=DRAFT';
    const first = await pageGet(url, p.accessToken), second = await pageGet(url, p.accessToken, first.page.nextCursor), third = await pageGet(url, p.accessToken, second.page.nextCursor);
    expect([...first.items, ...second.items, ...third.items].map(c => c.courseId)).toEqual(ids.sort());
    expect(first.page.previousCursor).toBeNull();
    expect(third.page.nextCursor).toBeNull();
    const back = await pageGet(url, p.accessToken, third.page.previousCursor);
    expect(back.items).toEqual(second.items);
    expect((await pageGet(url, p.accessToken, back.page.previousCursor)).items).toEqual(first.items);
    const cursor = encodeURIComponent(first.page.nextCursor), peer = await login(await account());
    for (const target of ['/teacher/courses?limit=3&status=DRAFT', '/teacher/courses?limit=2&status=OPEN', '/courses/' + ids[0] + '/members?limit=2'])
        expect((await http('GET', target + '&cursor=' + cursor, undefined, p.accessToken)).body.code).toBe('INVALID_CURSOR');
    expect((await http('GET', url + '&cursor=' + cursor, undefined, peer.accessToken)).body.code).toBe('INVALID_CURSOR');
    expect((await http('GET', url + '&cursor=broken', undefined, p.accessToken)).body.code).toBe('INVALID_CURSOR');
});
test('member status filters precede pagination and preserve ownership checks', async () => {
    const f = await admissionFixture(), removed: string[] = [];
    for (let i = 0; i < 2; i++) {
        const s = await account('STUDENT'), token = (await studentToken(s)).accessToken;
        const flow = await g1.courses.registerExisting(token, f.invitation.invitationCode, { expectedAccountVersion: 0 }, command());
        const e = await g1.courses.join(token, f.invitation.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command());
        const r = await http('POST', '/courses/' + f.course.courseId + '/members/' + e.id + '/removal', { expectedVersion: 0, studentVisibleReason: 'Transfer' }, f.p.accessToken);
        expect(r.status, JSON.stringify(r.body)).toBe(200);
        removed.push(e.id);
    }
    const url = '/courses/' + f.course.courseId + '/members?limit=1';
    const active = await pageGet(url + '&status=ACTIVE', f.p.accessToken);
    expect(active.items.map((e: { enrollmentId: string }) => e.enrollmentId)).toEqual([f.enrollment.id]);
    expect(active.page).toMatchObject({ nextCursor: null, previousCursor: null });
    const first = await pageGet(url + '&status=REMOVED', f.p.accessToken), second = await pageGet(url + '&status=REMOVED', f.p.accessToken, first.page.nextCursor);
    expect([...first.items, ...second.items].map(e => e.enrollmentId)).toEqual(removed.sort());
    expect((await pageGet(url + '&status=REMOVED', f.p.accessToken, second.page.previousCursor)).items).toEqual(first.items);
    expect((await http('GET', url + '&status=ACTIVE&cursor=' + encodeURIComponent(first.page.nextCursor), undefined, f.p.accessToken)).body.code).toBe('INVALID_CURSOR');
    const peer = await login(await account());
    expect((await http('GET', url, undefined, peer.accessToken)).status).toBe(403);
});
test('invitation and both makeup lists return usable reverse cursors with isolated resources', async () => {
    const f = await admissionFixture();
    for (let i = 0; i < 2; i++) {
        await invite(f.p.accessToken, f.course);
        expect((await http('POST', '/courses/' + f.course.courseId + '/makeup-authorizations', {
            enrollmentId: f.enrollment.id, startsAt: '2026-12-0' + (i + 3) + 'T00:00:00Z', endsAtExclusive: '2026-12-0' + (i + 3) + 'T01:00:00Z', expectedCourseVersion: f.course.version
        }, f.p.accessToken)).status).toBe(200);
    }
    const sp = await studentToken(f.student);
    const urls = ['/courses/' + f.course.courseId + '/invitations?limit=2', '/courses/' + f.course.courseId + '/makeup-authorizations?limit=2', '/student/makeup-authorizations?limit=2'];
    for (const [i, url] of urls.entries()) {
        const token = i === 2 ? sp.accessToken : f.p.accessToken;
        const first = await pageGet(url, token), second = await pageGet(url, token, first.page.nextCursor);
        expect(first.items).toHaveLength(2); expect(second.items).toHaveLength(1);
        expect(second.page.nextCursor).toBeNull();
        expect((await pageGet(url, token, second.page.previousCursor)).items).toEqual(first.items);
    }
    const first = await pageGet(urls[0]!, f.p.accessToken);
    expect((await http('GET', urls[1] + '&cursor=' + encodeURIComponent(first.page.nextCursor), undefined, f.p.accessToken)).body.code).toBe('INVALID_CURSOR');
    await g1.courses.revokeInvitation(f.p.accessToken, f.course.courseId, f.invitation.invitation.invitationId, { expectedVersion: 0 }, command());
    const active = await pageGet(urls[0] + '&status=ACTIVE', f.p.accessToken);
    expect(active.items).toHaveLength(2);
    expect(active.page.nextCursor).toBeNull();
});
test('notification pagination uses a deterministic tie break and filters unsafe and read messages before paging', async () => {
    for (const role of ['STUDENT', 'TEACHER'] as const) {
        const a = await account(role), p = role === 'STUDENT' ? await studentToken(a) : await login(a), ids: string[] = [];
        for (let i = 0; i < 5; i++) ids.push(await systemNotice(a.id));
        await systemNotice(a.id, false);
        const url = (role === 'STUDENT' ? '/student' : '') + '/notifications';
        expect((await http('GET', url + '/unread-count', undefined, p.accessToken)).body.unreadCount).toBe(5);
        const first = await pageGet(url + '?limit=2', p.accessToken), second = await pageGet(url + '?limit=2', p.accessToken, first.page.nextCursor), third = await pageGet(url + '?limit=2', p.accessToken, second.page.nextCursor);
        expect([...first.items, ...second.items, ...third.items].map(n => n.notificationId)).toEqual(ids.sort().reverse());
        expect(first.page.previousCursor).toBeNull(); expect(third.page.nextCursor).toBeNull();
        const back = await pageGet(url + '?limit=2', p.accessToken, third.page.previousCursor);
        expect(back.items).toEqual(second.items);
        expect((await pageGet(url + '?limit=2', p.accessToken, back.page.previousCursor)).items).toEqual(first.items);
        expect((await http('POST', url + '/' + ids[0] + '/read', undefined, p.accessToken)).status).toBe(200);
        expect((await pageGet(url + '?limit=2&read=true', p.accessToken)).items.map((n: { notificationId: string }) => n.notificationId)).toEqual([ids[0]]);
        expect((await http('GET', url + '?limit=2&read=false&cursor=' + encodeURIComponent(first.page.nextCursor), undefined, p.accessToken)).body.code).toBe('INVALID_CURSOR');
        expect((await http('GET', url + '/unread-count', undefined, p.accessToken)).body.unreadCount).toBe(4);
    }
});
test('student read receipts replay in maintenance but still recheck current account, recipient and whole message safety', async () => {
    const a = await account('STUDENT'), peer = await account('STUDENT'), p = await studentToken(a), peerToken = (await studentToken(peer)).accessToken;
    const id = await systemNotice(a.id), url = '/student/notifications/' + id + '/read', key = randomUUID();
    const [first, retry] = await Promise.all([http('POST', url, undefined, p.accessToken, key), http('POST', url, undefined, p.accessToken, key)]);
    expect(first.status).toBe(200); expect(retry.status).toBe(200); expect(retry.body).toEqual(first.body);
    expect((await pool.query('SELECT read_at FROM notification_center.in_app_notification WHERE id=$1', [id])).rows[0].read_at.toISOString()).toBe(first.body.readAt);
    const rows = (await pool.query('SELECT * FROM notification_center.command_replay WHERE subject=$1', [org + '/' + a.id])).rows;
    expect(rows).toHaveLength(1); expect(rows[0].sealed_result).not.toContain(first.body.title); expect(JSON.stringify(rows)).not.toContain(p.accessToken);
    await pool.query("UPDATE system_mode.state SET mode='MAINTENANCE',announcement=$2 WHERE organization_id=$1", [org, JSON.stringify({ titleZh: '维护', titleEn: 'Maintenance', bodyZh: '维护中', bodyEn: 'Maintenance', estimatedRecoveryAt: '2026-09-11T00:00:00Z' })]);
    try {
        expect((await http('POST', url, undefined, p.accessToken, key)).body).toEqual(first.body);
        const fresh = await http('POST', url, undefined, p.accessToken);
        expect(fresh.status).toBe(503); expect(fresh.body.code).toBe('SYSTEM_MAINTENANCE');
        expect((await http('POST', url, undefined, peerToken, key)).status).toBe(404);
        await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED' WHERE subject_id=$1", [a.id]);
        expect((await http('POST', url, undefined, p.accessToken, key)).status).toBe(403);
        await pool.query("UPDATE identity_access.login_account SET access_state='ACTIVE' WHERE subject_id=$1", [a.id]);
        await pool.query("UPDATE notification_center.in_app_notification SET body='Final grade 99' WHERE id=$1", [id]);
        const unsafe = await http('POST', url, undefined, p.accessToken, key);
        expect(unsafe.status).toBe(404); expect(JSON.stringify(unsafe.body)).not.toContain('99');
    } finally {
        await pool.query("UPDATE system_mode.state SET mode='NORMAL',announcement=NULL WHERE organization_id=$1", [org]);
    }
    expect((await pool.query('SELECT count(*)::integer n FROM notification_center.command_replay WHERE subject=$1', [org + '/' + a.id])).rows[0].n).toBe(1);
});
test('unsafe stored notification receipts are refused even when the current source is safe', async () => {
    const a = await account('STUDENT'), p = await studentToken(a), id = await systemNotice(a.id), key = randomUUID(), url = '/student/notifications/' + id + '/read';
    expect((await http('POST', url, undefined, p.accessToken, key)).status).toBe(200);
    const subject = org + '/' + a.id, operation = 'markOwnStudentNotificationRead/' + id, digest = secrets.digest('idempotency-key', key), context = subject + '/' + operation + '/' + digest;
    const row = (await pool.query('SELECT sealed_result FROM notification_center.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, digest])).rows[0];
    const result = secrets.open<Record<string, unknown>>(context, row.sealed_result);
    await pool.query('UPDATE notification_center.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, digest, secrets.seal(context, { ...result, body: 'Final grade 99' })]);
    const response = await http('POST', url, undefined, p.accessToken, key);
    expect(response.status).toBe(404); expect(JSON.stringify(response.body)).not.toContain('Final grade');
    expect((await http('POST', url, undefined, p.accessToken)).status).toBe(200);
});
test('notification receipt failure rolls back readAt and reservation before an exact successful retry', async () => {
    const a = await account('STUDENT'), p = await studentToken(a), id = await systemNotice(a.id), key = randomUUID(), url = '/student/notifications/' + id + '/read';
    await pool.query("CREATE FUNCTION public.g1_fail_notice_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_RECEIPT_FAILURE'; END $$");
    await pool.query('CREATE TRIGGER g1_fail_notice_receipt BEFORE UPDATE OF sealed_result ON notification_center.command_replay FOR EACH ROW EXECUTE FUNCTION public.g1_fail_notice_receipt()');
    try {
        expect((await http('POST', url, undefined, p.accessToken, key)).status).toBe(500);
    } finally {
        await pool.query('DROP TRIGGER g1_fail_notice_receipt ON notification_center.command_replay');
        await pool.query('DROP FUNCTION public.g1_fail_notice_receipt()');
    }
    expect((await pool.query('SELECT read_at FROM notification_center.in_app_notification WHERE id=$1', [id])).rows[0].read_at).toBeNull();
    expect((await pool.query('SELECT count(*)::integer n FROM notification_center.command_replay WHERE subject=$1', [org + '/' + a.id])).rows[0].n).toBe(0);
    const success = await http('POST', url, undefined, p.accessToken, key);
    expect(success.status).toBe(200); expect((await http('POST', url, undefined, p.accessToken, key)).body).toEqual(success.body);
});
async function replayableStudentLogin() {
    const a = await account('STUDENT'), challenge = await g1.identity.requestChallenge({ email: a.email, purpose: 'STUDENT_LOGIN' }, command());
    const body = { otpProof: { challengeId: challenge.challengeId, code: delivered.findLast(d => d.email === a.email)!.code } }, key = randomUUID();
    const first = await http('POST', '/auth/sessions/student', body, undefined, key);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    return { a, body, key, first };
}
test('student login exact replay checks current disabled state before returning credentials', async () => {
    const f = await replayableStudentLogin();
    const retry = await http('POST', '/auth/sessions/student', f.body, undefined, f.key);
    expect(retry.status).toBe(201); expect(retry.body).toEqual(f.first.body);
    await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED' WHERE subject_id=$1", [f.a.id]);
    const disabled = await http('POST', '/auth/sessions/student', f.body, undefined, f.key);
    expect(disabled.status).toBe(403); expect(disabled.body.code).toBe('ACCOUNT_DISABLED');
    expect(disabled.body).not.toHaveProperty('accessToken'); expect(disabled.body).not.toHaveProperty('actor');
});
test('student login replay cannot present a logged-out or rotated pair as a new login', async () => {
    for (const action of ['logout', 'refresh'] as const) {
        const f = await replayableStudentLogin();
        const change = action === 'logout'
            ? await http('POST', '/auth/sessions/current/logout', undefined, f.first.body.accessToken)
            : await http('POST', '/auth/sessions/refresh', { refreshToken: f.first.body.refreshToken });
        expect(change.status).toBe(200);
        const stale = await http('POST', '/auth/sessions/student', f.body, undefined, f.key);
        expect(stale.status).toBe(401); expect(stale.body.code).toBe('INVALID_CREDENTIALS');
        expect(stale.body).not.toHaveProperty('accessToken');
        expect((await pool.query('SELECT count(*)::integer n FROM identity_access.auth_session WHERE subject_id=$1', [f.a.id])).rows[0].n).toBe(1);
        if (action === 'refresh') expect((await http('GET', '/me', undefined, change.body.accessToken)).status).toBe(200);
    }
});
test('password login replay rejects its revoked pair while a new command can log in', async () => {
    const a = await account(), body = { loginType: 'TEACHER_EMAIL', identifier: a.email, password: 'InitialA1!' }, key = randomUUID();
    const first = await http('POST', '/auth/sessions/password', body, undefined, key);
    expect(first.status).toBe(201);
    expect((await http('POST', '/auth/sessions/password', body, undefined, key)).body).toEqual(first.body);
    expect((await http('POST', '/auth/sessions/current/logout', undefined, first.body.accessToken)).status).toBe(200);
    const stale = await http('POST', '/auth/sessions/password', body, undefined, key);
    expect(stale.status).toBe(401); expect(stale.body.code).toBe('INVALID_CREDENTIALS');
    expect(stale.body).not.toHaveProperty('refreshToken');
    expect((await http('POST', '/auth/sessions/password', body)).status).toBe(201);
});
test('login receipt expiry uses declared invalid-credential errors and never returns expired tokens', async () => {
    const f = await replayableStudentLogin(), a = await account(), body = { loginType: 'TEACHER_EMAIL', identifier: a.email, password: 'InitialA1!' }, key = randomUUID();
    expect((await http('POST', '/auth/sessions/password', body, undefined, key)).status).toBe(201);
    now += 7 * 86400000;
    try {
        for (const r of [await http('POST', '/auth/sessions/student', f.body, undefined, f.key), await http('POST', '/auth/sessions/password', body, undefined, key)]) {
            expect(r.status).toBe(401); expect(r.body.code).toBe('INVALID_CREDENTIALS');
            expect(r.body).not.toHaveProperty('actor');
        }
    } finally { now = start; }
});
test('refresh replay acquires its account before its receipt so closure can take locks in the same order', async () => {
    const a = await account(), p = await login(a), body = { refreshToken: p.refreshToken }, key = randomUUID();
    const first = await http('POST', '/auth/sessions/refresh', body, undefined, key);
    expect(first.status).toBe(200);
    const client = await pool.connect();
    let pending: ReturnType<typeof http> | undefined;
    try {
        await client.query('BEGIN');
        const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT subject_id FROM identity_access.login_account WHERE subject_id=$1 FOR UPDATE', [a.id]);
        pending = http('POST', '/auth/sessions/refresh', body, undefined, key);
        let waiting = false;
        for (let i = 0; i < 60; i++) {
            const blocked = await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid)) AND wait_event_type='Lock'", [pid]);
            if (blocked.rowCount) { waiting = true; break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        // Real row locking, not a timing guess: an account owner must still be able to take this receipt.
        const receipt = await client.query('SELECT subject FROM identity_access.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE NOWAIT', [secrets.digest('refresh', p.refreshToken), 'refreshSession', secrets.digest('idempotency-key', key)]);
        expect(receipt.rowCount).toBe(1);
    } finally {
        await client.query('ROLLBACK'); client.release();
        if (pending) {
            const replayed = await pending;
            expect(replayed.status, JSON.stringify(replayed.body)).toBe(200);
            expect(replayed.body).toEqual(first.body);
        }
    }
});
test.each(['preview', 'new-flow', 'existing-flow', 'join'] as const)('invitation %s uses course-before-invitation locks and observes a committed revocation', async kind => {
    const teacher = await login(await account()), course = await publishedCourse(teacher.accessToken), invitation = await invite(teacher.accessToken, course);
    const prefix = '/course-invitations/' + invitation.invitationCode;
    let token: string | undefined, body: unknown, url = prefix, method = 'POST';
    if (kind === 'preview') method = 'GET';
    else if (kind === 'new-flow') { url += '/new-student-flows'; body = { clientFlowNonce: randomBytes(32).toString('hex') }; }
    else {
        token = (await studentToken(await account('STUDENT'))).accessToken;
        if (kind === 'existing-flow') { url += '/existing-student-flows'; body = { expectedAccountVersion: 0 }; }
        else {
            const flow = await g1.courses.registerExisting(token, invitation.invitationCode, { expectedAccountVersion: 0 }, command());
            url += '/join'; body = { expectedAccountVersion: 0, flowId: flow.id };
        }
    }
    const client = await pool.connect();
    let pending: ReturnType<typeof http> | undefined;
    try {
        await client.query('BEGIN');
        const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT id FROM course_enrollment.course WHERE id=$1 FOR UPDATE', [course.courseId]);
        pending = http(method, url, body, token);
        let waiting = false;
        for (let i = 0; i < 60; i++) {
            const blocked = await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid)) AND wait_event_type='Lock'", [pid]);
            if (blocked.rowCount) { waiting = true; break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        // Simulate the already-owned revocation transaction's state commit; use actual PG row locks.
        const locked = await client.query('SELECT id FROM course_enrollment.course_invitation WHERE id=$1 FOR UPDATE NOWAIT', [invitation.invitation.invitationId]);
        expect(locked.rowCount).toBe(1);
        await client.query('UPDATE course_enrollment.course_invitation SET revoked=true,version=version+1 WHERE id=$1', [invitation.invitation.invitationId]);
        await client.query('COMMIT');
        const result = await pending;
        if (kind === 'preview') {
            expect(result.status, JSON.stringify(result.body)).toBe(200);
            expect(result.body).toMatchObject({ status: 'REVOKED', newRegistrationAllowed: false, unavailableReason: 'REVOKED' });
        } else {
            expect(result.status, JSON.stringify(result.body)).toBe(kind === 'join' ? 409 : 422);
            expect(result.body.code).toBe(kind === 'join' ? 'INVITATION_FLOW_TERMINATED' : 'INVITATION_INVALID');
        }
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.enrollment WHERE course_id=$1', [course.courseId])).rows[0].n).toBe(0);
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.invitation_flow WHERE invitation_id=$1', [invitation.invitation.invitationId])).rows[0].n).toBe(kind === 'join' ? 1 : 0);
    } finally {
        await client.query('ROLLBACK'); client.release();
        if (pending) await pending;
    }
});
test.each(['logout', 'refresh', 'disable'] as const)('anonymous registration replay rejects credentials after %s', async action => {
    const teacher = await login(await account()), course = await publishedCourse(teacher.accessToken), invitation = await invite(teacher.accessToken, course);
    const prefix = '/course-invitations/' + invitation.invitationCode;
    const flow = await http('POST', prefix + '/new-student-flows', { clientFlowNonce: randomBytes(32).toString('hex') });
    const email = randomUUID() + '@example.edu', challenge = await g1.identity.requestChallenge({ purpose: 'STUDENT_EMAIL_BINDING', email }, command());
    const input = { name: 'Synthetic registration lifecycle', studentNumber: randomUUID(), gender: 'MALE', gradeYear: 2, college: null, major: null, administrativeClass: null, verifiedEmail: email,
        emailOtpProof: { challengeId: challenge.challengeId, code: delivered.findLast(d => d.email === email)!.code }, flowId: flow.body.flow.flowId, flowAuthorization: flow.body.flowAuthorization };
    const key = randomUUID(), url = prefix + '/student-registration', first = await http('POST', url, input, undefined, key);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    expect((await http('POST', url, input, undefined, key)).body).toEqual(first.body);
    if (action === 'logout') expect((await http('POST', '/auth/sessions/current/logout', {}, first.body.accessToken)).status).toBe(200);
    if (action === 'refresh') expect((await http('POST', '/auth/sessions/refresh', { refreshToken: first.body.refreshToken })).status).toBe(200);
    if (action === 'disable') await pool.query("UPDATE identity_access.login_account SET access_state='DISABLED',version=version+1 WHERE subject_id=$1", [first.body.actor.userId]);
    const again = await http('POST', url, input, undefined, key);
    expect({ status: again.status, code: again.body.code }).toEqual({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.enrollment WHERE student_subject_id=$1', [first.body.actor.userId])).rows[0].n).toBe(1);
});
test.each(['password', 'student'] as const)('login %s replay cannot return an access-expired pair with a still-live refresh', async kind => {
    const a = await account(kind === 'password' ? 'TEACHER' : 'STUDENT'), key = randomUUID();
    const proof = kind === 'student' ? await g1.identity.requestChallenge({ email: a.email, purpose: 'STUDENT_LOGIN' }, command()) : null;
    const input = kind === 'password' ? { loginType: 'TEACHER_EMAIL', identifier: a.email, password: 'InitialA1!' }
        : { otpProof: { challengeId: proof!.challengeId, code: delivered.findLast(d => d.email === a.email)!.code } };
    const url = '/auth/sessions/' + kind, first = await http('POST', url, input, undefined, key);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const savedNow = now;
    try {
        now = Date.parse(first.body.accessExpiresAt);
        expect(now).toBeLessThan(Date.parse(first.body.refreshExpiresAt));
        const again = await http('POST', url, input, undefined, key);
        expect({ status: again.status, code: again.body.code }).toEqual({ status: 401, code: 'INVALID_CREDENTIALS' });
        expect((await http('POST', '/auth/sessions/refresh', { refreshToken: first.body.refreshToken })).status).toBe(200);
    } finally { now = savedNow; }
});
test('concurrent anonymous registration preserves one account enrollment and live exact receipt', async () => {
    const teacher = await login(await account()), course = await publishedCourse(teacher.accessToken), invitation = await invite(teacher.accessToken, course), email = randomUUID() + '@example.edu';
    const prefix = '/course-invitations/' + invitation.invitationCode, flow = await http('POST', prefix + '/new-student-flows', { clientFlowNonce: randomBytes(32).toString('hex') });
    const proof = await g1.identity.requestChallenge({ purpose: 'STUDENT_EMAIL_BINDING', email }, command());
    const input = { name: 'Synthetic concurrent registration', studentNumber: randomUUID(), gender: 'FEMALE', gradeYear: 1, college: null, major: null, administrativeClass: null, verifiedEmail: email,
        emailOtpProof: { challengeId: proof.challengeId, code: delivered.findLast(d => d.email === email)!.code }, flowId: flow.body.flow.flowId, flowAuthorization: flow.body.flowAuthorization };
    const key = randomUUID(), url = prefix + '/student-registration';
    const results = await Promise.all([http('POST', url, input, undefined, key), http('POST', url, input, undefined, key)]);
    expect(results.map(r => r.status), JSON.stringify(results)).toEqual([201, 201]); expect(results[0]!.body).toEqual(results[1]!.body);
    const client = await pool.connect(); let pending: ReturnType<typeof http> | undefined;
    try {
        await client.query('BEGIN'); const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT subject_id FROM identity_access.login_account WHERE subject_id=$1 FOR UPDATE', [results[0]!.body.actor.userId]);
        pending = http('POST', url, input, undefined, key); let waiting = false;
        for (let i = 0; i < 100; i++) {
            if ((await pool.query('SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid))', [pid])).rowCount) { waiting = true; break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        expect((await client.query('SELECT id FROM course_enrollment.course WHERE id=$1 FOR UPDATE NOWAIT', [course.courseId])).rowCount).toBe(1);
        await client.query('COMMIT'); expect((await pending).body).toEqual(results[0]!.body);
    } finally { await client.query('ROLLBACK'); client.release(); if (pending) await pending; }
    expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.enrollment WHERE course_id=$1', [course.courseId])).rows[0].n).toBe(1);
});
test('administrator student directory searches and paginates scoped current account facts without mutation', async () => {
    const f = await joinedFixture(), w = await accountWorld(true, org), tag = 'SyntheticDirectory-' + randomUUID();
    try {
        const admin = await account('ADMIN'), token = (await w.call('POST', '/auth/sessions/password', { loginType: 'ADMIN_EMAIL', identifier: admin.email, password: 'InitialA1!' })).body.accessToken;
        const ids = [f.student.id, (await account('STUDENT')).id, (await account('STUDENT')).id];
        await pool.query('UPDATE identity_access.student_profile SET college=$2,major=$3,administrative_class=$4 WHERE subject_id=ANY($1::uuid[])', [ids, tag, 'Synthetic Major', 'Synthetic Class']);
        const url = '/admin/student-accounts?q=' + encodeURIComponent(tag) + '&limit=2';
        const first = await w.call('GET', url, undefined, token); expect(first.status, JSON.stringify(first.body)).toBe(200); expect(first.body.items).toHaveLength(2);
        const next = await w.call('GET', url + '&cursor=' + encodeURIComponent(first.body.page.nextCursor), undefined, token); expect(next.status).toBe(200); expect(next.body.items).toHaveLength(1);
        const back = await w.call('GET', url + '&cursor=' + encodeURIComponent(next.body.page.previousCursor), undefined, token); expect(back.body.items).toEqual(first.body.items);
        expect(new Set([...first.body.items, ...next.body.items].map((r: { student: { studentId: string } }) => r.student.studentId))).toEqual(new Set(ids));
        expect((await w.call('GET', url + '&status=ACTIVE', undefined, token)).body.items.map((r: { student: { studentId: string } }) => r.student.studentId)).toEqual([f.student.id]);
        expect((await w.call('GET', '/admin/student-accounts?collegeOrDepartment=' + encodeURIComponent(tag) + '&status=PENDING', undefined, token)).body.items).toHaveLength(2);
        expect((await w.call('GET', url + '&status=PENDING&cursor=' + encodeURIComponent(first.body.page.nextCursor), undefined, token)).body.code).toBe('INVALID_CURSOR');
        const detail = await w.call('GET', '/admin/student-accounts/' + f.student.id, undefined, token); expect(detail.status).toBe(200); expect(detail.body.student.studentStatus).toBe('ACTIVE');
        expect(Object.keys(detail.body).sort()).toEqual(['organizationId', 'student', 'updatedAt', 'verifiedEmail', 'version']);
        expect((await w.call('GET', '/admin/student-accounts/' + f.student.id, undefined, f.teacher.accessToken)).status).toBe(403);
        expect((await w.call('GET', '/admin/student-accounts', undefined, f.pair.accessToken)).status).toBe(403);
        expect((await w.call('PATCH', '/admin/student-accounts/' + f.student.id, { name: 'Forbidden' }, token)).status).toBe(404);
        const other = await accountWorld();
        try { const outsider = await account('STUDENT', false, other.organization); expect((await w.call('GET', '/admin/student-accounts/' + outsider.id, undefined, token)).status).toBe(404); }
        finally { await other.server.app.close(); }
    } finally { await w.server.app.close(); }
});
test('student directory rechecks admin permissions and excludes physically deleted current profiles', async () => {
    const w = await accountWorld();
    try {
        const password = 'SyntheticA1!', created = await w.call('POST', '/admin/sub-admins', { loginName: 'reader-' + randomUUID(), name: 'Synthetic Reader', verifiedEmail: randomUUID() + '@example.edu', department: null, permissions: ['USERS_ACCOUNTS'], initialPassword: password, confirmInitialPassword: password }, w.adminToken);
        expect(created.status, JSON.stringify(created.body)).toBe(201);
        const login = await w.call('POST', '/auth/sessions/password', { loginType: 'ADMIN_LOGIN_NAME', identifier: created.body.loginName, password });
        expect(login.status).toBe(201);
        // Clear first-password-change through the real password API before exercising the permission gate.
        const changed = await w.call('PUT', '/me/password', { currentPassword: password, newPassword: 'ChangedSyntheticA2!', expectedVersion: login.body.actor.version }, login.body.accessToken);
        expect(changed.status, JSON.stringify(changed.body)).toBe(200);
        const student = await account('STUDENT', false, w.organization), pair = await w.student(student), url = '/admin/student-accounts/' + student.id;
        expect((await w.call('GET', url, undefined, login.body.accessToken)).status).toBe(200);
        const updated = await w.call('PUT', '/admin/sub-admins/' + created.body.adminId, { name: created.body.name, verifiedEmail: created.body.verifiedEmail, department: null, permissions: ['SEMESTER'], expectedVersion: changed.body.version }, w.adminToken);
        expect(updated.status, JSON.stringify(updated.body)).toBe(200);
        expect((await w.call('GET', url, undefined, login.body.accessToken)).status).toBe(403);
        const deletion = await w.call('POST', '/me/account-deletion', { otpProof: await w.proof(student.email, 'ACCOUNT_DELETION'), expectedVersion: 0, acknowledgement: 'DELETE_MY_ACCOUNT' }, pair.accessToken);
        expect(deletion.status, JSON.stringify(deletion.body)).toBe(200);
        expect((await w.call('GET', url, undefined, w.adminToken)).status).toBe(404);
        expect((await w.call('GET', '/admin/student-accounts', undefined, w.adminToken)).body.items).toEqual([]);
    } finally { await w.server.app.close(); }
});
async function joinedFixture() {
    const teacher = await login(await account()), student = await account('STUDENT'), pair = await studentToken(student);
    const course = await publishedCourse(teacher.accessToken), invitation = await invite(teacher.accessToken, course);
    const flow = await g1.courses.registerExisting(pair.accessToken, invitation.invitationCode, { expectedAccountVersion: 0 }, command());
    const enrollment = await g1.courses.join(pair.accessToken, invitation.invitationCode, { expectedAccountVersion: 0, flowId: flow.id }, command());
    return { teacher, student, pair, course, enrollment };
}
test.each(['removal', 'restoration'] as const)('member %s locks its student before the course', async action => {
    const f = await joinedFixture();
    if (action === 'restoration') await g1.courses.transitionMember(f.teacher.accessToken, f.course.courseId, f.enrollment.id, false, { expectedVersion: 0, studentVisibleReason: 'Synthetic removal' }, command());
    const client = await pool.connect(); let pending: ReturnType<typeof http> | undefined;
    try {
        await client.query('BEGIN');
        const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT subject_id FROM identity_access.login_account WHERE subject_id=$1 FOR UPDATE', [f.student.id]);
        pending = http('POST', '/courses/' + f.course.courseId + '/members/' + f.enrollment.id + '/' + action, { expectedVersion: action === 'restoration' ? 1 : 0, studentVisibleReason: 'Synthetic transition' }, f.teacher.accessToken);
        let waiting = false;
        for (let i = 0; i < 100; i++) {
            if ((await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid))", [pid])).rowCount) { waiting = true; break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        expect((await client.query('SELECT id FROM course_enrollment.course WHERE id=$1 FOR UPDATE NOWAIT', [f.course.courseId])).rowCount).toBe(1);
        await client.query('COMMIT');
        const r = await pending; expect(r.status, JSON.stringify(r.body)).toBe(200);
        expect(r.body.status).toBe(action === 'restoration' ? 'ACTIVE' : 'REMOVED');
    } finally { await client.query('ROLLBACK'); client.release(); if (pending) await pending; }
});
test.each(['/student/course', '/student/makeup-authorizations'] as const)('student read %s does not lock its enrollment before its course', async url => {
    const f = await joinedFixture(), client = await pool.connect(); let pending: ReturnType<typeof http> | undefined;
    try {
        await client.query('BEGIN'); const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT id FROM course_enrollment.course WHERE id=$1 FOR UPDATE', [f.course.courseId]);
        pending = http('GET', url, undefined, f.pair.accessToken);
        let waiting = false;
        for (let i = 0; i < 100; i++) {
            if ((await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid))", [pid])).rowCount) { waiting = true; break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        expect((await client.query('SELECT id FROM course_enrollment.enrollment WHERE id=$1 FOR UPDATE NOWAIT', [f.enrollment.id])).rowCount).toBe(1);
        expect((await client.query('SELECT id FROM academic_term.semester WHERE id=$1 FOR UPDATE NOWAIT', [semester])).rowCount).toBe(1);
        await client.query('COMMIT'); const r = await pending; expect(r.status, JSON.stringify(r.body)).toBe(200);
    } finally { await client.query('ROLLBACK'); client.release(); if (pending) await pending; }
});
test.each(['members', 'impact'] as const)('course %s projects students without locking a second account behind its course', async kind => {
    const f = await joinedFixture(), client = await pool.connect(); let pending: ReturnType<typeof http> | undefined;
    let result: Awaited<ReturnType<typeof http>> | undefined;
    try {
        await client.query('BEGIN'); const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await client.query('SELECT subject_id FROM identity_access.login_account WHERE subject_id=$1 FOR UPDATE', [f.student.id]);
        pending = (kind === 'members' ? http('GET', '/courses/' + f.course.courseId + '/members', undefined, f.teacher.accessToken)
            : http('POST', '/courses/' + f.course.courseId + '/change-impact', { expectedVersion: f.course.version, name: 'Synthetic change', description: null }, f.teacher.accessToken)).then(r => { result = r; return r; });
        for (let i = 0; i < 100 && !result; i++) {
            if ((await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND $1::integer=ANY(pg_blocking_pids(pid))", [pid])).rowCount) break;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(result?.status, 'Read projection must complete while an unrelated student credential transaction holds its account').toBe(200);
        const rows = kind === 'members' ? result!.body.items.map((e: { student: { studentId: string } }) => e.student) : result!.body.affectedStudents;
        expect(rows.map((v: { studentId: string }) => v.studentId)).toContain(f.student.id);
    } finally { await client.query('ROLLBACK'); client.release(); if (pending) await pending; }
});
test('restoration and another-course join serialize through the student without duplicate active membership', async () => {
    const f = await joinedFixture();
    await g1.courses.transitionMember(f.teacher.accessToken, f.course.courseId, f.enrollment.id, false, { expectedVersion: 0, studentVisibleReason: 'Synthetic removed' }, command());
    const otherTeacher = await login(await account()), otherCourse = await publishedCourse(otherTeacher.accessToken), invitation = await invite(otherTeacher.accessToken, otherCourse);
    const flow = await g1.courses.registerExisting(f.pair.accessToken, invitation.invitationCode, { expectedAccountVersion: 0 }, command());
    const results = await Promise.all([
        http('POST', '/courses/' + f.course.courseId + '/members/' + f.enrollment.id + '/restoration', { expectedVersion: 1, studentVisibleReason: 'Synthetic restore' }, f.teacher.accessToken),
        http('POST', '/course-invitations/' + invitation.invitationCode + '/join', { expectedAccountVersion: 0, flowId: flow.id }, f.pair.accessToken)
    ]);
    expect([[200, 409], [409, 201]], JSON.stringify(results)).toContainEqual(results.map(r => r.status));
    expect(results.find(r => r.status === 409)?.body.code).toBe('COURSE_ALREADY_JOINED');
    expect((await pool.query("SELECT count(*)::integer n FROM course_enrollment.enrollment WHERE student_subject_id=$1 AND semester_id=$2 AND status='ACTIVE'", [f.student.id, semester])).rows[0].n).toBe(1);
    const denied = await http('POST', '/courses/' + f.course.courseId + '/members/' + f.enrollment.id + '/removal', { expectedVersion: 0, studentVisibleReason: 'Not my course' }, otherTeacher.accessToken);
    expect(denied.status).toBe(403);
});
// These real HTTP acceptance cases deliberately stay red until P7-Z-CR-query-errors-01
// supplies an allowed request-validation error. Do not alias invalid input to INVALID_CURSOR.
test('PENDING query-error Contract CR: invalid course limit and status must return a client error', async () => {
    const p = await login(await account());
    const responses = [];
    // Exponent notation and repeated scalar parameters await a serialization decision;
    // they are not part of this CR's established range/enum acceptance requirements.
    for (const invalid of ['limit=0', 'limit=101', 'limit=2.5', 'status=ACTIVE']) {
        const result = await http('GET', '/teacher/courses?' + invalid, undefined, p.accessToken);
        responses.push({ input: invalid, status: result.status, code: result.body.code });
    }
    expect(responses).toEqual(responses.map(r => ({ ...r, status: 400, code: 'INVALID_REQUEST' })));
});
test('PENDING query-error Contract CR: invalid member status must return a client error', async () => {
    const f = await admissionFixture();
    const result = await http('GET', '/courses/' + f.course.courseId + '/members?status=INVALID', undefined, f.p.accessToken);
    expect({ status: result.status, code: result.body.code }).toEqual({ status: 400, code: 'INVALID_REQUEST' });
});
test('PENDING query-error Contract CR: invalid notification read filter must return a client error', async () => {
    const p = await studentToken(await account('STUDENT'));
    const result = await http('GET', '/student/notifications?read=maybe', undefined, p.accessToken);
    expect({ status: result.status, code: result.body.code }).toEqual({ status: 400, code: 'INVALID_REQUEST' });
});
test('PENDING query-error Contract CR: invalid student-directory query must return a client error', async () => {
    const w = await accountWorld();
    try {
        const responses = await Promise.all(['limit=0', 'status=DISABLED', 'q='].map(async query => { const r = await w.call('GET', '/admin/student-accounts?' + query, undefined, w.adminToken); return { status: r.status, code: r.body.code }; }));
        expect(responses).toEqual(Array.from({ length: 3 }, () => ({ status: 400, code: 'INVALID_REQUEST' })));
    } finally { await w.server.app.close(); }
});
test('G1 migrations roll down and rebuild on the approved disposable database', async () => {
    expect(config.database.database).toBe('p7_foundation');
    expect(config.database.user).toBe('p7_foundation');
    const options = { databaseUrl: config.database, dir: 'migrations', count: Infinity, migrationsTable: 'foundation_migrations', checkOrder: true, log: () => { }, logger: { info: () => { }, warn: () => { }, error: () => { } } };
    await pool.query('DROP TABLE IF EXISTS foundation_probe.account_activity');
    await runner({ ...options, direction: 'down' });
    expect((await pool.query("SELECT to_regclass('identity_access.login_account') AS t")).rows[0].t).toBeNull();
    await runner({ ...options, direction: 'up' });
    expect((await pool.query('SELECT count(*)::integer AS n FROM identity_access.login_account')).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::integer AS n FROM foundation_migrations')).rows[0].n).toBe(13);
});
