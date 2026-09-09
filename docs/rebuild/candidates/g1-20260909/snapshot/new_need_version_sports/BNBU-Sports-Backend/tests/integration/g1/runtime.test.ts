import { afterAll, beforeAll, expect, test } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { runner } from 'node-pg-migrate';
import { readConfig } from '../../../src/bootstrap/config.ts';
import { createPool } from '../../../src/shared/infrastructure/postgres.ts';
import { ScryptPasswords } from '../../../src/shared/infrastructure/crypto.ts';
import { planRuleSha256 } from '../../../src/modules/course-enrollment/infrastructure/file-plan-catalog.ts';
import type { Rule } from '../../../src/modules/course-enrollment/domain/course.ts';

const config = readConfig(process.env), pool = createPool(config.database);
const org = randomUUID(), term = randomUUID(), template = randomUUID(), teacher = randomUUID(), student = randomUUID();
const now = Date.now(), day = 86400000;
// Synthetic future catalog generated only in the disposable test database; never installed in runtime defaults.
const first = Math.floor(now / day) * day + 2 * day;
const dates = Array.from({ length: 24 }, (_, i) => first + Math.floor(i / 3) * 7 * day + i % 3 * day);
const rule: Rule = { templateVersionId: template, courseRelatedTargetMinutes: 600, otherTargetMinutes: 600,
    thresholdMinutes: 30, weeklyCountLimit: 3, allowedIntervals: dates.map(startsAt => ({ startsAt, endsAtExclusive: startsAt + 3600000 })),
    regularCutoffAt: first + 60 * day, plannedSettlementAt: first + 67 * day };
const wireRule = { ...rule, allowedIntervals: rule.allowedIntervals.map(i => ({ startsAt: new Date(i.startsAt).toISOString(), endsAtExclusive: new Date(i.endsAtExclusive).toISOString() })),
    regularCutoffAt: new Date(rule.regularCutoffAt).toISOString(), plannedSettlementAt: new Date(rule.plannedSettlementAt).toISOString() };
const source = { format: 'P7_G1_PLAN_CATALOG_V1', entries: [{ organizationId: org, semesterId: term, semesterVersion: 0,
    ruleSha256: planRuleSha256(rule), notBefore: now - day, catalog: { version: 'SYNTHETIC-RUNTIME-ONLY', complete: true,
        slots: dates.flatMap((startsAt, i) => ['COURSE_RELATED', 'OTHER'].map(category => ({ id: i + '/' + category, category, startsAt, endsAtExclusive: startsAt + 3600000 }))) } }] };
