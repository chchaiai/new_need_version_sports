import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import type { CourseCalendar, Semester } from '../application/ports/dependencies.ts';
import type { Rule } from '../domain/course.ts';
import type { PlanCatalog, PlanSlot } from '../domain/publication-plan.ts';
import type { TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { Failure } from '../../../shared/domain/failure.ts';

const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const shaPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const instant = (v: unknown): v is number => Number.isSafeInteger(v) && Math.abs(v as number) <= 8640000000000000;
const unavailable = () => new Failure('DEPENDENCY_UNAVAILABLE', 503);

/** Private file protocol; does not extend the HTTP Contract or infer calendar authority. */
export function planRuleSha256(rule: Rule): string {
    return sha256(JSON.stringify({
        templateVersionId: rule.templateVersionId.toLowerCase(),
        courseRelatedTargetMinutes: rule.courseRelatedTargetMinutes,
        otherTargetMinutes: rule.otherTargetMinutes,
        thresholdMinutes: rule.thresholdMinutes,
        weeklyCountLimit: rule.weeklyCountLimit,
        allowedIntervals: rule.allowedIntervals.map(i => ({ startsAt: i.startsAt, endsAtExclusive: i.endsAtExclusive })),
        regularCutoffAt: rule.regularCutoffAt,
        plannedSettlementAt: rule.plannedSettlementAt
    }));
}
interface CatalogEntry {
    organizationId: string;
    semesterId: string;
    semesterVersion: number;
    ruleSha256: string;
    notBefore: number;
    catalog: PlanCatalog;
}
function object(value: unknown, keys: string[]): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
        Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function parse(bytes: Buffer): CatalogEntry[] {
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    if (!object(value, ['format', 'entries']) || value.format !== 'P7_G1_PLAN_CATALOG_V1' ||
        !Array.isArray(value.entries) || value.entries.length < 1 || value.entries.length > 1000) throw unavailable();
    const scopes = new Set<string>();
    for (const entry of value.entries) {
        if (!object(entry, ['organizationId', 'semesterId', 'semesterVersion', 'ruleSha256', 'notBefore', 'catalog']) ||
            typeof entry.organizationId !== 'string' || !uuidPattern.test(entry.organizationId) ||
            typeof entry.semesterId !== 'string' || !uuidPattern.test(entry.semesterId) ||
            !Number.isSafeInteger(entry.semesterVersion) || entry.semesterVersion < 0 ||
            typeof entry.ruleSha256 !== 'string' || !shaPattern.test(entry.ruleSha256) || !instant(entry.notBefore)) throw unavailable();
        const key = [entry.organizationId.toLowerCase(), entry.semesterId.toLowerCase(), entry.semesterVersion, entry.ruleSha256].join('/');
        if (scopes.has(key)) throw unavailable();
        scopes.add(key);
        const c = entry.catalog;
        if (!object(c, ['version', 'complete', 'slots']) || typeof c.version !== 'string' ||
            !c.version.trim() || c.version.length > 128 || typeof c.complete !== 'boolean' ||
            !Array.isArray(c.slots) || c.slots.length > 10000) throw unavailable();
        const ids = new Set<string>();
        for (const s of c.slots) {
            if (!object(s, ['id', 'category', 'startsAt', 'endsAtExclusive']) ||
                typeof s.id !== 'string' || !s.id.trim() || s.id.length > 256 || ids.has(s.id) ||
                !['COURSE_RELATED', 'OTHER'].includes(s.category) || !instant(s.startsAt) || !instant(s.endsAtExclusive) ||
                s.startsAt < entry.notBefore || s.endsAtExclusive <= s.startsAt) throw unavailable();
            ids.add(s.id);
        }
    }
    return value.entries as CatalogEntry[];
}

export class UnavailablePlanCatalog implements CourseCalendar {
    async catalog(): Promise<PlanCatalog> { throw unavailable(); }
}

export class FilePlanCatalog implements CourseCalendar {
    private readonly path: string;
    private readonly expectedSha256: string;
    constructor(path: string, expectedSha256: string) {
        if (!isAbsolute(path) || !shaPattern.test(expectedSha256)) throw new Error('INVALID_PLAN_CATALOG_CONFIGURATION');
        this.path = path;
        this.expectedSha256 = expectedSha256;
    }
    private async entries(): Promise<CatalogEntry[]> {
        // Bounded regular-file read. No stale cache or last-known-success fallback after replacement.
        const file = await open(this.path, constants.O_RDONLY | constants.O_NONBLOCK);
        try {
            const limit = 4 * 1024 * 1024;
            const stat = await file.stat();
            if (!stat.isFile() || stat.size > limit) throw unavailable();
            const bytes = Buffer.alloc(limit + 1);
            let length = 0;
            while (length < bytes.length) {
                const read = await file.read(bytes, length, bytes.length - length, null);
                if (read.bytesRead === 0) break;
                length += read.bytesRead;
            }
            const content = bytes.subarray(0, length);
            if (length > limit || sha256(content) !== this.expectedSha256) throw unavailable();
            return parse(content);
        } finally { await file.close(); }
    }
    /** Startup checks bytes/shape. Per-request checks also bind current scope, rule and time. */
    async verify(): Promise<void> {
        try { await this.entries(); } catch { throw unavailable(); }
    }
    async catalog(_scope: TransactionScope, semester: Semester, rule: Rule, notBefore: number): Promise<PlanCatalog> {
        try {
            const entries = await this.entries();
            const entry = entries.find(e => e.organizationId.toLowerCase() === semester.organizationId.toLowerCase() &&
                e.semesterId.toLowerCase() === semester.id.toLowerCase() && e.semesterVersion === semester.version &&
                e.ruleSha256 === planRuleSha256(rule));
            if (!entry || !instant(notBefore) || notBefore < entry.notBefore) throw unavailable();
            // Validate before dropping past slots; malformed data must never become a complete empty catalog.
            for (const slot of entry.catalog.slots) {
                if (slot.endsAtExclusive - slot.startsAt < rule.thresholdMinutes * 60000 ||
                    !rule.allowedIntervals.some(i => i.startsAt <= slot.startsAt && slot.endsAtExclusive <= i.endsAtExclusive)) throw unavailable();
            }
            return {
                version: entry.catalog.version + '@sha256:' + this.expectedSha256,
                complete: entry.catalog.complete,
                slots: entry.catalog.slots.filter(s => s.startsAt >= notBefore).map((s): PlanSlot => ({ ...s }))
            };
        } catch { throw unavailable(); }
    }
}
