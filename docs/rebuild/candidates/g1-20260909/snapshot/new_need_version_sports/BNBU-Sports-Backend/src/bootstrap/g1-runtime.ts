import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { readConfig } from './config.ts';
import { createG1 } from './g1.ts';
import { createLocalMailDelivery } from './local-mail.ts';
import { createPool } from '../shared/infrastructure/postgres.ts';
import { NodeSecrets, ScryptPasswords, systemClock } from '../shared/infrastructure/crypto.ts';
import { FilePlanCatalog, UnavailablePlanCatalog } from '../modules/course-enrollment/infrastructure/file-plan-catalog.ts';

export function readG1RuntimeConfig(env: NodeJS.ProcessEnv) {
    const fail = () => new Error('INVALID_G1_RUNTIME_CONFIGURATION');
    if (env.NODE_ENV !== 'development') throw fail();
    const organizationId = env.P7_ORGANIZATION_ID;
    if (!organizationId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(organizationId)) throw fail();
    const schoolEmailDomains = env.P7_SCHOOL_EMAIL_DOMAINS?.split(',').map(d => d.trim().toLowerCase());
    if (!schoolEmailDomains?.length || schoolEmailDomains.some(d => d.length > 253 ||
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d))) throw fail();
    const digestKeyFile = env.P7_DIGEST_KEY_FILE, encryptionKeyFile = env.P7_ENCRYPTION_KEY_FILE;
    if (!digestKeyFile || !encryptionKeyFile || !isAbsolute(digestKeyFile) || !isAbsolute(encryptionKeyFile)) throw fail();
    let calendar: FilePlanCatalog | UnavailablePlanCatalog;
    if (env.P7_PLAN_CATALOG_MODE === 'file' && env.P7_PLAN_CATALOG_FILE && env.P7_PLAN_CATALOG_SHA256) {
        calendar = new FilePlanCatalog(env.P7_PLAN_CATALOG_FILE, env.P7_PLAN_CATALOG_SHA256);
    } else if (env.P7_PLAN_CATALOG_MODE === 'unavailable' && !env.P7_PLAN_CATALOG_FILE && !env.P7_PLAN_CATALOG_SHA256) {
        calendar = new UnavailablePlanCatalog();
    } else { throw fail(); }
    return { ...readConfig(env), organizationId: organizationId.toLowerCase(), schoolEmailDomains: [...new Set(schoolEmailDomains)],
        digestKeyFile, encryptionKeyFile, calendar, delivery: createLocalMailDelivery(env) };
}

async function keyFromFile(path: string): Promise<Buffer> {
    const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size < 64 || stat.size > 66) throw new Error('INVALID_G1_SECRET_FILE');
        const data = Buffer.alloc(67);
        let length = 0;
        while (length < data.length) {
            const read = await file.read(data, length, data.length - length, null);
            if (!read.bytesRead) break;
            length += read.bytesRead;
        }
        const hex = data.subarray(0, length).toString('utf8');
        if (!/^[a-f0-9]{64}(?:\r?\n)?$/i.test(hex)) throw new Error('INVALID_G1_SECRET_FILE');
        return Buffer.from(hex.trim(), 'hex');
    } finally { await file.close(); }
}

const requiredMigrations = [
    '0000_foundation', '1000_identity_access', '1010_runtime_support', '1020_academic_term',
    '1030_course_enrollment', '1040_identity_integrity', '1050_course_closure', '1060_session_reference_keys',
    '1070_identity_email', '1080_identity_closure', '1090_identity_governance', '1100_semester_management', '1110_notification_replay'
];
/** Development process only. It never migrates, provisions accounts, or substitutes H providers. */
export async function startG1Runtime(env: NodeJS.ProcessEnv) {
    const config = readG1RuntimeConfig(env);
    const digestKey = await keyFromFile(config.digestKeyFile);
    let secrets: NodeSecrets;
    try {
        const encryptionKey = await keyFromFile(config.encryptionKeyFile);
        try { secrets = new NodeSecrets(digestKey, encryptionKey); }
        finally { encryptionKey.fill(0); }
    } finally { digestKey.fill(0); }
    if (config.calendar instanceof FilePlanCatalog) await config.calendar.verify();
    const pool = createPool(config.database);
    let app: ReturnType<typeof createG1>['app'] | undefined;
    let closing: Promise<void> | undefined;
    const close = (): Promise<void> => closing ??= (async () => {
        try { await app?.close(); } finally { await pool.end(); }
    })();
    try {
        const migrations = new Set((await pool.query('SELECT name FROM public.foundation_migrations')).rows.map(r => r.name));
        if (requiredMigrations.some(name => !migrations.has(name))) throw new Error('G1_MIGRATIONS_REQUIRED');
        const organization = await pool.query("SELECT o.id FROM identity_access.organization o JOIN system_mode.state s ON s.organization_id=o.id WHERE o.id=$1 AND o.business_timezone='Asia/Shanghai'", [config.organizationId]);
        if (organization.rowCount !== 1) throw new Error('G1_ORGANIZATION_REQUIRED');
        const passwords = new ScryptPasswords();
        const dummyPasswordHash = await passwords.hash(randomBytes(32).toString('base64url'));
        app = createG1(pool, { ...config, secrets, passwords, dummyPasswordHash, clock: systemClock }).app;
        const address = await app.listen({ host: config.host, port: config.port });
        return { address, close };
    } catch (error) {
        await close();
        throw error;
    }
}
