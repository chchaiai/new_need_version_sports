import { afterEach, beforeEach, expect, test } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilePlanCatalog, UnavailablePlanCatalog, planRuleSha256 } from '../../../src/modules/course-enrollment/infrastructure/file-plan-catalog.ts';
import { publicationPlan } from '../../../src/modules/course-enrollment/domain/publication-plan.ts';
import type { Rule } from '../../../src/modules/course-enrollment/domain/course.ts';
import type { Semester } from '../../../src/modules/course-enrollment/application/ports/dependencies.ts';
import { readG1RuntimeConfig } from '../../../src/bootstrap/g1-runtime.ts';

const scope = { scope: 'foundation-transaction' } as const;
const term: Semester = { id: randomUUID(), organizationId: randomUUID(), academicYear: '2026-2027', termType: 'FIRST',
    displayName: 'Synthetic only', startDate: '2026-09-01', endDate: '2027-01-31', status: 'CURRENT', version: 2 };
const time = Date.parse('2026-10-01T00:00:00Z');
const rule: Rule = { templateVersionId: randomUUID(), courseRelatedTargetMinutes: 600, otherTargetMinutes: 600,
    thresholdMinutes: 30, weeklyCountLimit: 3, allowedIntervals: [{ startsAt: time, endsAtExclusive: time + 3 * 86400000 }],
    regularCutoffAt: time + 4 * 86400000, plannedSettlementAt: time + 11 * 86400000 };
function fixture() {
    return { format: 'P7_G1_PLAN_CATALOG_V1', entries: [{ organizationId: term.organizationId, semesterId: term.id,
        semesterVersion: term.version, ruleSha256: planRuleSha256(rule), notBefore: time,
        catalog: { version: 'SYNTHETIC-v1', complete: false, slots: [0, 1].map(i => ({ id: 'synthetic/' + i,
            category: 'COURSE_RELATED', startsAt: time + i * 86400000, endsAtExclusive: time + i * 86400000 + 3600000 })) } }] };
}
let directory: string, path: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'p7-catalog-')); path = join(directory, 'synthetic.json'); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
async function source(value: unknown = fixture()) {
    const bytes = JSON.stringify(value);
    await writeFile(path, bytes);
    return new FilePlanCatalog(path, createHash('sha256').update(bytes).digest('hex'));
}
test('pinned synthetic catalog preserves partial semantics, filters elapsed slots and isolates returned data', async () => {
    const adapter = await source(), catalog = await adapter.catalog(scope, term, rule, time + 1);
    expect(catalog.slots.map(s => s.id)).toEqual(['synthetic/1']);
    expect(catalog.version).toMatch(/^SYNTHETIC-v1@sha256:[a-f0-9]{64}$/);
    expect(publicationPlan(rule, catalog, time + 1).result).toBe('UNAVAILABLE');
    catalog.slots[0]!.id = 'caller-modified';
    expect((await adapter.catalog(scope, term, rule, time + 1)).slots[0]!.id).toBe('synthetic/1');
});
test('organization, semester, semester version, exact rule and source time cannot be crossed', async () => {
    const adapter = await source();
    for (const wrong of [{ ...term, organizationId: randomUUID() }, { ...term, id: randomUUID() }, { ...term, version: 3 }])
        await expect(adapter.catalog(scope, wrong, rule, time)).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
    await expect(adapter.catalog(scope, term, { ...rule, weeklyCountLimit: 4 }, time)).rejects.toMatchObject({ status: 503 });
    await expect(adapter.catalog(scope, term, rule, time - 1)).rejects.toMatchObject({ status: 503 });
});
test('same source label with changed bytes needs a new pin and produces a different evidence version', async () => {
    const adapter = await source(), first = await adapter.catalog(scope, term, rule, time);
    const changed = fixture(); changed.entries[0]!.catalog.slots.reverse();
    const newAdapter = await source(changed);
    await expect(adapter.catalog(scope, term, rule, time)).rejects.toMatchObject({ status: 503 });
    expect((await newAdapter.catalog(scope, term, rule, time)).version).not.toBe(first.version);
    await rm(path);
    await expect(newAdapter.catalog(scope, term, rule, time)).rejects.toMatchObject({ status: 503 });
});
test('invalid past slots are rejected before time filtering; no manufactured exhaustive negative result', async () => {
    const invalid = fixture(); invalid.entries[0]!.catalog.complete = true;
    invalid.entries[0]!.catalog.slots[0]!.endsAtExclusive = time + 60000;
    const adapter = await source(invalid);
    await expect(adapter.catalog(scope, term, rule, time + 2 * 86400000)).rejects.toMatchObject({ status: 503 });
});
test('ambiguous duplicate scopes and duplicate slot IDs are unavailable even with matching file SHA', async () => {
    const duplicate = fixture(); duplicate.entries.push(structuredClone(duplicate.entries[0]!));
    await expect((await source(duplicate)).verify()).rejects.toMatchObject({ status: 503 });
    const slots = fixture(); slots.entries[0]!.catalog.slots[1]!.id = slots.entries[0]!.catalog.slots[0]!.id;
    await expect((await source(slots)).verify()).rejects.toMatchObject({ status: 503 });
});
test('malformed JSON, non-boolean completeness and oversized files cannot pass the source adapter', async () => {
    const adapter = await source();
    await writeFile(path, '{bad');
    await expect(adapter.verify()).rejects.toMatchObject({ status: 503 });
    const malformed = fixture() as any; malformed.entries[0].catalog.complete = 'true';
    await expect((await source(malformed)).verify()).rejects.toMatchObject({ status: 503 });
    await writeFile(path, Buffer.alloc(4 * 1024 * 1024 + 1));
    await expect(adapter.verify()).rejects.toMatchObject({ status: 503 });
    await expect(new UnavailablePlanCatalog().catalog()).rejects.toMatchObject({ status: 503 });
});
test('development bootstrap rejects missing opt-ins, malformed domains, relative key files and ambiguous source modes', () => {
    const valid: NodeJS.ProcessEnv = { NODE_ENV: 'development', PGHOST: 'postgres', PGDATABASE: 'test', PGUSER: 'test', PGPASSWORD: 'test',
        P7_ORGANIZATION_ID: term.organizationId, P7_SCHOOL_EMAIL_DOMAINS: ' EXAMPLE.EDU,example.edu ',
        P7_DIGEST_KEY_FILE: '/run/secrets/digest', P7_ENCRYPTION_KEY_FILE: '/run/secrets/encryption',
        P7_PLAN_CATALOG_MODE: 'unavailable', P7_MAIL_MODE: 'local_mailpit', P7_LOCAL_MAILPIT_URL: 'http://mailpit:8025' };
    expect(readG1RuntimeConfig(valid).schoolEmailDomains).toEqual(['example.edu']);
    for (const change of [{ NODE_ENV: 'production' }, { NODE_ENV: undefined }, { P7_SCHOOL_EMAIL_DOMAINS: 'example.edu,' },
        { P7_DIGEST_KEY_FILE: 'relative' }, { P7_PLAN_CATALOG_MODE: undefined }, { P7_PLAN_CATALOG_MODE: 'file' },
        { P7_PLAN_CATALOG_SHA256: 'a'.repeat(64) }, { P7_MAIL_MODE: undefined }])
        expect(() => readG1RuntimeConfig({ ...valid, ...change })).toThrow();
});