let directory: string, env: NodeJS.ProcessEnv, sourceFile: string;
const children = new Set<ChildProcess>();
beforeAll(async () => {
    expect(config.database.database).toBe('p7_foundation');
    expect(config.database.user).toBe('p7_foundation');
    await runner({ databaseUrl: config.database, dir: 'migrations', direction: 'up', count: Infinity, migrationsTable: 'foundation_migrations', checkOrder: true, log: () => {}, logger: { info: () => {}, warn: () => {}, error: () => {} } });
    directory = await mkdtemp(join(tmpdir(), 'p7-runtime-'));
    const digestFile = join(directory, 'digest'), encryptionFile = join(directory, 'encryption');
    await writeFile(digestFile, randomBytes(32).toString('hex'), { mode: 0o600 });
    await writeFile(encryptionFile, randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
    sourceFile = join(directory, 'synthetic-catalog.json');
    env = { ...process.env, NODE_ENV: 'development', LISTEN_HOST: '127.0.0.1', P7_ORGANIZATION_ID: org,
        P7_SCHOOL_EMAIL_DOMAINS: 'example.edu', P7_DIGEST_KEY_FILE: digestFile, P7_ENCRYPTION_KEY_FILE: encryptionFile,
        P7_PLAN_CATALOG_MODE: 'unavailable', P7_PLAN_CATALOG_FILE: undefined, P7_PLAN_CATALOG_SHA256: undefined };
    await pool.query("INSERT INTO identity_access.organization(id,code,name,business_timezone,created_at) VALUES($1::uuid,$1::text,'Runtime synthetic only','Asia/Shanghai',now())", [org]);
    await pool.query("INSERT INTO system_mode.state(organization_id,mode,policy_version,version,updated_at) VALUES($1,'NORMAL',0,0,now())", [org]);
    await pool.query("INSERT INTO academic_term.semester(id,organization_id,academic_year,term_type,display_name,start_date,end_date,status,version,created_at,updated_at) VALUES($1,$2,'2026-2027','FIRST','Synthetic runtime semester',$3,$4,'CURRENT',0,now(),now())", [term, org, new Date(now - 2 * day).toISOString().slice(0, 10), new Date(first + 100 * day).toISOString().slice(0, 10)]);
    await pool.query("INSERT INTO course_enrollment.rule_template_version(id,organization_id,version_no,label_zh,label_en,published_at) VALUES($1,$2,1,'合成模板','Synthetic runtime template',now())", [template, org]);
    for (const [id, role] of [[teacher, 'TEACHER'], [student, 'STUDENT']]) {
        await pool.query('INSERT INTO identity_access.user_subject(id,organization_id,role_snapshot,created_at) VALUES($1,$2,$3,now())', [id, org, role]);
        await pool.query("INSERT INTO identity_access.login_account(subject_id,organization_id,email_normalized,email_verified_at,access_state,created_at,updated_at) VALUES($1,$2,$3,now(),'ACTIVE',now(),now())", [id, org, id + '@example.edu']);
    }
    await pool.query("INSERT INTO identity_access.teacher_profile(subject_id,organization_id,employee_id,name) VALUES($1::uuid,$2,$1::text,'Synthetic teacher')", [teacher, org]);
    await pool.query("INSERT INTO identity_access.student_profile(subject_id,organization_id,student_number,name,gender,grade_year) VALUES($1::uuid,$2,$1::text,'Synthetic student','FEMALE',1)", [student, org]);
    await pool.query('INSERT INTO identity_access.password_credential(subject_id,password_phc,must_change,password_version,changed_at) VALUES($1,$2,false,0,now())', [teacher, await new ScryptPasswords().hash('runtime-secret')]);
});
afterAll(async () => {
    for (const child of children) child.kill('SIGKILL');
    await pool.end();
    if (directory) await rm(directory, { recursive: true, force: true });
});
async function launch(overrides: NodeJS.ProcessEnv = {}) {
    const reservation = createServer();
    await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const address = reservation.address();
    if (!address || typeof address === 'string') throw new Error('TEST_PORT_UNAVAILABLE');
    const port = address.port;
    await new Promise<void>((resolve, reject) => reservation.close(e => e ? reject(e) : resolve()));
    const child = spawn(process.execPath, ['src/bootstrap/start-g1.ts'], { env: { ...env, PORT: String(port), ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(child);
    let output = '';
    child.stdout!.on('data', data => { output += data.toString(); });
    child.stderr!.on('data', data => { output += data.toString(); });
    const exited = new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('exit', code => { children.delete(child); resolve(code); }); });
    async function exit() {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([exited, new Promise<never>((_resolve, reject) => {
                timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('G1_TEST_PROCESS_EXIT_TIMEOUT')); }, 8000);
            })]);
        } finally { clearTimeout(timeout); }
    }
    const base = 'http://127.0.0.1:' + port;
    async function ready() {
        for (let i = 0; i < 120; i++) {
            if (output.includes('G1_LISTENING')) { expect((await fetch(base + '/health/ready')).status).toBe(200); return; }
            if (child.exitCode !== null) throw new Error('G1_TEST_PROCESS_NOT_READY:' + output);
            await delay(50);
        }
        throw new Error('G1_TEST_PROCESS_READY_TIMEOUT');
    }
    async function call(method: string, path: string, body?: unknown, token?: string) {
        const response = await fetch(base + '/api/v1' + path, { method, headers: { 'Idempotency-Key': randomUUID(),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: response.status, body: await response.json() as Record<string, any> };
    }
    async function login() {
        const result = await call('POST', '/auth/sessions/password', { loginType: 'TEACHER_EMAIL', identifier: teacher + '@example.edu', password: 'runtime-secret' });
        expect(result.status, JSON.stringify(result.body)).toBe(201); return result.body.accessToken as string;
    }
    return { ready, call, login, output: () => output, exit, async stop() { child.kill('SIGTERM'); expect(await exit()).toBe(0); } };
}
async function fileEnv(value = source) {
    const bytes = JSON.stringify(value);
    await writeFile(sourceFile, bytes);
    return { P7_PLAN_CATALOG_MODE: 'file', P7_PLAN_CATALOG_FILE: sourceFile, P7_PLAN_CATALOG_SHA256: createHash('sha256').update(bytes).digest('hex') };
}
test('real executable logs in, delivers OTP to Mailpit, fails closed without catalog and preserves sessions across clean restart', async () => {
    const app = await launch();
    let token: string;
    try {
        await app.ready(); token = await app.login();
        const challenge = await app.call('POST', '/auth/challenges', { email: student + '@example.edu', purpose: 'STUDENT_LOGIN' });
        expect(challenge.status).toBe(202);
        const inbox = await (await fetch(process.env.P7_LOCAL_MAILPIT_URL + '/api/v1/search?query=' + encodeURIComponent('to:' + student + '@example.edu'))).json() as any;
        expect(inbox.messages).toHaveLength(1);
        const mail = await (await fetch(process.env.P7_LOCAL_MAILPIT_URL + '/api/v1/message/' + inbox.messages[0].ID)).json() as any;
        const otp = /Verification code: (\d{6})/.exec(mail.Text)?.[1];
        expect(typeof otp).toBe('string');
        expect((await app.call('POST', '/auth/sessions/student', { otpProof: { challengeId: challenge.body.challengeId, code: otp } })).status).toBe(201);
        const course = await app.call('POST', '/teacher/courses', { semesterId: term, name: 'Synthetic runtime draft', description: null, rule: wireRule }, token);
        expect(course.status, JSON.stringify(course.body)).toBe(201);
        const plan = await app.call('POST', '/courses/' + course.body.courseId + '/publication-plan', { expectedCourseVersion: 0 }, token);
        expect(plan.status).toBe(503);
        expect((await pool.query('SELECT count(*)::integer n FROM course_enrollment.publication_plan WHERE course_id=$1', [course.body.courseId])).rows[0].n).toBe(0);
        expect(app.output()).not.toContain(token); expect(app.output()).not.toContain(otp);
    } finally { await app.stop(); }
    const restarted = await launch();
    try { await restarted.ready(); expect((await restarted.call('GET', '/me', undefined, token!)).status).toBe(200); }
    finally { await restarted.stop(); }
});
test('file-backed HTTP publication detects changed bytes and stale pinned evidence, then publishes after fresh proof', async () => {
    const original = await fileEnv(), app = await launch(original);
    let token: string, courseId: string, publicationToken: string;
    try {
        await app.ready(); token = await app.login();
        const course = await app.call('POST', '/teacher/courses', { semesterId: term, name: 'Synthetic file publication', description: null, rule: wireRule }, token);
        expect(course.status).toBe(201); courseId = course.body.courseId;
        const plan = await app.call('POST', '/courses/' + courseId + '/publication-plan', { expectedCourseVersion: 0 }, token);
        expect(plan.status, JSON.stringify(plan.body)).toBe(200); expect(plan.body.result).toBe('FEASIBLE'); publicationToken = plan.body.publicationToken;
        await writeFile(sourceFile, JSON.stringify({ ...source, entries: [] }));
        const rejected = await app.call('POST', '/courses/' + courseId + '/publication', { expectedCourseVersion: 0, publicationToken }, token);
        expect(rejected.status).toBe(503);
        expect((await pool.query('SELECT status,version FROM course_enrollment.course WHERE id=$1', [courseId])).rows[0]).toMatchObject({ status: 'DRAFT', version: '0' });
    } finally { await app.stop(); }
    const changed = structuredClone(source); changed.entries[0]!.catalog.slots.reverse();
    const restarted = await launch(await fileEnv(changed));
    try {
        await restarted.ready();
        const stale = await restarted.call('POST', '/courses/' + courseId! + '/publication', { expectedCourseVersion: 0, publicationToken: publicationToken! }, token!);
        expect(stale.body.code, JSON.stringify(stale.body)).toBe('COURSE_PLAN_STALE');
        const plan = await restarted.call('POST', '/courses/' + courseId! + '/publication-plan', { expectedCourseVersion: 0 }, token!);
        expect(plan.body.result).toBe('FEASIBLE');
        const published = await restarted.call('POST', '/courses/' + courseId! + '/publication', { expectedCourseVersion: 0, publicationToken: plan.body.publicationToken }, token!);
        expect(published.status, JSON.stringify(published.body)).toBe(200); expect(published.body.status).toBe('OPEN');
    } finally { await restarted.stop(); }
});
test('startup requires usable separate keys, pinned file, existing organization and all migrations without exposing secrets', async () => {
    const badKey = join(directory, 'bad-key'); await writeFile(badKey, 'not-a-key-secret');
    for (const change of [{ P7_ENCRYPTION_KEY_FILE: env.P7_DIGEST_KEY_FILE }, { P7_DIGEST_KEY_FILE: badKey },
        { P7_ORGANIZATION_ID: randomUUID() }, { ...(await fileEnv()), P7_PLAN_CATALOG_SHA256: '0'.repeat(64) }]) {
        const app = await launch(change); expect(await app.exit()).toBe(1);
        expect(app.output()).toBe('G1_START_FAILED\n');
    }
    await pool.query("UPDATE public.foundation_migrations SET name='synthetic-missing-migration' WHERE name='1110_notification_replay'");
    try {
        const app = await launch(); expect(await app.exit()).toBe(1); expect(app.output()).toBe('G1_START_FAILED\n');
    } finally {
        await pool.query("UPDATE public.foundation_migrations SET name='1110_notification_replay' WHERE name='synthetic-missing-migration'");
    }
});
